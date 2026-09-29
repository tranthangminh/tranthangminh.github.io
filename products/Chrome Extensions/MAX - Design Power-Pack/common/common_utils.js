/**
 * common_utils.js — Universal Shared Utility Functions for MAX Extension
 * Compatible with both DOM (window) and Service Worker (self/globalThis) contexts
 */

const _global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);

// Format byte count to human-readable string ("124 KB", "1.2 MB", "2.14 GB")
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 KB';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
_global.formatBytes = formatBytes;

// Fetch a remote resource's file size via HEAD request (Fallback to aborted GET)
async function fetchResourceSize(url) {
  if (!url) return 0;
  if (url.startsWith('data:')) return Math.round(url.length * 0.75);
  if (url.startsWith('blob:')) return 0;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const len = response.headers.get('content-length');
    if (len) return parseInt(len, 10) || 0;
  } catch (e) { /* Server HEAD unsupported */ }

  try {
    const controller = new AbortController();
    const response = await fetch(url, { signal: controller.signal });
    const len = response.headers.get('content-length');
    controller.abort();
    if (len) return parseInt(len, 10) || 0;
  } catch (e) { /* Expected AbortError */ }

  return 0;
}
_global.fetchResourceSize = fetchResourceSize;

// Universal Capture History verifier & saver
// Automatically purges deleted files from history whenever a new capture item is saved
async function saveVerifiedCaptureHistoryItem(newItem) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

  chrome.storage.local.get({ captureHistory: [] }, async (res) => {
    let history = res.captureHistory || [];
    const verifiedHistory = [];

    for (const item of history) {
      let valid = true;
      if (item.downloadId && typeof chrome !== 'undefined' && chrome.downloads) {
        try {
          const results = await new Promise(r => chrome.downloads.search({ id: item.downloadId }, r));
          if (!results || results.length === 0 || results[0].exists === false || results[0].state === 'interrupted') {
            valid = false;
          }
        } catch (e) {
          valid = false;
        }
      }
      if (valid) {
        verifiedHistory.push(item);
      }
    }

    const updated = [newItem, ...verifiedHistory.filter(h => h.filename !== newItem.filename)].slice(0, 20);
    chrome.storage.local.set({ captureHistory: updated });
  });
}
_global.saveVerifiedCaptureHistoryItem = saveVerifiedCaptureHistoryItem;

/**
 * Shared calculation helper for max dimensions
 * 1. Aspect Ratio Downscale if maxW limit is set (maxW > 0 && width > maxW)
 * 2. Hard Crop Height if maxH limit is set (maxH > 0 && height > maxH)
 */
function computeMaxDimensionLimits(rawWidth, rawHeight, maxW = 0, maxH = 0) {
  let targetW = Math.max(1, Math.round(rawWidth || 1));
  let targetH = Math.max(1, Math.round(rawHeight || 1));

  const maxWVal = parseInt(maxW, 10) || 0;
  const maxHVal = parseInt(maxH, 10) || 0;

  // 1. Aspect Ratio Downscale if maxW limit is set
  if (maxWVal > 0 && targetW > maxWVal) {
    const ratio = maxWVal / targetW;
    targetW = maxWVal;
    targetH = Math.round(targetH * ratio);
  }

  // 2. Hard Crop Height if maxH limit is set
  if (maxHVal > 0 && targetH > maxHVal) {
    targetH = maxHVal;
  }

  return {
    targetWidth: targetW,
    targetHeight: targetH,
    isModified: targetW !== rawWidth || targetH !== rawHeight
  };
}
_global.computeMaxDimensionLimits = computeMaxDimensionLimits;

/**
 * Universal Data URL scaler & cropper using computeMaxDimensionLimits
 */
async function applyMaxDimensionLimitsToDataUrl(dataUrl, rawWidth = 0, rawHeight = 0, maxW = 0, maxH = 0, mimeType = 'image/png') {
  if (!dataUrl) {
    return { dataUrl, width: 0, height: 0 };
  }

  let realW = parseInt(rawWidth, 10) || 0;
  let realH = parseInt(rawHeight, 10) || 0;

  try {
    let bitmap = null;
    if (realW <= 0 || realH <= 0) {
      if (typeof createImageBitmap !== 'undefined') {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        bitmap = await createImageBitmap(blob);
        realW = bitmap.width;
        realH = bitmap.height;
      }
    }

    const { targetWidth, targetHeight, isModified } = computeMaxDimensionLimits(realW, realH, maxW, maxH);

    if (!isModified) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      return { dataUrl, width: realW, height: realH };
    }

    if (!bitmap && typeof createImageBitmap !== 'undefined') {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      bitmap = await createImageBitmap(blob);
    }

    if (!bitmap) return { dataUrl, width: targetWidth, height: targetHeight };

    const canvas = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(targetWidth, targetHeight)
      : (typeof document !== 'undefined' ? document.createElement('canvas') : null);

    if (!canvas) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      return { dataUrl, width: targetWidth, height: targetHeight };
    }

    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scaleRatio = targetWidth / bitmap.width;
      const drawH = Math.round(bitmap.height * scaleRatio);
      ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, targetWidth, drawH);
    }
    if (typeof bitmap.close === 'function') bitmap.close();

    let outputDataUrl = dataUrl;
    if (typeof canvas.convertToBlob === 'function') {
      const blob = await canvas.convertToBlob({ type: mimeType, quality: 1.0 });
      outputDataUrl = await new Promise(r => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result);
        reader.readAsDataURL(blob);
      });
    } else if (typeof canvas.toDataURL === 'function') {
      outputDataUrl = canvas.toDataURL(mimeType, 1.0);
    }

    return { dataUrl: outputDataUrl, width: targetWidth, height: targetHeight };
  } catch (e) {
    console.warn('Failed to apply max dimension limits:', e);
    return { dataUrl, width: realW, height: realH };
  }
}
_global.applyMaxDimensionLimitsToDataUrl = applyMaxDimensionLimitsToDataUrl;

// Update a single <option> element based on a resource count
function setOpt(opt, count, label) {
  if (!opt) return;
  if (count > 0) {
    opt.text = `${label} (${count})`;
    opt.disabled = false;
    opt.hidden = false;
  } else {
    opt.text = label;
    opt.disabled = true;
    opt.hidden = true;
    if (opt.selected && opt.parentElement) opt.parentElement.selectedIndex = 0;
  }
}
_global.setOpt = setOpt;

// Render an error message inside a grid container
function showGridErrorState(containerId, message) {
  if (typeof document === 'undefined') return;
  const gridContainer = document.getElementById(containerId);
  if (!gridContainer) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'error-state';
  const p = document.createElement('p');
  p.textContent = message;
  wrapper.appendChild(p);
  gridContainer.replaceChildren(wrapper);
}
_global.showGridErrorState = showGridErrorState;

// Update "Download (N)" button text and state
function updateDownloadBtnState(btnId, count) {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById(btnId);
  if (!btn) return;

  if (count > 0) {
    btn.textContent = `Download (${count})`;
    btn.classList.remove('disabled');
    btn.disabled = false;
  } else {
    btn.textContent = 'Download (0)';
    btn.classList.add('disabled');
    btn.disabled = true;
  }
}
_global.updateDownloadBtnState = updateDownloadBtnState;

// Sync "Select All" checkbox state with current grid selection
function updateSelectAllCheckbox(checkboxId, containerId, attributeKey, selectedSet) {
  if (typeof document === 'undefined') return;
  const checkbox = document.getElementById(checkboxId);
  const grid = document.getElementById(containerId);
  if (!checkbox || !grid) return;

  const visibleCards = grid.querySelectorAll('.resource-card');
  if (visibleCards.length === 0) {
    checkbox.checked = false;
    return;
  }

  let allSelected = true;
  visibleCards.forEach(card => {
    if (!selectedSet.has(card.getAttribute(attributeKey))) allSelected = false;
  });

  checkbox.checked = allSelected;
}
_global.updateSelectAllCheckbox = updateSelectAllCheckbox;

// Ensure SVG string has XML namespace attribute for img rendering & sanitize non-standard feBlend mode values
function ensureSvgNamespace(content) {
  if (content && typeof content === 'string') {
    content = content.replace(/mode=["']plus-darker["']/gi, 'mode="darken"')
                     .replace(/mode=["']plus-lighter["']/gi, 'mode="lighten"');
  }
  if (content.includes('xmlns=')) return content;
  if (content.startsWith('<svg')) {
    return content.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}
_global.ensureSvgNamespace = ensureSvgNamespace;

// Convert inline SVG string to data: URL
function svgContentToDataUrl(content) {
  content = ensureSvgNamespace(content);
  try {
    const b64 = btoa(unescape(encodeURIComponent(content)));
    return 'data:image/svg+xml;base64,' + b64;
  } catch (err) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(content);
  }
}
_global.svgContentToDataUrl = svgContentToDataUrl;

// Escape HTML special characters for safe attribute insertion
function escAttr(val) {
  if (!val) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
_global.escAttr = escAttr;

// Universal preview modal launcher
function previewResource(url, filename, sizeLabel) {
  if (!url) return;
  if (typeof _global.openPreviewModal === 'function') {
    _global.openPreviewModal(url, filename, sizeLabel || '');
  } else if (typeof openPreviewModal === 'function') {
    openPreviewModal(url, filename, sizeLabel || '');
  } else {
    openResourceInNewTab(url);
  }
}
_global.previewResource = previewResource;

// Helper to copy text to clipboard using fallback DOM element (bypasses "Document is not focused" errors in side panels)
function copyTextFallback(text) {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
}
_global.copyTextFallback = copyTextFallback;

// Copy text safely without crashing if document is unfocused
async function safeCopyText(text, successToast = 'Copied URL to clipboard!') {
  if (typeof window !== 'undefined' && typeof window.focus === 'function') {
    try { window.focus(); } catch (e) {}
  }
  
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      if (_global.showToast) _global.showToast(successToast);
      return true;
    } catch (e) {
      // Document not focused or permission denied -> fallback to DOM copy
    }
  }

  const ok = copyTextFallback(text);
  if (ok) {
    if (_global.showToast) _global.showToast(successToast);
    return true;
  } else {
    if (_global.showToast) _global.showToast('Failed to copy');
    return false;
  }
}
_global.safeCopyText = safeCopyText;

// Copy resource image or URL to system clipboard with toast notification
async function copyResourceToClipboard(url) {
  if (!url) return;
  if (typeof window !== 'undefined' && typeof window.focus === 'function') {
    try { window.focus(); } catch (e) {}
  }

  // 1. Attempt image binary copy for image URLs
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/') || url.startsWith('blob:')) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type && blob.type.startsWith('image/')) {
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            let pngBlob = blob;
            if (blob.type !== 'image/png') {
              const img = new Image();
              img.src = url;
              await new Promise(r => { img.onload = r; img.onerror = r; });
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width || 300;
              canvas.height = img.naturalHeight || img.height || 150;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            }
            if (pngBlob) {
              const item = new ClipboardItem({ 'image/png': pngBlob });
              await navigator.clipboard.write([item]);
              if (_global.showToast) _global.showToast('Copied to clipboard!');
              return;
            }
          }
        }
      }
    } catch (imgErr) {
      // CORS fetch or ClipboardItem write failed -> safely fallback to text copy below
    }
  }

  // 2. Safe Fallback: Copy URL text to clipboard
  await safeCopyText(url, 'Copied URL to clipboard!');
}
_global.copyResourceToClipboard = copyResourceToClipboard;
_global.copyImageToClipboard = copyResourceToClipboard;

// Universal open link in new tab helper (wraps video streams in a clean HTML player with no-referrer to prevent black screen CORS bugs)
function openResourceInNewTab(url, options = {}) {
  if (!url) return;

  const isVideo = options.isVideo || 
    url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogv') || 
    url.endsWith('.mov') || url.endsWith('.m4v') || url.includes('.m3u8') ||
    url.includes('video/') || (options.type === 'video');

  let targetUrl = url;

  if (isVideo && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'))) {
    const title = options.title || getCleanFilenameFromUrl(url, '.mp4');
    const poster = options.poster || '';

    const playerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escAttr(title)} — MAX Player</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background-color: #09090b; color: #f4f4f5;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .player-container {
      position: relative; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #000;
    }
    video {
      width: 100%; height: 100%;
      max-width: 100vw; max-height: 100vh;
      object-fit: contain; outline: none;
    }
  </style>
</head>
<body>
  <div class="player-container">
    <video src="${escAttr(url)}" ${poster ? `poster="${escAttr(poster)}"` : ''} controls autoplay playsinline referrerpolicy="no-referrer"></video>
  </div>
</body>
</html>`;

    try {
      const blob = new Blob([playerHtml], { type: 'text/html;charset=utf-8' });
      targetUrl = URL.createObjectURL(blob);
    } catch (e) {
      targetUrl = url;
    }
  }

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: targetUrl });
  } else if (typeof window !== 'undefined') {
    window.open(targetUrl, '_blank');
  }
}
_global.openResourceInNewTab = openResourceInNewTab;

// Extract a clean, meaningful filename from a resource URL if missing or generic
function getCleanFilenameFromUrl(url, defaultExt = '.png') {
  if (!url) return `resource-${Date.now()}${defaultExt}`;
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:image\/([a-zA-Z0-9+]+);/);
    const ext = mimeMatch ? `.${mimeMatch[1]}` : defaultExt;
    return `extracted-image-${Date.now()}${ext}`;
  }
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    let lastSegment = segments.pop() || '';
    
    // Strip query string and hash
    lastSegment = lastSegment.split(/[?#]/)[0];
    const cleanName = lastSegment.toLowerCase();

    // If empty or generic ('download', 'file', 'image'), build from hostname or path segment
    if (!lastSegment || cleanName === 'download' || cleanName === 'file' || cleanName === 'image' || cleanName.startsWith('download.')) {
      const prevSegment = segments.pop();
      const baseHost = urlObj.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9]/g, '_');
      if (prevSegment) {
        lastSegment = `${prevSegment}-${lastSegment || 'file'}`;
      } else {
        lastSegment = `${baseHost}-${Date.now()}`;
      }
    }

    // Replace unsafe characters
    lastSegment = lastSegment.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!lastSegment.includes('.')) {
      lastSegment += defaultExt;
    }
    return lastSegment;
  } catch (e) {
    return `resource-${Date.now()}${defaultExt}`;
  }
}
_global.getCleanFilenameFromUrl = getCleanFilenameFromUrl;

// Unified single resource download function used across cards, modals, context menus, and capture tools
function downloadSingleResource(url, filename, options = {}) {
  if (!url) return;

  // Resolve clean filename if provided name is generic ('download', 'download.png') or missing
  let cleanName = (filename || '').trim();
  const lowerName = cleanName.toLowerCase();
  if (!cleanName || lowerName === 'download' || lowerName === 'file' || lowerName.startsWith('download.')) {
    cleanName = getCleanFilenameFromUrl(url);
  }

  const saveAsFlag = !!options.saveAs;
  const callback = typeof options === 'function' ? options : (options.callback || null);

  if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({
      url: url,
      filename: cleanName,
      conflictAction: 'uniquify',
      saveAs: saveAsFlag
    }, (downloadId) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error('Download failed:', err);
        if (_global.showToast) _global.showToast('Download failed');
        if (callback) callback(null);
      } else {
        if (_global.showToast) _global.showToast('Download started!');
        if (_global.showDonateNudge) _global.showDonateNudge();
        if (callback) callback(downloadId);
      }
    });
  } else if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (_global.showToast) _global.showToast('Download started!');
    if (callback) callback(null);
  }
}
_global.downloadSingleResource = downloadSingleResource;

// Helper to merge an edited canvas overlay with a base image element and download the composite result
async function mergeCanvasAndDownload(baseImg, editCanvas, filename) {
  if (!baseImg || !editCanvas) return;
  try {
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = baseImg.naturalWidth || editCanvas.width;
    saveCanvas.height = baseImg.naturalHeight || editCanvas.height;
    const ctx = saveCanvas.getContext('2d', { willReadFrequently: true });

    // Draw base image onto saveCanvas (fallback to blob fetch for CORS)
    try {
      ctx.drawImage(baseImg, 0, 0);
    } catch (corsErr) {
      const resp = await fetch(baseImg.src);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const safeImg = new Image();
      await new Promise(resolve => {
        safeImg.onload = resolve;
        safeImg.onerror = resolve;
        safeImg.src = blobUrl;
      });
      ctx.drawImage(safeImg, 0, 0);
      URL.revokeObjectURL(blobUrl);
    }

    // Draw edit canvas strokes & text
    ctx.drawImage(editCanvas, 0, 0);

    const editedDataUrl = saveCanvas.toDataURL('image/png');
    let cleanName = (filename || '').trim();
    if (!cleanName.toLowerCase().startsWith('edited-')) {
      cleanName = `edited-${cleanName}`;
    }
    if (!cleanName.toLowerCase().endsWith('.png')) {
      cleanName = cleanName.replace(/\.[^/.]+$/, '') + '.png';
    }

    downloadSingleResource(editedDataUrl, cleanName);
    return editedDataUrl;
  } catch (err) {
    console.error('Failed to merge and download canvas:', err);
    if (_global.showToast) _global.showToast('Failed to save edited image');
  }
}
_global.mergeCanvasAndDownload = mergeCanvasAndDownload;
