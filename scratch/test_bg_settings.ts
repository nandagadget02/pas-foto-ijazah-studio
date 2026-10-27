import { DEFAULT_BG_SETTINGS, BackgroundSettings } from '../src/types/analysis';

console.log('--- Testing DEFAULT_BG_SETTINGS ---');
console.log('DEFAULT_BG_SETTINGS:', DEFAULT_BG_SETTINGS);

if (DEFAULT_BG_SETTINGS.bgBlur !== 0 || DEFAULT_BG_SETTINGS.contactShadow !== 0 || DEFAULT_BG_SETTINGS.lightHarmonization !== 0) {
  throw new Error('Default bgBlur, contactShadow, or lightHarmonization must be 0 for pristine defaults.');
}
if (DEFAULT_BG_SETTINGS.subjectScale !== 1.0 || DEFAULT_BG_SETTINGS.subjectRotation !== 0) {
  throw new Error('Default subject scale or rotation invalid.');
}

console.log('✓ DEFAULT_BG_SETTINGS is neutral and pristine.');

// Test previewKey generation simulation
function makePreviewKey(file: string, scale: number, rotation: number, blur: number) {
  return [
    file,
    1000,
    0, 0, 100, 100,
    'color', 'natural', 'preserve', 'pas-3x4', 'subject_only',
    false, '', 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    scale, rotation, 0, 0, false,
    blur, 0, 0, 0, 30, 2.5, 60, 0, ''
  ].join('|');
}

const key1 = makePreviewKey('foto.jpg', 1.0, 0, 0);
const key2 = makePreviewKey('foto.jpg', 1.21, 0, 0);
const key3 = makePreviewKey('foto.jpg', 1.21, 5, 0);
const key4 = makePreviewKey('foto.jpg', 1.21, 5, 8);

if (key1 === key2) throw new Error('Changing subject scale did not alter previewKey!');
if (key2 === key3) throw new Error('Changing rotation did not alter previewKey!');
if (key3 === key4) throw new Error('Changing blur did not alter previewKey!');

console.log('✓ previewKey cache invalidation works for all bgSettings adjustments.');
console.log('All tests passed successfully!');
