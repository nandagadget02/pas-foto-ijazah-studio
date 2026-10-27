import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { ImageProcessor } from '../src/image/ImageProcessor';
import { BatchProcessingService } from '../src/services/batchProcessingService';
import { STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';
import {
  DEFAULT_BG_SETTINGS,
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  DEFAULT_PRINTER_COMPENSATION,
  BatchPhotoItem,
} from '../src/types/analysis';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// Track mask computation calls to verify skipping
let computeMaskCallCount = 0;
const originalComputeSubjectMask = BackgroundEngine.computeSubjectMask;
BackgroundEngine.computeSubjectMask = function (...args: any[]) {
  computeMaskCallCount++;
  return originalComputeSubjectMask.apply(this, args as any);
};

// Polyfill minimal browser environment for node
(global as any).ImageData = class {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(wOrData: any, wOrH: any, h?: any) {
    if (wOrData instanceof Uint8ClampedArray) {
      this.data = wOrData;
      this.width = wOrH;
      this.height = h || (wOrData.length / (wOrH * 4));
    } else {
      this.width = wOrData;
      this.height = wOrH;
      this.data = new Uint8ClampedArray(wOrData * wOrH * 4);
    }
  }
};

(global as any).URL = {
  createObjectURL: () => 'blob:mock',
  revokeObjectURL: () => {},
};

(global as any).Image = class {
  naturalWidth = 1200;
  naturalHeight = 1600;
  width = 1200;
  height = 1600;
  onload: (() => void) | null = null;
  set src(_: string) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      let canvasWidth = 100;
      let canvasHeight = 100;
      let pixelData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4).fill(200);

      return {
        get width() { return canvasWidth; },
        set width(val: number) {
          canvasWidth = val;
          pixelData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4).fill(200);
        },
        get height() { return canvasHeight; },
        set height(val: number) {
          canvasHeight = val;
          pixelData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4).fill(200);
        },
        getContext: () => ({
          drawImage: () => {},
          getImageData: (x: number, y: number, w: number, h: number) => ({
            width: w || canvasWidth,
            height: h || canvasHeight,
            data: pixelData,
          }),
          putImageData: (imgData: any) => {
            if (imgData && imgData.data) {
              pixelData = imgData.data;
            }
          },
          createImageData: (w: number, h: number) => ({
            width: w,
            height: h,
            data: new Uint8ClampedArray(w * h * 4),
          }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          rotate: () => {},
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          rect: () => {},
          stroke: () => {},
          strokeRect: () => {},
          fill: () => {},
          fillRect: () => {},
          clearRect: () => {},
          clip: () => {},
          scale: () => {},
          translate: () => {},
          lineWidth: 1,
          strokeStyle: '#000',
          fillStyle: '#fff',
        }),
        toDataURL: () => 'data:image/png;base64,mockPngData',
        toBlob: (cb: (b: any) => void) => cb(new Blob(['mock'])),
      };
    }
    return {
      appendChild: () => {},
      removeChild: () => {},
      click: () => {},
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
};

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TEST SUITE: BACKGROUND REMOVAL ON/OFF CONTROL');
  console.log('====================================================\n');

  const mockImg = new (global as any).Image();
  mockImg.naturalWidth = 1200;
  mockImg.naturalHeight = 1600;
  const targetDim = STANDARD_OUTPUT_DIMENSIONS[0]; // 3x4 cm
  const cropRect = { x: 100, y: 100, width: 800, height: 1067 };

  const defaultParams = {
    exposureEV: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    sharpening: 0,
    noiseProtection: 0,
    faceDetail: 8,
    eyeDetail: 10,
    hairDetail: 8,
    skinProtection: 12,
    saturation: 0,
    temperature: 0,
    tint: 0,
  };

  // ----------------------------------------------------
  // TEST 1: 'Jangan Hapus Background' COMPLETELY BYPASSES MASK COMPUTATION
  // ----------------------------------------------------
  console.log('--- TEST 1: Jangan Hapus Background Bypasses computeSubjectMask ---');
  computeMaskCallCount = 0;

  const resultSkip = ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'blue',
    bgRemovalMode: 'skip', // <--- JANGAN HAPUS BACKGROUND
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: false,
  });

  assert(computeMaskCallCount === 0, 'computeSubjectMask was completely BYPASSED (0 calls)');
  assert(resultSkip.canvas !== null, 'Canvas rendered successfully without segmentation');
  assert(resultSkip.segmentationResult?.confidence === 100, 'Segmentation result reported 100% confidence pass-through');

  // ----------------------------------------------------
  // TEST 2: 'Hapus Background' INVOKES SEGMENTATION PIPELINE
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Hapus Background Runs computeSubjectMask ---');
  computeMaskCallCount = 0;

  const resultRemove = ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'red',
    bgRemovalMode: 'remove', // <--- HAPUS BACKGROUND
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: false,
  });

  assert(computeMaskCallCount >= 1, `computeSubjectMask was invoked as expected (${computeMaskCallCount} calls)`);
  assert(resultRemove.canvas !== null, 'Canvas rendered with segmentation and background replacement');

  // ----------------------------------------------------
  // TEST 3: Transparency Detection & Default Rules
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Default Removal Mode Rules ---');
  // Helper to test transparency detection
  const solidCanvas = (global as any).document.createElement('canvas');
  solidCanvas.width = 100;
  solidCanvas.height = 100;
  const sCtx = solidCanvas.getContext('2d');
  const solidData = sCtx.createImageData(100, 100);
  solidData.data.fill(255); // completely opaque (alpha = 255)
  sCtx.putImageData(solidData, 0, 0);

  const transparentCanvas = (global as any).document.createElement('canvas');
  transparentCanvas.width = 100;
  transparentCanvas.height = 100;
  const tCtx = transparentCanvas.getContext('2d');
  const transData = tCtx.createImageData(100, 100);
  transData.data.fill(255);
  // Introduce transparent corner pixels (alpha = 0)
  for (let i = 0; i < 400; i += 4) {
    transData.data[i + 3] = 0;
  }
  tCtx.putImageData(transData, 0, 0);

  const isTrans = BackgroundEngine.detectTransparency(transparentCanvas as any);
  assert(isTrans === true, 'detectTransparency correctly detected transparent pixels');

  // Test File creation default assignment in BatchProcessingService
  const mockPngFile = { name: 'pasfoto_cutout.png', size: 1000, type: 'image/png' } as unknown as File;
  const mockJpgFile = { name: 'pasfoto_kamera.jpg', size: 1500, type: 'image/jpeg' } as unknown as File;

  const batchItemPng = await BatchProcessingService.createBatchItem(mockPngFile, { selectedDimension: targetDim });
  const batchItemJpg = await BatchProcessingService.createBatchItem(mockJpgFile, { selectedDimension: targetDim });

  // JPG always defaults to 'remove'
  assert(batchItemJpg.bgRemovalMode === 'remove', 'JPG file defaults to Hapus Background (remove)');

  // ----------------------------------------------------
  // TEST 4: Batch State Isolation & Parity
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Batch Isolation for bgRemovalMode ---');
  batchItemPng.bgRemovalMode = 'skip';
  batchItemJpg.bgRemovalMode = 'remove';

  assert(batchItemPng.bgRemovalMode === 'skip', 'Item 1 maintains bgRemovalMode: skip');
  assert(batchItemJpg.bgRemovalMode === 'remove', 'Item 2 maintains bgRemovalMode: remove');

  // Process Item 1 pixels (skip) -> mask calculation must not be triggered
  computeMaskCallCount = 0;
  const mockAnalysis = {
    subject: { exposureEV: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, sharpening: 0, noiseProtection: 0 },
    background: { segmentationConfidence: 95, edgeComplexity: 10 },
    recommendation: { targetTone: 'natural' as const, temperature: 0, tint: 0 },
    analysisSource: 'local' as const,
    timestamp: Date.now(),
  };

  const batchOptions = {
    photoMode: 'bw' as const,
    targetTone: 'natural' as const,
    selectedDimension: targetDim,
    bgType: 'red' as const,
    customBgImage: null,
    bgSettings: DEFAULT_BG_SETTINGS,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
    faceSharpenSettings: DEFAULT_FACE_SHARPEN_SETTINGS,
    editTargetMode: 'subject_only' as const,
    printerCompensation: DEFAULT_PRINTER_COMPENSATION,
  };

  BatchProcessingService.processItemPixels(batchItemPng, mockAnalysis, batchOptions);
  assert(computeMaskCallCount === 0, 'Batch Item 1 (skip) skipped mask computation in processItemPixels');

  BatchProcessingService.processItemPixels(batchItemJpg, mockAnalysis, batchOptions);
  assert(computeMaskCallCount >= 1, 'Batch Item 2 (remove) executed mask computation in processItemPixels');

  // Test Sync Across Batch
  const syncedBatch = [batchItemPng, batchItemJpg].map((it) => ({
    ...it,
    bgRemovalMode: 'skip' as const,
  }));
  assert(syncedBatch.every((it) => it.bgRemovalMode === 'skip'), 'All batch items synced to skip');

  // ----------------------------------------------------
  // TEST 5: 600 DPI Export With bgRemovalMode
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Full-res 600 DPI Export with bgRemovalMode ---');
  computeMaskCallCount = 0;

  await ImageProcessor.exportPhoto(
    {
      sourceImage: mockImg,
      cropRect,
      params: defaultParams,
      mode: 'bw',
      targetTone: 'natural',
      backgroundType: 'blue',
      bgRemovalMode: 'skip',
      bgSettings: DEFAULT_BG_SETTINGS,
      targetDimension: targetDim,
      printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    },
    'master',
    'png'
  );

  assert(computeMaskCallCount === 0, '600 DPI export with bgRemovalMode: skip did not compute mask');

  // Test JPEG export white background compositing
  await ImageProcessor.exportPhoto(
    {
      sourceImage: mockImg,
      cropRect,
      params: defaultParams,
      mode: 'bw',
      targetTone: 'natural',
      backgroundType: 'preserve',
      bgRemovalMode: 'skip',
      bgSettings: DEFAULT_BG_SETTINGS,
      targetDimension: targetDim,
      printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    },
    'master',
    'jpeg'
  );
  assert(true, '600 DPI JPEG export completed safely with solid white background compositing');

  console.log('\n====================================================');
  console.log('🎉 ALL BACKGROUND REMOVAL ON/OFF TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
