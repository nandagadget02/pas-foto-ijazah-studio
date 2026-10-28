import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { DEFAULT_BG_SETTINGS } from '../src/types/analysis';

console.log('===============================================================');
console.log('   QA TEST SUITE: PRECISE BACKGROUND REMOVAL & SUBJECT PRESERVATION ');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✔ ${msg}`);
}

// Helper to create synthetic test ImageData
function createTestPhoto(
  width: number,
  height: number,
  bgGenerator: (x: number, y: number) => [number, number, number],
  subjectGenerator: (x: number, y: number) => [number, number, number] | null
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const subj = subjectGenerator(x, y);
      if (subj) {
        data[idx] = subj[0];
        data[idx + 1] = subj[1];
        data[idx + 2] = subj[2];
        data[idx + 3] = 255;
      } else {
        const bg = bgGenerator(x, y);
        data[idx] = bg[0];
        data[idx + 1] = bg[1];
        data[idx + 2] = bg[2];
        data[idx + 3] = 255;
      }
    }
  }
  return { width, height, data } as any;
}

// --------------------------------------------------------------------------
// TEST CASE 1: Subjek memakai pakaian putih di depan latar abu-abu
// --------------------------------------------------------------------------
console.log('\n[TEST 1] White clothing on light gray backdrop');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    // Gray backdrop: (185, 185, 185) with slight gradient
    (x, y) => [185 + Math.floor(y * 0.05), 185 + Math.floor(y * 0.05), 185 + Math.floor(y * 0.05)],
    // Subject: head (skin/hair) and white shirt (245, 245, 245)
    (x, y) => {
      // Head: center (100, 90), radius 35
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 35 * 35) {
        return [215, 160, 125]; // Skin tone
      }
      // Torso / White shirt: y >= 140, shoulder width expands
      if (y >= 140) {
        const halfW = 40 + (y - 140) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          return [245, 245, 245]; // Pure white shirt
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // Check top-left corner background is removed
  assert(mask[0] === 0.0, 'Top-left background pixel removed (mask = 0)');
  assert(mask[width - 1] === 0.0, 'Top-right background pixel removed (mask = 0)');

  // Check center of face is 100% solid
  const faceIdx = 90 * width + 100;
  assert(mask[faceIdx] === 1.0, 'Facial skin tone is 100% preserved (mask = 1.0)');

  // Check white shirt center (chest) is 100% solid (NO TRANSPARENT HOLES!)
  const chestIdx = 200 * width + 100;
  assert(mask[chestIdx] === 1.0, 'White shirt chest is 100% preserved with zero transparency (mask = 1.0)');

  // Check white shirt shoulder area
  const shoulderIdx = 180 * width + 80;
  assert(mask[shoulderIdx] === 1.0, 'White shirt shoulder is 100% preserved (mask = 1.0)');
}

// --------------------------------------------------------------------------
// TEST CASE 2: Subjek memakai pakaian gelap di depan latar terang
// --------------------------------------------------------------------------
console.log('\n[TEST 2] Dark clothing & black hair on light white backdrop');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    // Light white backdrop: (240, 240, 240)
    () => [240, 240, 240],
    (x, y) => {
      // Dark hair crown
      const dx = x - 100;
      const dy = y - 80;
      if (dx * dx + dy * dy < 38 * 38) {
        if (y < 80) return [25, 25, 25]; // Dark hair
        return [220, 165, 130]; // Face skin
      }
      // Dark suit / clothing
      if (y >= 135) {
        const halfW = 45 + (y - 135) * 0.42;
        if (Math.abs(x - 100) < halfW) {
          return [30, 32, 35]; // Dark suit
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[0] === 0.0, 'Light backdrop removed (mask = 0)');
  const hairIdx = 65 * width + 100;
  assert(mask[hairIdx] === 1.0, 'Dark hair is 100% preserved (mask = 1.0)');
  const suitIdx = 210 * width + 100;
  assert(mask[suitIdx] === 1.0, 'Dark suit is 100% preserved without erosion (mask = 1.0)');
}

// --------------------------------------------------------------------------
// TEST CASE 3: Rambut / hijab memiliki warna mirip dengan latar
// --------------------------------------------------------------------------
console.log('\n[TEST 3] Dark hijab / dark hair on dark studio backdrop');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    // Dark studio backdrop: (45, 45, 48)
    () => [45, 45, 48],
    (x, y) => {
      // Hijab wrapping head: (30, 30, 32)
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 42 * 42) {
        // Inner face opening: dx^2 + dy^2 < 20^2
        if (dx * dx + (dy - 5) * (dy - 5) < 18 * 18) {
          return [218, 162, 128]; // Face skin
        }
        return [30, 30, 32]; // Dark hijab
      }
      // Hijab covering chest
      if (y >= 130) {
        const halfW = 48 + (y - 130) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          return [30, 30, 32]; // Dark hijab over torso
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[0] === 0.0, 'Dark backdrop removed at border');
  const hijabHeadIdx = 65 * width + 100;
  assert(mask[hijabHeadIdx] === 1.0, 'Dark hijab crown is 100% preserved (mask = 1.0)');
  const faceIdx = 95 * width + 100;
  assert(mask[faceIdx] === 1.0, 'Face skin inside hijab is 100% preserved (mask = 1.0)');
  const hijabChestIdx = 190 * width + 100;
  assert(mask[hijabChestIdx] === 1.0, 'Dark hijab over torso is 100% preserved (mask = 1.0)');
}

// --------------------------------------------------------------------------
// TEST CASE 4: Tepi bahu dan pakaian memiliki detail halus
// --------------------------------------------------------------------------
console.log('\n[TEST 4] Edge-aware smooth transition on shoulder boundary');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    () => [50, 110, 220], // Studio Blue
    (x, y) => {
      if (y >= 140) {
        const halfW = 45 + (y - 140) * 0.45;
        if (Math.abs(x - 100) <= halfW) {
          return [240, 240, 240]; // White clothing
        }
      }
      if (x >= 80 && x <= 120 && y >= 60 && y <= 140) {
        return [220, 160, 120]; // Head
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // Background far from edge
  assert(mask[10] === 0.0, 'Far background has 0.0 alpha');

  // Interior of shoulder (e.g. x = 28, y = 200)
  assert(mask[200 * width + 28] === 1.0, 'Interior shoulder is strictly 1.0 (no transparency inside)');

  // Outer rim anti-aliasing (outside subject boundary at x = 26)
  const outerBorderPixel = 200 * width + 26;
  assert(mask[outerBorderPixel] > 0.0 && mask[outerBorderPixel] <= 0.35, 'Exterior rim has controlled sub-pixel anti-aliasing');
}

// --------------------------------------------------------------------------
// TEST CASE 5: Terdapat atribut sekolah, emblem, bendera, atau aksesori kecil
// --------------------------------------------------------------------------
console.log('\n[TEST 5] Atribut sekolah, emblem, bendera merah putih, pin & dasi');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    () => [190, 190, 195], // Neutral gray backdrop
    (x, y) => {
      // Head
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 35 * 35) {
        return [215, 160, 125];
      }
      // Torso
      if (y >= 140) {
        const halfW = 40 + (y - 140) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          // School Emblem / Badge at left chest: x in [65, 80], y in [180, 195]
          if (x >= 65 && x <= 80 && y >= 180 && y <= 195) {
            // Red-and-white bendera emblem or golden badge
            return (y < 188) ? [220, 30, 30] : [250, 250, 250];
          }
          // Tie at center: x in [95, 105], y in [145, 230]
          if (x >= 95 && x <= 105 && y >= 145 && y <= 230) {
            return [25, 25, 25]; // Dark tie
          }
          return [245, 245, 245]; // White school uniform
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // Check School Emblem / Badge is 100% solid
  const emblemRedIdx = 184 * width + 72;
  const emblemWhiteIdx = 192 * width + 72;
  assert(mask[emblemRedIdx] === 1.0, 'Red part of school emblem is 100% preserved (mask = 1.0)');
  assert(mask[emblemWhiteIdx] === 1.0, 'White part of school emblem is 100% preserved (mask = 1.0)');

  // Check Tie is 100% solid
  const tieIdx = 190 * width + 100;
  assert(mask[tieIdx] === 1.0, 'Tie is 100% preserved (mask = 1.0)');
}

// --------------------------------------------------------------------------
// TEST CASE 6: Latar belakang memiliki bayangan atau pencahayaan tidak merata
// --------------------------------------------------------------------------
console.log('\n[TEST 6] Backdrop with non-uniform illumination and soft shadow');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    // Uneven backdrop: blue with soft shadow on the right side
    (x, y) => {
      const shadow = (x > 120) ? Math.min(30, (x - 120) * 0.4) : 0;
      return [35, 85 - shadow, 210 - shadow];
    },
    (x, y) => {
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 35 * 35) return [215, 160, 125];
      if (y >= 140 && Math.abs(x - 100) < (40 + (y - 140) * 0.45)) return [240, 240, 240];
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // Both light side and shadow side of the backdrop should be recognized as background
  assert(mask[10] === 0.0, 'Left side blue backdrop removed (mask = 0)');
  assert(mask[width - 10] === 0.0, 'Right side shadowed blue backdrop removed (mask = 0)');

  // Subject is 100% solid
  assert(mask[90 * width + 100] === 1.0, 'Head preserved 1.0');
  assert(mask[200 * width + 100] === 1.0, 'Torso preserved 1.0');
}

console.log('\n===============================================================');
console.log('   ALL 6 MANDATORY QA TEST SCENARIOS PASSED WITH 100% SUCCESS!  ');
console.log('===============================================================');
