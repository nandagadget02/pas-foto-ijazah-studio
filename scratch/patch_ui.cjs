const fs = require('fs');
const path = require('path');

const v2Dir = path.resolve(__dirname, '..');

// 1. Update ManualAdjustmentSliders.tsx
const slidersPath = path.join(v2Dir, 'src', 'components', 'ManualAdjustmentSliders.tsx');
let slidersContent = fs.readFileSync(slidersPath, 'utf8');
const isCRLF = slidersContent.includes('\r\n');
let normSliders = slidersContent.replace(/\r\n/g, '\n');

const targetTintBlock = `            <SliderRow
              label="Tint"
              sublabel="Koreksi Magenta / Hijau"
              value={params.tint}
              min={-25}
              max={25}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('tint', v)}
            />
          </div>`;

const replacementTintBlock = `            <SliderRow
              label="Tint"
              sublabel="Koreksi Magenta / Hijau"
              value={params.tint}
              min={-25}
              max={25}
              step={1}
              defaultValue={0}
              onChange={(v) => updateParam('tint', v)}
            />
          </div>

          {/* Subbagian: SATURASI PER WARNA (SELECTIVE COLOR SATURATION) */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20">
                  Saturasi Per Warna (Selective Color Saturation)
                </span>
                <span className="hidden md:inline-block text-[11px] text-slate-400">
                  Koreksi saturasi selektif tanpa mengubah warna kulit berlebih
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...params,
                    satRed: 0,
                    satYellow: 0,
                    satGreen: 0,
                    satCyan: 0,
                    satBlue: 0,
                    satMagenta: 0,
                  });
                }}
                className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-md transition-colors cursor-pointer"
                title="Reset semua 6 slider saturasi warna ke 0"
              >
                Reset Semua Warna
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <SliderRow
                label="Reds"
                sublabel="Merah"
                value={params.satRed ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satRed', v)}
              />

              <SliderRow
                label="Yellows"
                sublabel="Kuning"
                value={params.satYellow ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satYellow', v)}
              />

              <SliderRow
                label="Greens"
                sublabel="Hijau"
                value={params.satGreen ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satGreen', v)}
              />

              <SliderRow
                label="Cyans"
                sublabel="Sian"
                value={params.satCyan ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satCyan', v)}
              />

              <SliderRow
                label="Blues"
                sublabel="Biru"
                value={params.satBlue ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satBlue', v)}
              />

              <SliderRow
                label="Magentas"
                sublabel="Magenta"
                value={params.satMagenta ?? 0}
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                onChange={(v) => updateParam('satMagenta', v)}
              />
            </div>
          </div>`;

if (normSliders.includes(targetTintBlock)) {
  normSliders = normSliders.replace(targetTintBlock, replacementTintBlock);
  fs.writeFileSync(slidersPath, isCRLF ? normSliders.replace(/\n/g, '\r\n') : normSliders, 'utf8');
  console.log('ManualAdjustmentSliders.tsx successfully updated!');
} else {
  console.error('Still cannot find targetTintBlock in ManualAdjustmentSliders.tsx');
}
