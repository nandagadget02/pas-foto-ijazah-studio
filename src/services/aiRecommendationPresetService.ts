import {
  AdjustmentParams,
  AIRecommendationPreset,
  ExportedAIPresetFile,
  PhotoAnalysisResult,
  TargetTone,
} from '../types/analysis';

const DB_NAME = 'PasFotoIjazahDB';
const DB_VERSION = 2;
const STORE_NAME = 'ai_recommendation_presets';
const LOCAL_STORAGE_PREFIX = 'pas_foto_ai_preset_';
const LOCAL_STORAGE_INDEX = 'pas_foto_ai_presets_list';
const LAST_USED_KEY = 'pas_foto_last_used_ai_preset_id';

/**
 * Built-in System Presets (Standar Studio Ijazah)
 * Read-only & protected from deletion.
 */
export const SYSTEM_AI_PRESETS: AIRecommendationPreset[] = [
  {
    id: 'system_preset_natural',
    name: 'Pas Foto Ijazah — Natural (Standar)',
    source: 'local',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    schemaVersion: 1,
    isSystem: true,
    targetTone: 'natural',
    summary: 'Koreksi tonal natural seimbang standar ijazah resmi tanpa saturasi berlebih.',
    notes: 'Preset acuan standar kelulusan dan ijazah kedinasan.',
    parameters: {
      exposureEV: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 5,
      whites: 0,
      blacks: 0,
      sharpening: 8,
      noiseProtection: 10,
      faceDetail: 10,
      eyeDetail: 12,
      hairDetail: 8,
      skinProtection: 12,
      saturation: 0,
      temperature: 0,
      tint: 0,
      satRed: 0,
      satYellow: 0,
      satGreen: 0,
      satCyan: 0,
      satBlue: 0,
      satMagenta: 0,
    },
  },
  {
    id: 'system_preset_shadow_recovery',
    name: 'Pas Foto Ijazah — Shadow Recovery',
    source: 'gemini',
    createdAt: 1700000000001,
    updatedAt: 1700000000001,
    schemaVersion: 1,
    isSystem: true,
    targetTone: 'brighter',
    summary: 'Mengangkat bayangan gelap di area leher, rambut, dan jas tanpa overexposure pada wajah.',
    notes: 'Cocok untuk foto yang agak remang atau pencahayaan samping tajam.',
    parameters: {
      exposureEV: 0.15,
      brightness: 5,
      contrast: -4,
      highlights: -5,
      shadows: 14,
      whites: 2,
      blacks: 0,
      sharpening: 8,
      noiseProtection: 12,
      faceDetail: 12,
      eyeDetail: 14,
      hairDetail: 10,
      skinProtection: 14,
      saturation: 0,
      temperature: 0,
      tint: 0,
      satRed: 0,
      satYellow: 0,
      satGreen: 0,
      satCyan: 0,
      satBlue: 0,
      satMagenta: 0,
    },
  },
  {
    id: 'system_preset_soft_contrast',
    name: 'Pas Foto Ijazah — Kontras Lembut',
    source: 'local',
    createdAt: 1700000000002,
    updatedAt: 1700000000002,
    schemaVersion: 1,
    isSystem: true,
    targetTone: 'softer',
    summary: 'Meredam kontras tajam berlebih dan melembutkan tekstur kulit wajah.',
    notes: 'Cocok untuk kamera beresolusi tinggi dengan kontras lampu kilat terlalu keras.',
    parameters: {
      exposureEV: -0.05,
      brightness: -2,
      contrast: -8,
      highlights: -4,
      shadows: 6,
      whites: -2,
      blacks: 2,
      sharpening: 6,
      noiseProtection: 14,
      faceDetail: 8,
      eyeDetail: 10,
      hairDetail: 8,
      skinProtection: 16,
      saturation: 0,
      temperature: 0,
      tint: 0,
      satRed: 0,
      satYellow: 0,
      satGreen: 0,
      satCyan: 0,
      satBlue: 0,
      satMagenta: 0,
    },
  },
];

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  presets?: AIRecommendationPreset[];
  summary?: {
    totalInFile: number;
    toAdd: number;
    toUpdate: number;
    toSkip: number;
    invalid: number;
  };
}

/**
 * Service terpadu untuk menyimpan, memuat, mengekspor, dan memulihkan
 * preset rekomendasi Gemini AI & Analisis Lokal.
 */
export class AIRecommendationPresetService {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isIndexedDBAvailable: boolean | null = null;
  private static memoryFallback: Map<string, AIRecommendationPreset> = new Map();

  /**
   * Helper untuk pembatasan angka numerik secara aman
   */
  public static clamp(val: unknown, min: number, max: number, fallback: number): number {
    if (typeof val !== 'number' || isNaN(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Sanitasi parameter adjustment memastikan nilai valid sesuai batas pipeline
   */
  public static sanitizeParameters(raw?: Partial<AdjustmentParams>): AdjustmentParams {
    const p = raw || {};
    return {
      exposureEV: Number(this.clamp(p.exposureEV, -1.0, 1.0, 0).toFixed(2)),
      brightness: Math.round(this.clamp(p.brightness, -25, 25, 0)),
      contrast: Math.round(this.clamp(p.contrast, -25, 25, 0)),
      highlights: Math.round(this.clamp(p.highlights, -25, 25, 0)),
      shadows: Math.round(this.clamp(p.shadows, -25, 25, 0)),
      whites: Math.round(this.clamp(p.whites, -20, 20, 0)),
      blacks: Math.round(this.clamp(p.blacks, -20, 20, 0)),
      sharpening: Math.round(this.clamp(p.sharpening, 0, 20, 8)),
      noiseProtection: Math.round(this.clamp(p.noiseProtection, 0, 20, 10)),
      faceDetail: Math.round(this.clamp(p.faceDetail, 0, 25, 10)),
      eyeDetail: Math.round(this.clamp(p.eyeDetail, 0, 25, 12)),
      hairDetail: Math.round(this.clamp(p.hairDetail, 0, 25, 8)),
      skinProtection: Math.round(this.clamp(p.skinProtection, 0, 25, 12)),
      saturation: Math.round(this.clamp(p.saturation, -50, 50, 0)),
      temperature: Math.round(this.clamp(p.temperature, -25, 25, 0)),
      tint: Math.round(this.clamp(p.tint, -25, 25, 0)),
      satRed: Math.round(this.clamp(p.satRed, -100, 100, 0)),
      satYellow: Math.round(this.clamp(p.satYellow, -100, 100, 0)),
      satGreen: Math.round(this.clamp(p.satGreen, -100, 100, 0)),
      satCyan: Math.round(this.clamp(p.satCyan, -100, 100, 0)),
      satBlue: Math.round(this.clamp(p.satBlue, -100, 100, 0)),
      satMagenta: Math.round(this.clamp(p.satMagenta, -100, 100, 0)),
    };
  }

  /**
   * Cek ketersediaan IndexedDB
   */
  public static checkAvailability(): boolean {
    if (this.isIndexedDBAvailable !== null) {
      return this.isIndexedDBAvailable;
    }
    try {
      this.isIndexedDBAvailable =
        typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
    } catch {
      this.isIndexedDBAvailable = false;
    }
    return this.isIndexedDBAvailable;
  }

  /**
   * Membuka koneksi IndexedDB dengan aman
   */
  private static async openDB(): Promise<IDBDatabase> {
    if (!this.checkAvailability()) {
      throw new Error('IndexedDB tidak didukung pada browser ini');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('printer_compensation_presets')) {
            db.createObjectStore('printer_compensation_presets', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('Gagal membuka IndexedDB untuk AI Presets:', request.error);
          this.isIndexedDBAvailable = false;
          reject(request.error || new Error('Gagal membuka database IndexedDB'));
        };
      } catch (err) {
        this.isIndexedDBAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Simpan preset baru langsung dari hasil analisis foto
   */
  public static async saveFromAnalysis(
    name: string,
    result: PhotoAnalysisResult,
    notes?: string
  ): Promise<AIRecommendationPreset> {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      throw new Error('Nama preset tidak boleh kosong.');
    }

    const { subject, recommendation, analysisSource, usedModel } = result;

    const parameters: AdjustmentParams = this.sanitizeParameters({
      exposureEV: subject.exposureEV,
      brightness: subject.brightness,
      contrast: subject.contrast,
      highlights: subject.highlights,
      shadows: subject.shadows,
      whites: subject.whites,
      blacks: subject.blacks,
      sharpening: subject.sharpening,
      noiseProtection: subject.noiseProtection,
      faceDetail: subject.faceDetail ?? 10,
      eyeDetail: subject.eyeDetail ?? 12,
      hairDetail: subject.hairDetail ?? 8,
      skinProtection: subject.skinProtection ?? 12,
      temperature: recommendation?.temperature ?? 0,
      tint: recommendation?.tint ?? 0,
    });

    const sourceVal =
      analysisSource === 'gemini' || (result as any).analysisEngine === 'gemini'
        ? 'gemini'
        : 'local';

    return await this.savePreset({
      name: trimmedName,
      source: sourceVal,
      targetTone: recommendation?.targetTone || 'natural',
      parameters,
      summary: recommendation?.summary || `Preset hasil analisis ${sourceVal === 'gemini' ? 'Gemini AI' : 'Lokal'}`,
      notes: notes?.trim() || undefined,
      usedModel: usedModel,
    });
  }

  /**
   * Simpan preset ke IndexedDB dan sinkronkan ke localStorage
   */
  public static async savePreset(
    data: Omit<AIRecommendationPreset, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion' | 'isSystem'> & {
      id?: string;
    }
  ): Promise<AIRecommendationPreset> {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new Error('Nama preset tidak boleh kosong.');
    }

    const uniqueId =
      data.id && data.id.trim().length > 0
        ? data.id.trim()
        : `preset_ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newPreset: AIRecommendationPreset = {
      id: uniqueId,
      name: trimmedName,
      source: data.source || 'local',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 1,
      isSystem: false,
      targetTone: data.targetTone || 'natural',
      parameters: this.sanitizeParameters(data.parameters),
      summary: data.summary,
      notes: data.notes,
      usedModel: data.usedModel,
    };

    // 1. Simpan ke IndexedDB
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(newPreset);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Gagal menyimpan ke IndexedDB, beralih ke localStorage/memory:', err);
    }

    // 2. Dual-sync ke localStorage & Memory Fallback
    this.memoryFallback.set(newPreset.id, newPreset);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${newPreset.id}`, JSON.stringify(newPreset));
        this.syncLocalStorageIndex(newPreset.id, 'add');
      }
    } catch {
      // ignore storage quota error
    }

    this.setLastUsedPresetId(newPreset.id);
    return newPreset;
  }

  /**
   * Helper internal untuk mengelola index list di localStorage
   */
  private static syncLocalStorageIndex(id: string, action: 'add' | 'remove') {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(LOCAL_STORAGE_INDEX);
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      if (action === 'add') {
        if (!list.includes(id)) list.push(id);
      } else {
        list = list.filter((item) => item !== id);
      }
      localStorage.setItem(LOCAL_STORAGE_INDEX, JSON.stringify(list));
    } catch {
      // ignore error
    }
  }

  /**
   * Ambil semua preset tersimpan (System Presets + User Presets)
   */
  public static async getPresets(): Promise<AIRecommendationPreset[]> {
    let userPresets: AIRecommendationPreset[] = [];

    // 1. Coba baca dari IndexedDB
    try {
      const db = await this.openDB();
      userPresets = await new Promise<AIRecommendationPreset[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as AIRecommendationPreset[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // 2. Fallback baca dari Memory & localStorage
      const memoryItems = Array.from(this.memoryFallback.values());
      userPresets = [...memoryItems];

      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.id && !userPresets.some((p) => p.id === parsed.id)) {
                  userPresets.push(parsed);
                }
              }
            }
          }
        }
      } catch {
        // ignore error
      }
    }

    // Urutkan user presets berdasarkan updatedAt terbaru
    userPresets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Gabungkan dengan preset sistem default di baris pertama
    return [...SYSTEM_AI_PRESETS, ...userPresets];
  }

  /**
   * Cari preset berdasarkan ID
   */
  public static async getPresetById(id: string): Promise<AIRecommendationPreset | null> {
    if (!id) return null;

    // Cek preset sistem dulu
    const systemMatch = SYSTEM_AI_PRESETS.find((p) => p.id === id);
    if (systemMatch) return systemMatch;

    // Cek IndexedDB
    try {
      const db = await this.openDB();
      return await new Promise<AIRecommendationPreset | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as AIRecommendationPreset) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback memory & localStorage
      if (this.memoryFallback.has(id)) {
        return this.memoryFallback.get(id) || null;
      }
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
          if (raw) return JSON.parse(raw);
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Perbarui nama, catatan, atau parameter preset
   */
  public static async updatePreset(
    id: string,
    updates: {
      name?: string;
      notes?: string;
      parameters?: Partial<AdjustmentParams>;
      targetTone?: TargetTone;
    }
  ): Promise<AIRecommendationPreset> {
    const existing = await this.getPresetById(id);
    if (!existing) {
      throw new Error(`Preset dengan ID "${id}" tidak ditemukan.`);
    }

    if (existing.isSystem) {
      throw new Error('Preset sistem standar tidak dapat diubah.');
    }

    const updatedPreset: AIRecommendationPreset = {
      ...existing,
      name: updates.name ? updates.name.trim() : existing.name,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      targetTone: updates.targetTone || existing.targetTone,
      parameters: updates.parameters
        ? this.sanitizeParameters({ ...existing.parameters, ...updates.parameters })
        : existing.parameters,
      updatedAt: Date.now(),
    };

    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(updatedPreset);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }

    this.memoryFallback.set(updatedPreset.id, updatedPreset);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${updatedPreset.id}`, JSON.stringify(updatedPreset));
      }
    } catch {
      // ignore
    }

    return updatedPreset;
  }

  /**
   * Hapus preset kustom
   */
  public static async deletePreset(id: string): Promise<boolean> {
    const existing = await this.getPresetById(id);
    if (!existing) return false;

    if (existing.isSystem) {
      throw new Error('Preset sistem standar tidak dapat dihapus.');
    }

    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }

    this.memoryFallback.delete(id);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${id}`);
        this.syncLocalStorageIndex(id, 'remove');
      }
    } catch {
      // ignore
    }

    if (this.getLastUsedPresetId() === id) {
      this.clearLastUsedPresetId();
    }

    return true;
  }

  /**
   * Menghasilkan string JSON cadangan untuk preset terpilih atau seluruh preset
   */
  public static generateExportJSON(presetsToExport?: AIRecommendationPreset[]): string {
    const items = presetsToExport && presetsToExport.length > 0 ? presetsToExport : SYSTEM_AI_PRESETS;
    const now = new Date();

    const exportData: ExportedAIPresetFile = {
      format: 'PAS_FOTO_IJAZAH_AI_PRESETS',
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: now.toISOString(),
      presetCount: items.length,
      presets: items.map((p) => ({
        id: p.id,
        name: p.name,
        source: p.source,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        schemaVersion: p.schemaVersion || 1,
        targetTone: p.targetTone,
        parameters: { ...p.parameters },
        summary: p.summary,
        notes: p.notes,
        usedModel: p.usedModel,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Ekspor preset ke file JSON unduhan browser
   */
  public static exportPresets(presetsToExport?: AIRecommendationPreset[]): void {
    const items = presetsToExport && presetsToExport.length > 0 ? presetsToExport : SYSTEM_AI_PRESETS;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const jsonStr = this.generateExportJSON(items);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PAS_FOTO_IJAZAH_PRESETS_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Validasi struktur dan integritas file JSON yang akan diimpor
   */
  public static validateImport(
    parsed: any,
    existingPresets: AIRecommendationPreset[] = []
  ): ImportValidationResult {
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'File cadangan JSON tidak valid atau kosong.' };
    }

    let presetList: any[] = [];
    if (Array.isArray(parsed)) {
      presetList = parsed;
    } else if (parsed.presets && Array.isArray(parsed.presets)) {
      if (parsed.format && parsed.format !== 'PAS_FOTO_IJAZAH_AI_PRESETS') {
        return { valid: false, error: 'Format file tidak sesuai dengan Pas Foto Ijazah Studio.' };
      }
      presetList = parsed.presets;
    } else {
      return { valid: false, error: 'Struktur file JSON tidak memuat daftar preset yang valid.' };
    }

    if (presetList.length === 0) {
      return { valid: false, error: 'File tidak memuat satu pun data preset.' };
    }

    const validated: AIRecommendationPreset[] = [];
    let toAdd = 0;
    let toUpdate = 0;
    let toSkip = 0;
    let invalid = 0;

    for (const item of presetList) {
      if (!item || typeof item !== 'object' || !item.name) {
        invalid++;
        continue;
      }

      const id = String(item.id || `preset_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const name = String(item.name).trim();
      const params = this.sanitizeParameters(item.parameters);

      const presetObj: AIRecommendationPreset = {
        id,
        name,
        source: item.source === 'gemini' ? 'gemini' : 'local',
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
        schemaVersion: item.schemaVersion || 1,
        targetTone: item.targetTone === 'brighter' || item.targetTone === 'softer' ? item.targetTone : 'natural',
        parameters: params,
        summary: item.summary ? String(item.summary) : undefined,
        notes: item.notes ? String(item.notes) : undefined,
        usedModel: item.usedModel ? String(item.usedModel) : undefined,
      };

      validated.push(presetObj);

      // Cek konflik dengan preset yang ada
      const match = existingPresets.find((ep) => ep.id === presetObj.id || ep.name === presetObj.name);
      if (match) {
        const isIdentical = JSON.stringify(match.parameters) === JSON.stringify(presetObj.parameters);
        if (isIdentical) {
          toSkip++;
        } else {
          toUpdate++;
        }
      } else {
        toAdd++;
      }
    }

    if (validated.length === 0) {
      return { valid: false, error: 'Semua preset dalam file tidak valid atau rusak.' };
    }

    return {
      valid: true,
      presets: validated,
      summary: {
        totalInFile: presetList.length,
        toAdd,
        toUpdate,
        toSkip,
        invalid,
      },
    };
  }

  /**
   * Menerapkan hasil impor ke penyimpanan
   */
  public static async applyImport(
    presetsToImport: AIRecommendationPreset[],
    mode: 'add' | 'overwrite' | 'skip'
  ): Promise<{ added: number; updated: number; skipped: number }> {
    const existing = await this.getPresets();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of presetsToImport) {
      const match = existing.find((ep) => ep.id === item.id || ep.name === item.name);

      if (match) {
        if (mode === 'skip') {
          skipped++;
          continue;
        }

        if (mode === 'overwrite') {
          if (match.isSystem) {
            // Preset sistem tidak boleh ditimpa, buat sebagai salinan baru
            await this.savePreset({
              ...item,
              id: undefined,
              name: `${item.name} (Salinan)`,
            });
            added++;
          } else {
            await this.updatePreset(match.id, {
              name: item.name,
              notes: item.notes,
              parameters: item.parameters,
              targetTone: item.targetTone,
            });
            updated++;
          }
          continue;
        }

        if (mode === 'add') {
          // Buat dengan ID baru dan nama unik
          await this.savePreset({
            ...item,
            id: undefined,
            name: `${item.name} (Impor)`,
          });
          added++;
          continue;
        }
      } else {
        await this.savePreset(item);
        added++;
      }
    }

    return { added, updated, skipped };
  }

  /**
   * Helper Last Used Preset
   */
  public static getLastUsedPresetId(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LAST_USED_KEY);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static setLastUsedPresetId(id: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_USED_KEY, id);
      }
    } catch {
      // ignore
    }
  }

  public static clearLastUsedPresetId(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LAST_USED_KEY);
      }
    } catch {
      // ignore
    }
  }
}
