import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Printer,
  Sparkles,
  RotateCcw,
  Sun,
  ShieldCheck,
  Info,
  Minus,
  Plus,
  Save,
  Bookmark,
  FolderHeart,
  Download,
  Upload,
  Check,
  X,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Layers,
} from 'lucide-react';
import {
  PaperProfile,
  PrintCompensationPreset,
  PrinterCompensationSettings,
  PrinterProfile,
} from '../types/analysis';
import {
  PrintCompensationPresetService,
  SYSTEM_DEFAULT_PRESET,
} from '../services/printCompensationPresetService';

interface StepperButtonProps {
  type: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onStep: () => void;
}

/**
 * Tombol Stepper [ − ] / [ + ]
 * Mendukung klik satuan (±1) dan tekan-tahan (hold-to-repeat) yang halus.
 */
const StepperButton: React.FC<StepperButtonProps> = ({
  type,
  label,
  disabled,
  onStep,
}) => {
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (disabled) {
      clearTimers();
    }
  }, [disabled, clearTimers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return;
    clearTimers();
    // Step langsung ±1 pada klik / sentuhan pertama
    onStepRef.current();

    // Jika ditahan lebih dari 400ms, ulangi step setiap 120ms
    timerRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        onStepRef.current();
      }, 120);
    }, 400);
  };

  const handlePointerUp = () => {
    clearTimers();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStepRef.current();
    }
  };

  const actionText = type === 'minus' ? `Kurangi ${label}` : `Tambah ${label}`;

  return (
    <button
      type="button"
      disabled={disabled}
      title={actionText}
      aria-label={actionText}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.preventDefault()}
      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-95 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-700/60 shadow-sm select-none"
    >
      {type === 'minus' ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
    </button>
  );
};

interface FineCompensationRowProps {
  label: string;
  sublabel: string;
  value: number;
  disabled: boolean;
  accent: 'sky' | 'amber' | 'rose' | 'emerald';
  onChange: (val: number) => void;
}

/**
 * Kontrol baris Fine Compensation dengan layout:
 * [ Label ]                      [ Nilai Badge ]
 * [ − ] [ ====== Slider ====== ] [ + ]
 */
const FineCompensationRow: React.FC<FineCompensationRowProps> = ({
  label,
  sublabel,
  value,
  disabled,
  accent,
  onChange,
}) => {
  const handleStep = (delta: number) => {
    const nextVal = Math.max(-100, Math.min(100, value + delta));
    onChange(nextVal);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const nextVal = isNaN(raw) ? 0 : Math.max(-100, Math.min(100, raw));
    onChange(nextVal);
  };

  // Format nilai sesuai spesifikasi: + untuk positif (+3), − untuk negatif (−2), 0 untuk netral (0)
  const formattedValue = value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0';

  const accentStyles = {
    sky: {
      sliderAccent: 'accent-sky-400 hover:accent-sky-300',
      badge: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    },
    amber: {
      sliderAccent: 'accent-amber-400 hover:accent-amber-300',
      badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    },
    rose: {
      sliderAccent: 'accent-rose-400 hover:accent-rose-300',
      badge: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
    },
    emerald: {
      sliderAccent: 'accent-emerald-400 hover:accent-emerald-300',
      badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    },
  }[accent];

  return (
    <div
      className={`border rounded-xl p-3.5 space-y-2.5 transition-colors ${
        disabled
          ? 'bg-slate-950/40 border-slate-900 opacity-60'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      <div className="flex justify-between items-center text-xs">
        <div>
          <span className="font-semibold text-slate-200">{label}</span>
          <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
            ({sublabel})
          </span>
        </div>
        <span
          className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
            value !== 0 && !disabled
              ? accentStyles.badge
              : 'bg-slate-800 text-slate-400 border-slate-700/40'
          }`}
        >
          {formattedValue}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <StepperButton
          type="minus"
          label={label}
          disabled={disabled || value <= -100}
          onStep={() => handleStep(-1)}
        />

        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          aria-label={label}
          className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none ${accentStyles.sliderAccent}`}
        />

        <StepperButton
          type="plus"
          label={label}
          disabled={disabled || value >= 100}
          onStep={() => handleStep(1)}
        />
      </div>
    </div>
  );
};

interface TonalControlRowProps {
  label: string;
  sublabel: string;
  description: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  accent: 'sky' | 'amber' | 'rose' | 'emerald' | 'cyan';
  onChange: (val: number) => void;
}

/**
 * Kontrol baris untuk kontrol highlight, brightness, white point, dan garment detail
 */
const TonalControlRow: React.FC<TonalControlRowProps> = ({
  label,
  sublabel,
  description,
  value,
  min,
  max,
  disabled,
  accent,
  onChange,
}) => {
  const handleStep = (delta: number) => {
    const nextVal = Math.max(min, Math.min(max, value + delta));
    onChange(nextVal);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const nextVal = isNaN(raw) ? 0 : Math.max(min, Math.min(max, raw));
    onChange(nextVal);
  };

  const formattedValue =
    min < 0
      ? value > 0
        ? `+${value}`
        : value < 0
        ? `−${Math.abs(value)}`
        : '0'
      : `${value}`;

  const accentStyles = {
    sky: {
      sliderAccent: 'accent-sky-400 hover:accent-sky-300',
      badge: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    },
    amber: {
      sliderAccent: 'accent-amber-400 hover:accent-amber-300',
      badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    },
    rose: {
      sliderAccent: 'accent-rose-400 hover:accent-rose-300',
      badge: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
    },
    emerald: {
      sliderAccent: 'accent-emerald-400 hover:accent-emerald-300',
      badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    },
    cyan: {
      sliderAccent: 'accent-cyan-400 hover:accent-cyan-300',
      badge: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
    },
  }[accent];

  return (
    <div
      className={`border rounded-xl p-3.5 space-y-2 transition-colors ${
        disabled
          ? 'bg-slate-950/40 border-slate-900 opacity-60'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      <div className="flex justify-between items-center text-xs">
        <div>
          <span className="font-semibold text-slate-200">{label}</span>
          <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
            ({sublabel})
          </span>
        </div>
        <span
          className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
            value !== 0 && !disabled
              ? accentStyles.badge
              : 'bg-slate-800 text-slate-400 border-slate-700/40'
          }`}
        >
          {formattedValue}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <StepperButton
          type="minus"
          label={label}
          disabled={disabled || value <= min}
          onStep={() => handleStep(-1)}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          aria-label={label}
          className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none ${accentStyles.sliderAccent}`}
        />

        <StepperButton
          type="plus"
          label={label}
          disabled={disabled || value >= max}
          onStep={() => handleStep(1)}
        />
      </div>

      <p className="text-[10px] text-slate-400 leading-tight">
        {description}
      </p>
    </div>
  );
};

interface PrinterCompensationPanelProps {
  settings: PrinterCompensationSettings;
  onChange: (newSettings: PrinterCompensationSettings) => void;
  activePreviewTarget?: 'master' | 'print';
  onSelectPreviewTarget?: (target: 'master' | 'print') => void;
  isBatchMode?: boolean;
  onApplyCompensationToAllBatch?: () => void;
}

export const PrinterCompensationPanel: React.FC<PrinterCompensationPanelProps> = ({
  settings,
  onChange,
  activePreviewTarget = 'print',
  onSelectPreviewTarget,
  isBatchMode = false,
  onApplyCompensationToAllBatch,
}) => {
  // Preset Library & State
  const [presets, setPresets] = useState<PrintCompensationPreset[]>([SYSTEM_DEFAULT_PRESET]);
  const [activePreset, setActivePreset] = useState<PrintCompensationPreset | null>(null);
  const [activePresetOriginalSettings, setActivePresetOriginalSettings] =
    useState<PrinterCompensationSettings | null>(null);

  // Modals & Dialogs State
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [updateConfirmPreset, setUpdateConfirmPreset] = useState<PrintCompensationPreset | null>(null);
  const [deleteConfirmPreset, setDeleteConfirmPreset] = useState<PrintCompensationPreset | null>(null);

  // Notifications & Storage Status
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastUsedPreset, setLastUsedPreset] = useState<PrintCompensationPreset | null>(null);
  const [isStorageWarningShown, setIsStorageWarningShown] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper untuk membersihkan toast setelah 4 detik
  useEffect(() => {
    if (toastMessage) {
      const timer = window.setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => window.clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load presets dari IndexedDB saat pertama kali dimuat
  const loadPresetsFromStorage = useCallback(async () => {
    try {
      const isAvailable = PrintCompensationPresetService.checkAvailability();
      if (!isAvailable) {
        setIsStorageWarningShown(true);
      }
      const loaded = await PrintCompensationPresetService.getPresets();
      setPresets(loaded);

      // Cek apakah ada preset terakhir yang digunakan
      const last = await PrintCompensationPresetService.getLastUsedPreset();
      if (last) {
        setLastUsedPreset(last);
      }
    } catch (err: any) {
      console.warn('Gagal memuat preset:', err);
      setIsStorageWarningShown(true);
    }
  }, []);

  useEffect(() => {
    loadPresetsFromStorage();
  }, [loadPresetsFromStorage]);

  // Deteksi status apakah pengaturan saat ini telah dimodifikasi (Modified) dari preset aktif
  const isModifiedFromActivePreset = (() => {
    if (!activePreset || !activePresetOriginalSettings) return false;
    return (
      settings.enabled !== activePresetOriginalSettings.enabled ||
      settings.printerProfile !== activePresetOriginalSettings.printerProfile ||
      settings.paperProfile !== activePresetOriginalSettings.paperProfile ||
      settings.neutralBias !== activePresetOriginalSettings.neutralBias ||
      settings.blueBias !== activePresetOriginalSettings.blueBias ||
      settings.yellowBias !== activePresetOriginalSettings.yellowBias ||
      settings.redBias !== activePresetOriginalSettings.redBias ||
      settings.greenBias !== activePresetOriginalSettings.greenBias ||
      settings.printBrightness !== activePresetOriginalSettings.printBrightness ||
      settings.highlightRecovery !== activePresetOriginalSettings.highlightRecovery ||
      settings.whitePoint !== activePresetOriginalSettings.whitePoint ||
      settings.whiteGarmentDetail !== activePresetOriginalSettings.whiteGarmentDetail
    );
  })();

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...settings,
      enabled,
    });
    if (enabled && onSelectPreviewTarget) {
      onSelectPreviewTarget('print');
    }
  };

  const handlePrinterProfile = (profile: PrinterProfile) => {
    if (!settings.enabled) return;
    onChange({
      ...settings,
      printerProfile: profile,
    });
  };

  const handlePaperProfile = (profile: PaperProfile) => {
    if (!settings.enabled) return;
    onChange({
      ...settings,
      paperProfile: profile,
    });
  };

  const handleResetSliders = () => {
    onChange({
      ...settings,
      neutralBias: 0,
      blueBias: 0,
      yellowBias: 0,
      redBias: 0,
      greenBias: 0,
      printBrightness: 0,
      highlightRecovery: 0,
      whitePoint: 0,
      whiteGarmentDetail: 0,
    });
  };

  const handleBiasChange = (
    key: 'blueBias' | 'yellowBias' | 'redBias' | 'greenBias',
    val: number
  ) => {
    const clamped = Math.max(-100, Math.min(100, Math.round(val)));
    onChange({
      ...settings,
      [key]: clamped,
    });
    if (onSelectPreviewTarget && activePreviewTarget !== 'print') {
      onSelectPreviewTarget('print');
    }
  };

  const handleTonalControlChange = (
    key: 'printBrightness' | 'highlightRecovery' | 'whitePoint' | 'whiteGarmentDetail',
    val: number
  ) => {
    onChange({
      ...settings,
      [key]: val,
    });
    if (onSelectPreviewTarget && activePreviewTarget !== 'print') {
      onSelectPreviewTarget('print');
    }
  };

  // 1. GUNAKAN PRESET
  const handleApplyPreset = (preset: PrintCompensationPreset) => {
    // Terapkan seluruh parameter konfigurasi preset ke state KOMPENSASI CETAK
    onChange({
      ...preset.settings,
    });

    // Simpan referensi preset aktif
    setActivePreset(preset);
    setActivePresetOriginalSettings({ ...preset.settings });

    // Simpan ke storage bahwa preset ini terakhir digunakan
    PrintCompensationPresetService.setLastUsedPresetId(preset.id);
    setLastUsedPreset(preset);

    // Langsung arahkan ke PRINT PREVIEW agar hasil perubahan kompensasi langsung terlihat
    if (onSelectPreviewTarget) {
      onSelectPreviewTarget('print');
    }

    setToastMessage({
      type: 'success',
      text: `Preset "${preset.name}" berhasil diterapkan ke Kompensasi Cetak.`,
    });

    setIsLibraryOpen(false);
  };

  // 2. SIMPAN PRESET BARU
  const handleOpenSaveDialog = () => {
    // Saran nama otomatis berdasarkan profil saat ini
    const printerLabel = settings.printerProfile === 'epson_l1210' ? 'Epson L1210' : 'Generic';
    const paperLabel =
      settings.paperProfile === 'matte'
        ? 'Matte'
        : settings.paperProfile === 'glossy'
        ? 'Glossy'
        : settings.paperProfile === 'silky_luster'
        ? 'Luster'
        : 'Plain';

    setPresetNameInput(`${printerLabel} - ${paperLabel}`);
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSavePreset = async () => {
    const name = presetNameInput.trim();
    if (!name) {
      setToastMessage({ type: 'error', text: 'Nama pengaturan wajib diisi.' });
      return;
    }

    try {
      const saved = await PrintCompensationPresetService.savePreset(name, settings);
      setActivePreset(saved);
      setActivePresetOriginalSettings({ ...saved.settings });
      setLastUsedPreset(saved);
      await loadPresetsFromStorage();
      setIsSaveDialogOpen(false);
      setToastMessage({
        type: 'success',
        text: `Preset "${name}" berhasil disimpan ke penyimpanan lokal.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan preset.',
      });
    }
  };

  // 3. PERBARUI PRESET
  const handleRequestUpdate = (preset: PrintCompensationPreset) => {
    if (preset.isSystem) {
      setToastMessage({
        type: 'error',
        text: 'Preset sistem bawaan tidak dapat diubah.',
      });
      return;
    }
    setUpdateConfirmPreset(preset);
  };

  const handleConfirmUpdate = async () => {
    if (!updateConfirmPreset) return;
    try {
      const updated = await PrintCompensationPresetService.updatePreset(
        updateConfirmPreset.id,
        settings
      );
      if (activePreset?.id === updated.id) {
        setActivePreset(updated);
        setActivePresetOriginalSettings({ ...updated.settings });
      }
      await loadPresetsFromStorage();
      setUpdateConfirmPreset(null);
      setToastMessage({
        type: 'success',
        text: `Preset "${updated.name}" berhasil diperbarui dengan nilai saat ini.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Gagal memperbarui preset.',
      });
    }
  };

  // 4. HAPUS PRESET
  const handleRequestDelete = (preset: PrintCompensationPreset) => {
    if (preset.isSystem) {
      setToastMessage({
        type: 'error',
        text: 'Preset sistem bawaan tidak dapat dihapus.',
      });
      return;
    }
    setDeleteConfirmPreset(preset);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPreset) return;
    try {
      await PrintCompensationPresetService.deletePreset(deleteConfirmPreset.id);
      if (activePreset?.id === deleteConfirmPreset.id) {
        setActivePreset(null);
        setActivePresetOriginalSettings(null);
      }
      if (lastUsedPreset?.id === deleteConfirmPreset.id) {
        setLastUsedPreset(null);
      }
      await loadPresetsFromStorage();
      setDeleteConfirmPreset(null);
      setToastMessage({
        type: 'info',
        text: `Preset "${deleteConfirmPreset.name}" telah dihapus.`,
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Gagal menghapus preset.',
      });
    }
  };

  // 5. EKSPOR PRESET (JSON)
  const handleExportPreset = (preset: PrintCompensationPreset) => {
    try {
      PrintCompensationPresetService.exportPreset(preset);
      setToastMessage({
        type: 'success',
        text: `Konfigurasi preset "${preset.name}" berhasil diekspor sebagai JSON.`,
      });
    } catch {
      setToastMessage({
        type: 'error',
        text: 'Gagal mengekspor file preset.',
      });
    }
  };

  // 6. IMPOR PRESET (JSON)
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileImported = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('Preset tidak valid atau file rusak.');
        }

        const importedPreset = await PrintCompensationPresetService.importPreset(text);
        await loadPresetsFromStorage();
        setToastMessage({
          type: 'success',
          text: `Preset "${importedPreset.name}" berhasil diimpor! Klik [ GUNAKAN ] untuk menerapkannya.`,
        });
      } catch (err: any) {
        setToastMessage({
          type: 'error',
          text: err.message || 'Preset tidak valid atau file rusak.',
        });
      }
    };
    reader.onerror = () => {
      setToastMessage({
        type: 'error',
        text: 'Preset tidak valid atau file rusak.',
      });
    };
    reader.readAsText(file);
  };

  const isAnySliderModified =
    settings.neutralBias !== 0 ||
    settings.blueBias !== 0 ||
    settings.yellowBias !== 0 ||
    settings.redBias !== 0 ||
    settings.greenBias !== 0 ||
    settings.printBrightness !== 0 ||
    settings.highlightRecovery !== 0 ||
    settings.whitePoint !== 0 ||
    settings.whiteGarmentDetail !== 0;

  // Helper text untuk badge profil
  const getPrinterLabel = (p: PrinterProfile) => (p === 'epson_l1210' ? 'Epson L1210' : 'Generic');
  const getPaperLabel = (p: PaperProfile) => {
    switch (p) {
      case 'matte':
        return 'Matte Photo Paper';
      case 'glossy':
        return 'Glossy Photo Paper';
      case 'silky_luster':
        return 'Silky / Luster';
      case 'plain':
        return 'Plain Paper (HVS)';
      default:
        return p;
    }
  };

  const formatBiasValue = (val: number) =>
    val > 0 ? `+${val}` : val < 0 ? `−${Math.abs(val)}` : '0';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm space-y-6 relative">
      {/* Hidden File Input for Preset Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileImported}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-lg transition-all animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-slate-950 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Storage Warning (jika IndexedDB tidak tersedia pada private browsing/sandbox) */}
      {isStorageWarningShown && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Penyimpanan pengaturan lokal tidak tersedia. Pengaturan tetap dapat digunakan untuk sesi ini.
          </div>
        </div>
      )}

      {/* Auto Load: Notifikasi Preset Terakhir Digunakan (Jika belum aktif) */}
      {lastUsedPreset && activePreset?.id !== lastUsedPreset.id && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-300">Preset terakhir digunakan: </span>
              <strong className="text-amber-300">{lastUsedPreset.name}</strong>
              <span className="text-slate-400 text-[11px] ml-1.5 hidden md:inline">
                ({getPrinterLabel(lastUsedPreset.settings.printerProfile)} • {getPaperLabel(lastUsedPreset.settings.paperProfile)})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyPreset(lastUsedPreset)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              [ GUNAKAN ]
            </button>
            <button
              type="button"
              onClick={() => setLastUsedPreset(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md text-xs cursor-pointer"
              title="Abaikan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-wide">KOMPENSASI CETAK</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/20">
                TRUE GRAYSCALE EXTENSION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Antisipasi pergeseran warna (color cast) akibat karakteristik printer, tinta, dan kertas tanpa merusak Master Grayscale netral.
            </p>
          </div>
        </div>

        {/* Action Buttons: [ SIMPAN PENGATURAN ] & [ PENGATURAN TERSIMPAN ] */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {isBatchMode && onApplyCompensationToAllBatch && (
            <button
              type="button"
              onClick={onApplyCompensationToAllBatch}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="Terapkan kompensasi cetak ini ke semua foto dalam batch"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              [ TERAPKAN KE SEMUA BATCH ]
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenSaveDialog}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            [ SIMPAN PENGATURAN ]
          </button>

          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <FolderHeart className="w-3.5 h-3.5 text-amber-400" />
            [ PENGATURAN TERSIMPAN ]
          </button>
        </div>
      </div>

      {/* Preset Aktif Indicator Bar */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">Preset Aktif:</span>
          {activePreset ? (
            <span className="font-bold text-white px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono">
              {activePreset.name}
            </span>
          ) : (
            <span className="italic text-slate-500">Kustom / Belum memilih preset</span>
          )}

          {/* Indikator "● Modified" jika nilai diubah setelah preset digunakan */}
          {activePreset && isModifiedFromActivePreset && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/30 font-semibold font-mono text-[11px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              ● Modified (Perubahan belum disimpan)
            </span>
          )}
        </div>

        {/* Quick Update Button jika preset aktif diubah */}
        {activePreset && !activePreset.isSystem && isModifiedFromActivePreset && (
          <button
            type="button"
            onClick={() => handleRequestUpdate(activePreset)}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Edit2 className="w-3 h-3" />
            [ PERBARUI PRESET ]
          </button>
        )}
      </div>

      {/* Toggle Main Switch */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-200">
            Status Kompensasi Cetak
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {settings.enabled
              ? 'Aktif — Kompensasi diterapkan hanya pada PRINT VERSION. Master Grayscale tetap 100% netral.'
              : 'Nonaktif (Default) — Output cetak menggunakan Master Grayscale netral murni (R = G = B). Kontrol di bawah dinonaktifkan.'}
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !settings.enabled
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            [ OFF ]
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              settings.enabled
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            [ ON ]
          </button>
        </div>
      </div>

      {/* OFF State Explanatory Banner jika status = OFF */}
      {!settings.enabled && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-300 block">
              Kompensasi Cetak Dalam Keadaan Nonaktif (OFF)
            </span>
            <p className="leading-relaxed">
              Output cetak dan layar preview saat ini menggunakan <strong>True Grayscale Netral Murni (R = G = B)</strong>.
              Semua kontrol slider dan tombol [ − ] / [ + ] di bawah berstatus <em>disabled</em>.
              Klik toggle <strong>[ ON ]</strong> di atas atau muat salah satu preset tersimpan untuk mengaktifkan Fine Compensation.
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Body */}
      <div className="space-y-6 pt-1">
        {/* Quick Preview Switcher Banner (Aktif saat ON) */}
        {settings.enabled && onSelectPreviewTarget && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-200">
                Lihat simulasi langsung di layar live preview:{' '}
                <strong className="text-white">
                  {activePreviewTarget === 'print' ? 'PRINT PREVIEW AKTIF' : 'MASTER NETRAL AKTIF'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectPreviewTarget('master')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all cursor-pointer ${
                  activePreviewTarget === 'master'
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                MASTER
              </button>
              <button
                type="button"
                onClick={() => onSelectPreviewTarget('print')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer ${
                  activePreviewTarget === 'print'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                PRINT PREVIEW
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Profil Printer & Profil Kertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* PRINTER PROFILE */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Printer Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={() => handlePrinterProfile('generic')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  !settings.enabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                    : settings.printerProfile === 'generic'
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 cursor-pointer'
                }`}
              >
                <div className="text-xs font-bold">[ Generic ]</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Profil Netral Standar Umum
                </div>
              </button>

              <button
                type="button"
                disabled={!settings.enabled}
                onClick={() => handlePrinterProfile('epson_l1210')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  !settings.enabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                    : settings.printerProfile === 'epson_l1210'
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 cursor-pointer'
                }`}
              >
                <div className="text-xs font-bold">[ Epson L1210 ]</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  EcoTank 4-Color Dye Ink Calibrated
                </div>
              </button>
            </div>
          </div>

          {/* PAPER PROFILE */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Paper Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'glossy', label: 'Glossy Photo Paper', sub: 'Mengkilap Halus' },
                { id: 'matte', label: 'Matte Photo Paper', sub: 'Kertas Doff / Tidak Kilap' },
                { id: 'silky_luster', label: 'Silky / Luster', sub: 'Tekstur Kulit Jeruk' },
                { id: 'plain', label: 'Plain Paper / HVS', sub: 'Kertas Biasa HVS' },
              ].map((paper) => (
                <button
                  key={paper.id}
                  type="button"
                  disabled={!settings.enabled}
                  onClick={() => handlePaperProfile(paper.id as PaperProfile)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    !settings.enabled
                      ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                      : settings.paperProfile === paper.id
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="text-xs font-semibold">{paper.label}</div>
                  <div className="text-[10px] text-slate-500">{paper.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: NEUTRAL BIAS (Cool / Blue <---> Warm / Yellow) */}
        <div
          className={`bg-slate-950/60 border rounded-xl p-5 space-y-3 transition-colors ${
            !settings.enabled ? 'border-slate-900 opacity-60' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Neutral Bias
              </span>
              <span className="text-[11px] text-slate-400 ml-2">
                (Keseimbangan Suhu Cetak)
              </span>
            </div>
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                settings.neutralBias !== 0 && settings.enabled
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.neutralBias === 0
                ? 'Netral (0)'
                : settings.neutralBias > 0
                ? `+${settings.neutralBias} (Warm / Yellow)`
                : `${settings.neutralBias} (Cool / Blue)`}
            </span>
          </div>

          {/* Slider track with Cool / Warm labels */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1 font-mono">
              <span className="text-sky-400 flex items-center gap-1">
                ← Cool / Blue
              </span>
              <span className="text-slate-500">Netral (0)</span>
              <span className="text-amber-400 flex items-center gap-1">
                Warm / Yellow →
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              disabled={!settings.enabled}
              value={settings.neutralBias}
              onChange={(e) => {
                onChange({
                  ...settings,
                  neutralBias: parseInt(e.target.value, 10),
                });
                if (onSelectPreviewTarget && activePreviewTarget !== 'print') {
                  onSelectPreviewTarget('print');
                }
              }}
              className="w-full h-2.5 bg-gradient-to-r from-sky-500/40 via-slate-700 to-amber-500/40 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 accent-amber-400"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Gunakan jika printer Anda menghasilkan cetakan B&W yang tampak agak kekuningan (geser ke Cool) atau terlalu kebiruan (geser ke Warm).
          </p>
        </div>

        {/* Section 3: KONTROL SILAU & DETAIL PUTIH (PRINT HIGHLIGHT & WHITE DETAIL) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  KONTROL SILAU &amp; DETAIL PUTIH
                </span>
                <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                  (Print Highlight &amp; White Detail)
                </span>
              </div>
            </div>

            {(settings.printBrightness !== 0 ||
              settings.highlightRecovery !== 0 ||
              settings.whitePoint !== 0 ||
              settings.whiteGarmentDetail !== 0) && (
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={() => {
                  onChange({
                    ...settings,
                    printBrightness: 0,
                    highlightRecovery: 0,
                    whitePoint: 0,
                    whiteGarmentDetail: 0,
                  });
                }}
                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset hanya kontrol silau dan detail putih"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Silau
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Optimasi khusus output cetak untuk mencegah kerudung, kemeja, atau pakaian putih terlihat terlalu silau dan kehilangan tekstur pada kertas foto. Diterapkan 100% secara non-generatif hanya pada <strong>Print Version</strong>. Master Grayscale tetap netral murni.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Print Brightness */}
            <TonalControlRow
              label="Print Brightness"
              sublabel="Kecerahan Cetak"
              description="Mengatur kecerahan khusus output cetak tanpa mengubah Master Grayscale netral."
              value={settings.printBrightness}
              min={-50}
              max={50}
              disabled={!settings.enabled}
              accent="amber"
              onChange={(val) => handleTonalControlChange('printBrightness', val)}
            />

            {/* 2. Highlight Recovery */}
            <TonalControlRow
              label="Highlight Recovery"
              sublabel="Peredam Silau"
              description="Mengurangi kesan silau dan memulihkan detail tonal pada area terang di atas nilai 170."
              value={settings.highlightRecovery}
              min={0}
              max={100}
              disabled={!settings.enabled}
              accent="cyan"
              onChange={(val) => handleTonalControlChange('highlightRecovery', val)}
            />

            {/* 3. White Point / Whites */}
            <TonalControlRow
              label="White Point / Whites"
              sublabel="Plafon Putih Cetak"
              description="Mengontrol intensitas putih maksimal kertas agar tidak meledak atau bleached out saat diserap tinta."
              value={settings.whitePoint}
              min={-50}
              max={50}
              disabled={!settings.enabled}
              accent="sky"
              onChange={(val) => handleTonalControlChange('whitePoint', val)}
            />

            {/* 4. White Garment Detail */}
            <TonalControlRow
              label="White Garment Detail"
              sublabel="Tekstur Kain & Kerudung Putih"
              description="Mempertegas serat kain kerudung dan pakaian putih tanpa mengubah warna menjadi abu-abu kotor."
              value={settings.whiteGarmentDetail}
              min={0}
              max={100}
              disabled={!settings.enabled}
              accent="emerald"
              onChange={(val) => handleTonalControlChange('whiteGarmentDetail', val)}
            />
          </div>
        </div>

        {/* Section 4: FINE COMPENSATION (Koreksi Mikro Saluran Cetak) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                FINE COMPENSATION
              </span>
              <span className="text-[11px] text-slate-400 ml-2">
                (Koreksi Mikro Saluran Cetak)
              </span>
            </div>

            {isAnySliderModified && (
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={handleResetSliders}
                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset ke Netral
              </button>
            )}
          </div>

          {/* Grid Tombol − / Slider / Tombol + untuk setiap parameter bias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Blue Bias */}
            <FineCompensationRow
              label="Blue Bias"
              sublabel="Saluran Biru"
              value={settings.blueBias}
              disabled={!settings.enabled}
              accent="sky"
              onChange={(val) => handleBiasChange('blueBias', val)}
            />

            {/* 2. Yellow Bias */}
            <FineCompensationRow
              label="Yellow Bias"
              sublabel="Saluran Kuning"
              value={settings.yellowBias}
              disabled={!settings.enabled}
              accent="amber"
              onChange={(val) => handleBiasChange('yellowBias', val)}
            />

            {/* 3. Red Bias */}
            <FineCompensationRow
              label="Red Bias"
              sublabel="Saluran Merah"
              value={settings.redBias}
              disabled={!settings.enabled}
              accent="rose"
              onChange={(val) => handleBiasChange('redBias', val)}
            />

            {/* 4. Green Bias */}
            <FineCompensationRow
              label="Green Bias"
              sublabel="Saluran Hijau"
              value={settings.greenBias}
              disabled={!settings.enabled}
              accent="emerald"
              onChange={(val) => handleBiasChange('greenBias', val)}
            />
          </div>
        </div>

        {/* Principle & Quality Guarantee Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4" />
            <span>GARANSI INTEGRITAS TONAL MASTER & PRINT</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400">
            <li>
              <strong>Master Grayscale Tetap Netral:</strong> File master tetap murni <span className="font-mono text-slate-300">R = G = B</span> tanpa color cast untuk arsip digital dan verifikasi ijazah.
            </li>
            <li>
              <strong>Kompensasi Sangat Kecil & Konservatif:</strong> Pergeseran warna dibatasi secara ketat sehingga tidak menghasilkan foto berwarna (hanya kompensasi micro-cast).
            </li>
            <li>
              <strong>Tonal Terkunci:</strong> Pergeseran luminansi dinormalisasi nol, menjaga Exposure, Contrast, Shadows, dan Whites 100% konsisten.
            </li>
            <li>
              <strong>Area Cetak Menyeluruh:</strong> Kompensasi diterapkan merata ke seluruh kanvas Print Version.
            </li>
            <li>
              <strong>Privasi Lokal Tersimpan:</strong> Preset disimpan secara eksklusif di memori lokal (IndexedDB) browser Anda tanpa koneksi luar.
            </li>
          </ul>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: SIMPAN PENGATURAN (SAVE PRESET DIALOG)           */}
      {/* ======================================================== */}
      {isSaveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-base text-white">Simpan Pengaturan</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveDialogOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Nama Pengaturan:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Contoh: Epson L1210 - Matte"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmSavePreset();
                  } else if (e.key === 'Escape') {
                    setIsSaveDialogOpen(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
              />
              <p className="text-[11px] text-slate-400">
                Contoh: &ldquo;Epson L1210 - Matte&rdquo;, &ldquo;Epson L1210 - Glossy&rdquo;, &ldquo;Epson L1210 - Foto B&W&rdquo;
              </p>
            </div>

            {/* Ringkasan Konfigurasi yang akan disimpan */}
            <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 text-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Parameter yang Disimpan:
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className={settings.enabled ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {settings.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Printer: </span>
                  <span className="text-slate-200">{getPrinterLabel(settings.printerProfile)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Kertas: </span>
                  <span className="text-slate-200">{getPaperLabel(settings.paperProfile)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Neutral Bias: </span>
                  <span className="text-amber-300 font-semibold">{formatBiasValue(settings.neutralBias)}</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-800/80 font-mono text-[10px] text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                <span>Brightness: <strong className="text-amber-300">{formatBiasValue(settings.printBrightness)}</strong></span>
                <span>Highlight Rec: <strong className="text-cyan-300">{settings.highlightRecovery}</strong></span>
                <span>White Point: <strong className="text-sky-300">{formatBiasValue(settings.whitePoint)}</strong></span>
                <span>Garment: <strong className="text-emerald-300">{settings.whiteGarmentDetail}</strong></span>
              </div>
              <div className="pt-1.5 border-t border-slate-800/80 font-mono text-[10px] text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                <span>Blue: <strong className="text-sky-300">{formatBiasValue(settings.blueBias)}</strong></span>
                <span>Yellow: <strong className="text-amber-300">{formatBiasValue(settings.yellowBias)}</strong></span>
                <span>Red: <strong className="text-rose-300">{formatBiasValue(settings.redBias)}</strong></span>
                <span>Green: <strong className="text-emerald-300">{formatBiasValue(settings.greenBias)}</strong></span>
              </div>
            </div>

            {/* Dialog Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveDialogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                [ BATAL ]
              </button>
              <button
                type="button"
                onClick={handleConfirmSavePreset}
                disabled={!presetNameInput.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold tracking-wide cursor-pointer transition-all shadow-md shadow-amber-500/20"
              >
                [ SIMPAN ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DAFTAR PENGATURAN TERSIMPAN (LIBRARY)           */}
      {/* ======================================================== */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-slate-200">
            {/* Library Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <FolderHeart className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-base text-white tracking-wide">
                    PENGATURAN TERSIMPAN
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Penyimpanan preset lokal perangkat (IndexedDB). Data tersimpan permanen di browser ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerImport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Impor file konfigurasi preset JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  [ IMPOR PRESET ]
                </button>
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg"
                  title="Tutup dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Library Preset List */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {presets.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Belum ada pengaturan tersimpan.
                </div>
              ) : (
                presets.map((preset) => {
                  const isCurrentActive = activePreset?.id === preset.id;
                  const isSystem = Boolean(preset.isSystem);

                  return (
                    <div
                      key={preset.id}
                      className={`border rounded-xl p-4 transition-all ${
                        isCurrentActive
                          ? 'bg-amber-500/10 border-amber-400/60 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm text-white">{preset.name}</h5>
                          {isCurrentActive && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              AKTIF
                            </span>
                          )}
                          {isSystem && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Sistem
                            </span>
                          )}
                        </div>

                        {/* Ekspor Preset Action */}
                        <button
                          type="button"
                          onClick={() => handleExportPreset(preset)}
                          className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer py-1"
                          title="Unduh konfigurasi sebagai file JSON"
                        >
                          <Download className="w-3 h-3" />
                          [ EKSPOR PRESET ]
                        </button>
                      </div>

                      {/* Detail Konfigurasi Card */}
                      <div className="py-2.5 space-y-1 text-xs">
                        <div className="text-slate-300 font-medium">
                          {getPrinterLabel(preset.settings.printerProfile)} •{' '}
                          {getPaperLabel(preset.settings.paperProfile)}
                          <span className="text-slate-500 text-[11px] ml-2">
                            (Status: {preset.settings.enabled ? 'ON' : 'OFF'})
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-amber-300/90">
                          Neutral Bias: {formatBiasValue(preset.settings.neutralBias)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-300 flex flex-wrap gap-x-2.5 gap-y-0.5">
                          <span>Brightness: <strong className="text-amber-300">{formatBiasValue(preset.settings.printBrightness || 0)}</strong></span>
                          <span>•</span>
                          <span>Highlight Rec: <strong className="text-cyan-300">{preset.settings.highlightRecovery || 0}</strong></span>
                          <span>•</span>
                          <span>White Point: <strong className="text-sky-300">{formatBiasValue(preset.settings.whitePoint || 0)}</strong></span>
                          <span>•</span>
                          <span>Garment: <strong className="text-emerald-300">{preset.settings.whiteGarmentDetail || 0}</strong></span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 flex flex-wrap gap-x-2.5 gap-y-0.5">
                          <span>Blue: <strong className="text-sky-300">{formatBiasValue(preset.settings.blueBias)}</strong></span>
                          <span>•</span>
                          <span>Yellow: <strong className="text-amber-300">{formatBiasValue(preset.settings.yellowBias)}</strong></span>
                          <span>•</span>
                          <span>Red: <strong className="text-rose-300">{formatBiasValue(preset.settings.redBias)}</strong></span>
                          <span>•</span>
                          <span>Green: <strong className="text-emerald-300">{formatBiasValue(preset.settings.greenBias)}</strong></span>
                        </div>
                      </div>

                      {/* Card Action Buttons: [ GUNAKAN ] [ PERBARUI ] [ HAPUS ] */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          [ GUNAKAN ]
                        </button>

                        {!isSystem && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRequestUpdate(preset)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                              title="Perbarui preset ini dengan nilai slider saat ini"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              [ PERBARUI ]
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRequestDelete(preset)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700/60 hover:border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors ml-auto flex items-center gap-1"
                              title="Hapus preset ini dari penyimpanan lokal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              [ HAPUS ]
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Library Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                {presets.length} preset tersedia (Termasuk bawaan)
              </span>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                [ TUTUP ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: KONFIRMASI PERBARUI PRESET                      */}
      {/* ======================================================== */}
      {updateConfirmPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">Konfirmasi Perbarui</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Perbarui pengaturan preset <strong>&ldquo;{updateConfirmPreset.name}&rdquo;</strong> dengan nilai yang sedang aktif saat ini?
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Neutral Bias: <span className="text-amber-300">{formatBiasValue(settings.neutralBias)}</span></div>
              <div>Blue: {formatBiasValue(settings.blueBias)} • Yellow: {formatBiasValue(settings.yellowBias)}</div>
              <div>Red: {formatBiasValue(settings.redBias)} • Green: {formatBiasValue(settings.greenBias)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUpdateConfirmPreset(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                [ BATAL ]
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-colors"
              >
                [ YA, PERBARUI ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: KONFIRMASI HAPUS PRESET                         */}
      {/* ======================================================== */}
      {deleteConfirmPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">Konfirmasi Hapus</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus preset <strong>&ldquo;{deleteConfirmPreset.name}&rdquo;</strong>?
              <br />
              <span className="text-slate-400 text-[11px] block mt-1">
                Preset akan dihapus dari daftar lokal browser Anda.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmPreset(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                [ BATAL ]
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                [ HAPUS ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
