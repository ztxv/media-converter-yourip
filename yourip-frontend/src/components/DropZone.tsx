"use client";
import { useRef, useState } from "react";

interface DropZoneProps {
  onUrlDrop: (url: string) => void;
  theme: 'red' | 'green';
}

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

// Extracts YouTube video ID from any common link format
function extractYoutubeId(url: string): string | null {
  try {
    // Clean up whitespace and decode
    url = decodeURIComponent(url.trim());
    // Match youtu.be short links
    let match = url.match(/youtu\.be\/([\w-]{11})/);
    if (match) return match[1];
    // Match youtube.com/watch?v=...
    match = url.match(/[?&]v=([\w-]{11})/);
    if (match) return match[1];
    // Match youtube.com/embed/...
    match = url.match(/youtube\.com\/embed\/([\w-]{11})/);
    if (match) return match[1];
    // Match full youtube.com/v/...
    match = url.match(/youtube\.com\/v\/([\w-]{11})/);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}

export default function DropZone({ onUrlDrop, theme }: DropZoneProps) {
  const currentTheme = themeColors[theme];
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragover");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    // Prevent file drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setError("Please drop a YouTube link, not a file.");
      return;
    }
    // Try all possible data types
    const uri = e.dataTransfer.getData("text/uri-list");
    const text = e.dataTransfer.getData("Text");
    const html = e.dataTransfer.getData("text/html");
    let link = "";
    if (uri && (uri.includes("youtube.com") || uri.includes("youtu.be"))) {
      link = uri;
    } else if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
      link = text;
    } else if (html) {
      const match = html.match(/href="([^"]*youtube[^"]*)"/);
      if (match && match[1]) link = match[1];
    }
    if (link) {
      onUrlDrop(link.trim());
    } else {
      setError("Please drop a valid YouTube link.");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const val = e.target.value.trim();
    if (val && (/youtube\.com/.test(val) || /youtu\.be/.test(val))) {
      onUrlDrop(val);
      e.target.value = "";
    } else if (val) {
      setError("Please enter a valid YouTube link.");
    }
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${
        dragActive ? 'bg-opacity-20' : 'border-[#333] bg-[#18181b] hover:bg-[#222]'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        borderColor: dragActive ? currentTheme.primary : '#333',
        backgroundColor: dragActive ? `${currentTheme.primary}20` : '#18181b',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onChange={handleInputChange}
        placeholder="Paste YouTube URL here"
      />
      <svg
        className={`w-12 h-12 mb-3 transition-colors ${
          dragActive ? 'text-[#39FF14]' : 'text-gray-400'
        }`}
        fill="none"
        stroke={dragActive ? currentTheme.primary : '#666'}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="text-center">
        <span className="font-medium text-white">Drop a YouTube link</span>
        <span className="text-gray-400"> or </span>
        <span className="font-medium text-white">Ctrl+V / Cmd+V</span>
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
