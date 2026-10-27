import { ImageProcessor } from '../src/image/ImageProcessor';
import { STANDARD_OUTPUT_DIMENSIONS } from '../src/image/CropEngine';
import { DEFAULT_BG_SETTINGS, DEFAULT_FRAMING_SETTINGS, DEFAULT_FACE_SHARPEN_SETTINGS, DEFAULT_PRINTER_COMPENSATION } from '../src/types/analysis';

console.log('Testing ImageProcessor with diagnostic modes...');

// Mock HTMLImageElement for Node
const mockImg = {
  naturalWidth: 600,
  naturalHeight: 800,
  width: 600,
  height: 800,
} as unknown as HTMLImageElement;

// Mock canvas in Node if document is undefined
if (typeof document === 'undefined') {
  // Let's see what happens
}
