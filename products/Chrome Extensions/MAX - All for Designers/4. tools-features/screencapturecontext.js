/**
 * screencapturecontext.js — MAX Design Power-Pack
 * Screen Capture Context Menu Handling (Visible Area, Custom Area, Full Page, Screen Recorder)
 */

function sanitizeFilenameForScreenCapture(name) {
  if (!name) return 'screenshot';
  let cleanName = name.replace(/[\\/:*?"<>|]/g, '_');
  cleanName = cleanName.replace(/[^a-zA-Z0-9\s._-]/g, '');
  return cleanName.trim().replace(/\s+/g, ' ').replace(/_+/g, '_') || 'screenshot';
}

function getFormattedTimestampForScreenCapture() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const secondsFromMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return `${yy}${mm}${dd}-${secondsFromMidnight}`;
}

// Safe wrapper for chrome.tabs.captureVisibleTab with auto-retry and quota backoff
async function safeCaptureVisibleTab(windowId, formatOptions = { format: 'png' }, retries = 5, initialDelay = 650) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, formatOptions, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!res) {
            reject(new Error('Empty screenshot returned.'));
          } else {
            resolve(res);
          }
        });
      });
      return dataUrl;
    } catch (err) {
      const errMsg = err.message || '';
      const isQuotaError = errMsg.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') ||
                           errMsg.includes('quota') ||
                           errMsg.includes('exceeds');
      if (attempt < retries - 1) {
        const waitTime = isQuotaError ? Math.min(3000, Math.round(initialDelay * Math.pow(1.5, attempt))) : 500;
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        throw err;
      }
    }
  }
}

// ── Open Screen Recorder Popup Window (Single Instance with Auto Focus) ──
function openScreenRecorderWindow() {
  if (typeof chrome === 'undefined' || !chrome.windows || !chrome.tabs) return;

  const recorderUrl = chrome.runtime.getURL('2. screencapture/screencapture_recorder.html');

  // Query existing tabs to check if a recorder window is already open
  chrome.tabs.query({ url: recorderUrl }, (tabs) => {
    if (!chrome.runtime.lastError && tabs && tabs.length > 0) {
      const existingTab = tabs[0];
      if (existingTab.windowId) {
        chrome.windows.update(existingTab.windowId, { focused: true }, () => {
          if (chrome.runtime.lastError) {}
          if (existingTab.id) {
            chrome.tabs.update(existingTab.id, { active: true }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        });
        return;
      }
    }

    // If not open yet, create a new popup window
    chrome.windows.create({
      url: recorderUrl,
      type: 'popup',
      width: 550,
      height: 580,
      focused: true
    });
  });
}

// Helper: convert DataURL to target MIME in Service Worker using OffscreenCanvas
async function convertDataUrlFormatBg(dataUrl, mime) {
  if (!dataUrl || !mime) return dataUrl;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (blob.type === mime) return dataUrl;
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const outBlob = await canvas.convertToBlob({
      type: mime,
      quality: 1.0
    });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(outBlob);
    });
  } catch (e) {
    console.error('convertDataUrlFormatBg failed:', e);
    return dataUrl;
  }
}

// ── Perform Visible Area Capture directly in Background with Resolution Scale & Format ──
async function performVisibleCaptureDirectly(tab) {
  if (!tab || !tab.id) return;

  function isProtectedUrlBg(url) {
    if (!url) return false;
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') || 
           url.startsWith('about:') || 
           url.includes('chrome.google.com/webstore') || 
           url.includes('chromewebstore.google.com');
  }

  if (isProtectedUrlBg(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert('Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions.')
    }).catch(() => {});
    return;
  }

  const scaleData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureFormat', 'captureResolutionScale'], r));
  const saved = scaleData['maxSettings'] || {};
  const scale = parseInt(scaleData.captureResolutionScale, 10) || 1;
  const fmtKey = scaleData.captureFormat || saved.captureFormat || 'jpg';
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

  let dataUrl = null;

  if (scale > 1 && chrome.debugger) {
    try {
      await new Promise(r => chrome.debugger.attach({ tabId: tab.id }, '1.3', r));
      const layoutRes = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ baseDpr: window.devicePixelRatio || 1 })
      });
      const baseDpr = (layoutRes && layoutRes[0]) ? layoutRes[0].result.baseDpr : 1;

      await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.setDeviceMetricsOverride', {
        width: 0,
        height: 0,
        deviceScaleFactor: baseDpr * scale,
        mobile: false
      }, r));

      await new Promise(r => setTimeout(r, 250));

      const cdpFmt = formatConfig.mime === 'image/jpeg' ? 'jpeg' : 'png';
      const cdpMimePrefix = formatConfig.mime === 'image/jpeg' ? 'data:image/jpeg;base64,' : 'data:image/png;base64,';
      const cdpParams = { format: cdpFmt, fromSurface: true };
      if (cdpFmt === 'jpeg') cdpParams.quality = 100;

      const cdpRes = await new Promise((resolve) => {
        chrome.debugger.sendCommand({ tabId: tab.id }, 'Page.captureScreenshot', cdpParams, (r) => {
          if (chrome.runtime.lastError || !r || !r.data) resolve(null);
          else resolve(cdpMimePrefix + r.data);
        });
      });

      if (cdpRes) dataUrl = cdpRes;

      await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.clearDeviceMetricsOverride', {}, r));
      await new Promise(r => chrome.debugger.detach({ tabId: tab.id }, r));
    } catch (e) {
      try { chrome.debugger.detach({ tabId: tab.id }, () => {}); } catch(err){}
    }
  }

  if (!dataUrl) {
    dataUrl = await safeCaptureVisibleTab(tab.windowId, { format: formatConfig.chromeFormat });
  }

  if (dataUrl) {
    dataUrl = await convertDataUrlFormatBg(dataUrl, formatConfig.mime);

    const maxW = saved.maxCaptureWidth || 0;
    const maxH = saved.maxCaptureHeight !== undefined ? saved.maxCaptureHeight : 16000;
    let finalW = 0;
    let finalH = 0;

    if (typeof applyMaxDimensionLimitsToDataUrl === 'function') {
      const processed = await applyMaxDimensionLimitsToDataUrl(dataUrl, 0, 0, maxW, maxH, formatConfig.mime);
      dataUrl = processed.dataUrl;
      finalW = processed.width;
      finalH = processed.height;
    }

    const title = tab.title ? sanitizeFilenameForScreenCapture(tab.title) : 'screenshot';
    const timestamp = getFormattedTimestampForScreenCapture();
    const filename = (folderPrefix || '') + `${title} - ${timestamp}.${formatConfig.ext}`;

    downloadSingleResource(dataUrl, filename, {
      callback: (downloadId) => {
        const newItem = {
          id: 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          filename: filename,
          ext: formatConfig.ext.toUpperCase(),
          width: finalW,
          height: finalH,
          timestamp: Date.now(),
          pageTitle: tab.title || 'Webpage',
          pageUrl: tab.url || '',
          downloadId: downloadId
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
      }
    });

    // Show web toast on page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: ['Visible area captured & saved!'],
      func: (msg) => {
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
        setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; toast.style.opacity = '1'; }, 50);
        setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(20px)'; toast.style.opacity = '0'; }, 3000);
      }
    }).catch(() => {});
  }
}

// ── Perform Full Page Capture directly in Background without opening Popup ──
async function performFullPageCaptureDirectly(tab) {
  if (!tab || !tab.id) return;

  function isProtectedUrlBg(url) {
    if (!url) return false;
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') || 
           url.startsWith('about:') || 
           url.includes('chrome.google.com/webstore') || 
           url.includes('chromewebstore.google.com');
  }

  if (isProtectedUrlBg(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert('Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions.')
    }).catch(() => {});
    return;
  }

  await updateWebProgressHUDBg(tab.id, 0, 'Connecting to page...');

  const scaleData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureResolutionScale'], r));
  const savedSettings = scaleData['maxSettings'] || {};
  const rawScale = parseInt(scaleData.captureResolutionScale || savedSettings.captureResolutionScale, 10) || 1;
  const scale = Math.min(Math.max(1, rawScale), 2);

  let isCdpScaled = false;
  if (scale > 1 && chrome.debugger) {
    try {
      await new Promise(r => chrome.debugger.attach({ tabId: tab.id }, '1.3', r));
      const layoutRes = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ width: window.innerWidth, height: window.innerHeight, baseDpr: window.devicePixelRatio || 1 })
      });
      const layout = (layoutRes && layoutRes[0]) ? layoutRes[0].result : { width: 1920, height: 1080, baseDpr: 1 };
      await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.setDeviceMetricsOverride', {
        width: layout.width,
        height: layout.height,
        deviceScaleFactor: layout.baseDpr * scale,
        mobile: false
      }, r));
      await new Promise(r => setTimeout(r, 150));
      isCdpScaled = true;
    } catch (e) {
      try { chrome.debugger.detach({ tabId: tab.id }, () => {}); } catch(err){}
    }
  }

  let pageInfo = null;

  try {
    // 0. Inject DOM Strategy Modules
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        '2. screencapture/screencapture_full_finder.js',
        '2. screencapture/screencapture_full_cleaner.js',
        '2. screencapture/screencapture_full_lazyload.js',
        '2. screencapture/screencapture_full_snap.js'
      ]
    });

    // 1. Measure layout & initialize universal keyboard snap
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.__maxScreenCapture) {
          if (window.__maxScreenCapture.initContainers) {
            window.__maxScreenCapture.initContainers();
          }
          if (window.__maxScreenCapture.initUniversalSnap) {
            window.__maxScreenCapture.initUniversalSnap();
          }
          if (window.__maxScreenCapture.prepareLayout) {
            return window.__maxScreenCapture.prepareLayout();
          }
        }
        return {
          scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.documentElement.clientHeight),
          clientHeight: window.innerHeight,
          clientWidth: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio || 1,
          originalOverflow: document.body.style.overflow,
          originalScrollTop: window.scrollY || document.documentElement.scrollTop,
          originalHtmlScrollBehavior: document.documentElement.style.scrollBehavior,
          originalBodyScrollBehavior: document.body.style.scrollBehavior
        };
      }
    });

    if (!results || !results[0]) {
      throw new Error('Failed to read webpage layout data.');
    }

    pageInfo = results[0].result;
    const { scrollHeight, clientHeight, clientWidth, devicePixelRatio } = pageInfo;

    // Read format settings early for single-pass check
    const storageData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureFormat'], r));
    const saved = storageData['maxSettings'] || {};
    const fmtKey = storageData.captureFormat || saved.captureFormat || 'jpg';
    const map = {
      png:  { ext: 'png',  mime: 'image/png'  },
      jpg:  { ext: 'jpg',  mime: 'image/jpeg' },
      webp: { ext: 'webp', mime: 'image/webp' }
    };
    const fmt = map[fmtKey] || map['jpg'];

    // 🚀 CDP Re-render Engine (Single-Pass for <=16kpx, Big-Chunking for >16kpx)
    if (typeof captureSinglePassFullPage === 'function') {
      const singlePassDone = await captureSinglePassFullPage({
        tab: tab,
        pageInfo: pageInfo,
        fmt: fmt,
        saved: saved,
        isCdpScaled: isCdpScaled,
        scale: scale
      });
      if (singlePassDone) return;
    }

    await removeWebProgressHUDBg(tab.id, 0);

  } catch (error) {
    console.error('Direct full page capture error:', error);
    if (isCdpScaled && chrome.debugger) {
      try {
        await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.clearDeviceMetricsOverride', {}, r));
        await new Promise(r => chrome.debugger.detach({ tabId: tab.id }, r));
      } catch (e) {}
    }
    if (pageInfo && tab && tab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [pageInfo.originalScrollTop || 0],
          func: (top) => { window.scrollTo(0, top); }
        });
      } catch (e) {}
    }
    await removeWebProgressHUDBg(tab.id, 0);
  }
}

// Helper: Web Progress HUD in Background
async function updateWebProgressHUDBg(tabId, percent, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [percent, text],
      func: (pct, txt) => {
        let hud = document.getElementById('max-capture-progress-hud');
        if (!hud) {
          hud = document.createElement('div');
          hud.id = 'max-capture-progress-hud';
          hud.style.cssText = `
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483647 !important;
            background: var(--bg-primary, #0f172a) !important;
            border: 1px solid var(--accent-primary, #00f2fe) !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.25) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            color: var(--text-primary, #f8fafc) !important;
            padding: 12px 22px !important;
            border-radius: 14px !important;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 6px !important;
            min-width: 240px !important;
            pointer-events: none !important;
            user-select: none !important;
            opacity: 1 !important;
            transition: opacity 0.25s ease !important;
          `;
          hud.innerHTML = `
            <div id="max-hud-text" style="font-size: 12px !important; font-weight: 600 !important; color: var(--text-primary, #f8fafc) !important; text-align: center !important; letter-spacing: 0.2px !important;">Connecting...</div>
            <div style="width: 100% !important; height: 6px !important; background: var(--bg-secondary, rgba(255, 255, 255, 0.12)) !important; border-radius: 3px !important; overflow: hidden !important;">
              <div id="max-hud-bar" style="width: 0% !important; height: 100% !important; background: var(--accent-primary, #00f2fe) !important; border-radius: 3px !important; transition: width 0.15s ease !important;"></div>
            </div>
          `;
          (document.body || document.documentElement).appendChild(hud);
        }
        const textEl = document.getElementById('max-hud-text');
        const barEl = document.getElementById('max-hud-bar');
        if (textEl) textEl.textContent = txt;
        if (barEl) barEl.style.width = pct + '%';
      }
    });
  } catch (e) {}
}

async function removeWebProgressHUDBg(tabId, delayMs = 600) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [delayMs],
      func: (delay) => {
        const hud = document.getElementById('max-capture-progress-hud');
        if (hud) {
          hud.style.opacity = '0';
          setTimeout(() => {
            if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
          }, delay);
        }
      }
    });
  } catch (e) {}
}

// ── Context Menu Spec Provider ──
function getScreenCaptureContextMenuSpecs(data) {
  const captureMaster = data.screenCaptureContextEnabled !== false;
  const captureArea = captureMaster && (data.captureContext_area !== false);
  const captureVisible = captureMaster && (data.captureContext_visible !== false);
  const captureFull = captureMaster && (data.captureContext_full !== false);
  const captureRecord = captureMaster && (data.captureContext_record !== false);

  const items = [];
  if (captureArea) {
    items.push({
      id: 'context_capture_area',
      parentId: 'max_tools_parent',
      title: '📸 Capture Custom Area',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (captureVisible) {
    items.push({
      id: 'context_capture_visible',
      parentId: 'max_tools_parent',
      title: '📸 Capture Visible',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (captureFull) {
    items.push({
      id: 'context_capture_full',
      parentId: 'max_tools_parent',
      title: '📸 Capture Full Page',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (captureRecord) {
    items.push({
      id: 'context_capture_record',
      parentId: 'max_tools_parent',
      title: '🔴 Record Screen Video',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  return items;
}

// ── Context Menu Action Handler ──
function handleScreenCaptureContextMenuClick(info, tab) {
  switch (info.menuItemId) {
    case 'context_capture_area':
      if (tab && tab.id) {
        if (typeof createSelectionOverlay === 'function') {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: createSelectionOverlay
          }).catch(err => console.error('Failed to inject area capture overlay:', err));
        } else {
          chrome.tabs.sendMessage(tab.id, { action: 'start_area_capture' });
        }
      }
      return true;
    case 'context_capture_visible':
      performVisibleCaptureDirectly(tab);
      return true;
    case 'context_capture_full':
      performFullPageCaptureDirectly(tab);
      return true;
    case 'context_capture_record':
      openScreenRecorderWindow();
      return true;
  }
  return false;
}

// Export for background script & window
if (typeof self !== 'undefined') {
  self.openScreenRecorderWindow = openScreenRecorderWindow;
  self.performVisibleCaptureDirectly = performVisibleCaptureDirectly;
  self.performFullPageCaptureDirectly = performFullPageCaptureDirectly;
  self.getScreenCaptureContextMenuSpecs = getScreenCaptureContextMenuSpecs;
  self.handleScreenCaptureContextMenuClick = handleScreenCaptureContextMenuClick;
}
if (typeof window !== 'undefined') {
  window.openScreenRecorderWindow = openScreenRecorderWindow;
  window.performVisibleCaptureDirectly = performVisibleCaptureDirectly;
  window.performFullPageCaptureDirectly = performFullPageCaptureDirectly;
  window.getScreenCaptureContextMenuSpecs = getScreenCaptureContextMenuSpecs;
  window.handleScreenCaptureContextMenuClick = handleScreenCaptureContextMenuClick;
}
