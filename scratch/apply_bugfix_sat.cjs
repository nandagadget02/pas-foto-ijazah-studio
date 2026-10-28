const fs = require('fs');
const path = require('path');

const v2Dir = path.resolve(__dirname, '..');

// 1. PATCH App.tsx
{
  const appPath = path.join(v2Dir, 'src', 'App.tsx');
  let appContent = fs.readFileSync(appPath, 'utf8');
  const isCRLF = appContent.includes('\r\n');
  let norm = appContent.replace(/\r\n/g, '\n');

  // 1a. Patch previewKey in App.tsx
  const targetKey = `      adjustments.temperature,
      adjustments.tint,`;
  const replaceKey = `      adjustments.saturation,
      adjustments.temperature,
      adjustments.tint,
      adjustments.satRed ?? 0,
      adjustments.satYellow ?? 0,
      adjustments.satGreen ?? 0,
      adjustments.satCyan ?? 0,
      adjustments.satBlue ?? 0,
      adjustments.satMagenta ?? 0,`;

  if (norm.includes(targetKey)) {
    norm = norm.replace(targetKey, replaceKey);
    console.log('App.tsx: previewKey successfully patched with selective saturation parameters!');
  } else {
    console.error('App.tsx: Failed to find targetKey in previewKey');
  }

  // 1b. Patch applyAIRecommendations in App.tsx
  const targetAI = `      saturation: 0,
      temperature: recommendation.temperature,
      tint: recommendation.tint,
    };`;
  const replaceAI = `      saturation: 0,
      temperature: recommendation.temperature,
      tint: recommendation.tint,
      satRed: 0,
      satYellow: 0,
      satGreen: 0,
      satCyan: 0,
      satBlue: 0,
      satMagenta: 0,
    };`;

  if (norm.includes(targetAI)) {
    norm = norm.replace(targetAI, replaceAI);
    console.log('App.tsx: applyAIRecommendations successfully patched with selective saturation zeros!');
  } else {
    console.error('App.tsx: Failed to find targetAI in applyAIRecommendations');
  }

  // 1c. Patch activeAdjustments in batch selection in App.tsx
  const targetBatchAdj = `            saturation: 0,
            temperature: item.analysisResult.recommendation.temperature,
            tint: item.analysisResult.recommendation.tint,
          }`;
  const replaceBatchAdj = `            saturation: 0,
            temperature: item.analysisResult.recommendation.temperature,
            tint: item.analysisResult.recommendation.tint,
            satRed: 0,
            satYellow: 0,
            satGreen: 0,
            satCyan: 0,
            satBlue: 0,
            satMagenta: 0,
          }`;

  if (norm.includes(targetBatchAdj)) {
    norm = norm.replace(targetBatchAdj, replaceBatchAdj);
    console.log('App.tsx: batch activeAdjustments successfully patched!');
  } else {
    console.error('App.tsx: Failed to find targetBatchAdj');
  }

  fs.writeFileSync(appPath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}

// 2. PATCH ManualAdjustmentSliders.tsx
{
  const slidersPath = path.join(v2Dir, 'src', 'components', 'ManualAdjustmentSliders.tsx');
  let slidersContent = fs.readFileSync(slidersPath, 'utf8');
  const isCRLF = slidersContent.includes('\r\n');
  let norm = slidersContent.replace(/\r\n/g, '\n');

  // Patch SliderRow implementation
  const targetSliderRow = `const SliderRow: React.FC<SliderRowProps> = ({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  unit = '',
  defaultValue = 0,
  onChange,
}) => {
  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(2)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(2)));
    onChange(next);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const isModified = Math.abs(value - defaultValue) > 0.001;`;

  const replaceSliderRow = `const SliderRow: React.FC<SliderRowProps> = ({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  unit = '',
  defaultValue = 0,
  onChange,
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;

  const handleDecrement = () => {
    const next = Math.max(min, Number((safeValue - step).toFixed(2)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((safeValue + step).toFixed(2)));
    onChange(next);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const isModified = Math.abs(safeValue - defaultValue) > 0.001;`;

  if (norm.includes(targetSliderRow)) {
    norm = norm.replace(targetSliderRow, replaceSliderRow);
    console.log('ManualAdjustmentSliders.tsx: SliderRow safeValue header patched!');
  } else {
    console.error('ManualAdjustmentSliders.tsx: Failed to find targetSliderRow');
  }

  // Replace value usage in SliderRow
  const targetSliderRowBody = `          <span
            className={\`font-mono text-xs font-semibold px-2 py-0.5 rounded \${
              isModified
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-slate-800 text-slate-400'
            }\`}
          >
            {value > 0 && unit !== '%' ? \`+\${value}\` : value}
            {unit}
          </span>
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset slider ini"
              className="text-slate-500 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={\`Kurangi \${label}\`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus:outline-none"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}`;

  const replaceSliderRowBody = `          <span
            className={\`font-mono text-xs font-semibold px-2 py-0.5 rounded \${
              isModified
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-slate-800 text-slate-400'
            }\`}
          >
            {safeValue > 0 && unit !== '%' ? \`+\${safeValue}\` : safeValue}
            {unit}
          </span>
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset slider ini"
              className="text-slate-500 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={safeValue <= min}
          aria-label={\`Kurangi \${label}\`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? defaultValue : parsed);
          }}
          className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus:outline-none"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={safeValue >= max}`;

  if (norm.includes(targetSliderRowBody)) {
    norm = norm.replace(targetSliderRowBody, replaceSliderRowBody);
    console.log('ManualAdjustmentSliders.tsx: SliderRow body safely using safeValue!');
  } else {
    console.error('ManualAdjustmentSliders.tsx: Failed to find targetSliderRowBody');
  }

  fs.writeFileSync(slidersPath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}

// 3. PATCH ToneEngine.ts
{
  const tonePath = path.join(v2Dir, 'src', 'image', 'ToneEngine.ts');
  let toneContent = fs.readFileSync(tonePath, 'utf8');
  const isCRLF = toneContent.includes('\r\n');
  let norm = toneContent.replace(/\r\n/g, '\n');

  // Hue bound check and Gamut scaling logic
  const targetToneMath = `            hue = hue * 60;
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
            }`;

  const replaceToneMath = `            hue = hue * 60;
            if (hue < 0) hue += 360;
            if (hue >= 360) hue -= 360;

            // Interpolate saturation adjustment based on hue
            // 0: Reds, 60: Yellows, 120: Greens, 180: Cyans, 240: Blues, 300: Magentas
            let deltaSat = 0;
            const sector = Math.floor(hue / 60); // strictly 0 to 5
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
              const selectiveFactor = Math.max(0, 1 + deltaSat / 100);
              const newR = curLum + selectiveFactor * (r - curLum);
              const newG = curLum + selectiveFactor * (g - curLum);
              const newB = curLum + selectiveFactor * (b - curLum);

              // Gamut clipping protection: scale deviation from luminance to keep strictly within [0, 255]
              // while rigorously preserving hue ratio and luminance
              let scale = 1.0;
              if (newR > 255 && newR > curLum) scale = Math.min(scale, (255 - curLum) / (newR - curLum));
              if (newG > 255 && newG > curLum) scale = Math.min(scale, (255 - curLum) / (newG - curLum));
              if (newB > 255 && newB > curLum) scale = Math.min(scale, (255 - curLum) / (newB - curLum));
              if (newR < 0 && newR < curLum) scale = Math.min(scale, curLum / (curLum - newR));
              if (newG < 0 && newG < curLum) scale = Math.min(scale, curLum / (curLum - newG));
              if (newB < 0 && newB < curLum) scale = Math.min(scale, curLum / (curLum - newB));

              if (scale < 1.0) {
                r = curLum + scale * (newR - curLum);
                g = curLum + scale * (newG - curLum);
                b = curLum + scale * (newB - curLum);
              } else {
                r = newR;
                g = newG;
                b = newB;
              }
            }`;

  if (norm.includes(targetToneMath)) {
    norm = norm.replace(targetToneMath, replaceToneMath);
    console.log('ToneEngine.ts: Math and Gamut protection successfully upgraded!');
  } else {
    console.error('ToneEngine.ts: Failed to find targetToneMath');
  }

  fs.writeFileSync(tonePath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}

// 4. PATCH ImageProcessor.ts
{
  const imgProcPath = path.join(v2Dir, 'src', 'image', 'ImageProcessor.ts');
  let imgContent = fs.readFileSync(imgProcPath, 'utf8');
  const isCRLF = imgContent.includes('\r\n');
  let norm = imgContent.replace(/\r\n/g, '\n');

  const targetNeutral = `            saturation: 0,
            temperature: 0,
            tint: 0,
          };`;

  const replaceNeutral = `            saturation: 0,
            temperature: 0,
            tint: 0,
            satRed: 0,
            satYellow: 0,
            satGreen: 0,
            satCyan: 0,
            satBlue: 0,
            satMagenta: 0,
          };`;

  if (norm.includes(targetNeutral)) {
    norm = norm.replace(targetNeutral, replaceNeutral);
    console.log('ImageProcessor.ts: neutralParams patched with selective saturation zeros!');
  } else {
    console.error('ImageProcessor.ts: Failed to find targetNeutral');
  }

  fs.writeFileSync(imgProcPath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}

// 5. PATCH aiRecommendationPresetService.ts
{
  const presetPath = path.join(v2Dir, 'src', 'services', 'aiRecommendationPresetService.ts');
  let presetContent = fs.readFileSync(presetPath, 'utf8');
  const isCRLF = presetContent.includes('\r\n');
  let norm = presetContent.replace(/\r\n/g, '\n');

  const targetPresetSat = `      skinProtection: Math.round(this.clamp(p.skinProtection, 0, 25, 12)),
      saturation: 0,
      temperature: Math.round(this.clamp(p.temperature, -25, 25, 0)),`;

  const replacePresetSat = `      skinProtection: Math.round(this.clamp(p.skinProtection, 0, 25, 12)),
      saturation: Math.round(this.clamp(p.saturation, -50, 50, 0)),
      temperature: Math.round(this.clamp(p.temperature, -25, 25, 0)),`;

  if (norm.includes(targetPresetSat)) {
    norm = norm.replace(targetPresetSat, replacePresetSat);
    console.log('aiRecommendationPresetService.ts: saturation sanitization fixed!');
  } else {
    console.error('aiRecommendationPresetService.ts: Failed to find targetPresetSat');
  }

  fs.writeFileSync(presetPath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
}
