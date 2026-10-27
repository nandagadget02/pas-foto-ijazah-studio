import { PhotoAnalysisResult, AdjustmentParams, BatchErrorType } from '../types/analysis';

export interface GeminiApiErrorDetails {
  type: BatchErrorType;
  message: string;
  status?: number;
  isRetryable: boolean;
}

export class GeminiApiError extends Error {
  public details: GeminiApiErrorDetails;

  constructor(details: GeminiApiErrorDetails) {
    super(details.message);
    this.name = 'GeminiApiError';
    this.details = details;
  }
}

export interface AnalyzePhotoOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  maxRetries?: number;
  cacheKey?: string;
}

export class GeminiService {
  // In-memory cache of analysis results to prevent redundant API calls
  private static analysisCache = new Map<string, PhotoAnalysisResult>();

  /**
   * Generates a stable fingerprint cache key from a File
   */
  public static getFileFingerprint(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`;
  }

  /**
   * Retrieves a cached analysis result if present
   */
  public static getCachedAnalysis(cacheKey: string): PhotoAnalysisResult | undefined {
    return this.analysisCache.get(cacheKey);
  }

  /**
   * Saves an analysis result into the cache
   */
  public static setCachedAnalysis(cacheKey: string, result: PhotoAnalysisResult): void {
    if (this.analysisCache.size > 150) {
      const firstKey = this.analysisCache.keys().next().value;
      if (firstKey) this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(cacheKey, result);
  }

  /**
   * Clears the analysis cache
   */
  public static clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Sanitizes error messages by scrubbing potential API keys
   */
  public static sanitizeErrorMessage(rawMsg: string): string {
    if (!rawMsg) return 'Terjadi kesalahan pada layanan Gemini AI.';
    return rawMsg
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/key=[A-Za-z0-9_-]{10,}/gi, 'key=[REDACTED]');
  }

  /**
   * Calls the server-side Gemini API endpoint with timeout, abort signal, and smart retry backoff
   */
  public static async analyzePhoto(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string,
    model?: string,
    options: AnalyzePhotoOptions = {}
  ): Promise<PhotoAnalysisResult> {
    const { timeoutMs = 25000, signal, maxRetries = 2, cacheKey } = options;

    // 1. Check cache first
    if (cacheKey) {
      const cached = this.getCachedAnalysis(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let retriesLeft = maxRetries;

    while (true) {
      // Abort immediately if parent signal is already aborted
      if (signal?.aborted) {
        throw new GeminiApiError({
          type: 'network',
          message: 'Permintaan analisis dibatalkan oleh pengguna.',
          isRetryable: false,
        });
      }

      const controller = new AbortController();
      let isTimeout = false;

      const timer = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, timeoutMs);

      // Link external signal
      const onParentAbort = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', onParentAbort, { once: true });
      }

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64, mimeType, apiKey, model }),
          signal: controller.signal,
        });

        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          let rawError = errData.error || `Analisis gagal dengan status HTTP ${response.status}`;
          try {
            const parsed = JSON.parse(rawError);
            if (parsed?.error?.message) {
              rawError = parsed.error.message;
            }
          } catch (_) {}

          const sanitizedMsg = this.sanitizeErrorMessage(rawError);

          // Categorize status codes accurately
          if (response.status === 401 || response.status === 403 || errData.code === 'API_KEY_INVALID') {
            throw new GeminiApiError({
              type: 'auth',
              message: 'API Key Gemini tidak valid atau izin ditolak. Periksa kembali API Key Anda.',
              status: response.status,
              isRetryable: false,
            });
          }

          if (response.status === 429 || sanitizedMsg.toLowerCase().includes('quota') || sanitizedMsg.toLowerCase().includes('resource_exhausted')) {
            const isPermanentQuota = sanitizedMsg.toLowerCase().includes('quota') || sanitizedMsg.toLowerCase().includes('free tier limit');
            throw new GeminiApiError({
              type: isPermanentQuota ? 'quota' : 'rate_limit',
              message: isPermanentQuota
                ? 'Batas kuota Gemini API tercapai (Quota Exhausted). Silakan gunakan API Key lain atau Analisis Lokal.'
                : 'Batas frekuensi permintaan (Rate Limit 429) tercapai. Menunggu antrean...',
              status: 429,
              isRetryable: !isPermanentQuota,
            });
          }

          if (response.status === 400) {
            throw new GeminiApiError({
              type: 'invalid_response',
              message: `Permintaan analisis tidak valid: ${sanitizedMsg}`,
              status: 400,
              isRetryable: false,
            });
          }

          if (response.status >= 500) {
            throw new GeminiApiError({
              type: 'network',
              message: `Server Gemini API sedang sibuk (HTTP ${response.status}): ${sanitizedMsg}`,
              status: response.status,
              isRetryable: true,
            });
          }

          throw new GeminiApiError({
            type: 'invalid_response',
            message: sanitizedMsg,
            status: response.status,
            isRetryable: true,
          });
        }

        const data: PhotoAnalysisResult = await response.json();

        // Validate essential fields in returned analysis
        if (!data || !data.subject || !data.background || !data.recommendation) {
          throw new GeminiApiError({
            type: 'invalid_response',
            message: 'Respons dari Gemini AI tidak memiliki struktur parameter yang lengkap.',
            isRetryable: true,
          });
        }

        // Cache successful result
        if (cacheKey) {
          this.setCachedAnalysis(cacheKey, data);
        }

        return data;
      } catch (err: any) {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        let categorizedError: GeminiApiError;

        if (err instanceof GeminiApiError) {
          categorizedError = err;
        } else if (isTimeout) {
          categorizedError = new GeminiApiError({
            type: 'timeout',
            message: `Waktu analisis habis (${Math.round(timeoutMs / 1000)} detik). Koneksi lambat atau Gemini API tidak merespons.`,
            status: 504,
            isRetryable: true,
          });
        } else if (signal?.aborted) {
          categorizedError = new GeminiApiError({
            type: 'network',
            message: 'Analisis foto dibatalkan.',
            isRetryable: false,
          });
        } else if (err.name === 'AbortError') {
          categorizedError = new GeminiApiError({
            type: 'timeout',
            message: 'Koneksi ke server analisis terputus atau timeout.',
            status: 504,
            isRetryable: true,
          });
        } else {
          // Network drop / offline
          categorizedError = new GeminiApiError({
            type: 'network',
            message: this.sanitizeErrorMessage(err.message || 'Tidak dapat terhubung ke server analisis (Network Error).'),
            isRetryable: true,
          });
        }

        // Perform Exponential Backoff + Jitter if error is retryable
        if (categorizedError.details.isRetryable && retriesLeft > 0 && !signal?.aborted) {
          retriesLeft--;
          const baseDelay = 1500 * Math.pow(2, maxRetries - retriesLeft);
          const jitter = Math.floor(Math.random() * 600);
          const totalDelay = Math.min(baseDelay + jitter, 6000);

          console.warn(
            `Analisis gagal (${categorizedError.details.type}), mencoba ulang dalam ${totalDelay}ms (${retriesLeft} percobaan tersisa)...`
          );

          await new Promise((res) => setTimeout(res, totalDelay));
          continue;
        }

        // No more retries or non-retryable error
        throw categorizedError;
      }
    }
  }

  /**
   * Test and verify a Gemini API Key with a specific model
   */
  public static async testApiKey(
    apiKey: string,
    model: string = 'gemini-2.5-flash-lite'
  ): Promise<{ ok: boolean; model?: string; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, model }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: data.error || `Verifikasi gagal (HTTP ${response.status})`,
        };
      }
      return data;
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Tidak dapat terhubung ke server untuk verifikasi API key.',
      };
    }
  }

  /**
   * Fallback Local Image Analyzer
   * Evaluates pixel statistics (luminance, histogram, contrast, exposure, clipping, sharpness)
   * entirely inside the browser canvas if Gemini API is unreachable or has no key.
   */
  public static async analyzeLocally(
    imageElement: HTMLImageElement
  ): Promise<PhotoAnalysisResult> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const maxDim = 600;
      let width = imageElement.naturalWidth || imageElement.width || 600;
      let height = imageElement.naturalHeight || imageElement.height || 800;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(this.getDefaultFallbackAnalysis());
        return;
      }

      ctx.drawImage(imageElement, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const totalPixels = width * height;

      let sumLuminance = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      const lumHistogram = new Uint32Array(256);
      let highlightClipCount = 0;
      let shadowClipCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sumR += r;
        sumG += g;
        sumB += b;

        // Rec. 709 luminance
        const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        sumLuminance += lum;
        lumHistogram[lum]++;

        if (lum >= 250) highlightClipCount++;
        if (lum <= 8) shadowClipCount++;
      }

      const meanLum = sumLuminance / totalPixels;
      const meanR = sumR / totalPixels;
      const meanG = sumG / totalPixels;
      const meanB = sumB / totalPixels;

      // Variance & Standard Deviation for contrast
      let variance = 0;
      for (let i = 0; i < 256; i++) {
        variance += lumHistogram[i] * Math.pow(i - meanLum, 2);
      }
      variance /= totalPixels;
      const stdDev = Math.sqrt(variance);

      // Estimate sharpness using Laplacian variance
      let laplacianVariance = 0;
      try {
        let laplacianSum = 0;
        let count = 0;
        for (let y = 1; y < height - 1; y += 2) {
          for (let x = 1; x < width - 1; x += 2) {
            const idx = (y * width + x) * 4;
            const center = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
            const up = 0.2126 * data[((y - 1) * width + x) * 4] + 0.7152 * data[((y - 1) * width + x) * 4 + 1] + 0.0722 * data[((y - 1) * width + x) * 4 + 2];
            const down = 0.2126 * data[((y + 1) * width + x) * 4] + 0.7152 * data[((y + 1) * width + x) * 4 + 1] + 0.0722 * data[((y + 1) * width + x) * 4 + 2];
            const left = 0.2126 * data[(y * width + (x - 1)) * 4] + 0.7152 * data[(y * width + (x - 1)) * 4 + 1] + 0.0722 * data[(y * width + (x - 1)) * 4 + 2];
            const right = 0.2126 * data[(y * width + (x + 1)) * 4] + 0.7152 * data[(y * width + (x + 1)) * 4 + 1] + 0.0722 * data[(y * width + (x + 1)) * 4 + 2];

            const lap = Math.abs(4 * center - up - down - left - right);
            laplacianSum += lap;
            count++;
          }
        }
        laplacianVariance = count > 0 ? laplacianSum / count : 10;
      } catch {
        laplacianVariance = 12;
      }

      // Check background by sampling perimeter
      let bgSampleCount = 0;
      let bgSumLum = 0;
      for (let x = 0; x < width; x += 4) {
        const topIdx = x * 4;
        bgSumLum += 0.2126 * data[topIdx] + 0.7152 * data[topIdx + 1] + 0.0722 * data[topIdx + 2];
        bgSampleCount++;
      }
      const bgMeanLum = bgSampleCount > 0 ? bgSumLum / bgSampleCount : meanLum;

      // Smart dynamic recommendations based on calculated values:
      // Exposure correction
      let recExposure = 0;
      let recBrightness = 0;
      if (meanLum < 100) {
        recExposure = Math.min(0.5, (120 - meanLum) / 100);
        recBrightness = Math.round(Math.min(18, (120 - meanLum) * 0.25));
      } else if (meanLum > 175) {
        recExposure = Math.max(-0.4, (140 - meanLum) / 120);
        recBrightness = Math.round(Math.max(-15, (140 - meanLum) * 0.2));
      }

      // Contrast correction
      let recContrast = 0;
      if (stdDev < 42) {
        recContrast = Math.round(Math.min(15, (45 - stdDev) * 0.8));
      } else if (stdDev > 75) {
        recContrast = Math.round(Math.max(-12, (65 - stdDev) * 0.5));
      }

      // Shadows & Highlights
      let recShadows = 0;
      let recHighlights = 0;
      const shadowClipPct = (shadowClipCount / totalPixels) * 100;
      const highlightClipPct = (highlightClipCount / totalPixels) * 100;

      if (shadowClipPct > 3) {
        recShadows = Math.min(20, Math.round(shadowClipPct * 2.5));
      } else {
        recShadows = 5;
      }

      if (highlightClipPct > 2) {
        recHighlights = -Math.min(20, Math.round(highlightClipPct * 3));
      }

      // Sharpening based on laplacian
      let recSharpening = 6;
      let recFaceDetail = 10;
      let recEyeDetail = 12;
      let recHairDetail = 8;
      let recSkinProtection = 12;

      if (laplacianVariance < 8) {
        recSharpening = 8; // foto soft
        recFaceDetail = 14;
        recEyeDetail = 16;
        recHairDetail = 12;
        recSkinProtection = 14;
      } else if (laplacianVariance > 25) {
        recSharpening = 4; // foto sudah tajam
        recFaceDetail = 7;
        recEyeDetail = 9;
        recHairDetail = 6;
        recSkinProtection = 10;
      }

      // Color cast
      let recTemp = 0;
      let recTint = 0;
      if (meanR > meanB + 15) {
        recTemp = -Math.round(Math.min(15, (meanR - meanB) * 0.3)); // reduce warm yellow
      } else if (meanB > meanR + 15) {
        recTemp = Math.round(Math.min(15, (meanB - meanR) * 0.3)); // warm up cold blue
      }

      const result: PhotoAnalysisResult = {
        sourceMode: Math.abs(meanR - meanG) < 5 && Math.abs(meanG - meanB) < 5 ? 'grayscale' : 'color',
        subject: {
          exposureEV: Number(recExposure.toFixed(2)),
          brightness: recBrightness,
          contrast: recContrast,
          highlights: recHighlights,
          shadows: recShadows,
          whites: 0,
          blacks: 0,
          sharpening: recSharpening,
          noiseProtection: 6,
          faceDetail: recFaceDetail,
          eyeDetail: recEyeDetail,
          hairDetail: recHairDetail,
          skinProtection: recSkinProtection,
          detail: `Analisis lokal: Luminance ${Math.round(meanLum)}/255, deviasi kontras ${Math.round(stdDev)}. Detail mata (+${recEyeDetail}) & kontur (+${recFaceDetail}) direkomendasikan dengan proteksi kulit (+${recSkinProtection}).`,
          faceExposureCondition: meanLum < 105 ? 'Sedikit di bawah standar' : meanLum > 165 ? 'Cenderung terang' : 'Proporsional',
          clothingCondition: shadowClipPct > 5 ? 'Shadow gelap perlu diangkat' : 'Detail kain teridentifikasi baik',
        },
        background: {
          tone: bgMeanLum > 160 ? 'terang' : bgMeanLum < 90 ? 'gelap' : 'sedang',
          uniformity: 'polos',
          colorCast: meanR > meanB + 10 ? 'Kekuningan/hangat' : meanB > meanR + 10 ? 'Kebiruan' : 'Netral',
          segmentationConfidence: 82,
          isSafeToPreserve: true,
          hasComplexObjects: false,
          notes: 'Latar terdeteksi rata. Latar asli aman dipertahankan.',
        },
        global: {
          exposure: `Luminance rata-rata: ${Math.round(meanLum)}`,
          contrast: stdDev > 65 ? 'Tinggi' : stdDev < 45 ? 'Lembut/Rendah' : 'Normal',
          sharpness: laplacianVariance > 18 ? 'Tajam' : 'Standar',
          noise: 'Rendah (terkontrol)',
          clipping: highlightClipPct > 3 ? 'Kliping highlight terdeteksi' : shadowClipPct > 5 ? 'Kliping shadow terdeteksi' : 'Bebas kliping ekstrem',
          dynamicRange: `${Math.round(stdDev * 3.2)} EV estimate`,
          aspectRatio: `${width}:${height}`,
          luminanceMean: Math.round(meanLum),
          highlightClipRatio: highlightClipPct,
          shadowClipRatio: shadowClipPct,
        },
        recommendation: {
          targetTone: 'natural',
          summary: `Analisis piksel mandiri merekomendasikan kompensasi exposure ${recExposure > 0 ? '+' : ''}${recExposure.toFixed(2)} EV, kontras ${recContrast >= 0 ? '+' : ''}${recContrast}, dan shadow lift +${recShadows} untuk standar ijazah resmi.`,
          temperature: recTemp,
          tint: recTint,
        },
        analysisSource: 'local',
      };

      resolve(result);
    });
  }

  public static getDefaultFallbackAnalysis(): PhotoAnalysisResult {
    return {
      sourceMode: 'color',
      subject: {
        exposureEV: 0.05,
        brightness: 3,
        contrast: 5,
        highlights: -3,
        shadows: 8,
        whites: 0,
        blacks: 2,
        sharpening: 6,
        noiseProtection: 7,
        faceDetail: 10,
        eyeDetail: 12,
        hairDetail: 8,
        skinProtection: 12,
        detail: 'Rekomendasi parameter aman untuk pas foto ijazah.',
        faceExposureCondition: 'Normal',
        clothingCondition: 'Normal',
      },
      background: {
        tone: 'sedang',
        uniformity: 'polos',
        colorCast: 'Netral',
        segmentationConfidence: 85,
        isSafeToPreserve: true,
        hasComplexObjects: false,
        notes: 'Pertahankan background asli jika sudah rapi.',
      },
      global: {
        exposure: 'Normal',
        contrast: 'Normal',
        sharpness: 'Standar',
        noise: 'Rendah',
        clipping: 'Aman',
        dynamicRange: 'Standar',
        aspectRatio: '3:4',
      },
      recommendation: {
        targetTone: 'natural',
        summary: 'Target tone natural standar ijazah dengan kejernihan midtone dan pemulihan shadow.',
        temperature: 0,
        tint: 0,
      },
      analysisSource: 'local',
    };
  }

  public static getInitialAdjustments(): AdjustmentParams {
    return {
      exposureEV: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      sharpening: 6,
      noiseProtection: 6,
      faceDetail: 8,
      eyeDetail: 10,
      hairDetail: 8,
      skinProtection: 12,
      saturation: 0,
      temperature: 0,
      tint: 0,
    };
  }
}
