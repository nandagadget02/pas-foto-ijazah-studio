import { OutputDimension, CropRect } from '../types/analysis';

export const STANDARD_OUTPUT_DIMENSIONS: OutputDimension[] = [
  {
    id: '3x4',
    name: '3 × 4 cm (Standar Ijazah)',
    category: 'pas_foto',
    widthCm: 3,
    heightCm: 4,
    dpi: 600,
    targetWidthPx: 709,
    targetHeightPx: 945,
    aspectRatio: 3 / 4,
  },
  {
    id: '2x3',
    name: '2 × 3 cm',
    category: 'pas_foto',
    widthCm: 2,
    heightCm: 3,
    dpi: 600,
    targetWidthPx: 472,
    targetHeightPx: 709,
    aspectRatio: 2 / 3,
  },
  {
    id: '3x3',
    name: '3 × 3 cm (Visa / Khusus)',
    category: 'pas_foto',
    widthCm: 3,
    heightCm: 3,
    dpi: 600,
    targetWidthPx: 709,
    targetHeightPx: 709,
    aspectRatio: 1,
  },
  {
    id: '4x6',
    name: '4 × 6 cm',
    category: 'pas_foto',
    widthCm: 4,
    heightCm: 6,
    dpi: 600,
    targetWidthPx: 945,
    targetHeightPx: 1417,
    aspectRatio: 4 / 6,
  },
  {
    id: '4r',
    name: '4R (10.16 × 15.24 cm)',
    category: 'cetak',
    widthCm: 10.16,
    heightCm: 15.24,
    dpi: 600,
    targetWidthPx: 2400,
    targetHeightPx: 3600,
    aspectRatio: 10.16 / 15.24,
  },
  {
    id: 'postcard',
    name: 'Pos Card (10 × 15 cm)',
    category: 'cetak',
    widthCm: 10,
    heightCm: 15,
    dpi: 600,
    targetWidthPx: 2362,
    targetHeightPx: 3543,
    aspectRatio: 10 / 15,
  },
];

export class CropEngine {
  /**
   * Calculates pixels from cm and DPI according to formula:
   * pixels = (centimeters / 2.54) * DPI
   */
  public static calculatePixels(cm: number, dpi: number = 600): number {
    return Math.round((cm / 2.54) * dpi);
  }

  /**
   * Creates a custom output dimension
   */
  public static createCustomDimension(
    widthCm: number,
    heightCm: number,
    dpi: number = 600
  ): OutputDimension {
    const targetWidthPx = this.calculatePixels(widthCm, dpi);
    const targetHeightPx = this.calculatePixels(heightCm, dpi);
    return {
      id: `custom-${widthCm}x${heightCm}`,
      name: `Kustom ${widthCm} × ${heightCm} cm`,
      category: 'custom',
      widthCm,
      heightCm,
      dpi,
      targetWidthPx,
      targetHeightPx,
      aspectRatio: widthCm / heightCm,
    };
  }

  /**
   * Calculates an initial centered crop rect that matches target aspect ratio
   */
  public static getInitialCropRect(
    imageWidth: number,
    imageHeight: number,
    targetAspectRatio: number
  ): CropRect {
    const imgAspect = imageWidth / imageHeight;
    let cropWidth: number;
    let cropHeight: number;

    if (imgAspect > targetAspectRatio) {
      // Source image is wider than target aspect ratio
      cropHeight = imageHeight * 0.96;
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      // Source image is taller than target aspect ratio
      cropWidth = imageWidth * 0.96;
      cropHeight = cropWidth / targetAspectRatio;
    }

    // Center horizontally, position slightly higher vertically for portrait headroom
    const x = Math.max(0, Math.round((imageWidth - cropWidth) / 2));
    const y = Math.max(0, Math.round((imageHeight - cropHeight) * 0.3));

    return {
      x,
      y,
      width: Math.min(imageWidth, Math.round(cropWidth)),
      height: Math.min(imageHeight, Math.round(cropHeight)),
    };
  }

  /**
   * Checks if crop potentially cuts critical subject features (headroom, chin, shoulders)
   */
  public static validateCropSafety(
    crop: CropRect,
    imageWidth: number,
    imageHeight: number
  ): { isSafe: boolean; warning?: string } {
    // If top crop cuts too deep (more than 15% down from top)
    if (crop.y > imageHeight * 0.18) {
      return {
        isSafe: false,
        warning: 'Peringatan Crop: Posisi pemotongan atas terlalu rendah, berpotensi memotong kepala/rambut/hijab.',
      };
    }

    // If bottom crop ends too high (cutting chin or collar)
    if (crop.y + crop.height < imageHeight * 0.6) {
      return {
        isSafe: false,
        warning: 'Peringatan Crop: Pemotongan bagian bawah terlalu tinggi, berpotensi memotong dagu atau bahu.',
      };
    }

    // If width is too constricted compared to image center
    if (crop.width < imageWidth * 0.45) {
      return {
        isSafe: false,
        warning: 'Peringatan Crop: Kotak crop terlalu sempit, bahu subjek kemungkinan besar terpotong.',
      };
    }

    return { isSafe: true };
  }

  /**
   * Calculates a responsive crop box based on Face Zoom percentage and Headroom margin
   */
  public static calculateFramingCrop(
    imageWidth: number,
    imageHeight: number,
    dimension: OutputDimension,
    currentCrop: CropRect,
    faceZoomEnabled: boolean,
    faceZoomPercent: number,
    headroomEnabled: boolean,
    headroomMm: number
  ): CropRect {
    const targetAspectRatio = dimension.aspectRatio;

    // 1. Base crop dimension calculation
    const imgAspect = imageWidth / imageHeight;
    let baseCropHeight: number;
    let baseCropWidth: number;

    if (imgAspect > targetAspectRatio) {
      baseCropHeight = imageHeight * 0.94;
      baseCropWidth = baseCropHeight * targetAspectRatio;
    } else {
      baseCropWidth = imageWidth * 0.94;
      baseCropHeight = baseCropWidth / targetAspectRatio;
    }

    let cropWidth = baseCropWidth;
    let cropHeight = baseCropHeight;

    // 2. Skala Zoom Wajah (Face-Centric Framing)
    if (faceZoomEnabled) {
      const zoomMultiplier = 45 / Math.max(25, Math.min(80, faceZoomPercent));
      let newHeight = baseCropHeight * zoomMultiplier;
      let newWidth = newHeight * targetAspectRatio;

      if (newWidth > imageWidth) {
        newWidth = imageWidth;
        newHeight = newWidth / targetAspectRatio;
      }
      if (newHeight > imageHeight) {
        newHeight = imageHeight;
        newWidth = newHeight * targetAspectRatio;
      }

      cropWidth = newWidth;
      cropHeight = newHeight;
    }

    // 3. Top Margin (Headroom)
    const photoHeightMm = dimension.heightCm * 10;
    let cropY: number;

    if (headroomEnabled) {
      const headroomRatio = Math.max(0.08, Math.min(0.55, headroomMm / photoHeightMm));
      const headroomShift = (headroomRatio - 0.28) * cropHeight * 0.9;
      const nominalTopY = (imageHeight - cropHeight) * 0.25;
      cropY = Math.round(nominalTopY - headroomShift);
    } else {
      const centerY = currentCrop.y + currentCrop.height * 0.45;
      cropY = Math.round(centerY - cropHeight * 0.45);
    }

    // Horizontal positioning
    const currentCenterX = currentCrop.x + currentCrop.width * 0.5;
    let cropX = Math.round(currentCenterX - cropWidth * 0.5);

    // 4. Boundary constraints
    cropX = Math.max(0, Math.min(imageWidth - cropWidth, cropX));
    cropY = Math.max(0, Math.min(imageHeight - cropHeight, cropY));

    return {
      x: cropX,
      y: cropY,
      width: Math.min(imageWidth, Math.round(cropWidth)),
      height: Math.min(imageHeight, Math.round(cropHeight)),
    };
  }
}
