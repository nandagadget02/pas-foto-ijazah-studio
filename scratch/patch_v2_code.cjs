const fs = require('fs');
const path = require('path');

const rootV2 = path.resolve('../PAS_FOTO_IJAZAH_STUDIO_V2');

// 1. Update analysis.ts
{
  const file = path.join(rootV2, 'src/types/analysis.ts');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /(tint: number; \/\/ -25 to \+25\r?\n)(\})/,
    `$1  // Selective Color Saturation (-100 to +100, default 0)\r\n  satRed?: number;\r\n  satYellow?: number;\r\n  satGreen?: number;\r\n  satCyan?: number;\r\n  satBlue?: number;\r\n  satMagenta?: number;\r\n$2`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('1. analysis.ts updated');
}

// 2. Update GeminiService.ts initialAdjustments
{
  const file = path.join(rootV2, 'src/services/GeminiService.ts');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /(tint: 0,\r?\n)(\s*\};)/,
    `$1      satRed: 0,\r\n      satYellow: 0,\r\n      satGreen: 0,\r\n      satCyan: 0,\r\n      satBlue: 0,\r\n      satMagenta: 0,\r\n$2`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('2. GeminiService.ts updated');
}

// 3. Update aiRecommendationPresetService.ts
{
  const file = path.join(rootV2, 'src/services/aiRecommendationPresetService.ts');
  let content = fs.readFileSync(file, 'utf8');
  // Add selective saturation defaults to built-in presets
  content = content.replace(
    /(tint: 0,\r?\n\s*\},)/g,
    `tint: 0,\r\n      satRed: 0,\r\n      satYellow: 0,\r\n      satGreen: 0,\r\n      satCyan: 0,\r\n      satBlue: 0,\r\n      satMagenta: 0,\r\n    },`
  );
  // Add selective saturation sanitization in sanitizeParameters
  content = content.replace(
    /(tint: Math\.round\(this\.clamp\(p\.tint, -25, 25, 0\)\),\r?\n)(\s*\};)/,
    `$1      satRed: Math.round(this.clamp(p.satRed, -100, 100, 0)),\r\n      satYellow: Math.round(this.clamp(p.satYellow, -100, 100, 0)),\r\n      satGreen: Math.round(this.clamp(p.satGreen, -100, 100, 0)),\r\n      satCyan: Math.round(this.clamp(p.satCyan, -100, 100, 0)),\r\n      satBlue: Math.round(this.clamp(p.satBlue, -100, 100, 0)),\r\n      satMagenta: Math.round(this.clamp(p.satMagenta, -100, 100, 0)),\r\n$2`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('3. aiRecommendationPresetService.ts updated');
}

// 4. Update ToneEngine.ts
{
  const file = path.join(rootV2, 'src/image/ToneEngine.ts');
  let content = fs.readFileSync(file, 'utf8');

  // Insert Selective Saturation parameters extraction before loop
  const satParamsExtraction = `    // Selective Color Saturation parameters
    const satReds = params.satRed || 0;
    const satYellows = params.satYellow || 0;
    const satGreens = params.satGreen || 0;
    const satCyans = params.satCyan || 0;
    const satBlues = params.satBlue || 0;
    const satMagentas = params.satMagenta || 0;
    const hasSelectiveSat = !isBW && (
      satReds !== 0 ||
      satYellows !== 0 ||
      satGreens !== 0 ||
      satCyans !== 0 ||
      satBlues !== 0 ||
      satMagentas !== 0
    );
`;

  content = content.replace(
    /(const satFactor = 1 \+ params\.saturation \/ 50;\r?\n)/,
    `$1${satParamsExtraction}`
  );

  // Insert Selective Saturation algorithm after global saturation
  const selectiveSatLogic = `
        // 7. Selective Color Saturation (Reds, Yellows, Greens, Cyans, Blues, Magentas)
        if (hasSelectiveSat) {
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          const chroma = maxVal - minVal;

          if (chroma >= 1.0) {
            let hue = 0;
            if (maxVal === r) {
              hue = ((g - b) / chroma) % 6;
            } else if (maxVal === g) {
              hue = (b - r) / chroma + 2;
            } else {
              hue = (r - g) / chroma + 4;
            }
            hue = hue * 60;
            if (hue < 0) hue += 360;

            // Interpolate saturation adjustment based on hue
            // 0: Reds, 60: Yellows, 120: Greens, 180: Cyans, 240: Blues, 300: Magentas
            let deltaSat = 0;
            const sector = Math.floor(hue / 60); // 0 to 5
            const t = (hue % 60) / 60; // 0.0 to 1.0
            // Cosine blend for silky smooth transitions without color banding
            const w = (1 - Math.cos(t * Math.PI)) * 0.5;

            if (sector === 0) {
              // Reds (0) to Yellows (60)
              deltaSat = satReds * (1 - w) + satYellows * w;
            } else if (sector === 1) {
              // Yellows (60) to Greens (120)
              deltaSat = satYellows * (1 - w) + satGreens * w;
            } else if (sector === 2) {
              // Greens (120) to Cyans (180)
              deltaSat = satGreens * (1 - w) + satCyans * w;
            } else if (sector === 3) {
              // Cyans (180) to Blues (240)
              deltaSat = satCyans * (1 - w) + satBlues * w;
            } else if (sector === 4) {
              // Blues (240) to Magentas (300)
              deltaSat = satBlues * (1 - w) + satMagentas * w;
            } else {
              // Magentas (300) to Reds (360)
              deltaSat = satMagentas * (1 - w) + satReds * w;
            }

            if (deltaSat !== 0) {
              // Proportional skin tone protection (hue 5 to 50 with characteristic melanin/hemoglobin ratios)
              if (r > g && g > b && (r - b) > 15 && r > 60 && hue >= 5 && hue <= 50) {
                const hueCenterDist = Math.abs(hue - 25);
                const skinProximity = Math.max(0, 1 - hueCenterDist / 25);
                const satRatio = chroma / maxVal;
                if (satRatio >= 0.12 && satRatio <= 0.68) {
                  // Dampen selective shift by 65% on authentic skin tones to prevent unnatural discolouration
                  deltaSat *= (1.0 - skinProximity * 0.65);
                }
              }

              const curLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              const selectiveFactor = 1 + deltaSat / 100;
              r = curLum + selectiveFactor * (r - curLum);
              g = curLum + selectiveFactor * (g - curLum);
              b = curLum + selectiveFactor * (b - curLum);

              // Gamut clipping protection (scale towards luminance to preserve hue integrity)
              const newMax = Math.max(r, g, b);
              if (newMax > 255) {
                const damp = 255 / newMax;
                r = curLum + (r - curLum) * damp;
                g = curLum + (g - curLum) * damp;
                b = curLum + (b - curLum) * damp;
              }
            }
          }
        }
`;

  content = content.replace(
    /(b = curLum \+ satFactor \* \(b - curLum\);\r?\n\s*\})/,
    `$1${selectiveSatLogic}`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('4. ToneEngine.ts updated');
}

// 5. Update index.html title
{
  const file = path.join(rootV2, 'index.html');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<title>PAS FOTO IJAZAH STUDIO<\/title>/,
    '<title>PAS FOTO IJAZAH STUDIO V2.0</title>'
  );
  content = content.replace(
    /<meta property="og:title" content="PAS FOTO IJAZAH STUDIO" \/>/,
    '<meta property="og:title" content="PAS FOTO IJAZAH STUDIO V2.0" />'
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('5. index.html title updated to V2.0');
}

// 6. Update package.json name & version
{
  const file = path.join(rootV2, 'package.json');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /"name": "react-example"/,
    '"name": "pas-foto-ijazah-studio-v2"'
  );
  content = content.replace(
    /"version": "0.0.0"/,
    '"version": "2.0.0"'
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('6. package.json updated to V2.0');
}

// 7. Update server.ts port to 3002
{
  const file = path.join(rootV2, 'server.ts');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const port = process\.env\.PORT \|\| 3000;/,
    'const port = process.env.PORT || 3002;'
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('7. server.ts port updated to 3002');
}

// 8. Update App.tsx header branding
{
  const file = path.join(rootV2, 'src/App.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<h1 className="text-sm font-bold tracking-tight text-white uppercase">\r?\n\s*PAS FOTO IJAZAH STUDIO\r?\n\s*<\/h1>/,
    `<h1 className="text-sm font-bold tracking-tight text-white uppercase">\r\n                  PAS FOTO IJAZAH STUDIO <span className="text-amber-400">V2.0</span>\r\n                </h1>`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('8. App.tsx header updated to V2.0');
}
