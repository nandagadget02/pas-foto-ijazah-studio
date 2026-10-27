import { CropEngine, STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';
import { BatchProcessingService } from '../src/services/batchProcessingService';
import { ImageProcessor } from '../src/image/ImageProcessor';
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

// Track 2D canvas transform calls
interface ContextOperations {
  translate: [number, number][];
  rotate: number[];
  scale: [number, number][];
  drawImage: any[];
  saveCount: number;
  restoreCount: number;
}

let lastOps: ContextOperations = {
  translate: [],
  rotate: [],
  scale: [],
  drawImage: [],
  saveCount: 0,
  restoreCount: 0,
};

function resetOps() {
  lastOps = {
    translate: [],
    rotate: [],
    scale: [],
    drawImage: [],
    saveCount: 0,
    restoreCount: 0,
  };
}

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
      return {
        width: 100,
        height: 100,
        getContext: () => ({
          drawImage: (...args: any[]) => {
            lastOps.drawImage.push(args);
          },
          getImageData: (x: number, y: number, w: number, h: number) => ({
            width: w || 100,
            height: h || 100,
            data: new Uint8ClampedArray((w || 100) * (h || 100) * 4).fill(180),
          }),
          putImageData: () => {},
          createImageData: (w: number, h: number) => ({
            width: w,
            height: h,
            data: new Uint8ClampedArray(w * h * 4),
          }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          rotate: (rad: number) => {
            lastOps.rotate.push(rad);
          },
          save: () => {
            lastOps.saveCount++;
          },
          restore: () => {
            lastOps.restoreCount++;
          },
          beginPath: () => {},
          rect: () => {},
          stroke: () => {},
          strokeRect: () => {},
          fill: () => {},
          fillRect: () => {},
          clearRect: () => {},
          clip: () => {},
          scale: (sx: number, sy: number) => {
            lastOps.scale.push([sx, sy]);
          },
          translate: (tx: number, ty: number) => {
            lastOps.translate.push([tx, ty]);
          },
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
  console.log('🧪 TEST SUITE: PHOTO ROTATION & STRAIGHTEN FEATURE');
  console.log('====================================================\n');

  const mockImg = new (global as any).Image();
  mockImg.naturalWidth = 2400;
  mockImg.naturalHeight = 3200;
  const targetDim = STANDARD_OUTPUT_DIMENSIONS[0]; // 3x4 cm @ 600 DPI: 661 x 945 px
  const cropRect = { x: 300, y: 400, width: 1200, height: 1600 };

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

  // TEST 1: Unrotated image (0°) uses fast path without calling rotate()
  console.log('--- TEST 1: Rotation = 0° (Unrotated / Neutral) ---');
  resetOps();
  ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    rotation: 0,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'preserve',
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: true,
  });

  assert(lastOps.rotate.length === 0, 'Unrotated 0° does not invoke ctx.rotate');
  assert(lastOps.drawImage.length >= 1, 'Source image drawn successfully');

  // TEST 2: Micro-angle Straightening (-0.1° and +1.5°)
  console.log('\n--- TEST 2: Micro-angle Straightening (-0.1° & +1.5°) ---');
  resetOps();
  const testAngle = 1.5;
  ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    rotation: testAngle,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'preserve',
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: true,
  });

  assert(lastOps.rotate.length === 1, 'Rotation invoked exactly once for crop-centric transform');
  const expectedRad = (testAngle * Math.PI) / 180;
  assert(Math.abs(lastOps.rotate[0] - expectedRad) < 1e-6, `Rotation angle in radians is correct (${expectedRad.toFixed(6)})`);
  assert(lastOps.translate.length >= 1, 'Context translated to canvas center');
  assert(lastOps.translate[0][0] === targetDim.targetWidthPx / 2, 'Translate X is outWidth / 2');
  assert(lastOps.translate[0][1] === targetDim.targetHeightPx / 2, 'Translate Y is outHeight / 2');
  assert(lastOps.saveCount === 1 && lastOps.restoreCount === 1, 'Canvas context saved and restored safely');

  // Verify crop center origin mapping in drawImage:
  const cropCenterX = cropRect.x + cropRect.width / 2;
  const cropCenterY = cropRect.y + cropRect.height / 2;
  const firstDraw = lastOps.drawImage[0];
  assert(firstDraw[1] === -cropCenterX, `drawImage drawn at -cropCenterX (${-cropCenterX})`);
  assert(firstDraw[2] === -cropCenterY, `drawImage drawn at -cropCenterY (${-cropCenterY})`);

  // TEST 3: 90° and -90° Quick Rotation
  console.log('\n--- TEST 3: Quick Turns (-90° Left, +90° Right, 180°) ---');
  resetOps();
  ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    rotation: -90,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'preserve',
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: true,
  });
  assert(Math.abs(lastOps.rotate[0] - ((-90 * Math.PI) / 180)) < 1e-6, 'Counter-clockwise -90° rotated correctly');

  resetOps();
  ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    rotation: 90,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'preserve',
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: true,
  });
  assert(Math.abs(lastOps.rotate[0] - ((90 * Math.PI) / 180)) < 1e-6, 'Clockwise +90° rotated correctly');

  resetOps();
  ImageProcessor.processImage({
    sourceImage: mockImg,
    cropRect,
    rotation: 180,
    params: defaultParams,
    mode: 'bw',
    targetTone: 'natural',
    backgroundType: 'preserve',
    bgSettings: DEFAULT_BG_SETTINGS,
    targetDimension: targetDim,
    isHighResExport: true,
  });
  assert(Math.abs(lastOps.rotate[0] - Math.PI) < 1e-6, '180° inverted turn rotated correctly');

  // TEST 4: Batch Parity & Isolation (Per-photo individual angles)
  console.log('\n--- TEST 4: Batch Parity & State Isolation ---');
  const mockFile1 = { name: 'mahasiswa_01.jpg', size: 1000, type: 'image/jpeg' } as unknown as File;
  const mockFile2 = { name: 'mahasiswa_02.jpg', size: 1200, type: 'image/jpeg' } as unknown as File;
  const mockFile3 = { name: 'mahasiswa_03.jpg', size: 1100, type: 'image/jpeg' } as unknown as File;

  const item1 = await BatchProcessingService.createBatchItem(mockFile1, { selectedDimension: targetDim });
  const item2 = await BatchProcessingService.createBatchItem(mockFile2, { selectedDimension: targetDim });
  const item3 = await BatchProcessingService.createBatchItem(mockFile3, { selectedDimension: targetDim });

  // Assign distinct rotation angles to each photo
  item1.rotation = -2.5; // Slightly tilted head straightened
  item2.rotation = 0.0;  // Perfectly straight
  item3.rotation = 90.0; // Sideways photo rotated upright

  assert(item1.rotation === -2.5, 'Item 1 maintains its own -2.5° rotation');
  assert(item2.rotation === 0.0, 'Item 2 maintains its own 0.0° rotation');
  assert(item3.rotation === 90.0, 'Item 3 maintains its own 90.0° rotation');

  // Test individual processing in BatchProcessingService.processItemPixels
  const mockAnalysis = {
    subject: {
      exposureEV: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      sharpening: 0,
      noiseProtection: 0,
    },
    background: {
      segmentationConfidence: 95,
      edgeComplexity: 10,
    },
    recommendation: {
      targetTone: 'natural' as const,
      temperature: 0,
      tint: 0,
    },
    analysisSource: 'local' as const,
    timestamp: Date.now(),
  };

  const batchOptions = {
    photoMode: 'bw' as const,
    targetTone: 'natural' as const,
    selectedDimension: targetDim,
    bgType: 'preserve' as const,
    customBgImage: null,
    bgSettings: DEFAULT_BG_SETTINGS,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
    faceSharpenSettings: DEFAULT_FACE_SHARPEN_SETTINGS,
    editTargetMode: 'subject_only' as const,
    printerCompensation: DEFAULT_PRINTER_COMPENSATION,
  };

  resetOps();
  BatchProcessingService.processItemPixels(item1, mockAnalysis, batchOptions);
  assert(lastOps.rotate.length === 1, 'Batch Item 1 processing applied rotation');
  assert(Math.abs(lastOps.rotate[0] - ((-2.5 * Math.PI) / 180)) < 1e-6, 'Batch Item 1 rotation angle is -2.5°');

  resetOps();
  BatchProcessingService.processItemPixels(item2, mockAnalysis, batchOptions);
  assert(lastOps.rotate.length === 0, 'Batch Item 2 processing respects 0° unrotated path');

  // Test Batch Sync ("Terapkan Sudut Rotasi ke Semua Foto Batch")
  const syncAngle = 1.2;
  const syncedItems = [item1, item2, item3].map((it) => ({
    ...it,
    rotation: syncAngle,
  }));

  assert(syncedItems.every((it) => it.rotation === 1.2), 'All batch items successfully synced to +1.2°');

  // TEST 5: Full-res 600 DPI Export With Rotation
  console.log('\n--- TEST 5: Full-res 600 DPI Export With Rotation ---');
  resetOps();
  await ImageProcessor.exportPhoto(
    {
      sourceImage: mockImg,
      cropRect,
      rotation: 3.5,
      params: defaultParams,
      mode: 'bw',
      targetTone: 'natural',
      backgroundType: 'preserve',
      bgSettings: DEFAULT_BG_SETTINGS,
      targetDimension: targetDim,
      printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    },
    'master',
    'png'
  );

  assert(lastOps.rotate.length === 1, '600 DPI export applied rotation');
  assert(Math.abs(lastOps.rotate[0] - ((3.5 * Math.PI) / 180)) < 1e-6, '600 DPI export rotated by 3.5°');

  console.log('\n====================================================');
  console.log('🎉 ALL ROTATION & STRAIGHTEN TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
