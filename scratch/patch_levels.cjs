const fs = require('fs');
const path = require('path');

const v2Dir = path.resolve(__dirname, '..');

function patchFile(relPath, replacers) {
  const filePath = path.join(v2Dir, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  const isCRLF = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  for (const { name, target, replacement } of replacers) {
    const normTarget = target.replace(/\r\n/g, '\n');
    const normReplacement = replacement.replace(/\r\n/g, '\n');
    if (norm.includes(normTarget)) {
      norm = norm.replace(normTarget, normReplacement);
      console.log(`✔ [${relPath}] ${name} patched.`);
    } else {
      console.error(`❌ [${relPath}] ${name} FAILED to match target.`);
    }
  }

  fs.writeFileSync(filePath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}

// 1. UPDATE src/types/analysis.ts
patchFile('src/types/analysis.ts', [
  {
    name: 'Add Levels to AdjustmentParams',
    target: `  satMagenta?: number;
}`,
    replacement: `  satMagenta?: number;
  // Levels (Tingkat Input & Output Tonal)
  levelsInBlack?: number; // 0 to 254, default 0
  levelsGamma?: number; // 0.10 to 3.00, default 1.00
  levelsInWhite?: number; // 1 to 255, default 255
  levelsOutBlack?: number; // 0 to 255, default 0
  levelsOutWhite?: number; // 0 to 255, default 255
}`,
  },
]);

// 2. UPDATE src/services/GeminiService.ts
patchFile('src/services/GeminiService.ts', [
  {
    name: 'Add Levels defaults to getInitialAdjustments',
    target: `      satBlue: 0,
      satMagenta: 0,
    };
  }`,
    replacement: `      satBlue: 0,
      satMagenta: 0,
      levelsInBlack: 0,
      levelsGamma: 1.0,
      levelsInWhite: 255,
      levelsOutBlack: 0,
      levelsOutWhite: 255,
    };
  }`,
  },
]);

// 3. UPDATE src/services/aiRecommendationPresetService.ts
patchFile('src/services/aiRecommendationPresetService.ts', [
  {
    name: 'Add Levels sanitization in sanitizeParameters',
    target: `      satBlue: Math.round(this.clamp(p.satBlue, -100, 100, 0)),
      satMagenta: Math.round(this.clamp(p.satMagenta, -100, 100, 0)),
    };
  }`,
    replacement: `      satBlue: Math.round(this.clamp(p.satBlue, -100, 100, 0)),
      satMagenta: Math.round(this.clamp(p.satMagenta, -100, 100, 0)),
      levelsInBlack: Math.round(this.clamp(p.levelsInBlack, 0, 254, 0)),
      levelsGamma: Number(this.clamp(p.levelsGamma, 0.1, 3.0, 1.0).toFixed(2)),
      levelsInWhite: Math.round(this.clamp(p.levelsInWhite, 1, 255, 255)),
      levelsOutBlack: Math.round(this.clamp(p.levelsOutBlack, 0, 255, 0)),
      levelsOutWhite: Math.round(this.clamp(p.levelsOutWhite, 0, 255, 255)),
    };
  }`,
  },
]);

// 4. UPDATE src/image/ToneEngine.ts
patchFile('src/image/ToneEngine.ts', [
  {
    name: 'Precalculate Levels LUT',
    target: `    // Precalculate tone lookup table (LUT) for basic 0..255 if applicable,
    // but highlights/shadows depend on local pixel luminance.
    for (let i = 0; i < data.length; i += 4) {`,
    replacement: `    // Levels (Tingkat Input & Output Tonal) precalculation
    const inBlack = Math.max(0, Math.min(254, params.levelsInBlack ?? 0));
    const inWhite = Math.max(inBlack + 1, Math.min(255, params.levelsInWhite ?? 255));
    const gamma = Math.max(0.1, Math.min(3.0, params.levelsGamma ?? 1.0));
    const outBlack = Math.max(0, Math.min(255, params.levelsOutBlack ?? 0));
    const outWhite = Math.max(0, Math.min(255, params.levelsOutWhite ?? 255));

    const hasLevels = inBlack !== 0 || gamma !== 1.0 || inWhite !== 255 || outBlack !== 0 || outWhite !== 255;
    let levelsLut: Uint8Array | null = null;
    if (hasLevels) {
      levelsLut = new Uint8Array(256);
      const inRange = inWhite - inBlack;
      const outRange = outWhite - outBlack;
      const invGamma = 1.0 / gamma;
      for (let v = 0; v < 256; v++) {
        let norm = (v - inBlack) / inRange;
        if (norm <= 0) {
          norm = 0;
        } else if (norm >= 1) {
          norm = 1;
        } else {
          norm = Math.pow(norm, invGamma);
        }
        const mapped = outBlack + norm * outRange;
        levelsLut[v] = Math.round(Math.max(0, Math.min(255, mapped)));
      }
    }

    // Precalculate tone lookup table (LUT) for basic 0..255 if applicable,
    // but highlights/shadows depend on local pixel luminance.
    for (let i = 0; i < data.length; i += 4) {`,
  },
  {
    name: 'Apply Levels in B&W mode',
    target: `        // Clamp to 0..255
        const finalVal = Math.round(Math.max(0, Math.min(255, lum)));

        // TRUE GRAYSCALE: R === G === B. Absolute zero color cast!
        data[i] = finalVal;
        data[i + 1] = finalVal;
        data[i + 2] = finalVal;`,
    replacement: `        // Clamp to 0..255
        let finalVal = Math.round(Math.max(0, Math.min(255, lum)));
        if (levelsLut) {
          finalVal = levelsLut[finalVal];
        }

        // TRUE GRAYSCALE: R === G === B. Absolute zero color cast!
        data[i] = finalVal;
        data[i + 1] = finalVal;
        data[i + 2] = finalVal;`,
  },
  {
    name: 'Apply Levels in Color mode before Saturation',
    target: `          const sShift = shadows * 40 * Math.pow(normS, 1.4) + blacks * normS;
          r += sShift;
          g += sShift;
          b += sShift;
        }

        // 6. Saturation`,
    replacement: `          const sShift = shadows * 40 * Math.pow(normS, 1.4) + blacks * normS;
          r += sShift;
          g += sShift;
          b += sShift;
        }

        // 5b. Levels Tonal Mapping (Input Black, Gamma, Input White, Output Black, Output White)
        if (levelsLut) {
          r = levelsLut[Math.round(Math.max(0, Math.min(255, r)))];
          g = levelsLut[Math.round(Math.max(0, Math.min(255, g)))];
          b = levelsLut[Math.round(Math.max(0, Math.min(255, b)))];
        }

        // 6. Saturation`,
  },
]);

// 5. UPDATE src/image/ImageProcessor.ts
patchFile('src/image/ImageProcessor.ts', [
  {
    name: 'Add Levels to neutralParams',
    target: `            satBlue: 0,
            satMagenta: 0,
          };`,
    replacement: `            satBlue: 0,
            satMagenta: 0,
            levelsInBlack: 0,
            levelsGamma: 1.0,
            levelsInWhite: 255,
            levelsOutBlack: 0,
            levelsOutWhite: 255,
          };`,
  },
]);

// 6. UPDATE src/App.tsx
patchFile('src/App.tsx', [
  {
    name: 'Add Levels to previewKey',
    target: `      adjustments.satBlue ?? 0,
      adjustments.satMagenta ?? 0,`,
    replacement: `      adjustments.satBlue ?? 0,
      adjustments.satMagenta ?? 0,
      adjustments.levelsInBlack ?? 0,
      adjustments.levelsGamma ?? 1.0,
      adjustments.levelsInWhite ?? 255,
      adjustments.levelsOutBlack ?? 0,
      adjustments.levelsOutWhite ?? 255,`,
  },
  {
    name: 'Add Levels to resetToNeutral isChanged',
    target: `      (adjustments.satBlue ?? 0) !== 0 ||
      (adjustments.satMagenta ?? 0) !== 0 ||
      targetTone !== 'natural';`,
    replacement: `      (adjustments.satBlue ?? 0) !== 0 ||
      (adjustments.satMagenta ?? 0) !== 0 ||
      (adjustments.levelsInBlack ?? 0) !== 0 ||
      Math.abs((adjustments.levelsGamma ?? 1.0) - 1.0) > 0.01 ||
      (adjustments.levelsInWhite ?? 255) !== 255 ||
      (adjustments.levelsOutBlack ?? 0) !== 0 ||
      (adjustments.levelsOutWhite ?? 255) !== 255 ||
      targetTone !== 'natural';`,
  },
  {
    name: 'Add Levels to applyAIRecommendations',
    target: `      satBlue: 0,
      satMagenta: 0,
    };`,
    replacement: `      satBlue: 0,
      satMagenta: 0,
      levelsInBlack: 0,
      levelsGamma: 1.0,
      levelsInWhite: 255,
      levelsOutBlack: 0,
      levelsOutWhite: 255,
    };`,
  },
  {
    name: 'Add Levels to batch activeAdjustments',
    target: `            satBlue: 0,
            satMagenta: 0,
          }`,
    replacement: `            satBlue: 0,
            satMagenta: 0,
            levelsInBlack: 0,
            levelsGamma: 1.0,
            levelsInWhite: 255,
            levelsOutBlack: 0,
            levelsOutWhite: 255,
          }`,
  },
]);
