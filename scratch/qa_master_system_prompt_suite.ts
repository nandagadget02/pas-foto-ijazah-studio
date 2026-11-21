// QA Test Suite: Gemini Master System Prompt & Parameter Optimizer Integration
// Tests parsing, parameter clamping, legacy fallback, and application mapping

import { GeminiService } from '../src/services/GeminiService';
import { GeminiMasterPromptOutput } from '../src/types/analysis';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

async function runMasterPromptSuite() {
  console.log('=== QA TEST SUITE: MASTER SYSTEM PROMPT INTEGRATION ===\n');

  // Test 1: Full Section 9 compliant Gemini output
  const sampleSection9Output: GeminiMasterPromptOutput = {
    analysis_status: 'success',
    image_quality: {
      overall_assessment: 'Foto portrait ijazah dengan pencahayaan sedikit underexposed pada wajah.',
      exposure: 'Agak Gelap di area dahi dan pipi kiri',
      contrast: 'Tonal transisi lembut',
      skin_tone: 'Alami dengan sedikit cast hangat',
      highlights: 'Aman, tidak ada clipping',
      shadows: 'Jas hitam pekat detail agak tenggelam',
      sharpness: 'Cukup tajam, detail mata jelas',
      noise: 'Rendah pada ISO 200',
      white_balance: 'Sedikit hangat (warm)',
      background: 'Merah polos studio',
    },
    editing_mode: 'SUBJECT_ONLY',
    recommendation_profile: 'NATURAL_ID_PHOTO',
    parameters: {
      exposure: { value: 0.15, adjust: true, reason: 'Menerangkan midtone wajah', confidence: 95 },
      brightness: { value: 6, adjust: true, reason: 'Optimasi kecerahan wajah', confidence: 92 },
      contrast: { value: 4, adjust: true, reason: 'Meningkatkan pemisahan tonal', confidence: 90 },
      highlights: { value: -5, adjust: true, reason: 'Meredam pantulan cahaya dahi', confidence: 88 },
      shadows: { value: 12, adjust: true, reason: 'Mengangkat tekstur jas hitam', confidence: 94 },
      whites: { value: 3, adjust: true, reason: 'Menjaga kecerahan kerah kemeja', confidence: 89 },
      blacks: { value: -2, adjust: true, reason: 'Menjaga kedalaman shadow', confidence: 87 },
      black_point: { value: 8, adjust: true, reason: 'Memotong area kosong bayangan', confidence: 91 },
      midtones_gamma: { value: 1.15, adjust: true, reason: 'Mencerahkan midtone wajah', confidence: 93 },
      white_point: { value: 250, adjust: true, reason: 'Memperluas dynamic range highlight', confidence: 90 },
      eye_detail: { value: 14, adjust: true, reason: 'Menegaskan iris dan bulu mata', confidence: 96 },
      face_detail: { value: 11, adjust: true, reason: 'Memperjelas kontur alis dan bibir', confidence: 94 },
      hair_hijab_detail: { value: 10, adjust: true, reason: 'Mempertegas helai rambut', confidence: 92 },
      sharpening: { value: 7, adjust: true, reason: 'Ketajaman alami tanpa halo', confidence: 93 },
      noise_protection: { value: 8, adjust: true, reason: 'Mencegah noise di area bayangan', confidence: 90 },
      skin_protection: { value: 15, adjust: true, reason: 'Menjaga kehalusan pori-pori kulit', confidence: 95 },
      saturation: { value: -3, adjust: true, reason: 'Mengurangi kemerahan kulit', confidence: 89 },
      temperature: { value: -4, adjust: true, reason: 'Mengurangi warna kekuningan', confidence: 91 },
      tint: { value: 2, adjust: true, reason: 'Menetralkan sedikit warna hijau', confidence: 88 },
      selective_colors: {
        reds: -5,
        yellows: -3,
        greens: 0,
        cyans: 0,
        blues: 0,
        magentas: 0,
      },
    },
    preservation_checks: {
      facial_identity: true,
      natural_skin_texture: true,
      original_clothing: true,
      original_background: true,
      non_generative_correction: true,
    },
    recommendation_summary: 'Optimasi midtone wajah (+0.15 EV), angkat detail jas (+12 shadow), dan koreksi suhu warna sedikit sejuk (-4).',
    warnings: ['Pastikan tekstur jas tidak over-brighten.'],
  };

  const parsed = (GeminiService as any).sanitizeAnalysisResult(sampleSection9Output, 'gemini-2.5-flash-lite');

  assert(parsed.sourceMode === 'color', 'Source mode parsed correctly');
  assert(parsed.subject.exposureEV === 0.15, `Exposure EV correct: expected 0.15, got ${parsed.subject.exposureEV}`);
  assert(parsed.subject.brightness === 6, `Brightness correct: expected 6, got ${parsed.subject.brightness}`);
  assert(parsed.subject.contrast === 4, `Contrast correct: expected 4, got ${parsed.subject.contrast}`);
  assert(parsed.subject.highlights === -5, `Highlights correct: expected -5, got ${parsed.subject.highlights}`);
  assert(parsed.subject.shadows === 12, `Shadows correct: expected 12, got ${parsed.subject.shadows}`);
  assert(parsed.subject.whites === 3, `Whites correct: expected 3, got ${parsed.subject.whites}`);
  assert(parsed.subject.blacks === -2, `Blacks correct: expected -2, got ${parsed.subject.blacks}`);
  assert(parsed.subject.sharpening === 7, `Sharpening correct: expected 7, got ${parsed.subject.sharpening}`);
  assert(parsed.subject.noiseProtection === 8, `Noise Protection correct: expected 8, got ${parsed.subject.noiseProtection}`);
  assert(parsed.subject.faceDetail === 11, `Face Detail correct: expected 11, got ${parsed.subject.faceDetail}`);
  assert(parsed.subject.eyeDetail === 14, `Eye Detail correct: expected 14, got ${parsed.subject.eyeDetail}`);
  assert(parsed.subject.hairDetail === 10, `Hair Detail correct: expected 10, got ${parsed.subject.hairDetail}`);
  assert(parsed.subject.skinProtection === 15, `Skin Protection correct: expected 15, got ${parsed.subject.skinProtection}`);

  // Test Levels parameters
  assert(parsed.subject.blackPoint === 8, `Black Point correct: expected 8, got ${parsed.subject.blackPoint}`);
  assert(parsed.subject.midtonesGamma === 1.15, `Midtones Gamma correct: expected 1.15, got ${parsed.subject.midtonesGamma}`);
  assert(parsed.subject.whitePoint === 250, `White Point correct: expected 250, got ${parsed.subject.whitePoint}`);

  // Test Saturation & Selective Color parameters
  assert(parsed.subject.saturation === -3, `Saturation correct: expected -3, got ${parsed.subject.saturation}`);
  assert(parsed.subject.selectiveColors?.reds === -5, `Selective Reds correct: expected -5, got ${parsed.subject.selectiveColors?.reds}`);
  assert(parsed.subject.selectiveColors?.yellows === -3, `Selective Yellows correct: expected -3, got ${parsed.subject.selectiveColors?.yellows}`);
  assert(parsed.subject.selectiveColors?.greens === 0, `Selective Greens correct: expected 0, got ${parsed.subject.selectiveColors?.greens}`);

  // Test Recommendation Profile & Warnings
  assert(parsed.recommendation.recommendationProfile === 'NATURAL_ID_PHOTO', `Profile preserved: ${parsed.recommendation.recommendationProfile}`);
  assert(parsed.recommendation.temperature === -4, `Temperature correct: expected -4, got ${parsed.recommendation.temperature}`);
  assert(parsed.recommendation.tint === 2, `Tint correct: expected 2, got ${parsed.recommendation.tint}`);
  assert(parsed.recommendation.warnings?.[0] === 'Pastikan tekstur jas tidak over-brighten.', 'Warning preserved');
  assert(parsed.analysisSource === 'gemini', 'Analysis source is gemini');

  // Test 2: Extreme values clamping
  const extremeOutput: any = {
    parameters: {
      exposure: { value: 5.0 }, // max 1.0
      brightness: { value: -50 }, // min -25
      contrast: { value: 100 }, // max 25
      highlights: { value: 80 }, // max 25
      shadows: { value: -90 }, // min -25
      whites: { value: 40 }, // max 20
      blacks: { value: -40 }, // min -20
      black_point: { value: 300 }, // max 254
      midtones_gamma: { value: 5.5 }, // max 3.0
      white_point: { value: 500 }, // max 255
      sharpening: { value: 50 }, // max 20
      noise_protection: { value: 50 }, // max 20
      face_detail: { value: 50 }, // max 25
      eye_detail: { value: 50 }, // max 25
      hair_hijab_detail: { value: 50 }, // max 25
      skin_protection: { value: 50 }, // max 25
      saturation: { value: -200 }, // min -50
      temperature: { value: 99 }, // max 25
      tint: { value: -99 }, // min -25
      selective_colors: {
        reds: 250, // max 100
        yellows: -300, // min -100
      },
    },
  };

  const clamped = (GeminiService as any).sanitizeAnalysisResult(extremeOutput, 'gemini-2.5-flash-lite');
  assert(clamped.subject.exposureEV === 1.0, `Exposure clamped to 1.0: got ${clamped.subject.exposureEV}`);
  assert(clamped.subject.brightness === -25, `Brightness clamped to -25: got ${clamped.subject.brightness}`);
  assert(clamped.subject.contrast === 25, `Contrast clamped to 25: got ${clamped.subject.contrast}`);
  assert(clamped.subject.highlights === 25, `Highlights clamped to 25: got ${clamped.subject.highlights}`);
  assert(clamped.subject.shadows === -25, `Shadows clamped to -25: got ${clamped.subject.shadows}`);
  assert(clamped.subject.whites === 20, `Whites clamped to 20: got ${clamped.subject.whites}`);
  assert(clamped.subject.blacks === -20, `Blacks clamped to -20: got ${clamped.subject.blacks}`);
  assert(clamped.subject.blackPoint === 254, `Black point clamped to 254: got ${clamped.subject.blackPoint}`);
  assert(clamped.subject.midtonesGamma === 3.0, `Midtones gamma clamped to 3.0: got ${clamped.subject.midtonesGamma}`);
  assert(clamped.subject.whitePoint === 255, `White point clamped to 255: got ${clamped.subject.whitePoint}`);
  assert(clamped.subject.sharpening === 20, `Sharpening clamped to 20: got ${clamped.subject.sharpening}`);
  assert(clamped.subject.faceDetail === 25, `Face detail clamped to 25: got ${clamped.subject.faceDetail}`);
  assert(clamped.subject.saturation === -50, `Saturation clamped to -50: got ${clamped.subject.saturation}`);
  assert(clamped.recommendation.temperature === 25, `Temperature clamped to 25: got ${clamped.recommendation.temperature}`);
  assert(clamped.recommendation.tint === -25, `Tint clamped to -25: got ${clamped.recommendation.tint}`);
  assert(clamped.subject.selectiveColors?.reds === 100, `Selective red clamped to 100: got ${clamped.subject.selectiveColors?.reds}`);
  assert(clamped.subject.selectiveColors?.yellows === -100, `Selective yellow clamped to -100: got ${clamped.subject.selectiveColors?.yellows}`);

  // Test 3: Legacy format compatibility
  const legacyOutput = {
    sourceMode: 'color',
    subject: {
      exposureEV: 0.1,
      brightness: 5,
      contrast: 3,
      highlights: -4,
      shadows: 8,
      whites: 2,
      blacks: -1,
      sharpening: 6,
      noiseProtection: 7,
      faceDetail: 9,
      eyeDetail: 12,
      hairDetail: 8,
      skinProtection: 14,
      detail: 'Detail wajah normal',
    },
    background: {
      tone: 'sedang',
      uniformity: 'polos',
      colorCast: 'Netral',
      segmentationConfidence: 90,
      isSafeToPreserve: true,
      hasComplexObjects: false,
    },
    global: {
      exposure: 'Normal',
      contrast: 'Standar',
      sharpness: 'Tajam',
      noise: 'Rendah',
      clipping: 'Aman',
      dynamicRange: 'Standar',
      aspectRatio: '3:4',
    },
    recommendation: {
      targetTone: 'natural',
      summary: 'Penyesuaian standar pas foto',
      temperature: 1,
      tint: -1,
    },
  };

  const parsedLegacy = (GeminiService as any).sanitizeAnalysisResult(legacyOutput, 'gemini-2.5-flash-lite');
  assert(parsedLegacy.subject.exposureEV === 0.1, `Legacy exposureEV parsed: ${parsedLegacy.subject.exposureEV}`);
  assert(parsedLegacy.subject.brightness === 5, `Legacy brightness parsed: ${parsedLegacy.subject.brightness}`);
  assert(parsedLegacy.subject.eyeDetail === 12, `Legacy eyeDetail parsed: ${parsedLegacy.subject.eyeDetail}`);
  assert(parsedLegacy.recommendation.temperature === 1, `Legacy temperature parsed: ${parsedLegacy.recommendation.temperature}`);

  console.log('\n>>> ALL MASTER SYSTEM PROMPT QA TESTS PASSED SUCCESSFULLY! <<<\n');
}

runMasterPromptSuite().catch((err) => {
  console.error('QA SUITE ERROR:', err);
  process.exit(1);
});
