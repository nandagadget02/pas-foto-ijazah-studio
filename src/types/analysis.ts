export interface SubjectAnalysis {
  exposureEV: number; // -1.0 to +1.0
  brightness: number; // -25 to +25
  contrast: number; // -25 to +25
  highlights: number; // -25 to +25
  shadows: number; // -25 to +25
  whites: number; // -20 to +20
  blacks: number; // -20 to +20
  sharpening: number; // 0 to 20
  noiseProtection: number; // 0 to 20
  faceDetail?: number; // 0 to 25 (Face contour, eyebrows, lips)
  eyeDetail?: number; // 0 to 25 (Iris, pupil, eyelashes, eyelid edge)
  hairDetail?: number; // 0 to 25 (Hair strands, hijab contour/edge)
  skinProtection?: number; // 0 to 25 (Smooth skin noise/pore dampening)
  detail: string;
  faceExposureCondition?: string;
  clothingCondition?: string;
  // Levels
  blackPoint?: number; // 0 to 254
  midtonesGamma?: number; // 0.10 to 3.00
  whitePoint?: number; // 1 to 255
  // Saturation & Selective Colors
  saturation?: number; // -50 to +50
  selectiveColors?: {
    reds?: number;
    yellows?: number;
    greens?: number;
    cyans?: number;
    blues?: number;
    magentas?: number;
  };
}

export interface BackgroundAnalysis {
  tone: 'terang' | 'sedang' | 'gelap';
  uniformity: 'polos' | 'gradasi' | 'kompleks';
  colorCast: string;
  segmentationConfidence: number; // 0 to 100
  isSafeToPreserve: boolean;
  hasComplexObjects: boolean;
  notes?: string;
}

export interface GlobalAnalysis {
  exposure: string;
  contrast: string;
  sharpness: string;
  noise: string;
  clipping: string;
  dynamicRange: string;
  aspectRatio: string;
  luminanceMean?: number;
  highlightClipRatio?: number;
  shadowClipRatio?: number;
}

export interface GeminiParameterItem {
  value: number;
  adjust: boolean;
  reason?: string;
  confidence?: number;
}

export interface GeminiSelectiveColorsItem {
  reds?: number;
  yellows?: number;
  greens?: number;
  cyans?: number;
  blues?: number;
  magentas?: number;
}

export interface GeminiMasterPromptOutput {
  analysis_status?: string;
  image_quality?: {
    overall_assessment?: string;
    exposure?: string;
    contrast?: string;
    skin_tone?: string;
    highlights?: string;
    shadows?: string;
    sharpness?: string;
    noise?: string;
    white_balance?: string;
    background?: string;
  };
  editing_mode?: string;
  recommendation_profile?: string;
  parameters?: {
    exposure?: GeminiParameterItem;
    brightness?: GeminiParameterItem;
    contrast?: GeminiParameterItem;
    highlights?: GeminiParameterItem;
    shadows?: GeminiParameterItem;
    whites?: GeminiParameterItem;
    blacks?: GeminiParameterItem;
    black_point?: GeminiParameterItem;
    midtones_gamma?: GeminiParameterItem;
    white_point?: GeminiParameterItem;
    eye_detail?: GeminiParameterItem;
    face_detail?: GeminiParameterItem;
    hair_hijab_detail?: GeminiParameterItem;
    sharpening?: GeminiParameterItem;
    noise_protection?: GeminiParameterItem;
    skin_protection?: GeminiParameterItem;
    saturation?: GeminiParameterItem;
    temperature?: GeminiParameterItem;
    tint?: GeminiParameterItem;
    selective_colors?: GeminiSelectiveColorsItem;
  };
  preservation_checks?: {
    facial_identity?: boolean;
    natural_skin_texture?: boolean;
    original_clothing?: boolean;
    original_background?: boolean;
    non_generative_correction?: boolean;
  };
  recommendation_summary?: string;
  warnings?: string[];
}

export interface PhotoAnalysisResult {
  sourceMode: 'color' | 'grayscale';
  subject: SubjectAnalysis;
  background: BackgroundAnalysis;
  global: GlobalAnalysis;
  recommendation: {
    targetTone: 'natural' | 'brighter' | 'softer';
    summary: string;
    temperature: number; // -25 to +25
    tint: number; // -25 to +25
    recommendationProfile?: string;
    warnings?: string[];
  };
  geminiStructuredOutput?: GeminiMasterPromptOutput | any;
  analysisSource: 'gemini' | 'local';
  usedModel?: string;
}

export type PhotoMode = 'bw' | 'color';

export type AnalysisMethod = 'local' | 'gemini';

export type EditTargetMode = 'subject_only' | 'all';

export type TargetTone = 'natural' | 'brighter' | 'softer';

export type BackgroundRemovalMode = 'remove' | 'skip'; // 'remove' = Hapus Background, 'skip' = Jangan Hapus Background

export type BackgroundType =
  | 'preserve'
  | 'red'
  | 'blue'
  | 'white'
  | 'gray'
  | 'black'
  | 'gradient_blue'
  | 'academic_blur'
  | 'transparent'
  | 'custom';

export interface BackgroundSettings {
  // Posisi & Skala Subjek
  subjectOffsetX: number; // -50% to +50%
  subjectOffsetY: number; // -50% to +50%
  subjectScale: number; // 0.6 to 1.5 (default 1.0)
  subjectRotation: number; // -15 to +15 degrees
  subjectFlipX: boolean; // flip horizontal

  // Efek Latar Baru
  bgBlur: number; // 0 to 25px (Depth of Field bokeh)
  bgBrightness: number; // -50 to +50
  bgContrast: number; // -50 to +50

  // Harmonisasi Pencahayaan & Matting
  lightHarmonization: number; // 0 to 100%
  edgeTolerance: number; // 10 to 60 (Sensitivitas hapus latar)
  edgeFeather: number; // 1 to 10px (Kehalusan tepi subjek)
  spillRemoval: number; // 0 to 100% (Hilangkan pantulan warna latar lama di rambut)
  contactShadow: number; // 0 to 100% (Bayangan natural di belakang subjek)
}

export const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  subjectOffsetX: 0,
  subjectOffsetY: 0,
  subjectScale: 1.0,
  subjectRotation: 0,
  subjectFlipX: false,
  bgBlur: 0,
  bgBrightness: 0,
  bgContrast: 0,
  lightHarmonization: 0,
  edgeTolerance: 30,
  edgeFeather: 2.5,
  spillRemoval: 60,
  contactShadow: 0,
};

export interface FramingSettings {
  // 1. Garis Putih (Inner Border)
  innerBorderEnabled: boolean;
  innerBorderWidthMm: number; // mm (default: 1.0)

  // 2. Garis Hitam (Outer Cutting Line)
  outerCutLineEnabled: boolean;
  outerCutLineWidthMm: number; // mm (default: 0.04)
  outerCutLineOpacity: number; // 0 - 100% (default: 50)

  // 3. Skala Zoom Wajah (Face-Centric Framing)
  faceZoomEnabled: boolean;
  faceZoomPercent: number; // 30 - 70% (default: 45)

  // 4. Top Margin (Headroom)
  headroomEnabled: boolean;
  headroomMm: number; // mm (default: 12)

  // Opsi Cetak Garis pada Ekspor Final
  renderLinesOnExport?: boolean;
}

export const DEFAULT_FRAMING_SETTINGS: FramingSettings = {
  innerBorderEnabled: true,
  innerBorderWidthMm: 1.0,
  outerCutLineEnabled: true,
  outerCutLineWidthMm: 0.01,
  outerCutLineOpacity: 50,
  faceZoomEnabled: true,
  faceZoomPercent: 36,
  headroomEnabled: true,
  headroomMm: 15.0,
  renderLinesOnExport: true,
};

export interface FaceSharpenSettings {
  enabled: boolean;
  intensity: number; // 10 to 100%, default 80% (Maksimal)
  radius: number; // 0.6 to 2.5 px, default 1.2 px
  threshold: number; // 1 to 15 levels, default 4
}

export const DEFAULT_FACE_SHARPEN_SETTINGS: FaceSharpenSettings = {
  enabled: true,
  intensity: 80,
  radius: 1.2,
  threshold: 4,
};

export interface AdjustmentParams {
  exposureEV: number; // -1 to +1
  brightness: number; // -25 to +25
  contrast: number; // -25 to +25
  highlights: number; // -25 to +25
  shadows: number; // -25 to +25
  whites: number; // -20 to +20
  blacks: number; // -20 to +20
  sharpening: number; // 0 to 20
  noiseProtection: number; // 0 to 20
  faceDetail: number; // 0 to 25 (Face contour, eyebrows, lips)
  eyeDetail: number; // 0 to 25 (Iris, pupil, eyelashes, eyelid edge)
  hairDetail: number; // 0 to 25 (Hair strands, hijab edge/folds)
  skinProtection: number; // 0 to 25 (Smooth skin protection)
  // Color specific
  saturation: number; // -50 to +50
  temperature: number; // -25 to +25
  tint: number; // -25 to +25
  // Selective Color Saturation (-100 to +100, default 0)
  satRed?: number;
  satYellow?: number;
  satGreen?: number;
  satCyan?: number;
  satBlue?: number;
  satMagenta?: number;
  // Levels (Tingkat Input & Output Tonal)
  levelsInBlack?: number; // 0 to 254, default 0
  levelsGamma?: number; // 0.10 to 3.00, default 1.00
  levelsInWhite?: number; // 1 to 255, default 255
  levelsOutBlack?: number; // 0 to 255, default 0
  levelsOutWhite?: number; // 0 to 255, default 255
}

export interface SliderParameterContext {
  key: string;
  name: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
}

export interface ApplicationAnalysisContext {
  editingMode: 'SUBJECT_ONLY' | 'SUBJECT_AND_BACKGROUND';
  parameters: Record<string, SliderParameterContext>;
}

export function buildApplicationAnalysisContext(
  adjustments: AdjustmentParams,
  editTargetMode: 'subject_only' | 'all' = 'subject_only'
): ApplicationAnalysisContext {
  return {
    editingMode: editTargetMode === 'subject_only' ? 'SUBJECT_ONLY' : 'SUBJECT_AND_BACKGROUND',
    parameters: {
      exposure: {
        key: 'exposure',
        name: 'Exposure (EV)',
        currentValue: adjustments.exposureEV,
        min: -1.0,
        max: 1.0,
        step: 0.05,
      },
      brightness: {
        key: 'brightness',
        name: 'Brightness / Midtone',
        currentValue: adjustments.brightness,
        min: -25,
        max: 25,
        step: 1,
      },
      contrast: {
        key: 'contrast',
        name: 'Contrast',
        currentValue: adjustments.contrast,
        min: -25,
        max: 25,
        step: 1,
      },
      highlights: {
        key: 'highlights',
        name: 'Highlights',
        currentValue: adjustments.highlights,
        min: -25,
        max: 25,
        step: 1,
      },
      shadows: {
        key: 'shadows',
        name: 'Shadows',
        currentValue: adjustments.shadows,
        min: -25,
        max: 25,
        step: 1,
      },
      whites: {
        key: 'whites',
        name: 'Whites',
        currentValue: adjustments.whites,
        min: -20,
        max: 20,
        step: 1,
      },
      blacks: {
        key: 'blacks',
        name: 'Blacks',
        currentValue: adjustments.blacks,
        min: -20,
        max: 20,
        step: 1,
      },
      black_point: {
        key: 'black_point',
        name: 'Black Point (Levels In Black)',
        currentValue: adjustments.levelsInBlack ?? 0,
        min: 0,
        max: 254,
        step: 1,
      },
      midtones_gamma: {
        key: 'midtones_gamma',
        name: 'Midtones / Gamma',
        currentValue: adjustments.levelsGamma ?? 1.0,
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      white_point: {
        key: 'white_point',
        name: 'White Point (Levels In White)',
        currentValue: adjustments.levelsInWhite ?? 255,
        min: 1,
        max: 255,
        step: 1,
      },
      eye_detail: {
        key: 'eye_detail',
        name: 'Eye Detail',
        currentValue: adjustments.eyeDetail,
        min: 0,
        max: 25,
        step: 1,
      },
      face_detail: {
        key: 'face_detail',
        name: 'Face Detail',
        currentValue: adjustments.faceDetail,
        min: 0,
        max: 25,
        step: 1,
      },
      hair_hijab_detail: {
        key: 'hair_hijab_detail',
        name: 'Hair & Hijab Detail',
        currentValue: adjustments.hairDetail,
        min: 0,
        max: 25,
        step: 1,
      },
      sharpening: {
        key: 'sharpening',
        name: 'Sharpening',
        currentValue: adjustments.sharpening,
        min: 0,
        max: 20,
        step: 1,
      },
      noise_protection: {
        key: 'noise_protection',
        name: 'Noise Protection',
        currentValue: adjustments.noiseProtection,
        min: 0,
        max: 20,
        step: 1,
      },
      skin_protection: {
        key: 'skin_protection',
        name: 'Skin Protection',
        currentValue: adjustments.skinProtection,
        min: 0,
        max: 25,
        step: 1,
      },
      saturation: {
        key: 'saturation',
        name: 'Saturation',
        currentValue: adjustments.saturation ?? 0,
        min: -50,
        max: 50,
        step: 1,
      },
      temperature: {
        key: 'temperature',
        name: 'Temperature',
        currentValue: adjustments.temperature,
        min: -25,
        max: 25,
        step: 1,
      },
      tint: {
        key: 'tint',
        name: 'Tint',
        currentValue: adjustments.tint,
        min: -25,
        max: 25,
        step: 1,
      },
      selective_reds: {
        key: 'selective_reds',
        name: 'Selective Color Reds',
        currentValue: adjustments.satRed ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
      selective_yellows: {
        key: 'selective_yellows',
        name: 'Selective Color Yellows',
        currentValue: adjustments.satYellow ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
      selective_greens: {
        key: 'selective_greens',
        name: 'Selective Color Greens',
        currentValue: adjustments.satGreen ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
      selective_cyans: {
        key: 'selective_cyans',
        name: 'Selective Color Cyans',
        currentValue: adjustments.satCyan ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
      selective_blues: {
        key: 'selective_blues',
        name: 'Selective Color Blues',
        currentValue: adjustments.satBlue ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
      selective_magentas: {
        key: 'selective_magentas',
        name: 'Selective Color Magentas',
        currentValue: adjustments.satMagenta ?? 0,
        min: -100,
        max: 100,
        step: 1,
      },
    },
  };
}

export interface OutputDimension {
  id: string;
  name: string;
  category: 'pas_foto' | 'cetak' | 'custom';
  widthCm: number;
  heightCm: number;
  dpi: number;
  targetWidthPx: number;
  targetHeightPx: number;
  aspectRatio: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  sizeBytes: number;
  hasTransparency?: boolean;
}

export type PrinterProfile = 'generic' | 'epson_l1210';

export type PaperProfile = 'glossy' | 'matte' | 'silky_luster' | 'plain';

export interface PrinterCompensationSettings {
  enabled: boolean;
  printerProfile: PrinterProfile;
  paperProfile: PaperProfile;
  neutralBias: number; // -100 (Cool/Blue) to +100 (Warm/Yellow), default 0
  blueBias: number; // -100 to +100, default 0
  yellowBias: number; // -100 to +100, default 0
  redBias: number; // -100 to +100, default 0
  greenBias: number; // -100 to +100, default 0
  // Print Highlight & White Detail Control
  printBrightness: number; // -50 to +50, default 0
  highlightRecovery: number; // 0 to 100, default 0
  whitePoint: number; // -50 to +50, default 0
  whiteGarmentDetail: number; // 0 to 100, default 0
}

export const DEFAULT_PRINTER_COMPENSATION: PrinterCompensationSettings = {
  enabled: false,
  printerProfile: 'generic',
  paperProfile: 'glossy',
  neutralBias: 0,
  blueBias: 0,
  yellowBias: 0,
  redBias: 0,
  greenBias: 0,
  printBrightness: 0,
  highlightRecovery: 0,
  whitePoint: 0,
  whiteGarmentDetail: 0,
};

export interface PrintCompensationPreset {
  id: string;
  name: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
  settings: PrinterCompensationSettings;
}

export interface AIRecommendationPreset {
  id: string;
  name: string;
  source: 'gemini' | 'local';
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  parameters: AdjustmentParams;
  targetTone: TargetTone;
  summary?: string;
  notes?: string;
  usedModel?: string;
  isSystem?: boolean;
}

export interface ExportedAIPresetFile {
  format: 'PAS_FOTO_IJAZAH_AI_PRESETS';
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  presetCount: number;
  presets: AIRecommendationPreset[];
}

export type PhotoInputMode = 'single' | 'batch';

export type BatchItemStatus =
  | 'idle'
  | 'waiting_analysis'
  | 'analyzing'
  | 'analysis_done'
  | 'analysis_error'
  | 'waiting_processing'
  | 'processing'
  | 'done'
  | 'error';

export type BatchErrorType =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'quota'
  | 'auth'
  | 'invalid_response'
  | 'processing';

export type DiagnosticPreviewMode = 'composite' | 'overlay' | 'mask' | 'original';

export interface MaskBrushSettings {
  mode: 'restore' | 'erase';
  size: number; // 5 to 80 px
  hardness: number; // 0.1 to 1.0 (10% to 100%)
}

export const DEFAULT_MASK_BRUSH: MaskBrushSettings = {
  mode: 'restore',
  size: 25,
  hardness: 0.85,
};

export interface BatchPhotoItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  sourceImage: HTMLImageElement;
  metadata: ImageMetadata;
  status: BatchItemStatus;
  progressText?: string;
  errorMessage?: string;
  errorType?: BatchErrorType;
  durationMs?: number;
  cropRect?: CropRect;
  rotation?: number; // Sudut rotasi foto dalam derajat (-180 hingga +180)
  customAdjustments?: AdjustmentParams;
  bgSettings?: BackgroundSettings;
  bgType?: BackgroundType;
  bgRemovalMode?: BackgroundRemovalMode;
  customMask?: Float32Array;
  diagnosticMode?: DiagnosticPreviewMode;
  framingSettings?: FramingSettings;
  faceSharpenSettings?: FaceSharpenSettings;
  printerCompensation?: PrinterCompensationSettings;
  photoMode?: PhotoMode;
  targetTone?: TargetTone;
  selectedDimension?: OutputDimension;
  editTargetMode?: EditTargetMode;
  analysisResult?: PhotoAnalysisResult | null;
  localAnalysisResult?: PhotoAnalysisResult | null;
  geminiAnalysisResult?: PhotoAnalysisResult | null;
  processedCanvas?: HTMLCanvasElement | null;
  masterCanvas?: HTMLCanvasElement | null;
  printCanvas?: HTMLCanvasElement | null;
}
