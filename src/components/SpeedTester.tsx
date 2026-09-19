import React, { useState, useRef } from 'react';
import { Gauge, Zap, Play, RotateCcw, X, CheckCircle2, Wifi, ShieldAlert } from 'lucide-react';
import { formatBytes, formatSpeed } from '../utils/formatters';

interface SpeedTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpeedTester: React.FC<SpeedTesterProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [testSizeMb, setTestSizeMb] = useState<number>(25);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentSpeedMbps, setCurrentSpeedMbps] = useState<number>(0);
  const [peakSpeedMbps, setPeakSpeedMbps] = useState<number>(0);
  const [avgSpeedMbps, setAvgSpeedMbps] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startBenchmark = async () => {
    setIsRunning(true);
    setHasCompleted(false);
    setCurrentSpeedMbps(0);
    setPeakSpeedMbps(0);
    setAvgSpeedMbps(0);
    setDownloadedBytes(0);
    setProgressPercent(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Measure TTFB / Ping
      const pingStart = performance.now();
      await fetch('/api/health', { signal: controller.signal });
      const pingDuration = Math.round(performance.now() - pingStart);
      setPingMs(pingDuration);

      // 2. Stream chunked payload from /api/speedtest
      const streamStart = performance.now();
      const response = await fetch(`/api/speedtest?size=${testSizeMb}`, {
        signal: controller.signal,
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const totalExpectedBytes = testSizeMb * 1024 * 1024;
      let totalReceived = 0;
      let lastTime = streamStart;
      let lastBytes = 0;
      let maxSpeed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          totalReceived += value.length;
          setDownloadedBytes(totalReceived);
          const percent = Math.min(100, Math.round((totalReceived / totalExpectedBytes) * 100));
          setProgressPercent(percent);

          const now = performance.now();
          const elapsedSec = (now - lastTime) / 1000;

          // Update speed calculations every ~100ms
          if (elapsedSec >= 0.1) {
            const chunkBytes = totalReceived - lastBytes;
            const instantaneousMbps = (chunkBytes * 8) / (elapsedSec * 1000000);
            
            setCurrentSpeedMbps(instantaneousMbps);
            if (instantaneousMbps > maxSpeed) {
              maxSpeed = instantaneousMbps;
              setPeakSpeedMbps(maxSpeed);
            }

            const totalElapsedSec = (now - streamStart) / 1000;
            const currentAvg = (totalReceived * 8) / (totalElapsedSec * 1000000);
            setAvgSpeedMbps(currentAvg);

            lastTime = now;
            lastBytes = totalReceived;
          }
        }
      }

      const totalTimeSec = (performance.now() - streamStart) / 1000;
      const finalAvg = (totalReceived * 8) / (totalTimeSec * 1000000);
      setAvgSpeedMbps(finalAvg);
      setCurrentSpeedMbps(finalAvg);
      setHasCompleted(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Speedtest failed:', err);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const cancelBenchmark = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                10 Gbps Download Speed Benchmark
              </h3>
              <p className="text-xs text-zinc-400">Real-time unthrottled CDN throughput test</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Main Dial / Gauge Visualization */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950 border border-zinc-800 relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>LIVE CDN THROUGHPUT</span>
            </div>

            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-blue-400 my-2">
              {isRunning
                ? formatSpeed(currentSpeedMbps)
                : hasCompleted
                ? formatSpeed(avgSpeedMbps)
                : '0.0 Mbps'}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                Ping: <strong className="text-zinc-200 font-mono">{pingMs ? `${pingMs}ms` : '--'}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Peak: <strong className="text-cyan-300 font-mono">{formatSpeed(peakSpeedMbps)}</strong>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full mt-5">
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                <span>{formatBytes(downloadedBytes)}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Configuration: Test Size */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Benchmark Payload Size:</span>
            <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 font-mono">
              {[10, 25, 50, 100].map((size) => (
                <button
                  key={size}
                  disabled={isRunning}
                  onClick={() => setTestSizeMb(size)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    testSizeMb === size
                      ? 'bg-cyan-500 text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {size}MB
                </button>
              ))}
            </div>
          </div>

          {/* Verification Badge */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
            <div className="text-white font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>10 Gbps High-Speed Verification</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Downloads and hotlinks are streamed unthrottled with HTTP Range Byte support directly through Google Cloud's 10Gbps egress backbone.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            Close
          </button>

          {isRunning ? (
            <button
              onClick={cancelBenchmark}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Stop Test
            </button>
          ) : (
            <button
              onClick={startBenchmark}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start 10G Benchmark</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
