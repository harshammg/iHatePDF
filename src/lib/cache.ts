import type { PDFDocumentProxy } from "pdfjs-dist";

type CacheKey = string;
type CanvasCache = {
  dataUrl: string;
  width: number;
  height: number;
  scale: number;
  timestamp: number;
};

class CacheManager {
  private pdfCache: Map<CacheKey, PDFDocumentProxy> = new Map();
  private canvasCache: Map<CacheKey, CanvasCache> = new Map();
  private currentFileHash: string | null = null;

  // Generate a simple hash for the file bytes
  private generateHash(bytes: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      const char = bytes[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // Set the current file hash and clear old caches
  setFile(bytes: Uint8Array) {
    const newHash = this.generateHash(bytes);
    if (this.currentFileHash !== newHash) {
      this.clear();
      this.currentFileHash = newHash;
    }
  }

  // Cache PDF document proxy (in-memory only, as it's not serializable)
  cachePdf(key: string, doc: PDFDocumentProxy) {
    this.pdfCache.set(key, doc);
  }

  // Get cached PDF document proxy
  getPdf(key: string): PDFDocumentProxy | null {
    return this.pdfCache.get(key) || null;
  }

  // Cache rendered canvas (persisted in sessionStorage)
  cacheCanvas(key: string, canvas: HTMLCanvasElement, scale: number) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const cache: CanvasCache = {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      scale,
      timestamp: Date.now(),
    };
    this.canvasCache.set(key, cache);
    
    // Also persist to sessionStorage for refresh persistence
    try {
      const cacheKey = `pdf-canvas-${key}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (e) {
      // SessionStorage might be full, just keep in memory
      console.warn("SessionStorage full, using in-memory cache only");
    }
  }

  // Get cached canvas
  getCanvas(key: string): CanvasCache | null {
    // Check memory cache first
    const memoryCache = this.canvasCache.get(key);
    if (memoryCache) {
      return memoryCache;
    }

    // Check sessionStorage
    try {
      const cacheKey = `pdf-canvas-${key}`;
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const cache: CanvasCache = JSON.parse(stored);
        this.canvasCache.set(key, cache); // Restore to memory cache
        return cache;
      }
    } catch (e) {
      console.warn("Failed to read from sessionStorage");
    }

    return null;
  }

  // Create a canvas from cached data URL
  async createCanvasFromCache(cache: CanvasCache): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = cache.width;
        canvas.height = cache.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = cache.dataUrl;
    });
  }

  // Clear all caches
  clear() {
    this.pdfCache.clear();
    this.canvasCache.clear();
    
    // Clear sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith("pdf-canvas-")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Failed to clear sessionStorage");
    }
  }

  // Get cache stats for debugging
  getStats() {
    return {
      pdfCacheSize: this.pdfCache.size,
      canvasCacheSize: this.canvasCache.size,
      sessionStorageSize: Object.keys(sessionStorage).filter(k => k.startsWith("pdf-canvas-")).length,
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Helper to generate cache keys
export function generatePdfKey(bytes: Uint8Array): string {
  return `pdf-${cacheManager["generateHash"](bytes)}`;
}

export function generateCanvasKey(pdfKey: string, pageIndex: number, scale: number): string {
  return `${pdfKey}-page-${pageIndex}-scale-${scale}`;
}
