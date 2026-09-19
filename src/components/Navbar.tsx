import React from 'react';
import { Zap, HardDrive, ShieldCheck, Gauge, Code, Bot } from 'lucide-react';

interface NavbarProps {
  onOpenSpeedTest: () => void;
  onOpenApiDocs: () => void;
  onOpenTelegramBot: () => void;
  fileCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSpeedTest, onOpenApiDocs, onOpenTelegramBot, fileCount }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
            <Zap className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">
                FASTLINK<span className="text-cyan-400">10G</span>
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Thousands of GBs &bull; 10G CDN
              </span>
            </div>
            <p className="text-xs text-zinc-400">Permanent File Hosting &bull; Thousands of GBs (TB-Scale) &bull; Free Hotlinks</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Permanent Storage</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-cyan-400 font-mono">Zero Throttle</span>
          </div>

          <button
            id="telegram-bot-nav-btn"
            onClick={onOpenTelegramBot}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-cyan-950/50 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 transition-all hover:border-cyan-400 active:scale-95"
            title="Telegram Bot (4 GB MTProto Pipeline) & Koyeb Port 8080 Setup"
          >
            <Bot className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Telegram Bot (4 GB)</span>
            <span className="sm:hidden">Bot 4GB</span>
          </button>

          <button
            id="public-api-nav-btn"
            onClick={onOpenApiDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-all hover:border-emerald-500/40 active:scale-95"
            title="Public REST API & Developer Docs"
          >
            <Code className="h-4 w-4 text-emerald-400" />
            <span>Public API</span>
          </button>

          <button
            id="speed-test-nav-btn"
            onClick={onOpenSpeedTest}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-300 border border-cyan-500/30 transition-all hover:shadow-md hover:shadow-cyan-950/30 active:scale-95"
            title="Benchmark real-time download bandwidth"
          >
            <Gauge className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">10G Speed Test</span>
            <span className="sm:hidden">10G Test</span>
          </button>
        </div>
      </div>
    </header>
  );
};
