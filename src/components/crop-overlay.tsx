import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

const PRESETS = {
  Freeform: null,
  A4: 210 / 297,
  Letter: 8.5 / 11,
  Square: 1,
} as const;

type PresetName = keyof typeof PRESETS;

export function CropOverlay({
  imageDataUrl,
  pageW,
  pageH,
  pageId,
}: {
  imageDataUrl: string;
  pageW: number;
  pageH: number;
  pageId: string;
}) {
  const pages = useStore((s) => s.pages);
  const currentPage = pages.find((p) => p.id === pageId);
  const crop = currentPage?.crop ?? null;
  const setPageCrop = useStore((s) => s.setPageCrop);
  const applyAll = useStore((s) => s.applyCropToAll);
  const setApplyAll = useStore((s) => s.setApplyCropAll);
  const [preset, setPreset] = useState<PresetName>("Freeform");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const aspect = pageW / pageH;
  const containerAspect = box.w / Math.max(box.h, 1);
  const dispW = containerAspect > aspect ? box.h * aspect : box.w;
  const dispH = containerAspect > aspect ? box.h : box.w / aspect;

  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const px = {
    left: c.x * dispW,
    top: c.y * dispH,
    width: c.w * dispW,
    height: c.h * dispH,
  };

  const startDrag = (
    e: React.MouseEvent,
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...c };
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / dispW;
      const dy = (ev.clientY - startY) / dispH;
      let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
      if (mode === "move") {
        nx = clamp(start.x + dx, 0, 1 - start.w);
        ny = clamp(start.y + dy, 0, 1 - start.h);
      } else {
        if (mode.includes("e")) nw = clamp(start.w + dx, 0.05, 1 - start.x);
        if (mode.includes("s")) nh = clamp(start.h + dy, 0.05, 1 - start.y);
        if (mode.includes("w")) {
          const newW = clamp(start.w - dx, 0.05, start.x + start.w);
          nx = start.x + (start.w - newW);
          nw = newW;
        }
        if (mode.includes("n")) {
          const newH = clamp(start.h - dy, 0.05, start.y + start.h);
          ny = start.y + (start.h - newH);
          nh = newH;
        }
        // Snap to margins
        const snap = 0.02;
        for (const t of [0, 0.5, 1]) {
          if (Math.abs(nx - t) < snap) nx = t;
          if (Math.abs(ny - t) < snap) ny = t;
          if (Math.abs(nx + nw - t) < snap) nw = t - nx;
          if (Math.abs(ny + nh - t) < snap) nh = t - ny;
        }
      }
      setPageCrop(pageId, { x: nx, y: ny, w: nw, h: nh });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const applyPreset = (name: PresetName) => {
    setPreset(name);
    if (name === "Freeform") return;
    const target = PRESETS[name]!;
    const pageAspect = pageW / pageH;
    let w = 1, h = 1;
    if (target > pageAspect) {
      h = pageAspect / target;
    } else {
      w = target / pageAspect;
    }
    setPageCrop(pageId, { x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  };

  const cmW = ((c.w * pageW) / 72) * 2.54;
  const cmH = ((c.h * pageH) / 72) * 2.54;

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {(Object.keys(PRESETS) as PresetName[]).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            className={`rounded-full border px-3 py-1 transition ${
              preset === name
                ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15"
                : "border-border bg-card hover:border-[color:var(--gold)]"
            }`}
          >
            {name}
          </button>
        ))}
        <button
          onClick={() => {
            setPageCrop(pageId, null);
            setPreset("Freeform");
          }}
          className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
        <label className="ml-2 inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
            className="h-3.5 w-3.5 accent-[color:var(--gold)]"
          />
          Apply to all selected
        </label>
      </div>

      <div ref={wrapRef} className="relative flex-1 w-full">
        <div
          className="relative mx-auto shadow-md"
          style={{
            width: dispW || "auto",
            height: dispH || "auto",
            backgroundImage: `url(${imageDataUrl})`,
            backgroundSize: "cover",
          }}
        >
          {/* dim outside crop */}
          <div className="pointer-events-none absolute inset-0" style={{
            boxShadow: `inset 0 0 0 9999px rgba(26,29,32,0.45)`,
            clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${px.top}px, ${px.left}px ${px.top}px, ${px.left}px ${px.top + px.height}px, ${px.left + px.width}px ${px.top + px.height}px, ${px.left + px.width}px ${px.top}px, 0 ${px.top}px)`,
          }} />
          {/* crop box */}
          <div
            className="absolute border-2 border-[color:var(--gold)] cursor-move"
            style={{ left: px.left, top: px.top, width: px.width, height: px.height }}
            onMouseDown={(e) => startDrag(e, "move")}
          >
            {(["n","s","e","w","ne","nw","se","sw"] as const).map((h) => (
              <div
                key={h}
                onMouseDown={(e) => startDrag(e, h)}
                className="absolute h-3 w-3 -m-1.5 bg-[color:var(--gold)] border border-background"
                style={handleStyle(h)}
              />
            ))}
            {/* dashed snap guides */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-[color:var(--gold)]/40" />
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-[color:var(--gold)]/40" />
            </div>
          </div>
        </div>
        <div className="absolute right-2 bottom-2 rounded bg-foreground/85 px-2 py-1 text-[11px] text-background">
          {Math.round(c.w * pageW)}×{Math.round(c.h * pageH)} px · {cmW.toFixed(1)}×{cmH.toFixed(1)} cm
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function handleStyle(h: string): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (h.includes("n")) s.top = 0;
  if (h.includes("s")) s.bottom = 0;
  if (h.includes("e")) s.right = 0;
  if (h.includes("w")) s.left = 0;
  if (h === "n" || h === "s") { s.left = "50%"; s.transform = "translateX(-50%)"; }
  if (h === "e" || h === "w") { s.top = "50%"; s.transform = "translateY(-50%)"; }
  s.cursor = h.length === 2 ? `${h}-resize` : `${h}-resize`;
  return s;
}
