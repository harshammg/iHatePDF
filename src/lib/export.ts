import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import type { PdfPage, ExportFormat, CropRect } from "./store";
import { loadPdf, renderPageToCanvas } from "./pdf";

type ExportOpts = {
  bytes: Uint8Array;
  fileName: string | null;
  pages: PdfPage[];
  crop: CropRect;
  applyCropToAll: boolean;
  rotation: number;
  format: ExportFormat;
  jpgQuality: number;
  imageDpi: 72 | 150 | 300;
  pdfCompression: "low" | "medium" | "high";
  flutterWidget: "PdfPageView" | "CustomPainter";
  onProgress?: (p: number, msg?: string) => void;
};

const PT_PER_INCH = 72;

export function exportedPages(pages: PdfPage[]) {
  return pages.filter((p) => !p.removed && p.selected);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function cropForPage(page: PdfPage, crop: CropRect, applyAll: boolean) {
  if (!crop) return null;
  if (!applyAll && !page.selected) return null;
  // crop is in normalized 0..1 of page bounds
  return crop;
}

export async function estimateSize(opts: ExportOpts): Promise<number> {
  const sel = exportedPages(opts.pages);
  if (sel.length === 0) return 0;
  // rough heuristics
  if (opts.format === "pdf") {
    const factor = opts.pdfCompression === "high" ? 0.45 : opts.pdfCompression === "medium" ? 0.7 : 1;
    return Math.round((opts.bytes.byteLength * (sel.length / opts.pages.length)) * factor);
  }
  if (opts.format === "jpg" || opts.format === "png") {
    const dpi = opts.imageDpi;
    let total = 0;
    for (const p of sel) {
      const wIn = p.width / PT_PER_INCH;
      const hIn = p.height / PT_PER_INCH;
      const px = wIn * dpi * hIn * dpi;
      const bpp = opts.format === "jpg" ? (opts.jpgQuality / 100) * 0.5 : 3;
      total += px * bpp * 0.1;
    }
    return Math.round(total);
  }
  if (opts.format === "svg") return sel.length * 80_000;
  return sel.length * 2_000; // flutter
}

export async function runExport(opts: ExportOpts) {
  const sel = exportedPages(opts.pages);
  if (sel.length === 0) throw new Error("Nothing selected. Pick at least one page.");
  const { onProgress } = opts;

  if (opts.format === "pdf") return exportPdf(opts, sel, onProgress);
  if (opts.format === "jpg" || opts.format === "png") return exportRaster(opts, sel, onProgress);
  if (opts.format === "svg") return exportSvg(opts, sel, onProgress);
  if (opts.format === "flutter") return exportFlutter(opts, sel);
}

async function exportPdf(opts: ExportOpts, sel: PdfPage[], onProgress?: ExportOpts["onProgress"]) {
  onProgress?.(5, "Loading the original…");
  const src = await PDFDocument.load(opts.bytes);
  const out = await PDFDocument.create();
  const indices = sel.map((p) => p.index);
  const copied = await out.copyPages(src, indices);
  copied.forEach((page, i) => {
    const meta = sel[i];
    const c = cropForPage(meta, opts.crop, opts.applyCropToAll);
    if (c) {
      const { width, height } = page.getSize();
      const x = c.x * width;
      const y = (1 - c.y - c.h) * height;
      const w = c.w * width;
      const h = c.h * height;
      page.setCropBox(x, y, w, h);
      page.setMediaBox(x, y, w, h);
    }
    if (opts.rotation) {
      page.setRotation(degrees(opts.rotation));
    }
    out.addPage(page);
    onProgress?.(10 + Math.round(((i + 1) / sel.length) * 80));
  });
  onProgress?.(95, "Almost free…");
  const bytes = await out.save({ useObjectStreams: opts.pdfCompression !== "low" });
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), filename(opts, "pdf"));
  onProgress?.(100);
}

async function exportRaster(opts: ExportOpts, sel: PdfPage[], onProgress?: ExportOpts["onProgress"]) {
  const doc = await loadPdf(opts.bytes);
  const scale = opts.imageDpi / 72;
  const mime = opts.format === "jpg" ? "image/jpeg" : "image/png";
  const ext = opts.format === "jpg" ? "jpg" : "png";

  const blobs: { blob: Blob; name: string }[] = [];
  for (let i = 0; i < sel.length; i++) {
    const p = sel[i];
    onProgress?.(Math.round((i / sel.length) * 90), "Rendering page " + (i + 1) + "…");
    const canvas = await renderPageToCanvas(doc, p.index, scale);
    const c = cropForPage(p, opts.crop, opts.applyCropToAll);
    let final = canvas;

    // Apply rotation
    if (opts.rotation) {
      const rotated = document.createElement("canvas");
      const rad = (opts.rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      rotated.width = canvas.width * cos + canvas.height * sin;
      rotated.height = canvas.width * sin + canvas.height * cos;
      const ctx = rotated.getContext("2d")!;
      ctx.translate(rotated.width / 2, rotated.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      final = rotated;
    }

    if (c) {
      const cropped = document.createElement("canvas");
      cropped.width = Math.max(1, Math.round(final.width * c.w));
      cropped.height = Math.max(1, Math.round(final.height * c.h));
      const ctx = cropped.getContext("2d")!;
      ctx.drawImage(
        final,
        final.width * c.x,
        final.height * c.y,
        final.width * c.w,
        final.height * c.h,
        0, 0, cropped.width, cropped.height,
      );
      final = cropped;
    }

    const blob: Blob = await new Promise((res) =>
      final.toBlob((b) => res(b!), mime, opts.format === "jpg" ? opts.jpgQuality / 100 : undefined),
    );
    blobs.push({ blob, name: `${baseName(opts)}-p${p.index + 1}.${ext}` });
  }

  if (blobs.length === 1) {
    downloadBlob(blobs[0].blob, blobs[0].name);
  } else {
    // bundle as a single download by triggering sequential downloads
    for (const b of blobs) downloadBlob(b.blob, b.name);
  }
  onProgress?.(100);
}

async function exportSvg(opts: ExportOpts, sel: PdfPage[], onProgress?: ExportOpts["onProgress"]) {
  // Minimal SVG export: rasterize each page into an embedded image inside an SVG.
  // (True vector SVG would require significantly more work; this preserves layout faithfully.)
  const doc = await loadPdf(opts.bytes);
  const scale = 2;
  const baseFileName = opts.fileName ? opts.fileName.replace(/\.pdf$/i, "") : "ihatepdf";

  const renderSvg = async (p: PdfPage) => {
    let canvas = await renderPageToCanvas(doc, p.index, scale);

    // Apply rotation
    if (opts.rotation) {
      const rotated = document.createElement("canvas");
      const rad = (opts.rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      rotated.width = canvas.width * cos + canvas.height * sin;
      rotated.height = canvas.width * sin + canvas.height * cos;
      const ctx = rotated.getContext("2d")!;
      ctx.translate(rotated.width / 2, rotated.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      canvas = rotated;
    }

    const c = cropForPage(p, opts.crop, opts.applyCropToAll);
    const cw = c ? canvas.width * c.w : canvas.width;
    const ch = c ? canvas.height * c.h : canvas.height;
    const dataUrl = canvas.toDataURL("image/png");
    const sx = c ? -canvas.width * c.x : 0;
    const sy = c ? -canvas.height * c.y : 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
  <image href="${dataUrl}" x="${sx}" y="${sy}" width="${canvas.width}" height="${canvas.height}"/>
</svg>`;
  };

  // If only one SVG, download directly without ZIP
  if (sel.length === 1) {
    const p = sel[0];
    onProgress?.(50, "Wrapping page…");
    const svg = await renderSvg(p);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${baseFileName}.svg`);
    onProgress?.(100);
    return;
  }

  // Multiple SVGs: bundle into ZIP
  const zip = new JSZip();
  for (let i = 0; i < sel.length; i++) {
    const p = sel[i];
    onProgress?.(Math.round((i / sel.length) * 90), "Wrapping page " + (i + 1) + "…");
    const svg = await renderSvg(p);
    zip.file(`${baseFileName} ${i + 1}.svg`, svg);
  }

  onProgress?.(95, "Zipping files…");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${baseFileName}.zip`);
  onProgress?.(100);
}

async function exportFlutter(opts: ExportOpts, sel: PdfPage[]) {
  const code =
    opts.flutterWidget === "PdfPageView"
      ? flutterPdfPageView(opts, sel)
      : flutterCustomPainter(opts, sel);
  downloadBlob(new Blob([code], { type: "text/plain" }), `${baseName(opts)}.dart`);
}

function flutterPdfPageView(opts: ExportOpts, sel: PdfPage[]) {
  return `// Generated by iHatePDF
// Pages: ${sel.map((p) => p.index + 1).join(", ")}
// Source: ${opts.bytes.byteLength} bytes

import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

class GeneratedPdfView extends StatefulWidget {
  const GeneratedPdfView({super.key, required this.assetPath});
  final String assetPath;

  @override
  State<GeneratedPdfView> createState() => _GeneratedPdfViewState();
}

class _GeneratedPdfViewState extends State<GeneratedPdfView> {
  late final PdfController _controller = PdfController(
    document: PdfDocument.openAsset(widget.assetPath),
    initialPage: 1,
  );

  static const List<int> kPages = <int>[${sel.map((p) => p.index + 1).join(", ")}];

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => PdfView(controller: _controller);
}
`;
}

function flutterCustomPainter(opts: ExportOpts, sel: PdfPage[]) {
  const first = sel[0];
  return `// Generated by iHatePDF — CustomPainter scaffold
import 'package:flutter/material.dart';

class PdfPagePlaceholder extends StatelessWidget {
  const PdfPagePlaceholder({super.key});
  static const double pageWidth = ${first.width.toFixed(2)}; // points
  static const double pageHeight = ${first.height.toFixed(2)};
  static const List<int> kPages = <int>[${sel.map((p) => p.index + 1).join(", ")}];

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: pageWidth / pageHeight,
      child: CustomPaint(painter: _PdfPainter()),
    );
  }
}

class _PdfPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()..color = const Color(0xFFFFFFFF);
    canvas.drawRect(Offset.zero & size, bg);
    // TODO: draw your vector content here
  }
  @override bool shouldRepaint(_) => false;
}
`;
}

function baseName(opts: ExportOpts) {
  return (opts.pages[0] && "ihatepdf") || "ihatepdf";
}
function filename(opts: ExportOpts, ext: string) {
  return `${baseName(opts)}-export.${ext}`;
}
