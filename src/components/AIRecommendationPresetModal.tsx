import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Bookmark,
  Sparkles,
  Zap,
  Download,
  Upload,
  Check,
  Trash2,
  Edit2,
  Copy,
  Layers,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Square,
  FileText,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  AdjustmentParams,
  AIRecommendationPreset,
  PhotoAnalysisResult,
  TargetTone,
} from '../types/analysis';
import {
  AIRecommendationPresetService,
  ImportValidationResult,
} from '../services/aiRecommendationPresetService';

interface AIRecommendationPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Foto aktif & Hasil analisis saat ini (untuk simpan preset)
  currentAnalysisResult?: PhotoAnalysisResult | null;
  currentAdjustments?: AdjustmentParams;
  // Aksi penerapan
  onApplyPresetToActive: (preset: AIRecommendationPreset) => void;
  onApplyPresetToAllBatch?: (preset: AIRecommendationPreset) => void;
  isBatchMode?: boolean;
  batchCount?: number;
  initialMode?: 'manage' | 'save';
}

export const AIRecommendationPresetModal: React.FC<AIRecommendationPresetModalProps> = ({
  isOpen,
  onClose,
  currentAnalysisResult,
  currentAdjustments,
  onApplyPresetToActive,
  onApplyPresetToAllBatch,
  isBatchMode = false,
  batchCount = 0,
  initialMode = 'manage',
}) => {
  const [presets, setPresets] = useState<AIRecommendationPreset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'manage' | 'save'>(initialMode);

  // Form Save State
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [presetNotesInput, setPresetNotesInput] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Selection for Selective Export
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);

  // Editing State
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState<string>('');

  // Import Dialog State
  const [importDialogData, setImportDialogData] = useState<ImportValidationResult | null>(null);
  const [importConflictMode, setImportConflictMode] = useState<'add' | 'overwrite' | 'skip'>('add');
  const [importError, setImportError] = useState<string | null>(null);

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load presets from service
  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const items = await AIRecommendationPresetService.getPresets();
      setPresets(items);
    } catch (err: any) {
      console.error('Gagal memuat preset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setActiveTab(initialMode);
      setSaveError(null);
      setImportError(null);
      setImportDialogData(null);
      setSelectedPresetIds([]);

      // Auto-suggest nama jika ada analisis
      if (currentAnalysisResult) {
        const sourceLabel = currentAnalysisResult.analysisSource === 'gemini' ? 'AI' : 'Lokal';
        const toneLabel =
          currentAnalysisResult.recommendation?.targetTone === 'brighter'
            ? 'Cerah'
            : currentAnalysisResult.recommendation?.targetTone === 'softer'
            ? 'Lembut'
            : 'Natural';
        setPresetNameInput(`Pas Foto Ijazah — ${toneLabel} (${sourceLabel})`);
        setPresetNotesInput(currentAnalysisResult.recommendation?.summary || '');
      } else {
        setPresetNameInput('');
        setPresetNotesInput('');
      }
    }
  }, [isOpen, initialMode, currentAnalysisResult]);

  if (!isOpen) return null;

  // --- SAVE PRESET HANDLER ---
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const trimmed = presetNameInput.trim();
    if (!trimmed) {
      setSaveError('Nama preset tidak boleh kosong.');
      return;
    }

    try {
      if (currentAnalysisResult) {
        await AIRecommendationPresetService.saveFromAnalysis(
          trimmed,
          currentAnalysisResult,
          presetNotesInput
        );
      } else if (currentAdjustments) {
        await AIRecommendationPresetService.savePreset({
          name: trimmed,
          source: 'local',
          targetTone: 'natural',
          parameters: currentAdjustments,
          notes: presetNotesInput,
          summary: 'Preset dari penyesuaian manual aktif',
        });
      } else {
        setSaveError('Tidak ada parameter atau hasil analisis yang dapat disimpan.');
        return;
      }

      showToast(`✓ Preset "${trimmed}" berhasil disimpan!`);
      await loadPresets();
      setActiveTab('manage');
      setPresetNameInput('');
      setPresetNotesInput('');
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan preset.');
    }
  };

  // --- APPLY PRESET TO ACTIVE PHOTO ---
  const handleApplyToActive = (preset: AIRecommendationPreset) => {
    onApplyPresetToActive(preset);
    showToast(`✓ Preset "${preset.name}" diterapkan ke foto aktif.`);
    onClose();
  };

  // --- APPLY PRESET TO ALL BATCH ---
  const handleApplyToBatch = (preset: AIRecommendationPreset) => {
    if (!onApplyPresetToAllBatch) return;
    const confirmed = window.confirm(
      `Terapkan parameter preset "${preset.name}" ke seluruh ${batchCount} foto dalam antrean batch?`
    );
    if (!confirmed) return;

    onApplyPresetToAllBatch(preset);
    showToast(`✓ Preset "${preset.name}" diterapkan ke seluruh ${batchCount} foto.`);
    onClose();
  };

  // --- DELETE PRESET ---
  const handleDeletePreset = async (preset: AIRecommendationPreset) => {
    if (preset.isSystem) return;
    const confirmed = window.confirm(`Hapus preset "${preset.name}" dari penyimpanan?`);
    if (!confirmed) return;

    try {
      await AIRecommendationPresetService.deletePreset(preset.id);
      showToast(`✓ Preset "${preset.name}" berhasil dihapus.`);
      await loadPresets();
      setSelectedPresetIds((prev) => prev.filter((id) => id !== preset.id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus preset.');
    }
  };

  // --- RENAME PRESET ---
  const handleStartRename = (preset: AIRecommendationPreset) => {
    if (preset.isSystem) return;
    setEditingPresetId(preset.id);
    setEditNameInput(preset.name);
  };

  const handleSaveRename = async (presetId: string) => {
    if (!editNameInput.trim()) return;
    try {
      await AIRecommendationPresetService.updatePreset(presetId, {
        name: editNameInput.trim(),
      });
      showToast('✓ Nama preset berhasil diperbarui.');
      setEditingPresetId(null);
      await loadPresets();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui nama preset.');
    }
  };

  // --- EXPORT HANDLERS ---
  const handleExportAll = () => {
    AIRecommendationPresetService.exportPresets(presets);
    showToast(`✓ Seluruh (${presets.length}) preset berhasil diekspor ke file JSON.`);
  };

  const handleExportSelected = () => {
    const selected = presets.filter((p) => selectedPresetIds.includes(p.id));
    if (selected.length === 0) return;
    AIRecommendationPresetService.exportPresets(selected);
    showToast(`✓ ${selected.length} preset terpilih berhasil diekspor ke file JSON.`);
  };

  // --- IMPORT FILE HANDLERS ---
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = AIRecommendationPresetService.validateImport(parsed, presets);

        if (!validation.valid || !validation.presets) {
          setImportError(validation.error || 'File JSON tidak valid.');
          setImportDialogData(null);
          return;
        }

        setImportError(null);
        setImportDialogData(validation);
      } catch (err: any) {
        setImportError(`File JSON rusak atau tidak dapat dibaca: ${err.message}`);
        setImportDialogData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importDialogData?.presets) return;

    try {
      const result = await AIRecommendationPresetService.applyImport(
        importDialogData.presets,
        importConflictMode
      );
      showToast(
        `✓ Impor selesai: ${result.added} ditambahkan, ${result.updated} diperbarui, ${result.skipped} dilewati.`
      );
      setImportDialogData(null);
      await loadPresets();
    } catch (err: any) {
      setImportError(`Gagal memulihkan preset: ${err.message}`);
    }
  };

  // --- SELECTION TOGGLE ---
  const toggleSelectPreset = (id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPresetIds.length === presets.length) {
      setSelectedPresetIds([]);
    } else {
      setSelectedPresetIds(presets.map((p) => p.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-start sm:items-center justify-between gap-4 bg-slate-950/50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Pustaka Studio
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {presets.length} Preset Tersedia
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400" />
              Preset Rekomendasi Foto (AI & Lokal)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simpan, gunakan kembali, ekspor cadangan, dan pulihkan parameter tanpa memanggil Gemini API berulang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP ACTION BAR: TABS & EXPORT/IMPORT BUTTONS */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Daftar Preset
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('save')}
              disabled={!currentAnalysisResult && !currentAdjustments}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'save'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : !currentAnalysisResult && !currentAdjustments
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white cursor-pointer'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Simpan Rekomendasi Aktif
            </button>
          </div>

          {/* Export & Import Tools */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleTriggerFileInput}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pulihkan preset dari file cadangan JSON"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Impor JSON</span>
            </button>

            {selectedPresetIds.length > 0 ? (
              <button
                type="button"
                onClick={handleExportSelected}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                title="Unduh file JSON untuk preset terpilih"
              >
                <Download className="w-3.5 h-3.5 fill-slate-950" />
                <span>Ekspor Terpilih ({selectedPresetIds.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportAll}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cadangkan seluruh preset ke file JSON"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Ekspor Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* DIALOG KONFIRMASI IMPOR (Jika file dipilih) */}
        {importDialogData && (
          <div className="m-4 p-4 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-xl flex flex-col gap-3 animate-in fade-in shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                Konfirmasi Pemulihan & Impor Preset JSON
              </span>
              <button
                type="button"
                onClick={() => setImportDialogData(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total File</span>
                <strong className="text-white font-mono text-sm">
                  {importDialogData.summary?.totalInFile}
                </strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">Preset Baru</span>
                <strong className="text-emerald-300 font-mono text-sm">
                  +{importDialogData.summary?.toAdd}
                </strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 block">Konflik / Cocok</span>
                <strong className="text-amber-300 font-mono text-sm">
                  {importDialogData.summary?.toUpdate}
                </strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Duplikat Sama</span>
                <strong className="text-slate-400 font-mono text-sm">
                  {importDialogData.summary?.toSkip}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Pilih Strategi Pencocokan / Penanganan Konflik:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setImportConflictMode('add')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    importConflictMode === 'add'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="block text-[11px]">1. Tambahkan Baru</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    Buat salinan unik jika nama sama
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportConflictMode('overwrite')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    importConflictMode === 'overwrite'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="block text-[11px]">2. Perbarui yang Cocok</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    Timpa data preset yang ID-nya sama
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportConflictMode('skip')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    importConflictMode === 'skip'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="block text-[11px]">3. Lewati Duplikat</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    Abaikan preset yang sudah ada
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteImport}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              Konfirmasi & Pulihkan Preset Sekarang
            </button>
          </div>
        )}

        {/* ERROR BANNER */}
        {importError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0">
            <span>{importError}</span>
            <button
              type="button"
              onClick={() => setImportError(null)}
              className="text-rose-400 font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: FORM SIMPAN PRESET BARU */}
          {activeTab === 'save' && (
            <form onSubmit={handleSavePreset} className="space-y-4 max-w-xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  Simpan Parameter Rekomendasi Aktif Sebagai Preset
                </span>
                <p className="text-[11px] text-slate-400">
                  Preset ini akan tersimpan permanen di perangkat Anda dan dapat diterapkan ke foto lain kapan saja tanpa memerlukan analisis Gemini AI.
                </p>

                {saveError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                    {saveError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="preset-name-input" className="text-xs font-semibold text-slate-300">
                    Nama Preset: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="preset-name-input"
                    type="text"
                    required
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    placeholder="Contoh: Pas Foto Ijazah — Natural (Kedinasan)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="preset-notes-input" className="text-xs font-semibold text-slate-300">
                    Catatan Analisis / Keterangan (Opsional):
                  </label>
                  <textarea
                    id="preset-notes-input"
                    rows={2}
                    value={presetNotesInput}
                    onChange={(e) => setPresetNotesInput(e.target.value)}
                    placeholder="Catatan karakteristik pencahayaan atau subjek..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Pratinjau Nilai Parameter yang Disimpan */}
                <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  <span className="block text-slate-300 font-bold mb-1 font-sans">
                    Parameter yang Disertakan:
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span>Exposure: {currentAnalysisResult?.subject.exposureEV ?? currentAdjustments?.exposureEV ?? 0} EV</span>
                    <span>Contrast: {currentAnalysisResult?.subject.contrast ?? currentAdjustments?.contrast ?? 0}</span>
                    <span>Shadows: {currentAnalysisResult?.subject.shadows ?? currentAdjustments?.shadows ?? 0}</span>
                    <span>Sharpening: {currentAnalysisResult?.subject.sharpening ?? currentAdjustments?.sharpening ?? 8}</span>
                    <span>Eye Detail: +{currentAnalysisResult?.subject.eyeDetail ?? currentAdjustments?.eyeDetail ?? 10}</span>
                    <span>Skin Protection: +{currentAnalysisResult?.subject.skinProtection ?? currentAdjustments?.skinProtection ?? 12}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    Simpan Preset Sekarang
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: DAFTAR & MANAJEMEN PRESET */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              {/* Selective Export Selector Header */}
              {presets.length > 0 && (
                <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  >
                    {selectedPresetIds.length === presets.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Pilih Semua Preset ({presets.length})</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Klik kartu untuk melihat rincian & menerapkan
                  </span>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Memuat daftar preset...
                </div>
              ) : presets.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Belum ada preset yang tersimpan.</p>
                  <p className="text-[11px] text-slate-500">
                    Jalankan analisis foto dan klik &quot;Simpan sebagai Preset&quot; untuk menyimpan rekomendasi.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {presets.map((preset) => {
                    const isSelected = selectedPresetIds.includes(preset.id);
                    const isEditing = editingPresetId === preset.id;

                    return (
                      <div
                        key={preset.id}
                        className={`p-4 rounded-xl border transition-all ${
                          preset.isSystem
                            ? 'bg-slate-950/60 border-slate-800'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        } ${isSelected ? 'ring-1 ring-amber-400 border-amber-400/50' : ''}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Checkbox for selective export */}
                            <button
                              type="button"
                              onClick={() => toggleSelectPreset(preset.id)}
                              className="mt-0.5 text-slate-500 hover:text-amber-400 cursor-pointer"
                              title="Pilih untuk ekspor JSON"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              {/* Header & Badges */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEditing ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editNameInput}
                                      onChange={(e) => setEditNameInput(e.target.value)}
                                      className="px-2 py-1 rounded bg-slate-900 border border-amber-400 text-white text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRename(preset.id)}
                                      className="px-2 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPresetId(null)}
                                      className="text-slate-400 text-xs"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-white truncate">
                                    {preset.name}
                                  </span>
                                )}

                                {preset.isSystem ? (
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Standar Studio
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                                    Kustom
                                  </span>
                                )}

                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                                  {preset.source === 'gemini' ? (
                                    <>
                                      <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Gemini AI
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-2.5 h-2.5 text-amber-400" /> Lokal
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Summary or notes */}
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                {preset.summary || preset.notes || 'Parameter tonal studio siap pakai.'}
                              </p>

                              {/* Parameter Chips */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] font-mono text-slate-400">
                                <span>
                                  Exp: <strong className="text-amber-400">{preset.parameters.exposureEV > 0 ? `+${preset.parameters.exposureEV}` : preset.parameters.exposureEV} EV</strong>
                                </span>
                                <span>
                                  Contrast: <strong className="text-slate-200">{preset.parameters.contrast > 0 ? `+${preset.parameters.contrast}` : preset.parameters.contrast}</strong>
                                </span>
                                <span>
                                  Shadows: <strong className="text-emerald-400">+{preset.parameters.shadows}</strong>
                                </span>
                                <span>
                                  Sharpening: <strong className="text-cyan-400">{preset.parameters.sharpening}</strong>
                                </span>
                                <span>
                                  Eye Detail: <strong className="text-cyan-300">+{preset.parameters.eyeDetail}</strong>
                                </span>
                                <span>
                                  Skin: <strong className="text-emerald-400">+{preset.parameters.skinProtection}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for this Preset */}
                          <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                            {/* Primary: Terapkan ke Foto Aktif */}
                            <button
                              type="button"
                              onClick={() => handleApplyToActive(preset)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Terapkan preset ini ke foto aktif"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Terapkan ke Foto Aktif
                            </button>

                            {/* Batch apply option (if batch mode active) */}
                            {isBatchMode && onApplyPresetToAllBatch && batchCount > 1 && (
                              <button
                                type="button"
                                onClick={() => handleApplyToBatch(preset)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title={`Terapkan parameter preset ke seluruh ${batchCount} foto`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Terapkan ke Semua ({batchCount})
                              </button>
                            )}

                            {/* Edit / Delete for custom presets */}
                            {!preset.isSystem && (
                              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartRename(preset)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Ubah nama preset"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePreset(preset)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Hapus preset ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Penyimpanan Lokal Aktif (IndexedDB & Dual-Sync)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
