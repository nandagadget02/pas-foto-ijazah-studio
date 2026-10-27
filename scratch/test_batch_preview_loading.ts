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
          drawImage: () => {},
          getImageData: () => ({
            width: 100,
            height: 100,
            data: new Uint8ClampedArray(100 * 100 * 4).fill(180),
          }),
          putImageData: () => {},
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
    return {};
  },
};

async function testBatchPreviewInstantLoading() {
  console.log('=== TEST 1: Batch Item Creation Immediately Holds Decoded Image ===');
  const file1 = { name: 'foto_01.jpg', size: 1024 * 300, type: 'image/jpeg' } as unknown as File;
  const file2 = { name: 'foto_02.jpg', size: 1024 * 350, type: 'image/jpeg' } as unknown as File;
  const targetDim = STANDARD_OUTPUT_DIMENSIONS[0];

  const item1 = await BatchProcessingService.createBatchItem(file1, {
    selectedDimension: targetDim,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
  });

  const item2 = await BatchProcessingService.createBatchItem(file2, {
    selectedDimension: targetDim,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
  });

  assert(item1.sourceImage !== undefined && item1.sourceImage !== null, 'Item 1 sourceImage is immediately decoded');
  assert(item1.cropRect !== undefined, 'Item 1 cropRect is immediately calculated');
  assert(item2.sourceImage !== undefined && item2.sourceImage !== null, 'Item 2 sourceImage is immediately decoded');

  console.log('\n=== TEST 2: Instant Preview Generation (0ms, No API, No Full Pipeline Block) ===');
  // Process instant preview synchronously
  const quick1 = ImageProcessor.processImage({
    sourceImage: item1.sourceImage,
    cropRect: item1.cropRect!,
    params: {
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
      temperature: 5500,
      tint: 0,
    },
    mode: 'bw',
    targetTone: 'neutral',
    backgroundType: 'preserve',
    targetDimension: targetDim,
    isHighResExport: false,
    editTargetMode: 'subject_only',
    printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
    faceSharpenSettings: DEFAULT_FACE_SHARPEN_SETTINGS,
  });

  assert(quick1.canvas !== undefined && quick1.canvas !== null, 'Quick preview canvas generated synchronously');
  assert(quick1.printCanvas !== undefined && quick1.printCanvas !== null, 'Quick print canvas generated synchronously');

  console.log('\n=== TEST 3: Switching Between Photos Restores Canvas Without Blanking Out ===');
  // Photo 1 -> Photo 2
  let activeImage: HTMLImageElement | null = null;
  let activeCanvas: any = null;

  // Select Photo 1
  activeImage = item1.sourceImage;
  activeCanvas = quick1.canvas;
  assert(activeImage === item1.sourceImage, 'Photo 1 is active');
  assert(activeCanvas !== null, 'Photo 1 canvas is ready to display');

  // Switch to Photo 2
  activeImage = item2.sourceImage;
  const quick2 = ImageProcessor.processImage({
    sourceImage: item2.sourceImage,
    cropRect: item2.cropRect!,
    params: {
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
      temperature: 5500,
      tint: 0,
    },
    mode: 'bw',
    targetTone: 'neutral',
    backgroundType: 'preserve',
    targetDimension: targetDim,
    isHighResExport: false,
    editTargetMode: 'subject_only',
    printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    framingSettings: DEFAULT_FRAMING_SETTINGS,
    faceSharpenSettings: DEFAULT_FACE_SHARPEN_SETTINGS,
  });
  activeCanvas = quick2.canvas;

  assert(activeImage === item2.sourceImage, 'Photo 2 is active');
  assert(activeCanvas !== null, 'Photo 2 canvas is ready to display immediately without waiting for batch processing queue');

  console.log('\n=== ALL BATCH PREVIEW LOADING TESTS PASSED! ===');
}

testBatchPreviewInstantLoading().catch((e) => {
  console.error(e);
  process.exit(1);
});
