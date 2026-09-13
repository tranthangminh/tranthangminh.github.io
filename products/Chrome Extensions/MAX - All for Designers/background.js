// Background Service Worker for MAX - Design Power-Pack

// Import core utilities, screencapture, and context menu tools
importScripts('common/storage_schema.js');
importScripts('common/common_utils.js');
importScripts('4. tools-features/saveasfiletype.js');
importScripts('2. screencapture/screencapture_debugger.js');
importScripts('2. screencapture/screencapture_full_stitcher.js');
importScripts('2. screencapture/screencapture_full_singlepass.js');
importScripts('4. tools-features/screencapturecontext.js');
importScripts('4. tools-features/imagesearch.js');
importScripts('4. tools-features/tools-features.js');

// On startup or install, configure default icon behavior based on last saved view mode
chrome.runtime.onStartup.addListener(() => {
  syncPanelBehavior();
  if (typeof updateUnifiedContextMenus === 'function') updateUnifiedContextMenus();
});

chrome.runtime.onInstalled.addListener((details) => {
  syncPanelBehavior();
  if (typeof updateUnifiedContextMenus === 'function') updateUnifiedContextMenus();

  // Set the uninstall feedback page URL
  const feedbackUrl = 'https://tranthangminh.github.io/max-feedback/uninstall.html';
  chrome.runtime.setUninstallURL(feedbackUrl);

  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('thankyou.html')
    });
  }
});

// Auto-detect blob: image tabs (Messenger, WhatsApp, Discord) and inject auto-open-image-studio.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.url && tab.url.startsWith('blob:')) {
    chrome.storage.local.get({ directImageStudioEnabled: true }, (data) => {
      if (data.directImageStudioEnabled !== false) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['4. tools-features/auto-open-image-studio.js']
        }).catch(() => {});
      }
    });
  }
});

function syncPanelBehavior() {
  chrome.storage.local.get({ currentViewMode: 'sidepanel' }, (data) => {
    const isSidePanel = data.currentViewMode === 'sidepanel';
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isSidePanel })
      .catch((err) => console.error('Failed to set panel behavior on startup:', err));
  });
}
// Handle extension global keyboard shortcuts (Alt+Shift+Z/X/C/V)
if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let tab = tabs && tabs[0];

      const executeCommand = (activeTab) => {
        if (!activeTab || !activeTab.id) return;

        if (command === 'capture_area') {
          if (typeof createSelectionOverlay === 'function') {
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: createSelectionOverlay
            }).catch((err) => console.error('Area capture command error:', err));
          }
        } else if (command === 'capture_visible') {
          if (typeof performVisibleCaptureDirectly === 'function') {
            performVisibleCaptureDirectly(activeTab);
          }
        } else if (command === 'capture_full') {
          if (typeof performFullPageCaptureDirectly === 'function') {
            performFullPageCaptureDirectly(activeTab);
          }
        } else if (command === 'capture_record') {
          if (typeof openScreenRecorderWindow === 'function') {
            openScreenRecorderWindow();
          }
        }
      };

      if (tab) {
        executeCommand(tab);
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (fallbackTabs) => {
          if (fallbackTabs && fallbackTabs[0]) {
            executeCommand(fallbackTabs[0]);
          }
        });
      }
    });
  });
}

// Handle screenshot capture & context menu messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'update_context_menus' || message.action === 'update_save_as_context_menu' || message.action === 'update_google_search_context_menu') {
    if (typeof updateUnifiedContextMenus === 'function') {
      updateUnifiedContextMenus();
    }
  }

  if (message.action === 'trigger_capture_visible') {
    const targetTabId = message.tabId || (sender.tab && sender.tab.id);
    if (targetTabId) {
      chrome.tabs.get(targetTabId, (tab) => {
        if (tab && typeof performVisibleCaptureDirectly === 'function') {
          performVisibleCaptureDirectly(tab);
        }
      });
    }
  }

  if (message.action === 'trigger_capture_full') {
    const targetTabId = message.tabId || (sender.tab && sender.tab.id);
    if (targetTabId) {
      chrome.tabs.get(targetTabId, (tab) => {
        if (tab && typeof performFullPageCaptureDirectly === 'function') {
          performFullPageCaptureDirectly(tab);
        }
      });
    }
  }

  if (message.action === 'trigger_screen_recorder') {
    if (typeof openScreenRecorderWindow === 'function') {
      openScreenRecorderWindow();
    }
  }

  if (message.action === 'start_area_capture') {
    const targetTabId = message.tabId || (sender.tab && sender.tab.id);
    const executeAreaCapture = (tabId) => {
      chrome.storage.local.get(['captureResolutionScale'], async (data) => {
        const scale = parseInt(data.captureResolutionScale, 10) || 1;
        if (scale > 1 && tabId && chrome.debugger) {
          try {
            await new Promise(r => chrome.debugger.attach({ tabId }, '1.3', () => {
              if (chrome.runtime.lastError) {}
              r();
            }));
          } catch (e) {}
        }
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: createSelectionOverlay
        }).catch(err => console.error('Overlay injection error:', err));
      });
    };

    if (targetTabId) {
      executeAreaCapture(targetTabId);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          executeAreaCapture(tabs[0].id);
        }
      });
    }
  }

  if (message.action === 'area_cancelled') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && chrome.debugger) {
      try {
        chrome.debugger.detach({ tabId }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (e) {}
    }
  }

  if (message.action === 'area_selected') {
    const tabId = sender.tab ? sender.tab.id : null;
    const windowId = sender.tab ? sender.tab.windowId : null;

    chrome.storage.local.get(['maxSettings', 'captureFormat', 'captureResolutionScale'], async (data) => {
      const saved = data['maxSettings'] || {};
      const scale = parseInt(data.captureResolutionScale, 10) || 1;
      const fmtKey = data.captureFormat || saved.captureFormat || 'jpg';
      const map = {
        png:  { ext: 'png',  mime: 'image/png',  chromeFormat: 'png'  },
        jpg:  { ext: 'jpg',  mime: 'image/jpeg', chromeFormat: 'jpeg' },
        webp: { ext: 'webp', mime: 'image/webp', chromeFormat: 'png'  }
      };
      const formatConfig = map[fmtKey] || map['jpg'];

      let folderPrefix = '';
      if (saved.downloadLocation === 'subfolder') {
        const folder = (saved.subfolderName || 'MAX Downloads').replace(/[/\\]+$/, '');
        folderPrefix = folder + '/';
      }

      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const secondsFromMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const timestamp = `${yy}${mm}${dd}-${secondsFromMidnight}`;

      let dataUrl = null;

      if (scale > 1 && tabId && chrome.debugger) {
        try {
          await new Promise(r => chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) {}
            r();
          }));
          const layoutResults = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => ({ baseDpr: window.devicePixelRatio || 1 })
          });
          const baseDpr = (layoutResults && layoutResults[0]) ? layoutResults[0].result.baseDpr : 1;

          await new Promise(r => chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
            width: 0,
            height: 0,
            deviceScaleFactor: baseDpr * scale,
            mobile: false
          }, r));

          await new Promise(r => setTimeout(r, 250));

          // CDP Page.captureScreenshot supports 'jpeg' or 'png' only;
          // WebP is captured as PNG first, then converted during crop in cropAndDownloadInTab
          const cdpFmt = formatConfig.mime === 'image/jpeg' ? 'jpeg' : 'png';
          const cdpMimePrefix = formatConfig.mime === 'image/jpeg' ? 'data:image/jpeg;base64,' : 'data:image/png;base64,';
          const cdpParams = { format: cdpFmt, fromSurface: true };
          if (cdpFmt === 'jpeg') cdpParams.quality = 92;

          const cdpRes = await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', cdpParams, (r) => {
              if (chrome.runtime.lastError || !r || !r.data) resolve(null);
              else resolve(cdpMimePrefix + r.data);
            });
          });

          if (cdpRes) {
            dataUrl = cdpRes;
          }

          await new Promise(r => chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {}, r));
          await new Promise(r => chrome.debugger.detach({ tabId }, r));
        } catch (e) {
          try { chrome.debugger.detach({ tabId }, () => {}); } catch(err){}
        }
      }

      if (!dataUrl) {
        dataUrl = await new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(windowId, { format: formatConfig.chromeFormat }, (res) => resolve(res));
        });
      }

      if (tabId && dataUrl) {
        const maxW = saved.maxCaptureWidth || 0;
        const maxH = saved.maxCaptureHeight !== undefined ? saved.maxCaptureHeight : 16000;

        chrome.scripting.executeScript({
          target: { tabId: tabId },
          args: [dataUrl, message.coords, formatConfig, folderPrefix, timestamp, maxW, maxH],
          func: cropAndDownloadInTab
        }).catch(err => console.error('Crop script injection error:', err));
      }
    });
  }

  if (message.action === 'download_and_save_area_capture') {
    chrome.downloads.download({
      url: message.croppedDataUrl,
      filename: message.filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (downloadId) => {
      const dId = chrome.runtime.lastError ? null : downloadId;

      const newItem = {
        id: 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        filename: message.filename,
        ext: message.ext.toUpperCase(),
        width: message.width || 0,
        height: message.height || 0,
        timestamp: Date.now(),
        pageTitle: message.pageTitle || 'Webpage',
        pageUrl: message.pageUrl || '',
        downloadId: dId
      };
      if (typeof saveVerifiedCaptureHistoryItem === 'function') {
        saveVerifiedCaptureHistoryItem(newItem);
      } else {
        chrome.storage.local.get({ captureHistory: [] }, (res) => {
          let history = res.captureHistory || [];
          history = [newItem, ...history.filter(h => h.filename !== newItem.filename)].slice(0, 20);
          chrome.storage.local.set({ captureHistory: history });
        });
      }
    });
  }

  if (message.action === 'get_image_file_size') {
    fetch(message.url, { method: 'HEAD' })
      .then(res => {
        const len = res.headers.get('content-length');
        sendResponse({ success: true, size: len ? parseInt(len) : null });
      })
      .catch(() => {
        fetch(message.url, { method: 'GET', headers: { 'Range': 'bytes=0-1' } })
          .then(res => {
            const len = res.headers.get('content-length');
            sendResponse({ success: true, size: len ? parseInt(len) : null });
          })
          .catch(() => sendResponse({ success: false }));
      });
    return true; // Keep response channel open for async response
  }

  if (message.action === 'execute_context_menu_action') {
    if (typeof executeFallbackAction === 'function') {
      executeFallbackAction(message.menuItemId, message.imageUrl);
    } else if (self.executeFallbackAction) {
      self.executeFallbackAction(message.menuItemId, message.imageUrl);
    }
  }
});

// Selection Overlay Injection Script
function createSelectionOverlay() {
  if (document.getElementById('max-capture-overlay')) return;

  const docEl = document.documentElement || document.body;
  const originalOverflow = document.body ? document.body.style.overflow : '';
  if (document.body) document.body.style.overflow = 'hidden';

  const style = document.createElement('style');
  style.id = 'max-capture-style';
  style.textContent = `
    #max-capture-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      background-color: rgba(0, 0, 0, 0.45) !important;
      cursor: crosshair !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      transition: background-color 0.1s ease !important;
    }
    #max-capture-overlay.selecting {
      background-color: transparent !important;
    }
    #max-capture-box {
      position: fixed !important;
      border: 2px dashed #00f2fe !important;
      box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.55), 0 0 16px rgba(0, 242, 254, 0.4) !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      display: none;
      box-sizing: border-box !important;
      background: transparent !important;
    }
    #max-capture-label {
      position: absolute !important;
      bottom: -28px !important;
      right: 0 !important;
      background-color: #0f172a !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: #f9fafb !important;
      padding: 3px 8px !important;
      border-radius: 4px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      white-space: nowrap !important;
      pointer-events: none !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
    }
  `;
  (document.head || docEl).appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'max-capture-overlay';

  const box = document.createElement('div');
  box.id = 'max-capture-box';

  const label = document.createElement('div');
  label.id = 'max-capture-label';
  box.appendChild(label);

  overlay.appendChild(box);
  (document.body || docEl).appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    overlay.classList.add('selecting');
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = startX + 'px';
    box.style.top = startY + 'px';
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(startX - currentX);
    const h = Math.abs(startY - currentY);

    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';

    label.textContent = `${w} × ${h} px`;
    if (y + h + 35 > window.innerHeight) {
      label.style.bottom = 'auto';
      label.style.top = '-28px';
    } else {
      label.style.top = 'auto';
      label.style.bottom = '-28px';
    }
  };

  const onMouseUp = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    overlay.classList.remove('selecting');

    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(startX - currentX);
    const h = Math.abs(startY - currentY);

    cleanup();

    if (w > 5 && h > 5) {
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'area_selected',
          coords: { x, y, w, h, dpr: window.devicePixelRatio || 1 }
        });
      }, 80);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      try {
        chrome.runtime.sendMessage({ action: 'area_cancelled' });
      } catch(err) {}
    }
  };

  const cleanup = () => {
    overlay.removeEventListener('mousedown', onMouseDown, true);
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    if (document.body) document.body.style.overflow = originalOverflow;
    overlay.remove();
    style.remove();
  };

  overlay.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('keydown', onKeyDown, true);
}

// Cropping and Web Toast Injection Script
function cropAndDownloadInTab(dataUrl, coords, formatConfig, folderPrefix, timestamp, maxW = 0, maxH = 16000) {
  function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
  }

  function sanitizeFilename(name) {
    if (!name) return 'screenshot';
    let cleanName = removeVietnameseTones(name);
    cleanName = cleanName.replace(/[\\/:*?"<>|]/g, '_');
    cleanName = cleanName.replace(/[^a-zA-Z0-9\s._-]/g, '');
    return cleanName.trim().replace(/\s+/g, ' ').replace(/_+/g, '_') || 'screenshot';
  }

  const img = new Image();
  img.onload = () => {
    const scaleX = (img.naturalWidth || img.width) / window.innerWidth;
    const scaleY = (img.naturalHeight || img.height) / window.innerHeight;

    const cropX = Math.round(coords.x * scaleX);
    const cropY = Math.round(coords.y * scaleY);
    const cropW = Math.round(coords.w * scaleX);
    const cropH = Math.round(coords.h * scaleY);

    let targetW = cropW;
    let targetH = cropH;

    const maxWVal = parseInt(maxW, 10) || 0;
    const maxHVal = parseInt(maxH, 10) || 0;

    // Aspect Ratio Downscale if maxW limit set
    if (maxWVal > 0 && targetW > maxWVal) {
      const ratio = maxWVal / targetW;
      targetW = maxWVal;
      targetH = Math.round(targetH * ratio);
    }

    // Hard Crop Height if maxH limit set
    if (maxHVal > 0 && targetH > maxHVal) {
      targetH = maxHVal;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const drawH = Math.round(cropH * (targetW / cropW));

    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      targetW,
      drawH
    );

    const pageTitle = sanitizeFilename(document.title);
    const finalFilename = (folderPrefix || '') + `${pageTitle} - ${timestamp}.${formatConfig.ext}`;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const croppedDataUrl = canvas.toDataURL(formatConfig.mime, 1.0);

      // Send message to background script to trigger the download and add it to the history
      chrome.runtime.sendMessage({
        action: 'download_and_save_area_capture',
        croppedDataUrl: croppedDataUrl,
        filename: finalFilename,
        ext: formatConfig.ext,
        width: canvas.width,
        height: canvas.height,
        pageTitle: document.title || 'Webpage',
        pageUrl: window.location.href || ''
      });

      // Copy PNG to Clipboard
      let copied = false;
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            showWebToast('Area captured & copied!');
          }).catch(() => {
            showWebToast('Area captured!');
          });
          copied = true;
        } catch (e) {
          showWebToast('Area captured!');
        }
      }
      if (!copied) {
        showWebToast('Area captured!');
      }

    }, formatConfig.mime, formatConfig.mime === 'image/jpeg' ? 0.92 : undefined);
  };
  img.src = dataUrl;

  function showWebToast(msg) {
    let toast = document.getElementById('max-web-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'max-web-toast';
      toast.style.cssText = `
        position: fixed !important;
        bottom: 30px !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(20px) !important;
        background: var(--accent-primary, #00f2fe) !important;
        color: var(--text-on-accent, #0f172a) !important;
        border: 1px solid var(--accent-primary, #00f2fe) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
        padding: 12px 24px !important;
        border-radius: 24px !important;
        z-index: 2147483647 !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        opacity: 0 !important;
        transition: all 0.3s ease !important;
        pointer-events: auto !important;
      `;
      (document.body || document.documentElement).appendChild(toast);
    }

    toast.textContent = msg;

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    }, 50);

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      toast.style.opacity = '0';
    }, 3000);

    // Reuse existing Support MAX module (7-day throttled)
    if (typeof showDonateNudge === 'function') {
      showDonateNudge();
    }
  }
}
