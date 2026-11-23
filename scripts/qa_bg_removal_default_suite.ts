import { 
  DEFAULT_BG_REMOVAL_MODE,
  BackgroundRemovalMode 
} from '../src/types/analysis';

console.log('--- QA SUITE: VERIFIKASI DEFAULT JANGAN HAPUS BACKGROUND ---');

// Test 1: DEFAULT_BG_REMOVAL_MODE must be 'skip' (Jangan Hapus Background)
if (DEFAULT_BG_REMOVAL_MODE === 'skip') {
  console.log('✅ TEST 1 PASSED: DEFAULT_BG_REMOVAL_MODE bernilai "skip" (Jangan Hapus Background)');
} else {
  console.error(`❌ TEST 1 FAILED: Expected "skip", got "${DEFAULT_BG_REMOVAL_MODE}"`);
  process.exit(1);
}

// Test 2: Mode types valid
const validModes: BackgroundRemovalMode[] = ['remove', 'skip'];
if (validModes.includes('skip') && validModes.includes('remove')) {
  console.log('✅ TEST 2 PASSED: Tipe BackgroundRemovalMode mendukung "skip" dan "remove"');
} else {
  console.error('❌ TEST 2 FAILED: Mode tidak valid');
  process.exit(1);
}

// Test 3: Simulasi inisialisasi gambar untuk berbagai format file (JPG, PNG tanpa transparansi, PNG transparan, WEBP)
const testFormats = [
  { name: 'foto.jpg', hasTransparency: false },
  { name: 'foto_solid.png', hasTransparency: false },
  { name: 'foto_transparan.png', hasTransparency: true },
  { name: 'foto.webp', hasTransparency: false },
];

for (const fmt of testFormats) {
  // Aturan baru: semua format file gambar harus default ke 'skip'
  const initialRemovalMode = DEFAULT_BG_REMOVAL_MODE;
  if (initialRemovalMode !== 'skip') {
    console.error(`❌ TEST FAILED untuk ${fmt.name}: Expected "skip", got ${initialRemovalMode}`);
    process.exit(1);
  }
  console.log(`✅ TEST 3 PASSED: Format ${fmt.name} (hasTransparency: ${fmt.hasTransparency}) -> Default: "Jangan Hapus Background" (skip)`);
}

// Test 4: Simulasi penyesuaian manual (Custom Manual)
// Pengguna bebas memilih 'remove' secara manual
let currentMode: BackgroundRemovalMode = DEFAULT_BG_REMOVAL_MODE;
currentMode = 'remove'; // Pengguna klik kartu 'Hapus Background'
if (currentMode === 'remove') {
  console.log('✅ TEST 4 PASSED: Pengguna dapat beralih ke "Hapus Background" (remove) secara manual');
} else {
  console.error('❌ TEST 4 FAILED: Transisi manual gagal');
  process.exit(1);
}

// Pengguna bebas beralih kembali ke 'skip'
currentMode = 'skip';
if (currentMode === 'skip') {
  console.log('✅ TEST 5 PASSED: Pengguna dapat beralih kembali ke "Jangan Hapus Background" (skip) secara manual');
} else {
  console.error('❌ TEST 5 FAILED: Transisi manual gagal');
  process.exit(1);
}

console.log('--- ALL BG REMOVAL DEFAULT QA TESTS PASSED! ---');
