"use client";

import { Download, FileAudio2, FileVideo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DownloadCard({ title, thumbnail, filename, onDownload, downloading }: {
  title: string;
  thumbnail: string;
  filename: string;
  onDownload: () => void;
  downloading: boolean;
}) {
  const isVideo = filename.toLowerCase().endsWith(".mp4");
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1b1e] p-3 transition-colors hover:border-white/20 motion-reduce:transition-none">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
        <img src={thumbnail} alt="" className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100" title={title}>{title}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-400">
          {isVideo ? <FileVideo2 aria-hidden size={14} strokeWidth={1.8} /> : <FileAudio2 aria-hidden size={14} strokeWidth={1.8} />}
          <span className="truncate">{filename}</span>
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onDownload} disabled={downloading}
        aria-label={`Download ${filename}`} title={`Download ${filename}`}
        className="size-9 shrink-0 text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:ring-[var(--accent)]">
        <Download aria-hidden size={18} strokeWidth={1.8} />
      </Button>
    </div>
  );
}
