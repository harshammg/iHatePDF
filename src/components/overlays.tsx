import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { CrumpledIcon } from "./upload-zone";
import { CheckCircle2, X } from "lucide-react";

const MESSAGES = [
  "Taming this beast…",
  "Convincing the pages to cooperate…",
  "Almost free…",
];

export function ProcessingOverlay() {
  const loading = useStore((s) => s.loading);
  const progress = useStore((s) => s.progress);
  const msg = useStore((s) => s.loadingMessage);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setI((x) => (x + 1) % MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, [loading]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="text-center">
            <CrumpledIcon className="mx-auto h-20 w-20 text-[color:var(--gold)] animate-paper-crunch" />
            <p className="mt-6 font-display text-2xl">{msg || MESSAGES[i]}</p>
            <div className="mx-auto mt-6 h-2 w-72 overflow-hidden rounded-full bg-warm-gray">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-[color:var(--gold)]"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const error = useStore((s) => s.error);
  const patch = useStore((s) => s.patch);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const onSuccess = () => {
      setSuccess("Finally. Done. Your file is ready.");
      setTimeout(() => setSuccess(null), 5000);
    };
    window.addEventListener("ihatepdf-success", onSuccess);
    return () => window.removeEventListener("ihatepdf-success", onSuccess);
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => patch({ error: null }), 5000);
    return () => clearTimeout(t);
  }, [error, patch]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm shadow-lg max-w-sm"
          >
            <span className="text-destructive">{error}</span>
            <button onClick={() => patch({ error: null })} aria-label="Dismiss">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="flex items-center gap-3 rounded-lg border border-[color:var(--gold)]/40 bg-card px-4 py-3 text-sm shadow-lg max-w-sm"
          >
            <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)]" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss" className="ml-2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-xl border border-border bg-card p-6"
          >
            <h2 className="font-display text-2xl">Privacy</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              iHatePDF runs <span className="font-semibold text-foreground">entirely in your browser</span>.
              Your file is never uploaded, never stored on our servers, never seen by anyone but you.
              We don't track you, we don't drop cookies, we don't have analytics.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Close the tab and it's gone. That's it. That's the policy.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-[color:var(--gold)] px-4 py-2 font-semibold text-[color:var(--gold-foreground)]"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
