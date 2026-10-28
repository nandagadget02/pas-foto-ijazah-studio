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
  };
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
  outerCutLineOpacity: number; // 0 - 100% (default: 100)

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
  outerCutLineOpacity: 100,
  faceZoomEnabled: true,
  faceZoomPercent: 36,
  headroomEnabled: true,
  headroomMm: 15.0,
  renderLinesOnExport: true,
};

export interface FaceSharpenSettings {
  enabled: boolean;
  intensity: number; // 10 to 100%, default 40%
  radius: number; // 0.6 to 2.5 px, default 1.2 px
  threshold: number; // 1 to 15 levels, default 4
}

export const DEFAULT_FACE_SHARPEN_SETTINGS: FaceSharpenSettings = {
  enabled: true,
  intensity: 40,
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
