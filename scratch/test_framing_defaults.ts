import { DEFAULT_FRAMING_SETTINGS } from '../src/types/analysis';
import { ImageProcessor } from '../src/image/ImageProcessor';

console.log('=== VERIFIKASI PENGATURAN DEFAULT FRAMING & GARIS POTONG ===\n');

let passed = 0;
let total = 4;

// 1. Garis Putih (Inner) : default ON
console.log('[Test 1] Garis Putih (Inner):');
if (DEFAULT_FRAMING_SETTINGS.innerBorderEnabled === true && DEFAULT_FRAMING_SETTINGS.innerBorderWidthMm === 1.0) {
  console.log('✓ PASS: Garis Putih (Inner) default ON (true) dengan lebar 1.0 mm.');
  passed++;
} else {
  console.error('✗ FAIL: Garis Putih (Inner) tidak default ON', DEFAULT_FRAMING_SETTINGS);
}

// 2. Garis Hitam (Outer) : default ON, Nilai 0.01 mm dan bisa diubah manual
console.log('\n[Test 2] Garis Hitam (Outer):');
if (DEFAULT_FRAMING_SETTINGS.outerCutLineEnabled === true && DEFAULT_FRAMING_SETTINGS.outerCutLineWidthMm === 0.01) {
  console.log('✓ PASS: Garis Hitam (Outer) default ON (true) dengan nilai awal 0.01 mm.');
  passed++;
} else {
  console.error('✗ FAIL: Garis Hitam (Outer) tidak default ON atau nilainya bukan 0.01 mm', DEFAULT_FRAMING_SETTINGS);
}

// 3. Skala Zoom Wajah : default ON, Nilai 36% dan bisa diubah manual
console.log('\n[Test 3] Skala Zoom Wajah:');
if (DEFAULT_FRAMING_SETTINGS.faceZoomEnabled === true && DEFAULT_FRAMING_SETTINGS.faceZoomPercent === 36) {
  console.log('✓ PASS: Skala Zoom Wajah default ON (true) dengan nilai 36%.');
  passed++;
} else {
  console.error('✗ FAIL: Skala Zoom Wajah tidak default ON atau nilainya bukan 36%', DEFAULT_FRAMING_SETTINGS);
}

// 4. Top Margin (Headroom) : default ON, nilai 15.0 mm
console.log('\n[Test 4] Top Margin (Headroom):');
if (DEFAULT_FRAMING_SETTINGS.headroomEnabled === true && DEFAULT_FRAMING_SETTINGS.headroomMm === 15.0) {
  console.log('✓ PASS: Top Margin (Headroom) default ON (true) dengan nilai 15.0 mm.');
  passed++;
} else {
  console.error('✗ FAIL: Top Margin (Headroom) tidak default ON atau nilainya bukan 15.0 mm', DEFAULT_FRAMING_SETTINGS);
}

console.log(`\nHASIL: ${passed}/${total} PENGUJIAN LULUS.`);
if (passed === total) {
  console.log('SEMUA PENGATURAN DEFAULT BERHASIL DITERAPKAN DENGAN SEMPURNA!');
} else {
  process.exit(1);
}
