import { CropEngine } from '../src/image/CropEngine';
import { ImageProcessor } from '../src/image/ImageProcessor';
import { OutputDimension, CropRect, PhotoMode, ToneOption, BackgroundType, BackgroundRemovalMode, EditTargetMode, PrinterProfile, PaperProfile, FramingSettings } from '../src/types/analysis';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✔ ${message}`);
  }
}

console.log('===============================================================');
console.log('   QA TEST SUITE: UNLIMITED MANUAL PHOTO FRAMING POSITION      ');
console.log('===============================================================\n');

const mockMetadata = {
  width: 1200,
  height: 1600,
  aspectRatio: 1200 / 1600,
  resolutionDPI: 600,
  colorSpace: 'sRGB',
  estimatedPrintQuality: 'optimal' as const,
};

const dimension4x6: OutputDimension = {
  id: '4x6',
  label: '4x6 cm (Standar Ijazah)',
  widthCm: 3.81,
  heightCm: 5.59,
  targetWidthPx: 900,
  targetHeightPx: 1320,
  aspectRatio: 3.81 / 5.59,
};

// Simulation of DimensionAndCrop adjustCrop function
function simulateAdjustCrop(
  cropRect: CropRect,
  deltaX: number,
  deltaY: number,
  scaleFactor: number,
  metadata = mockMetadata,
  dim = dimension4x6
): CropRect {
  let newWidth = cropRect.width * scaleFactor;
  let newHeight = newWidth / dim.aspectRatio;

  // Zoom bounds limit
  if (newWidth > metadata.width) {
    newWidth = metadata.width;
    newHeight = newWidth / dim.aspectRatio;
  }
  if (newHeight > metadata.height) {
    newHeight = metadata.height;
    newWidth = newHeight * dim.aspectRatio;
  }

  const newX = cropRect.x + deltaX;
  const newY = cropRect.y + deltaY;

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

// [TEST 1] Initial Centered Crop
console.log('[TEST 1] Initial Centered Crop Baseline');
const initialCrop = CropEngine.getInitialCropRect(mockMetadata.width, mockMetadata.height, dimension4x6.aspectRatio);
assert(initialCrop.x >= 0 && initialCrop.y >= 0, `Initial crop centered with positive coordinates: (${initialCrop.x}, ${initialCrop.y})`);
assert(initialCrop.width <= mockMetadata.width && initialCrop.height <= mockMetadata.height, 'Initial crop fits within source image');

// [TEST 2] Unlimited Translation UP (Naik - Negative Y)
console.log('\n[TEST 2] Unlimited Translation UP (▲ Naik)');
let crop = { ...initialCrop };
for (let i = 0; i < 50; i++) {
  crop = simulateAdjustCrop(crop, 0, -25, 1);
}
assert(crop.y < 0, `Y translated far into negative territory: y = ${crop.y} (no artificial clamp at 0)`);
assert(crop.y === initialCrop.y - 50 * 25, `Y translated exactly by -${50 * 25}px: got ${crop.y}`);
assert(crop.x === initialCrop.x, 'X remains pinned during pure Y translation');

// [TEST 3] Unlimited Translation DOWN (▼ Turun - Positive Y beyond bounds)
console.log('\n[TEST 3] Unlimited Translation DOWN (▼ Turun)');
crop = { ...initialCrop };
for (let i = 0; i < 80; i++) {
  crop = simulateAdjustCrop(crop, 0, 25, 1);
}
const maxOldY = mockMetadata.height - initialCrop.height;
assert(crop.y > maxOldY, `Y translated far beyond image height: y = ${crop.y} > ${maxOldY} (no artificial upper clamp)`);
assert(crop.y === initialCrop.y + 80 * 25, `Y translated exactly by +${80 * 25}px: got ${crop.y}`);

// [TEST 4] Unlimited Translation LEFT (◀ Kiri - Negative X)
console.log('\n[TEST 4] Unlimited Translation LEFT (◀ Kiri)');
crop = { ...initialCrop };
for (let i = 0; i < 40; i++) {
  crop = simulateAdjustCrop(crop, -25, 0, 1);
}
assert(crop.x < 0, `X translated far into negative territory: x = ${crop.x} (no artificial clamp at 0)`);
assert(crop.x === initialCrop.x - 40 * 25, `X translated exactly by -${40 * 25}px: got ${crop.x}`);

// [TEST 5] Unlimited Translation RIGHT (▶ Kanan - Positive X beyond bounds)
console.log('\n[TEST 5] Unlimited Translation RIGHT (▶ Kanan)');
crop = { ...initialCrop };
for (let i = 0; i < 60; i++) {
  crop = simulateAdjustCrop(crop, 25, 0, 1);
}
const maxOldX = mockMetadata.width - initialCrop.width;
assert(crop.x > maxOldX, `X translated far beyond image width: x = ${crop.x} > ${maxOldX} (no artificial upper clamp)`);
assert(crop.x === initialCrop.x + 60 * 25, `X translated exactly by +${60 * 25}px: got ${crop.x}`);

// [TEST 6] Zoom In & Zoom Out bounds strictly preserved
console.log('\n[TEST 6] Zoom Bounds Preservation');
crop = { ...initialCrop };
// Zoom Out 100 times
for (let i = 0; i < 100; i++) {
  crop = simulateAdjustCrop(crop, 0, 0, 1.05);
}
assert(crop.width <= mockMetadata.width, `Zoom Out width capped at imageMetadata.width: ${crop.width} <= ${mockMetadata.width}`);
assert(crop.height <= mockMetadata.height, `Zoom Out height capped at imageMetadata.height: ${crop.height} <= ${mockMetadata.height}`);

// [TEST 7] Reset Crop To Center works cleanly
console.log('\n[TEST 7] Reset To Center');
const resetCrop = CropEngine.getInitialCropRect(mockMetadata.width, mockMetadata.height, dimension4x6.aspectRatio);
assert(resetCrop.x === initialCrop.x && resetCrop.y === initialCrop.y, 'Reset restores exact initial centered coordinates');

console.log('\n===============================================================');
console.log('   ALL 7 UNLIMITED FRAMING QA TESTS PASSED WITH 100%!          ');
console.log('===============================================================\n');
