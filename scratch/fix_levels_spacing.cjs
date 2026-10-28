const fs = require('fs');
const path = require('path');

const v2Dir = path.resolve(__dirname, '..');
const filePath = path.join(v2Dir, 'src', 'components', 'ManualAdjustmentSliders.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const isCRLF = content.includes('\r\n');
let norm = content.replace(/\r\n/g, '\n');

// 1. Upgrade SliderRow with min-w-0, box-border, and flexible spacing
const targetSliderRow = `  return (
    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-200">{label}</span>
          {sublabel && <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">({sublabel})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span
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
          disabled={safeValue >= max}
          aria-label={\`Tambah \${label}\`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );`;

const replaceSliderRow = `  return (
    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700/80 transition-colors min-w-0 box-border">
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <div className="min-w-0 truncate">
          <span className="text-xs font-semibold text-slate-200">{label}</span>
          {sublabel && <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">({sublabel})</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
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
              className="text-slate-500 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
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
          className="flex-1 min-w-0 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus:outline-none"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={safeValue >= max}
          aria-label={\`Tambah \${label}\`}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/60"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );`;

if (norm.includes(targetSliderRow)) {
  norm = norm.replace(targetSliderRow, replaceSliderRow);
  console.log('✔ SliderRow responsiveness updated.');
} else {
  console.error('❌ Failed to find targetSliderRow');
}

// 2. Replace the Levels Card with balanced 2-column layout
const targetLevelsBlock = `        {/* Levels (Tingkat Tonal) Control Card */}
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
        </div>`;

const replaceLevelsBlock = `        {/* Levels (Tingkat Tonal) Control Card - 2-Column Responsive Grid */}
        <div className="col-span-1 sm:col-span-2 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 transition-all mt-1 min-w-0 box-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20 shrink-0">
                Levels (Tingkat Tonal)
              </span>
              <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
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
              className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-md transition-colors cursor-pointer shrink-0"
              title="Reset kontrol Levels ke nilai netral (0, 1.0, 255)"
            >
              Reset Levels
            </button>
          </div>

          {/* Grid 2 Kolom Seimbang: Baris 1: Black Point & Midtone Gamma | Baris 2: White Point & Output Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
            {/* Baris Pertama: Black Point */}
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

            {/* Baris Pertama: Midtones / Gamma */}
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

            {/* Baris Kedua: White Point */}
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

            {/* Baris Kedua: Output Levels Trigger Card Seimbang di Kolom 2 */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-center min-w-0 box-border hover:border-slate-700/80 transition-colors">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 truncate">
                  <span className="text-xs font-semibold text-slate-200 block truncate">
                    Output Levels
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {showOutputLevels
                      ? \`Aktif: \${params.levelsOutBlack ?? 0} s/d \${params.levelsOutWhite ?? 255}\`
                      : 'Batas gelap & terang rentang'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOutputLevels((prev) => !prev)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border \${
                    showOutputLevels
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }\`}
                >
                  <span>{showOutputLevels ? 'Tutup Kontrol' : 'Buka Kontrol'}</span>
                  <span className="text-[10px]">{showOutputLevels ? '▲' : '▼'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Kontrol Lanjutan (Output Levels) 2 Kolom saat dibuka */}
          {showOutputLevels && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 min-w-0">
              <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-2.5">
                Output Levels (Rentang Tonal Keluaran)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
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
            </div>
          )}
        </div>`;

if (norm.includes(targetLevelsBlock)) {
  norm = norm.replace(targetLevelsBlock, replaceLevelsBlock);
  console.log('✔ Levels card 2-column layout updated.');
} else {
  console.error('❌ Failed to find targetLevelsBlock');
}

fs.writeFileSync(filePath, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
