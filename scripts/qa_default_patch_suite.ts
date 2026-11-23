import { 
  DEFAULT_FRAMING_SETTINGS, 
  DEFAULT_FACE_SHARPEN_SETTINGS 
} from '../src/types/analysis';

console.log('--- QA SUITE: VERIFIKASI DEFAULT SETTINGS V4.0 ---');

// Test 1: DEFAULT_FACE_SHARPEN_SETTINGS intensity
if (DEFAULT_FACE_SHARPEN_SETTINGS.intensity === 80) {
  console.log('✅ TEST 1 PASSED: DEFAULT_FACE_SHARPEN_SETTINGS.intensity adalah 80% (Maksimal)');
} else {
  console.error(`❌ TEST 1 FAILED: Expected 80, got ${DEFAULT_FACE_SHARPEN_SETTINGS.intensity}`);
  process.exit(1);
}

// Test 2: DEFAULT_FRAMING_SETTINGS outerCutLineOpacity
if (DEFAULT_FRAMING_SETTINGS.outerCutLineOpacity === 50) {
  console.log('✅ TEST 2 PASSED: DEFAULT_FRAMING_SETTINGS.outerCutLineOpacity adalah 50%');
} else {
  console.error(`❌ TEST 2 FAILED: Expected 50, got ${DEFAULT_FRAMING_SETTINGS.outerCutLineOpacity}`);
  process.exit(1);
}

// Test 3: Face sharpening enabled by default
if (DEFAULT_FACE_SHARPEN_SETTINGS.enabled === true) {
  console.log('✅ TEST 3 PASSED: DEFAULT_FACE_SHARPEN_SETTINGS.enabled adalah true');
} else {
  console.error('❌ TEST 3 FAILED: Expected enabled true');
  process.exit(1);
}

// Test 4: Outer cut line enabled by default
if (DEFAULT_FRAMING_SETTINGS.outerCutLineEnabled === true) {
  console.log('✅ TEST 4 PASSED: DEFAULT_FRAMING_SETTINGS.outerCutLineEnabled adalah true');
} else {
  console.error('❌ TEST 4 FAILED: Expected outerCutLineEnabled true');
  process.exit(1);
}

console.log('--- ALL DEFAULT SETTINGS QA TESTS PASSED! ---');
