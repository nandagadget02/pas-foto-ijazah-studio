import { CropEngine, STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';
import { BatchProcessingService } from '../src/services/batchProcessingService';
import {
  DEFAULT_BG_SETTINGS,
  DEFAULT_FRAMING_SETTINGS,
  DEFAULT_FACE_SHARPEN_SETTINGS,
  DEFAULT_PRINTER_COMPENSATION,
  BatchPhotoItem,
  AdjustmentParams,
} from '../src/types/analysis';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

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
  naturalWidth = 2000;
  naturalHeight = 3000;
  width = 2000;
  height = 3000;
  onload: (() => void) | null = null;
  set src(_: string) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};

async function runTests() {
  console.log('=== TEST 1: Framing Crop Default Parity (Single vs Batch) ===');
  const imgWidth = 2000;
  const imgHeight = 3000;
  const dim = STANDARD_OUTPUT_DIMENSIONS.find((d) => d.id === '3x4') || STANDARD_OUTPUT_DIMENSIONS[0];

  // Single mode calculation
  const baseCropSingle = CropEngine.getInitialCropRect(imgWidth, imgHeight, dim.aspectRatio);
  const framingCropSingle = CropEngine.calculateFramingCrop(
    imgWidth,
    imgHeight,
    dim,
    baseCropSingle,
    DEFAULT_FRAMING_SETTINGS.faceZoomEnabled,
    DEFAULT_FRAMING_SETTINGS.faceZoomPercent,
    DEFAULT_FRAMING_SETTINGS.headroomEnabled,
    DEFAULT_FRAMING_SETTINGS.headroomMm
  );

  assert(DEFAULT_FRAMING_SETTINGS.faceZoomPercent === 36, 'Default Face Zoom is 36%');
  assert(DEFAULT_FRAMING_SETTINGS.headroomMm === 15.0, 'Default Headroom is 15.0 mm');
  assert(DEFAULT_FRAMING_SETTINGS.innerBorderEnabled === true, 'Default Inner White Border is ON');
  assert(DEFAULT_FRAMING_SETTINGS.outerCutLineEnabled === true, 'Default Outer Cut Line is ON');
  assert(DEFAULT_FRAMING_SETTINGS.outerCutLineWidthMm === 0.01, 'Default Outer Cut Line is 0.01 mm');

  // Batch item creation calculation
  const mockFile = { name: 'mahasiswa_01.jpg', size: 1024 * 500, type: 'image/jpeg' } as unknown as File;

  const batchItem = await BatchProcessingService.createBatchItem(
    mockFile,
    {
      selectedDimension: dim,
      framingSettings: DEFAULT_FRAMING_SETTINGS,
    }
  );

  assert(batchItem.cropRect !== undefined, 'Batch item created with cropRect');
  assert(batchItem.cropRect!.x === framingCropSingle.x, 'Crop X matches Single mode exactly');
  assert(batchItem.cropRect!.y === framingCropSingle.y, 'Crop Y matches Single mode exactly');
  assert(batchItem.cropRect!.width === framingCropSingle.width, 'Crop Width matches Single mode exactly');
  assert(batchItem.cropRect!.height === framingCropSingle.height, 'Crop Height matches Single mode exactly');

  console.log('\n=== TEST 2: State Isolation (No Leaking Between Batch Items) ===');
  // Item 1: Custom Exposure +0.8 EV, Blue BG, Epson L1210 compensation, 4x6 cm
  const dim4x6 = STANDARD_OUTPUT_DIMENSIONS.find((d) => d.id === '4x6') || STANDARD_OUTPUT_DIMENSIONS[1];
  const customAdj: AdjustmentParams = {
    exposureEV: 0.8,
    brightness: 10,
    contrast: 15,
    highlights: -5,
    shadows: 5,
    whites: 8,
    blacks: -4,
    sharpening: 12,
    noiseProtection: 10,
    faceDetail: 14,
    eyeDetail: 16,
    hairDetail: 12,
    skinProtection: 15,
    saturation: 0,
    temperature: 5200,
    tint: 0,
  };

  const item1: BatchPhotoItem = {
    ...batchItem,
    id: 'item-1',
    name: 'mahasiswa_01.jpg',
    customAdjustments: customAdj,
    bgType: 'blue',
    bgSettings: { ...DEFAULT_BG_SETTINGS, tolerance: 22 },
    printerCompensation: { ...DEFAULT_PRINTER_COMPENSATION, printerProfile: 'epson_l1210', printBrightness: 12 },
    selectedDimension: dim4x6,
    photoMode: 'bw',
    targetTone: 'warm',
  };

  // Item 2: Fresh default item (should NOT inherit Item 1's custom settings)
  const item2 = await BatchProcessingService.createBatchItem(
    { name: 'mahasiswa_02.jpg', size: 1024 * 450, type: 'image/jpeg' } as unknown as File,
    {
      selectedDimension: dim,
      framingSettings: DEFAULT_FRAMING_SETTINGS,
    }
  );

  assert(item1.customAdjustments.exposureEV === 0.8, 'Item 1 has custom exposure 0.8');
  assert(item2.customAdjustments === undefined, 'Item 2 has undefined custom adjustments (isolated)');
  assert(item1.bgType === 'blue', 'Item 1 has Blue background');
  assert(item2.bgType === undefined, 'Item 2 has undefined background (isolated, will use preserve/default)');
  assert(item1.printerCompensation?.printerProfile === 'epson_l1210', 'Item 1 has Epson profile');
  assert(item2.printerCompensation === undefined, 'Item 2 has undefined printer compensation (isolated)');
  assert(item1.selectedDimension.id === '4x6', 'Item 1 is 4x6');
  assert(item2.selectedDimension?.id === '3x4', 'Item 2 is 3x4');

  console.log('\n=== TEST 3: Batch Export ZIP Pipeline Integrity ===');
  // Mock minimal canvas for node execution of processItemPixels
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

  const resultPixels = BatchProcessingService.processItemPixels(
    item1,
    {
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
        faceDetail: 8,
        eyeDetail: 10,
        hairDetail: 8,
        skinProtection: 12,
      },
      recommendation: {
        targetType: 'official',
        temperature: 5500,
        tint: 0,
        contrastLevel: 'medium',
      },
      background: {
        isUniform: true,
        segmentationConfidence: 0.95,
        suggestedBgType: 'preserve',
        detectedBgColor: '#e0e0e0',
      },
      analysisSource: 'local',
    },
    {
      photoMode: 'bw',
      targetTone: 'neutral',
      selectedDimension: dim,
      bgType: 'preserve',
      bgSettings: DEFAULT_BG_SETTINGS,
      printerCompensation: DEFAULT_PRINTER_COMPENSATION,
    }
  );

  assert(resultPixels.masterCanvas !== undefined, 'Master canvas generated');
  assert(resultPixels.printCanvas !== undefined, 'Print canvas generated');
  assert(resultPixels.customAdjustments.exposureEV === 0.8, 'Custom adjustments respected in pixel processing');

  console.log('\n=== ALL BATCH / SINGLE PARITY UNIT TESTS PASSED! ===');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
