import type { ConverterApi, JobFile, JobStatus, MediaMetadata } from "@/lib/converter-api";

async function readError(response: Response): Promise<string> {
  try { const data = await response.json(); return typeof data.detail === "string" ? data.detail : "Conversion failed."; }
  catch { return "Conversion failed. Check the terminal for details."; }
}

function filenameFromDisposition(header: string, fallback: string): string {
  const encoded = header.match(/filename\*=utf-8''([^;]+)/i);
  if (encoded) { try { return decodeURIComponent(encoded[1]); } catch {} }
  return header.match(/filename="?([^";]+)"?/)?.[1] || fallback;
}

/** The real converter: talks to the Next route handlers, which forward to the local FastAPI backend. */
export const liveApi: ConverterApi = {
  async fetchMetadata(url): Promise<MediaMetadata | null> {
    try {
      const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },
  async createJob(request) {
    const created = await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!created.ok) throw new Error(await readError(created));
    return (await created.json() as { id: string }).id;
  },
  async getJob(id) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    return await response.json() as JobStatus;
  },
  async fetchFile(id, fallbackName): Promise<JobFile> {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/file`);
    if (!response.ok) throw new Error(await readError(response));
    const blob = await response.blob();
    return { blob, filename: filenameFromDisposition(response.headers.get("content-disposition") || "", fallbackName) };
  },
};
