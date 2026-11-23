/**
 * Simulated converter for the hosted demo. Pure in-browser: no network calls, no files, no backend.
 * It mirrors the real job lifecycle (preparing -> downloading -> processing -> ready) and the real error
 * messages so the real interface behaves exactly as it does locally.
 */
import type { ConverterApi, JobFile, JobRequest, JobStatus, MediaMetadata } from "@/lib/converter-api";

interface SampleVideo { title: string; thumbnail: string; fails?: boolean }

/** Fictional titles and local SVG artwork; nothing here is fetched from YouTube. */
const SAMPLES: Record<string, SampleVideo> = {
  demoSynth01: { title: "Midnight Drive — Synthwave Mix", thumbnail: "/demo/thumb-synth.svg" },
  demoRain001: { title: "Rain on a Tin Roof · 1 Hour of Ambient Sound", thumbnail: "/demo/thumb-rain.svg" },
  demoCoffee1: { title: "Pour-Over Coffee at Home: A Beginner's Guide", thumbnail: "/demo/thumb-coffee.svg" },
  demoGone001: { title: "Unavailable Video (simulated error)", thumbnail: "/demo/thumb-error.svg", fails: true },
};
const GENERIC_THUMBNAIL = "/demo/thumb-generic.svg";

const ALLOWED_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"];
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Same rules as the real backend's URL check, minus any network access. Returns the video id or an error message. */
function parseVideoId(raw: string): { id: string } | { error: string } {
  let text = raw.trim().replace(/^["']+|["']+$/g, "");
  if (!/^https?:\/\//.test(text)) text = `https://${text}`;
  let parsed: URL;
  try { parsed = new URL(text); } catch { return { error: "Please enter a valid YouTube video link." }; }
  if (!["http:", "https:"].includes(parsed.protocol) || !ALLOWED_HOSTS.includes(parsed.hostname) || parsed.username || parsed.password)
    return { error: "Please enter a valid YouTube video link." };
  const parts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
  let id = "";
  if (parsed.hostname === "youtu.be") id = parts[0];
  else if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") || "";
  else if (parts.length === 2 && ["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1];
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return { error: "Use a link to a single YouTube video, not a channel or playlist." };
  return { id };
}

function describe(id: string): SampleVideo {
  return SAMPLES[id] ?? { title: `Sample video · ${id}`, thumbnail: GENERIC_THUMBNAIL };
}

interface DemoJob { startedAt: number; request: JobRequest; video: SampleVideo }
const jobs = new Map<string, DemoJob>();
let counter = 0;

/** How long each phase of a simulated job lasts, by format and quality. */
function timeline(request: JobRequest) {
  if (request.format === "mp3") {
    const transfer = { standard: 3000, high: 4200, best: 6000 }[request.audio_quality];
    return { preparing: 900, transfer, streams: 1, processing: 1500 };
  }
  const transfer = { compact: 4500, balanced: 7000, best: 10500 }[request.video_quality];
  // MP4 downloads a video stream and then an audio stream, like the real converter.
  return { preparing: 1100, transfer, streams: 2, processing: 2400 };
}

/** Eased 0..100 so the bar moves a little unevenly, like a real transfer. */
function curve(fraction: number): number {
  const t = Math.min(1, Math.max(0, fraction));
  return 100 * (0.8 * t + 0.2 * t * t * (3 - 2 * t));
}

function snapshot(job: DemoJob, now: number): JobStatus {
  const elapsed = now - job.startedAt;
  const { preparing, transfer, streams, processing } = timeline(job.request);
  if (elapsed < preparing) return { status: "preparing", progress: null, error: null };
  const sinceTransfer = elapsed - preparing;
  if (sinceTransfer < transfer) {
    // Two streams for MP4: ~75% of the time on video, then ~25% on audio. Each stream's bar runs 0..100.
    const split = streams === 2 ? 0.75 : 1;
    const fraction = sinceTransfer / transfer;
    const streamFraction = fraction < split ? fraction / split : (fraction - split) / (1 - split);
    const progress = Math.round(curve(streamFraction) * 10) / 10;
    if (job.video.fails && fraction >= 0.4)
      return { status: "error", progress, error: "Conversion failed. The video may be restricted, unavailable, or missing the selected quality. Check the terminal for details." };
    return { status: "downloading", progress, error: null };
  }
  if (job.video.fails) return { status: "error", progress: null, error: "Conversion failed. The video may be restricted, unavailable, or missing the selected quality. Check the terminal for details." };
  if (sinceTransfer - transfer < processing) return { status: "processing", progress: null, error: null };
  return { status: "ready", progress: 100, error: null };
}

export const demoApi: ConverterApi = {
  async fetchMetadata(url): Promise<MediaMetadata | null> {
    await wait(280);
    const parsed = parseVideoId(url);
    if ("error" in parsed) return null;
    const video = describe(parsed.id);
    return { title: video.title, thumbnail_url: video.thumbnail };
  },
  async createJob(request) {
    await wait(150);
    const parsed = parseVideoId(request.url);
    if ("error" in parsed) throw new Error(parsed.error);
    const id = `demo-${++counter}-${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(id, { startedAt: Date.now(), request, video: describe(parsed.id) });
    return id;
  },
  async getJob(id) {
    const job = jobs.get(id);
    if (!job) throw new Error("Conversion job not found.");
    return snapshot(job, Date.now());
  },
  async fetchFile(id, fallbackName): Promise<JobFile> {
    // Deliberately no real file: an empty placeholder Blob that the page never offers for saving in demo mode.
    const job = jobs.get(id);
    if (!job) throw new Error("Conversion job not found.");
    if (snapshot(job, Date.now()).status !== "ready") throw new Error("The file is not ready yet.");
    const name = job.video.title.replace(/[\x00-\x1f\\/*?:"<>|]/g, "").trim().slice(0, 120) || fallbackName.replace(/\.[^.]+$/, "") || "YouTube media";
    return { blob: new Blob([]), filename: `${name}.${job.request.format}` };
  },
};
