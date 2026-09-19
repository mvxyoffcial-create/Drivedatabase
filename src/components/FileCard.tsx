import React, { useState } from 'react';
import { StoredFile } from '../types';
import { formatBytes, getFileCategory, getHotlinkUrl, getDownloadUrl } from '../utils/formatters';
import { 
  FileText, Image, Video, Music, Archive, FileCode, File, 
  Globe, Download, Copy, Check, Trash2, Zap, ExternalLink
} from 'lucide-react';

interface FileCardProps {
  file: StoredFile;
  onOpenHotlink: (file: StoredFile) => void;
  onDeleteFile: (id: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onOpenHotlink, onDeleteFile }) => {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const category = getFileCategory(file.mimeType, file.originalName);
  const origin = window.location.origin;
  const rawUrl = getHotlinkUrl(file, origin);
  const downloadUrl = getDownloadUrl(file, origin);

  const handleCopyHotlink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'image':
        return <Image className="h-5 w-5 text-emerald-400" />;
      case 'video':
        return <Video className="h-5 w-5 text-blue-400" />;
      case 'audio':
        return <Music className="h-5 w-5 text-purple-400" />;
      case 'archive':
        return <Archive className="h-5 w-5 text-amber-400" />;
      case 'document':
        return <FileText className="h-5 w-5 text-indigo-400" />;
      default:
        return <File className="h-5 w-5 text-cyan-400" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div 
      className="group relative rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 p-4 flex flex-col justify-between"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              {getCategoryIcon()}
            </div>
            <div className="min-w-0">
              <h4 
                className="text-sm font-semibold text-zinc-100 truncate group-hover:text-cyan-300 transition-colors cursor-pointer"
                title={file.originalName}
                onClick={() => onOpenHotlink(file)}
              >
                {file.originalName}
              </h4>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span>{formatBytes(file.size)}</span>
                <span>&bull;</span>
                <span>{timeAgo(file.uploadedAt)}</span>
              </div>
            </div>
          </div>

          <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <Zap className="h-3 w-3 text-cyan-400" />
            10G
          </span>
        </div>

        {/* Hotlink preview URL pill */}
        <div className="mb-4">
          <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/70 flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            <span className="truncate text-zinc-400 max-w-[200px] sm:max-w-xs">{rawUrl}</span>
            <button
              onClick={handleCopyHotlink}
              className="text-cyan-400 hover:text-cyan-300 shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
              title="Copy direct permanent hotlink"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-sans text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span className="font-sans text-[11px]">Hotlink</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time stats */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50 mb-4">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-blue-400" />
            <span>Hotlinks: <strong className="text-zinc-200 font-mono">{file.hotlinkViews}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="h-3 w-3 text-indigo-400" />
            <span>Downloads: <strong className="text-zinc-200 font-mono">{file.downloads}</strong></span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-2">
        <button
          onClick={() => onOpenHotlink(file)}
          className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Hotlink & Embed</span>
        </button>

        <a
          href={downloadUrl}
          className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          title="Direct High-Speed Download"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>

        <button
          onClick={() => {
            if (window.confirm(`Permanently remove "${file.originalName}"?`)) {
              onDeleteFile(file.id);
            }
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          title="Delete file"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
