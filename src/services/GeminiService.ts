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
        let response: Response | null = null;
        try {
          response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64, mimeType, apiKey, model }),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if (apiKey && apiKey.trim().length > 0) {
            clearTimeout(timer);
            if (signal) signal.removeEventListener('abort', onParentAbort);
            return await this.directAnalyzePhoto(imageBase64, mimeType, apiKey, model, controller.signal);
          }
          throw fetchErr;
        }

        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        if (!response.ok) {
          if ((response.status === 404 || response.status === 405) && apiKey && apiKey.trim().length > 0) {
            return await this.directAnalyzePhoto(imageBase64, mimeType, apiKey, model, controller.signal);
          }

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

      // If running on static host (GitHub Pages / Android WebView)
      if (response.status === 404 || response.status === 405) {
        return await this.directTestApiKey(apiKey, model);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: data.error || `Verifikasi gagal (HTTP ${response.status})`,
        };
      }
      return data;
    } catch (_) {
      // Direct call fallback
      return await this.directTestApiKey(apiKey, model);
    }
  }

  private static clampVal(val: unknown, min: number, max: number, fallback: number): number {
    if (typeof val !== 'number' || isNaN(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }

  private static sanitizeAnalysisResult(parsed: any, usedModel: string): PhotoAnalysisResult {
    const clamp = this.clampVal;
    const hasParams = Boolean(parsed && parsed.parameters);

    return {
      sourceMode: parsed?.sourceMode === 'grayscale' ? 'grayscale' : 'color',
      subject: {
        exposureEV: Number(
          (hasParams
            ? clamp(parsed.parameters?.exposure?.value, -1.0, 1.0, 0)
            : clamp(parsed.subject?.exposureEV, -1.0, 1.0, 0)
          ).toFixed(2)
        ),
        brightness: Math.round(
          hasParams
            ? clamp(parsed.parameters?.brightness?.value, -25, 25, 0)
            : clamp(parsed.subject?.brightness, -25, 25, 0)
        ),
        contrast: Math.round(
          hasParams
            ? clamp(parsed.parameters?.contrast?.value, -25, 25, 0)
            : clamp(parsed.subject?.contrast, -25, 25, 0)
        ),
        highlights: Math.round(
          hasParams
            ? clamp(parsed.parameters?.highlights?.value, -25, 25, 0)
            : clamp(parsed.subject?.highlights, -25, 25, 0)
        ),
        shadows: Math.round(
          hasParams
            ? clamp(parsed.parameters?.shadows?.value, -25, 25, 0)
            : clamp(parsed.subject?.shadows, -25, 25, 0)
        ),
        whites: Math.round(
          hasParams
            ? clamp(parsed.parameters?.whites?.value, -20, 20, 0)
            : clamp(parsed.subject?.whites, -20, 20, 0)
        ),
        blacks: Math.round(
          hasParams
            ? clamp(parsed.parameters?.blacks?.value, -20, 20, 0)
            : clamp(parsed.subject?.blacks, -20, 20, 0)
        ),
        sharpening: Math.round(
          hasParams
            ? clamp(parsed.parameters?.sharpening?.value, 0, 20, 5)
            : clamp(parsed.subject?.sharpening, 0, 20, 5)
        ),
        noiseProtection: Math.round(
          hasParams
            ? clamp(parsed.parameters?.noise_protection?.value, 0, 20, 6)
            : clamp(parsed.subject?.noiseProtection, 0, 20, 6)
        ),
        faceDetail: Math.round(
          hasParams
            ? clamp(parsed.parameters?.face_detail?.value, 0, 25, 8)
            : clamp(parsed.subject?.faceDetail, 0, 25, 8)
        ),
        eyeDetail: Math.round(
          hasParams
            ? clamp(parsed.parameters?.eye_detail?.value, 0, 25, 10)
            : clamp(parsed.subject?.eyeDetail, 0, 25, 10)
        ),
        hairDetail: Math.round(
          hasParams
            ? clamp(parsed.parameters?.hair_hijab_detail?.value, 0, 25, 8)
            : clamp(parsed.subject?.hairDetail, 0, 25, 8)
        ),
        skinProtection: Math.round(
          hasParams
            ? clamp(parsed.parameters?.skin_protection?.value, 0, 25, 12)
            : clamp(parsed.subject?.skinProtection, 0, 25, 12)
        ),
        detail:
          parsed.parameters?.face_detail?.reason ||
          parsed.subject?.detail ||
          parsed.image_quality?.skin_tone ||
          parsed.recommendation_summary ||
          'Detail wajah dan pakaian terdeteksi normal.',
        faceExposureCondition:
          parsed.image_quality?.exposure ||
          parsed.parameters?.exposure?.reason ||
          parsed.subject?.faceExposureCondition ||
          'Pencahayaan wajah memadai',
        clothingCondition:
          parsed.parameters?.shadows?.reason ||
          parsed.subject?.clothingCondition ||
          'Pakaian rapi',
        blackPoint: Math.round(
          hasParams
            ? clamp(parsed.parameters?.black_point?.value, 0, 254, 0)
            : clamp(parsed.subject?.blackPoint, 0, 254, 0)
        ),
        midtonesGamma: Number(
          (hasParams && parsed.parameters?.midtones_gamma?.value && parsed.parameters.midtones_gamma.value > 0
            ? clamp(parsed.parameters.midtones_gamma.value, 0.1, 3.0, 1.0)
            : parsed.subject?.midtonesGamma && parsed.subject.midtonesGamma > 0
            ? clamp(parsed.subject.midtonesGamma, 0.1, 3.0, 1.0)
            : 1.0
          ).toFixed(2)
        ),
        whitePoint: Math.round(
          hasParams
            ? clamp(parsed.parameters?.white_point?.value, 1, 255, 255)
            : clamp(parsed.subject?.whitePoint, 1, 255, 255)
        ),
        saturation: Math.round(
          hasParams
            ? clamp(parsed.parameters?.saturation?.value, -50, 50, 0)
            : clamp(parsed.subject?.saturation, -50, 50, 0)
        ),
        selectiveColors: {
          reds: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.reds, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.reds, -100, 100, 0)
          ),
          yellows: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.yellows, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.yellows, -100, 100, 0)
          ),
          greens: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.greens, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.greens, -100, 100, 0)
          ),
          cyans: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.cyans, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.cyans, -100, 100, 0)
          ),
          blues: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.blues, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.blues, -100, 100, 0)
          ),
          magentas: Math.round(
            hasParams
              ? clamp(parsed.parameters?.selective_colors?.magentas, -100, 100, 0)
              : clamp(parsed.subject?.selectiveColors?.magentas, -100, 100, 0)
          ),
        },
      },
      background: {
        tone: ['terang', 'sedang', 'gelap'].includes(parsed.background?.tone)
          ? parsed.background.tone
          : 'sedang',
        uniformity: ['polos', 'gradasi', 'kompleks'].includes(parsed.background?.uniformity)
          ? parsed.background.uniformity
          : 'polos',
        colorCast: parsed.background?.colorCast || parsed.image_quality?.white_balance || 'Netral',
        segmentationConfidence: Math.round(
          clamp(parsed.background?.segmentationConfidence, 0, 100, 85)
        ),
        isSafeToPreserve:
          parsed.preservation_checks?.original_background !== undefined
            ? Boolean(parsed.preservation_checks.original_background)
            : Boolean(parsed.background?.isSafeToPreserve ?? true),
        hasComplexObjects: Boolean(parsed.background?.hasComplexObjects),
        notes: parsed.background?.notes || parsed.image_quality?.background || '',
      },
      global: {
        exposure: parsed.global?.exposure || parsed.image_quality?.exposure || 'Normal',
        contrast: parsed.global?.contrast || parsed.image_quality?.contrast || 'Standar',
        sharpness: parsed.global?.sharpness || parsed.image_quality?.sharpness || 'Cukup Tajam',
        noise: parsed.global?.noise || parsed.image_quality?.noise || 'Rendah',
        clipping: parsed.global?.clipping || parsed.image_quality?.highlights || 'Tidak Terdeteksi',
        dynamicRange: parsed.global?.dynamicRange || 'Standar',
        aspectRatio: parsed.global?.aspectRatio || '3:4',
      },
      recommendation: {
        targetTone: ['natural', 'brighter', 'softer'].includes(parsed.recommendation?.targetTone)
          ? parsed.recommendation.targetTone
          : 'natural',
        summary:
          parsed.recommendation_summary ||
          parsed.recommendation?.summary ||
          'Terapkan koreksi kontras seimbang dan pemulihan shadow.',
        temperature: Math.round(
          hasParams
            ? clamp(parsed.parameters?.temperature?.value, -25, 25, 0)
            : clamp(parsed.recommendation?.temperature, -25, 25, 0)
        ),
        tint: Math.round(
          hasParams
            ? clamp(parsed.parameters?.tint?.value, -25, 25, 0)
            : clamp(parsed.recommendation?.tint, -25, 25, 0)
        ),
        recommendationProfile: parsed.recommendation_profile || 'NATURAL_ID_PHOTO',
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      },
      geminiStructuredOutput: parsed,
      analysisSource: 'gemini',
      usedModel: usedModel,
    };
  }

  public static async directTestApiKey(
    apiKey: string,
    model: string = 'gemini-2.5-flash-lite'
  ): Promise<{ ok: boolean; model?: string; message?: string; error?: string }> {
    const targetModel = (model && model.trim()) || 'gemini-2.5-flash-lite';
    const candidateModels = Array.from(
      new Set([
        targetModel,
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-3.1-flash-lite',
      ])
    );

    let lastError = '';
    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Katakan OK jika terhubung.' }] }]
          })
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          return {
            ok: true,
            model: m,
            message: `Koneksi berhasil! Model aktif: ${m}`,
          };
        }

        if (json?.error?.message) {
          lastError = json.error.message;
        } else {
          lastError = `Verifikasi gagal (HTTP ${res.status})`;
        }

        const lower = lastError.toLowerCase();
        if (lower.includes('api_key_invalid') || lower.includes('key not valid') || res.status === 400 || res.status === 403) {
          break;
        }
      } catch (e: any) {
        lastError = e?.message || 'Gagal terhubung ke Gemini API';
      }
    }

    return {
      ok: false,
      error: this.sanitizeErrorMessage(lastError || 'Gagal memverifikasi API Key.'),
    };
  }

  public static async directAnalyzePhoto(
    imageBase64: string,
    mimeType: string,
    apiKey: string,
    model: string = 'gemini-2.5-flash-lite',
    signal?: AbortSignal
  ): Promise<PhotoAnalysisResult> {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    let actualMime = mimeType || 'image/jpeg';
    if (actualMime === 'image/jpg') actualMime = 'image/jpeg';

    const targetModel = (model && model.trim()) || 'gemini-2.5-flash-lite';
    const candidateModels = Array.from(
      new Set([
        targetModel,
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
      ])
    ).slice(0, 2);

    const promptText = `# MASTER SYSTEM PROMPT
# GEMINI AI — INTELLIGENT PHOTO CORRECTION & PARAMETER OPTIMIZER
## PAS FOTO IJAZAH STUDIO

### 1. ROLE
You are an expert professional photo retoucher, portrait photography analyst, color correction specialist, skin tone preservation specialist, and professional ID/passport photograph enhancement consultant.
Your task is to analyze an uploaded original photograph and generate precise, image-specific correction parameters for the application's existing Manual Adjustment & Fine Tuning controls.
You must analyze the actual uploaded image using visual understanding capabilities. Do not provide generic presets. Every recommendation must be based on the visible characteristics of the uploaded photograph.

### 2. PRIMARY OBJECTIVE
Analyze the original photograph and recommend optimal correction values for:
A. Basic Tonal Adjustments: Exposure (EV), Brightness, Contrast, Highlights, Shadows, Whites, Blacks
B. Levels: Black Point, Midtones / Gamma, White Point
C. Smart Detail Sharpening: Eye Detail, Face Detail, Hair & Hijab Detail, Sharpening, Noise Protection, Skin Protection
D. Color & White Balance: Saturation, Temperature, Tint
E. Selective Color Saturation: Reds, Yellows, Greens, Cyans, Blues, Magentas

### 3. IMAGE ANALYSIS PROCESS
STEP 1 — ORIGINAL IMAGE DIAGNOSIS: Analyze overall exposure and brightness, facial illumination, highlight clipping and shadow details, skin tone and color consistency, contrast distribution, hair and clothing details, background color and uniformity, noise, grain, and image softness, facial detail and eye sharpness, white balance and color cast.
STEP 2 — SUBJECT ANALYSIS: Identify visible characteristics of face, eyes and eyebrows, nose and lips, skin texture, hair or hijab, clothing. Determine which areas need correction and which areas should remain unchanged.
STEP 3 — CORRECTION STRATEGY: Choose the minimum necessary correction. Prioritize natural skin appearance, preservation of original facial identity, accurate skin color, balanced exposure, preserved facial texture, clear eye and hair details, natural clothing details, original background preservation. Do not increase every parameter automatically. If a parameter is already optimal, recommend 0 or retain its current value.

### 4. PARAMETER RECOMMENDATION RULES
- EXPOSURE: Adjust only when the image requires overall exposure correction (-1.0 to 1.0 EV).
- BRIGHTNESS: Adjust facial midtone brightness without unnecessarily washing out the skin (-25 to 25).
- CONTRAST: Maintain natural facial tonal transitions (-25 to 25).
- HIGHLIGHTS: Reduce excessive bright areas while preserving natural skin highlights (-25 to 25).
- SHADOWS: Recover important dark details, especially black clothing and hair (-25 to 25).
- WHITES: Preserve white details without clipping (-20 to 20).
- BLACKS: Maintain natural black depth without destroying shadow details (-20 to 20).
- BLACK POINT: Preserve dark tonal information (0 to 254, default 0).
- MIDTONES / GAMMA: Adjust midtone balance for natural facial brightness (0.10 to 3.00, default 1.0).
- WHITE POINT: Maintain appropriate maximum tonal brightness (1 to 255, default 255).
- EYE DETAIL: Enhance existing eye details without changing eye shape or identity (0 to 25, default 10).
- FACE DETAIL: Improve existing facial clarity without creating artificial facial features (0 to 25, default 8).
- HAIR & HIJAB DETAIL: Enhance existing texture without inventing strands or changing hair/hijab structure (0 to 25, default 8).
- SHARPENING: Apply controlled sharpening without halos or excessive edge artifacts (0 to 20, default 5).
- NOISE PROTECTION: Reduce visible noise while retaining authentic texture (0 to 20, default 6).
- SKIN PROTECTION: Prevent excessive sharpening, smoothing, and artificial skin texture (0 to 25, default 12).
- SATURATION: Maintain realistic skin and background colors (-50 to 50, default 0).
- TEMPERATURE: Correct visible warm or cool color casts (-25 to 25, default 0).
- TINT: Correct green or magenta color casts only when necessary (-25 to 25, default 0).
- SELECTIVE COLOR: Modify individual color channels (-100 to 100) only when an actual color problem is detected (reds, yellows, greens, cyans, blues, magentas).

### 5. SUBJECT ONLY MODE
When editing mode is SUBJECT ONLY: Recommendations must target the subject only. Preserve original background appearance. Do not recommend background color changes. Prioritize face, skin, hair/hijab, and clothing.

### 6. IDENTITY PRESERVATION — ABSOLUTE RULE
The original photograph is the source of truth. Never recommend operations that require face regeneration, face replacement, facial restructuring, eye shape modification, nose/lip reshaping, artificial skin reconstruction, body reshaping, clothing replacement, or pose modification. This application performs non-generative pixel adjustments.

### 7. PARAMETER RANGE VALIDATION
Respect each parameter's permitted range and step increments. Return 0 or current default when no correction is necessary.

### 8. RECOMMENDATION CONFIDENCE
For every recommendation provide: recommended value, adjust (boolean), visual justification reason, confidence score (0 to 100).

### 9. OUTPUT FORMAT — STRICT JSON
Return valid JSON only, without Markdown fences or commentary.
Use this structure:
{
  "analysis_status": "success",
  "image_quality": {
    "overall_assessment": "",
    "exposure": "",
    "contrast": "",
    "skin_tone": "",
    "highlights": "",
    "shadows": "",
    "sharpness": "",
    "noise": "",
    "white_balance": "",
    "background": ""
  },
  "editing_mode": "SUBJECT_ONLY",
  "recommendation_profile": "NATURAL_ID_PHOTO",
  "parameters": {
    "exposure": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "brightness": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "contrast": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "highlights": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "shadows": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "whites": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "blacks": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "black_point": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "midtones_gamma": { "value": 1.0, "adjust": true, "reason": "", "confidence": 95 },
    "white_point": { "value": 255, "adjust": false, "reason": "", "confidence": 95 },
    "eye_detail": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "face_detail": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "hair_hijab_detail": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "sharpening": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "noise_protection": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "skin_protection": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "saturation": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "temperature": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "tint": { "value": 0, "adjust": true, "reason": "", "confidence": 95 },
    "selective_colors": {
      "reds": 0,
      "yellows": 0,
      "greens": 0,
      "cyans": 0,
      "blues": 0,
      "magentas": 0
    }
  },
  "preservation_checks": {
    "facial_identity": true,
    "natural_skin_texture": true,
    "original_clothing": true,
    "original_background": true,
    "non_generative_correction": true
  },
  "recommendation_summary": "",
  "warnings": []
}`;

    let lastError = '';
    let parsedData: any = null;
    let usedModel = targetModel;

    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: actualMime,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanedText);
            usedModel = m;
            break;
          }
        } else {
          lastError = json?.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        lastError = err?.message || 'Gagal terhubung ke Gemini API';
      }
    }

    if (!parsedData) {
      throw new GeminiApiError({
        type: 'network',
        message: this.sanitizeErrorMessage(lastError || 'Gagal menganalisis foto dengan Gemini API.'),
        isRetryable: true,
      });
    }

    return this.sanitizeAnalysisResult(parsedData, usedModel);
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
      satRed: 0,
      satYellow: 0,
      satGreen: 0,
      satCyan: 0,
      satBlue: 0,
      satMagenta: 0,
      levelsInBlack: 0,
      levelsGamma: 1.0,
      levelsInWhite: 255,
      levelsOutBlack: 0,
      levelsOutWhite: 255,
    };
  }
}
