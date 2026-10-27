import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// High limit for processing high resolution passport photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to clamp values safely
function clamp(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

// Gemini AI Client setup
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint to test and verify a Gemini API Key
app.post('/api/test-key', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const ai = getGeminiClient(apiKey);
    if (!ai) {
      return res.status(400).json({
        ok: false,
        error: 'API Key tidak boleh kosong. Masukkan API Key Gemini yang valid.',
      });
    }

    const targetModel = (model && model.trim()) || 'gemini-2.5-flash-lite';
    const candidateModels = Array.from(
      new Set([
        targetModel,
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
      ])
    );

    let lastError: any = null;
    let successfulModel = '';

    for (const modelName of candidateModels) {
      try {
        const testResponse = await ai.models.generateContent({
          model: modelName,
          contents: 'Katakan "OK" jika terhubung.',
        });

        if (testResponse && testResponse.text) {
          successfulModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (successfulModel) {
      return res.json({
        ok: true,
        model: successfulModel,
        message: `Koneksi berhasil! Model aktif: ${successfulModel}`,
      });
    }

    let errMsg = lastError?.message || 'Gagal memverifikasi API key.';
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) errMsg = parsed.error.message;
    } catch (_) {}

    return res.status(400).json({
      ok: false,
      error: errMsg,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Terjadi kesalahan saat memverifikasi API Key.',
    });
  }
});

// API endpoint for photo analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType, apiKey, model } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar (base64) diperlukan.' });
    }

    const ai = getGeminiClient(apiKey);
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi. Silakan masukkan API Key di menu pengaturan atau gunakan mode Analisis Mandiri Lokal.',
        code: 'API_KEY_MISSING',
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    let actualMime = mimeType || 'image/jpeg';
    if (actualMime === 'image/jpg') actualMime = 'image/jpeg';

    const systemInstruction = `Anda adalah Master Photo Analyzer untuk PAS FOTO IJAZAH & DOKUMEN RESMI INDONESIA (Standar Dikti, Kemenag, Sekolah Kedinasan, Paspor, Dokumen Akreditasi).

TUGAS UTAMA:
Menganalisis foto sumber secara objektif dan merekomendasikan parameter koreksi tonal pixel NON-GENERATIVE.

ATURAN KRITIS:
1. Jangan membuat ulang wajah atau mengubah anatomi subjek. Foto sumber adalah SOURCE OF TRUTH.
2. Identitas wajah, proporsi, mata, hidung, mulut, hijab/rambut, dan pakaian harus 100% dipertahankan.
3. Pisahkan Analisis Subjek, Analisis Background, dan Analisis Global.
4. PENTING: Background TIDAK BOLEH mempengaruhi exposure wajah. Jika background gelap tetapi wajah sudah ber-exposure normal, JANGAN menaikkan exposure seluruh gambar.
5. Target utama adalah "Natural Neutral Professional ID Photo" untuk ijazah resmi:
   - Midtone wajah jelas dan tidak kusam
   - Tidak ada highlight blown (putih kapur di dahi/hidung/pipi)
   - Tidak ada shadow crushed (rambut/jas hitam pekat tanpa tekstur)
   - Ketajaman alami, bebas halo dan bebas noise berlebih
   - Tidak ada color cast (kebiruan, kekuningan, kemerahan, atau kehijauan).
6. Berikan nilai rekomendasi parameter yang tepat dan spesifik untuk foto ini, JANGAN memberikan angka default yang sama untuk semua foto.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        sourceMode: {
          type: Type.STRING,
          description: "Original image mode: 'color' or 'grayscale'",
          enum: ["color", "grayscale"],
        },
        subject: {
          type: Type.OBJECT,
          properties: {
            exposureEV: {
              type: Type.NUMBER,
              description: "Koreksi exposure EV (-1.0 s/d 1.0). Positif menerangkan, negatif meredupkan.",
            },
            brightness: {
              type: Type.NUMBER,
              description: "Koreksi brightness midtone (-25 s/d 25).",
            },
            contrast: {
              type: Type.NUMBER,
              description: "Koreksi kontras wajah (-25 s/d 25).",
            },
            highlights: {
              type: Type.NUMBER,
              description: "Koreksi highlights (-25 s/d 25). Negatif meredam kilau di dahi/pipi.",
            },
            shadows: {
              type: Type.NUMBER,
              description: "Koreksi shadows (-25 s/d 25). Positif mengangkat detail rambut/jas gelap.",
            },
            whites: {
              type: Type.NUMBER,
              description: "Koreksi titik putih (-20 s/d 20).",
            },
            blacks: {
              type: Type.NUMBER,
              description: "Koreksi titik hitam (-20 s/d 20).",
            },
            sharpening: {
              type: Type.NUMBER,
              description: "Ketajaman konservatif (0 s/d 20). Tanpa artefak halo.",
            },
            noiseProtection: {
              type: Type.NUMBER,
              description: "Proteksi noise (0 s/d 20).",
            },
            faceDetail: {
              type: Type.NUMBER,
              description: "Ketegasan alis, bibir, dan kontur wajah non-generatif (0 s/d 25). Rekomendasi sedang/konservatif.",
            },
            eyeDetail: {
              type: Type.NUMBER,
              description: "Kejelasan iris, pupil, dan bulu mata non-generatif (0 s/d 25). Hanya enhance existing pixels.",
            },
            hairDetail: {
              type: Type.NUMBER,
              description: "Ketajaman tekstur rambut dan tepi hijab (0 s/d 25).",
            },
            skinProtection: {
              type: Type.NUMBER,
              description: "Proteksi kehalusan kulit wajah (dahi/pipi/dagu) dari oversharpening dan noise (0 s/d 25).",
            },
            detail: {
              type: Type.STRING,
              description: "Deskripsi kondisi detail wajah dan tekstur pakaian.",
            },
            faceExposureCondition: {
              type: Type.STRING,
              description: "Kondisi pencahayaan wajah (misal: 'Agak Gelap', 'Normal Seimbang', 'Overexposed di Dahi').",
            },
            clothingCondition: {
              type: Type.STRING,
              description: "Kondisi pakaian/jas/hijab (misal: 'Jas hitam pekat kehilangan detail lipatan', 'Kemeja putih seimbang').",
            },
          },
          required: [
            "exposureEV",
            "brightness",
            "contrast",
            "highlights",
            "shadows",
            "whites",
            "blacks",
            "sharpening",
            "noiseProtection",
            "detail",
          ],
        },
        background: {
          type: Type.OBJECT,
          properties: {
            tone: {
              type: Type.STRING,
              description: "Tone background: 'terang', 'sedang', atau 'gelap'",
              enum: ["terang", "sedang", "gelap"],
            },
            uniformity: {
              type: Type.STRING,
              description: "Keseragaman: 'polos', 'gradasi', atau 'kompleks'",
              enum: ["polos", "gradasi", "kompleks"],
            },
            colorCast: {
              type: Type.STRING,
              description: "Warna atau color cast pada background (misal: 'Biru studio polos', 'Tembok krem tidak rata').",
            },
            segmentationConfidence: {
              type: Type.NUMBER,
              description: "Tingkat keyakinan pemisahan subjek dari latar (0 s/d 100).",
            },
            isSafeToPreserve: {
              type: Type.BOOLEAN,
              description: "Apakah background asli sudah rapi dan aman dipertahankan untuk ijazah.",
            },
            hasComplexObjects: {
              type: Type.BOOLEAN,
              description: "Apakah terdapat objek mengganggu atau tekstur kasar di belakang subjek.",
            },
            notes: {
              type: Type.STRING,
              description: "Catatan atau saran terkait background foto.",
            },
          },
          required: [
            "tone",
            "uniformity",
            "colorCast",
            "segmentationConfidence",
            "isSafeToPreserve",
            "hasComplexObjects",
          ],
        },
        global: {
          type: Type.OBJECT,
          properties: {
            exposure: { type: Type.STRING, description: "Status pencahayaan global" },
            contrast: { type: Type.STRING, description: "Status kontras global" },
            sharpness: { type: Type.STRING, description: "Status ketajaman foto asli" },
            noise: { type: Type.STRING, description: "Tingkat grain/noise" },
            clipping: { type: Type.STRING, description: "Status clipping highlight/shadow" },
            dynamicRange: { type: Type.STRING, description: "Kondisi rentang dinamis" },
            aspectRatio: { type: Type.STRING, description: "Proporsi framing asli" },
          },
          required: [
            "exposure",
            "contrast",
            "sharpness",
            "noise",
            "clipping",
            "dynamicRange",
            "aspectRatio",
          ],
        },
        recommendation: {
          type: Type.OBJECT,
          properties: {
            targetTone: {
              type: Type.STRING,
              description: "Target tonal yang direkomendasikan",
              enum: ["natural", "brighter", "softer"],
            },
            summary: {
              type: Type.STRING,
              description: "Ringkasan rekomendasi dalam bahasa Indonesia untuk pas foto ijazah.",
            },
            temperature: {
              type: Type.NUMBER,
              description: "Koreksi suhu warna (-25 s/d 25). Negatif mendinginkan (kurangi kuning), positif menghangatkan.",
            },
            tint: {
              type: Type.NUMBER,
              description: "Koreksi tint (-25 s/d 25). Negatif kurangi magenta, positif kurangi hijau.",
            },
          },
          required: ["targetTone", "summary", "temperature", "tint"],
        },
      },
      required: ["sourceMode", "subject", "background", "global", "recommendation"],
    };

    // Candidate models in order of priority: target model, with at most 1 fast fallback
    const targetModel = (model && typeof model === 'string' && model.trim().length > 0)
      ? model.trim()
      : 'gemini-2.5-flash-lite';

    const candidateModels = Array.from(
      new Set([
        targetModel,
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
      ])
    ).slice(0, 2);

    let response: any = null;
    let lastError: any = null;
    let usedModel = candidateModels[0];

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: actualMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'Analisis foto pas foto ini secara cermat. Tentukan parameter koreksi non-generatif yang ideal untuk pas foto ijazah resmi standar nasional/internasional.',
              },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2, // Low temperature for consistent, precise analysis
          },
        });

        if (response && response.text) {
          usedModel = modelName;
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        const errStr = (modelErr?.message || modelErr?.toString() || '').toLowerCase();
        console.warn(`Model ${modelName} error:`, modelErr?.message || modelErr);

        // Jangan loop ke model lain jika kesalahan adalah autentikasi, kuota, atau parameter invalid
        if (
          errStr.includes('api_key_invalid') ||
          errStr.includes('permission_denied') ||
          errStr.includes('unauthenticated') ||
          errStr.includes('401') ||
          errStr.includes('403') ||
          errStr.includes('resource_exhausted') ||
          errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('invalid_argument')
        ) {
          break;
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Gemini API sedang mengalami beban tinggi di semua model.');
    }

    const rawText = response.text;

    const parsed = JSON.parse(rawText);

    // Validate and clamp all parameters strictly
    const sanitized = {
      sourceMode: parsed.sourceMode === 'grayscale' ? 'grayscale' : 'color',
      subject: {
        exposureEV: Number(clamp(parsed.subject?.exposureEV, -1.0, 1.0, 0).toFixed(2)),
        brightness: Math.round(clamp(parsed.subject?.brightness, -25, 25, 0)),
        contrast: Math.round(clamp(parsed.subject?.contrast, -25, 25, 0)),
        highlights: Math.round(clamp(parsed.subject?.highlights, -25, 25, 0)),
        shadows: Math.round(clamp(parsed.subject?.shadows, -25, 25, 0)),
        whites: Math.round(clamp(parsed.subject?.whites, -20, 20, 0)),
        blacks: Math.round(clamp(parsed.subject?.blacks, -20, 20, 0)),
        sharpening: Math.round(clamp(parsed.subject?.sharpening, 0, 20, 5)),
        noiseProtection: Math.round(clamp(parsed.subject?.noiseProtection, 0, 20, 6)),
        faceDetail: Math.round(clamp(parsed.subject?.faceDetail, 0, 25, 8)),
        eyeDetail: Math.round(clamp(parsed.subject?.eyeDetail, 0, 25, 10)),
        hairDetail: Math.round(clamp(parsed.subject?.hairDetail, 0, 25, 8)),
        skinProtection: Math.round(clamp(parsed.subject?.skinProtection, 0, 25, 12)),
        detail: parsed.subject?.detail || 'Detail wajah dan pakaian terdeteksi normal.',
        faceExposureCondition: parsed.subject?.faceExposureCondition || 'Pencahayaan wajah memadai',
        clothingCondition: parsed.subject?.clothingCondition || 'Pakaian rapi',
      },
      background: {
        tone: ['terang', 'sedang', 'gelap'].includes(parsed.background?.tone)
          ? parsed.background.tone
          : 'sedang',
        uniformity: ['polos', 'gradasi', 'kompleks'].includes(parsed.background?.uniformity)
          ? parsed.background.uniformity
          : 'polos',
        colorCast: parsed.background?.colorCast || 'Netral',
        segmentationConfidence: Math.round(clamp(parsed.background?.segmentationConfidence, 0, 100, 85)),
        isSafeToPreserve: Boolean(parsed.background?.isSafeToPreserve),
        hasComplexObjects: Boolean(parsed.background?.hasComplexObjects),
        notes: parsed.background?.notes || '',
      },
      global: {
        exposure: parsed.global?.exposure || 'Normal',
        contrast: parsed.global?.contrast || 'Standar',
        sharpness: parsed.global?.sharpness || 'Cukup Tajam',
        noise: parsed.global?.noise || 'Rendah',
        clipping: parsed.global?.clipping || 'Tidak Terdeteksi',
        dynamicRange: parsed.global?.dynamicRange || 'Standar',
        aspectRatio: parsed.global?.aspectRatio || '3:4',
      },
      recommendation: {
        targetTone: ['natural', 'brighter', 'softer'].includes(parsed.recommendation?.targetTone)
          ? parsed.recommendation.targetTone
          : 'natural',
        summary: parsed.recommendation?.summary || 'Terapkan koreksi kontras seimbang dan pemulihan shadow.',
        temperature: Math.round(clamp(parsed.recommendation?.temperature, -25, 25, 0)),
        tint: Math.round(clamp(parsed.recommendation?.tint, -25, 25, 0)),
      },
      analysisSource: 'gemini',
      usedModel: usedModel,
    };

    return res.json(sanitized);
  } catch (error: any) {
    const rawMsg = error.message || error.toString() || 'Gagal menganalisis foto dengan Gemini API.';
    // Scrub potential API keys from error message
    const sanitizedMsg = rawMsg
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/key=[A-Za-z0-9_-]{10,}/gi, 'key=[REDACTED]');

    console.error('Gemini Analysis Error:', sanitizedMsg);

    const lower = sanitizedMsg.toLowerCase();
    let statusCode = 500;
    let errorCode = 'ANALYSIS_FAILED';

    if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('unauthenticated')) {
      statusCode = 401;
      errorCode = 'API_KEY_INVALID';
    } else if (lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('429')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_OR_QUOTA';
    } else if (lower.includes('invalid_argument')) {
      statusCode = 400;
      errorCode = 'INVALID_ARGUMENT';
    }

    return res.status(statusCode).json({
      error: sanitizedMsg,
      code: errorCode,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    name: 'PAS FOTO IJAZAH STUDIO API',
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PAS FOTO IJAZAH STUDIO server running at http://localhost:${port}`);
  });
}

startServer();
