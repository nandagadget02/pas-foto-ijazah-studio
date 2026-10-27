import React, { useRef, useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Check,
  CheckCircle2,
  Sliders,
  Sun,
  Move,
  RotateCcw,
  FlipHorizontal,
  Sparkles,
  Image as ImageIcon,
  ZoomIn,
  Compass,
  Contrast,
  Feather,
  Droplet,
  ChevronDown,
  ChevronUp,
  Trash2,
  FolderHeart,
  FileImage,
  RefreshCw,
  Scissors,
  Paintbrush,
  Undo2,
  Redo2,
  ScanEye,
  Eye,
} from 'lucide-react';
import {
  BackgroundType,
  BackgroundSettings,
  BackgroundRemovalMode,
  DiagnosticPreviewMode,
  MaskBrushSettings,
  DEFAULT_MASK_BRUSH,
} from '../types/analysis';

interface BackgroundSelectorProps {
  currentType: BackgroundType;
  onSelectType: (type: BackgroundType) => void;
  customBgImage: HTMLImageElement | null;
  onCustomBgUploaded: (img: HTMLImageElement | null) => void;
  customBgPreviewUrl: string | null;
  bgSettings: BackgroundSettings;
  onUpdateBgSettings: (settings: BackgroundSettings) => void;
  segmentationWarning?: string | null;
  segmentationConfidence?: number;
  detectedBgColor?: string;
  isBatchMode?: boolean;
  onApplyBackgroundToAllBatch?: () => void;
  // Kontrol Utama Penghapusan Latar Belakang
  bgRemovalMode?: BackgroundRemovalMode;
  onSelectBgRemovalMode?: (mode: BackgroundRemovalMode) => void;
  hasTransparency?: boolean;
  onApplyBgRemovalModeToAllBatch?: () => void;
  // Mode Diagnostik Mask & Kuas Koreksi Manual
  diagnosticMode?: DiagnosticPreviewMode;
  onSelectDiagnosticMode?: (mode: DiagnosticPreviewMode) => void;
  brushSettings?: MaskBrushSettings;
  onUpdateBrushSettings?: (settings: MaskBrushSettings) => void;
  isBrushActive?: boolean;
  onToggleBrush?: () => void;
  canUndoMask?: boolean;
  canRedoMask?: boolean;
  onUndoMask?: () => void;
  onRedoMask?: () => void;
  onResetMask?: () => void;
  edgeInspectionFocus?: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders';
  onSelectEdgeInspectionFocus?: (focus: 'fit' | 'hair' | 'ears' | 'collar' | 'shoulders') => void;
}

interface CustomBgLibraryItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  date: string;
}

const LOCAL_STORAGE_KEY = 'pasfoto_custom_backgrounds_library';

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  currentType,
  onSelectType,
  customBgImage,
  onCustomBgUploaded,
  customBgPreviewUrl,
  bgSettings,
  onUpdateBgSettings,
  segmentationWarning,
  segmentationConfidence,
  detectedBgColor,
  isBatchMode,
  onApplyBackgroundToAllBatch,
  bgRemovalMode = 'remove',
  onSelectBgRemovalMode,
  hasTransparency = false,
  onApplyBgRemovalModeToAllBatch,
  diagnosticMode = 'composite',
  onSelectDiagnosticMode,
  brushSettings = DEFAULT_MASK_BRUSH,
  onUpdateBrushSettings,
  isBrushActive = false,
  onToggleBrush,
  canUndoMask = false,
  canRedoMask = false,
  onUndoMask,
  onRedoMask,
  onResetMask,
  edgeInspectionFocus = 'fit',
  onSelectEdgeInspectionFocus,
}) => {
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const [stagedType, setStagedType] = useState<BackgroundType>(currentType);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'position' | 'lighting' | 'edges'>('position');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Custom file metadata tracking
  const [customFileName, setCustomFileName] = useState<string>('custom-background.jpg');
  const [customFileSize, setCustomFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Local Custom Background Library ("Latar Belakang Saya")
  const [libraryItems, setLibraryItems] = useState<CustomBgLibraryItem[]>([]);

  // Load library from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLibraryItems(parsed);
          // If customBgPreviewUrl exists and matches an item in library, recover filename
          if (customBgPreviewUrl) {
            const found = parsed.find((item) => item.url === customBgPreviewUrl);
            if (found) {
              setCustomFileName(found.name);
              setCustomFileSize(found.size || '');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load custom background library:', e);
    }
  }, [customBgPreviewUrl]);

  // Sync stagedType whenever currentType changes from parent
  useEffect(() => {
    setStagedType(currentType);
  }, [currentType]);

  const showApplyToast = (msg: string) => {
    setAppliedNotification(msg);
    setTimeout(() => {
      setAppliedNotification(null);
    }, 3500);
  };

  // Save uploaded image to Custom Background Library
  const saveToLibrary = (item: CustomBgLibraryItem) => {
    try {
      const filtered = libraryItems.filter((b) => b.name !== item.name).slice(0, 5);
      const updated = [item, ...filtered];
      setLibraryItems(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save error (storage limit reached):', e);
    }
  };

  const removeLibraryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = libraryItems.filter((item) => item.id !== id);
    setLibraryItems(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  // Open the native file picker reliably
  const triggerFilePicker = () => {
    setUploadError(null);
    if (customFileInputRef.current) {
      customFileInputRef.current.value = '';
      customFileInputRef.current.click();
    }
  };

  // Handle file chosen from file picker or drag & drop
  const handleCustomFile = (file: File) => {
    setUploadError(null);

    // Validate format: JPG, JPEG, PNG, WEBP
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImageMime = file.type.startsWith('image/');

    if (!validExts.includes(ext) && !isImageMime) {
      setUploadError(
        'Format file tidak didukung. Harap pilih gambar dengan format JPG, JPEG, PNG, atau WEBP.'
      );
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setCustomFileName(file.name);
    setCustomFileSize(`${sizeInMb} MB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setUploadError('Gagal membaca data file gambar.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        // 1. Pass image to parent
        onCustomBgUploaded(img);
        // 2. Set active background mode to custom
        setStagedType('custom');
        onSelectType('custom');

        // 3. Save to Custom Background Library
        const newItem: CustomBgLibraryItem = {
          id: Date.now().toString(),
          name: file.name,
          url: dataUrl,
          size: `${sizeInMb} MB`,
          date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        saveToLibrary(newItem);

        // 4. Notify user
        showApplyToast(`✓ Gambar "${file.name}" berhasil diunggah & diterapkan ke foto!`);
      };

      img.onerror = () => {
        setUploadError('Gambar tidak valid atau korup. Harap pilih gambar lain.');
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setUploadError('Terjadi kesalahan saat membaca file dari perangkat.');
    };

    reader.readAsDataURL(file);
  };

  // Select an item from previous library
  const handleSelectFromLibrary = (item: CustomBgLibraryItem) => {
    setCustomFileName(item.name);
    setCustomFileSize(item.size || '');

    const img = new Image();
    img.onload = () => {
      onCustomBgUploaded(img);
      setStagedType('custom');
      onSelectType('custom');
      showApplyToast(`✓ Latar "${item.name}" dari koleksi diterapkan ke foto!`);
    };
    img.src = item.url;
  };

  // Button Click handler for background options
  const handleSelectOption = (type: BackgroundType) => {
    if (type === 'custom') {
      // WAJIB: Saat tombol [ Upload Custom ] ditekan, buka file picker
      triggerFilePicker();
      return;
    }

    setStagedType(type);
    onSelectType(type);
  };

  // Apply button handler
  const handleApplyClick = () => {
    if (stagedType === 'custom' && !customBgPreviewUrl) {
      triggerFilePicker();
      return;
    }

    onSelectType(stagedType);
    const label = getBackgroundInfo(stagedType).label;
    showApplyToast(`✓ Latar Belakang "${label}" berhasil diterapkan ke Pas Foto 600 DPI!`);
  };

  const updateSetting = <K extends keyof BackgroundSettings>(
    key: K,
    value: BackgroundSettings[K]
  ) => {
    onUpdateBgSettings({
      ...bgSettings,
      [key]: value,
    });
  };

  const resetPositionAndScale = () => {
    onUpdateBgSettings({
      ...bgSettings,
      subjectOffsetX: 0,
      subjectOffsetY: 0,
      subjectScale: 1.0,
      subjectRotation: 0,
      subjectFlipX: false,
    });
  };

  const resetLighting = () => {
    onUpdateBgSettings({
      ...bgSettings,
      lightHarmonization: 0,
      bgBlur: 0,
      bgBrightness: 0,
      bgContrast: 0,
      contactShadow: 0,
    });
  };

  const resetEdges = () => {
    onUpdateBgSettings({
      ...bgSettings,
      edgeTolerance: 30,
      edgeFeather: 2.5,
      spillRemoval: 60,
    });
  };

  // Background Metadata and visual representations
  const getBackgroundInfo = (type: BackgroundType) => {
    switch (type) {
      case 'preserve':
        return {
          label: 'Keep Original',
          indonesianLabel: 'Pertahankan Latar Asli',
          desc: 'Mempertahankan latar belakang asli dari foto subjek tanpa modifikasi.',
          tag: 'ORIGINAL',
          renderThumbnail: (
            <div className="w-full h-full bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-emerald-400 p-2 text-center">
              <ShieldCheck className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-mono font-bold text-slate-300">ASLI</span>
            </div>
          ),
        };
      case 'white':
        return {
          label: 'Putih',
          indonesianLabel: 'Putih Bersih Studio',
          desc: 'Latar putih bersih tanpa noise, standar formal paspor dan kearsipan.',
          tag: 'STANDAR PASPOR',
          renderThumbnail: (
            <div className="w-full h-full bg-white border border-slate-300 flex items-center justify-center shadow-inner">
              <div className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300" />
            </div>
          ),
        };
      case 'gray':
        return {
          label: 'Abu-abu',
          indonesianLabel: 'Abu-abu Studio Netral',
          desc: 'Latar abu-abu gradasi studio portrait dengan pencahayaan netral.',
          tag: 'STUDIO NETRAL',
          renderThumbnail: (
            <div className="w-full h-full bg-gradient-to-br from-[#dedede] via-[#bfbfbf] to-[#8f8f8f] border border-slate-600 shadow-inner flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-slate-400/50" />
            </div>
          ),
        };
      case 'black':
        return {
          label: 'Hitam',
          indonesianLabel: 'Hitam Studio Elegan',
          desc: 'Latar hitam elegan dengan kontras studio tinggi untuk potret formal.',
          tag: 'DEEP BLACK',
          renderThumbnail: (
            <div className="w-full h-full bg-gradient-to-br from-[#27272a] via-[#18181b] to-[#09090b] border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-slate-800/80 border border-slate-700" />
            </div>
          ),
        };
      case 'transparent':
        return {
          label: 'Transparan',
          indonesianLabel: 'Transparan (PNG)',
          desc: 'Subjek diisolasi tanpa latar, siap digunakan untuk desain grafis atau ID card.',
          tag: 'ISOLASI PNG',
          renderThumbnail: (
            <div className="w-full h-full bg-[conic-gradient(#334155_90deg,#0f172a_90deg_180deg,#334155_180deg_270deg,#0f172a_270deg)] bg-[length:10px_10px] border border-slate-700 flex items-center justify-center">
              <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1 py-0.5 rounded">PNG</span>
            </div>
          ),
        };
      case 'custom':
        return {
          label: 'Upload Custom',
          indonesianLabel: 'Foto Latar Sendiri',
          desc: customBgPreviewUrl
            ? `Foto "${customFileName}" aktif sebagai latar pas foto beresolusi tinggi.`
            : 'Pilih dan gunakan foto Anda sendiri sebagai latar belakang.',
          tag: 'UNGGAH BEBAS',
          renderThumbnail: customBgPreviewUrl ? (
            <img
              src={customBgPreviewUrl}
              alt="Custom Background"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full border-2 border-dashed border-amber-400/50 bg-amber-400/10 flex flex-col items-center justify-center text-amber-300 p-2">
              <Upload className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-mono">Pilih Foto</span>
            </div>
          ),
        };
      case 'red':
        return {
          label: 'Merah Resmi',
          indonesianLabel: 'Merah Resmi Ijazah',
          desc: 'Standar resmi Ijazah Nasional, KTP tahun lahir ganjil, Paspor, SKCK.',
          tag: 'STANDAR IJAZAH',
          renderThumbnail: (
            <div className="w-full h-full bg-gradient-to-br from-[#db2626] via-[#c0181e] to-[#991b1b] border border-red-700 shadow-inner" />
          ),
        };
      case 'blue':
        return {
          label: 'Biru Resmi',
          indonesianLabel: 'Biru Resmi Ijazah',
          desc: 'Standar resmi Ijazah Nasional, KTP tahun lahir genap, Sekolah Kedinasan.',
          tag: 'STANDAR IJAZAH',
          renderThumbnail: (
            <div className="w-full h-full bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] border border-blue-700 shadow-inner" />
          ),
        };
      default:
        return {
          label: 'Original',
          indonesianLabel: 'Latar Asli',
          desc: 'Latar belakang foto asli.',
          tag: 'ASLI',
          renderThumbnail: <div className="w-full h-full bg-slate-800" />,
        };
    }
  };

  const primaryOptions: { type: BackgroundType; label: string; swatch: React.ReactNode }[] = [
    {
      type: 'preserve',
      label: 'Keep Original',
      swatch: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      type: 'white',
      label: 'Putih',
      swatch: <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 shadow-sm" />,
    },
    {
      type: 'gray',
      label: 'Abu-abu',
      swatch: <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shadow-sm" />,
    },
    {
      type: 'black',
      label: 'Hitam',
      swatch: <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 shadow-sm" />,
    },
    {
      type: 'transparent',
      label: 'Transparan',
      swatch: (
        <span className="w-3.5 h-3.5 rounded-full bg-[conic-gradient(#64748b_90deg,#1e293b_90deg_180deg,#64748b_180deg_270deg,#1e293b_270deg)] bg-[length:4px_4px] border border-slate-600" />
      ),
    },
    {
      type: 'custom',
      label: 'Upload Custom',
      swatch: <Upload className="w-3.5 h-3.5 text-amber-400" />,
    },
  ];

  const nationalOptions: { type: BackgroundType; label: string; swatch: React.ReactNode }[] = [
    {
      type: 'red',
      label: 'Merah Resmi',
      swatch: <span className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-sm" />,
    },
    {
      type: 'blue',
      label: 'Biru Resmi',
      swatch: <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-sm" />,
    },
  ];

  const currentInfo = getBackgroundInfo(stagedType);
  const isCurrentlyApplied = currentType === stagedType;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-sm space-y-6">
      {/* Hidden File Input for Custom Background — ALWAYS in DOM */}
      <input
        ref={customFileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleCustomFile(e.target.files[0]);
          }
        }}
      />

      {/* 1. Header: GANTI LATAR BELAKANG PAS FOTO */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            FITUR LATAR BELAKANG PAS FOTO
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Subjek 100% Asli
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
          <Layers className="w-5 h-5 text-amber-400" />
          GANTI LATAR BELAKANG PAS FOTO
        </h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Pilih salah satu latar belakang standar atau klik <strong>Upload Custom</strong> untuk memilih foto latar
          dari komputer Anda (JPG, JPEG, PNG, WEBP).
        </p>

        {/* Warning banner if segmentation is complex (hanya tampil jika mode Hapus Background aktif) */}
        {segmentationWarning && bgRemovalMode !== 'skip' && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-snug">
              <strong className="text-amber-300 font-semibold block mb-0.5">
                Proteksi Subjek Aktif
              </strong>
              {segmentationWarning}
            </div>
          </div>
        )}

        {/* Error notification if upload fails */}
        {uploadError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* 1b. KONTROL UTAMA: PENGHAPUSAN LATAR BELAKANG (Hapus Background vs Jangan Hapus Background) */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                KONTROL PENGHAPUSAN LATAR
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                Penentu Pipeline
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">
              Pilih apakah proses penghapusan latar belakang dijalankan
            </h4>
          </div>

          {/* Status Mode Aktif Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Status Mode:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
                bgRemovalMode === 'remove'
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {bgRemovalMode === 'remove' ? '● Hapus Background' : '● Jangan Hapus Background'}
            </span>
          </div>
        </div>

        {/* 2 Segmented Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* KARTU A: HAPUS BACKGROUND */}
          <div
            onClick={() => onSelectBgRemovalMode && onSelectBgRemovalMode('remove')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              bgRemovalMode === 'remove'
                ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Scissors className={`w-4 h-4 ${bgRemovalMode === 'remove' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${bgRemovalMode === 'remove' ? 'text-white' : 'text-slate-300'}`}>
                    Hapus Background
                  </span>
                </div>
                {bgRemovalMode === 'remove' && (
                  <Check className="w-4 h-4 text-amber-400 stroke-[3]" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Menjalankan segmentasi & pemisahan latar otomatis. Digunakan untuk foto berlatar solid/menyatu dengan subjek agar warna atau gambar latar baru dapat diterapkan.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Cocok untuk:</span>
              <span className="text-amber-300 font-semibold">Foto Kamera / Latar Solid</span>
            </div>
          </div>

          {/* KARTU B: JANGAN HAPUS BACKGROUND */}
          <div
            onClick={() => onSelectBgRemovalMode && onSelectBgRemovalMode('skip')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              bgRemovalMode === 'skip'
                ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${bgRemovalMode === 'skip' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${bgRemovalMode === 'skip' ? 'text-white' : 'text-slate-300'}`}>
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

        {/* Informative helper callout when Jangan Hapus Background is active with solid image and non-preserve background */}
        {bgRemovalMode === 'skip' && !hasTransparency && stagedType !== 'preserve' && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-tight">
              <strong>Info:</strong> Foto sumber memiliki latar belakang solid tanpa area transparan. Karena mode <em>Jangan Hapus Background</em> aktif, latar asli tetap dipertahankan dan warna latar baru tidak menimpa subjek/latar yang sudah ada. Jika ingin mengganti latar belakang pada foto ini, aktifkan mode <strong>Hapus Background</strong> di atas.
            </p>
          </div>
        )}

        {/* Informative helper when Jangan Hapus Background is active with transparent PNG */}
        {bgRemovalMode === 'skip' && hasTransparency && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200/90 leading-tight">
              <strong>PNG Transparan Terdeteksi:</strong> Foto sudah memiliki area transparan bawaan. Seluruh pilihan warna dan custom background di bawah langsung muncul di belakang subjek tanpa dipotong ulang!
            </p>
          </div>
        )}

        {/* Batch Mode Sync Toolbar */}
        {isBatchMode && onApplyBgRemovalModeToAllBatch && (
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Samakan mode penghapusan latar ({bgRemovalMode === 'remove' ? 'Hapus Background' : 'Jangan Hapus Background'}) ke seluruh foto batch:
            </span>
            <button
              type="button"
              onClick={onApplyBgRemovalModeToAllBatch}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              Terapkan Mode ke Semua Foto Batch
            </button>
          </div>
        )}
      </div>

      {/* 1c. MODE TAMPILAN MASK & DIAGNOSTIK PREVIEW */}
      {bgRemovalMode !== 'skip' && (
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded border border-cyan-400/20 flex items-center gap-1.5">
                  <ScanEye className="w-3.5 h-3.5" />
                  MODE TAMPILAN & DIAGNOSTIK MASK
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                Inspeksi Pemisahan Subjek & Deteksi Latar
              </h4>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              {diagnosticMode === 'composite' && 'Tampilan: Hasil Komposit'}
              {diagnosticMode === 'overlay' && 'Tampilan: Highlight Overlay'}
              {diagnosticMode === 'mask' && 'Tampilan: Mask Subjek (B&W)'}
              {diagnosticMode === 'original' && 'Tampilan: Foto Asli'}
            </span>
          </div>

          {/* 4 Mode Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onSelectDiagnosticMode && onSelectDiagnosticMode('composite')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                diagnosticMode === 'composite'
                  ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Hasil Komposit</span>
              <span className="text-[9px] font-mono text-slate-500">Normal Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDiagnosticMode && onSelectDiagnosticMode('overlay')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                diagnosticMode === 'overlay'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md shadow-rose-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <ScanEye className="w-4 h-4" />
              <span>Overlay Mask</span>
              <span className="text-[9px] font-mono text-slate-500">Tinted Visual</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDiagnosticMode && onSelectDiagnosticMode('mask')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                diagnosticMode === 'mask'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Contrast className="w-4 h-4" />
              <span>Mask Subjek</span>
              <span className="text-[9px] font-mono text-slate-500">Hitam / Putih</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDiagnosticMode && onSelectDiagnosticMode('original')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                diagnosticMode === 'original'
                  ? 'bg-slate-800 border-slate-600 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Foto Asli</span>
              <span className="text-[9px] font-mono text-slate-500">Crop Sumber</span>
            </button>
          </div>

          {/* Description of active mode */}
          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
            {diagnosticMode === 'composite' && (
              <span><strong>Hasil Komposit:</strong> Menampilkan foto subjek dengan latar belakang baru yang dipilih.</span>
            )}
            {diagnosticMode === 'overlay' && (
              <span><strong>Overlay Mask:</strong> Menampilkan foto asli dengan warna merah transparan pada latar yang dihapus. Area subjek yang terlindungi tampil dengan warna aslinya.</span>
            )}
            {diagnosticMode === 'mask' && (
              <span><strong>Mask Subjek:</strong> Tampilan biner hitam-putih presisi tinggi. Warna putih adalah subjek utuh (100% solid), dan warna hitam adalah latar belakang yang dihapus.</span>
            )}
            {diagnosticMode === 'original' && (
              <span><strong>Foto Asli:</strong> Foto mentah hasil crop sebelum penghapusan latar belakang, untuk membandingkan bentuk subjek asli.</span>
            )}
          </div>

          {/* 1d. KOREKSI MANUAL MASK DENGAN KUAS */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleBrush}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    isBrushActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  {isBrushActive ? 'Kuas Koreksi: [ AKTIF ]' : 'Aktifkan Kuas Manual'}
                </button>
                {isBrushActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Klik / drag pada foto preview
                  </span>
                )}
              </div>

              {/* Undo / Redo / Reset */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onUndoMask}
                  disabled={!canUndoMask}
                  title="Batalkan sapuan kuas terakhir"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  type="button"
                  onClick={onRedoMask}
                  disabled={!canRedoMask}
                  title="Ulangi sapuan kuas"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Redo</span>
                </button>
                <button
                  type="button"
                  onClick={onResetMask}
                  title="Kembalikan mask ke hasil segmentasi otomatis awal"
                  className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-800/60 hover:text-rose-300 text-slate-400 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Mask</span>
                </button>
              </div>
            </div>

            {/* Brush Controls when Active */}
            {isBrushActive && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                {/* Brush Mode Choice: Restore vs Erase */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBrushSettings &&
                      onUpdateBrushSettings({ ...brushSettings, mode: 'restore' })
                    }
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      brushSettings.mode === 'restore'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                    <span>Pulihkan Subjek</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBrushSettings &&
                      onUpdateBrushSettings({ ...brushSettings, mode: 'erase' })
                    }
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      brushSettings.mode === 'erase'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
                    <span>Hapus Latar</span>
                  </button>
                </div>

                {/* Size and Hardness Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-mono text-[11px]">Ukuran Kuas</span>
                      <span className="text-amber-400 font-mono font-bold text-[11px]">
                        {brushSettings.size} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={1}
                      value={brushSettings.size}
                      onChange={(e) =>
                        onUpdateBrushSettings &&
                        onUpdateBrushSettings({
                          ...brushSettings,
                          size: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    {(() => {
                      const normalizedHardness =
                        brushSettings.hardness != null && brushSettings.hardness > 1
                          ? Math.min(1.0, brushSettings.hardness / 100)
                          : (brushSettings.hardness ?? 0.85);
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-300 font-mono text-[11px]">Kehalusan (Hardness)</span>
                            <span className="text-amber-400 font-mono font-bold text-[11px]">
                              {Math.round(normalizedHardness * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={normalizedHardness}
                            onChange={(e) =>
                              onUpdateBrushSettings &&
                              onUpdateBrushSettings({
                                ...brushSettings,
                                hardness: Number(e.target.value),
                              })
                            }
                            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  💡 <strong>Tips:</strong> Gunakan <em>Pulihkan Subjek</em> pada area tepi hijab, rambut, atau pakaian yang terpotong. Gunakan <em>Hapus Latar</em> untuk membersihkan sisa background yang masih menempel di sekitar bahu atau kepala.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Options Buttons Grid (Matches User Wireframe) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[11px]">
            PILIHAN WARNA & LATAR:
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {isCurrentlyApplied ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Latar Aktif
              </span>
            ) : (
              <span className="text-amber-400 font-semibold animate-pulse">
                Pilihan Baru Dipilih
              </span>
            )}
          </span>
        </div>

        {/* Primary wireframe buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {primaryOptions.map((opt) => {
            const isSelected = stagedType === opt.type;
            const isAppliedToPhoto = currentType === opt.type;

            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleSelectOption(opt.type)}
                className={`p-3 rounded-xl border text-left font-sans transition-all flex items-center justify-between gap-2.5 cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 flex items-center justify-center">
                    {opt.swatch}
                  </div>
                  <span className="text-xs font-bold truncate">
                    {opt.label}
                  </span>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {isAppliedToPhoto && !isSelected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Aktif di Canvas" />
                )}
              </button>
            );
          })}
        </div>

        {/* Standard Indonesian Official Colors (Merah & Biru Ijazah) */}
        <div className="pt-1 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider shrink-0">
            Resmi RI:
          </span>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {nationalOptions.map((opt) => {
              const isSelected = stagedType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelectOption(opt.type)}
                  className={`px-3 py-2 rounded-xl border text-left font-sans transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white ring-1 ring-amber-400/50'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.swatch}
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Dedicated Area: CUSTOM BACKGROUND (Tampil jika gambar telah diunggah atau mode custom aktif) */}
      {(customBgPreviewUrl || stagedType === 'custom') && (
        <div className="bg-slate-950/80 rounded-2xl border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5" />
              CUSTOM BACKGROUND
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {customBgPreviewUrl ? '✓ Siap digunakan' : 'Menunggu File'}
            </span>
          </div>

          {customBgPreviewUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-amber-400/40 bg-slate-900 shadow-md">
                <img
                  src={customBgPreviewUrl}
                  alt="Custom Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white font-bold text-xs truncate">
                  <span className="text-emerald-400">✓</span>
                  <span className="truncate">{customFileName}</span>
                </div>
                {customFileSize && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Ukuran File: {customFileSize} • Siap Cetak 600 DPI
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={triggerFilePicker}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Ganti Gambar Lain
                  </button>

                  {stagedType !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStagedType('custom');
                        onSelectType('custom');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Pilih Gambar Ini
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleCustomFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                isDraggingOver
                  ? 'border-amber-400 bg-amber-500/15 scale-[1.01]'
                  : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <Upload className="w-7 h-7 text-amber-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-white">
                Pilih atau seret gambar latar kustom Anda ke sini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Mendukung JPG, JPEG, PNG, WEBP resolusi tinggi
              </p>
              <button
                type="button"
                onClick={triggerFilePicker}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Upload className="w-3.5 h-3.5" />
                Buka File Picker
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Custom Background Library ("Latar Belakang Saya") */}
      {libraryItems.length > 0 && (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 flex items-center gap-1.5 font-bold uppercase text-[10px]">
              <FolderHeart className="w-3.5 h-3.5 text-amber-400" />
              Latar Belakang Saya ({libraryItems.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Penyimpanan Lokal Aktif
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {libraryItems.map((item) => {
              const isSelected = stagedType === 'custom' && customBgPreviewUrl === item.url;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectFromLibrary(item)}
                  className={`group relative rounded-lg overflow-hidden border p-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="w-full aspect-video rounded overflow-hidden bg-slate-950 mb-1">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[10px] font-medium text-slate-300 truncate" title={item.name}>
                    {item.name}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => removeLibraryItem(item.id, e)}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-slate-950/80 text-rose-400 hover:text-white hover:bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus dari koleksi"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Dedicated PREVIEW / THUMBNAIL BACKGROUND Card (Wireframe Component) */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Preview / Thumbnail Background
            </span>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
              isCurrentlyApplied
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
            }`}
          >
            {isCurrentlyApplied ? '● Diterapkan ke Pas Foto' : '● Siap Diterapkan'}
          </span>
        </div>

        {/* Thumbnail Preview Display */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-xl bg-slate-900 flex items-center justify-center p-1">
            <div className="w-full h-full rounded-lg overflow-hidden relative">
              {currentInfo.renderThumbnail}
            </div>
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h4 className="text-base font-extrabold text-white">
                {currentInfo.indonesianLabel}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                {currentInfo.tag}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentInfo.desc}
            </p>

            {stagedType === 'custom' && (
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {customBgPreviewUrl ? 'Ganti File Foto' : 'Pilih File Foto Latar'}
                </button>
                {customBgPreviewUrl && (
                  <span className="text-[11px] font-mono text-emerald-400">
                    ✓ File Dimuat
                  </span>
                )}
              </div>
            )}

            <div className="text-[11px] font-mono text-slate-400 pt-1">
              Standar 600 DPI • Anti-Aliased Edge Blending
            </div>
          </div>
        </div>

        {/* Toast / Notification when applied */}
        {appliedNotification && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
        )}

        {/* 6. Action Button: [ TERAPKAN / PERBARUI LATAR PADA FOTO ] (Wireframe Component) */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleApplyClick}
            className={`w-full py-3 px-5 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isCurrentlyApplied
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 animate-pulse'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isCurrentlyApplied
                ? 'TERAPKAN / PERBARUI LATAR PADA FOTO'
                : `TERAPKAN LATAR "${currentInfo.label.toUpperCase()}" KE PAS FOTO 600 DPI`}
            </span>
          </button>

          {isBatchMode && onApplyBackgroundToAllBatch && (
            <button
              type="button"
              onClick={onApplyBackgroundToAllBatch}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>TERAPKAN LATAR INI KE SEMUA FOTO BATCH</span>
            </button>
          )}
        </div>
      </div>

      {/* 7. Collapsible Advanced Adjustments (Posisi, Skala, Harmonisasi, Kerapian Tepi) */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/40">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 bg-slate-900/60 hover:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Pengaturan Lanjutan: Posisi, Harmonisasi Cahaya & Kerapian Tepi</span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 sm:p-5 space-y-5 border-t border-slate-800">
            {/* Navigation Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('position')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'position'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                Posisi & Skala
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('lighting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'lighting'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Harmonisasi Cahaya
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('edges')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'edges'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                Kerapian Tepi & Rambut
              </button>
            </div>

            {/* TAB: POSISI & SKALA */}
            {activeTab === 'position' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Atur proporsi subjek di atas latar baru</span>
                  <button
                    type="button"
                    onClick={resetPositionAndScale}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Skala Subjek */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <ZoomIn className="w-3 h-3 text-amber-400" />
                        Skala Subjek
                      </span>
                      <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                        {Math.round(bgSettings.subjectScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.65"
                      max="1.35"
                      step="0.01"
                      value={bgSettings.subjectScale}
                      onChange={(e) => updateSetting('subjectScale', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Rotasi / Kemiringan */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-amber-400" />
                        Kemiringan (Rotasi)
                      </span>
                      <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                        {bgSettings.subjectRotation > 0 ? `+${bgSettings.subjectRotation}` : bgSettings.subjectRotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={bgSettings.subjectRotation}
                      onChange={(e) => updateSetting('subjectRotation', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Posisi Horizontal (X) */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Geser Kiri / Kanan (X)</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {bgSettings.subjectOffsetX > 0 ? `+${bgSettings.subjectOffsetX}` : bgSettings.subjectOffsetX}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="1"
                      value={bgSettings.subjectOffsetX}
                      onChange={(e) => updateSetting('subjectOffsetX', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Posisi Vertikal (Y) */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Geser Atas / Bawah (Y)</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {bgSettings.subjectOffsetY > 0 ? `+${bgSettings.subjectOffsetY}` : bgSettings.subjectOffsetY}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="1"
                      value={bgSettings.subjectOffsetY}
                      onChange={(e) => updateSetting('subjectOffsetY', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Flip horizontal */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FlipHorizontal className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-white">Cerminkan Subjek (Flip Horizontal)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('subjectFlipX', !bgSettings.subjectFlipX)}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                      bgSettings.subjectFlipX
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {bgSettings.subjectFlipX ? 'Aktif' : 'Normal'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: HARMONISASI CAHAYA */}
            {activeTab === 'lighting' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Atur pencahayaan, bayangan & efek latar</span>
                  <button
                    type="button"
                    onClick={resetLighting}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Harmonization */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Harmonisasi Cahaya
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.lightHarmonization}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgSettings.lightHarmonization}
                      onChange={(e) => updateSetting('lightHarmonization', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Menyelaraskan warna highlight subjek dengan latar.
                    </p>
                  </div>

                  {/* Depth of Field Bokeh Blur */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Droplet className="w-3 h-3 text-amber-400" />
                        Bokeh Blur Latar
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.bgBlur} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={bgSettings.bgBlur}
                      onChange={(e) => updateSetting('bgBlur', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Efek kedalaman lensa portrait f/2.8 pada latar belakang.
                    </p>
                  </div>

                  {/* Kecerahan Latar */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Kecerahan Latar</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {bgSettings.bgBrightness > 0 ? `+${bgSettings.bgBrightness}` : bgSettings.bgBrightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="1"
                      value={bgSettings.bgBrightness}
                      onChange={(e) => updateSetting('bgBrightness', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Kontras Latar */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Kontras Latar</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {bgSettings.bgContrast > 0 ? `+${bgSettings.bgContrast}` : bgSettings.bgContrast}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="1"
                      value={bgSettings.bgContrast}
                      onChange={(e) => updateSetting('bgContrast', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Bayangan Natural (Contact Depth) */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Contrast className="w-3 h-3 text-amber-400" />
                        Bayangan Belakang Subjek
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.contactShadow}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="2"
                      value={bgSettings.contactShadow}
                      onChange={(e) => updateSetting('contactShadow', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: KERAPIAN TEPI & RAMBUT */}
            {activeTab === 'edges' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">Penyempurnaan Tepi Alami (Natural Edge Refinement)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Non-Destructive
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetEdges}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* Pintasan Inspeksi Zoom Tepi pada Preview */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Pratinjau Fokus Tepi:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectEdgeInspectionFocus && onSelectEdgeInspectionFocus('hair')}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        edgeInspectionFocus === 'hair'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Rambut
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEdgeInspectionFocus && onSelectEdgeInspectionFocus('ears')}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        edgeInspectionFocus === 'ears'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Telinga
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEdgeInspectionFocus && onSelectEdgeInspectionFocus('collar')}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        edgeInspectionFocus === 'collar'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Kerah Baju
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEdgeInspectionFocus && onSelectEdgeInspectionFocus('shoulders')}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        edgeInspectionFocus === 'shoulders'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Bahu
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEdgeInspectionFocus && onSelectEdgeInspectionFocus('fit')}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        edgeInspectionFocus === 'fit'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Fit (Utuh)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Sensitivitas Hapus Latar */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Sensitivitas Latar</span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.edgeTolerance}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="55"
                      step="1"
                      value={bgSettings.edgeTolerance}
                      onChange={(e) => updateSetting('edgeTolerance', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Ambang pemisahan siluet subjek dari latar (default: 30).
                    </p>
                  </div>

                  {/* Kehalusan Tepi (Feather) */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Kehalusan Tepi (Feather)</span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.edgeFeather} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="6"
                      step="0.5"
                      value={bgSettings.edgeFeather}
                      onChange={(e) => updateSetting('edgeFeather', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Lebar pita anti-aliasing sub-piksel di sekeliling subjek (default: 2.5 px).
                    </p>
                  </div>

                  {/* Spill Removal */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Pembersih Warna Lama</span>
                      <span className="font-mono text-amber-300 font-bold text-[11px]">
                        {bgSettings.spillRemoval}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgSettings.spillRemoval}
                      onChange={(e) => updateSetting('spillRemoval', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Menghilangkan halo/fringe merah/biru latar lama pada rambut & kerah (default: 60%).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
