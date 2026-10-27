const fs = require('fs');

// ==========================================
// 1. UPDATE BackgroundSelector.tsx
// ==========================================
let bgSelector = fs.readFileSync('src/components/BackgroundSelector.tsx', 'utf8');

// A. Add imports if needed
if (!bgSelector.includes('Loader2')) {
  bgSelector = bgSelector.replace("import {\n  Layers,", "import {\n  Loader2,\n  Layers,");
}
if (!bgSelector.includes('Cpu')) {
  bgSelector = bgSelector.replace("import {\n  Layers,", "import {\n  Cpu,\n  Layers,");
}

// B. Add new props to interface
const propsTarget = `  edgeInspectionFocus?: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders';
  onSelectEdgeInspectionFocus?: (focus: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders') => void;
}`;

const propsReplacement = `  edgeInspectionFocus?: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders';
  onSelectEdgeInspectionFocus?: (focus: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders') => void;
  // PhotoRoom Cloud AI Integration
  bgEngine?: 'local' | 'photoroom';
  onSelectBgEngine?: (engine: 'local' | 'photoroom') => void;
  onOpenPhotoRoomModal?: () => void;
  onProcessWithPhotoRoom?: () => Promise<void>;
  isProcessingPhotoRoom?: boolean;
  hasPhotoRoomKey?: boolean;
  isPhotoRoomMaskActive?: boolean;
  onResetPhotoRoomMask?: () => void;
  photoRoomError?: string | null;
}`;

bgSelector = bgSelector.replace(propsTarget, propsReplacement);

// C. Add destructuring parameters
const destructureTarget = `  edgeInspectionFocus = 'fit',
  onSelectEdgeInspectionFocus,
}) => {`;

const destructureReplacement = `  edgeInspectionFocus = 'fit',
  onSelectEdgeInspectionFocus,
  bgEngine = 'local',
  onSelectBgEngine,
  onOpenPhotoRoomModal,
  onProcessWithPhotoRoom,
  isProcessingPhotoRoom = false,
  hasPhotoRoomKey = false,
  isPhotoRoomMaskActive = false,
  onResetPhotoRoomMask,
  photoRoomError = null,
}) => {`;

bgSelector = bgSelector.replace(destructureTarget, destructureReplacement);

// D. Add PhotoRoom UI Box after the 2 main mode cards (after line 666)
const cardsEndTarget = `          {/* KARTU B: JANGAN HAPUS BACKGROUND */}
          <div
            onClick={() => onSelectBgRemovalMode && onSelectBgRemovalMode('skip')}
            className={\`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between \${
              bgRemovalMode === 'skip'
                ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }\`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={\`w-4 h-4 \${bgRemovalMode === 'skip' ? 'text-emerald-400' : 'text-slate-400'}\`} />
                  <span className={\`text-xs font-bold uppercase tracking-wider \${bgRemovalMode === 'skip' ? 'text-white' : 'text-slate-300'}\`}>
                    Jangan Hapus Background
                  </span>
                </div>
                {bgRemovalMode === 'skip' && (
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Melewati segmentasi dan tidak memotong piksel sumber. Mempertahankan foto asli dan transparansi PNG bawaan tanpa komputasi ulang mask.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Cocok untuk:</span>
              <span className="text-emerald-300 font-semibold">PNG Transparan / Pertahankan Asli</span>
            </div>
          </div>
        </div>`;

const photoRoomEngineUI = `          {/* KARTU B: JANGAN HAPUS BACKGROUND */}
          <div
            onClick={() => onSelectBgRemovalMode && onSelectBgRemovalMode('skip')}
            className={\`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between \${
              bgRemovalMode === 'skip'
                ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }\`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={\`w-4 h-4 \${bgRemovalMode === 'skip' ? 'text-emerald-400' : 'text-slate-400'}\`} />
                  <span className={\`text-xs font-bold uppercase tracking-wider \${bgRemovalMode === 'skip' ? 'text-white' : 'text-slate-300'}\`}>
                    Jangan Hapus Background
                  </span>
                </div>
                {bgRemovalMode === 'skip' && (
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Melewati segmentasi dan tidak memotong piksel sumber. Mempertahankan foto asli dan transparansi PNG bawaan tanpa komputasi ulang mask.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Cocok untuk:</span>
              <span className="text-emerald-300 font-semibold">PNG Transparan / Pertahankan Asli</span>
            </div>
          </div>
        </div>

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

if (bgSelector.includes(cardsEndTarget)) {
  bgSelector = bgSelector.replace(cardsEndTarget, photoRoomEngineUI);
  fs.writeFileSync('src/components/BackgroundSelector.tsx', bgSelector, 'utf8');
  console.log('BackgroundSelector.tsx updated with PhotoRoom integration!');
} else {
  console.error('cardsEndTarget not found in BackgroundSelector.tsx');
}

// ==========================================
// 2. UPDATE App.tsx
// ==========================================
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// A. Add imports in App.tsx
if (!appCode.includes('PhotoRoomService')) {
  appCode = appCode.replace(
    "import { ApiKeyModal } from './components/ApiKeyModal';",
    "import { ApiKeyModal } from './components/ApiKeyModal';\nimport { PhotoRoomKeyModal } from './components/PhotoRoomKeyModal';\nimport { PhotoRoomService } from './services/PhotoRoomService';"
  );
}

// B. Add State in App.tsx
const appStateTarget = `  const [segmentationWarning, setSegmentationWarning] = useState<string | null>(null);`;
const appStateReplacement = `  const [segmentationWarning, setSegmentationWarning] = useState<string | null>(null);
  // PhotoRoom Cloud AI State
  const [selectedBgEngine, setSelectedBgEngine] = useState<'local' | 'photoroom'>('local');
  const [isPhotoRoomModalOpen, setIsPhotoRoomModalOpen] = useState<boolean>(false);
  const [isProcessingPhotoRoom, setIsProcessingPhotoRoom] = useState<boolean>(false);
  const [photoRoomError, setPhotoRoomError] = useState<string | null>(null);
  const [isPhotoRoomMaskActive, setIsPhotoRoomMaskActive] = useState<boolean>(false);
  const [photoRoomApiKey, setPhotoRoomApiKey] = useState<string>(() => PhotoRoomService.getApiKey());`;

if (appCode.includes(appStateTarget)) {
  appCode = appCode.replace(appStateTarget, appStateReplacement);
}

// C. Add PhotoRoom Handlers in App.tsx
const handlerAnchor = `  // 6. Dimension & Crop State`;
const photoRoomHandlers = `  // PhotoRoom Cloud AI Background Removal Handlers
  const handleProcessWithPhotoRoom = useCallback(async () => {
    if (!sourceImage) {
      alert('Unggah foto sumber terlebih dahulu sebelum menjalankan PhotoRoom AI.');
      return;
    }
    const key = PhotoRoomService.getApiKey();
    if (!key) {
      setIsPhotoRoomModalOpen(true);
      return;
    }

    setIsProcessingPhotoRoom(true);
    setPhotoRoomError(null);
    try {
      // Prioritaskan kanvas terpotong agar hemat token dan sesuai framing
      const targetSource = rawCroppedCanvasRef.current || sourceImage;
      const res = await PhotoRoomService.removeBackground(targetSource, key);
      if (res.ok && res.mask) {
        setCustomMask(res.mask);
        setMaskVersion((v) => v + 1);
        setIsPhotoRoomMaskActive(true);
        setBgRemovalMode('remove');
        previewCacheRef.current.clear();
      } else {
        setPhotoRoomError(res.error || 'Gagal memproses gambar dengan PhotoRoom API.');
      }
    } catch (err: any) {
      setPhotoRoomError(err?.message || 'Terjadi kesalahan saat memproses PhotoRoom API.');
    } finally {
      setIsProcessingPhotoRoom(false);
    }
  }, [sourceImage]);

  const handleResetPhotoRoomMask = useCallback(() => {
    setCustomMask(null);
    setMaskVersion((v) => v + 1);
    setIsPhotoRoomMaskActive(false);
    previewCacheRef.current.clear();
  }, []);

  // 6. Dimension & Crop State`;

if (appCode.includes(handlerAnchor)) {
  appCode = appCode.replace(handlerAnchor, photoRoomHandlers);
}

// D. Pass props to BackgroundSelector in App.tsx
const bgSelectorPropsTarget = `                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                  />`;

const bgSelectorPropsReplacement = `                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                    bgEngine={selectedBgEngine}
                    onSelectBgEngine={setSelectedBgEngine}
                    onOpenPhotoRoomModal={() => setIsPhotoRoomModalOpen(true)}
                    onProcessWithPhotoRoom={handleProcessWithPhotoRoom}
                    isProcessingPhotoRoom={isProcessingPhotoRoom}
                    hasPhotoRoomKey={Boolean(photoRoomApiKey)}
                    isPhotoRoomMaskActive={isPhotoRoomMaskActive}
                    onResetPhotoRoomMask={handleResetPhotoRoomMask}
                    photoRoomError={photoRoomError}
                  />`;

if (appCode.includes(bgSelectorPropsTarget)) {
  appCode = appCode.replace(bgSelectorPropsTarget, bgSelectorPropsReplacement);
}

// E. Render PhotoRoomKeyModal in App.tsx
const modalAnchor = `      {/* AI & Local Recommendation Presets Modal (Save, Reuse, Export, Import) */}`;
const modalReplacement = `      {/* PhotoRoom AI API Key Modal */}
      <PhotoRoomKeyModal
        isOpen={isPhotoRoomModalOpen}
        onClose={() => setIsPhotoRoomModalOpen(false)}
        onKeySaved={(newKey) => setPhotoRoomApiKey(newKey)}
      />

      {/* AI & Local Recommendation Presets Modal (Save, Reuse, Export, Import) */}`;

if (appCode.includes(modalAnchor)) {
  appCode = appCode.replace(modalAnchor, modalReplacement);
}

fs.writeFileSync('src/App.tsx', appCode, 'utf8');
console.log('App.tsx updated with PhotoRoom integration!');
