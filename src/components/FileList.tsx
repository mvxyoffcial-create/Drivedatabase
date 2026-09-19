import React, { useState, useMemo } from 'react';
import { StoredFile, FileCategory } from '../types';
import { FileCard } from './FileCard';
import { getFileCategory, formatBytes, getHotlinkUrl, getDownloadUrl } from '../utils/formatters';
import { 
  Search, Filter, ArrowUpDown, LayoutGrid, List, FileX, 
  Download, Globe, ExternalLink, Trash2, Copy, Check, Zap
} from 'lucide-react';

interface FileListProps {
  files: StoredFile[];
  onOpenHotlink: (file: StoredFile) => void;
  onDeleteFile: (id: string) => void;
  isLoading: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onOpenHotlink,
  onDeleteFile,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'downloads' | 'hotlinks'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: { label: string; value: FileCategory }[] = [
    { label: 'All Files', value: 'all' },
    { label: 'Images', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Audio', value: 'audio' },
    { label: 'Documents', value: 'document' },
    { label: 'Archives', value: 'archive' },
  ];

  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
        const category = getFileCategory(file.mimeType, file.originalName);
        const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        }
        if (sortBy === 'size') {
          return b.size - a.size;
        }
        if (sortBy === 'downloads') {
          return (b.downloads || 0) - (a.downloads || 0);
        }
        if (sortBy === 'hotlinks') {
          return (b.hotlinkViews || 0) - (a.hotlinkViews || 0);
        }
        return 0;
      });
  }, [files, searchQuery, selectedCategory, sortBy]);

  const copyHotlink = (file: StoredFile) => {
    const origin = window.location.origin;
    const url = getHotlinkUrl(file, origin);
    navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Hosted Files</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-zinc-800 text-zinc-300">
              {files.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400">All files are stored permanently with high-speed 10 Gbps CDN hotlinks</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'table' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 sm:p-4 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search hosted files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="newest">Recently Uploaded</option>
              <option value="oldest">Oldest First</option>
              <option value="size">Largest Size</option>
              <option value="hotlinks">Most Hotlink Hits</option>
              <option value="downloads">Most Downloads</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Files Content */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-400">Loading hosted files from 10G storage cluster...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          <FileX className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-300 mb-1">No files match criteria</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search query or category filter'
              : 'Upload your first file above to get permanent hosting and free 10 Gbps hotlinks!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onOpenHotlink={onOpenHotlink}
              onDeleteFile={onDeleteFile}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Speed Tier</th>
                <th className="py-3 px-4">Hotlink Views</th>
                <th className="py-3 px-4">Downloads</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredFiles.map((file) => {
                const origin = window.location.origin;
                const downloadUrl = getDownloadUrl(file, origin);
                return (
                  <tr key={file.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onOpenHotlink(file)}
                          className="font-medium text-zinc-100 hover:text-cyan-300 cursor-pointer truncate max-w-xs"
                        >
                          {file.originalName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{formatBytes(file.size)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                        10 Gbps
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-400">{file.hotlinkViews.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-indigo-400">{file.downloads.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyHotlink(file)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 transition-colors"
                          title="Copy Permanent Hotlink"
                        >
                          {copiedId === file.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => onOpenHotlink(file)}
                          className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition-colors"
                          title="Get Embed Codes"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={downloadUrl}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            if (window.confirm(`Permanently delete "${file.originalName}"?`)) {
                              onDeleteFile(file.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
