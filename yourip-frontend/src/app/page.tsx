// app/page.tsx (or pages/index.tsx)
"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DropZone from "@/components/DropZone";
import DownloadCard from "@/components/DownloadCard";
import SettingsDrawer from "@/components/SettingsDrawer";

type Theme = "red" | "green" | "blue" | "pink" | "purple";

interface VideoMeta {
  url: string;
  title: string;
  thumbnail_url: string;
}

async function fetchYoutubeMetaRaw(url: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url
      )}&format=json`
    );
    if (!res.ok) throw new Error("Could not fetch video info");
    return (await res.json()) as { title: string; thumbnail_url: string };
  } catch {
    return null;
  }
}

export default function Home() {
  // CORE STATES
  const [url, setUrl] = useState("");
  const [queue, setQueue] = useState<VideoMeta[]>([]);
  const [current, setCurrent] = useState<VideoMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DOWNLOAD TRACKING
  const [downloadInfo, setDownloadInfo] = useState<{
    blob: Blob;
    filename: string;
    title: string;
    thumbnail: string;
  } | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<
    Array<{ blob: Blob; filename: string; title: string; thumbnail: string }>
  >([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // SETTINGS
  const [showSettings, setShowSettings] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [theme, setTheme] = useState<Theme>("red");

  // TOS MODAL STATES
  const [showTos, setShowTos] = useState(true);
  const [showTosDetail, setShowTosDetail] = useState(false);

  const themeColors = {
    red: { primary: "#FF3131", hover: "#FF3131CC", shadow: "#FF313140" },
    green: { primary: "#39FF14", hover: "#39FF14CC", shadow: "#39FF1440" },
    blue: { primary: "#00F7FF", hover: "#00F7FFCC", shadow: "#00F7FF40" },
    pink: { primary: "#FF44CC", hover: "#FF44CCCC", shadow: "#FF44CC40" },
    purple: { primary: "#9D00FF", hover: "#9D00FFCC", shadow: "#9D00FF40" },
  } as const;
  const currentTheme = themeColors[theme];

  // PASTE-TO-CONVERT
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("Text")?.trim();
      if (text && (/youtube\.com/.test(text) || /youtu\.be/.test(text))) {
        attemptEnqueue(text);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [queue]);

  // ENQUEUE WITH LIMIT
  async function attemptEnqueue(raw: string) {
    if (queue.length >= 5) {
      setError("Queue full (max 5). Wait until a slot frees up.");
      return;
    }
    let youtubeUrl = raw.trim();
    if (!youtubeUrl.startsWith("http")) youtubeUrl = "https://" + youtubeUrl;
    setError(null);

    const meta = await fetchYoutubeMetaRaw(youtubeUrl);
    if (!meta) {
      setError("Invalid YouTube link or metadata fetch failed.");
      return;
    }

    setQueue((q) => [
      ...q,
      { url: youtubeUrl, title: meta.title, thumbnail_url: meta.thumbnail_url },
    ]);
    setUrl("");
  }

  // FORM SUBMIT
  function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    attemptEnqueue(url);
  }

  // PROCESS QUEUE
  useEffect(() => {
    if (loading || queue.length === 0) return;

    const next = queue[0];
    setCurrent(next);
    setQueue((q) => q.slice(1));
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const backendHost =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
            ? "192.168.1.212:8000"
            : `${window.location.hostname}:8000`;

        const res = await fetch(`http://${backendHost}/api/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: next.url }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Download failed");
        }
        const blob = await res.blob();
        const cd = res.headers.get("content-disposition") || "";
        const m = cd.match(/filename="?(.+?)"?$/);
        const filename =
          m?.[1] ||
          `${next.title}.mp3`.replace(/[^a-zA-Z0-9\-_\. ]/g, "_");

        const info = {
          blob,
          filename,
          title: next.title,
          thumbnail: next.thumbnail_url,
        };
        setDownloadInfo(info);
        setDownloadHistory((h) => [info, ...h]);
        if (autoDownload) triggerDownload(blob, filename);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
        setCurrent(null);
      }
    })();
  }, [queue, loading, autoDownload]);

  function triggerDownload(blob: Blob, filename: string) {
    setDownloadingFile(filename);
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(urlObj);
    setTimeout(() => setDownloadingFile(null), 1000);
  }

  async function handleDropUrl(droppedUrl: string) {
    attemptEnqueue(droppedUrl);
  }

  return (
    <div
      className="min-h-screen flex items-start justify-center bg-black pt-12"
      style={{ fontFamily: "Poppins, Montserrat, Inter, Arial, sans-serif" }}
    >
      {/* MAIN CONTENT (blurs when TOS is open) */}
      <div className={showTos ? "filter blur-sm transition-filter duration-200" : ""}>
        <div className="w-full max-w-3xl text-white relative px-4">
          {/* ASCII Logo */}
          <div className="flex flex-col items-center mt-2 text-center">
            <pre
              className="text-[10px] md:text-xs font-mono whitespace-pre leading-3 md:leading-4 inline-block"
              style={{
                color: currentTheme.primary,
                textShadow: `0 0 8px ${currentTheme.primary}, 0 0 16px ${currentTheme.primary}80`,
              }}
            >{String.raw`
/$$     /$$                  /$$$$$$$  /$$          
|  $$   /$$/                 | $$__  $$|__/          
\  $$ /$$//$$$$$$  /$$   /$$| $$  \ $$ /$$  /$$$$$$ 
\  $$$$//$$__  $$| $$  | $$| $$$$$$$/| $$ /$$__  $$
 \  $$/| $$  \ $$| $$  | $$| $$__  $$| $$| $$  \ $$
  | $$ | $$  | $$| $$  | $$| $$  \ $$| $$| $$  | $$
  | $$ |  $$$$$$/|  $$$$$$/| $$  | $$| $$| $$$$$$$/
  |__/  \______/  \______/ |__/  |__/|__/| $$____/ 
                                       | $$      
                                       | $$      
                                       |__/     `}</pre>
          </div>

          {/* INPUT & BUTTON */}
          <div className="mt-6">
            <form onSubmit={handleConvert} className="flex flex-col gap-4">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="Paste your YouTube URL"
                disabled={loading}
                required
                className={`bg-[#18181b] text-white border-2 rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                  { green: "border-[#39FF14] focus:ring-[#39FF14]",
                    blue: "border-[#00F7FF] focus:ring-[#00F7FF]",
                    pink: "border-[#FF44CC] focus:ring-[#FF44CC]",
                    purple: "border-[#9D00FF] focus:ring-[#9D00FF]",
                    red: "border-[#FF3131] focus:ring-[#FF3131]" }[theme]
                }`}
                style={{ caretColor: currentTheme.primary }}
              />
              <DropZone onUrlDrop={handleDropUrl} theme={theme} />
              <Button
                type="submit"
                disabled={loading || !url}
                className="w-full font-bold"
                style={{
                  backgroundColor: currentTheme.primary,
                  color: ["green", "blue"].includes(theme) ? "black" : "white",
                }}
              >
                {loading ? "Processing…" : "Convert"}
              </Button>
              {error && !loading && (
                <p className="text-destructive text-sm text-center mt-2">{error}</p>
              )}
            </form>

            {/* NOW CONVERTING & QUEUE */}
            {(current || queue.length > 0) && (
              <div className="mt-6 p-4 bg-gray-800 rounded text-white">
                {current && (
                  <div className="flex items-center mb-4">
                    <img
                      src={current.thumbnail_url}
                      alt="thumb"
                      className="w-12 h-12 mr-3 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">Now converting:</p>
                      <p className="truncate max-w-md">{current.title}</p>
                    </div>
                    {loading && (
                      <span
                        className="inline-block animate-spin ml-4"
                        style={{ width: 24, height: 24 }}
                      >
                        <svg viewBox="0 0 50 50" style={{ width: 24, height: 24 }}>
                          <circle
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            stroke={currentTheme.primary}
                            strokeWidth="5"
                            strokeDasharray="90 150"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                )}
                {queue.length > 0 && (
                  <>
                    <p className="font-semibold mb-2">Up next:</p>
                    <ul className="space-y-2">
                      {queue.map((vid, i) => (
                        <li key={i} className="flex items-center">
                          <img
                            src={vid.thumbnail_url}
                            alt="next thumb"
                            className="w-8 h-8 mr-2 rounded"
                          />
                          <span className="truncate">{vid.title}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* DOWNLOAD CARD */}
            {downloadInfo && (
              <DownloadCard
                {...downloadInfo}
                onDownload={() =>
                  triggerDownload(downloadInfo.blob, downloadInfo.filename)
                }
                downloading={downloadInfo.filename === downloadingFile}
                theme={theme}
              />
            )}

            {/* PREVIOUS DOWNLOADS */}
            {downloadHistory.length > 1 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-400">
                    Previous Downloads
                  </h3>
                  <Button
                    className="border-2 px-3 py-1.5 rounded-md hover:bg-opacity-10 transition"
                    style={{
                      color: currentTheme.primary,
                      borderColor: currentTheme.primary,
                      backgroundColor: "transparent",
                    }}
                    onClick={() => {
                      downloadHistory
                        .slice(1)
                        .forEach((it, idx) =>
                          setTimeout(
                            () => triggerDownload(it.blob, it.filename),
                            idx * 1000
                          )
                        );
                    }}
                  >
                    Download All
                  </Button>
                </div>
                <div className="w-full bg-[#1a1a1a] p-4 rounded-lg max-h-64 overflow-y-auto resize-y">
                  {downloadHistory.slice(1).map((item, idx) => (
                    <DownloadCard
                      key={idx}
                      {...item}
                      onDownload={() => triggerDownload(item.blob, item.filename)}
                      downloading={item.filename === downloadingFile}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SETTINGS BUTTON */}
          <div className="fixed bottom-8 right-8 z-30">
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Settings"
              className={`p-3 rounded-full transition-all transform hover:scale-110 shadow-lg ${
                { green: "bg-[#39FF14] hover:bg-[#39FF14CC] text-black",
                  blue: "bg-[#00F7FF] hover:bg-[#00F7FFCC] text-black",
                  pink: "bg-[#FF44CC] hover:bg-[#FF44CCCC] text-white",
                  purple: "bg-[#9D00FF] hover:bg-[#9D00FFCC] text-white",
                  red: "bg-[#FF3131] hover:bg-[#FF3131CC] text-white" }[theme]
              }`}
            >
              {/* SVG gear icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>

          {showSettings && (
            <SettingsDrawer
              open={showSettings}
              onClose={() => setShowSettings(false)}
              autoDownload={autoDownload}
              setAutoDownload={setAutoDownload}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </div>
      </div>

      {/* TERMS OF SERVICE MODAL */}
      {showTos && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-filter backdrop-blur-sm z-50 p-4">
          <div className="bg-[#1a1a1a] text-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* BRIEF PROMPT */}
            {!showTosDetail && (
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-center">
                  By using this site you agree to our Terms of Service
                </h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowTos(false)}
                    className="flex-1 py-2 border-2 border-gray-400 rounded text-gray-300 hover:border-gray-200 hover:text-white font-medium"
                  >
                    I Agree
                  </button>
                  <button
                    onClick={() => setShowTosDetail(true)}
                    className="flex-1 py-2 border-2 border-gray-400 rounded text-gray-300 hover:border-gray-200 hover:text-white font-medium"
                  > 
                    View Terms
                  </button>
                </div>
              </div>
            )}

            {/* DETAILED TOS */}
            {showTosDetail && (
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-center">
                  Terms of Service
                </h2>
                <div className="text-sm space-y-4 max-h-[60vh] overflow-y-auto">
                  <p>
                    <strong>1. Acceptable Use</strong><br/>
                    This service is provided for personal, non-commercial use only. You may only convert videos that you own or have permission to download.
                  </p>
                  <p>
                    <strong>2. Copyright Notice</strong><br/>
                    This tool is for downloading content you have rights to. Downloading copyrighted material without permission is prohibited.
                  </p>
                  <p>
                    <strong>3. Fair Use</strong><br/>
                    You agree to use this service in compliance with all applicable laws, including copyright laws and YouTube's Terms of Service.
                  </p>
                  <p>
                    <strong>4. No Warranty</strong><br/>
                    This service is provided "as is" without any warranties. We are not responsible for any damages resulting from its use.
                  </p>
                  <p>
                    <strong>5. Limitation of Liability</strong><br/>
                    We are not liable for any damages, losses, or legal consequences resulting from misuse of this service.
                  </p>
                  <p>
                    <strong>6. Changes to Terms</strong><br/>
                    We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.
                  </p>
                </div>
                <button
                  onClick={() => setShowTos(false)}
                  className="w-full mt-6 py-2 bg-[#FF3131] hover:bg-[#E62929] rounded text-white font-bold transition-colors"
                >
                  I Agree
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
