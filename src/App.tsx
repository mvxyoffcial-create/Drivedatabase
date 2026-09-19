import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { UploadZone } from './components/UploadZone';
import { FileList } from './components/FileList';
import { HotlinkModal } from './components/HotlinkModal';
import { SpeedTester } from './components/SpeedTester';
import { ApiDocsModal } from './components/ApiDocsModal';
import { TelegramBotModal } from './components/TelegramBotModal';
import { StoredFile, StorageStats } from './types';
import { Zap, ShieldCheck, Globe, RefreshCw, Cpu, CheckCircle, Code, ArrowRight, Bot, Server } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedHotlinkFile, setSelectedHotlinkFile] = useState<StoredFile | null>(null);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState<boolean>(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadSuccess = (newFiles: StoredFile[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
    // Refresh full stats
    fetchFiles();
    // Auto-open hotlink modal for the first uploaded file so user immediately gets the link
    if (newFiles.length > 0) {
      setSelectedHotlinkFile(newFiles[0]);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        fetchFiles();
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onOpenApiDocs={() => setIsApiDocsOpen(true)}
        onOpenTelegramBot={() => setIsTelegramModalOpen(true)}
        fileCount={files.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-medium mb-4">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>Permanent Hosting &bull; Thousands of GBs (TB-Scale) &bull; Multi-File Batch Queue &bull; 10 Gbps Speed &bull; Free Hotlinks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
            Fast Permanent File Hosting <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
              with Free Instant Hotlinks
            </span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Upload images, 4K videos, massive game archives, ISOs, and raw datasets with <strong className="text-zinc-200">thousands of GBs (Terabytes)</strong>. Get permanent direct links with no bandwidth caps, no hotlink protection blocks, and full 10 Gbps download speeds.
          </p>
        </div>

        {/* Real-time Storage & Network Metrics */}
        <StatsBanner stats={stats} />

        {/* Drag-and-Drop Uploader */}
        <UploadZone onUploadSuccess={handleUploadSuccess} />

        {/* File Manager with Search, Sort, Filter, Hotlinks */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 sm:p-8">
          <FileList
            files={files}
            onOpenHotlink={(file) => setSelectedHotlinkFile(file)}
            onDeleteFile={handleDeleteFile}
            isLoading={isLoading}
          />
        </div>

        {/* Public Developer API Callout Banner */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-cyan-950/30 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
              <Code className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white">Public REST API Open to Anyone</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  No Auth
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-xl">
                Upload and serve files programmatically from any website, script, Python bot, or CLI with full CORS support, chunked streaming, and permanent direct URLs.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsApiDocsOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-cyan-950/50"
          >
            <span>Explore Public API</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Telegram Bot & Koyeb Port 8080 Callout Banner */}
        <div className="mt-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-zinc-900/70 to-blue-950/30 border border-cyan-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white">Upload via Telegram &bull; Host on Koyeb (Port 8080)</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Port 8080
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-xl">
                Send files directly to your Telegram Bot and receive instant permanent hotlinks in chat. Includes native Koyeb Docker &amp; Persistent Volume configuration for Port 8080.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-cyan-950/50"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Configure Telegram Bot</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Technical Highlights / Why FastLink Section */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="h-9 w-9 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">10 Gbps Unthrottled Egress</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Files are delivered with HTTP Byte Range support. Large files, 4K videos, and archives download at maximum network speed with zero bandwidth throttles.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="h-9 w-9 rounded-lg bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">100% Free Hotlink Embedding</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every file is served with <code className="text-cyan-300 font-mono">Access-Control-Allow-Origin: *</code>. Embed freely on any external website, app, markdown document, or forum.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">Permanent &amp; Immutable Storage</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Files never expire unless explicitly deleted by you. Stored with cryptographic SHA-256 validation for permanent reliability.
            </p>
          </div>
        </div>
      </main>

      {/* Hotlink & Embed Codes Modal */}
      <HotlinkModal
        file={selectedHotlinkFile}
        onClose={() => setSelectedHotlinkFile(null)}
      />

      {/* 10 Gbps Speed Benchmark Modal */}
      <SpeedTester
        isOpen={isSpeedTestOpen}
        onClose={() => setIsSpeedTestOpen(false)}
      />

      {/* Public REST API Modal */}
      <ApiDocsModal
        isOpen={isApiDocsOpen}
        onClose={() => setIsApiDocsOpen(false)}
      />

      {/* Telegram Bot & Koyeb Port 8080 Modal */}
      <TelegramBotModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* Clean Footer */}
      <footer className="mt-16 border-t border-zinc-800/80 bg-zinc-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-300">FASTLINK 10G</span>
            <span>&bull;</span>
            <span>Permanent File Hosting &amp; Free Hotlink CDN</span>
            <span className="hidden md:inline">&bull;</span>
            <span className="hidden md:inline text-zinc-500 font-mono">Port 8080 (Koyeb Ready)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Telegram Bot</span>
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setIsApiDocsOpen(true)}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Code className="h-3.5 w-3.5" />
              <span>Public API</span>
            </button>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              10 Gbps Cloud Node Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
