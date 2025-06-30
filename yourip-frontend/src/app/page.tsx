"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DropZone from "@/components/DropZone";
import DownloadCard from "@/components/DownloadCard";
import SettingsDrawer from "@/components/SettingsDrawer";

type Theme = "red" | "green" | "blue" | "pink" | "purple";

async function fetchYoutubeMeta(url: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url
      )}&format=json`
    );
    if (!res.ok) throw new Error("Could not fetch video info");
    return await res.json();
  } catch {
    return null;
  }
}

export default function Home() {
  // core states
  const [url, setUrl] = useState<string>("");
  const [queue, setQueue] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // download tracking
  const [videoMeta, setVideoMeta] = useState<{ title: string; thumbnail_url: string } | null>(null);
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

  // settings
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoDownload, setAutoDownload] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>("red");

  const themeColors = {
    red: { primary: "#FF3131", hover: "#FF3131CC", shadow: "#FF313140" },
    green: { primary: "#39FF14", hover: "#39FF14CC", shadow: "#39FF1440" },
    blue: { primary: "#00F7FF", hover: "#00F7FFCC", shadow: "#00F7FF40" },
    pink: { primary: "#FF44CC", hover: "#FF44CCCC", shadow: "#FF44CC40" },
    purple: { primary: "#9D00FF", hover: "#9D00FFCC", shadow: "#9D00FF40" },
  };
  const currentTheme = themeColors[theme];

  // Paste-to-convert
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("Text")?.trim();
      if (text && (/youtube\.com/.test(text) || /youtu\.be/.test(text))) {
        setUrl(text);
        setError(null);
        enqueueUrl(text);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // enqueue helper
  function enqueueUrl(raw: string) {
    let youtubeUrl = raw.trim();
    if (!youtubeUrl.startsWith("http")) youtubeUrl = "https://" + youtubeUrl;
    setQueue((q) => [...q, youtubeUrl]);
    setUrl("");
  }

  // form submit now just enqueues
  function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    enqueueUrl(url);
  }

  // process queue
  useEffect(() => {
    if (loading || queue.length === 0) return;

    const nextUrl = queue[0];
    setCurrent(nextUrl);
    setQueue((q) => q.slice(1));
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const meta = await fetchYoutubeMeta(nextUrl);
        if (!meta) throw new Error("Could not fetch video info");
        setVideoMeta(meta);

        const res = await fetch("http://localhost:8000/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: nextUrl }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to download video");
        }
        const blob = await res.blob();
        const cd = res.headers.get("content-disposition") || "";
        const m = cd.match(/filename="?(.+?)"?$/);
        const filename =
          m?.[1] ||
          `${meta.title}.mp3`.replace(/[^a-zA-Z0-9\-_\. ]/g, "_");

        const info = {
          blob,
          filename,
          title: meta.title,
          thumbnail: meta.thumbnail_url,
        };
        setDownloadInfo(info);
        setDownloadHistory((prev) => [info, ...prev]);
        if (autoDownload) handleManualDownload(blob, filename);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
        setCurrent(null);
      }
    })();
  }, [queue, loading]);

  function handleManualDownload(blob?: Blob, filename?: string) {
    const info = blob && filename ? { blob, filename } : downloadInfo;
    if (!info) return;

    setDownloadingFile(info.filename);
    const urlObj = window.URL.createObjectURL(info.blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = info.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(urlObj);
    setTimeout(() => setDownloadingFile(null), 1000);
  }

  async function handleDropUrl(droppedUrl: string) {
    setError(null);
    enqueueUrl(droppedUrl);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black"
      style={{ fontFamily: "Poppins, Montserrat, Inter, Arial, sans-serif" }}
    >
      <Card
        className="w-full max-w-3xl bg-[#1a1a1a] text-white shadow-lg relative"
        style={{
          boxShadow: `
            0 0 8px ${currentTheme.primary},
            0 0 16px ${currentTheme.primary}80,
            0 0 24px ${currentTheme.primary}40
          `,
        }}
      >
        <CardHeader className="flex flex-col items-center">
          <div className="w-full max-w-md mt-2 text-center">
            <pre
              className="text-[10px] md:text-xs font-mono whitespace-pre leading-3 md:leading-4 inline-block text-center"
              style={{
                color: currentTheme.primary,
                textShadow: `0 0 8px ${currentTheme.primary}, 0 0 16px ${currentTheme.primary}80`,
              }}
            >
              {String.raw`
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
                                       |__/      `}
            </pre>
          </div>
          <CardTitle className="sr-only">YouRip</CardTitle>
        </CardHeader>
        <CardContent>
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
              {loading ? "Processing…" : "Enqueue"}
            </Button>
            {error && !loading && (
              <p className="text-destructive text-sm text-center mt-2">{error}</p>
            )}
          </form>

          {/* QUEUE DISPLAY */}
          {(current || queue.length > 0) && (
            <div className="mt-6 p-4 bg-gray-800 rounded text-white">
              {current && (
                <div className="flex items-center mb-4">
                  {videoMeta?.thumbnail_url && (
                    <img
                      src={videoMeta.thumbnail_url}
                      alt="thumb"
                      className="w-12 h-12 mr-3 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">Now converting:</p>
                    <p className="truncate max-w-md">{videoMeta?.title || current}</p>
                  </div>
                  {loading && (
                    <span className="inline-block animate-spin ml-4" style={{ width: 24, height: 24 }}>
                      <svg viewBox="0 0 50 50" style={{ width: 24, height: 24 }}>
                        <circle
                          cx="25" cy="25" r="20"
                          fill="none" stroke={currentTheme.primary}
                          strokeWidth="5" strokeDasharray="90 150" strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              )}
              {queue.length > 0 && (
                <>
                  <p className="font-semibold mb-2">Up next:</p>
                  <ul className="list-disc list-inside text-gray-300">
                    {queue.map((u, i) => (
                      <li key={i} className="truncate max-w-lg">{u}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* Single Download Card */}
          {downloadInfo && (
            <DownloadCard
              {...downloadInfo}
              onDownload={() =>
                handleManualDownload(downloadInfo.blob, downloadInfo.filename)
              }
              downloading={downloadInfo.filename === downloadingFile}
              theme={theme}
            />
          )}

          {/* Previous Downloads */}
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
                    (async () => {
                      for (const item of downloadHistory.slice(1)) {
                        await new Promise<void>((res) => {
                          handleManualDownload(item.blob, item.filename);
                          setTimeout(res, 1000);
                        });
                      }
                    })();
                  }}
                >
                  Download All
                </Button>
              </div>
              <div
                className="w-full bg-[#1a1a1a] p-4 rounded-lg max-h-64 overflow-y-auto resize-y"
                style={{ boxShadow: `0 0 4px ${currentTheme.primary}80` }}
              >
                {downloadHistory.slice(1).map((item, idx) => (
                  <DownloadCard
                    key={idx}
                    {...item}
                    onDownload={() =>
                      handleManualDownload(item.blob, item.filename)
                    }
                    downloading={item.filename === downloadingFile}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Settings Button */}
        <div className="fixed bottom-8 right-8 z-30">
          <button
            className={`p-3 rounded-full transition-all transform hover:scale-110 shadow-lg ${
              { green: "bg-[#39FF14] hover:bg-[#39FF14CC] text-black",
                blue: "bg-[#00F7FF] hover:bg-[#00F7FFCC] text-black",
                pink: "bg-[#FF44CC] hover:bg-[#FF44CCCC] text-white",
                purple: "bg-[#9D00FF] hover:bg-[#9D00FFCC] text-white",
                red: "bg-[#FF3131] hover:bg-[#FF3131CC] text-white" }[theme]
            }`}
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
      </Card>
    </div>
  );
}
