import { FileCategory, StoredFile } from '../types';

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(mbps: number): string {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(2)} Gbps`;
  }
  return `${mbps.toFixed(1)} Mbps`;
}

export function getFileCategory(mimeType: string, filename: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('json') ||
    filename.endsWith('.md') ||
    filename.endsWith('.txt') ||
    filename.endsWith('.pdf')
  ) {
    return 'document';
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip') ||
    filename.endsWith('.zip') ||
    filename.endsWith('.tar.gz') ||
    filename.endsWith('.rar')
  ) {
    return 'archive';
  }
  return 'other';
}

export function getHotlinkUrl(file: StoredFile, origin: string): string {
  return `${origin}/api/raw/${file.id}/${encodeURIComponent(file.originalName)}`;
}

export function getDownloadUrl(file: StoredFile, origin: string): string {
  return `${origin}/api/download/${file.id}/${encodeURIComponent(file.originalName)}`;
}

export function generateEmbedCodes(file: StoredFile, origin: string) {
  const hotlink = getHotlinkUrl(file, origin);
  const download = getDownloadUrl(file, origin);
  const isImg = file.mimeType.startsWith('image/');
  const isVid = file.mimeType.startsWith('video/');
  const isAud = file.mimeType.startsWith('audio/');

  let htmlCode = `<a href="${download}" target="_blank" rel="noopener noreferrer">${file.originalName}</a>`;
  let mdCode = `[${file.originalName}](${download})`;
  let bbCode = `[url=${download}]${file.originalName}[/url]`;

  if (isImg) {
    htmlCode = `<img src="${hotlink}" alt="${file.originalName}" loading="lazy" />`;
    mdCode = `![${file.originalName}](${hotlink})`;
    bbCode = `[img]${hotlink}[/img]`;
  } else if (isVid) {
    htmlCode = `<video controls preload="metadata">\n  <source src="${hotlink}" type="${file.mimeType}">\n  Your browser does not support video.\n</video>`;
    mdCode = `[Watch Video: ${file.originalName}](${hotlink})`;
  } else if (isAud) {
    htmlCode = `<audio controls preload="metadata">\n  <source src="${hotlink}" type="${file.mimeType}">\n</audio>`;
    mdCode = `[Listen: ${file.originalName}](${hotlink})`;
  }

  const curlCmd = `curl -O "${download}"`;
  const wgetCmd = `wget "${download}"`;

  return {
    rawUrl: hotlink,
    downloadUrl: download,
    html: htmlCode,
    markdown: mdCode,
    bbCode,
    curl: curlCmd,
    wget: wgetCmd,
  };
}
