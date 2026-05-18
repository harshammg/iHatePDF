import { useEffect, useState } from "react";
import { useStore, type ExportFormat } from "@/lib/store";
import { estimateSize, exportedPages, runExport } from "@/lib/export";

const TABS: { id: ExportFormat; label: string; disabled?: boolean }[] = [
  { id: "pdf", label: "PDF" },
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "svg", label: "SVG" },
  { id: "flutter", label: "Flutter", disabled: true },
];

export function ExportSidebar() {
  const s = useStore();
  const [size, setSize] = useState<number>(0);

  const sel = exportedPages(s.pages);
  const selCount = sel.length;

  useEffect(() => {
    if (!s.fileBytes || selCount === 0) {
      setSize(0);
      return;
    }
    estimateSize({
      bytes: s.fileBytes,
      fileName: s.fileName,
      pages: s.pages,
      crop: s.crop,
      applyCropToAll: s.applyCropToAll,
      rotation: s.rotation,
      format: s.format,
      jpgQuality: s.jpgQuality,
      imageDpi: s.imageDpi,
      pdfCompression: s.pdfCompression,
      flutterWidget: s.flutterWidget,
    }).then(setSize);
  }, [s.format, s.jpgQuality, s.imageDpi, s.pdfCompression, s.crop, s.applyCropToAll, s.rotation, s.pages, s.fileBytes, selCount]);

  const onExport = async () => {
    if (!s.fileBytes || selCount === 0) return;
    s.patch({ loading: true, progress: 0, loadingMessage: "Taming this beast…", error: null });
    try {
      await runExport({
        bytes: s.fileBytes,
        fileName: s.fileName,
        pages: s.pages,
        crop: s.crop,
        applyCropToAll: s.applyCropToAll,
        rotation: s.rotation,
        format: s.format,
        jpgQuality: s.jpgQuality,
        imageDpi: s.imageDpi,
        pdfCompression: s.pdfCompression,
        flutterWidget: s.flutterWidget,
        onProgress: (p, msg) => s.patch({ progress: p, ...(msg ? { loadingMessage: msg } : {}) }),
      });
      s.patch({ loading: false, progress: 100 });
      window.dispatchEvent(new CustomEvent("ihatepdf-success"));
    } catch (err) {
      s.patch({ loading: false, error: (err as Error).message || "Something broke on our end. Embarrassing." });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col overflow-hidden">
      <h2 className="font-display text-xl">Export your sanity</h2>
      <p className="mt-1 text-xs text-muted-foreground">Pick a format. Pick your poison.</p>

      <div className="mt-4 grid grid-cols-5 gap-1 rounded-md border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && s.setFormat(t.id)}
            disabled={t.disabled}
            className={`rounded px-1 py-1.5 text-xs transition ${
              t.disabled
                ? "text-muted-foreground/50 cursor-not-allowed"
                : s.format === t.id
                ? "bg-[color:var(--gold)]/20 text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={t.disabled ? "Coming soon" : ""}
          >
            {t.label}
            {t.disabled && <span className="block text-[10px]">Soon</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 text-sm flex-1 overflow-y-auto">
        {s.format === "jpg" && (
          <>
            <Slider label="Quality" value={s.jpgQuality} min={10} max={100} suffix="%" onChange={(v) => s.patch({ jpgQuality: v })} />
            <DpiPicker value={s.imageDpi} onChange={(v) => s.patch({ imageDpi: v })} />
          </>
        )}
        {s.format === "png" && <DpiPicker value={s.imageDpi} onChange={(v) => s.patch({ imageDpi: v })} />}
        {s.format === "pdf" && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Compression</label>
            <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
              {(["low", "medium", "high"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => s.patch({ pdfCompression: c })}
                  className={`rounded px-2 py-1 text-xs capitalize ${
                    s.pdfCompression === c ? "bg-[color:var(--gold)]/20 font-semibold" : "hover:bg-secondary"
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
        )}
        {s.format === "svg" && (
          <p className="text-xs text-muted-foreground">No options. SVG just is what it is.</p>
        )}
        {s.format === "flutter" && (
          <p className="text-xs text-muted-foreground">Flutter export is coming soon. This feature is open for contributors.</p>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Estimated size: <span className="text-foreground font-medium">{formatBytes(size)}</span>
      </div>

      <button
        onClick={onExport}
        disabled={selCount === 0 || s.loading}
        className={`mt-3 w-full rounded-lg bg-[color:var(--gold)] px-4 py-3 font-semibold text-[color:var(--gold-foreground)] transition disabled:opacity-50 ${
          selCount > 0 && !s.loading ? "animate-gold-pulse hover:brightness-105" : ""
        }`}
      >
        {selCount === 0
          ? "Pick at least one page"
          : `Export ${selCount} page${selCount === 1 ? "" : "s"}`}
      </button>
      <button
        onClick={() => useStore.getState().selectAll(false)}
        className="mt-2 w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        Reset selection
      </button>
    </div>
  );
}

function Slider({ label, value, min, max, suffix, onChange }: {
  label: string; value: number; min: number; max: number; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[color:var(--gold)]"
      />
    </div>
  );
}

function DpiPicker({ value, onChange }: { value: 72 | 150 | 300; onChange: (v: 72 | 150 | 300) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">DPI</label>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
        {([72, 150, 300] as const).map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded px-2 py-1 text-xs ${value === d ? "bg-[color:var(--gold)]/20 font-semibold" : "hover:bg-secondary"}`}
          >{d}</button>
        ))}
      </div>
    </div>
  );
}

function formatBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
