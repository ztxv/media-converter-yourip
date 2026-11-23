import type { AudioQuality, Format, VideoQuality } from "@/components/SettingsDrawer";

export interface MediaMetadata { title: string; thumbnail_url: string }
export interface JobRequest { url: string; format: Format; audio_quality: AudioQuality; video_quality: VideoQuality }
export interface JobStatus { status: "preparing" | "downloading" | "processing" | "ready" | "error"; progress: number | null; error: string | null }
export interface JobFile { blob: Blob; filename: string }

/** Everything the page needs from a converter. Methods reject with an Error whose message is safe to show. */
export interface ConverterApi {
  fetchMetadata(url: string): Promise<MediaMetadata | null>;
  createJob(request: JobRequest): Promise<string>;
  getJob(id: string): Promise<JobStatus>;
  fetchFile(id: string, fallbackName: string): Promise<JobFile>;
}
