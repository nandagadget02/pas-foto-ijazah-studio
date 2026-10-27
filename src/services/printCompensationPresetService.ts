import {
  DEFAULT_PRINTER_COMPENSATION,
  PaperProfile,
  PrintCompensationPreset,
  PrinterCompensationSettings,
  PrinterProfile,
} from '../types/analysis';

const DB_NAME = 'PasFotoIjazahDB';
const DB_VERSION = 1;
const STORE_NAME = 'printer_compensation_presets';
const LAST_USED_KEY = 'pas_foto_last_used_printer_preset_id';

/**
 * Built-in System Preset: "Neutral / Default"
 * Read-only, cannot be deleted by user.
 */
export const SYSTEM_DEFAULT_PRESET: PrintCompensationPreset = {
  id: 'system_neutral_default',
  name: 'Neutral / Default',
  version: 1,
  createdAt: 0,
  updatedAt: 0,
  isSystem: true,
  settings: {
    ...DEFAULT_PRINTER_COMPENSATION,
  },
};

/**
 * Service untuk mengelola preset Kompensasi Cetak secara lokal (IndexedDB)
 * dengan isolasi total dari server dan Gemini API (Local-Only Privacy).
 */
export class PrintCompensationPresetService {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isIndexedDBAvailable: boolean | null = null;
  private static memoryFallback: Map<string, PrintCompensationPreset> = new Map();

  /**
   * Cek ketersediaan IndexedDB di lingkungan browser saat ini
   */
  public static checkAvailability(): boolean {
    if (this.isIndexedDBAvailable !== null) {
      return this.isIndexedDBAvailable;
    }
    try {
      this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
    } catch {
      this.isIndexedDBAvailable = false;
    }
    return this.isIndexedDBAvailable;
  }

  /**
   * Buka koneksi IndexedDB dengan aman
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
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('Gagal membuka IndexedDB:', request.error);
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
   * Simpan preset baru ke IndexedDB
   */
  public static async savePreset(
    name: string,
    settings: PrinterCompensationSettings
  ): Promise<PrintCompensationPreset> {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      throw new Error('Nama preset tidak boleh kosong.');
    }

    const newPreset: PrintCompensationPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: trimmedName,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isSystem: false,
      settings: {
        enabled: Boolean(settings.enabled),
        printerProfile: settings.printerProfile,
        paperProfile: settings.paperProfile,
        neutralBias: Math.max(-100, Math.min(100, Math.round(settings.neutralBias || 0))),
        blueBias: Math.max(-100, Math.min(100, Math.round(settings.blueBias || 0))),
        yellowBias: Math.max(-100, Math.min(100, Math.round(settings.yellowBias || 0))),
        redBias: Math.max(-100, Math.min(100, Math.round(settings.redBias || 0))),
        greenBias: Math.max(-100, Math.min(100, Math.round(settings.greenBias || 0))),
        printBrightness: Math.max(-50, Math.min(50, Math.round(settings.printBrightness || 0))),
        highlightRecovery: Math.max(0, Math.min(100, Math.round(settings.highlightRecovery || 0))),
        whitePoint: Math.max(-50, Math.min(50, Math.round(settings.whitePoint || 0))),
        whiteGarmentDetail: Math.max(0, Math.min(100, Math.round(settings.whiteGarmentDetail || 0))),
      },
    };

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
      console.warn('Gagal menyimpan ke IndexedDB, menggunakan memori/localStorage fallback:', err);
      this.memoryFallback.set(newPreset.id, newPreset);
      try {
        localStorage.setItem(`preset_${newPreset.id}`, JSON.stringify(newPreset));
      } catch {
        // ignore storage quota error
      }
    }

    // Set sebagai preset terakhir yang digunakan
    this.setLastUsedPresetId(newPreset.id);

    return newPreset;
  }

  /**
   * Ambil semua preset tersimpan (termasuk preset sistem "Neutral / Default")
   */
  public static async getPresets(): Promise<PrintCompensationPreset[]> {
    let userPresets: PrintCompensationPreset[] = [];

    try {
      const db = await this.openDB();
      userPresets = await new Promise<PrintCompensationPreset[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as PrintCompensationPreset[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Gagal membaca dari IndexedDB, membaca fallback:', err);
      // Baca dari memory fallback & localStorage
      const mapPresets = Array.from(this.memoryFallback.values());
      userPresets = [...mapPresets];

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('preset_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && parsed.id && !userPresets.some((p) => p.id === parsed.id)) {
                userPresets.push(parsed);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // Urutkan user presets berdasarkan waktu modifikasi terbaru
    userPresets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Selalu sertakan preset sistem di urutan pertama
    return [SYSTEM_DEFAULT_PRESET, ...userPresets];
  }

  /**
   * Ambil preset berdasarkan ID
   */
  public static async getPresetById(id: string): Promise<PrintCompensationPreset | null> {
    if (id === SYSTEM_DEFAULT_PRESET.id) {
      return SYSTEM_DEFAULT_PRESET;
    }

    try {
      const db = await this.openDB();
      return await new Promise<PrintCompensationPreset | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as PrintCompensationPreset) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      if (this.memoryFallback.has(id)) {
        return this.memoryFallback.get(id) || null;
      }
      try {
        const raw = localStorage.getItem(`preset_${id}`);
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore
      }
      return null;
    }
  }

  /**
   * Perbarui preset yang sudah ada
   */
  public static async updatePreset(
    id: string,
    settings: PrinterCompensationSettings,
    newName?: string
  ): Promise<PrintCompensationPreset> {
    if (id === SYSTEM_DEFAULT_PRESET.id) {
      throw new Error('Preset sistem "Neutral / Default" tidak dapat diubah.');
    }

    const existing = await this.getPresetById(id);
    if (!existing) {
      throw new Error(`Preset dengan ID "${id}" tidak ditemukan.`);
    }

    const updatedPreset: PrintCompensationPreset = {
      ...existing,
      name: newName && newName.trim() ? newName.trim() : existing.name,
      updatedAt: Date.now(),
      settings: {
        enabled: Boolean(settings.enabled),
        printerProfile: settings.printerProfile,
        paperProfile: settings.paperProfile,
        neutralBias: Math.max(-100, Math.min(100, Math.round(settings.neutralBias || 0))),
        blueBias: Math.max(-100, Math.min(100, Math.round(settings.blueBias || 0))),
        yellowBias: Math.max(-100, Math.min(100, Math.round(settings.yellowBias || 0))),
        redBias: Math.max(-100, Math.min(100, Math.round(settings.redBias || 0))),
        greenBias: Math.max(-100, Math.min(100, Math.round(settings.greenBias || 0))),
        printBrightness: Math.max(-50, Math.min(50, Math.round(settings.printBrightness || 0))),
        highlightRecovery: Math.max(0, Math.min(100, Math.round(settings.highlightRecovery || 0))),
        whitePoint: Math.max(-50, Math.min(50, Math.round(settings.whitePoint || 0))),
        whiteGarmentDetail: Math.max(0, Math.min(100, Math.round(settings.whiteGarmentDetail || 0))),
      },
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
      this.memoryFallback.set(updatedPreset.id, updatedPreset);
      try {
        localStorage.setItem(`preset_${updatedPreset.id}`, JSON.stringify(updatedPreset));
      } catch {
        // ignore
      }
    }

    return updatedPreset;
  }

  /**
   * Hapus preset berdasarkan ID
   */
  public static async deletePreset(id: string): Promise<boolean> {
    if (id === SYSTEM_DEFAULT_PRESET.id) {
      throw new Error('Preset sistem "Neutral / Default" tidak dapat dihapus.');
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
      this.memoryFallback.delete(id);
      try {
        localStorage.removeItem(`preset_${id}`);
      } catch {
        // ignore
      }
    }

    // Jika preset yang dihapus adalah preset terakhir yang digunakan, reset
    if (this.getLastUsedPresetId() === id) {
      try {
        localStorage.removeItem(LAST_USED_KEY);
      } catch {
        // ignore
      }
    }

    return true;
  }

  /**
   * Ekspor konfigurasi preset ke file JSON lokal
   */
  public static exportPreset(preset: PrintCompensationPreset): void {
    const exportData = {
      name: preset.name,
      version: 1,
      printerProfile: preset.settings.printerProfile,
      paperProfile: preset.settings.paperProfile,
      enabled: preset.settings.enabled,
      neutralBias: preset.settings.neutralBias,
      blueBias: preset.settings.blueBias,
      yellowBias: preset.settings.yellowBias,
      redBias: preset.settings.redBias,
      greenBias: preset.settings.greenBias,
      printBrightness: preset.settings.printBrightness ?? 0,
      highlightRecovery: preset.settings.highlightRecovery ?? 0,
      whitePoint: preset.settings.whitePoint ?? 0,
      whiteGarmentDetail: preset.settings.whiteGarmentDetail ?? 0,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeSlug = preset.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const fileName = `pas-foto-kompensasi-${safeSlug || 'preset'}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Normalisasi dan validasi data preset
   */
  public static validatePreset(data: any): {
    valid: boolean;
    error?: string;
    normalized?: {
      name: string;
      version: number;
      settings: PrinterCompensationSettings;
    };
  } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Preset tidak valid atau file rusak.' };
    }

    // Validasi nama
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      return { valid: false, error: 'Nama preset tidak valid atau kosong.' };
    }

    // Validasi versi
    const version = typeof data.version === 'number' ? data.version : 1;
    if (version < 1) {
      return { valid: false, error: 'Versi konfigurasi preset tidak didukung.' };
    }

    // Ekstrak properti (mendukung format flat dari prompt maupun nested { settings })
    const sourceSettings = data.settings && typeof data.settings === 'object' ? data.settings : data;

    // Normalisasi printer profile
    let printerProfile: PrinterProfile = 'generic';
    const rawPrinter = String(sourceSettings.printerProfile || '').toLowerCase();
    if (rawPrinter === 'epson_l1210' || rawPrinter === 'epson-l1210' || rawPrinter.includes('epson')) {
      printerProfile = 'epson_l1210';
    } else if (rawPrinter === 'generic') {
      printerProfile = 'generic';
    } else if (rawPrinter) {
      // jika ada nilai lain yang tidak dikenali
      return { valid: false, error: 'Printer profile tidak dikenali.' };
    }

    // Normalisasi paper profile
    let paperProfile: PaperProfile = 'glossy';
    const rawPaper = String(sourceSettings.paperProfile || '').toLowerCase();
    if (rawPaper === 'matte' || rawPaper === 'matte-photo-paper' || rawPaper.includes('matte')) {
      paperProfile = 'matte';
    } else if (
      rawPaper === 'silky_luster' ||
      rawPaper === 'silky-luster' ||
      rawPaper === 'luster' ||
      rawPaper === 'silky'
    ) {
      paperProfile = 'silky_luster';
    } else if (
      rawPaper === 'plain' ||
      rawPaper === 'plain-paper' ||
      rawPaper === 'hvs' ||
      rawPaper.includes('plain')
    ) {
      paperProfile = 'plain';
    } else if (rawPaper === 'glossy' || rawPaper === 'glossy-photo-paper' || rawPaper.includes('glossy')) {
      paperProfile = 'glossy';
    } else if (rawPaper) {
      return { valid: false, error: 'Paper profile tidak dikenali.' };
    }

    // Validasi status enabled
    const enabled = typeof sourceSettings.enabled === 'boolean' ? sourceSettings.enabled : true;

    // Validasi range bias (-100 sampai +100)
    const validateBias = (val: any, label: string): number => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error(`Nilai ${label} harus berupa angka numerik.`);
      }
      if (num < -100 || num > 100) {
        throw new Error(`Nilai ${label} harus berada dalam rentang -100 hingga +100.`);
      }
      return Math.round(num);
    };

    let neutralBias = 0;
    let blueBias = 0;
    let yellowBias = 0;
    let redBias = 0;
    let greenBias = 0;
    let printBrightness = 0;
    let highlightRecovery = 0;
    let whitePoint = 0;
    let whiteGarmentDetail = 0;

    try {
      neutralBias = validateBias(sourceSettings.neutralBias ?? 0, 'Neutral Bias');
      blueBias = validateBias(sourceSettings.blueBias ?? 0, 'Blue Bias');
      yellowBias = validateBias(sourceSettings.yellowBias ?? 0, 'Yellow Bias');
      redBias = validateBias(sourceSettings.redBias ?? 0, 'Red Bias');
      greenBias = validateBias(sourceSettings.greenBias ?? 0, 'Green Bias');

      printBrightness = Math.max(-50, Math.min(50, Number(sourceSettings.printBrightness ?? 0) || 0));
      highlightRecovery = Math.max(0, Math.min(100, Number(sourceSettings.highlightRecovery ?? 0) || 0));
      whitePoint = Math.max(-50, Math.min(50, Number(sourceSettings.whitePoint ?? 0) || 0));
      whiteGarmentDetail = Math.max(0, Math.min(100, Number(sourceSettings.whiteGarmentDetail ?? 0) || 0));
    } catch (err: any) {
      return { valid: false, error: err.message || 'Preset tidak valid atau file rusak.' };
    }

    return {
      valid: true,
      normalized: {
        name,
        version,
        settings: {
          enabled,
          printerProfile,
          paperProfile,
          neutralBias,
          blueBias,
          yellowBias,
          redBias,
          greenBias,
          printBrightness,
          highlightRecovery,
          whitePoint,
          whiteGarmentDetail,
        },
      },
    };
  }

  /**
   * Impor preset dari JSON string
   */
  public static async importPreset(jsonString: string): Promise<PrintCompensationPreset> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Preset tidak valid atau file rusak.');
    }

    const validation = this.validatePreset(parsed);
    if (!validation.valid || !validation.normalized) {
      throw new Error(validation.error || 'Preset tidak valid atau file rusak.');
    }

    const { name, settings } = validation.normalized;
    return await this.savePreset(name, settings);
  }

  /**
   * Dapatkan ID preset terakhir yang digunakan
   */
  public static getLastUsedPresetId(): string | null {
    try {
      return localStorage.getItem(LAST_USED_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Simpan ID preset terakhir yang digunakan
   */
  public static setLastUsedPresetId(id: string): void {
    try {
      localStorage.setItem(LAST_USED_KEY, id);
    } catch {
      // ignore
    }
  }

  /**
   * Ambil objek preset terakhir yang digunakan
   */
  public static async getLastUsedPreset(): Promise<PrintCompensationPreset | null> {
    const lastId = this.getLastUsedPresetId();
    if (!lastId) return null;
    return await this.getPresetById(lastId);
  }
}
