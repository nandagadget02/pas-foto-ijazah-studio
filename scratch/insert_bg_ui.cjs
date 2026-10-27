const fs = require('fs');
let code = fs.readFileSync('src/components/BackgroundSelector.tsx', 'utf8');

const search = 'PNG Transparan / Pertahankan Asli</span>';
const idx = code.indexOf(search);
console.log('Found search at:', idx);
if (idx !== -1) {
  const nextDivs = code.indexOf('</div>', idx);
  const gridDivEnd = code.indexOf('</div>', nextDivs + 6);
  console.log('gridDivEnd at:', gridDivEnd);

  const before = code.substring(0, gridDivEnd + 6);
  const after = code.substring(gridDivEnd + 6);

  const ui = `

        {/* 1b.1 SUB-PILIHAN: MESIN PENGHAPUS LATAR (Lokal Studio vs PhotoRoom AI Cloud) */}
        {bgRemovalMode === 'remove' && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                  PILIHAN MESIN AI
                </span>
                <span className="text-xs font-bold text-white">Metode Eksekusi Segmentasi Latar</span>
              </div>

              {/* Tombol Pengaturan API Key PhotoRoom */}
              <button
                type="button"
                onClick={onOpenPhotoRoomModal}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Atur Kunci API PhotoRoom Sandbox atau Live"
              >
                <span>⚙️ PhotoRoom API Key</span>
                <span className={\`w-2 h-2 rounded-full \${hasPhotoRoomKey ? 'bg-emerald-400' : 'bg-amber-400'}\`} />
              </button>
            </div>

            {/* Dua Kartu Pilihan Engine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opsi 1: Mesin Studio Lokal */}
              <div
                onClick={() => onSelectBgEngine && onSelectBgEngine('local')}
                className={\`p-3 rounded-lg border transition-all cursor-pointer \${
                  bgEngine === 'local'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-400/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                }\`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🖥️</span>
                    <span className="text-xs font-bold">Mesin Studio Lokal</span>
                  </div>
                  {bgEngine === 'local' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  100% offline, tanpa kuota, proteksi piksel subjek asli secara instan.
                </p>
              </div>

              {/* Opsi 2: PhotoRoom AI Cloud */}
              <div
                onClick={() => onSelectBgEngine && onSelectBgEngine('photoroom')}
                className={\`p-3 rounded-lg border transition-all cursor-pointer \${
                  bgEngine === 'photoroom'
                    ? 'bg-purple-500/15 border-purple-500/60 text-white ring-1 ring-purple-400/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                }\`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">☁️</span>
                    <span className="text-xs font-bold text-purple-200">PhotoRoom AI Cloud</span>
                  </div>
                  {bgEngine === 'photoroom' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  AI mutakhir untuk helai rambut, kerah, dan kontur subjek super presisi.
                </p>
              </div>
            </div>

            {/* Tombol Aksi Eksekusi PhotoRoom saat Mode PhotoRoom Aktif */}
            {bgEngine === 'photoroom' && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">Status AI:</span>
                    {isPhotoRoomMaskActive ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mask PhotoRoom Aktif
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">Siap dieksekusi</span>
                    )}
                  </div>
                  {photoRoomError && (
                    <p className="text-[11px] text-rose-400 leading-tight">{photoRoomError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPhotoRoomMaskActive && onResetPhotoRoomMask && (
                    <button
                      type="button"
                      onClick={onResetPhotoRoomMask}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Kembalikan mask ke hasil segmentasi lokal"
                    >
                      Reset ke Lokal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onProcessWithPhotoRoom}
                    disabled={isProcessingPhotoRoom}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPhotoRoom ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Memproses PhotoRoom AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-200" />
                        ⚡ Eksekusi Hapus Latar PhotoRoom
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}`;

  fs.writeFileSync('src/components/BackgroundSelector.tsx', before + ui + after, 'utf8');
  console.log('BackgroundSelector successfully updated with UI!');
}
