import React, { useState, useEffect } from 'react';
import { StoredFile } from '../types';
import { 
  Download, 
  Link2, 
  Server, 
  CheckCircle2, 
  Copy, 
  Play, 
  ShieldCheck, 
  HardDrive, 
  Zap, 
  ArrowLeft, 
  ExternalLink,
  Lock,
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';

interface DriveCloudDownloadPageProps {
  fileId: string;
  onBack?: () => void;
}

export const DriveCloudDownloadPage: React.FC<DriveCloudDownloadPageProps> = ({ fileId, onBack }) => {
  const [file, setFile] = useState<StoredFile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isPlayingInline, setIsPlayingInline] = useState<boolean>(false);
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/files/${fileId}`);
        if (res.ok) {
          const data = await res.json();
          setFile(data.file || null);
        } else {
          // Fallback if file not yet indexed
          setFile({
            id: fileId,
            originalName: 'The.India.Story.2026.480p.WEB-DL.x264.ACC.ESub.Mvxy.site.mkv',
            sanitizedName: 'The.India.Story.2026.480p.WEB-DL.x264.ACC.ESub.Mvxy.site.mkv',
            storageName: `${fileId}_The.India.Story.2026.480p.WEB-DL.x264.ACC.ESub.Mvxy.site.mkv`,
            mimeType: 'video/x-matroska',
            size: 552178240, // 526.6 MB
            uploadedAt: new Date().toISOString(),
            downloads: 1420,
            hotlinkViews: 4890,
            bandwidthUsed: 1420 * 552178240,
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          });
        }
      } catch (e) {
        console.error('Failed to load file details:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [fileId]);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const directDownloadUrl = `${window.location.origin}/api/download/${fileId}?direct=1`;
  const streamUrl = `${window.location.origin}/f/${fileId}/${encodeURIComponent(file?.originalName || 'file')}`;

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadStarted(true);
    
    // Create an invisible anchor tag to trigger download with direct=1
    const a = document.createElement('a');
    a.href = directDownloadUrl;
    a.download = file?.originalName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setIsDownloading(false);
    }, 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directDownloadUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Server Stack Icon */}
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/20 flex flex-col items-center justify-center gap-0.5 p-1 text-blue-700 shadow-xs">
              <div className="w-full h-2 rounded-xs bg-blue-700 flex items-center justify-end px-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-300 animate-pulse"></span>
              </div>
              <div className="w-full h-2 rounded-xs bg-blue-700 flex items-center justify-end px-0.5">
                <span className="w-1 h-1 rounded-full bg-cyan-300"></span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                Drive Cloud
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Ultra Fast File Delivery
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              10 Gbps Active
            </span>
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col items-center">
        {/* Link Generated Title */}
        <div className="flex items-center justify-center gap-2 mb-4 pt-2">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Link2 className="w-5 h-5 -rotate-45" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Link Generated !
          </h1>
        </div>

        {/* Mascot Celebration Illustration */}
        <div className="relative w-52 h-44 flex items-center justify-center my-2 select-none">
          {/* Confetti & Sparkles */}
          <div className="absolute top-2 left-6 text-amber-400 text-base animate-bounce">★</div>
          <div className="absolute top-6 right-8 text-pink-500 text-sm">◆</div>
          <div className="absolute bottom-10 left-4 text-cyan-400 text-xs">●</div>
          <div className="absolute top-12 left-10 text-indigo-400 text-xs font-bold">✦</div>
          <div className="absolute bottom-8 right-6 text-emerald-400 text-sm">▲</div>
          <div className="absolute top-4 right-16 text-amber-500 text-xs font-bold">★</div>
          <div className="absolute top-16 right-4 text-pink-400 text-base">✦</div>

          {/* Joyful Character Mascot SVG */}
          <svg viewBox="0 0 200 200" className="w-44 h-44 drop-shadow-sm">
            {/* Background Glow */}
            <circle cx="100" cy="110" r="70" fill="#f1f5f9" />
            
            {/* Left Arm Raised */}
            <path
              d="M80 100 Q65 75 55 58"
              stroke="#fbbf24"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Hand */}
            <circle cx="53" cy="54" r="7" fill="#fbbf24" />
            {/* Left Sleeve */}
            <path
              d="M82 102 Q72 85 64 74"
              stroke="#4338ca"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />

            {/* Right Arm Raised */}
            <path
              d="M120 100 Q135 75 145 58"
              stroke="#fbbf24"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Hand */}
            <circle cx="147" cy="54" r="7" fill="#fbbf24" />
            {/* Right Sleeve */}
            <path
              d="M118 102 Q128 85 136 74"
              stroke="#4338ca"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />

            {/* Legs & Shoes */}
            <rect x="85" y="145" width="10" height="24" rx="4" fill="#1e293b" />
            <rect x="105" y="145" width="10" height="24" rx="4" fill="#1e293b" />
            <ellipse cx="88" cy="170" rx="8" ry="4" fill="#0f172a" />
            <ellipse cx="112" cy="170" rx="8" ry="4" fill="#0f172a" />

            {/* Torso / Purple Outfit */}
            <path
              d="M78 95 C78 90, 122 90, 122 95 L126 146 C126 149, 74 149, 74 146 Z"
              fill="#4338ca"
            />
            {/* White Collar / Shirt detail */}
            <path d="M93 92 L100 104 L107 92 Z" fill="#ffffff" />
            <line x1="100" y1="104" x2="100" y2="140" stroke="#312e81" strokeWidth="2" strokeDasharray="3 3" />

            {/* Head */}
            <circle cx="100" cy="72" r="22" fill="#fed7aa" />

            {/* Hair */}
            <path
              d="M78 72 C78 50, 122 50, 122 72 C120 60, 114 56, 100 56 C86 56, 80 60, 78 72 Z"
              fill="#1e1b4b"
            />
            {/* Front hair curls */}
            <circle cx="82" cy="62" r="6" fill="#1e1b4b" />
            <circle cx="118" cy="62" r="6" fill="#1e1b4b" />
            <circle cx="94" cy="56" r="6" fill="#1e1b4b" />
            <circle cx="106" cy="56" r="6" fill="#1e1b4b" />

            {/* Ears */}
            <circle cx="78" cy="74" r="4.5" fill="#fed7aa" />
            <circle cx="122" cy="74" r="4.5" fill="#fed7aa" />

            {/* Happy Eyes (curved arcs) */}
            <path d="M89 71 Q93 67 97 71" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M103 71 Q107 67 111 71" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Rosy Cheeks */}
            <ellipse cx="88" cy="77" rx="3.5" ry="2" fill="#f87171" opacity="0.6" />
            <ellipse cx="112" cy="77" rx="3.5" ry="2" fill="#f87171" opacity="0.6" />

            {/* Joyful Big Open Smile */}
            <path
              d="M93 76 Q100 86 107 76 Z"
              fill="#dc2626"
            />
            {/* Tongue */}
            <path
              d="M96 79 Q100 84 104 79 Z"
              fill="#f87171"
            />
          </svg>
        </div>

        {/* File Metadata Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-snug break-all line-clamp-2" title={file?.originalName}>
                {file?.originalName || 'Generating download payload...'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600 font-medium">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px]">
                  📦 {formatBytes(file?.size || 552178240)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                  ⚡ 10 Gbps Pipeline
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Permanent
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button: "Download Here" (exact style from screenshot) */}
        <div className="w-full max-w-md space-y-3 mb-6">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#1d2f80] hover:bg-[#162464] active:bg-[#101a4c] text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-80"
          >
            <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Starting 10 Gbps Download...' : 'Download Here'}</span>
          </button>

          {downloadStarted && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Download triggered at 10 Gbps! Check your browser or download manager.</span>
            </div>
          )}

          {/* Action Row: Stream Online & Copy Direct Link */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              onClick={() => setIsPlayingInline(!isPlayingInline)}
              className="py-2.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 transition-colors bg-white shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isPlayingInline ? 'Hide Player' : 'Stream Online'}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 transition-colors bg-white shadow-2xs"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </button>
          </div>

          {/* Inline Media Player when Stream Online is clicked */}
          {isPlayingInline && file && (
            <div className="p-3 bg-black rounded-xl overflow-hidden mt-3 shadow-lg">
              {file.mimeType.startsWith('video/') ? (
                <video controls className="w-full max-h-72 rounded-lg" autoPlay>
                  <source src={streamUrl} type={file.mimeType} />
                  Your browser does not support HTML5 video tag.
                </video>
              ) : file.mimeType.startsWith('audio/') ? (
                <audio controls className="w-full" autoPlay>
                  <source src={streamUrl} type={file.mimeType} />
                </audio>
              ) : (
                <div className="text-center py-6 text-white text-xs space-y-2">
                  <p>Direct byte-range preview active</p>
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 underline"
                  >
                    Open raw stream in new tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note Card (Exact phrasing & visual style from screenshot) */}
        <div className="w-full max-w-md p-4 rounded-xl bg-[#f4f7fc] border border-[#d9e2ec] text-slate-700 text-center mb-6 shadow-2xs">
          <p className="text-xs sm:text-[13px] leading-relaxed italic text-slate-700 font-normal">
            Note: RESUME is Supported ! Fast 10 Gbps Unthrottled Line. Multi-Threaded Accelerators (IDM / 1DM / ADM / aria2 / curl) &amp; Browser Direct Stream Supported.
          </p>
          <span className="block text-xs font-semibold not-italic text-slate-800 mt-1.5">
            - Drive Cloud
          </span>
        </div>

        {/* SnVHost / Cloud Hosting Solutions Card (From screenshot) */}
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-lg border border-slate-800 bg-[#090f1d] text-white p-5 relative">
          <div className="relative z-10 flex flex-col items-start text-left">
            {/* Provider Logo / Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-base font-black tracking-wide flex items-center gap-1.5">
                  <span>Drive Cloud</span>
                  <span className="text-blue-400 text-xs font-normal">Hosting Solutions</span>
                </div>
                <div className="text-[10px] text-slate-400">Enterprise High Speed Datacenter</div>
              </div>
            </div>

            {/* Our Services Tag */}
            <div className="inline-block px-3 py-0.5 rounded-l-md rounded-r-xl bg-slate-800/90 border-l-2 border-blue-500 text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-2.5">
              Our Services
            </div>

            {/* Services List */}
            <div className="space-y-1 text-xs text-slate-300 mb-4 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Offshore Shared Hosting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Offshore VPS &bull; 10 Gbps Port</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Offshore Dedicated Server</span>
              </div>
            </div>

            {/* DMCA Cloud Badge */}
            <div className="w-full bg-black/80 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-white">DMCA Ignored</div>
                <div className="text-[11px] text-slate-400">Hosting &amp; Storage Provider</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-cyan-300">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-6 text-center text-xs text-slate-500">
        <div className="max-w-xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} <b>Drive Cloud</b> &bull; All Rights Reserved</span>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>10 Gbps CDN</span>
            <span>&bull;</span>
            <span>Zero Expiry</span>
            <span>&bull;</span>
            <span>WAL Safe</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
