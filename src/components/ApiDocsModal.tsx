import React, { useState } from 'react';
import { 
  X, Copy, Check, Terminal, Code, Globe, Zap, ArrowRight, 
  ExternalLink, Play, CheckCircle2, ShieldCheck, Cpu, HardDrive
} from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'quickstart' | 'endpoints' | 'curl' | 'javascript' | 'python' | 'console';

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const origin = window.location.origin;
  const [activeTab, setActiveTab] = useState<TabType>('quickstart');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Console state
  const [consoleEndpoint, setConsoleEndpoint] = useState<string>('/api/info');
  const [consoleMethod, setConsoleMethod] = useState<'GET' | 'POST'>('GET');
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [consoleResponse, setConsoleResponse] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const executeLiveRequest = async () => {
    try {
      setConsoleLoading(true);
      setConsoleResponse(null);
      const res = await fetch(consoleEndpoint, { method: consoleMethod });
      const data = await res.json();
      setConsoleResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setConsoleResponse(JSON.stringify({ error: err.message || 'Request failed' }, null, 2));
    } finally {
      setConsoleLoading(false);
    }
  };

  const curlSnippet = `# 1. Upload a file (up to 100 GB)
curl -X POST -F "files=@my_file.zip" ${origin}/api/upload

# 2. Get file details and permanent hotlinks
curl ${origin}/api/files/<FILE_ID>

# 3. List all files and live CDN metrics
curl ${origin}/api/files

# 4. Direct permanent hotlink download
curl -L ${origin}/raw/<FILE_ID> -o output_file.zip`;

  const jsSnippet = `// Upload a file using standard Fetch API
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch('${origin}/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('Permanent Hotlink:', \`${origin}/raw/\${data.files[0].id}\`);
  return data;
}

// Fetch all hosted files
async function listFiles() {
  const res = await fetch('${origin}/api/files');
  const { files, stats } = await res.json();
  return files;
}`;

  const pythonSnippet = `import requests

# Upload a file (up to 100 GB)
url = "${origin}/api/upload"
with open("dataset.tar.gz", "rb") as f:
    files = {"files": f}
    response = requests.post(url, files=files)
    data = response.json()
    file_id = data["files"][0]["id"]
    print(f"Permanent Raw Hotlink: ${origin}/raw/{file_id}")
    print(f"Direct Download URL:  ${origin}/dl/{file_id}")

# Fetch file info & SHA-256
info_res = requests.get(f"${origin}/api/files/{file_id}")
print(info_res.json())`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  Public REST API v1
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold font-mono rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  Open To Anyone
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  No Auth Required
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Wildcard CORS &bull; 10 Gbps Unthrottled Pipeline &bull; Thousands of GBs (TB-Scale)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Base URL bar */}
        <div className="px-6 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 font-mono">
            <span className="text-zinc-500">BASE URL:</span>
            <span className="text-cyan-300 select-all font-semibold">{origin}</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CORS: *
            </span>
            <button
              onClick={() => copyToClipboard(origin, 'base-url')}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono"
            >
              {copiedKey === 'base-url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === 'base-url' ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/80 px-6 gap-1 overflow-x-auto">
          {[
            { id: 'quickstart', label: 'Quick Start' },
            { id: 'endpoints', label: 'Endpoints (12)' },
            { id: 'curl', label: 'cURL' },
            { id: 'javascript', label: 'JavaScript / Node' },
            { id: 'python', label: 'Python' },
            { id: 'console', label: 'Live Tester' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          {/* Quick Start Tab */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    Zero Friction Public Access &bull; Multi-Terabyte Ready
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No signups, tokens, or API keys required. Integrate programmatically from any backend, mobile app, CLI tool, or frontend script with wildcard CORS.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('curl')}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-black font-semibold text-xs flex items-center gap-1.5 shrink-0 hover:bg-cyan-400 transition-colors"
                >
                  <span>See cURL Command</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-cyan-400 font-mono font-bold text-base mb-1">Thousands of GBs</div>
                  <div className="text-xs font-medium text-zinc-200">Terabyte Scale Pipeline</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    5,000 GB per file session with unlimited batch queue capacity.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-emerald-400 font-mono font-bold text-base mb-1">Permanent</div>
                  <div className="text-xs font-medium text-zinc-200">Crash-Safe WAL DB</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Files remain permanently accessible with direct immutable hotlinks.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-blue-400 font-mono font-bold text-base mb-1">10 Gbps</div>
                  <div className="text-xs font-medium text-zinc-200">Delivery Bandwidth</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    HTTP Range byte streaming for instant video scrubbing and high speeds.
                  </p>
                </div>
              </div>

              {/* Instant cURL Example Box */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
                  <span>Upload a file right now via Terminal:</span>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST -F "files=@my_file.zip" ${origin}/api/upload`, 'quick-curl')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedKey === 'quick-curl' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'quick-curl' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                  <code>curl -X POST -F "files=@my_file.zip" {origin}/api/upload</code>
                </div>
              </div>
            </div>
          )}

          {/* Endpoints Reference */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              {[
                {
                  method: 'POST',
                  path: '/api/upload',
                  desc: 'Upload 1 or multiple files (up to 100 GB) using multipart/form-data with field name "files".',
                  res: '{\n  "success": true,\n  "files": [{ "id": "ab12cd", "originalName": "image.png", "size": 1048576, "sha256": "..." }]\n}',
                },
                {
                  method: 'GET',
                  path: '/api/files',
                  desc: 'List all permanently hosted files, total downloads, hotlinks, and bandwidth statistics.',
                  res: '{\n  "files": [...],\n  "stats": { "totalFiles": 12, "totalBytes": 42949672960, "cdnSpeedTier": "10 Gbps" }\n}',
                },
                {
                  method: 'GET',
                  path: '/api/files/:id',
                  desc: 'Get metadata, SHA-256 checksum, download counts, and direct links for a specific file.',
                  res: '{\n  "success": true,\n  "file": { "id": "ab12cd", "originalName": "video.mp4", "urls": { "raw": "...", "download": "..." } }\n}',
                },
                {
                  method: 'GET',
                  path: '/raw/:id',
                  desc: 'Permanent direct hotlink. Served with Content-Disposition: inline and CORS headers for <img>, <video>, CSS embeds.',
                  res: '<Binary stream with HTTP Range 206 support>',
                },
                {
                  method: 'GET',
                  path: '/dl/:id',
                  desc: 'Force direct download attachment. Prompts browser Save File dialog.',
                  res: '<Binary stream with Content-Disposition: attachment>',
                },
                {
                  method: 'POST',
                  path: '/api/upload/chunk/init',
                  desc: 'Initialize multipart session for giant uploads up to 100 GB. Expects { fileName, fileSize, mimeType, totalChunks } in JSON body.',
                  res: '{\n  "uploadId": "4f9a7b8c",\n  "message": "Upload session initialized"\n}',
                },
                {
                  method: 'POST',
                  path: '/api/upload/chunk',
                  desc: 'Upload individual 10MB chunk slices via multipart (fields: uploadId, chunkIndex, chunk).',
                  res: '{\n  "success": true,\n  "chunkIndex": 0\n}',
                },
                {
                  method: 'POST',
                  path: '/api/upload/chunk/complete',
                  desc: 'Finalize and stream-stitch all chunk slices on the storage node into the permanent file.',
                  res: '{\n  "success": true,\n  "file": { "id": "99ea21", ... }\n}',
                },
                {
                  method: 'DELETE',
                  path: '/api/files/:id',
                  desc: 'Permanently remove a file from the storage node.',
                  res: '{\n  "success": true,\n  "message": "File deleted permanently"\n}',
                },
                {
                  method: 'GET',
                  path: '/api/db/status',
                  desc: 'Database engine statistics, record counts, and storage volume integrity.',
                  res: '{\n  "status": "healthy",\n  "engine": "Atomic Crash-Safe WAL Document Database",\n  "totalRecords": 38,\n  "totalStorageTb": "1.4500 TB"\n}',
                },
                {
                  method: 'GET',
                  path: '/api/db/export',
                  desc: 'Export full database snapshot backup JSON file.',
                  res: '{\n  "<id>": { "id": "...", "originalName": "...", "sha256": "..." }\n}',
                },
                {
                  method: 'GET',
                  path: '/api/info',
                  desc: 'Public API documentation schema and system capabilities.',
                  res: '{\n  "name": "Permanent File Host Public API", "maxUploadSize": "5,000 GB (5 TB) per session • Thousands of GBs Supported", ...\n}',
                },
              ].map((ep, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 font-mono">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          ep.method === 'POST'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : ep.method === 'GET'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="font-semibold text-white text-xs sm:text-sm">{ep.path}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${origin}${ep.path}`, `ep-${idx}`)}
                      className="text-xs text-zinc-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                    >
                      {copiedKey === `ep-${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copy Path</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">{ep.desc}</p>
                  <div className="p-2.5 rounded-lg bg-black/80 border border-zinc-900 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
                    {ep.res}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* cURL Snippet */}
          {activeTab === 'curl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>cURL CLI Commands:</span>
                <button
                  onClick={() => copyToClipboard(curlSnippet, 'curl-tab')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedKey === 'curl-tab' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'curl-tab' ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed">
                {curlSnippet}
              </pre>
            </div>
          )}

          {/* JavaScript / Node.js Snippet */}
          {activeTab === 'javascript' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>JavaScript / TypeScript (Browser &amp; Node.js):</span>
                <button
                  onClick={() => copyToClipboard(jsSnippet, 'js-tab')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedKey === 'js-tab' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'js-tab' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre leading-relaxed">
                {jsSnippet}
              </pre>
            </div>
          )}

          {/* Python Snippet */}
          {activeTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Python (requests):</span>
                <button
                  onClick={() => copyToClipboard(pythonSnippet, 'py-tab')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedKey === 'py-tab' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'py-tab' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre leading-relaxed">
                {pythonSnippet}
              </pre>
            </div>
          )}

          {/* Live Console Tester */}
          {activeTab === 'console' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Test live API queries directly from your browser. Responses are fetched in real-time from the backend.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={consoleMethod}
                  onChange={(e) => setConsoleMethod(e.target.value as 'GET' | 'POST')}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="GET">GET</option>
                </select>

                <select
                  value={consoleEndpoint}
                  onChange={(e) => setConsoleEndpoint(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="/api/info">/api/info (API Capabilities)</option>
                  <option value="/api/files">/api/files (List Files & Stats)</option>
                  <option value="/api/db/status">/api/db/status (Database & Storage Health)</option>
                  <option value="/api/health">/api/health (Health telemetry)</option>
                </select>

                <button
                  onClick={executeLiveRequest}
                  disabled={consoleLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  <span>{consoleLoading ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>

              {consoleResponse && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>Live Response:</span>
                    <button
                      onClick={() => copyToClipboard(consoleResponse, 'console-res')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedKey === 'console-res' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-64 whitespace-pre">
                    {consoleResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            100% Free &bull; Permanent &bull; No Rate Limits on Direct Reads
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
