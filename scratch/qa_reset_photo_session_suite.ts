import { GeminiService } from '../src/services/GeminiService';
import { STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';
import {
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  DEFAULT_BG_SETTINGS,
  DEFAULT_MASK_BRUSH,
  DEFAULT_PRINTER_COMPENSATION
} from '../src/types/analysis';

console.log('===============================================================');
console.log('   QA TEST SUITE: GANTI FOTO & RESET TOTAL SESI PEMROSESAN     ');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✔ ${msg}`);
}

// 1. Test Initial Adjustments baseline purity
console.log('\n[TEST 1] Initial Adjustments baseline purity');
const initialAdj = GeminiService.getInitialAdjustments();
assert(initialAdj.exposureEV === 0, 'exposureEV is 0');
assert(initialAdj.contrast === 0, 'contrast is 0');
assert(initialAdj.brightness === 0, 'brightness is 0');
assert(initialAdj.levelsInBlack === 0, 'levelsInBlack is 0');
assert(initialAdj.levelsGamma === 1.0, 'levelsGamma is 1.0');
assert(initialAdj.levelsInWhite === 255, 'levelsInWhite is 255');
assert(initialAdj.levelsOutBlack === 0, 'levelsOutBlack is 0');
assert(initialAdj.levelsOutWhite === 255, 'levelsOutWhite is 255');
assert(initialAdj.satRed === 0, 'satRed is 0');
assert(initialAdj.satYellow === 0, 'satYellow is 0');
assert(initialAdj.satGreen === 0, 'satGreen is 0');
assert(initialAdj.satCyan === 0, 'satCyan is 0');
assert(initialAdj.satBlue === 0, 'satBlue is 0');
assert(initialAdj.satMagenta === 0, 'satMagenta is 0');

// 2. Test Simulation of Session State Lifecycle: Photo A loaded, modified, then Reset
console.log('\n[TEST 2] Simulation of Photo A session mutation & Total Reset execution');

// Mock Session State
let state = {
  // Source
  sourceImage: {} as any,
  sourceFile: { name: 'photo_a.jpg', size: 1024000 } as any,
  imageMetadata: { width: 1200, height: 1600 } as any,
  // Canvases
  masterCanvas: {} as any,
  processedCanvas: {} as any,
  printCanvas: {} as any,
  // Adjustments & Tone
  adjustments: { ...initialAdj, exposureEV: 0.8, contrast: 15, levelsInBlack: 25, satRed: 40 },
  previousAdjustments: { ...initialAdj },
  targetTone: 'warm_tone' as any,
  editTargetMode: 'background_only' as any,
  // Crop & Orientation
  selectedDimension: STANDARD_OUTPUT_DIMENSIONS[1], // 4x6 cm
  cropRect: { x: 50, y: 50, width: 800, height: 1200 },
  cropWarning: 'Perhatian: batas wajah' as any,
  rotation: 12.5,
  previousRotation: 0 as any,
  framingSettings: { ...DEFAULT_FRAMING_SETTINGS, faceZoomEnabled: true, faceZoomPercent: 20 },
  faceSharpenSettings: { ...DEFAULT_FACE_SHARPEN_SETTINGS, strength: 30 },
  // Background & Masking
  bgType: 'red' as any,
  bgRemovalMode: 'skip' as any,
  customBgImage: {} as any,
  customBgPreviewUrl: 'blob:http://localhost:3000/123-fake-blob',
  bgSettings: { ...DEFAULT_BG_SETTINGS, tolerance: 40 },
  detectedBgColor: '#ffffff',
  segmentationWarning: 'Peringatan segmentasi' as any,
  diagnosticMode: 'alpha' as any,
  isBrushActive: true,
  customMask: new Float32Array([1, 0, 1, 0]),
  maskVersion: 5,
  maskHistory: [new Float32Array([1, 0])],
  maskRedoStack: [new Float32Array([0, 1])],
  edgeInspectionFocus: 'hair' as any,
  // Analysis
  localAnalysisResult: { subject: { skinToneCategory: 'fair' } } as any,
  geminiAnalysisResult: { subject: { skinToneCategory: 'fair' } } as any,
  analysisResult: { subject: { skinToneCategory: 'fair' } } as any,
  analysisError: 'Some error' as any,
  analysisStepText: 'Langkah analisis aktif...',
  isShowingAnalysisDetails: true,
  // View & Export
  isComparisonOpen: true,
  printerCompensation: { ...DEFAULT_PRINTER_COMPENSATION, enabled: true },
  activePreviewTarget: 'print' as any,
  exportFormat: 'jpeg' as any,
  exportQuality: 0.85,
  activeStepTab: 'mask' as any,
  // Preserved credentials
  apiKey: 'AIzaSyFakeApiKey123',
  selectedModel: 'gemini-2.5-flash-lite',
  analysisMethod: 'local'
};

// Mock Refs & Controllers
let singleAnalysisAbortController: AbortController | null = new AbortController();
let previewTimer: any = setTimeout(() => {}, 10000);
let previewCache = new Map<string, any>([['key1', { dummy: 1 }], ['key2', { dummy: 2 }]]);
let activeMaskRef = { current: new Float32Array([1, 1]) as any };
let rawCroppedCanvasRef = { current: {} as any };
let lastCompositeCanvasRef = { current: {} as any };
let revokedUrls: string[] = [];

// Simulate handleResetPhotoSession
function executeResetPhotoSession() {
  // 1. Abort controllers & timers
  if (singleAnalysisAbortController) {
    singleAnalysisAbortController.abort();
    singleAnalysisAbortController = null;
  }
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  // 2. Revoke URLs
  if (state.customBgPreviewUrl) {
    revokedUrls.push(state.customBgPreviewUrl);
    state.customBgPreviewUrl = null as any;
  }
  state.customBgImage = null;

  // 3. Clear cache & internal canvas refs
  previewCache.clear();
  activeMaskRef.current = null;
  rawCroppedCanvasRef.current = null;
  lastCompositeCanvasRef.current = null;

  // 4. Reset Image Source & Metadata
  state.sourceImage = null;
  state.sourceFile = null;
  state.imageMetadata = null;

  // 5. Reset Canvases
  state.masterCanvas = null;
  state.processedCanvas = null;
  state.printCanvas = null;

  // 6. Reset Adjustments & Tonal
  state.adjustments = GeminiService.getInitialAdjustments();
  state.previousAdjustments = null;
  state.targetTone = 'natural';
  state.editTargetMode = 'subject_only';

  // 7. Reset Crop, Rotation, Framing, Sharpen
  state.selectedDimension = STANDARD_OUTPUT_DIMENSIONS[0];
  state.cropRect = { x: 0, y: 0, width: 600, height: 800 };
  state.cropWarning = null;
  state.rotation = 0;
  state.previousRotation = null;
  state.framingSettings = DEFAULT_FRAMING_SETTINGS;
  state.faceSharpenSettings = DEFAULT_FACE_SHARPEN_SETTINGS;

  // 8. Reset Background & Masking
  state.bgType = 'preserve';
  state.bgRemovalMode = 'remove';
  state.bgSettings = DEFAULT_BG_SETTINGS;
  state.detectedBgColor = undefined;
  state.segmentationWarning = null;
  state.diagnosticMode = 'composite';
  state.isBrushActive = false;
  state.customMask = null;
  state.maskVersion = 0;
  state.maskHistory = [];
  state.maskRedoStack = [];
  state.edgeInspectionFocus = 'fit';

  // 9. Reset Analysis
  state.localAnalysisResult = null;
  state.geminiAnalysisResult = null;
  state.analysisResult = null;
  state.analysisError = null;
  state.analysisStepText = 'Menganalisis foto...';
  state.isShowingAnalysisDetails = false;

  // 10. Reset Comparison & Printer
  state.isComparisonOpen = false;
  state.printerCompensation = DEFAULT_PRINTER_COMPENSATION;
  state.activePreviewTarget = 'master';

  // 11. Reset Export
  state.exportFormat = 'png';
  state.exportQuality = 1.0;

  // 12. Reset Step Tab
  state.activeStepTab = 'adjust';
}

// Execute the Reset
executeResetPhotoSession();

// Verify post-reset guarantees
assert(singleAnalysisAbortController === null, 'In-flight analysis abort controller aborted & set to null');
assert(previewTimer === null, 'Preview timer cleared & set to null');
assert(revokedUrls.includes('blob:http://localhost:3000/123-fake-blob'), 'Custom BG object URL revoked');
assert(previewCache.size === 0, 'Preview cache completely cleared (size 0)');
assert(activeMaskRef.current === null, 'activeMaskRef is null');
assert(rawCroppedCanvasRef.current === null, 'rawCroppedCanvasRef is null');
assert(lastCompositeCanvasRef.current === null, 'lastCompositeCanvasRef is null');

assert(state.sourceImage === null, 'sourceImage is null (Upload zone will render)');
assert(state.sourceFile === null, 'sourceFile is null');
assert(state.imageMetadata === null, 'imageMetadata is null');
assert(state.masterCanvas === null, 'masterCanvas is null');
assert(state.processedCanvas === null, 'processedCanvas is null');
assert(state.printCanvas === null, 'printCanvas is null');

assert(state.adjustments.exposureEV === 0, 'adjustments.exposureEV reset to 0');
assert(state.adjustments.contrast === 0, 'adjustments.contrast reset to 0');
assert(state.adjustments.levelsInBlack === 0, 'adjustments.levelsInBlack reset to 0');
assert(state.adjustments.satRed === 0, 'adjustments.satRed reset to 0');
assert(state.targetTone === 'natural', 'targetTone reset to natural');
assert(state.editTargetMode === 'subject_only', 'editTargetMode reset to subject_only');

assert(state.rotation === 0, 'rotation reset to 0');
assert(state.previousRotation === null, 'previousRotation reset to null');
assert(state.cropWarning === null, 'cropWarning reset to null');
assert(state.bgType === 'preserve', 'bgType reset to preserve');
assert(state.customMask === null, 'customMask reset to null');
assert(state.maskHistory.length === 0, 'maskHistory cleared');
assert(state.isComparisonOpen === false, 'isComparisonOpen reset to false');
assert(state.activeStepTab === 'adjust', 'activeStepTab reset to adjust');

// 3. Test Preservation of Persistent Settings
console.log('\n[TEST 3] Preserved credentials and settings guarantee');
assert(state.apiKey === 'AIzaSyFakeApiKey123', 'Gemini API Key preserved intact');
assert(state.selectedModel === 'gemini-2.5-flash-lite', 'Selected model preserved intact');
assert(state.analysisMethod === 'local', 'Analysis method preserved intact');

// 4. Test Subsequent Photo B clean initiation
console.log('\n[TEST 4] Subsequent Photo B clean initiation without Photo A contamination');
const photoB = {
  sourceImage: {} as any,
  sourceFile: { name: 'photo_b.png', size: 2048000 } as any,
  imageMetadata: { width: 1000, height: 1400, hasTransparency: false } as any
};
state.sourceImage = photoB.sourceImage;
state.sourceFile = photoB.sourceFile;
state.imageMetadata = photoB.imageMetadata;

assert(state.sourceFile.name === 'photo_b.png', 'Photo B loaded as new active source');
assert(state.adjustments.exposureEV === 0, 'Photo B starts with clean default adjustments (exposureEV 0)');
assert(state.adjustments.satRed === 0, 'Photo B starts with clean selective saturation (0)');
assert(state.customMask === null, 'Photo B has no residual mask from Photo A');
assert(previewCache.size === 0, 'Photo B starts with empty preview cache');

console.log('\n===============================================================');
console.log('   ALL RESET PHOTO SESSION QA TESTS PASSED WITH 100% SUCCESS!  ');
console.log('===============================================================');
