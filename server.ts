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

    const systemInstruction = `# MASTER SYSTEM PROMPT
# GEMINI AI — INTELLIGENT PHOTO CORRECTION & PARAMETER OPTIMIZER
## PAS FOTO IJAZAH STUDIO

### 1. ROLE
You are an expert professional photo retoucher, portrait photography analyst, color correction specialist, skin tone preservation specialist, and professional ID/passport photograph enhancement consultant.

Your task is to analyze an uploaded original photograph and generate precise, image-specific correction parameters for the application's existing Manual Adjustment & Fine Tuning controls.

You must analyze the actual uploaded image using visual understanding capabilities.
Do not provide generic presets. Every recommendation must be based on the visible characteristics of the uploaded photograph.

### 2. PRIMARY OBJECTIVE
Analyze the original photograph and recommend optimal correction values for:

A. Basic Tonal Adjustments
- Exposure (EV)
- Brightness
- Contrast
- Highlights
- Shadows
- Whites
- Blacks

B. Levels
- Black Point
- Midtones / Gamma
- White Point

C. Smart Detail Sharpening
- Eye Detail
- Face Detail
- Hair & Hijab Detail
- Sharpening
- Noise Protection
- Skin Protection

D. Color & White Balance
- Saturation
- Temperature
- Tint

E. Selective Color Saturation
- Reds
- Yellows
- Greens
- Cyans
- Blues
- Magentas

### 3. IMAGE ANALYSIS PROCESS
STEP 1 — ORIGINAL IMAGE DIAGNOSIS:
Analyze:
- Overall exposure and brightness.
- Facial illumination.
- Highlight clipping and shadow details.
- Skin tone and color consistency.
- Contrast distribution.
- Hair and clothing details.
- Background color and uniformity.
- Noise, grain, and image softness.
- Facial detail and eye sharpness.
- White balance and color cast.

STEP 2 — SUBJECT ANALYSIS:
Identify visible characteristics of face, eyes and eyebrows, nose and lips, skin texture, hair or hijab, clothing. Determine which areas need correction and which areas should remain unchanged.

STEP 3 — CORRECTION STRATEGY:
Choose the minimum necessary correction. Prioritize:
1. Natural skin appearance.
2. Preservation of original facial identity.
3. Accurate skin color.
4. Balanced exposure.
5. Preserved facial texture.
6. Clear eye and hair details.
7. Natural clothing details.
8. Original background preservation.
Do not increase every parameter automatically. If a parameter is already optimal, recommend 0 or retain its current value.

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
When editing mode is SUBJECT ONLY:
- Recommendations must target the subject only.
- Preserve the original background appearance.
- Do not recommend background color changes.
- Do not alter background saturation, brightness, or color balance.
- Prioritize face, skin, hair/hijab, and clothing.

### 6. IDENTITY PRESERVATION — ABSOLUTE RULE
The original photograph is the source of truth.
Never recommend operations that require face regeneration, face replacement, facial restructuring, eye shape modification, nose reshaping, lip reshaping, artificial skin reconstruction, body reshaping, clothing replacement, or pose modification.
This application performs non-generative image correction.
All recommendations must be compatible with non-generative pixel adjustments.

### 7. PARAMETER RANGE VALIDATION
Use only parameters supplied by the application. Respect each parameter's permitted range and step increments. Never invent additional controls. Return 0 or current default when no correction is necessary.

### 8. RECOMMENDATION CONFIDENCE
For every recommendation, provide:
- Recommended value.
- Whether adjustment is necessary (adjust: true/false).
- Brief visual justification (reason).
- Confidence score from 0 to 100.

### 9. OUTPUT FORMAT — STRICT JSON
Return valid JSON only, without Markdown fences or additional commentary.
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

    const paramItemSchema = {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER },
        adjust: { type: Type.BOOLEAN },
        reason: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ["value", "adjust"],
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        analysis_status: { type: Type.STRING },
        image_quality: {
          type: Type.OBJECT,
          properties: {
            overall_assessment: { type: Type.STRING },
            exposure: { type: Type.STRING },
            contrast: { type: Type.STRING },
            skin_tone: { type: Type.STRING },
            highlights: { type: Type.STRING },
            shadows: { type: Type.STRING },
            sharpness: { type: Type.STRING },
            noise: { type: Type.STRING },
            white_balance: { type: Type.STRING },
            background: { type: Type.STRING },
          },
        },
        editing_mode: { type: Type.STRING },
        recommendation_profile: { type: Type.STRING },
        parameters: {
          type: Type.OBJECT,
          properties: {
            exposure: paramItemSchema,
            brightness: paramItemSchema,
            contrast: paramItemSchema,
            highlights: paramItemSchema,
            shadows: paramItemSchema,
            whites: paramItemSchema,
            blacks: paramItemSchema,
            black_point: paramItemSchema,
            midtones_gamma: paramItemSchema,
            white_point: paramItemSchema,
            eye_detail: paramItemSchema,
            face_detail: paramItemSchema,
            hair_hijab_detail: paramItemSchema,
            sharpening: paramItemSchema,
            noise_protection: paramItemSchema,
            skin_protection: paramItemSchema,
            saturation: paramItemSchema,
            temperature: paramItemSchema,
            tint: paramItemSchema,
            selective_colors: {
              type: Type.OBJECT,
              properties: {
                reds: { type: Type.NUMBER },
                yellows: { type: Type.NUMBER },
                greens: { type: Type.NUMBER },
                cyans: { type: Type.NUMBER },
                blues: { type: Type.NUMBER },
                magentas: { type: Type.NUMBER },
              },
            },
          },
          required: [
            "exposure",
            "brightness",
            "contrast",
            "highlights",
            "shadows",
            "whites",
            "blacks",
          ],
        },
        preservation_checks: {
          type: Type.OBJECT,
          properties: {
            facial_identity: { type: Type.BOOLEAN },
            natural_skin_texture: { type: Type.BOOLEAN },
            original_clothing: { type: Type.BOOLEAN },
            original_background: { type: Type.BOOLEAN },
            non_generative_correction: { type: Type.BOOLEAN },
          },
        },
        recommendation_summary: { type: Type.STRING },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["analysis_status", "parameters", "recommendation_summary"],
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

    // Validate, parse, and clamp all parameters strictly
    // Support both Master System Prompt Section 9 format and legacy structure
    const hasParams = Boolean(parsed && parsed.parameters);

    const sanitized = {
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
