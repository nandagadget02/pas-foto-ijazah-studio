/**
 * PhotoRoom Background Removal Service
 * Integrasi resmi PhotoRoom API (Sandbox & Production) untuk segmentasi subjek pas foto ijazah.
 */

export interface PhotoRoomResult {
  ok: boolean;
  transparentImage?: HTMLImageElement;
  mask?: Float32Array;
  width?: number;
  height?: number;
  error?: string;
  isSandbox?: boolean;
}

export class PhotoRoomService {
  private static STORAGE_KEY = 'pasfoto_photoroom_api_key';

  /**
   * Mengambil API Key PhotoRoom dari localStorage
   */
  public static getApiKey(): string {
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  /**
   * Menyimpan API Key PhotoRoom ke localStorage
   */
  public static setApiKey(key: string): void {
    if (!key || key.trim().length === 0) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, key.trim());
    }
  }

  /**
   * Menghapus API Key PhotoRoom
   */
  public static clearApiKey(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Menguji validitas Kunci API PhotoRoom
   */
  public static async testApiKey(apiKey: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { ok: false, error: 'API Key PhotoRoom tidak boleh kosong.' };
    }

    try {
      // Buat canvas 10x10 dummy sederhana untuk testing endpoint segment
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 10, 10);
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        return { ok: false, error: 'Gagal membuat payload pengujian.' };
      }

      const formData = new FormData();
      formData.append('image_file', blob, 'test.png');

      const response = await fetch('https://sdk.photoroom.com/v1/segment', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
        },
        body: formData,
      });

      if (response.ok) {
        const isSandbox = apiKey.trim().toLowerCase().startsWith('sandbox_');
        return {
          ok: true,
          message: isSandbox
            ? 'Koneksi PhotoRoom API Berhasil! (Mode Sandbox Gratis)'
            : 'Koneksi PhotoRoom API Berhasil! (Mode Production)',
        };
      }

      let errorDetail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.message) errorDetail = errJson.message;
        else if (errJson?.error) errorDetail = errJson.error;
      } catch (_) {}

      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: 'API Key PhotoRoom tidak valid atau tidak memiliki akses (HTTP 401/403).' };
      } else if (response.status === 402) {
        return { ok: false, error: 'Batas kuota PhotoRoom API telah tercapai (Payment Required / Quota Exceeded).' };
      }

      return { ok: false, error: `Gagal verifikasi PhotoRoom API: ${errorDetail}` };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Tidak dapat terhubung ke server PhotoRoom API. Periksa koneksi internet Anda.',
      };
    }
  }

  /**
   * Menghapus background gambar menggunakan PhotoRoom API
   * Mengembalikan gambar transparan dan alpha mask Float32Array berukuran sama
   */
  public static async removeBackground(
    imageSource: HTMLImageElement | HTMLCanvasElement,
    apiKey?: string
  ): Promise<PhotoRoomResult> {
    const key = (apiKey && apiKey.trim().length > 0) ? apiKey.trim() : this.getApiKey();
    if (!key) {
      return {
        ok: false,
        error: 'API Key PhotoRoom belum diatur. Silakan masukkan Kunci API terlebih dahulu.',
      };
    }

    try {
      // 1. Konversi source ke Blob PNG/JPEG
      let canvas: HTMLCanvasElement;
      if (imageSource instanceof HTMLCanvasElement) {
        canvas = imageSource;
      } else {
        canvas = document.createElement('canvas');
        canvas.width = imageSource.naturalWidth || imageSource.width;
        canvas.height = imageSource.naturalHeight || imageSource.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { ok: false, error: 'Gagal membuat canvas komputasi.' };
        ctx.drawImage(imageSource, 0, 0);
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) {
        return { ok: false, error: 'Gagal memproses gambar sumber.' };
      }

      const formData = new FormData();
      formData.append('image_file', blob, 'photo.jpg');

      // 2. Request ke PhotoRoom API
      const response = await fetch('https://sdk.photoroom.com/v1/segment', {
        method: 'POST',
        headers: {
          'x-api-key': key,
        },
        body: formData,
      });

      if (!response.ok) {
        let errDesc = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.message) errDesc = errData.message;
        } catch (_) {}

        if (response.status === 401 || response.status === 403) {
          return { ok: false, error: 'Kunci API PhotoRoom tidak valid atau kadaluarsa.' };
        } else if (response.status === 402) {
          return { ok: false, error: 'Batas kuota bulanan PhotoRoom API Anda telah habis.' };
        } else if (response.status === 429) {
          return { ok: false, error: 'Terlalu banyak permintaan ke PhotoRoom API. Harap tunggu beberapa saat.' };
        }
        return { ok: false, error: `PhotoRoom API Error: ${errDesc}` };
      }

      // 3. Terima output PNG transparan
      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      const transImage = new Image();
      await new Promise<void>((resolve, reject) => {
        transImage.onload = () => resolve();
        transImage.onerror = () => reject(new Error('Gagal memuat hasil gambar transparan dari PhotoRoom.'));
        transImage.src = resultUrl;
      });

      const width = transImage.naturalWidth || transImage.width;
      const height = transImage.naturalHeight || transImage.height;

      // 4. Ekstrak Alpha Mask (0.0 s/d 1.0) dari gambar PNG hasil PhotoRoom
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) {
        return { ok: true, transparentImage: transImage, width, height };
      }

      maskCtx.drawImage(transImage, 0, 0);
      const imgData = maskCtx.getImageData(0, 0, width, height);
      const alphaArray = new Float32Array(width * height);

      for (let i = 0; i < alphaArray.length; i++) {
        // Pixel format RGBA, alpha ada di indeks i * 4 + 3
        alphaArray[i] = imgData.data[i * 4 + 3] / 255.0;
      }

      const isSandbox = key.toLowerCase().startsWith('sandbox_');

      return {
        ok: true,
        transparentImage: transImage,
        mask: alphaArray,
        width,
        height,
        isSandbox,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Terjadi kesalahan saat memproses gambar dengan PhotoRoom API.',
      };
    }
  }
}
