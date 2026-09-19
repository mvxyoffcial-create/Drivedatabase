import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { 
  UploadCloud, CheckCircle2, AlertCircle, File, Zap, Shield, 
  Loader2, Layers, HardDrive, Cpu, Check
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { StoredFile } from '../types';

interface UploadZoneProps {
  onUploadSuccess: (newFiles: StoredFile[]) => void;
}

interface QueuedItem {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [uploadDetails, setUploadDetails] = useState<string>('');
  const [queueSummary, setQueueSummary] = useState<{ totalFiles: number; totalBytes: number; currentIdx: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentlyUploaded, setRecentlyUploaded] = useState<StoredFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Upload single large file via Terabyte-scale chunked streaming pipeline
  const uploadLargeFileChunked = async (
    file: File,
    onChunkProgress: (uploadedBytesInFile: number) => void
  ): Promise<StoredFile> => {
    // 10MB chunk slices for high speed without memory spikes
    const CHUNK_SIZE = 10 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Initialize upload session
    const initRes = await fetch('/api/upload/chunk/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalChunks,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ error: 'Upload initialization failed' }));
      throw new Error(err.error || 'Failed to initialize Terabyte-scale upload session');
    }

    const { uploadId } = await initRes.json();
    const startTime = Date.now();
    let uploadedBytes = 0;

    // 2. Upload chunks sequentially
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append('uploadId', uploadId);
      chunkFormData.append('chunkIndex', chunkIndex.toString());
      chunkFormData.append('chunk', chunkBlob, `${uploadId}_${chunkIndex}`);

      const chunkRes = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: chunkFormData,
      });

      if (!chunkRes.ok) {
        throw new Error(`Failed uploading slice ${chunkIndex + 1} of ${totalChunks}`);
      }

      uploadedBytes += chunkBlob.size;
      onChunkProgress(uploadedBytes);

      const progressPercent = Math.round((uploadedBytes / file.size) * 95);
      setUploadProgress(progressPercent);

      // Measure transfer rate
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds > 0) {
        const mbps = ((uploadedBytes / 1024 / 1024) / elapsedSeconds).toFixed(1);
        setUploadSpeed(`${mbps} MB/s`);
        const remainingBytes = file.size - uploadedBytes;
        const etaSeconds = Math.max(1, Math.round(remainingBytes / (uploadedBytes / elapsedSeconds)));
        setUploadDetails(
          `Slice ${chunkIndex + 1}/${totalChunks} • ${formatBytes(uploadedBytes)} of ${formatBytes(file.size)} • ~${etaSeconds}s ETA`
        );
      }
    }

    // 3. Assemble chunks and verify SHA256
    setUploadDetails('Finalizing Terabyte-scale storage node assembly & SHA-256 validation...');
    const completeRes = await fetch('/api/upload/chunk/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        mimeType: file.type,
        totalChunks,
        fileSize: file.size,
      }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({ error: 'Assembly failed' }));
      throw new Error(err.error || 'Failed to assemble file chunks on storage node');
    }

    const { file: storedFile } = await completeRes.json();
    return storedFile;
  };

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Support thousands of GBs per session (5,000 GB / 5 TB per file)
    const maxSizeBytes = 5000 * 1024 * 1024 * 1024;
    const oversized = files.find((f) => f.size > maxSizeBytes);
    if (oversized) {
      setErrorMessage(`File "${oversized.name}" exceeds the 5,000 GB (5 TB) per-session limit.`);
      return;
    }

    const totalBatchBytes = files.reduce((acc, f) => acc + f.size, 0);

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setOverallProgress(0);
    setUploadSpeed('');
    setQueueSummary({
      totalFiles: files.length,
      totalBytes: totalBatchBytes,
      currentIdx: 1,
    });
    setUploadDetails(`Starting batch pipeline for ${files.length} file(s) [${formatBytes(totalBatchBytes)}]...`);

    try {
      const completed: StoredFile[] = [];
      let cumulativeUploadedBytes = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setQueueSummary({
          totalFiles: files.length,
          totalBytes: totalBatchBytes,
          currentIdx: i + 1,
        });
        setUploadProgress(0);

        let previousFileBytes = 0;
        const result = await uploadLargeFileChunked(file, (uploadedInThisFile) => {
          const delta = uploadedInThisFile - previousFileBytes;
          previousFileBytes = uploadedInThisFile;
          cumulativeUploadedBytes += delta;
          const overallPct = Math.min(99, Math.round((cumulativeUploadedBytes / totalBatchBytes) * 100));
          setOverallProgress(overallPct);
        });

        completed.push(result);
      }

      setIsUploading(false);
      setUploadProgress(100);
      setOverallProgress(100);
      setQueueSummary(null);
      setRecentlyUploaded(completed);
      onUploadSuccess(completed);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to complete Terabyte-scale batch upload');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mb-10">
      <div
        id="drop-zone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 shadow-2xl shadow-cyan-950/40 scale-[1.01]'
            : 'border-zinc-800 hover:border-cyan-500/50 bg-zinc-900/40 hover:bg-zinc-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload-input"
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-800/80 group-hover:bg-cyan-950/60 border border-zinc-700/60 group-hover:border-cyan-500/40 flex items-center justify-center mb-5 transition-colors shadow-inner">
            <UploadCloud className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>

          <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 tracking-tight">
            {isDragging ? 'Drop thousands of GBs here for instant hosting' : 'Drag & drop files or browse to upload'}
          </h3>

          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
            Permanent high-capacity file hosting. Queue multi-file batches with <span className="text-cyan-400 font-semibold">thousands of GBs (Terabytes)</span>. Instant direct hotlinks with 10 Gbps unthrottled downloads.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/50 border border-cyan-500/40 font-mono text-cyan-300 font-semibold flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-cyan-400" />
              Thousands of GBs (TB-Scale)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-cyan-300 flex items-center gap-1 font-mono">
              <Zap className="h-3 w-3 text-cyan-400" />
              10 Gbps Pipe
            </span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-emerald-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              100% Free &bull; Permanent
            </span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 flex items-center gap-1">
              <Layers className="h-3 w-3 text-purple-400" />
              Batch Multi-File Queue
            </span>
          </div>
        </div>

        {/* Upload progress state */}
        {isUploading && (
          <div className="mt-6 max-w-lg mx-auto p-5 rounded-2xl bg-zinc-950/95 border border-cyan-500/40 shadow-2xl text-left animate-in fade-in duration-200">
            {queueSummary && (
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 pb-2.5 border-b border-zinc-800 font-mono">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  File {queueSummary.currentIdx} of {queueSummary.totalFiles}
                </span>
                <span className="text-cyan-300">
                  Total Batch: {formatBytes(queueSummary.totalBytes)} ({overallProgress}% done)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-200 font-medium flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                <span>Terabyte Streaming Pipeline Active</span>
              </span>
              <div className="flex items-center gap-3">
                {uploadSpeed && (
                  <span className="font-mono text-cyan-300 font-medium">{uploadSpeed}</span>
                )}
                <span className="font-mono text-cyan-400 font-bold text-sm">{uploadProgress}%</span>
              </div>
            </div>

            {/* Current file progress bar */}
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* Overall batch progress bar */}
            {queueSummary && queueSummary.totalFiles > 1 && (
              <div className="mt-3 pt-2 border-t border-zinc-900">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                  <span>Batch Queue Progress:</span>
                  <span className="text-emerald-400 font-semibold">{overallProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 rounded-full"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadDetails && (
              <p className="text-[11px] font-mono text-zinc-400 truncate mt-2">{uploadDetails}</p>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {recentlyUploaded.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Successfully hosted {recentlyUploaded.length} file(s) permanently!</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {recentlyUploaded.map((f) => (
              <span
                key={f.id}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center gap-1.5 font-mono"
              >
                <File className="h-3.5 w-3.5 text-cyan-400" />
                <span className="max-w-[180px] truncate">{f.originalName}</span>
                <span className="text-zinc-400">({formatBytes(f.size)})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
