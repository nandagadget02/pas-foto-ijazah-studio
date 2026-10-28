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
    (x, y) => [185 + Math.floor(y * 0.05), 185 + Math.floor(y * 0.05), 185 + Math.floor(y * 0.05)],
    (x, y) => {
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 35 * 35) {
        return [215, 160, 125];
      }
      if (y >= 140) {
        const halfW = 40 + (y - 140) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          return [245, 245, 245];
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[0] === 0.0, 'Top-left background pixel removed (mask = 0)');
  assert(mask[width - 1] === 0.0, 'Top-right background pixel removed (mask = 0)');
  assert(mask[90 * width + 100] === 1.0, 'Facial skin tone is 100% preserved (mask = 1.0)');
  assert(mask[200 * width + 100] === 1.0, 'White shirt chest is 100% preserved with zero transparency (mask = 1.0)');
  assert(mask[180 * width + 80] === 1.0, 'White shirt shoulder is 100% preserved (mask = 1.0)');
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
    () => [240, 240, 240],
    (x, y) => {
      const dx = x - 100;
      const dy = y - 80;
      if (dx * dx + dy * dy < 38 * 38) {
        if (y < 80) return [25, 25, 25];
        return [220, 165, 130];
      }
      if (y >= 135) {
        const halfW = 45 + (y - 135) * 0.42;
        if (Math.abs(x - 100) < halfW) {
          return [30, 32, 35];
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[0] === 0.0, 'Light backdrop removed (mask = 0)');
  assert(mask[65 * width + 100] === 1.0, 'Dark hair is 100% preserved (mask = 1.0)');
  assert(mask[210 * width + 100] === 1.0, 'Dark suit is 100% preserved without erosion (mask = 1.0)');
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
    () => [45, 45, 48],
    (x, y) => {
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 42 * 42) {
        if (dx * dx + (dy - 5) * (dy - 5) < 18 * 18) {
          return [218, 162, 128];
        }
        return [30, 30, 32];
      }
      if (y >= 130) {
        const halfW = 48 + (y - 130) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          return [30, 30, 32];
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[0] === 0.0, 'Dark backdrop removed at border');
  assert(mask[65 * width + 100] === 1.0, 'Dark hijab crown is 100% preserved (mask = 1.0)');
  assert(mask[95 * width + 100] === 1.0, 'Face skin inside hijab is 100% preserved (mask = 1.0)');
  assert(mask[190 * width + 100] === 1.0, 'Dark hijab over torso is 100% preserved (mask = 1.0)');
}

// --------------------------------------------------------------------------
// TEST CASE 4: Tepi bahu dan pakaian memiliki detail halus
// --------------------------------------------------------------------------
console.log('\n[TEST 4] Edge-aware clean boundary on shoulder contour');
{
  const width = 200;
  const height = 300;
  const imgData = createTestPhoto(
    width,
    height,
    () => [50, 110, 220],
    (x, y) => {
      if (y >= 140) {
        const halfW = 45 + (y - 140) * 0.45;
        if (Math.abs(x - 100) <= halfW) {
          return [240, 240, 240];
        }
      }
      if (x >= 80 && x <= 120 && y >= 60 && y <= 140) {
        return [220, 160, 120];
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // Exterior background pixel is strictly 0.0 (NO OLD BACKGROUND DRAWN!)
  assert(mask[10] === 0.0, 'Far background has 0.0 alpha');
  assert(mask[200 * width + 25] === 0.0, 'Exterior boundary pixel is strictly 0.0 (prevents halo)');

  // Interior of shoulder
  assert(mask[200 * width + 35] === 1.0, 'Interior shoulder is strictly 1.0');
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
    () => [190, 190, 195],
    (x, y) => {
      const dx = x - 100;
      const dy = y - 90;
      if (dx * dx + dy * dy < 35 * 35) {
        return [215, 160, 125];
      }
      if (y >= 140) {
        const halfW = 40 + (y - 140) * 0.45;
        if (Math.abs(x - 100) < halfW) {
          if (x >= 65 && x <= 80 && y >= 180 && y <= 195) {
            return (y < 188) ? [220, 30, 30] : [250, 250, 250];
          }
          if (x >= 95 && x <= 105 && y >= 145 && y <= 230) {
            return [25, 25, 25];
          }
          return [245, 245, 245];
        }
      }
      return null;
    }
  );

  const { mask } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  assert(mask[184 * width + 72] === 1.0, 'Red part of school emblem is 100% preserved (mask = 1.0)');
  assert(mask[192 * width + 72] === 1.0, 'White part of school emblem is 100% preserved (mask = 1.0)');
  assert(mask[190 * width + 100] === 1.0, 'Tie is 100% preserved (mask = 1.0)');
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

  assert(mask[10] === 0.0, 'Left side blue backdrop removed (mask = 0)');
  assert(mask[width - 10] === 0.0, 'Right side shadowed blue backdrop removed (mask = 0)');
  assert(mask[90 * width + 100] === 1.0, 'Head preserved 1.0');
  assert(mask[200 * width + 100] === 1.0, 'Torso preserved 1.0');
}

// --------------------------------------------------------------------------
// TEST CASE 7: PRAMUKA DENGAN BACKGROUND KUNING RESMI (Sesuai Foto User)
// --------------------------------------------------------------------------
console.log('\n[TEST 7] Pramuka Uniform on Yellow Backdrop (eliminating yellow box & halo)');
{
  const width = 300;
  const height = 400;
  const imgData = createTestPhoto(
    width,
    height,
    // Studio Yellow backdrop: (255, 204, 1)
    () => [255, 204, 1],
    (x, y) => {
      // Hat (top head)
      if (y >= 25 && y <= 85) {
        const dx = x - 150;
        const dy = y - 60;
        if (dx * dx + dy * dy * 1.6 < 55 * 55) {
          return [31, 22, 17]; // Dark brown hat
        }
      }
      // Hijab wrapping head
      if (y >= 75 && y <= 180) {
        const dx = x - 150;
        const dy = y - 130;
        if (dx * dx + dy * dy < 50 * 50) {
          // Inner face opening: dx^2 + dy^2 < 28^2
          if (dx * dx + (dy - 5) * (dy - 5) < 28 * 28) {
            return [215, 160, 125]; // Face skin
          }
          return [172, 145, 126]; // Brown hijab
        }
      }
      // Torso / Pramuka Uniform: y >= 165
      if (y >= 165) {
        const halfW = 55 + (y - 165) * 0.42;
        if (Math.abs(x - 150) <= halfW) {
          // Hasduk red & white
          if (Math.abs(x - 150) <= 15 && y >= 170 && y <= 320) {
            return (Math.floor(y / 25) % 2 === 0) ? [220, 25, 25] : [245, 245, 245];
          }
          // Pramuka patch
          if (x >= 180 && x <= 220 && y >= 230 && y <= 245) {
            return [240, 180, 20]; // Yellow-brown patch
          }
          return [207, 169, 148]; // Brown Pramuka uniform
        }
      }
      return null;
    }
  );

  const { mask, safety } = BackgroundEngine.computeSubjectMask(imgData, DEFAULT_BG_SETTINGS);

  // 1. Check backdrop detected as Yellow
  assert(safety.detectedBgColor === 'Kuning', `Background correctly detected as 'Kuning' (got ${safety.detectedBgColor})`);

  // 2. Check outer background corners removed
  assert(mask[0] === 0.0, 'Top-left yellow backdrop removed (mask = 0)');
  assert(mask[width - 1] === 0.0, 'Top-right yellow backdrop removed (mask = 0)');

  // 3. CRITICAL: Check the area to the left of the face/hat (x=95, y=140)
  // In the old bug, Landmark 2 stamped a yellow rectangle here!
  const leftCheekBgIdx = 140 * width + 90;
  assert(mask[leftCheekBgIdx] === 0.0, 'Yellow area to the left of the face/hat is REMOVED (mask = 0.0, NO YELLOW BOX!)');

  // 4. Check subject parts are 100% solid
  assert(mask[55 * width + 150] === 1.0, 'Pramuka hat is 100% solid (mask = 1.0)');
  assert(mask[130 * width + 150] === 1.0, 'Face skin is 100% solid (mask = 1.0)');
  assert(mask[100 * width + 115] === 1.0, 'Hijab is 100% solid (mask = 1.0)');
  assert(mask[250 * width + 150] === 1.0, 'Pramuka uniform chest is 100% solid (mask = 1.0)');
  assert(mask[280 * width + 85] === 1.0, 'Uniform sleeve is 100% solid (mask = 1.0)');
  assert(mask[238 * width + 200] === 1.0, 'Pramuka badge is 100% solid (mask = 1.0)');

  // 5. Exterior background pixel next to sleeve is strictly 0.0 (NO YELLOW HALO!)
  // At y = 280, halfW = 55 + (280-165)*0.42 = 103, so sleeve boundary is at x = 47
  assert(mask[280 * width + 40] === 0.0, 'Exterior pixel outside sleeve is strictly 0.0 (NO YELLOW HALO!)');
}

console.log('\n===============================================================');
console.log('   ALL 7 QA TEST SCENARIOS PASSED WITH 100% SUCCESS!           ');
console.log('===============================================================');
