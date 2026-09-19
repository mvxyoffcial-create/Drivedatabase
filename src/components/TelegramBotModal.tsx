import React, { useState, useEffect } from 'react';
import { 
  X, Send, Bot, CheckCircle2, AlertCircle, Copy, Check, 
  ExternalLink, Zap, Shield, Server, RefreshCw, Layers, Key, Hash, Info
} from 'lucide-react';

interface TelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BotState {
  enabled: boolean;
  active: boolean;
  engine: 'mtproto-4gb' | 'bot-api-http' | 'standby';
  authType?: 'string-session' | 'bot-token' | 'none';
  hasSession?: boolean;
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

export const TelegramBotModal: React.FC<TelegramBotModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'chatPreview' | 'koyeb'>('setup');
  const [mode, setMode] = useState<'mtproto' | 'httpOnly'>('mtproto');
  const [botState, setBotState] = useState<BotState | null>(null);
  
  // Form State: API ID + API Hash + Bot Token (NO string session needed!)
  const [apiIdInput, setApiIdInput] = useState('');
  const [apiHashInput, setApiHashInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setBotState(data.bot);
        if (data.bot?.apiId) {
          setApiIdInput(String(data.bot.apiId));
        }
      }
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'mtproto') {
      if (!apiIdInput.trim()) {
        setActionMessage({ type: 'error', text: 'Please enter your Telegram API ID (numeric ID from my.telegram.org).' });
        return;
      }
      if (!apiHashInput.trim() && !botState?.apiHashConfigured) {
        setActionMessage({ type: 'error', text: 'Please enter your Telegram API Hash (from my.telegram.org).' });
        return;
      }
      if (!tokenInput.trim() && !botState?.active) {
        setActionMessage({ type: 'error', text: 'Please enter your Telegram Bot Token from @BotFather.' });
        return;
      }
    } else {
      if (!tokenInput.trim() && !botState?.active) {
        setActionMessage({ type: 'error', text: 'Please enter your Telegram Bot Token.' });
        return;
      }
    }

    setIsLoading(true);
    setActionMessage(null);

    try {
      const payload: any = {
        token: tokenInput.trim() || undefined,
      };

      if (mode === 'mtproto') {
        payload.apiId = apiIdInput.trim();
        payload.apiHash = apiHashInput.trim() || undefined;
      }

      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: data.message || `Connected successfully via MTProto! (@${data.bot?.username || 'bot'})`,
        });
        setBotState(data.bot);
        setTokenInput('');
        setApiHashInput('');
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Failed to connect. Please verify your API ID, API Hash, and Bot Token.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Network error while contacting bot controller',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBotState(data.bot);
        setActionMessage({ type: 'success', text: 'Telegram bot disconnected.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base sm:text-lg">Telegram 4 GB Upload Bot</h3>
                {botState?.active ? (
                  botState.engine === 'mtproto-4gb' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[11px] font-mono font-semibold text-emerald-300 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      4 GB Active (@{botState.username})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[11px] font-mono font-semibold text-amber-300 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      20 MB Bot API (@{botState.username})
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-400">
                    Standby
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Connect using <b>API ID + API Hash + Bot Token</b> &bull; <b>No String Session Needed!</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-6 gap-2">
          {[
            { id: 'setup', label: 'API ID & Hash Setup (No Strings)', icon: Bot },
            { id: 'chatPreview', label: 'Live Chat Demo (4 GB)', icon: Send },
            { id: 'koyeb', label: 'Koyeb (Port 8080)', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {actionMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                  : 'bg-red-950/40 border border-red-800/50 text-red-300'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* TAB 1: API ID + Hash Setup */}
          {activeTab === 'setup' && (
            <div className="space-y-5">
              {/* Status Banner */}
              {botState?.active ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-blue-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>@{botState.username}</span>
                        {botState.engine === 'mtproto-4gb' ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px] text-cyan-300 font-mono">
                            MTProto 4 GB Engine
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-[10px] text-amber-300 font-mono">
                            20 MB Bot API
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-300">
                        Upload limit: <b className="text-white">{botState.maxFileSize}</b> &bull; {botState.totalUploads} uploads hosted
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://t.me/${botState.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      Open in Telegram
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={handleStopBot}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">
                        4 GB Direct MTProto Bot Engine &bull; No String Session Required
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Telegram Bot API via standard HTTP is capped at 20 MB. By connecting your bot with your <b>Telegram API ID</b> and <b>API Hash</b> (from <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">my.telegram.org</a>), your bot directly communicates over the high-performance MTProto binary protocol, enabling file uploads up to <b>4 GB (4,000 MB)</b>!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMode('mtproto')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'mtproto'
                      ? 'bg-cyan-500 text-black shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>MTProto (API ID + Hash &bull; 4 GB)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('httpOnly')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'httpOnly'
                      ? 'bg-cyan-500 text-black shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Token Only (20 MB HTTP)</span>
                </button>
              </div>

              {/* How-to helper */}
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-cyan-400" />
                  How to get your API ID &amp; Hash (Takes 60 seconds):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                  <li>
                    Log in at <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">my.telegram.org</a> with your phone number.
                  </li>
                  <li>
                    Click on <b>API development tools</b> and enter any app name (e.g. <code>MyFileHost</code>).
                  </li>
                  <li>
                    Copy your numeric <b>api_id</b> and 32-character <b>api_hash</b>.
                  </li>
                  <li>
                    Get a Bot Token from <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@BotFather</a> via <code>/newbot</code>.
                  </li>
                </ol>
              </div>

              {/* Configuration Form */}
              <form onSubmit={handleSaveConfig} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                {mode === 'mtproto' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-cyan-400" />
                          Telegram API ID
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 29384712"
                          value={apiIdInput}
                          onChange={(e) => setApiIdInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 block">From my.telegram.org (Numeric)</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-cyan-400" />
                          Telegram API Hash
                        </label>
                        <input
                          type="password"
                          required={!botState?.apiHashConfigured}
                          placeholder={botState?.apiHashConfigured ? '••••••••••••••••••••••••••••••••' : '32-character hex hash'}
                          value={apiHashInput}
                          onChange={(e) => setApiHashInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 block">From my.telegram.org (32 characters)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-cyan-400" />
                        Telegram Bot Token
                      </label>
                      <input
                        type="password"
                        required={!botState?.active}
                        placeholder={botState?.active ? 'Bot token configured (enter to replace)' : '1234567890:ABCdefGhIJKlmNoPQRstuVWXyz...'}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">From @BotFather on Telegram</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-cyan-400" />
                      Telegram Bot Token (20 MB HTTP Mode)
                    </label>
                    <input
                      type="password"
                      required={!botState?.active}
                      placeholder={botState?.active ? 'Bot token configured' : '1234567890:ABCdef...'}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">Standard HTTP Bot API polling (capped at 20 MB files)</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                  <div className="text-[11px] text-zinc-400">
                    {mode === 'mtproto' ? (
                      <span className="flex items-center gap-1 text-cyan-300 font-medium">
                        <Zap className="h-3 w-3" />
                        Unlocks massive uploads up to <b>4,000 MB (4 GB)</b>
                      </span>
                    ) : (
                      <span>Standard 20 MB Bot API</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-950/40"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {mode === 'mtproto' ? 'Connect MTProto 4 GB Bot' : 'Connect Bot'}
                  </button>
                </div>
              </form>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <span>No String Session Needed</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Uses GramJS MTProto client with bot credentials directly in RAM. Zero session strings, zero account risk.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span>Permanent Hotlinks</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Files sent to your bot are stored permanently on disk with 10 Gbps unthrottled streaming and direct hotlinks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Chat Demo Preview */}
          {activeTab === 'chatPreview' && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-300 mb-1">
                Real-world simulation of uploading a <b>3.42 GB ISO image</b> to your bot via MTProto:
              </div>

              {/* Mock Telegram Chat Container */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 space-y-3 font-sans">
                {/* User sent 3.4 GB file message */}
                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl rounded-tr-sm bg-cyan-600 p-3 text-white text-xs shadow-lg space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold">
                      <Layers className="h-4 w-4" />
                      <span>Ubuntu_24_Server_x64.iso</span>
                    </div>
                    <div className="text-[11px] text-cyan-100 font-mono">3.42 GB &bull; application/x-iso9660-image</div>
                    <div className="text-[10px] text-cyan-200 text-right">21:04 ✓✓</div>
                  </div>
                </div>

                {/* Real-time MTProto Progress Message */}
                <div className="flex justify-start">
                  <div className="max-w-md rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 p-3.5 text-xs text-zinc-200 space-y-2.5 shadow-xl">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                      <Zap className="h-4 w-4 animate-pulse text-cyan-400" />
                      <span>Transferring massive file (MTProto 4 GB Pipeline):</span>
                    </div>

                    <div className="text-[11px] text-zinc-300 space-y-0.5 font-mono">
                      <div>📁 <b>File:</b> Ubuntu_24_Server_x64.iso</div>
                      <div>📦 <b>Progress:</b> 2.45 GB / 3.42 GB (<b>71%</b>)</div>
                      <div>⚡ <b>Pipeline:</b> Direct MTProto binary to 10 Gbps Node</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 w-[71%]" />
                    </div>

                    <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/80">
                      <span>Streaming byte-by-byte into permanent storage...</span>
                      <span>21:05</span>
                    </div>
                  </div>
                </div>

                {/* Final Completion Message */}
                <div className="flex justify-start">
                  <div className="max-w-md rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 p-3.5 text-xs text-zinc-200 space-y-2.5 shadow-xl">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>File Permanently Hosted (4 GB MTProto Pipeline)!</span>
                    </div>

                    <div className="text-[11px] text-zinc-300 space-y-0.5 font-mono">
                      <div>📁 <b>File:</b> Ubuntu_24_Server_x64.iso</div>
                      <div>📦 <b>Size:</b> 3.42 GB &bull; application/x-iso9660-image</div>
                      <div>⚡ <b>Speed Tier:</b> 10 Gbps Unthrottled CDN</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-zinc-400">Permanent Direct Hotlink:</div>
                      <div className="text-cyan-400 font-mono text-[11px] break-all select-all">
                        https://your-host.koyeb.app/f/b8e4a1/Ubuntu_24_Server_x64.iso
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-zinc-400">Direct Download Link:</div>
                      <div className="text-emerald-400 font-mono text-[11px] break-all select-all">
                        https://your-host.koyeb.app/api/download/b8e4a1
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 break-all">
                      🔒 SHA-256: 4f98a2d1e57c6b90...
                    </div>

                    <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/80">
                      <span>Zero expiration &bull; Wildcard CORS &bull; Byte-Range Streaming</span>
                      <span>21:05</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Koyeb Port 8080 Deployment */}
          {activeTab === 'koyeb' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <span>Koyeb Port 8080 Deployment with API ID &amp; Hash</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Configure your 3 variables in Koyeb: <code>TELEGRAM_API_ID</code>, <code>TELEGRAM_API_HASH</code>, and <code>TELEGRAM_BOT_TOKEN</code>. <b>No string session needed!</b>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="font-semibold">Koyeb Environment Variables:</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `PORT=8080\nNODE_ENV=production\nTELEGRAM_API_ID=your_api_id\nTELEGRAM_API_HASH=your_api_hash\nTELEGRAM_BOT_TOKEN=your_bot_token\nAPP_BASE_URL=https://your-app.koyeb.app`,
                        'envCopy'
                      )
                    }
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
                  >
                    {copiedKey === 'envCopy' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    Copy Env Config
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`PORT=8080
NODE_ENV=production
TELEGRAM_API_ID=29384712
TELEGRAM_API_HASH=b18441a1ff607e10a989891a5462e627
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRstuVWXyz...
APP_BASE_URL=https://your-app.koyeb.app`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Attach Koyeb Persistent Storage Volume</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  In your Koyeb Service Settings &gt; <b>Volumes</b>, mount a persistent volume at <code>/app/uploads</code>. All files uploaded up to 4 GB will remain permanently saved across restarts and new deployments!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
          <div className="text-xs text-zinc-400">
            MTProto <span className="text-cyan-300 font-mono">4,000 MB (4 GB)</span> &bull; Port <span className="text-cyan-300 font-mono">8080</span> &bull; <span className="text-emerald-400">No strings needed</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
