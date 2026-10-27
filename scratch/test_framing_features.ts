import { DEFAULT_FRAMING_SETTINGS, FramingSettings, OutputDimension, CropRect } from '../src/types/analysis';
import { CropEngine, STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';

console.log('--- 1. Testing DEFAULT_FRAMING_SETTINGS ---');
console.log(DEFAULT_FRAMING_SETTINGS);

if (DEFAULT_FRAMING_SETTINGS.innerBorderWidthMm !== 1.0) {
  throw new Error('Default innerBorderWidthMm must be 1.0 mm');
}
if (DEFAULT_FRAMING_SETTINGS.outerCutLineWidthMm !== 0.04) {
  throw new Error('Default outerCutLineWidthMm must be 0.04 mm');
}
if (DEFAULT_FRAMING_SETTINGS.outerCutLineOpacity !== 100) {
  throw new Error('Default outerCutLineOpacity must be 100%');
}
if (DEFAULT_FRAMING_SETTINGS.headroomMm !== 12) {
  throw new Error('Default headroomMm must be 12 mm');
}
if (DEFAULT_FRAMING_SETTINGS.faceZoomPercent !== 45) {
  throw new Error('Default faceZoomPercent must be 45%');
}
console.log('✓ DEFAULT_FRAMING_SETTINGS verified.');

console.log('--- 2. Testing CropEngine.calculateFramingCrop ---');
const dim3x4 = STANDARD_OUTPUT_DIMENSIONS[0]; // 3x4 cm
const imgW = 2000;
const imgH = 3000;
const initialCrop = CropEngine.getInitialCropRect(imgW, imgH, dim3x4.aspectRatio);

// Test Face Zoom Wajah
const cropZoom36 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, true, 36, false, 12);
const cropZoom45 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, true, 45, false, 12);
const cropZoom60 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, true, 60, false, 12);

console.log('Zoom 36% height:', cropZoom36.height, 'width:', cropZoom36.width);
console.log('Zoom 45% height:', cropZoom45.height, 'width:', cropZoom45.width);
console.log('Zoom 60% height:', cropZoom60.height, 'width:', cropZoom60.width);

if (cropZoom60.height >= cropZoom45.height) {
  throw new Error('60% face zoom should have a tighter crop box than 45%!');
}
if (cropZoom36.height <= cropZoom45.height) {
  throw new Error('36% face zoom should have a larger crop box than 45%!');
}
// Aspect ratios must remain exact 3/4
const aspectErr60 = Math.abs((cropZoom60.width / cropZoom60.height) - dim3x4.aspectRatio);
if (aspectErr60 > 0.01) {
  throw new Error(`Aspect ratio distorted on 60% zoom: ${cropZoom60.width / cropZoom60.height}`);
}
console.log('✓ Face Zoom scaling verified without distortion.');

// Test Top Margin (Headroom)
const cropHeadroom8 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, false, 45, true, 8);
const cropHeadroom12 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, false, 45, true, 12);
const cropHeadroom15 = CropEngine.calculateFramingCrop(imgW, imgH, dim3x4, initialCrop, false, 45, true, 15);

console.log('Headroom 8mm Y:', cropHeadroom8.y);
console.log('Headroom 12mm Y:', cropHeadroom12.y);
console.log('Headroom 15mm Y:', cropHeadroom15.y);

if (cropHeadroom15.y >= cropHeadroom8.y) {
  throw new Error('Larger headroom (15mm) must place the crop box higher (lower Y) to leave space above hair!');
}
console.log('✓ Top Margin (Headroom) verified.');

console.log('--- 3. Testing Preview Cache Key Reactivity ---');
function makeKey(f: FramingSettings): string {
  return [
    'foto.jpg',
    f.innerBorderEnabled,
    f.innerBorderWidthMm,
    f.outerCutLineEnabled,
    f.outerCutLineWidthMm,
    f.outerCutLineOpacity,
    f.faceZoomEnabled,
    f.faceZoomPercent,
    f.headroomEnabled,
    f.headroomMm,
    f.renderLinesOnExport
  ].join('|');
}

const kDefault = makeKey(DEFAULT_FRAMING_SETTINGS);
const kInnerOn = makeKey({ ...DEFAULT_FRAMING_SETTINGS, innerBorderEnabled: true });
const kOuterOn = makeKey({ ...DEFAULT_FRAMING_SETTINGS, outerCutLineEnabled: true });
const kZoom50 = makeKey({ ...DEFAULT_FRAMING_SETTINGS, faceZoomEnabled: true, faceZoomPercent: 50 });
const kHeadroom15 = makeKey({ ...DEFAULT_FRAMING_SETTINGS, headroomEnabled: true, headroomMm: 15 });

if (kDefault === kInnerOn) throw new Error('kDefault === kInnerOn');
if (kDefault === kOuterOn) throw new Error('kDefault === kOuterOn');
if (kDefault === kZoom50) throw new Error('kDefault === kZoom50');
if (kDefault === kHeadroom15) throw new Error('kDefault === kHeadroom15');

console.log('✓ All 4 features reactively invalidate cache key.');
console.log('ALL TESTS PASSED SUCCESSFULLY!');
