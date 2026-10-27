const fs = require('fs');
let code = fs.readFileSync('src/services/GeminiService.ts', 'utf8');

// Methods to inject before analyzeLocally
const helperMethods = `
  private static clampVal(val: unknown, min: number, max: number, fallback: number): number {
    if (typeof val !== 'number' || isNaN(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }

  private static sanitizeAnalysisResult(parsed: any, usedModel: string): PhotoAnalysisResult {
    const clamp = this.clampVal;
    return {
      sourceMode: parsed?.sourceMode === 'grayscale' ? 'grayscale' : 'color',
      subject: {
        exposureEV: Number(clamp(parsed?.subject?.exposureEV, -1.0, 1.0, 0).toFixed(2)),
        brightness: Math.round(clamp(parsed?.subject?.brightness, -25, 25, 0)),
        contrast: Math.round(clamp(parsed?.subject?.contrast, -25, 25, 0)),
        highlights: Math.round(clamp(parsed?.subject?.highlights, -25, 25, 0)),
        shadows: Math.round(clamp(parsed?.subject?.shadows, -25, 25, 0)),
        whites: Math.round(clamp(parsed?.subject?.whites, -20, 20, 0)),
        blacks: Math.round(clamp(parsed?.subject?.blacks, -20, 20, 0)),
        sharpening: Math.round(clamp(parsed?.subject?.sharpening, 0, 20, 5)),
        noiseProtection: Math.round(clamp(parsed?.subject?.noiseProtection, 0, 20, 6)),
        faceDetail: Math.round(clamp(parsed?.subject?.faceDetail, 0, 25, 8)),
        eyeDetail: Math.round(clamp(parsed?.subject?.eyeDetail, 0, 25, 10)),
        hairDetail: Math.round(clamp(parsed?.subject?.hairDetail, 0, 25, 8)),
        skinProtection: Math.round(clamp(parsed?.subject?.skinProtection, 0, 25, 12)),
        detail: parsed?.subject?.detail || 'Detail wajah dan pakaian terdeteksi normal.',
        faceExposureCondition: parsed?.subject?.faceExposureCondition || 'Pencahayaan wajah memadai',
        clothingCondition: parsed?.subject?.clothingCondition || 'Pakaian rapi',
      },
      background: {
        tone: ['terang', 'sedang', 'gelap'].includes(parsed?.background?.tone)
          ? parsed.background.tone
          : 'sedang',
        uniformity: ['polos', 'gradasi', 'kompleks'].includes(parsed?.background?.uniformity)
          ? parsed.background.uniformity
          : 'polos',
        colorCast: parsed?.background?.colorCast || 'Netral',
        segmentationConfidence: Math.round(clamp(parsed?.background?.segmentationConfidence, 0, 100, 85)),
        isSafeToPreserve: Boolean(parsed?.background?.isSafeToPreserve),
        hasComplexObjects: Boolean(parsed?.background?.hasComplexObjects),
        notes: parsed?.background?.notes || '',
      },
      global: {
        exposure: parsed?.global?.exposure || 'Normal',
        contrast: parsed?.global?.contrast || 'Standar',
        sharpness: parsed?.global?.sharpness || 'Cukup Tajam',
        noise: parsed?.global?.noise || 'Rendah',
        clipping: parsed?.global?.clipping || 'Tidak Terdeteksi',
        dynamicRange: parsed?.global?.dynamicRange || 'Standar',
        aspectRatio: parsed?.global?.aspectRatio || '3:4',
      },
      recommendation: {
        targetTone: ['natural', 'brighter', 'softer'].includes(parsed?.recommendation?.targetTone)
          ? parsed.recommendation.targetTone
          : 'natural',
        summary: parsed?.recommendation?.summary || 'Terapkan koreksi kontras seimbang dan pemulihan shadow.',
        temperature: Math.round(clamp(parsed?.recommendation?.temperature, -25, 25, 0)),
        tint: Math.round(clamp(parsed?.recommendation?.tint, -25, 25, 0)),
      },
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
        const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${encodeURIComponent(m)}:generateContent?key=\${encodeURIComponent(apiKey.trim())}\`;
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
            message: \`Koneksi berhasil! Model aktif: \${m}\`,
          };
        }

        if (json?.error?.message) {
          lastError = json.error.message;
        } else {
          lastError = \`Verifikasi gagal (HTTP \${res.status})\`;
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
    const cleanBase64 = imageBase64.replace(/^data:image\\/\\w+;base64,/, '');
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

    const promptText = \`Anda adalah Master Photo Analyzer untuk PAS FOTO IJAZAH & DOKUMEN RESMI INDONESIA (Standar Dikti, Kemenag, Sekolah Kedinasan, Paspor, Dokumen Akreditasi).
TUGAS: Analisis foto dan rekomendasikan parameter koreksi tonal non-generative.
FORMAT OUTPUT WAJIB: JSON murni tanpa markdown/backticks sesuai struktur berikut:
{
  "sourceMode": "color",
  "subject": {
    "exposureEV": 0.0,
    "brightness": 0,
    "contrast": 0,
    "highlights": 0,
    "shadows": 0,
    "whites": 0,
    "blacks": 0,
    "sharpening": 6,
    "noiseProtection": 6,
    "faceDetail": 8,
    "eyeDetail": 10,
    "hairDetail": 8,
    "skinProtection": 12,
    "detail": "Kondisi wajah dan pakaian",
    "faceExposureCondition": "Normal",
    "clothingCondition": "Rapi"
  },
  "background": {
    "tone": "sedang",
    "uniformity": "polos",
    "colorCast": "Netral",
    "segmentationConfidence": 85,
    "isSafeToPreserve": true,
    "hasComplexObjects": false,
    "notes": "Catatan latar"
  },
  "global": {
    "exposure": "Normal",
    "contrast": "Standar",
    "sharpness": "Tajam",
    "noise": "Rendah",
    "clipping": "Aman",
    "dynamicRange": "Standar",
    "aspectRatio": "3:4"
  },
  "recommendation": {
    "targetTone": "natural",
    "summary": "Ringkasan rekomendasi",
    "temperature": 0,
    "tint": 0
  }
}\`;

    let lastError = '';
    let parsedData: any = null;
    let usedModel = targetModel;

    for (const m of candidateModels) {
      try {
        const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${encodeURIComponent(m)}:generateContent?key=\${encodeURIComponent(apiKey.trim())}\`;
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
            const cleanedText = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            parsedData = JSON.parse(cleanedText);
            usedModel = m;
            break;
          }
        } else {
          lastError = json?.error?.message || \`HTTP \${res.status}\`;
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
`;

// Replace testApiKey method
const newTestKey = `  public static async testApiKey(
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
          error: data.error || \`Verifikasi gagal (HTTP \${response.status})\`,
        };
      }
      return data;
    } catch (_) {
      // Direct call fallback
      return await this.directTestApiKey(apiKey, model);
    }
  }`;

// Replace analyzePhoto fetch section
const oldFetchBlockRegex = /const response = await fetch\('\/api\/analyze'[\s\S]*?if \(!response\.ok\) \{[\s\S]*?const errData = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);/;

const newFetchBlock = `let response: Response | null = null;
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

          const errData = await response.json().catch(() => ({}));`;

// Replace testApiKey block
const oldTestKeyRegex = /public static async testApiKey\([\s\S]*?\n  \}/;

code = code.replace(oldTestKeyRegex, newTestKey + '\n' + helperMethods);
code = code.replace(oldFetchBlockRegex, newFetchBlock);

fs.writeFileSync('src/services/GeminiService.ts', code, 'utf8');
console.log('GeminiService successfully updated!');
