// Lazy-load pdfjs only on the client.
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  // pdf.js mutates the buffer; pass a copy so we keep the original around for export
  const copy = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data: copy }).promise;
  return doc;
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}
