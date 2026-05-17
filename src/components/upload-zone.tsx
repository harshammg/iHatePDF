import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { FileWarning, Lock, UploadCloud } from "lucide-react";

const FEATURES = ["Select Pages", "Crop", "Export PDF", "Export Image", "Export SVG"];
const MAX_BYTES = 100 * 1024 * 1024;

export function UploadZone({
  onFile,
  onError,
}: {
  onFile: (file: File) => void;
  onError: (msg: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (file?: File | null) => {
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        onError("That's not a PDF. We can tell.");
        return;
      }
      if (file.size > MAX_BYTES) {
        onError("That PDF is absolutely enormous. Try something smaller.");
        return;
      }
      onFile(file);
    },
    [onFile, onError],
  );

  return (
    <section className="mx-auto max-w-5xl px-5 pt-10 pb-20 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-display text-5xl md:text-7xl font-bold leading-[1.05]"
      >
        PDFs are <span className="italic text-[color:var(--gold)]">terrible</span>.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-4 text-lg text-muted-foreground md:text-xl"
      >
        We make them slightly less terrible.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-12 mx-auto cursor-pointer rounded-2xl border-2 border-dashed p-12 md:p-16 transition-all ${
          drag
            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 scale-[1.01]"
            : "border-[color:var(--gold)]/60 bg-card hover:bg-[color:var(--gold)]/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        <CrumpledIcon className="mx-auto h-16 w-16 text-[color:var(--gold)]" />
        <p className="mt-6 font-display text-2xl md:text-3xl">
          Drop your cursed PDF here
        </p>
        <p className="mt-1 text-muted-foreground">— or click to upload —</p>
        <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Your file never leaves your browser. Nothing is uploaded anywhere.
        </p>
      </motion.div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {FEATURES.map((f, i) => (
          <motion.span
            key={f}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm"
          >
            {f}
          </motion.span>
        ))}
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        <FileWarning className="inline h-3.5 w-3.5 mr-1" />
        Max 100MB. We're not magicians.
      </p>
    </section>
  );
}

export function CrumpledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M14 6 L40 4 L52 18 L52 58 L12 60 Z" />
      <path d="M40 4 L40 18 L52 18" />
      <path d="M22 22 L36 18 L30 32 L42 28 L24 46" strokeWidth="2" opacity="0.7" />
    </svg>
  );
}
