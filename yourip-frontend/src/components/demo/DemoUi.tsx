"use client";

/**
 * Interface pieces that exist only in the hosted demo. page.tsx loads this module behind the build-time
 * IS_DEMO flag, so none of it is bundled into the normal app.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Info, X } from "lucide-react";
import { QUICK_START_URL, REPO_URL } from "@/lib/demo";
import { DEMO_DOWNLOAD_MESSAGE, DEMO_SAMPLE_LINKS } from "@/lib/demo-samples";

const linkClass = "inline-flex items-center gap-0.5 rounded text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

export function DemoBanner() {
  return (
    <div role="region" aria-label="Live demo notice" className="border-b border-white/10 bg-[#141416]">
      <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-[11px] text-zinc-400 sm:justify-between sm:px-6">
        <p className="flex items-center gap-2.5">
          <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.19em] text-[var(--accent)]">Live demo</span>
          <span>Simulated: nothing is downloaded or converted.</span>
        </p>
        <p className="flex items-center gap-3">
          <a href={QUICK_START_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>Run it locally<ArrowUpRight aria-hidden size={12} strokeWidth={1.8} /></a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>GitHub<ArrowUpRight aria-hidden size={12} strokeWidth={1.8} /></a>
        </p>
      </div>
    </div>
  );
}

export function DemoSamples({ onPick }: { onPick: (url: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500" role="group" aria-label="Sample links">
      <span>Try a sample:</span>
      {DEMO_SAMPLE_LINKS.map(sample => (
        <button key={sample.url} type="button" onClick={() => onPick(sample.url)}
          className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-zinc-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none">{sample.label}</button>
      ))}
    </div>
  );
}

/** Shown whenever the user presses a Download control. `nonce` changes on every press so the timer restarts. */
export function DemoToast({ nonce, onDismiss }: { nonce: number; onDismiss: () => void }) {
  useEffect(() => {
    if (!nonce) return;
    const timer = setTimeout(onDismiss, 7000);
    return () => clearTimeout(timer);
  }, [nonce, onDismiss]);
  return (
    <AnimatePresence>
      {nonce > 0 && (
        <motion.div key="demo-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}
          className="fixed inset-x-4 bottom-5 z-[60] mx-auto flex max-w-[460px] items-start gap-3 rounded-2xl border border-white/12 bg-[#1d1d20] px-4 py-3.5 text-sm leading-snug text-zinc-200 shadow-2xl shadow-black/60">
          <Info aria-hidden size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <p className="min-w-0 flex-1">{DEMO_DOWNLOAD_MESSAGE} <a href={QUICK_START_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>Quick start</a></p>
          <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-mr-1 rounded p-0.5 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><X aria-hidden size={16} strokeWidth={1.8} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
