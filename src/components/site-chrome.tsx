import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useEffect, useState } from "react";

export function BrandMark({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className={`font-display font-bold ${size} tracking-tight`}>
      <span className="text-[color:var(--gold)] italic">i</span>
      <span className="text-foreground">Hate</span>
      <span className="text-foreground">PDF</span>
    </span>
  );
}

export function Header({ onPrivacy }: { onPrivacy: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors ${
        scrolled ? "glass border-border" : "bg-transparent border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#how-it-works" className="hover:text-[color:var(--gold)] transition-colors">
            How it works
          </a>
          <button
            onClick={onPrivacy}
            className="hover:text-[color:var(--gold)] transition-colors"
          >
            Privacy
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[color:var(--gold)] transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="mx-auto max-w-7xl px-5 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>Made for people who just wanted to print one page.</p>
          <div className="flex gap-5">
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </div>
        </div>
        <p className="mt-6 text-center text-xs">
          No files are stored. Everything happens in your browser. Nothing is uploaded.
        </p>
      </div>
    </footer>
  );
}
