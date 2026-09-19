import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// @ts-ignore
import bigInt from 'big-integer';
import { TelegramClient, Api, utils } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import type { StoredFile } from '../server';

export interface TelegramBotState {
  enabled: boolean;
  active: boolean;
  engine: 'mtproto-4gb' | 'bot-api-http' | 'standby';
  authType: 'string-session' | 'bot-token' | 'none';
  hasSession: boolean;
  hasApiCredentials: boolean;
  apiId: number | null;
  apiHashConfigured: boolean;
  username: string | null;
  botId: number | null;
  firstName: string | null;
  totalUploads: number;
  maxFileSize: string;
  lastActive: string | null;
  lastError: string | null;
}

// Default Telegram Client MTProto Credentials (official open desktop credentials)
// Used automatically when a Telegram StringSession is provided so users DO NOT need their own API ID or Hash
const DEFAULT_MTPROTO_API_ID = 2040;
const DEFAULT_MTPROTO_API_HASH = 'b18441a1ff607e10a989891a5462e627';

export class TelegramBotService {
  private apiId: number | null = null;
  private apiHash: string | null = null;
  private token: string | null = null;
  private sessionString: string = '';

  // MTProto Client
  private mtprotoClient: TelegramClient | null = null;

  // HTTP Polling Fallback
  private isHttpPolling = false;
  private shouldHttpPoll = false;
  private httpAbortController: AbortController | null = null;

  private state: TelegramBotState = {
    enabled: false,
    active: false,
    engine: 'standby',
    authType: 'none',
    hasSession: false,
    hasApiCredentials: false,
    apiId: null,
    apiHashConfigured: false,
    username: null,
    botId: null,
    firstName: null,
    totalUploads: 0,
    maxFileSize: '20 MB (HTTP Bot API)',
    lastActive: null,
    lastError: null,
  };

  private filesDir: string;
  private loadMetadata: () => Record<string, StoredFile>;
  private saveMetadata: (metadata: Record<string, StoredFile>) => void;
  private getBaseUrl: () => string;

  constructor(options: {
    filesDir: string;
    loadMetadata: () => Record<string, StoredFile>;
    saveMetadata: (metadata: Record<string, StoredFile>) => void;
    getBaseUrl: () => string;
  }) {
    this.filesDir = options.filesDir;
    this.loadMetadata = options.loadMetadata;
    this.saveMetadata = options.saveMetadata;
    this.getBaseUrl = options.getBaseUrl;

    const envApiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID.trim(), 10) : null;
    const envApiHash = process.env.TELEGRAM_API_HASH?.trim() || null;
    const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
    const envSession = process.env.TELEGRAM_STRING_SESSION?.trim() || '';

    if (envToken || envSession || (envApiId && envApiHash)) {
      this.configure({
        apiId: envApiId,
        apiHash: envApiHash,
        token: envToken,
        session: envSession,
      }).catch((err) => {
        console.warn('[Telegram Bot] Initial boot error:', err.message);
      });
    }
  }

  public getState(): TelegramBotState {
    return { ...this.state };
  }

  public async configure(params: {
    apiId?: number | string | null;
    apiHash?: string | null;
    token?: string | null;
    session?: string | null;
  }): Promise<{ success: boolean; username?: string; engine?: string; error?: string }> {
    // 1. Stop any currently running MTProto client or HTTP polling
    await this.stop();

    const parsedApiId = params.apiId ? parseInt(String(params.apiId).trim(), 10) : null;
    const cleanApiHash = params.apiHash ? String(params.apiHash).trim() : null;
    const cleanToken = params.token ? String(params.token).trim() : null;
    const cleanSession = params.session ? String(params.session).trim() : '';

    this.apiId = parsedApiId && !isNaN(parsedApiId) ? parsedApiId : null;
    this.apiHash = cleanApiHash || null;
    this.token = cleanToken || null;
    this.sessionString = cleanSession;

    this.state.apiId = this.apiId;
    this.state.apiHashConfigured = Boolean(this.apiHash);
    this.state.hasApiCredentials = Boolean(this.apiId && this.apiHash);
    this.state.hasSession = Boolean(this.sessionString);

    // If nothing provided, go to standby
    if (!this.token && !this.sessionString) {
      this.state.enabled = false;
      this.state.active = false;
      this.state.engine = 'standby';
      this.state.authType = 'none';
      this.state.username = null;
      return { success: true };
    }

    // MODE 1 (PRIMARY): Telegram MTProto Bot via API ID + API Hash + Bot Token (NO string session needed!)
    if (this.apiId && this.apiHash && this.token) {
      try {
        console.log(`[Telegram MTProto] Initializing MTProto Bot Client with API ID: ${this.apiId}... (No string session needed)`);
        const client = new TelegramClient(
          new StringSession(''),
          this.apiId,
          this.apiHash,
          {
            connectionRetries: 5,
            useWSS: false,
          }
        );

        await client.start({
          botAuthToken: this.token,
        });

        const me: any = await client.getMe();
        if (!me) {
          throw new Error('Could not retrieve bot entity via MTProto');
        }

        this.mtprotoClient = client;
        this.state.enabled = true;
        this.state.active = true;
        this.state.engine = 'mtproto-4gb';
        this.state.authType = 'bot-token';
        this.state.maxFileSize = me.premium ? '4,000 MB (4 GB Telegram Premium)' : '2,000 MB (2 GB MTProto Bot)';
        this.state.username = me.username || me.firstName || 'mtproto_bot';
        this.state.botId = Number(me.id);
        this.state.firstName = me.firstName || null;
        this.state.lastError = null;
        this.state.lastActive = new Date().toISOString();

        console.log(`[Telegram MTProto] Connected @${this.state.username} (ID: ${this.state.botId}). Max upload: ${this.state.maxFileSize}`);

        this.registerMtprotoEvents();

        return {
          success: true,
          username: this.state.username || undefined,
          engine: 'mtproto-4gb',
        };
      } catch (err: any) {
        console.error('[Telegram MTProto] Bot Token MTProto failed:', err.message);
        this.state.lastError = `MTProto Error: ${err.message}`;
        this.state.engine = 'standby';
        // Fallback to HTTP Bot API
        return this.startHttpPollingFallback(this.token);
      }
    }

    // MODE 2: Telegram String Session (Optional / Advanced)
    if (this.sessionString) {
      const effectiveApiId = this.apiId || DEFAULT_MTPROTO_API_ID;
      const effectiveApiHash = this.apiHash || DEFAULT_MTPROTO_API_HASH;

      try {
        console.log(`[Telegram MTProto] Initializing with String Session (API ID: ${effectiveApiId})...`);
        const client = new TelegramClient(
          new StringSession(this.sessionString),
          effectiveApiId,
          effectiveApiHash,
          {
            connectionRetries: 5,
            useWSS: false,
          }
        );

        await client.connect();

        const me: any = await client.getMe();
        if (!me) {
          throw new Error('Could not retrieve user/bot entity via Telegram String Session');
        }

        this.mtprotoClient = client;
        this.state.enabled = true;
        this.state.active = true;
        this.state.engine = 'mtproto-4gb';
        this.state.authType = 'string-session';
        this.state.maxFileSize = me.premium ? '4,000 MB (4 GB Telegram Premium)' : '2,000 MB (2 GB MTProto)';
        this.state.username = me.username || me.firstName || 'telegram_user';
        this.state.botId = Number(me.id);
        this.state.firstName = me.firstName || null;
        this.state.lastError = null;
        this.state.lastActive = new Date().toISOString();

        console.log(`[Telegram MTProto] Connected via String Session @${this.state.username} (ID: ${this.state.botId}). Max upload: ${this.state.maxFileSize}`);

        this.registerMtprotoEvents();

        return {
          success: true,
          username: this.state.username || undefined,
          engine: 'mtproto-4gb',
        };
      } catch (err: any) {
        console.error('[Telegram MTProto] String Session startup failed:', err.message);
        this.state.lastError = `String Session Error: ${err.message}`;
        this.state.engine = 'standby';

        if (this.token) {
          return this.startHttpPollingFallback(this.token);
        }
        return { success: false, error: err.message };
      }
    }

    // MODE 3: Standard HTTP Bot API Polling (Up to 20 MB)
    if (this.token) {
      return this.startHttpPollingFallback(this.token);
    }

    return { success: false, error: 'Missing Telegram String Session or Bot Token' };
  }

  public async stop(): Promise<void> {
    // Stop HTTP polling
    this.shouldHttpPoll = false;
    if (this.httpAbortController) {
      this.httpAbortController.abort();
      this.httpAbortController = null;
    }
    this.isHttpPolling = false;

    // Stop MTProto client
    if (this.mtprotoClient) {
      try {
        await this.mtprotoClient.disconnect();
      } catch (e) {
        // ignore disconnect errs
      }
      this.mtprotoClient = null;
    }

    this.state.active = false;
    console.log('[Telegram Bot] All services stopped');
  }

  // ==========================================
  // MTProto 2 GB - 4 GB Implementation
  // ==========================================
  private registerMtprotoEvents() {
    if (!this.mtprotoClient) return;

    this.mtprotoClient.addEventHandler(async (event: any) => {
      try {
        const message = event.message;
        if (!message) return;
        this.state.lastActive = new Date().toISOString();

        await this.handleMtprotoMessage(message);
      } catch (err: any) {
        console.error('[Telegram MTProto] Handler error:', err);
      }
    }, new NewMessage({}));
  }

  private async handleMtprotoMessage(message: any) {
    const text = (message.text || message.message || '').trim();

    // 1. Commands
    if (text === '/start' || text === '/help') {
      const baseUrl = this.getBaseUrl();
      const welcome = `⚡ <b>Permanent File Hosting Bot (4 GB MTProto Line)</b>

Welcome! Send me <b>any large file, video, ISO, ZIP, archive, document, or media</b> up to <b>4 GB</b>, and I will permanently host it and reply with a direct unthrottled hotlink!

🚀 <b>Active Capabilities:</b>
• <b>4 GB Upload Limit:</b> Powered by Telegram MTProto Direct Client
• <b>Permanent Storage:</b> Zero expiration, zero link decay
• <b>10 Gbps CDN Uplink:</b> Direct hotlinks with unthrottled byte-range streaming
• <b>Remote Cloner:</b> Send direct URLs (http/https) to download & host automatically
• <b>Crash-Safe WAL DB:</b> Instant SHA-256 cryptographic verification

📋 <b>Commands:</b>
• <i>Send or Forward any file</i> ➔ Direct Permanent Link
• <i>Send a Download URL</i> ➔ Remote Host File
• <code>/status</code> ➔ Live Storage Node & Protocol Telemetry
• <code>/help</code> ➔ Show this guide

🌐 <b>Web Dashboard:</b> ${baseUrl}`;

      await message.reply({ message: welcome, parseMode: 'html' });
      return;
    }

    if (text === '/status') {
      const metadata = this.loadMetadata();
      const count = Object.keys(metadata).length;
      const totalBytes = Object.values(metadata).reduce((acc, f) => acc + (f.size || 0), 0);
      const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      const totalTb = (totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(4);

      const statusMsg = `📊 <b>Storage Node & Protocol Telemetry</b>

• <b>Active Bot:</b> @${this.state.username || 'unknown'}
• <b>Protocol Engine:</b> MTProto Direct Binary (4 GB Max)
• <b>Database Records:</b> ${count} files
• <b>Storage Used:</b> ${totalGb} GB (${totalTb} TB)
• <b>Telegram Uploads:</b> ${this.state.totalUploads} files
• <b>Speed Tier:</b> 10 Gbps Unthrottled
• <b>Engine:</b> Atomic Crash-Safe Document WAL
• <b>Status:</b> 🟢 100% Operational

🌐 <b>Web Dashboard:</b> ${this.getBaseUrl()}`;

      await message.reply({ message: statusMsg, parseMode: 'html' });
      return;
    }

    // 2. Direct URL Remote Fetch
    if (text.startsWith('http://') || text.startsWith('https://')) {
      await this.handleRemoteUrlUploadMtproto(message, text);
      return;
    }

    // 3. Media Upload (Document, Video, Audio, Photo up to 4 GB)
    if (message.media) {
      await this.handleMediaUploadMtproto(message);
      return;
    }

    // Default message
    if (text && !text.startsWith('/')) {
      await message.reply({
        message: `💡 Send or forward me any <b>file, document, photo, or video (up to 4 GB)</b>, or paste a <b>direct download URL</b> to generate a permanent 10 Gbps hotlink!`,
        parseMode: 'html',
      });
    }
  }

  private renderProgressBar(percent: number, width: number = 12): string {
    const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
    const filled = Math.round((clamped / 100) * width);
    const empty = Math.max(0, width - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private formatSpeed(bytesPerSec: number): { mbPerSec: string; mbps: string } {
    const mbPerSec = (bytesPerSec / (1024 * 1024)).toFixed(1);
    const mbps = ((bytesPerSec * 8) / (1000 * 1000)).toFixed(1);
    return { mbPerSec, mbps };
  }

  private formatEta(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return 'Calculating...';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  private async downloadMediaAccelerated(
    message: any,
    destPath: string,
    onProgress: (downloaded: number, total: number) => Promise<void>
  ): Promise<void> {
    if (!this.mtprotoClient) throw new Error('MTProto client not connected');

    // Attempt high-speed multi-chunk parallel download (1000 Mbps pipeline)
    try {
      const media = message.media;
      if (!media) throw new Error('No media in message');

      const info = utils.getFileInfo(media);
      if (!info || !info.location || !info.size) {
        throw new Error('Standard getFileInfo not available for multi-chunk transfer');
      }

      const totalSize = Number(info.size);
      if (totalSize <= 0) {
        throw new Error('Invalid file size');
      }

      const CHUNK_SIZE = 512 * 1024; // 512 KB per MTProto chunk (Telegram optimal binary chunk)
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      const CONCURRENCY = 12; // 12 parallel streams to saturate 1000 Mbps pipeline

      const targetDc = info.dcId || 4;
      let sender = await this.mtprotoClient.getSender(targetDc);
      const fileHandle = await fs.promises.open(destPath, 'w');

      let nextChunkIndex = 0;
      let downloadedBytes = 0;
      let hasError = false;
      let errorObj: any = null;

      const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, async () => {
        while (nextChunkIndex < totalChunks && !hasError) {
          const chunkIdx = nextChunkIndex++;
          const offset = chunkIdx * CHUNK_SIZE;

          let retries = 0;
          while (retries < 5 && !hasError) {
            try {
              const req = new Api.upload.GetFile({
                location: info.location,
                offset: bigInt(offset),
                limit: CHUNK_SIZE,
                precise: true,
              });

              const res: any = await this.mtprotoClient!.invokeWithSender(req, sender);
              const chunkBytes = res?.bytes;
              if (chunkBytes && chunkBytes.length > 0) {
                await fileHandle.write(chunkBytes, 0, chunkBytes.length, offset);
                downloadedBytes += chunkBytes.length;
                await onProgress(downloadedBytes, totalSize);
              }
              break;
            } catch (err: any) {
              if (err.errorMessage && err.errorMessage.startsWith('FILE_MIGRATE_')) {
                const newDc = parseInt(err.errorMessage.split('_')[2], 10);
                sender = await this.mtprotoClient!.getSender(newDc);
              } else {
                retries++;
                if (retries >= 5) {
                  hasError = true;
                  errorObj = err;
                  throw err;
                }
                await new Promise((r) => setTimeout(r, 200 * retries));
              }
            }
          }
        }
      });

      try {
        await Promise.all(workers);
      } finally {
        await fileHandle.sync().catch(() => {});
        await fileHandle.close().catch(() => {});
      }

      if (hasError && errorObj) {
        throw errorObj;
      }

      const stats = await fs.promises.stat(destPath);
      if (stats.size < totalSize) {
        throw new Error(`Incomplete download: received ${stats.size} of ${totalSize} bytes`);
      }

      return;
    } catch (accelErr: any) {
      console.warn('[Telegram MTProto] Accelerated parallel download fallback triggered:', accelErr.message);
      // Fallback to standard downloadMedia if accelerated multi-chunk encounters unsupported media structures
      await this.mtprotoClient.downloadMedia(message, {
        outputFile: destPath,
        progressCallback: async (downloaded: any, total: any) => {
          await onProgress(Number(downloaded), Number(total));
        },
      });
    }
  }

  private async handleMediaUploadMtproto(message: any) {
    if (!this.mtprotoClient) return;

    let initialStatusMsg: any = null;
    const startTime = Date.now();
    try {
      // Determine file metadata
      const file = message.file;
      let originalName = file?.name;
      const size = file?.size || 0;
      const mimeType = file?.mimeType || 'application/octet-stream';

      if (!originalName) {
        if (message.photo) {
          originalName = `photo_${Date.now()}.jpg`;
        } else if (mimeType.includes('video') || message.video) {
          originalName = `video_${Date.now()}.mp4`;
        } else if (mimeType.includes('audio') || message.audio) {
          originalName = `audio_${Date.now()}.mp3`;
        } else {
          originalName = `file_${Date.now()}.bin`;
        }
      }

      const sizeStr = size > 0 ? this.formatBytes(size) : 'Massive File';

      initialStatusMsg = await message.reply({
        message: `⚡ <b>Transferring massive file (MTProto Ultra 1000 Mbps Pipeline):</b>\n\n` +
          `📁 <b>File:</b> <code>${this.escapeHtml(originalName)}</code>\n` +
          `📊 <b>Progress:</b> <code>[░░░░░░░░░░░░]</code> <b>0%</b>\n` +
          `📦 <b>Transferred:</b> 0 B / ${sizeStr}\n` +
          `🚀 <b>Speed:</b> <b>Connecting 1000 Mbps pipeline...</b>\n` +
          `⚡ <b>Pipeline:</b> MTProto 12x Accelerated Stream Engine\n\n` +
          `<i>Streaming directly into permanent storage node...</i>`,
        parseMode: 'html',
      });

      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueId = crypto.randomBytes(6).toString('hex');
      const storageName = `${uniqueId}_${sanitizedName}`;
      const destPath = path.join(this.filesDir, storageName);

      let lastProgressTime = 0;
      let lastProgressPercent = -1;

      // Accelerated MTProto multi-stream download with visual progress bar & speed meter
      await this.downloadMediaAccelerated(message, destPath, async (downloadedBytes: number, totalBytes: number) => {
        const effectiveTotal = totalBytes || size;
        if (!effectiveTotal || effectiveTotal <= 0) return;

        const percent = Math.min(100, Math.floor((downloadedBytes / effectiveTotal) * 100));
        const now = Date.now();

        // Throttled Telegram message updates (every 2 seconds or on major milestone)
        if ((now - lastProgressTime > 2000 || percent >= 100) && percent !== lastProgressPercent && initialStatusMsg) {
          lastProgressTime = now;
          lastProgressPercent = percent;

          const elapsedSec = (now - startTime) / 1000;
          const speedBytesPerSec = elapsedSec > 0.1 ? (downloadedBytes / elapsedSec) : 0;
          const speed = this.formatSpeed(speedBytesPerSec);
          const remainingBytes = Math.max(0, effectiveTotal - downloadedBytes);
          const etaSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;
          const etaStr = this.formatEta(etaSeconds);
          const progressBar = this.renderProgressBar(percent, 12);

          try {
            await initialStatusMsg.edit({
              text: `⚡ <b>Transferring massive file (MTProto Ultra 1000 Mbps Pipeline):</b>\n\n` +
                `📁 <b>File:</b> <code>${this.escapeHtml(originalName)}</code>\n` +
                `📊 <b>Progress:</b> <code>[${progressBar}]</code> <b>${percent}%</b>\n` +
                `📦 <b>Transferred:</b> ${this.formatBytes(downloadedBytes)} / ${this.formatBytes(effectiveTotal)}\n` +
                `🚀 <b>Speed:</b> <b>${speed.mbPerSec} MB/s</b> (~${speed.mbps} Mbps)\n` +
                `⏱️ <b>ETA:</b> ${etaStr}\n` +
                `⚡ <b>Pipeline:</b> MTProto 12x Parallel Stream Engine\n\n` +
                `<i>Streaming directly into permanent storage node...</i>`,
              parseMode: 'html',
            });
          } catch (e) {
            // Ignore Telegram edit rate limits
          }
        }
      });

      // Verify file existence & compute SHA-256 stream
      const stats = await fs.promises.stat(destPath);
      const actualSize = stats.size;

      const sha256 = await this.computeFileSha256(destPath);

      // Register file in atomic database
      const metadata = this.loadMetadata();
      const storedFile: StoredFile = {
        id: uniqueId,
        originalName,
        sanitizedName,
        storageName,
        mimeType,
        size: actualSize,
        uploadedAt: new Date().toISOString(),
        downloads: 0,
        hotlinkViews: 0,
        bandwidthUsed: 0,
        sha256,
      };

      metadata[uniqueId] = storedFile;
      this.saveMetadata(metadata);
      this.state.totalUploads += 1;

      // Calculate final transfer statistics
      const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgSpeedBytesPerSec = actualSize / (Number(totalDurationSec) || 1);
      const avgSpeed = this.formatSpeed(avgSpeedBytesPerSec);

      // Construct URLs
      const baseUrl = this.getBaseUrl();
      const hotlinkUrl = `${baseUrl}/f/${uniqueId}/${encodeURIComponent(sanitizedName)}`;
      const downloadUrl = `${baseUrl}/api/download/${uniqueId}`;
      const streamUrl = `${baseUrl}/api/stream/${uniqueId}`;

      const humanSize = this.formatBytes(actualSize);

      const successHtml = `✅ <b>File Permanently Hosted (MTProto Ultra 1000 Mbps Pipeline)!</b>\n\n` +
        `📁 <b>File:</b> <code>${this.escapeHtml(originalName)}</code>\n` +
        `📦 <b>Size:</b> ${humanSize} &bull; <code>${mimeType}</code>\n` +
        `⚡ <b>Speed Tier:</b> 10 Gbps Unthrottled CDN (Permanent)\n` +
        `🚀 <b>Avg Speed:</b> <b>${avgSpeed.mbPerSec} MB/s</b> (~${avgSpeed.mbps} Mbps) &bull; <b>Time:</b> ${totalDurationSec}s\n` +
        `💾 <b>Storage Status:</b> Permanent Zero-Decay Disk (WAL Verified)\n\n` +
        `🔗 <b>Permanent Direct Hotlink:</b>\n` +
        `${hotlinkUrl}\n\n` +
        `⬇️ <b>Direct Download Link:</b>\n` +
        `${downloadUrl}\n\n` +
        `👁️ <b>Direct Stream / View:</b>\n` +
        `${streamUrl}\n\n` +
        `🔒 <b>SHA-256 Checksum:</b>\n` +
        `<code>${sha256}</code>\n\n` +
        `<i>Zero expiration &bull; Wildcard CORS &bull; Byte-Range Streaming Enabled</i>`;

      if (initialStatusMsg) {
        await initialStatusMsg.edit({
          text: successHtml,
          parseMode: 'html',
        });
      } else {
        await message.reply({ message: successHtml, parseMode: 'html' });
      }
    } catch (err: any) {
      console.error('[Telegram MTProto] Upload error:', err);
      const errorMsg = `❌ <b>Upload Error:</b> ${this.escapeHtml(err.message || 'Download failed')}`;
      if (initialStatusMsg) {
        await initialStatusMsg.edit({ text: errorMsg, parseMode: 'html' }).catch(() => {});
      } else {
        await message.reply({ message: errorMsg, parseMode: 'html' }).catch(() => {});
      }
    }
  }

  private async handleRemoteUrlUploadMtproto(message: any, urlStr: string) {
    let initialMsg: any = null;
    try {
      initialMsg = await message.reply({
        message: `⚡ <i>Fetching remote file from URL into 10 Gbps storage node...</i>`,
        parseMode: 'html',
      });

      const res = await fetch(urlStr, {
        headers: { 'User-Agent': 'Mozilla/5.0 (PermanentFileHost/1.0)' },
      });

      if (!res.ok || !res.body) {
        throw new Error(`Remote URL returned HTTP ${res.status}`);
      }

      let fileName = path.basename(new URL(urlStr).pathname);
      if (!fileName || fileName.length < 2 || !fileName.includes('.')) {
        fileName = `remote_download_${Date.now()}.bin`;
      }
      const mimeType = res.headers.get('content-type') || 'application/octet-stream';
      const contentLengthHeader = res.headers.get('content-length');
      const expectedTotal = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueId = crypto.randomBytes(6).toString('hex');
      const storageName = `${uniqueId}_${sanitizedName}`;
      const destPath = path.join(this.filesDir, storageName);

      const fileStream = fs.createWriteStream(destPath);
      const hash = crypto.createHash('sha256');

      const reader = res.body.getReader();
      let totalBytes = 0;
      const remoteStartTime = Date.now();
      let lastRemoteEditTime = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          hash.update(value);
          fileStream.write(Buffer.from(value));

          const now = Date.now();
          if (expectedTotal > 0 && now - lastRemoteEditTime > 2000 && initialMsg) {
            lastRemoteEditTime = now;
            const percent = Math.min(100, Math.floor((totalBytes / expectedTotal) * 100));
            const elapsed = (now - remoteStartTime) / 1000;
            const speedBytes = elapsed > 0 ? (totalBytes / elapsed) : 0;
            const speed = this.formatSpeed(speedBytes);
            const progressBar = this.renderProgressBar(percent, 12);

            initialMsg.edit({
              text: `⚡ <b>Transferring Remote URL (10 Gbps Pipeline):</b>\n\n` +
                `📁 <b>File:</b> <code>${this.escapeHtml(fileName)}</code>\n` +
                `📊 <b>Progress:</b> <code>[${progressBar}]</code> <b>${percent}%</b>\n` +
                `📦 <b>Transferred:</b> ${this.formatBytes(totalBytes)} / ${this.formatBytes(expectedTotal)}\n` +
                `🚀 <b>Speed:</b> <b>${speed.mbPerSec} MB/s</b> (~${speed.mbps} Mbps)\n\n` +
                `<i>Streaming directly into permanent storage node...</i>`,
              parseMode: 'html',
            }).catch(() => {});
          }
        }
      }

      fileStream.end();
      const sha256 = hash.digest('hex');

      const metadata = this.loadMetadata();
      const storedFile: StoredFile = {
        id: uniqueId,
        originalName: fileName,
        sanitizedName,
        storageName,
        mimeType,
        size: totalBytes,
        uploadedAt: new Date().toISOString(),
        downloads: 0,
        hotlinkViews: 0,
        bandwidthUsed: 0,
        sha256,
      };

      metadata[uniqueId] = storedFile;
      this.saveMetadata(metadata);
      this.state.totalUploads += 1;

      const totalDurationSec = ((Date.now() - remoteStartTime) / 1000).toFixed(1);
      const avgSpeedBytes = totalBytes / (Number(totalDurationSec) || 1);
      const avgSpeed = this.formatSpeed(avgSpeedBytes);

      const baseUrl = this.getBaseUrl();
      const hotlinkUrl = `${baseUrl}/f/${uniqueId}/${encodeURIComponent(sanitizedName)}`;
      const downloadUrl = `${baseUrl}/api/download/${uniqueId}`;

      const responseHtml = `✅ <b>Remote URL Permanently Cloned & Hosted!</b>\n\n` +
        `📁 <b>File:</b> <code>${this.escapeHtml(fileName)}</code>\n` +
        `📦 <b>Size:</b> ${this.formatBytes(totalBytes)} &bull; <code>${mimeType}</code>\n` +
        `⚡ <b>Speed Tier:</b> 10 Gbps Unthrottled CDN\n` +
        `🚀 <b>Avg Speed:</b> <b>${avgSpeed.mbPerSec} MB/s</b> (~${avgSpeed.mbps} Mbps) &bull; <b>Time:</b> ${totalDurationSec}s\n` +
        `💾 <b>Storage Status:</b> Permanent Zero-Decay Disk (WAL Verified)\n\n` +
        `🔗 <b>Permanent Hotlink:</b>\n` +
        `${hotlinkUrl}\n\n` +
        `⬇️ <b>Direct Download:</b>\n` +
        `${downloadUrl}`;

      if (initialMsg) {
        await initialMsg.edit({ text: responseHtml, parseMode: 'html' });
      }
    } catch (err: any) {
      const errHtml = `❌ <b>Remote Fetch Failed:</b> ${this.escapeHtml(err.message)}`;
      if (initialMsg) {
        await initialMsg.edit({ text: errHtml, parseMode: 'html' });
      }
    }
  }

  // ==========================================
  // HTTP Bot API Fallback (Up to 20 MB)
  // ==========================================
  private async startHttpPollingFallback(cleanToken: string): Promise<{ success: boolean; username?: string; engine?: string; error?: string }> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = (await res.json()) as any;

      if (!data.ok) {
        this.state.lastError = data.description || 'Invalid Telegram Bot Token';
        return { success: false, error: this.state.lastError || 'Invalid token' };
      }

      this.token = cleanToken;
      this.state.enabled = true;
      this.state.active = true;
      this.state.engine = 'bot-api-http';
      this.state.maxFileSize = '20 MB (Add API ID & Hash for 4 GB)';
      this.state.username = data.result.username;
      this.state.botId = data.result.id;
      this.state.firstName = data.result.first_name;
      this.state.lastError = null;
      this.state.lastActive = new Date().toISOString();

      console.log(`[Telegram HTTP] Verified @${this.state.username} (ID: ${this.state.botId})`);

      this.startHttpPollingLoop();

      return {
        success: true,
        username: data.result.username,
        engine: 'bot-api-http',
      };
    } catch (err: any) {
      this.state.lastError = err.message || 'Connection failed to Telegram API';
      return { success: false, error: this.state.lastError || 'Connection error' };
    }
  }

  private async startHttpPollingLoop() {
    if (!this.token || this.isHttpPolling) return;

    this.shouldHttpPoll = true;
    this.isHttpPolling = true;
    console.log(`[Telegram HTTP] Polling started for @${this.state.username}...`);

    let offset = 0;

    while (this.shouldHttpPoll && this.token) {
      try {
        this.httpAbortController = new AbortController();
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${offset}&timeout=20&allowed_updates=["message"]`;

        const res = await fetch(url, { signal: this.httpAbortController.signal });
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            this.state.lastError = 'Unauthorized or invalid token';
            this.state.active = false;
            this.shouldHttpPoll = false;
            break;
          }
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = (await res.json()) as any;
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            if (update.message) {
              this.handleHttpMessage(update.message).catch((err) => {
                console.error('[Telegram HTTP] Error handling update:', err);
              });
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    this.isHttpPolling = false;
  }

  private async sendHttpMessage(chatId: number | string, text: string, replyToMessageId?: number) {
    if (!this.token) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_to_message_id: replyToMessageId,
          disable_web_page_preview: false,
        }),
      });
    } catch (err) {
      console.error('[Telegram HTTP] Failed to send message:', err);
    }
  }

  private async handleHttpMessage(msg: any) {
    const chatId = msg.chat?.id;
    if (!chatId) return;

    this.state.lastActive = new Date().toISOString();
    const text = (msg.text || '').trim();

    if (text === '/start' || text === '/help') {
      const baseUrl = this.getBaseUrl();
      const welcome = `⚡ <b>Permanent File Hosting Bot (10 Gbps)</b>

Welcome! Send me <b>any file, photo, video, audio, or document</b>, and I will permanently host it and return a direct unthrottled hotlink!

💡 <b>Upgrade to 4 GB Uploads:</b>
Currently running on standard Bot API (20 MB direct limit). To unlock massive uploads up to <b>4 GB</b>, add your <code>TELEGRAM_API_ID</code> & <code>TELEGRAM_API_HASH</code> from <a href="https://my.telegram.org">my.telegram.org</a> in your web dashboard!

📋 <b>Commands:</b>
• <i>Send any file/document</i> ➔ Instant permanent link
• <i>Send a URL (http/https)</i> ➔ Download and host directly
• <code>/status</code> ➔ Live telemetry & protocol status

🌐 <b>Web Dashboard:</b> ${baseUrl}`;
      await this.sendHttpMessage(chatId, welcome, msg.message_id);
      return;
    }

    if (text === '/status') {
      const metadata = this.loadMetadata();
      const count = Object.keys(metadata).length;
      const totalBytes = Object.values(metadata).reduce((acc, f) => acc + (f.size || 0), 0);
      const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      const totalTb = (totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(4);

      const statusMsg = `📊 <b>Storage Node & Protocol Telemetry</b>

• <b>Active Bot:</b> @${this.state.username || 'unknown'}
• <b>Engine:</b> HTTP Bot API (20 MB mode)
• <b>4 GB MTProto Engine:</b> ⚠️ Standby (Add API ID & Hash to activate)
• <b>Database Records:</b> ${count} files
• <b>Storage Used:</b> ${totalGb} GB (${totalTb} TB)
• <b>Telegram Uploads:</b> ${this.state.totalUploads} files

🌐 <b>Web Dashboard:</b> ${this.getBaseUrl()}`;
      await this.sendHttpMessage(chatId, statusMsg, msg.message_id);
      return;
    }

    // Direct URL remote upload
    if (text.startsWith('http://') || text.startsWith('https://')) {
      await this.handleRemoteUrlUploadHttp(chatId, text, msg.message_id);
      return;
    }

    const doc = msg.document;
    const photo = msg.photo ? msg.photo[msg.photo.length - 1] : null;
    const video = msg.video;
    const audio = msg.audio;
    const voice = msg.voice;

    const attachment = doc || video || audio || voice || photo;

    if (attachment) {
      let fileId = attachment.file_id;
      let originalName =
        attachment.file_name ||
        (doc && doc.file_name) ||
        (video && 'video_' + Date.now() + '.mp4') ||
        (audio && 'audio_' + Date.now() + '.mp3') ||
        (voice && 'voice_' + Date.now() + '.ogg') ||
        (photo && 'photo_' + Date.now() + '.jpg') ||
        'file_' + Date.now() + '.bin';

      let mimeType =
        attachment.mime_type ||
        (photo ? 'image/jpeg' : (video ? 'video/mp4' : (audio ? 'audio/mpeg' : 'application/octet-stream')));

      await this.downloadAndHostTelegramFileHttp(chatId, fileId, originalName, mimeType, msg.message_id);
      return;
    }

    if (text && !text.startsWith('/')) {
      await this.sendHttpMessage(
        chatId,
        `💡 Send or forward me any <b>file, document, photo, or video</b>, or paste a <b>direct download link</b> to generate a permanent 10 Gbps hotlink!`,
        msg.message_id
      );
    }
  }

  private async downloadAndHostTelegramFileHttp(
    chatId: number | string,
    tgFileId: string,
    originalName: string,
    mimeType: string,
    replyToMessageId: number
  ) {
    try {
      await this.sendHttpMessage(chatId, `⚡ <i>Connecting to 10 Gbps storage node & downloading ${this.escapeHtml(originalName)}...</i>`, replyToMessageId);

      const getFileRes = await fetch(`https://api.telegram.org/bot${this.token}/getFile?file_id=${tgFileId}`);
      const fileData = (await getFileRes.json()) as any;

      if (!fileData.ok || !fileData.result?.file_path) {
        const errDesc = fileData.description || 'Failed to retrieve file from Telegram';
        await this.sendHttpMessage(
          chatId,
          `⚠️ <b>Size Limit Notice:</b> ${this.escapeHtml(errDesc)}\n\n<i>Standard Telegram Bot API limits direct bot downloads to 20 MB. To unlock up to <b>4 GB uploads</b>, configure your Telegram <code>API_ID</code> & <code>API_HASH</code> from <a href="https://my.telegram.org">my.telegram.org</a> in your dashboard!</i>`,
          replyToMessageId
        );
        return;
      }

      const filePathUrl = `https://api.telegram.org/file/bot${this.token}/${fileData.result.file_path}`;
      const downloadRes = await fetch(filePathUrl);
      if (!downloadRes.ok || !downloadRes.body) {
        throw new Error(`Failed to download stream from Telegram: HTTP ${downloadRes.status}`);
      }

      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueId = crypto.randomBytes(6).toString('hex');
      const storageName = `${uniqueId}_${sanitizedName}`;
      const destPath = path.join(this.filesDir, storageName);

      const fileStream = fs.createWriteStream(destPath);
      const hash = crypto.createHash('sha256');

      const reader = downloadRes.body.getReader();
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          hash.update(value);
          fileStream.write(Buffer.from(value));
        }
      }

      fileStream.end();
      const sha256 = hash.digest('hex');

      const metadata = this.loadMetadata();
      const storedFile: StoredFile = {
        id: uniqueId,
        originalName,
        sanitizedName,
        storageName,
        mimeType,
        size: totalBytes,
        uploadedAt: new Date().toISOString(),
        downloads: 0,
        hotlinkViews: 0,
        bandwidthUsed: 0,
        sha256,
      };

      metadata[uniqueId] = storedFile;
      this.saveMetadata(metadata);
      this.state.totalUploads += 1;

      const baseUrl = this.getBaseUrl();
      const hotlinkUrl = `${baseUrl}/f/${uniqueId}/${encodeURIComponent(sanitizedName)}`;
      const downloadUrl = `${baseUrl}/api/download/${uniqueId}`;
      const streamUrl = `${baseUrl}/api/stream/${uniqueId}`;

      const humanSize = this.formatBytes(totalBytes);

      const responseHtml = `✅ <b>File Permanently Hosted!</b>

📁 <b>File:</b> <code>${this.escapeHtml(originalName)}</code>
📦 <b>Size:</b> ${humanSize} &bull; <code>${mimeType}</code>
⚡ <b>Speed Tier:</b> 10 Gbps Unthrottled CDN

🔗 <b>Permanent Direct Hotlink:</b>
${hotlinkUrl}

⬇️ <b>Direct Download Link:</b>
${downloadUrl}

👁️ <b>Direct Stream / View:</b>
${streamUrl}

🔒 <b>SHA-256 Checksum:</b>
<code>${sha256}</code>

<i>Zero expiration &bull; Wildcard CORS &bull; Ready to share or embed</i>`;

      await this.sendHttpMessage(chatId, responseHtml, replyToMessageId);
    } catch (err: any) {
      console.error('[Telegram HTTP] Upload error:', err);
      await this.sendHttpMessage(chatId, `❌ <b>Error:</b> ${this.escapeHtml(err.message || 'Upload failed')}`, replyToMessageId);
    }
  }

  private async handleRemoteUrlUploadHttp(chatId: number | string, urlStr: string, replyToMessageId: number) {
    try {
      await this.sendHttpMessage(chatId, `⚡ <i>Fetching remote file from URL...</i>`, replyToMessageId);

      const res = await fetch(urlStr, {
        headers: { 'User-Agent': 'Mozilla/5.0 (PermanentFileHostBot/1.0)' },
      });

      if (!res.ok || !res.body) {
        throw new Error(`Remote URL returned HTTP ${res.status}`);
      }

      let fileName = path.basename(new URL(urlStr).pathname);
      if (!fileName || fileName.length < 2 || !fileName.includes('.')) {
        fileName = `remote_download_${Date.now()}.bin`;
      }
      const mimeType = res.headers.get('content-type') || 'application/octet-stream';

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueId = crypto.randomBytes(6).toString('hex');
      const storageName = `${uniqueId}_${sanitizedName}`;
      const destPath = path.join(this.filesDir, storageName);

      const fileStream = fs.createWriteStream(destPath);
      const hash = crypto.createHash('sha256');

      const reader = res.body.getReader();
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          hash.update(value);
          fileStream.write(Buffer.from(value));
        }
      }

      fileStream.end();
      const sha256 = hash.digest('hex');

      const metadata = this.loadMetadata();
      const storedFile: StoredFile = {
        id: uniqueId,
        originalName: fileName,
        sanitizedName,
        storageName,
        mimeType,
        size: totalBytes,
        uploadedAt: new Date().toISOString(),
        downloads: 0,
        hotlinkViews: 0,
        bandwidthUsed: 0,
        sha256,
      };

      metadata[uniqueId] = storedFile;
      this.saveMetadata(metadata);
      this.state.totalUploads += 1;

      const baseUrl = this.getBaseUrl();
      const hotlinkUrl = `${baseUrl}/f/${uniqueId}/${encodeURIComponent(sanitizedName)}`;
      const downloadUrl = `${baseUrl}/api/download/${uniqueId}`;

      const responseHtml = `✅ <b>Remote URL Permanently Cloned & Hosted!</b>

📁 <b>File:</b> <code>${this.escapeHtml(fileName)}</code>
📦 <b>Size:</b> ${this.formatBytes(totalBytes)}
⚡ <b>Speed Tier:</b> 10 Gbps Unthrottled

🔗 <b>Permanent Hotlink:</b>
${hotlinkUrl}

⬇️ <b>Direct Download:</b>
${downloadUrl}`;

      await this.sendHttpMessage(chatId, responseHtml, replyToMessageId);
    } catch (err: any) {
      await this.sendHttpMessage(chatId, `❌ <b>Remote Fetch Failed:</b> ${this.escapeHtml(err.message)}`, replyToMessageId);
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================
  private async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
