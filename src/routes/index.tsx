import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Footer, Header } from "@/components/site-chrome";
import { UploadZone } from "@/components/upload-zone";
import { Workspace } from "@/components/workspace";
import { PrivacyModal, ProcessingOverlay, Toasts } from "@/components/overlays";
import { useStore, type PdfPage } from "@/lib/store";
import { loadPdf, renderPageToCanvas } from "@/lib/pdf";
import { Crop, FileDown, Image as ImageIcon, MousePointerClick, Code2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iHatePDF — PDFs are terrible. We make them slightly less terrible." },
      { name: "description", content: "Select pages, crop, and export PDFs to PDF, JPG, PNG, SVG, or Flutter code. Runs entirely in your browser." },
    ],
  }),
  component: Index,
});

function Index() {
  const [privacy, setPrivacy] = useState(false);
  const fileBytes = useStore((s) => s.fileBytes);
  const restoreState = useStore((s) => s.restoreState);

  useEffect(() => {
    restoreState();
  }, [restoreState]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onPrivacy={() => setPrivacy(true)} />
      <main className="flex-1">
        <ClientOnly fallback={<HeroFallback />}>
          {fileBytes ? <Workspace /> : <UploadGate />}
        </ClientOnly>

        {!fileBytes && <HowItWorks />}
      </main>
      <Footer />
      <ClientOnly fallback={null}>
        <ProcessingOverlay />
        <Toasts />
        <PrivacyModal open={privacy} onClose={() => setPrivacy(false)} />
      </ClientOnly>
    </div>
  );
}

function HeroFallback() {
  return (
    <section className="mx-auto max-w-5xl px-5 pt-10 pb-20 text-center">
      <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05]">
        PDFs are <span className="italic text-[color:var(--gold)]">terrible</span>.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground md:text-xl">
        We make them slightly less terrible.
      </p>
    </section>
  );
}

function UploadGate() {
  const setFile = useStore((s) => s.setFile);
  const setPages = useStore((s) => s.setPages);
  const patch = useStore((s) => s.patch);

  const onFile = async (file: File) => {
    patch({ loading: true, loadingMessage: "Cracking open your PDF…", progress: 5, error: null });
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      setFile(file.name, buf);
      const doc = await loadPdf(buf);
      const total = doc.numPages;
      const pages: PdfPage[] = [];
      for (let i = 0; i < total; i++) {
        patch({ progress: 10 + Math.round((i / total) * 85), loadingMessage: `Sketching page ${i + 1} of ${total}…` });
        const page = await doc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = await renderPageToCanvas(doc, i, 0.4);
        pages.push({
          index: i,
          id: `p-${i}-${Math.random().toString(36).slice(2, 7)}`,
          width: viewport.width / 0.4,
          height: viewport.height / 0.4,
          thumbnail: canvas.toDataURL("image/jpeg", 0.7),
          selected: true,
          removed: false,
        });
      }
      setPages(pages);
      patch({ loading: false, progress: 100 });
    } catch (e) {
      console.error(e);
      patch({ loading: false, error: "Something broke on our end. Embarrassing." });
    }
  };

  return <UploadZone onFile={onFile} onError={(msg) => patch({ error: msg })} />;
}

function HowItWorks() {
  const steps = [
    { icon: MousePointerClick, title: "1. Drop the PDF", body: "Drag it in, click to upload. Nothing gets sent to a server." },
    { icon: Crop, title: "2. Pick & crop", body: "Choose pages, drag to reorder, crop with presets or freeform." },
    { icon: FileDown, title: "3. Export", body: "PDF, JPG, PNG, SVG. Quality, DPI, compression — all yours." },
    { icon: Code2, title: "4. Or get Flutter code", body: "Generate a PdfPageView or CustomPainter scaffold." },
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-20 scroll-mt-20">
      <h2 className="text-center font-display text-4xl font-bold">How this thing works</h2>
      <p className="mt-3 text-center text-muted-foreground">
        Four steps. No accounts. No upload progress bar lying to you.
      </p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-6">
            <s.icon className="h-6 w-6 text-[color:var(--gold)]" />
            <h3 className="mt-3 font-display text-xl">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
