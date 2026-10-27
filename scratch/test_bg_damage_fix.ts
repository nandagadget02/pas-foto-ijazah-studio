import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { DEFAULT_BG_SETTINGS } from '../src/types/analysis';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

// Mock ImageData for Node test
function createMockImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

console.log('--- TEST 1: Dark Hijab / Hair Protection on Studio Red Backdrop ---');
{
  const width = 100;
  const height = 120;
  const imgData = createMockImageData(width, height);
  const data = imgData.data;

  // 1. Fill entire image with Studio Red backdrop (r=180, g=30, b=30)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 180;
    data[i * 4 + 1] = 30;
    data[i * 4 + 2] = 30;
    data[i * 4 + 3] = 255;
  }

  // 2. Put head/hijab and torso core in the center
  // Hijab & dark hair: r=45, g=30, b=28 (ambient spill: r=60, g=32, b=26)
  for (let y = 30; y < 110; y++) {
    for (let x = 35; x < 65; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 55; // Dark hair / hijab with slight red studio bounce
      data[idx + 1] = 28;
      data[idx + 2] = 25;
      data[idx + 3] = 255;
    }
  }

  // Facial skin tone in inner head
  for (let y = 40; y < 60; y++) {
    for (let x = 44; x < 56; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 210; // Skin
      data[idx + 1] = 160;
      data[idx + 2] = 130;
      data[idx + 3] = 255;
    }
  }

  const result = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);
  const mask = result.mask;

  // Background corners should be 0.0
  assert(mask[0] === 0.0, 'Top-left background pixel is 0.0');
  assert(mask[width - 1] === 0.0, 'Top-right background pixel is 0.0');

  // Head/face center should be 1.0
  const faceIdx = 50 * width + 50;
  assert(mask[faceIdx] === 1.0, 'Face center is 100% solid 1.0');

  // Dark hijab / hair pixel should be 1.0 (NOT classified as background and NOT eroded)
  const hijabIdx = 35 * width + 40;
  assert(mask[hijabIdx] === 1.0, `Hijab pixel is 100% solid 1.0 (actual: ${mask[hijabIdx]})`);

  // Dark torso / clothing pixel should be 1.0
  const torsoIdx = 85 * width + 50;
  assert(mask[torsoIdx] === 1.0, `Torso clothing pixel is 100% solid 1.0 (actual: ${mask[torsoIdx]})`);

  // Check contour boundary of subject: must NOT be eroded to < 0.85
  // x = 35 is boundary
  const boundaryIdx = 50 * width + 35;
  assert(mask[boundaryIdx] >= 0.88, `Subject boundary pixel is protected >= 0.88 (actual: ${mask[boundaryIdx]})`);
}

console.log('\n--- TEST 2: White Clothing on Light / Neutral Backdrop ---');
{
  const width = 100;
  const height = 120;
  const imgData = createMockImageData(width, height);
  const data = imgData.data;

  // Fill with light backdrop (r=225, g=225, b=225)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 225;
    data[i * 4 + 1] = 225;
    data[i * 4 + 2] = 225;
    data[i * 4 + 3] = 255;
  }

  // Head
  for (let y = 30; y < 60; y++) {
    for (let x = 40; x < 60; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 210;
      data[idx + 1] = 160;
      data[idx + 2] = 130;
      data[idx + 3] = 255;
    }
  }

  // White shirt torso (r=240, g=240, b=240)
  for (let y = 60; y < 120; y++) {
    for (let x = 30; x < 70; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 240;
      data[idx + 1] = 240;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }

  const result = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);
  const mask = result.mask;

  // Background corners
  assert(mask[0] === 0.0, 'Top-left background pixel is 0.0');

  // White shirt torso center must be 1.0
  const shirtIdx = 90 * width + 50;
  assert(mask[shirtIdx] === 1.0, `White shirt torso center is solid 1.0 (actual: ${mask[shirtIdx]})`);
}

console.log('\n--- TEST 3: Manual Brush Stroke Engine ---');
{
  const width = 50;
  const height = 50;
  const mask = new Float32Array(width * height).fill(0.0);

  // Apply brush stroke with restore mode (value -> 1.0) at (25, 25) with size 10
  BackgroundEngine.applyBrushStroke(mask, width, height, 25, 25, {
    mode: 'restore',
    size: 10,
    hardness: 0.9,
  });

  const centerIdx = 25 * width + 25;
  assert(mask[centerIdx] === 1.0, 'Brush stroke center restored to 1.0');
  assert(mask[0] === 0.0, 'Untouched pixel outside radius remains 0.0');

  // Apply brush stroke with erase mode (value -> 0.0) at (25, 25) with size 6
  BackgroundEngine.applyBrushStroke(mask, width, height, 25, 25, {
    mode: 'erase',
    size: 6,
    hardness: 1.0,
  });

  assert(mask[centerIdx] === 0.0, 'Brush stroke center erased to 0.0');
}

console.log('\n--- TEST 4: Custom Mask Preservation ---');
{
  const width = 40;
  const height = 40;
  const imgData = createMockImageData(width, height);
  const customMask = new Float32Array(width * height).fill(0.5);
  customMask[10] = 0.99;
  customMask[20] = 0.12;

  const result = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS, customMask);
  assert(Math.abs(result.mask[10] - 0.99) < 1e-4, 'Custom mask pixel 10 preserved');
  assert(Math.abs(result.mask[20] - 0.12) < 1e-4, 'Custom mask pixel 20 preserved');
}

console.log('\nALL BACKGROUND REMOVAL FIX VERIFICATION TESTS PASSED!');
