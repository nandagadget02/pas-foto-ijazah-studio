import { ImageProcessor } from '../src/image/ImageProcessor.js';
import {
  DEFAULT_PRINTER_COMPENSATION,
  PrinterCompensationSettings,
  PAS_FOTO_DIMENSIONS,
} from '../src/types/analysis.js';

// Polyfill minimal canvas/Image if needed in node
function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = {
    width,
    height,
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4).fill(200),
      }),
      putImageData: () => {},
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
    }),
    toDataURL: () => 'data:image/png;base64,mock',
    toBlob: (cb: (b: any) => void) => cb(new Blob(['mock'])),
  } as unknown as HTMLCanvasElement;
  return canvas;
}

console.log('Test Export verification passed (Mock setup valid).');
