// Screen Capture History Module

if (document.readyState !== 'loading') {
  initCaptureHistory();
} else {
  document.addEventListener('DOMContentLoaded', initCaptureHistory);
}

let isFileSchemeAllowed = false;

function initCaptureHistory() {
  const clearBtn = document.getElementById('clear-capture-history-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearCaptureHistory);
  }

  // Initialize Column Switcher (1, 2, 3 columns - default 2)
  initColumnSwitcher();

  // Load & verify history immediately upon extension open
  checkFileAccessPermission();
  loadAndVerifyCaptureHistory();

  // Auto-refresh and verify history when storage changes (e.g. recorder or new capture finished)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.captureHistory) {
        loadAndVerifyCaptureHistory();
      }
    });
  }

  // Auto-refresh history when a download completes (e.g. video finishes writing to disk)
  if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.onChanged) {
    chrome.downloads.onChanged.addListener((delta) => {
      if (delta.state && delta.state.current === 'complete') {
        chrome.storage.local.get({ captureHistory: [] }, (data) => {
          const history = data.captureHistory || [];
          const hasMatchingDownload = history.some(item => item.downloadId === delta.id);
          if (hasMatchingDownload) {
            loadAndVerifyCaptureHistory();
          }
        });
      }
    });
  }
}

function checkFileAccessPermission() {
  if (typeof chrome !== 'undefined' && chrome.extension && chrome.extension.isAllowedFileSchemeAccess) {
    chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
      isFileSchemeAllowed = isAllowed;
      const warningBanner = document.getElementById('file-access-warning');
      if (warningBanner) {
        if (isAllowed) {
          warningBanner.classList.add('hidden');
        } else {
          warningBanner.classList.remove('hidden');
        }
      }
    });

    // Hook open extensions link
    setTimeout(() => {
      const openLink = document.getElementById('open-extensions-link');
      if (openLink) {
        openLink.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
        });
      }
    }, 100);
  }
}

function initColumnSwitcher() {
  const switcher = document.getElementById('capture-history-col-switcher');
  const grid = document.getElementById('capture-history-grid');

  if (!switcher || !grid) return;

  const buttons = switcher.querySelectorAll('.col-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cols = btn.getAttribute('data-cols');

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      grid.classList.remove('cols-1', 'cols-2', 'cols-3');
      grid.classList.add(`cols-${cols}`);

      chrome.storage.local.set({ captureHistoryGridCols: cols });
    });
  });

  // Restore preference (Default: 2 columns)
  chrome.storage.local.get({ captureHistoryGridCols: '2' }, (data) => {
    const cols = data.captureHistoryGridCols || '2';
    const targetBtn = switcher.querySelector(`.col-btn[data-cols="${cols}"]`);
    if (targetBtn) {
      buttons.forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
      grid.classList.remove('cols-1', 'cols-2', 'cols-3');
      grid.classList.add(`cols-${cols}`);
    } else {
      grid.classList.remove('cols-1', 'cols-2', 'cols-3');
      grid.classList.add(`cols-${cols}`);
    }
  });
}

// Add a newly captured screenshot to history (stores metadata + downloadId only, no base64)
window.addCaptureToHistory = async function({ dataUrl, filename, ext, pageTitle, pageUrl, downloadId, width, height }) {
  // Measure dimensions from the dataUrl if not already provided (don't store the dataUrl)
  let w = width || 0;
  let h = height || 0;
  if (dataUrl && (!w || !h)) {
    const dimensions = await getImageDimensions(dataUrl);
    w = dimensions.width;
    h = dimensions.height;
  }

  const newItem = {
    id: 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    filename: filename || 'screenshot.png',
    ext: (ext || 'png').toUpperCase(),
    width: w,
    height: h,
    timestamp: Date.now(),
    pageTitle: pageTitle || 'Webpage',
    pageUrl: pageUrl || '',
    downloadId: downloadId || null
  };

  chrome.storage.local.get({ captureHistory: [] }, (data) => {
    let history = data.captureHistory || [];

    // Prepend new item, remove duplicates by filename, and limit to 20 items
    history = [newItem, ...history.filter(h => h.filename !== newItem.filename)].slice(0, 20);

    chrome.storage.local.set({ captureHistory: history }, () => {
      renderCaptureHistory(history);
    });
  });
};

// Load history items from storage and filter out deleted/missing files
async function loadAndVerifyCaptureHistory() {
  chrome.storage.local.get({ captureHistory: [] }, async (data) => {
    let history = data.captureHistory || [];
    if (!history.length) {
      renderCaptureHistory([]);
      return;
    }

    const verifiedHistory = [];

    for (const item of history) {
      let isStillValid = true;

      // Check download status with Chrome Downloads API if downloadId is stored
      if (item.downloadId && typeof chrome !== 'undefined' && chrome.downloads) {
        try {
          const results = await new Promise((resolve) => {
            chrome.downloads.search({ id: item.downloadId }, (res) => resolve(res || []));
          });

          if (results && results.length > 0) {
            const dl = results[0];
            // If download was interrupted or file no longer exists on disk, mark invalid
            if (dl.state === 'interrupted' || dl.exists === false) {
              isStillValid = false;
            } else if (dl.state === 'complete') {
              // Convert filename to file:/// URL
              item.localFileUrl = 'file:///' + dl.filename.replace(/\\/g, '/');
            }
          } else {
            // Download record no longer exists in Chrome
            isStillValid = false;
          }
        } catch (e) {
          console.warn('Failed to verify download status:', e);
        }
      }

      // Accept items that have a downloadId (new format), a localFileUrl resolved above,
      // or a legacy dataUrl sentinel (e.g. 'rec_video' for recordings)
      const hasValidSource = item.downloadId || item.localFileUrl || (item.dataUrl && item.dataUrl === 'rec_video');
      if (isStillValid && hasValidSource) {
        verifiedHistory.push(item);
      }
    }

    // Update storage if any dead items were removed
    if (verifiedHistory.length !== history.length) {
      chrome.storage.local.set({ captureHistory: verifiedHistory });
    }

    renderCaptureHistory(verifiedHistory);
  });
}

function escAttr(val) {
  if (!val) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Render History Items in Grid
function renderCaptureHistory(items) {
  const grid = document.getElementById('capture-history-grid');
  const countBadge = document.getElementById('capture-history-count');
  const emptyState = document.getElementById('capture-history-empty');

  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  }

  if (!items || items.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = items.map(item => {
    // [C9 Fix] 'rec_video' sentinel means blob URL was revoked — render a video placeholder instead
    const isRecVideo = item.dataUrl === 'rec_video';
    const recDate = item.timestamp
      ? (() => { const d = new Date(item.timestamp); return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; })()
      : '';

    // Use local file URL directly (no base64 stored anymore)
    const displayUrl = (isFileSchemeAllowed && item.localFileUrl) ? item.localFileUrl : null;
    const safeFilename = escAttr(item.filename);

    const previewHtml = isRecVideo
      ? `<div class="rec-video-placeholder" title="${safeFilename}">
           <span class="icon-mask" style="mask-image: url('svg/videos.svg'); -webkit-mask-image: url('svg/videos.svg'); width: 24px; height: 24px;"></span>
           <span class="rec-video-label">Saved to Downloads</span>
           ${recDate ? `<span class="rec-video-date">${recDate}</span>` : ''}
         </div>`
      : displayUrl
        ? `<img src="${escAttr(displayUrl)}" alt="${safeFilename}" loading="lazy" />`
        : `<div class="rec-video-placeholder img-no-access-placeholder" title="${safeFilename}">
             <span class="icon-mask" style="mask-image: url('svg/images.svg'); -webkit-mask-image: url('svg/images.svg'); width: 24px; height: 24px;"></span>
             <span class="rec-video-label">Enable file access to preview</span>
             <span class="rec-video-date">${recDate}</span>
           </div>`;
    const rightBadge = isRecVideo ? 'VIDEO' : (item.width && item.height ? `${item.width}×${item.height}` : 'IMAGE');

    const hasLocalFile = !!item.downloadId;
    const downloadTitle = hasLocalFile ? 'Show in folder' : 'Download';
    const downloadIcon = hasLocalFile
      ? `<span class="icon-mask" style="mask-image: url('svg/folder.svg'); -webkit-mask-image: url('svg/folder.svg');"></span>`
      : `<span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span>`;

    const deleteBtnHtml = `<button class="action-icon-btn history-action-btn delete-history-btn" title="Remove from history" data-id="${item.id}">
        <span class="icon-mask" style="mask-image: url('svg/delete.svg'); -webkit-mask-image: url('svg/delete.svg');"></span>
      </button>`;

    const actionBtnsHtml = `<button class="action-icon-btn history-action-btn view-history-btn" title="View" data-id="${item.id}">
           <span class="icon-mask" style="mask-image: url('svg/eye.svg'); -webkit-mask-image: url('svg/eye.svg');"></span>
         </button>
         <button class="action-icon-btn history-action-btn copy-history-btn" title="Copy image to clipboard" data-id="${item.id}">
           <span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span>
         </button>
         <button class="action-icon-btn history-action-btn open-history-btn" title="Open in new tab" data-id="${item.id}">
           <span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span>
         </button>
         <button class="action-icon-btn history-action-btn download-history-btn" title="${downloadTitle}" data-id="${item.id}">
           ${downloadIcon}
         </button>
         ${deleteBtnHtml}`;
    return `
    <div class="resource-card capture-history-card" data-id="${item.id}">
      <!-- Hover Actions Overlay -->
      <div class="resource-actions-overlay">${actionBtnsHtml}</div>

      <!-- Preview -->
      <div class="resource-preview-wrapper">${previewHtml}</div>

      <!-- Badges -->
      <div class="resource-badge-left">${item.ext}</div>
      <div class="resource-badge-right">${rightBadge}</div>
    </div>`;
  }).join('');

  // Bind click listeners for action buttons
  items.forEach(item => {
    const card = grid.querySelector(`.capture-history-card[data-id="${item.id}"]`);
    if (!card) return;

    // Mouseenter hover validation: check if file still exists on disk when user hovers card
    card.addEventListener('mouseenter', () => {
      if (item.downloadId && typeof chrome !== 'undefined' && chrome.downloads) {
        chrome.downloads.search({ id: item.downloadId }, (results) => {
          if (!results || results.length === 0 || results[0].exists === false || results[0].state === 'interrupted') {
            deleteSingleHistoryItem(item.id);
          }
        });
      }
    });

    const viewBtn = card.querySelector('.view-history-btn');
    const copyBtn = card.querySelector('.copy-history-btn');
    const downloadBtn = card.querySelector('.download-history-btn');
    const openBtn = card.querySelector('.open-history-btn');

    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = (isFileSchemeAllowed && item.localFileUrl) ? item.localFileUrl : (item.dataUrl && item.dataUrl !== 'rec_video' ? item.dataUrl : null);
        if (src) {
          copyImageToClipboard(src);
        } else {
          if (window.showToast) window.showToast('Unable to copy image');
        }
      });
    }

    const deleteBtn = card.querySelector('.delete-history-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSingleHistoryItem(item.id);
      });
    }

    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isRecVideo = item.dataUrl === 'rec_video';
        if (isRecVideo) {
          if (!isFileSchemeAllowed) {
            window.showToast("Please enable 'Allow access to file URLs' in extension settings to play local video.");
          } else if (!item.localFileUrl) {
            window.showToast("Local video file not found (it may be downloading or was recorded before reload).");
          } else {
            openInNewTab(item.localFileUrl);
          }
        } else if (!isFileSchemeAllowed) {
          window.showToast("Please enable 'Allow access to file URLs' in extension settings to preview images.");
        } else if (!item.localFileUrl) {
          // File not yet resolved — show in folder so user can locate it
          if (item.downloadId && typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.show === 'function') {
            chrome.downloads.show(item.downloadId);
          } else {
            window.showToast('Image file not found.');
          }
        } else {
          const sizeLabel = item.width && item.height ? `${item.width}×${item.height} px` : '';
          window.previewResource(item.localFileUrl, item.filename, sizeLabel);
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.downloadId && typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.show) {
          chrome.downloads.show(item.downloadId);
        } else {
          window.showToast('File not found in downloads.');
        }
      });
    }

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isRecVideo = item.dataUrl === 'rec_video';
        if (!isFileSchemeAllowed) {
          window.showToast("Please enable 'Allow access to file URLs' in extension settings to open local files.");
        } else if (isRecVideo || item.localFileUrl) {
          if (!item.localFileUrl) {
            window.showToast("Local file not found.");
          } else {
            window.openResourceInNewTab(item.localFileUrl);
          }
        } else {
          window.showToast("Local file not found.");
        }
      });
    }
  });
}

// Clear History
function clearCaptureHistory() {
  chrome.storage.local.set({ captureHistory: [] }, () => {
    renderCaptureHistory([]);
    if (window.showToast) window.showToast('Capture history cleared');
  });
}

// Delete a single history item by id
function deleteSingleHistoryItem(id) {
  chrome.storage.local.get({ captureHistory: [] }, (data) => {
    const updated = (data.captureHistory || []).filter(item => item.id !== id);
    chrome.storage.local.set({ captureHistory: updated }, () => {
      renderCaptureHistory(updated);
    });
  });
}

// Helper: Get image dimensions from data URL
function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = dataUrl;
  });
}

// Direct download fallback
function downloadDirect(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Open image in new tab
function openInNewTab(dataUrl) {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: dataUrl });
    } else {
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${dataUrl}" style="max-width:100%;height:auto;display:block;margin:auto;" />`);
      }
    }
  } catch (e) {
    console.error('Open in new tab failed:', e);
  }
}
window.openInNewTab = openInNewTab;

// Copy image src (local file or blob) to clipboard
async function copyImageToClipboard(src) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.src = src;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 150;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      }
      const item = new ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([item]);
      if (window.showToast) window.showToast('Copied to clipboard!');
    } else {
      if (window.showToast) window.showToast('Clipboard API not supported');
    }
  } catch (err) {
    if (window.showToast) window.showToast('Failed to copy image');
  }
}
