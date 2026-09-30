"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowDownToLine, CircleAlert, Download, Film, Link2, ListMusic, LoaderCircle, Music2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DownloadCard from "@/components/DownloadCard";
import DropZone from "@/components/DropZone";
import SettingsDrawer, { themeColors, type AudioQuality, type Format, type Theme, type VideoQuality } from "@/components/SettingsDrawer";

interface QueueItem {
  url: string;
  title: string;
  thumbnail: string;
  format: Format;
  audioQuality: AudioQuality;
  videoQuality: VideoQuality;
}
interface DownloadItem { blob: Blob; filename: string; title: string; thumbnail: string }
interface JobStatus { status: "preparing" | "downloading" | "processing" | "ready" | "error"; progress: number | null; error: string | null }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMetadata(url: string): Promise<{ title: string; thumbnail_url: string } | null> {
  try {
    const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

async function readError(response: Response): Promise<string> {
  try { const data = await response.json(); return typeof data.detail === "string" ? data.detail : "Conversion failed."; }
  catch { return "Conversion failed. Check the terminal for details."; }
}

function filenameFromDisposition(header: string, fallback: string): string {
  const encoded = header.match(/filename\*=utf-8''([^;]+)/i);
  if (encoded) { try { return decodeURIComponent(encoded[1]); } catch {} }
  return header.match(/filename="?([^";]+)"?/)?.[1] || fallback;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("mp3");
  const [audioQuality, setAudioQuality] = useState<AudioQuality>("high");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("balanced");
  const [theme, setTheme] = useState<Theme>("red");
  const [autoDownload, setAutoDownload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTos, setShowTos] = useState(true);
  const [showTosDetail, setShowTosDetail] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<JobStatus["status"]>("preparing");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DownloadItem[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef(0);
  const queueLength = useRef(0);
  queueLength.current = queue.length;

  const enqueue = useCallback(async (raw: string, chosenFormat: Format, chosenAudio: AudioQuality, chosenVideo: VideoQuality) => {
    if (queueLength.current + pending.current >= 5) { setError("Queue full. Wait until a slot frees up."); return; }
    let videoUrl = raw.trim();
    if (!videoUrl.startsWith("http")) videoUrl = `https://${videoUrl}`;
    try {
      const parsed = new URL(videoUrl);
      if (!["http:", "https:"].includes(parsed.protocol) || !["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(parsed.hostname)) throw new Error();
    } catch { setError("Paste a valid YouTube video link."); return; }
    pending.current += 1;
    setError(null);
    try {
      const meta = await fetchMetadata(videoUrl);
      queueLength.current += 1;
      setQueue(items => [...items, { url: videoUrl, title: meta?.title || "YouTube media", thumbnail: meta?.thumbnail_url || "/favicon.svg", format: chosenFormat, audioQuality: chosenAudio, videoQuality: chosenVideo }]);
      setUrl("");
    } finally { pending.current -= 1; }
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest("input, textarea, [data-dropzone]") || event.target.isContentEditable)) return;
      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text) void enqueue(text, format, audioQuality, videoQuality);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enqueue, format, audioQuality, videoQuality]);

  function triggerDownload(item: DownloadItem) {
    setDownloadingFile(item.filename);
    const objectUrl = URL.createObjectURL(item.blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = item.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => { URL.revokeObjectURL(objectUrl); setDownloadingFile(null); }, 1000);
  }

  useEffect(() => {
    if (loading || !queue.length) return;
    const next = queue[0];
    setQueue(items => items.slice(1));
    setCurrent(next);
    setLoading(true);
    setStage("preparing");
    setProgress(null);
    setError(null);
    (async () => {
      try {
        const created = await fetch("/api/jobs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: next.url, format: next.format, audio_quality: next.audioQuality, video_quality: next.videoQuality }),
        });
        if (!created.ok) throw new Error(await readError(created));
        const { id } = await created.json() as { id: string };
        for (;;) {
          await sleep(600);
          const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
          if (!response.ok) throw new Error(await readError(response));
          const state = await response.json() as JobStatus;
          setStage(state.status);
          setProgress(state.progress);
          if (state.status === "error") throw new Error(state.error || "Conversion failed.");
          if (state.status === "ready") break;
        }
        const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/file`);
        if (!response.ok) throw new Error(await readError(response));
        const blob = await response.blob();
        const filename = filenameFromDisposition(response.headers.get("content-disposition") || "", `${next.title}.${next.format}`);
        const item: DownloadItem = { blob, filename, title: next.title, thumbnail: next.thumbnail };
        setHistory(items => {
          const entries = [item, ...items];
          let bytes = 0;
          return entries.filter((entry, index) => {
            if (index > 0 && bytes + entry.blob.size > 300 * 1024 * 1024) return false;
            bytes += entry.blob.size;
            return true;
          }).slice(0, 10);
        });
        if (autoDownload) triggerDownload(item);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
      finally { setLoading(false); setCurrent(null); setProgress(null); }
    })();
  }, [queue, loading, autoDownload]);

  const accent = themeColors[theme];
  const accentSoft = `${accent}1c`;
  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-[#101012] text-zinc-100" style={{ "--accent": accent, "--accent-soft": accentSoft } as React.CSSProperties}>
        <div className="mx-auto flex w-full max-w-[720px] flex-col px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
          <header className="relative flex flex-col items-center text-center">
        <Button type="button" variant="ghost" size="icon" onClick={() => setShowSettings(true)} aria-label="Open settings" title="Settings"
          className="absolute right-0 top-0 z-30 size-10 rounded-2xl border border-white/12 bg-[#242427] text-zinc-200 shadow-xl shadow-black/40 transition-[background-color,transform] hover:scale-105 hover:bg-[#303034] focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-95 motion-reduce:transition-none"><Settings2 aria-hidden size={19} strokeWidth={1.8} /></Button>

            <div className="mb-5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.19em] text-zinc-400">Local media converter</div>
            <pre aria-label="YouRip" className="ascii-logo select-none text-left font-mono font-bold leading-[1.1]" style={{ color: accent, textShadow: `0 0 28px ${accent}42` }}>{String.raw`
░██     ░██                       ░█████████  ░██           
 ░██   ░██                        ░██     ░██               
  ░██ ░██    ░███████  ░██    ░██ ░██     ░██ ░██░████████  
   ░████    ░██    ░██ ░██    ░██ ░█████████  ░██░██    ░██ 
    ░██     ░██    ░██ ░██    ░██ ░██   ░██   ░██░██    ░██ 
    ░██     ░██    ░██ ░██   ░███ ░██    ░██  ░██░███   ░██ 
    ░██      ░███████   ░█████░██ ░██     ░██ ░██░██░█████  
                                                 ░██        
                                                 ░██        
                                                            `}</pre>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400">Your favorite videos, saved your way. Right here on your computer.</p>
          </header>

          <section aria-label="Converter" className="mt-9 overflow-hidden rounded-[24px] border border-white/10 bg-[#171719] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.28)] sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">01 / Convert</p>
                <h1 className="mt-1 text-lg font-semibold tracking-tight">Paste a YouTube link</h1>
              </div>
              <div className="relative flex rounded-[13px] border border-white/10 bg-[#0e0e10] p-1" role="group" aria-label="Download format">
                {(["mp3", "mp4"] as Format[]).map(choice => (
                  <Button key={choice} type="button" variant="ghost" aria-pressed={format === choice} onClick={() => setFormat(choice)}
                    className="relative z-0 h-9 min-w-[91px] rounded-[10px] bg-transparent px-3 text-xs font-semibold tracking-wide text-zinc-400 shadow-none hover:bg-transparent hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--accent)] aria-pressed:text-white">
                    {format === choice && <motion.span layoutId="format-pill" transition={{ type: "spring", stiffness: 440, damping: 34 }} className="absolute inset-0 -z-10 rounded-[9px] border border-white/12 bg-[#333337]" />}
                    {choice === "mp3" ? <Music2 aria-hidden size={16} strokeWidth={1.8} /> : <Film aria-hidden size={16} strokeWidth={1.8} />}
                    {choice.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <form onSubmit={event => { event.preventDefault(); void enqueue(url, format, audioQuality, videoQuality); }} className="space-y-3">
              <div className="relative">
                <Link2 aria-hidden size={17} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input ref={inputRef} value={url} onChange={event => { setUrl(event.target.value); setError(null); }} placeholder="https://www.youtube.com/watch?v=…" aria-label="YouTube video URL" required
                  className="h-12 rounded-xl border-white/12 bg-[#101012] pl-11 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]" />
              </div>
              <DropZone onUrlDrop={value => void enqueue(value, format, audioQuality, videoQuality)} onActivate={() => inputRef.current?.focus()} />
              <div className="flex flex-wrap items-center justify-between gap-2 py-0.5 text-xs text-zinc-500">
                <span>{format === "mp3" ? `MP3 · ${audioQuality === "standard" ? "128" : audioQuality === "high" ? "192" : "320"} kbps` : `MP4 · up to ${videoQuality === "compact" ? "480" : videoQuality === "balanced" ? "720" : "1080"}p`}</span>
                <button type="button" onClick={() => setShowSettings(true)} className="rounded text-zinc-400 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Adjust quality</button>
              </div>
              <Button type="submit" disabled={!url.trim()} className="h-11 w-full rounded-xl text-sm font-semibold shadow-none transition-[filter,transform] hover:brightness-110 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171719] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45"
                style={{ backgroundColor: accent, color: theme === "green" || theme === "blue" ? "#111" : "#fff" }}>
                <ArrowDownToLine aria-hidden size={17} strokeWidth={1.9} />{loading ? "Add to queue" : `Convert to ${format.toUpperCase()}`}
              </Button>
              {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/8 px-3.5 py-3 text-sm leading-snug text-rose-200"><CircleAlert aria-hidden size={17} strokeWidth={1.8} className="mt-0.5 shrink-0" />{error}</p>}
            </form>
          </section>

          <AnimatePresence mode="popLayout">
            {(current || queue.length > 0) && (
              <motion.section key="queue" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} aria-label="Conversion queue" className="mt-5 rounded-[20px] border border-white/10 bg-[#171719] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400"><ListMusic aria-hidden size={16} strokeWidth={1.8} /> Queue</div>
                {current && <div>
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={current.thumbnail} alt="" className="size-11 shrink-0 rounded-xl bg-zinc-800 object-cover" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={current.title}>{current.title}</p><p className="mt-0.5 text-xs text-zinc-400">{current.format.toUpperCase()} · {stage === "preparing" ? "Finding video" : stage === "processing" ? "Preparing file" : stage === "ready" ? "Finishing" : "Downloading"}</p></div>
                    <LoaderCircle aria-hidden size={18} strokeWidth={1.8} className="animate-spin text-[var(--accent)] motion-reduce:animate-none" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400"><span>{stage === "downloading" ? "Current transfer" : stage === "processing" ? "Converting and merging" : "Getting ready"}</span><span className="font-mono tabular-nums">{progress === null ? "—" : `${Math.round(progress)}%`}</span></div>
                  <Progress value={progress ?? undefined} aria-label="Current transfer progress" className="job-progress mt-2 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[var(--accent)]" />
                </div>}
                {queue.length > 0 && <div className={`${current ? "mt-5 border-t border-white/8 pt-4" : ""} space-y-2`}>
                  <p className="mb-2 text-xs text-zinc-500">Up next · {queue.length}</p>
                  {queue.map((item, index) => <div key={`${item.url}-${index}`} className="flex items-center gap-2 text-sm text-zinc-300">
                    {item.format === "mp3" ? <Music2 aria-hidden size={15} strokeWidth={1.8} className="shrink-0 text-zinc-500" /> : <Film aria-hidden size={15} strokeWidth={1.8} className="shrink-0 text-zinc-500" />}
                    <span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-xs text-zinc-500">{item.format.toUpperCase()}</span>
                  </div>)}
                </div>}
              </motion.section>
            )}
          </AnimatePresence>

          {history.length > 0 && <section aria-label="Completed downloads" className="mt-7 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-300">Ready to save</h2><span className="font-mono text-xs text-zinc-500">{history.length} {history.length === 1 ? "file" : "files"}</span></div>
            {history.map((item, index) => <DownloadCard key={`${item.filename}-${index}`} {...item} onDownload={() => triggerDownload(item)} downloading={downloadingFile === item.filename} />)}
            {history.length > 1 && <Button type="button" variant="ghost" onClick={() => history.forEach((item, index) => setTimeout(() => triggerDownload(item), index * 900))} className="h-9 w-full rounded-xl text-xs text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:ring-[var(--accent)]"><Download aria-hidden size={15} strokeWidth={1.8} />Download all</Button>}
          </section>}
          <footer className="mt-12 text-center font-mono text-[11px] text-zinc-600">Made for your own media. Runs locally on your computer.</footer>
        </div>

        <AnimatePresence>{showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} autoDownload={autoDownload} setAutoDownload={setAutoDownload} theme={theme} setTheme={setTheme} format={format} audioQuality={audioQuality} setAudioQuality={setAudioQuality} videoQuality={videoQuality} setVideoQuality={setVideoQuality} />}</AnimatePresence>
        <AnimatePresence>{showTos && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <motion.div role="dialog" aria-modal="true" aria-labelledby="terms-title" initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="w-full max-w-[440px] rounded-[22px] border border-white/10 bg-[#19191c] p-6 shadow-2xl shadow-black/70">
            <h2 id="terms-title" className="text-lg font-semibold tracking-tight">Use YouRip responsibly</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">Convert videos you own or have permission to download. You&apos;re responsible for following the applicable site terms and copyright rules.</p>
            {showTosDetail && <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto rounded-xl border border-white/8 bg-[#121214] p-4 text-xs leading-relaxed text-zinc-400">
              <p><strong className="text-zinc-200">Acceptable use.</strong> Personal, non-commercial use for content you own or have permission to download.</p>
              <p><strong className="text-zinc-200">Copyright.</strong> Do not download copyrighted content without permission. Follow applicable laws and YouTube&apos;s Terms of Service.</p>
              <p><strong className="text-zinc-200">No warranty.</strong> This local tool is provided as is, without warranties. You are responsible for how you use it.</p>
            </div>}
            <div className="mt-6 flex gap-2.5">
              <Button type="button" variant="outline" onClick={() => setShowTosDetail(value => !value)} className="h-10 flex-1 rounded-xl border-white/12 bg-transparent text-zinc-200 hover:bg-white/5 hover:text-white focus-visible:ring-[var(--accent)]">{showTosDetail ? "Hide terms" : "View terms"}</Button>
              <Button type="button" onClick={() => setShowTos(false)} className="h-10 flex-1 rounded-xl font-semibold hover:brightness-110 focus-visible:ring-[var(--accent)]" style={{ backgroundColor: accent, color: theme === "green" || theme === "blue" ? "#111" : "#fff" }}>I agree</Button>
            </div>
          </motion.div>
        </motion.div>}</AnimatePresence>
      </main>
    </MotionConfig>
  );
}
