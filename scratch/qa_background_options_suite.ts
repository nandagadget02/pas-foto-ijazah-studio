import { BackgroundEngine } from '../src/image/BackgroundEngine';
import { BackgroundType } from '../src/types/analysis';

console.log('===============================================================');
console.log('   QA TEST SUITE: BACKGROUND OPTIONS & CONSISTENCY CHECK       ');
console.log('===============================================================');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✔ ${msg}`);
}

const width = 100;
const height = 150;
const testCanvas = {
  width,
  height,
  getContext: () => ({
    getImageData: () => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4)
    }),
    clearRect: () => {},
    putImageData: () => {},
    createImageData: () => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4)
    }),
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    filter: ''
  })
} as any;

(global as any).document = {
  createElement: () => testCanvas
};

const options: BackgroundType[] = [
  'preserve',
  'white',
  'gray',
  'black',
  'transparent',
  'custom',
  'red',
  'blue'
];

const precomputedMask = new Float32Array(width * height);
// Set central subject to 1.0
for (let y = 30; y < height; y++) {
  for (let x = 20; x < width - 20; x++) {
    precomputedMask[y * width + x] = 1.0;
  }
}

for (const bg of options) {
  const res = BackgroundEngine.applyBackgroundReplacement(
    testCanvas,
    bg,
    null,
    undefined,
    precomputedMask
  );
  assert(res.isSafe === true, `Background option '${bg}' successfully applied with safe result`);
}

console.log('\nAll 8 background replacement options verified successfully!');
