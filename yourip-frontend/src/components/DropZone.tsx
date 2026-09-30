"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export default function DropZone({ onUrlDrop, onActivate }: { onUrlDrop: (url: string) => void; onActivate: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function accept(text: string) {
    const value = text.trim();
    if (!value || (!value.includes("youtube.com") && !value.includes("youtu.be"))) {
      setError("Drop or paste a YouTube video link.");
      return;
    }
    setError("");
    onUrlDrop(value);
  }
  return (
    <div data-dropzone role="button" tabIndex={0} aria-label="Drop or paste a YouTube link" onClick={onActivate}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActivate(); } }}
      onPaste={event => { const text = event.clipboardData.getData("text/plain"); if (text) { event.preventDefault(); accept(text); } }}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={event => { event.preventDefault(); setDragging(false); }}
      onDrop={event => {
        event.preventDefault(); setDragging(false);
        if (event.dataTransfer.files.length) return setError("Drop a link instead of a file.");
        accept(event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain"));
      }}
      className={`group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none ${dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/12 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.045]"}`}>
      <span className="mb-2.5 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:text-[var(--accent)] motion-reduce:transition-none"><Link2 aria-hidden size={17} strokeWidth={1.8} /></span>
      <span className="text-sm font-medium text-zinc-200">Drop a YouTube link here</span>
      <span className="mt-1 text-xs text-zinc-500">or paste with Cmd+V / Ctrl+V</span>
      {error && <span role="alert" className="mt-2 text-xs text-rose-300">{error}</span>}
    </div>
  );
}
