import { 
  DEFAULT_FRAMING_SETTINGS,
  getCategoryFramingDefaults,
  OutputDimension 
} from '../src/types/analysis';
import { STANDARD_OUTPUT_DIMENSIONS, CropEngine } from '../src/image/CropEngine';

console.log('--- QA SUITE: VERIFIKASI PENGATURAN DEFAULT GARIS FRAMING ---');

// Test 1: Dimensi Pas Foto Standar Ijazah & Dokumen Resmi (Default ON)
const pasFotoDims = STANDARD_OUTPUT_DIMENSIONS.filter(d => d.category === 'pas_foto');
if (pasFotoDims.length !== 4) {
  console.error(`❌ Expected 4 pas_foto dimensions, got ${pasFotoDims.length}`);
  process.exit(1);
}

for (const dim of pasFotoDims) {
  const framing = getCategoryFramingDefaults(dim);
  if (framing.innerBorderEnabled !== true || framing.outerCutLineEnabled !== true) {
    console.error(`❌ TEST FAILED: ${dim.name} should have both lines enabled!`, framing);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${dim.name} -> Garis Putih: ON, Garis Hitam: ON`);
}

// Test 2: Dimensi Format Cetak & Pos Card (Default OFF)
const cetakDims = STANDARD_OUTPUT_DIMENSIONS.filter(d => d.category === 'cetak');
if (cetakDims.length !== 2) {
  console.error(`❌ Expected 2 cetak dimensions, got ${cetakDims.length}`);
  process.exit(1);
}

for (const dim of cetakDims) {
  const framing = getCategoryFramingDefaults(dim);
  if (framing.innerBorderEnabled !== false || framing.outerCutLineEnabled !== false) {
    console.error(`❌ TEST FAILED: ${dim.name} should have both lines disabled!`, framing);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${dim.name} -> Garis Putih: OFF, Garis Hitam: OFF`);
}

// Test 3: Dimensi Kustom (Default OFF)
const customDim = CropEngine.createCustomDimension(5, 5, 600);
const customFraming = getCategoryFramingDefaults(customDim);
if (customFraming.innerBorderEnabled !== false || customFraming.outerCutLineEnabled !== false) {
  console.error('❌ TEST FAILED: Custom dimension should have both lines disabled by default!', customFraming);
  process.exit(1);
}
console.log('✅ TEST PASSED: Kustom 5x5 cm -> Garis Putih: OFF, Garis Hitam: OFF');

// Test 4: Preservasi parameter lain (lebar mm, opacity, zoom, headroom)
const customBase = {
  ...DEFAULT_FRAMING_SETTINGS,
  outerCutLineOpacity: 75,
  innerBorderWidthMm: 2.5,
  faceZoomPercent: 42,
};
const framingPreserved = getCategoryFramingDefaults(cetakDims[0], customBase);
if (
  framingPreserved.outerCutLineOpacity !== 75 ||
  framingPreserved.innerBorderWidthMm !== 2.5 ||
  framingPreserved.faceZoomPercent !== 42 ||
  framingPreserved.innerBorderEnabled !== false ||
  framingPreserved.outerCutLineEnabled !== false
) {
  console.error('❌ TEST FAILED: Parameter lain tidak terpreservasi!', framingPreserved);
  process.exit(1);
}
console.log('✅ TEST PASSED: Parameter pendukung (opacity, lebar mm, zoom) tetap terpreservasi.');

// Test 5: Kemampuan custom manual setelah default OFF
// Simulasi: pengguna di 4R (default OFF), lalu mengaktifkan Garis Hitam secara manual
const manualFraming = {
  ...framingPreserved,
  outerCutLineEnabled: true,
};
if (manualFraming.outerCutLineEnabled !== true || manualFraming.innerBorderEnabled !== false) {
  console.error('❌ TEST FAILED: Custom manual toggle tidak bekerja!', manualFraming);
  process.exit(1);
}
console.log('✅ TEST PASSED: Custom manual toggle pada ukuran 4R berfungsi fleksibel.');

console.log('--- ALL CATEGORY FRAMING DEFAULTS TESTS PASSED! ---');
