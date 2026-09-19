import React, { useState } from 'react';
import { StoredFile } from '../types';
import { generateEmbedCodes, formatBytes } from '../utils/formatters';
import { 
  X, Copy, Check, ExternalLink, Download, Code, Globe, 
  Terminal, QrCode, Zap, ShieldCheck, Eye
} from 'lucide-react';

interface HotlinkModalProps {
  file: StoredFile | null;
  onClose: () => void;
}

export const HotlinkModal: React.FC<HotlinkModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const origin = window.location.origin;
  const codes = generateEmbedCodes(file, origin);
  const [activeTab, setActiveTab] = useState<'url' | 'html' | 'markdown' | 'bbcode' | 'terminal' | 'qr'>('url');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isImg = file.mimeType.startsWith('image/');
  const isVid = file.mimeType.startsWith('video/');
  const isAud = file.mimeType.startsWith('audio/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Free Hotlink & Embed Codes</span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/40">
                  10G CDN
                </span>
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">{file.originalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Preview if media */}
          {(isImg || isVid || isAud) && (
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center justify-center">
              <div className="w-full flex items-center justify-between text-xs text-zinc-400 mb-2 px-1">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  Live Preview
                </span>
                <span className="font-mono text-[11px] text-zinc-400">{file.mimeType}</span>
              </div>
              {isImg && (
                <img
                  src={codes.rawUrl}
                  alt={file.originalName}
                  className="max-h-48 max-w-full rounded-lg object-contain border border-zinc-800"
                />
              )}
              {isVid && (
                <video
                  controls
                  src={codes.rawUrl}
                  className="max-h-48 max-w-full rounded-lg border border-zinc-800"
                />
              )}
              {isAud && (
                <audio
                  controls
                  src={codes.rawUrl}
                  className="w-full mt-2"
                />
              )}
            </div>
          )}

          {/* Primary Direct Hotlink Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-zinc-900 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Direct Permanent Hotlink (Raw File URL)
              </label>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                CORS Allowed &bull; Never Expires
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={codes.rawUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-700/80 rounded-lg text-cyan-300 focus:outline-none focus:border-cyan-400 select-all"
              />
              <button
                id="copy-raw-hotlink-btn"
                onClick={() => copyToClipboard(codes.rawUrl, 'rawUrl')}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shrink-0 transition-colors shadow-sm shadow-cyan-900"
              >
                {copiedKey === 'rawUrl' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
              <a
                href={codes.rawUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Open raw hotlink in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              Use this permanent hotlink in any HTML, stylesheet, forum, Discord embed, or media player.
            </p>
          </div>

          {/* Embed Format Selector */}
          <div>
            <div className="flex border-b border-zinc-800 gap-2 mb-4 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveTab('url')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'url'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Direct Download Link
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'html'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HTML Embed
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'markdown'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setActiveTab('bbcode')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'bbcode'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Forum BBCode
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'terminal'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                cURL / CLI
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'qr'
                    ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                QR Code
              </button>
            </div>

            {/* Tab Panels */}
            {activeTab === 'url' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Forces browser attachment download dialog with original file name:</span>
                  <button
                    onClick={() => copyToClipboard(codes.downloadUrl, 'downloadUrl')}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'downloadUrl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'downloadUrl' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800 break-all select-all">
                  {codes.downloadUrl}
                </div>
              </div>
            )}

            {activeTab === 'html' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Paste into your HTML website:</span>
                  <button
                    onClick={() => copyToClipboard(codes.html, 'html')}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'html' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'html' ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-emerald-400 border border-zinc-800 overflow-x-auto whitespace-pre-wrap select-all">
                  {codes.html}
                </pre>
              </div>
            )}

            {activeTab === 'markdown' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>For GitHub, Reddit, Notion, or Discord READMEs:</span>
                  <button
                    onClick={() => copyToClipboard(codes.markdown, 'markdown')}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'markdown' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'markdown' ? 'Copied' : 'Copy Markdown'}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-cyan-300 border border-zinc-800 break-all select-all">
                  {codes.markdown}
                </div>
              </div>
            )}

            {activeTab === 'bbcode' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>For community forums (phpBB, vBulletin, Invision):</span>
                  <button
                    onClick={() => copyToClipboard(codes.bbCode, 'bbcode')}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'bbcode' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'bbcode' ? 'Copied' : 'Copy BBCode'}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-purple-300 border border-zinc-800 break-all select-all">
                  {codes.bbCode}
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                      cURL Command
                    </span>
                    <button
                      onClick={() => copyToClipboard(codes.curl, 'curl')}
                      className="text-cyan-400 hover:underline text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'curl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === 'curl' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800 select-all overflow-x-auto">
                    {codes.curl}
                  </pre>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                      Wget Command
                    </span>
                    <button
                      onClick={() => copyToClipboard(codes.wget, 'wget')}
                      className="text-cyan-400 hover:underline text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'wget' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === 'wget' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800 select-all overflow-x-auto">
                    {codes.wget}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      codes.downloadUrl
                    )}`}
                    alt="Scan to download"
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-xs text-zinc-400 text-center max-w-xs">
                  Scan with your smartphone camera to download{' '}
                  <span className="text-white font-mono">{file.originalName}</span> immediately via 10 Gbps CDN hotlink.
                </p>
              </div>
            )}
          </div>

          {/* Technical Specs & Integrity */}
          <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px]">FILE SIZE</span>
              <span className="font-mono text-white font-medium">{formatBytes(file.size)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px]">SPEED TIER</span>
              <span className="font-mono text-cyan-400 font-medium">10 Gbps Line</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px]">HOTLINK VIEWS</span>
              <span className="font-mono text-blue-400 font-medium">{file.hotlinkViews.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px]">ATTACHMENT DOWNLOADS</span>
              <span className="font-mono text-indigo-400 font-medium">{file.downloads.toLocaleString()}</span>
            </div>
          </div>

          {file.sha256 && (
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span className="truncate mr-2">
                <span className="text-zinc-400">SHA-256:</span> {file.sha256}
              </span>
              <button
                onClick={() => copyToClipboard(file.sha256, 'sha256')}
                className="text-cyan-400 hover:text-cyan-300 text-xs shrink-0"
              >
                {copiedKey === 'sha256' ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Host node: <span className="font-mono text-cyan-400">asia-southeast1 (Google Cloud 10Gbps egress)</span>
          </span>
          <div className="flex gap-2">
            <a
              href={codes.downloadUrl}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-900"
            >
              <Download className="h-3.5 w-3.5" />
              Download File
            </a>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
