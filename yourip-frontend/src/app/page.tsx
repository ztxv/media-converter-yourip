"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import DropZone from "@/components/DropZone";
import DownloadCard from "@/components/DownloadCard";

type Theme = 'red' | 'green';

async function fetchYoutubeMeta(url: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) throw new Error("Could not fetch video info");
    return await res.json();
  } catch {
    return null;
  }
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [theme, setTheme] = useState<Theme>('red');
  const [downloadHistory, setDownloadHistory] = useState<Array<{
    blob: Blob;
    filename: string;
    title: string;
    thumbnail: string;
  }>>([]);
  
  const themeColors = {
    red: {
      primary: '#FF3131',
      hover: '#FF3131CC',
      shadow: '#FF313140',
    },
    green: {
      primary: '#39FF14',
      hover: '#39FF14CC',
      shadow: '#39FF1440',
    },
  };

  const currentTheme = themeColors[theme];



  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoMeta, setVideoMeta] = useState<{ title: string; thumbnail_url: string } | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{
    blob: Blob;
    filename: string;
    title: string;
    thumbnail: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Paste-to-convert: Listen for paste events anywhere on the page
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("Text")?.trim();
      if (text && (/youtube\.com/.test(text) || /youtu\.be/.test(text))) {
        setUrl(text);
        setError(null);
        handleConvert(text);
      }
    }
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
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      if (!youtubeRegex.test(youtubeUrl)) throw new Error("Please enter a valid YouTube URL");
      const meta = await fetchYoutubeMeta(youtubeUrl);
      if (!meta) throw new Error("Could not fetch video info");
      setVideoMeta(meta);
      const response = await fetch("http://localhost:8000/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to download video");
      }
      const blob = await response.blob();
      let filename = meta.title ? `${meta.title}.mp3` : "youtube-audio.mp3";
      filename = filename.replace(/[^a-zA-Z0-9\-_\. ]/g, "_");
      const info = {
        blob,
        filename,
        title: meta.title,
        thumbnail: meta.thumbnail_url,
      };
      setDownloadInfo(info);
      setDownloadHistory(prev => [info, ...prev]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setDownloadInfo(null);
      setVideoMeta(null);
      setProgress(0);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1200);
    }
  }

  function handleManualDownload(blob?: Blob, filename?: string) {
    if (!blob || !filename) {
      if (!downloadInfo) return;
      blob = downloadInfo.blob;
      filename = downloadInfo.filename;
    }
    setDownloading(true);
    const urlObj = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(urlObj);
    setTimeout(() => setDownloading(false), 1000);
  }

  async function handleDropUrl(droppedUrl: string) {
    setUrl(droppedUrl);
    setError(null);
    handleConvert(droppedUrl);
  }

  return (
    <div className="min-h-screen flex items-center justify-center transition-colors duration-500 bg-black" style={{ fontFamily: 'Poppins, Montserrat, Inter, Arial, sans-serif' }}>
      <Card className="w-full max-w-3xl shadow-lg bg-[#1a1a1a] border-[#333] text-white relative">
        <CardHeader className="flex flex-col items-center">
          <div className="flex flex-col items-center w-full">
            <img 
              src="/yourip-logo.png" 
              alt="YouRip logo" 
              className="w-36 h-36 drop-shadow-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2IxYjFiMSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MxLjY2IDAgMyAxLjM0IDMgM3MtMS4zNCAzLTMgMy0zLTEuMzQtMy0zIDEuMzQtMyAzLTN6bTAgMTQuMmMtMi41IDAgNC43MS0xLjI4LTYtMy4yMi4wMy0xLjk5IDQtMy4wOCA2LTMuMDggMS45OSAwIDUuOTcgMS4xIDYgMy4wOC0xLjI5IDEuOTQtMy41IDMuMjItNiAzLjIyeiIvPjwvc3ZnPg==';
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
{` /$$     /$$                  /$$$$$$$  /$$          
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
          </div>
          <CardTitle className="sr-only">YouRip</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConvert} className="flex flex-col gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Paste your YouTube URL"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                required
                className={`bg-[#18181b] text-white border-2 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 ${
                  theme === 'green' ? 'focus:ring-[#39FF14] border-[#39FF14]' : 'focus:ring-[#FF3131] border-[#FF3131]'
                }`}
                style={{
                  color: 'white',
                  caretColor: currentTheme.primary,
                }}
              />
            </div>
            <DropZone onUrlDrop={handleDropUrl} theme={theme} />
            <Button type="submit" className="w-full font-bold transition" style={{ backgroundColor: currentTheme.primary, color: theme === 'green' ? 'black' : 'white' }} disabled={loading || !url}>
              {loading ? "Converting..." : "Convert"}
            </Button>
            {loading && (
              <div className="flex justify-center mt-4 mb-2">
                <span className="inline-block animate-spin" style={{ width: 36, height: 36 }}>
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
                    >
                    </circle>
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
              title={downloadInfo.title}
              thumbnail={downloadInfo.thumbnail}
              filename={downloadInfo.filename}
              onDownload={() => handleManualDownload(downloadInfo.blob, downloadInfo.filename)}
              downloading={downloading}
              theme={theme}
              downloadIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            />
          )}
          {/* Download history (excluding current) */}
          {downloadHistory.length > 1 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2 text-center text-gray-400">Previous Downloads</h3>
              <div className="flex flex-col gap-4">
                {downloadHistory.slice(1).map((item, index) => (
                  <DownloadCard
                    key={index}
                    title={item.title}
                    thumbnail={item.thumbnail}
                    filename={item.filename}
                    onDownload={() => handleManualDownload(item.blob, item.filename)}
                    downloading={downloading && item.filename === downloadInfo?.filename}
                    theme={theme}
                    downloadIcon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
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
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          onClick={() => setShowSettings(!showSettings)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>

        {/* Settings Menu */}
        {showSettings && (
          <div className="absolute right-4 top-16 bg-[#111] border border-[#333] rounded-lg shadow-xl z-50 w-64 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[#999] hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Auto-download</span>
                <Switch 
                  checked={autoDownload}
                  onCheckedChange={setAutoDownload}
                  style={{ backgroundColor: autoDownload ? currentTheme.primary : undefined }}
                />
              </div>
              
              <div>
                <div className="text-sm text-gray-300 mb-2">Theme</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTheme('red')}
                    className={`px-3 py-1.5 text-sm rounded-md ${theme === 'red' ? 'bg-[#FF3131] text-white' : 'bg-[#333] text-white'}`}
                  >
                    Red
                  </button>
                  <button 
                    onClick={() => setTheme('green')}
                    className={`px-3 py-1.5 text-sm rounded-md ${theme === 'green' ? 'bg-[#39FF14] text-black' : 'bg-[#333] text-white'}`}
                  >
                    Green
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}