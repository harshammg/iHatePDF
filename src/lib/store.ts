import { create } from "zustand";
import { cacheManager } from "./cache";
import { storeState, retrieveState, storeFileBytes, retrieveFileBytes, clearAllPersistedData } from "./state-persistence";

export type ExportFormat = "pdf" | "jpg" | "png" | "svg" | "flutter";

export type CropRect = { x: number; y: number; w: number; h: number } | null;

export type PdfPage = {
  index: number;       // original 0-based index in source pdf
  id: string;          // stable id (so reorder works)
  width: number;       // points
  height: number;      // points
  thumbnail: string;   // dataURL
  selected: boolean;
  removed: boolean;
};

type State = {
  fileName: string | null;
  fileBytes: Uint8Array | null;
  pages: PdfPage[];
  activeId: string | null;
  crop: CropRect;
  applyCropToAll: boolean;
  rotation: number;
  format: ExportFormat;
  jpgQuality: number;
  imageDpi: 72 | 150 | 300;
  pdfCompression: "low" | "medium" | "high";
  flutterWidget: "PdfPageView" | "CustomPainter";
  loading: boolean;
  loadingMessage: string;
  progress: number;
  error: string | null;
  setFile: (name: string, bytes: Uint8Array) => void;
  setPages: (pages: PdfPage[]) => void;
  setActive: (id: string | null) => void;
  toggleSelect: (id: string, opts?: { range?: boolean; only?: boolean }) => void;
  selectAll: (val: boolean) => void;
  removePage: (id: string) => void;
  reorder: (fromId: string, toId: string) => void;
  setCrop: (c: CropRect) => void;
  setApplyCropAll: (v: boolean) => void;
  setRotation: (deg: number) => void;
  setFormat: (f: ExportFormat) => void;
  patch: (p: Partial<State>) => void;
  reset: () => void;
  restoreState: () => Promise<void>;
};

const initial = {
  fileName: null,
  fileBytes: null,
  pages: [],
  activeId: null,
  crop: null,
  applyCropToAll: false,
  rotation: 0,
  format: "pdf" as ExportFormat,
  jpgQuality: 85,
  imageDpi: 150 as const,
  pdfCompression: "medium" as const,
  flutterWidget: "PdfPageView" as const,
  loading: false,
  loadingMessage: "",
  progress: 0,
  error: null,
};

let lastAnchor: string | null = null;

export const useStore = create<State>((set, get) => ({
  ...initial,
  setFile: async (name, bytes) => {
    cacheManager.setFile(bytes);
    await storeFileBytes(name, bytes);
    set({ fileName: name, fileBytes: bytes });
    storeState(get());
  },
  setPages: (pages) => {
    set({ pages, activeId: pages[0]?.id ?? null });
    storeState(get());
  },
  setActive: (id) => {
    set({ activeId: id });
    storeState(get());
  },
  toggleSelect: (id, opts) => {
    const { pages } = get();
    if (opts?.range && lastAnchor) {
      const a = pages.findIndex((p) => p.id === lastAnchor);
      const b = pages.findIndex((p) => p.id === id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const target = !pages[b].selected;
        set({
          pages: pages.map((p, i) =>
            i >= lo && i <= hi && !p.removed ? { ...p, selected: target } : p,
          ),
        });
        storeState(get());
        return;
      }
    }
    if (opts?.only) {
      set({
        pages: pages.map((p) => ({ ...p, selected: p.id === id && !p.removed })),
      });
    } else {
      set({
        pages: pages.map((p) =>
          p.id === id && !p.removed ? { ...p, selected: !p.selected } : p,
        ),
      });
    }
    lastAnchor = id;
    storeState(get());
  },
  selectAll: (val) => {
    set({
      pages: get().pages.map((p) => (p.removed ? p : { ...p, selected: val })),
    });
    storeState(get());
  },
  removePage: (id) => {
    set({
      pages: get().pages.map((p) =>
        p.id === id ? { ...p, removed: true, selected: false } : p,
      ),
    });
    storeState(get());
  },
  reorder: (fromId, toId) => {
    const pages = [...get().pages];
    const from = pages.findIndex((p) => p.id === fromId);
    const to = pages.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [m] = pages.splice(from, 1);
    pages.splice(to, 0, m);
    set({ pages });
    storeState(get());
  },
  setCrop: (c) => {
    set({ crop: c });
    storeState(get());
  },
  setApplyCropAll: (v) => {
    set({ applyCropToAll: v });
    storeState(get());
  },
  setRotation: (deg) => {
    set({ rotation: deg });
    storeState(get());
  },
  setFormat: (f) => {
    set({ format: f });
    storeState(get());
  },
  patch: (p) => {
    set(p as State);
    storeState(get());
  },
  reset: async () => {
    lastAnchor = null;
    cacheManager.clear();
    await clearAllPersistedData();
    set({ ...initial });
  },
  restoreState: async () => {
    const storedState = retrieveState();
    const storedBytes = await retrieveFileBytes();
    
    if (storedState && storedBytes) {
      set({
        ...storedState,
        fileBytes: storedBytes,
        loading: false,
        progress: 100,
      });
    }
  },
}));
