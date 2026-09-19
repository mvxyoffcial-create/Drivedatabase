import React from 'react';
import { StorageStats } from '../types';
import { formatBytes } from '../utils/formatters';
import { HardDrive, Globe, DownloadCloud, Activity, Zap } from 'lucide-react';

interface StatsBannerProps {
  stats: StorageStats | null;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Download Speed</span>
          <Zap className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
          10 Gbps
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Unthrottled Line Burst</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Permanent Files</span>
          <HardDrive className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-white">
          {stats ? stats.totalFiles : 0}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          {stats ? formatBytes(stats.totalBytes) : '0 Bytes'} hosted
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Hotlink Requests</span>
          <Globe className="h-4 w-4 text-blue-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
          {stats ? stats.totalHotlinks.toLocaleString() : 0}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          Free CORS &bull; Direct Embed
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Bandwidth</span>
          <Activity className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-300">
          {stats ? formatBytes(stats.totalBandwidth) : '0 Bytes'}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
          <DownloadCloud className="h-3 w-3 text-zinc-400" />
          <span>{stats ? stats.totalDownloads.toLocaleString() : 0} direct downloads</span>
        </div>
      </div>
    </div>
  );
};
