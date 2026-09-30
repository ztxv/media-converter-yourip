"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import QualitySelect from "@/components/QualitySelect";

export type Theme = "red" | "green" | "blue" | "pink" | "purple";
export type Format = "mp3" | "mp4";
export type AudioQuality = "standard" | "high" | "best";
export type VideoQuality = "compact" | "balanced" | "best";

export const themeColors: Record<Theme, string> = {
  red: "#f65a5a", green: "#61d981", blue: "#68baff", pink: "#f68bc9", purple: "#ba9aff",
};

export default function SettingsDrawer({ onClose, autoDownload, setAutoDownload, theme, setTheme, format, audioQuality, setAudioQuality, videoQuality, setVideoQuality }: {
  onClose: () => void;
  autoDownload: boolean;
  setAutoDownload: (value: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  format: Format;
  audioQuality: AudioQuality;
  setAudioQuality: (quality: AudioQuality) => void;
  videoQuality: VideoQuality;
  setVideoQuality: (quality: VideoQuality) => void;
}) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={event => event.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.2, ease: "easeOut" }} className="w-full max-w-[440px] overflow-hidden rounded-[22px] border border-white/10 bg-[#151518] text-white shadow-2xl shadow-black/70">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 id="settings-title" className="text-base font-semibold tracking-tight">Settings</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Make each download yours.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-9 text-zinc-400 hover:bg-white/8 hover:text-white" title="View project on GitHub">
              <a href="https://github.com/ztxv/media-converter-yourip" target="_blank" rel="noopener noreferrer" aria-label="View project source on GitHub">
                <Image src="/github-invertocat-white.svg" alt="" aria-hidden width={20} height={20} className="opacity-75" />
              </a>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-9 text-zinc-400 hover:bg-white/8 hover:text-white" onClick={onClose} aria-label="Close settings"><X aria-hidden size={19} strokeWidth={1.8} /></Button>
          </div>
        </div>
        <div className="max-h-[min(75vh,620px)] space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-5">
            <div>
              <label htmlFor="auto-download" className="text-sm font-medium">Automatic downloads</label>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">Save the file as soon as it is ready.</p>
            </div>
            <Switch id="auto-download" checked={autoDownload} onCheckedChange={setAutoDownload} className="data-[state=checked]:bg-[var(--accent)]" />
          </div>
          <div className="space-y-3 border-t border-white/8 pt-5">
            <div>
              <h3 className="text-sm font-medium">{format === "mp3" ? "Audio quality" : "Video quality"}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {format === "mp3" ? "Higher bitrate usually means a larger MP3. It cannot improve the original audio." : "Choose a maximum resolution. Actual quality depends on the source video."}
              </p>
            </div>
            {format === "mp3" ? (
              <QualitySelect id="audio-quality" label="MP3 bitrate" value={audioQuality} onChange={value => setAudioQuality(value as AudioQuality)} options={[
                { value: "standard", label: "Standard · 128 kbps", detail: "Smaller file" },
                { value: "high", label: "High · 192 kbps", detail: "Balanced · recommended" },
                { value: "best", label: "Best · 320 kbps", detail: "Larger file" },
              ]} />
            ) : (
              <QualitySelect id="video-quality" label="Maximum resolution" value={videoQuality} onChange={value => setVideoQuality(value as VideoQuality)} options={[
                { value: "compact", label: "Up to 480p", detail: "Smaller file" },
                { value: "balanced", label: "Up to 720p", detail: "Balanced · recommended" },
                { value: "best", label: "Up to 1080p", detail: "Higher detail, larger file" },
              ]} />
            )}
          </div>
          <div className="border-t border-white/8 pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Accent color</p>
            <div className="flex gap-2" role="group" aria-label="Accent color">
              {(Object.keys(themeColors) as Theme[]).map(color => (
                <button key={color} type="button" onClick={() => setTheme(color)} aria-label={`${color} accent`} aria-pressed={theme === color}
                  className="flex size-9 items-center justify-center rounded-full border border-transparent outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#151518] aria-pressed:border-white/80 motion-reduce:transition-none"
                  style={{ backgroundColor: themeColors[color] }}>
                  {theme === color && <Check aria-hidden size={16} strokeWidth={2.3} className="text-black/80" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
