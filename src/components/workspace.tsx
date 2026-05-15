import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CrumpledIcon } from "./upload-zone";
import { loadPdf, renderPageToCanvas } from "@/lib/pdf";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CropOverlay } from "./crop-overlay";
import { ExportSidebar } from "./export-sidebar";

export function Workspace() {
  const pages = useStore((s) => s.pages);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const selectAll = useStore((s) => s.selectAll);
  const removePage = useStore((s) => s.removePage);
  const reorder = useStore((s) => s.reorder);
  const reset = useStore((s) => s.reset);
  const fileName = useStore((s) => s.fileName);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll(true);
      } else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        selectAll(false);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const sel = pages.filter((p) => p.selected && !p.removed);
        if (sel.length) {
          e.preventDefault();
          sel.forEach((p) => removePage(p.id));
        }
      } else if (e.key === " " && activeId) {
        e.preventDefault();
        toggleSelect(activeId, { only: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages, activeId, selectAll, removePage, toggleSelect]);

  const visible = pages.filter((p) => !p.removed);
  const selectedCount = visible.filter((p) => p.selected).length;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-4 pb-24">
      <div className="mb-3 flex items-center justify-between">
        <p className="truncate font-display text-xl">
          <span className="text-muted-foreground">Working on:</span>{" "}
          <span className="font-semibold">{fileName}</span>
        </p>
        <button
          onClick={reset}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:border-[color:var(--gold)]"
        >
          Start over
        </button>
      </div>

      <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_320px]">
        {/* LEFT: thumbnails */}
        <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
            <span className="font-semibold">{selectedCount} / {visible.length} selected</span>
            <div className="flex gap-1">
              <button
                onClick={() => selectAll(true)}
                className="rounded px-2 py-1 hover:bg-secondary"
              >All</button>
              <button
                onClick={() => selectAll(false)}
                className="rounded px-2 py-1 hover:bg-secondary"
              >None</button>
            </div>
          </div>
          <div className="overflow-y-auto p-2 space-y-2">
            <AnimatePresence>
              {pages.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: p.removed ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  draggable
                  onDragStart={() => setDraggingId(p.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingId && draggingId !== p.id) reorder(draggingId, p.id);
                    setDraggingId(null);
                  }}
                  onClick={(e) => {
                    setActive(p.id);
                    if (e.shiftKey) toggleSelect(p.id, { range: true });
                  }}
                  className={`group relative cursor-pointer rounded-md border p-1.5 transition-all ${
                    activeId === p.id ? "ring-2 ring-[color:var(--gold)]" : ""
                  } ${
                    p.selected
                      ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                      : "border-transparent hover:border-border"
                  } ${p.removed ? "hidden" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={p.selected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(p.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-2 z-10 h-4 w-4 accent-[color:var(--gold)]"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePage(p.id);
                    }}
                    className="absolute right-2 top-2 z-10 rounded bg-background/80 p-1 opacity-0 group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <img
                    src={p.thumbnail}
                    alt={`Page ${p.index + 1}`}
                    className="mx-auto block max-h-40 w-auto rounded shadow-sm"
                  />
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    Page {p.index + 1}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER: preview */}
        <CenterPreview />

        {/* RIGHT: export */}
        <ExportSidebar />
      </div>

      {/* Shortcuts bar */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"
          >
            <span className="mr-3"><kbd className="kbd">Space</kbd> preview</span>
            <span className="mr-3"><kbd className="kbd">⌘/Ctrl A</kbd> all</span>
            <span className="mr-3"><kbd className="kbd">⌘/Ctrl D</kbd> none</span>
            <span className="mr-3"><kbd className="kbd">Del</kbd> remove</span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="ml-2 text-foreground hover:text-[color:var(--gold)]"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .kbd { font-family: var(--font-sans); border:1px solid var(--border); border-bottom-width:2px; border-radius:4px; padding:1px 5px; background:var(--background); color:var(--foreground); font-size:11px; }
      `}</style>
    </div>
  );
}

function CenterPreview() {
  const fileBytes = useStore((s) => s.fileBytes);
  const pages = useStore((s) => s.pages);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const active = pages.find((p) => p.id === activeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<{ w: number; h: number; data: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!fileBytes || !active) return;
    (async () => {
      const doc = await loadPdf(fileBytes);
      const c = await renderPageToCanvas(doc, active.index, 1.5);
      if (cancelled) return;
      setCanvas({ w: c.width, h: c.height, data: c.toDataURL("image/jpeg", 0.92) });
    })();
    return () => {
      cancelled = true;
    };
  }, [fileBytes, active?.index]); // eslint-disable-line

  const visible = pages.filter((p) => !p.removed);
  const idx = visible.findIndex((p) => p.id === activeId);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
        <button
          onClick={() => idx > 0 && setActive(visible[idx - 1].id)}
          disabled={idx <= 0}
          className="flex items-center gap-1 rounded p-1 disabled:opacity-30 hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-muted-foreground">
          {active ? `Page ${active.index + 1}` : "—"}
          {active && (
            <span className="ml-2 text-xs">
              {Math.round(active.width)} × {Math.round(active.height)} pt ·{" "}
              {((active.width / 72) * 2.54).toFixed(1)} × {((active.height / 72) * 2.54).toFixed(1)} cm
            </span>
          )}
        </span>
        <button
          onClick={() => idx < visible.length - 1 && setActive(visible[idx + 1].id)}
          disabled={idx >= visible.length - 1}
          className="flex items-center gap-1 rounded p-1 disabled:opacity-30 hover:bg-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div ref={containerRef} className="relative flex-1 overflow-auto bg-[color:var(--warm-gray)]/40 p-6 flex items-center justify-center">
        {canvas && active ? (
          <CropOverlay imageDataUrl={canvas.data} pageW={canvas.w} pageH={canvas.h} />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <CrumpledIcon className="h-10 w-10 animate-paper-crunch text-[color:var(--gold)]" />
            <p className="text-sm">Loading page…</p>
          </div>
        )}
      </div>
    </div>
  );
}
