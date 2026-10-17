/**
 * screencapturecontext.js — Design-Power Pack by Max
 * Screen Capture Context Menu Handling (Visible, Area, Full Page, Recorder)
 */

function sanitizeCaptureFilename(name) {
  return (name || 'screenshot').replace(/[\\/:*?"<>|]/g, '_').replace(/[^a-zA-Z0-9\s._-]/g, '').trim().replace(/\s+/g, ' ') || 'screenshot';
}

function getCaptureTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${sec}`;
}

function isProtectedUrl(url) {
  if (!url) return false;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') ||
         url.includes('chrome.google.com/webstore') || url.includes('chromewebstore.google.com');
}

function notifyProtectedPage(tab) {
  if (!tab?.id || !chrome.action?.setBadgeText) return;
  try {
    chrome.action.setBadgeText({ tabId: tab.id, text: '✕' });
    chrome.action.setBadgeBackgroundColor?.({ tabId: tab.id, color: '#ef4444' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: '' }), 3000);
  } catch {}
}

async function safeCaptureVisibleTab(windowId, formatOptions = { format: 'png' }, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, formatOptions, (res) => {
          if (chrome.runtime.lastError || !res) reject(new Error(chrome.runtime.lastError?.message || 'Empty'));
          else resolve(res);
        });
      });
    } catch (err) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
      else throw err;
    }
  }
}

function openScreenRecorderWindow() {
  if (!chrome.windows || !chrome.tabs) return;
  const url = chrome.runtime.getURL('2. screencapture/screencapture_recorder.html');

  chrome.tabs.query({ url }, (tabs) => {
    if (tabs?.[0]?.windowId) {
      chrome.windows.update(tabs[0].windowId, { focused: true });
      chrome.tabs.update(tabs[0].id, { active: true });
      return;
    }
    chrome.windows.create({ url, type: 'popup', width: 550, height: 580, focused: true });
  });
}

async function convertDataUrlFormatBg(dataUrl, mime) {
  if (!dataUrl || !mime) return dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    if (blob.type === mime) return dataUrl;
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    const outBlob = await canvas.convertToBlob({ type: mime, quality: 1.0 });
    return await new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(outBlob);
    });
  } catch {
    return dataUrl;
  }
}

// ── Direct Visible Capture ──
async function performVisibleCaptureDirectly(tab) {
  if (!tab?.id) return;
  if (isProtectedUrl(tab.url)) {
    notifyProtectedPage(tab);
    return;
  }

  const scaleData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureFormat', 'captureResolutionScale'], r));
  const saved = scaleData.maxSettings || {};
  const scale = parseInt(scaleData.captureResolutionScale, 10) || 1;
  const fmtKey = scaleData.captureFormat || saved.captureFormat || 'jpg';
  const formatMap = {
    png:  { ext: 'png',  mime: 'image/png',  chromeFormat: 'png' },
    jpg:  { ext: 'jpg',  mime: 'image/jpeg', chromeFormat: 'jpeg' },
    webp: { ext: 'webp', mime: 'image/webp', chromeFormat: 'png' }
  };
  const fmt = formatMap[fmtKey] || formatMap.jpg;
  const folder = saved.downloadLocation === 'subfolder' ? `${(saved.subfolderName || 'MAX Downloads').replace(/[/\\]+$/, '')}/` : '';

  let dataUrl = null;

  if (scale > 1 && chrome.debugger) {
    try {
      await new Promise(r => chrome.debugger.attach({ tabId: tab.id }, '1.3', r));
      const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.devicePixelRatio || 1 });
      const dpr = res?.[0]?.result || 1;

      await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.setDeviceMetricsOverride', {
        width: 0, height: 0, deviceScaleFactor: dpr * scale, mobile: false
      }, r));
      await new Promise(r => setTimeout(r, 200));

      const cdpFmt = fmt.mime === 'image/jpeg' ? 'jpeg' : 'png';
      const cdpRes = await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Page.captureScreenshot', { format: cdpFmt, fromSurface: true, quality: 100 }, (d) => r(d?.data)));
      if (cdpRes) dataUrl = (fmt.mime === 'image/jpeg' ? 'data:image/jpeg;base64,' : 'data:image/png;base64,') + cdpRes;

      await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.clearDeviceMetricsOverride', {}, r));
      await new Promise(r => chrome.debugger.detach({ tabId: tab.id }, r));
    } catch {
      try { chrome.debugger.detach({ tabId: tab.id }, () => {}); } catch {}
    }
  }

  if (!dataUrl) dataUrl = await safeCaptureVisibleTab(tab.windowId, { format: fmt.chromeFormat });
  if (!dataUrl) return;

  dataUrl = await convertDataUrlFormatBg(dataUrl, fmt.mime);

  let finalW = 0, finalH = 0;
  if (typeof applyMaxDimensionLimitsToDataUrl === 'function') {
    const processed = await applyMaxDimensionLimitsToDataUrl(dataUrl, 0, 0, saved.maxCaptureWidth || 0, saved.maxCaptureHeight ?? 16000, fmt.mime);
    dataUrl = processed.dataUrl;
    finalW = processed.width;
    finalH = processed.height;
  }

  const title = sanitizeCaptureFilename(tab.title);
  const filename = `${folder}${title} - ${getCaptureTimestamp()}.${fmt.ext}`;

  downloadSingleResource(dataUrl, filename, {
    callback: (downloadId) => {
      saveVerifiedCaptureHistoryItem?.({
        id: `cap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        filename,
        ext: fmt.ext.toUpperCase(),
        width: finalW,
        height: finalH,
        timestamp: Date.now(),
        pageTitle: tab.title || 'Webpage',
        pageUrl: tab.url || '',
        downloadId
      });
    }
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: ['Visible area captured & saved!'],
    func: (msg) => window.showToast?.(msg)
  }).catch(() => {});
}

// ── Direct Full Page Capture ──
async function performFullPageCaptureDirectly(tab) {
  if (!tab?.id) return;
  if (isProtectedUrl(tab.url)) {
    notifyProtectedPage(tab);
    return;
  }

  await updateWebProgressHUDBg(tab.id, 0, 'Connecting to page...');

  const scaleData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureResolutionScale'], r));
  const saved = scaleData.maxSettings || {};
  const scale = Math.min(Math.max(1, parseInt(scaleData.captureResolutionScale || saved.captureResolutionScale, 10) || 1), 2);
  const isCdpScaled = false;

  let pageInfo = null;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        '2. screencapture/screencapture_full_finder.js',
        '2. screencapture/screencapture_full_cleaner.js',
        '2. screencapture/screencapture_full_lazyload.js',
        '2. screencapture/screencapture_full_snap.js'
      ]
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.__maxScreenCapture?.initContainers?.();
        window.__maxScreenCapture?.initUniversalSnap?.();
        if (window.__maxScreenCapture?.prepareLayout) return window.__maxScreenCapture.prepareLayout();
        return {
          scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
          clientHeight: window.innerHeight,
          clientWidth: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio || 1,
          originalScrollTop: window.scrollY || document.documentElement.scrollTop
        };
      }
    });

    pageInfo = results?.[0]?.result;
    if (!pageInfo) throw new Error('Cannot measure layout.');

    const storageData = await new Promise(r => chrome.storage.local.get(['maxSettings', 'captureFormat'], r));
    const fmtKey = storageData.captureFormat || storageData.maxSettings?.captureFormat || 'jpg';
    const fmt = { png: { ext: 'png', mime: 'image/png' }, jpg: { ext: 'jpg', mime: 'image/jpeg' }, webp: { ext: 'webp', mime: 'image/webp' } }[fmtKey] || { ext: 'jpg', mime: 'image/jpeg' };

    if (typeof captureSinglePassFullPage === 'function') {
      const done = await captureSinglePassFullPage({ tab, pageInfo, fmt, saved, isCdpScaled: false, scale });
      if (done) return;
    }
    await removeWebProgressHUDBg(tab.id, 0);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: ['Could not complete full page screenshot on this webpage.'],
      func: (msg) => window.showToast?.(msg)
    }).catch(() => {});
  } catch (err) {
    console.error('Full page capture error:', err);
    if (isCdpScaled && chrome.debugger) {
      try {
        await new Promise(r => chrome.debugger.sendCommand({ tabId: tab.id }, 'Emulation.clearDeviceMetricsOverride', {}, r));
        await new Promise(r => chrome.debugger.detach({ tabId: tab.id }, r));
      } catch {}
    }
    if (pageInfo?.originalScrollTop && tab?.id) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, args: [pageInfo.originalScrollTop], func: (top) => window.scrollTo(0, top) }).catch(() => {});
    }
    await removeWebProgressHUDBg(tab.id, 0);
  }
}

// Web Progress HUD
async function updateWebProgressHUDBg(tabId, pct, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [pct, text],
      func: (p, t) => {
        let hud = document.getElementById('max-capture-progress-hud');
        if (!hud) {
          hud = document.createElement('div');
          hud.id = 'max-capture-progress-hud';
          hud.style.cssText = 'position:fixed!important;bottom:24px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;background:#0f172a!important;border:1px solid #00f2fe!important;box-shadow:0 12px 36px rgba(0,0,0,0.6)!important;color:#f8fafc!important;padding:12px 22px!important;border-radius:14px!important;font-family:sans-serif!important;min-width:220px!important;pointer-events:none!important;';
          hud.innerHTML = '<div id="max-hud-text" style="font-size:12px!important;font-weight:600!important;text-align:center!important;margin-bottom:6px!important;">Connecting...</div><div style="width:100%!important;height:6px!important;background:rgba(255,255,255,0.12)!important;border-radius:3px!important;overflow:hidden!important;"><div id="max-hud-bar" style="width:0%!important;height:100%!important;background:#00f2fe!important;transition:width 0.15s ease!important;"></div></div>';
          (document.body || document.documentElement).appendChild(hud);
        }
        document.getElementById('max-hud-text').textContent = t;
        document.getElementById('max-hud-bar').style.width = `${p}%`;
      }
    });
  } catch {}
}

async function removeWebProgressHUDBg(tabId, delayMs = 500) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [delayMs],
      func: (d) => {
        const hud = document.getElementById('max-capture-progress-hud');
        if (hud) setTimeout(() => hud.remove(), d);
      }
    });
  } catch {}
}

// ── Context Menu Spec Provider ──
function getScreenCaptureContextMenuSpecs(data, lang = 'vi') {
  if (data.screenCaptureContextEnabled === false) return [];
  const isVi = lang === 'vi';
  const items = [
    { key: 'area',    id: 'context_capture_area',    title: isVi ? '📸 Chụp vùng tùy chọn' : '📸 Capture Custom Area' },
    { key: 'visible', id: 'context_capture_visible', title: isVi ? '📸 Chụp vùng hiển thị' : '📸 Capture Visible' },
    { key: 'full',    id: 'context_capture_full',    title: isVi ? '📸 Chụp toàn trang' : '📸 Capture Full Page' },
    { key: 'record',  id: 'context_capture_record',  title: isVi ? '🔴 Quay video màn hình' : '🔴 Record Screen Video' }
  ];

  return items
    .filter(i => data[`captureContext_${i.key}`] !== false)
    .map(i => ({
      id: i.id,
      parentId: 'max_tools_parent',
      title: i.title,
      contexts: ['page', 'selection', 'link', 'image', 'video']
    }));
}

function handleScreenCaptureContextMenuClick(info, tab) {
  switch (info.menuItemId) {
    case 'context_capture_area':
      if (tab?.id) {
        if (typeof createSelectionOverlay === 'function') {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, func: createSelectionOverlay }).catch(() => {});
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

// Exports
(function(g) {
  g.sanitizeCaptureFilename = sanitizeCaptureFilename;
  g.getCaptureTimestamp = getCaptureTimestamp;
  g.openScreenRecorderWindow = openScreenRecorderWindow;
  g.performVisibleCaptureDirectly = performVisibleCaptureDirectly;
  g.performFullPageCaptureDirectly = performFullPageCaptureDirectly;
  g.getScreenCaptureContextMenuSpecs = getScreenCaptureContextMenuSpecs;
  g.handleScreenCaptureContextMenuClick = handleScreenCaptureContextMenuClick;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
