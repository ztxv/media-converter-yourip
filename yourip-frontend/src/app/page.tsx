"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import DropZone from "@/components/DropZone";
import DownloadCard from "@/components/DownloadCard";

type Theme = "red" | "green";

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
  const [showSettings, setShowSettings] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [theme, setTheme] = useState<Theme>("red");
  const [downloadHistory, setDownloadHistory] = useState<
    Array<{ blob: Blob; filename: string; title: string; thumbnail: string }>
  >([]);

  const themeColors = {
    red: { primary: "#FF3131", hover: "#FF3131CC", shadow: "#FF313140" },
    green: { primary: "#39FF14", hover: "#39FF14CC", shadow: "#39FF1440" },
  };
  const currentTheme = themeColors[theme];

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ title: string; thumbnail_url: string } | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{
    blob: Blob;
    filename: string;
    title: string;
    thumbnail: string;
  } | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Paste-to-convert
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("Text")?.trim();
      if (text && (/youtube\.com/.test(text) || /youtu\.be/.test(text))) {
        setUrl(text);
        setError(null);
        handleConvert(text);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  async function handleConvert(eOrUrl?: React.FormEvent | string) {
    if (eOrUrl && typeof eOrUrl !== "string") {
      eOrUrl.preventDefault();
    }
    setError(null);
    setLoading(true);

    try {
      let youtubeUrl = typeof eOrUrl === "string" ? eOrUrl.trim() : url.trim();
      if (!youtubeUrl.startsWith("http")) youtubeUrl = "https://" + youtubeUrl;
      if (
        !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(
          youtubeUrl
        )
      ) {
        throw new Error("Please enter a valid YouTube URL");
      }

      const meta = await fetchYoutubeMeta(youtubeUrl);
      if (!meta) throw new Error("Could not fetch video info");
      setVideoMeta(meta);

      const response = await fetch("http://localhost:8000/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to download video");
      }

      const blob = await response.blob();
      let filename = "youtube-audio.mp3";
      const cd = response.headers.get("content-disposition");
      if (cd) {
        const m = cd.match(/filename="?(.+?)"?$/);
        if (m && m[1]) filename = m[1];
      } else {
        filename = `${meta.title}.mp3`.replace(
          /[^a-zA-Z0-9\-_\. ]/g,
          "_"
        );
      }

      // ─── unified update (only once) ───
      const info = {
        blob,
        filename,
        title: meta.title,
        thumbnail: meta.thumbnail_url,
      };
      setDownloadInfo(info);
      setDownloadHistory((prev) => [info, ...prev]);
      if (autoDownload) {
        handleManualDownload(blob, filename);
      }
      // ──────────────────────────────────

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setDownloadInfo(null);
      setVideoMeta(null);
    } finally {
      setLoading(false);
    }
  }

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
    setUrl(droppedUrl);
    setError(null);
    handleConvert(droppedUrl);
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
          <img
            src="/yourip-logo.png"
            alt="YouRip logo"
            className="w-36 h-36 drop-shadow-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2IxYjFiMSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MxLjY2IDAgMyAxLjM0IDMgM3MtMS4zNCAzLTMgMy0zLTEuMzQtMy0zIDEuMzQtMyAzLTN6bTAgMTQuMmMtMi41IDAgNC43MS0xLjI4LTYtMy4yMi4wMy0xLjk5IDQtMy4wOCA2LTMuMDggMS45OSAwIDUuOTcgMS4xIDYgMy4wOC0xLjI5IDEuOTQtMy41IDMuMjItNiAzLjIyeiIvPjwvc3ZnPg==';
            }}
          />
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
                theme === "green"
                  ? "border-[#39FF14] focus:ring-[#39FF14]"
                  : "border-[#FF3131] focus:ring-[#FF3131]"
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
                color: theme === "green" ? "black" : "white",
              }}
            >
              {loading ? "Converting..." : "Convert"}
            </Button>
            {loading && (
              <div className="flex justify-center mt-4 mb-2">
                <span
                  className="inline-block animate-spin"
                  style={{ width: 36, height: 36 }}
                >
                  <svg viewBox="0 0 50 50" style={{ width: 36, height: 36 }}>
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
              </div>
            )}
            {error && !loading && (
              <p className="text-destructive text-sm text-center mt-2">{error}</p>
            )}
          </form>

          {downloadInfo && (
            <DownloadCard
              {...downloadInfo}
              onDownload={() =>
                handleManualDownload(downloadInfo.blob, downloadInfo.filename)
              }
              downloading={downloadInfo.filename === downloadingFile}
              theme={theme}
              downloadIcon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
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
                  // remove variant="outline"
                  className="border-2 px-3 py-1.5 rounded-md hover:bg-opacity-10 transition"
                  style={{
                    color: currentTheme.primary,
                    borderColor: currentTheme.primary,
                    backgroundColor: "transparent",
                  }}
                  onClick={() => {
                    const processDownloads = async () => {
                      for (const item of downloadHistory.slice(1)) {
                        await new Promise((resolve) => {
                          handleManualDownload(item.blob, item.filename);
                          setTimeout(resolve, 1000); // Slightly longer delay between downloads
                        });
                      }
                    };
                    processDownloads();
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
                    downloadIcon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Settings Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={() => setShowSettings((v) => !v)}
        >
          ⚙️
        </button>

        {/* Settings Menu */}
        {showSettings && (
          <div className="absolute top-16 right-4 w-64 p-4 bg-[#111] border border-[#333] rounded-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[#999] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-300">Auto Download</span>
              <Switch
                checked={autoDownload}
                onCheckedChange={setAutoDownload}
                style={{
                  backgroundColor: autoDownload
                    ? currentTheme.primary
                    : undefined,
                }}
              />
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-2">Theme</div>
              <div className="flex gap-2">
                {(["red", "green"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      theme === t
                        ? `bg-[${themeColors[t].primary}] text-${
                            t === "green" ? "black" : "white"
                          }`
                        : "bg-[#333] text-white"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}