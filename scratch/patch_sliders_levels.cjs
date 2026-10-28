const fs = require('fs');
const path = require('path');

const v2Dir = path.resolve(__dirname, '..');
const filePath = path.join(v2Dir, 'src', 'components', 'ManualAdjustmentSliders.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const isCRLF = content.includes('\r\n');
let norm = content.replace(/\r\n/g, '\n');

// 1. Add useState to import
norm = norm.replace(
  "import React from 'react';",
  "import React, { useState } from 'react';"
);

// 2. Add showOutputLevels state
const targetState = `  const isGemini = analysisMethod === 'gemini';`;
const replaceState = `  const [showOutputLevels, setShowOutputLevels] = useState(false);
  const isGemini = analysisMethod === 'gemini';`;

if (norm.includes(targetState)) {
  norm = norm.replace(targetState, replaceState);
  console.log('✔ showOutputLevels state added.');
} else {
  console.error('❌ Failed to find targetState');
}

// 3. Add Levels card inside the tonal grid
const targetBlacks = `        <SliderRow
          label="Blacks"
          sublabel="Titik Hitam Tekstur"
          value={params.blacks}
          min={-20}
          max={20}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('blacks', v)}
        />
      </div>`;

const replaceBlacks = `        <SliderRow
          label="Blacks"
          sublabel="Titik Hitam Tekstur"
          value={params.blacks}
          min={-20}
          max={20}
          step={1}
          defaultValue={0}
          onChange={(v) => updateParam('blacks', v)}
        />

        {/* Levels (Tingkat Tonal) Control Card */}
        <div className="col-span-1 sm:col-span-2 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 transition-all mt-1">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20">
                Levels (Tingkat Tonal)
              </span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                Titik Hitam, Midtone Gamma & Titik Putih
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...params,
                  levelsInBlack: 0,
                  levelsGamma: 1.0,
                  levelsInWhite: 255,
                  levelsOutBlack: 0,
                  levelsOutWhite: 255,
                });
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-md transition-colors cursor-pointer"
              title="Reset kontrol Levels ke nilai netral (0, 1.0, 255)"
            >
              Reset Levels
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <SliderRow
              label="Black Point"
              sublabel="Input Hitam"
              value={params.levelsInBlack ?? 0}
              min={0}
              max={Math.min(254, (params.levelsInWhite ?? 255) - 1)}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('levelsInBlack', v)}
            />

            <SliderRow
              label="Midtones / Gamma"
              sublabel="Nada Tengah"
              value={params.levelsGamma ?? 1.0}
              min={0.2}
              max={2.5}
              step={0.05}
              defaultValue={1.0}
              onChange={(v) => updateParam('levelsGamma', v)}
            />

            <SliderRow
              label="White Point"
              sublabel="Input Putih"
              value={params.levelsInWhite ?? 255}
              min={Math.max(1, (params.levelsInBlack ?? 0) + 1)}
              max={255}
              step={1}
              defaultValue={255}
              onChange={(v) => updateParam('levelsInWhite', v)}
            />
          </div>

          {/* Kontrol Lanjutan (Output Levels) Expandable */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowOutputLevels((prev) => !prev)}
              className="text-[11px] text-slate-400 hover:text-cyan-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{showOutputLevels ? '▼ Sembunyikan Kontrol Lanjutan (Output Levels)' : '▶ Tampilkan Kontrol Lanjutan (Output Levels)'}</span>
            </button>

            {showOutputLevels && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 pt-2">
                <SliderRow
                  label="Output Black"
                  sublabel="Batas Gelap Minimum"
                  value={params.levelsOutBlack ?? 0}
                  min={0}
                  max={255}
                  step={1}
                  defaultValue={0}
                  onChange={(v) => updateParam('levelsOutBlack', v)}
                />

                <SliderRow
                  label="Output White"
                  sublabel="Batas Terang Maksimum"
                  value={params.levelsOutWhite ?? 255}
                  min={0}
                  max={255}
                  step={1}
                  defaultValue={255}
                  onChange={(v) => updateParam('levelsOutWhite', v)}
                />
              </div>
            )}
          </div>
        </div>
      </div>`;

if (norm.includes(targetBlacks)) {
  norm = norm.replace(targetBlacks, replaceBlacks);
  console.log('✔ Levels card added to ManualAdjustmentSliders.tsx.');
} else {
  console.error('❌ Failed to find targetBlacks');
}

fs.writeFileSync(filePath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
