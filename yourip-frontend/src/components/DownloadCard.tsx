"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DownloadCardProps {
  title: string;
  thumbnail: string;
  filename: string;
  onDownload: () => void;
  downloading: boolean;
  downloadIcon?: React.ReactNode;
  theme: 'red' | 'green' | 'blue' | 'pink' | 'purple';
}

export default function DownloadCard({
  title,
  thumbnail,
  filename,
  onDownload,
  downloading,
  downloadIcon,
  theme
}: DownloadCardProps) {
  return (
    <Card className={`flex flex-row items-center gap-4 mt-4 p-3 bg-[#111] border-[#222] ${
      theme === 'green' ? 'hover:border-[#39FF14]' :
      theme === 'blue' ? 'hover:border-[#00F7FF]' :
      theme === 'pink' ? 'hover:border-[#FF44CC]' :
      theme === 'purple' ? 'hover:border-[#9D00FF]' :
      'hover:border-[#FF3131]'
    } transition-colors`}>
      <img 
        src={thumbnail} 
        alt={title} 
        className="w-16 h-16 rounded-md object-cover border border-[#333]" 
      />
      <div className="flex-1 min-w-0">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="truncate text-base font-medium text-white">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-xs truncate text-[#999]">
          {filename}
        </CardContent>
      </div>
      <Button 
        onClick={onDownload} 
        disabled={downloading} 
        className={`ml-2 ${
          theme === 'green' ? 'bg-[#39FF14] hover:bg-[#39FF14CC] text-black' :
          theme === 'blue' ? 'bg-[#00F7FF] hover:bg-[#00F7FFCC] text-black' :
          theme === 'pink' ? 'bg-[#FF44CC] hover:bg-[#FF44CCCC] text-white' :
          theme === 'purple' ? 'bg-[#9D00FF] hover:bg-[#9D00FFCC] text-white' :
          'bg-[#FF3131] hover:bg-[#FF3131CC] text-white'
        } font-medium`}
      >
        {downloading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block animate-spin">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
              </svg>
            </span>
            Preparing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {downloadIcon || (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            Download
          </span>
        )}
      </Button>
    </Card>
  );
}
