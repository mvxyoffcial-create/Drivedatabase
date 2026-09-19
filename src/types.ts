export interface StoredFile {
  id: string;
  originalName: string;
  sanitizedName: string;
  storageName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  downloads: number;
  hotlinkViews: number;
  bandwidthUsed: number;
  sha256: string;
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  totalDownloads: number;
  totalHotlinks: number;
  totalBandwidth: number;
  cdnSpeedTier: string;
  hotlinkPolicy: string;
}

export interface SpeedTestResult {
  durationMs: number;
  bytesReceived: number;
  speedMbps: number;
  speedGbps: number;
  pingMs: number;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export type FileCategory = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
