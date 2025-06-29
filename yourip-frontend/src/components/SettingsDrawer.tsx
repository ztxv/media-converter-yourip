"use client";
import { Switch } from "@/components/ui/switch";

export default function SettingsDrawer({
  open,
  onClose,
  autoDownload,
  setAutoDownload,
}: {
  open: boolean;
  onClose: () => void;
  autoDownload: boolean;
  setAutoDownload: (v: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-[#39FF14] p-6 rounded-t-2xl shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Settings</h3>
          <button 
            onClick={onClose}
            className="text-[#999] hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Switch</h4>
              <p className="text-sm text-[#999] mt-1">
                simple switch
              </p>
            </div>
            <Switch 
              checked={autoDownload} 
              onCheckedChange={setAutoDownload}
              className="data-[state=checked]:bg-[#39FF14]"
            />
          </div>
          
          <div className="pt-4 border-t border-[#222]">
            <div className="flex items-center gap-3 text-sm text-[#999] hover:text-[#39FF14] transition-colors cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M19.4 15C19.2669 15.3016 19.227 15.6362 19.286 15.9606C19.3449 16.285 19.5005 16.5843 19.73 16.82L19.79 16.88C19.906 16.9962 19.9968 17.1355 20.0569 17.2895C20.117 17.4434 20.1452 17.6087 20.14 17.775C20.127 18.0824 20.0223 18.3798 19.8403 18.6288C19.6583 18.8777 19.4078 19.0669 19.1235 19.1715C18.8392 19.2761 18.5353 19.2918 18.2425 19.2166C17.9497 19.1414 17.6822 18.9784 17.476 18.75L17.41 18.68C17.1746 18.4505 16.8753 18.2949 16.5509 18.2359C16.2265 18.177 15.8919 18.2169 15.59 18.35C15.286 18.485 15.027 18.7 14.8431 18.9685C14.6593 19.237 14.5575 19.5486 14.55 19.868C14.545 20.0984 14.4895 20.325 14.3874 20.5326C14.2853 20.7401 14.1388 20.9238 13.9586 21.0708C13.7785 21.2179 13.5689 21.3251 13.3456 21.3854C13.1223 21.4457 12.8906 21.4578 12.6625 21.421C12.4344 21.3842 12.2156 21.299 12.0228 21.1708C11.83 21.0426 11.6679 20.8741 11.5483 20.6775C11.4287 20.4809 11.3544 20.2609 11.33 20.033C11.2968 19.7158 11.3543 19.395 11.4958 19.109C11.6373 18.823 11.857 18.5838 12.128 18.421C12.396 18.257 12.698 18.1502 13.01 18.11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Help & Support</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
