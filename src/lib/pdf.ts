// Lazy-load pdfjs only on the client.
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cacheManager, generatePdfKey } from "./cache";

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

export async function loadPdf(bytes: Uint8Array, useCache: boolean = true): Promise<PDFDocumentProxy> {
  const key = generatePdfKey(bytes);
  
  // Check cache first
  if (useCache) {
    const cached = cacheManager.getPdf(key);
    if (cached) {
      return cached;
    }
  }
  
  const pdfjs = await getPdfjs();
  // pdf.js mutates the buffer; pass a copy so we keep the original around for export
  const copy = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data: copy }).promise;
  
  // Cache the document
  if (useCache) {
    cacheManager.cachePdf(key, doc);
  }
  
  return doc;
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  useCache: boolean = true,
): Promise<HTMLCanvasElement> {
  const pdfKey = generatePdfKey(doc as any); // PDFDocumentProxy has the data internally
  const canvasKey = `${pdfKey}-page-${pageIndex}-scale-${scale}`;
  
  // Check cache first
  if (useCache) {
    const cached = cacheManager.getCanvas(canvasKey);
    if (cached && cached.scale === scale) {
      return cacheManager.createCanvasFromCache(cached);
    }
  }
  
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  
  // Cache the canvas
  if (useCache) {
    cacheManager.cacheCanvas(canvasKey, canvas, scale);
  }
  
  return canvas;
}
