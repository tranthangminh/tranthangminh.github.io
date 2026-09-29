/**
 * saveasfiletype.js — MAX Design Power-Pack
 * Save Image As Type Context Menu Tool (JPG, PNG, WebP, GIF, PDF)
 */

const SAVE_AS_TYPE_STORAGE_KEY = 'saveAsFileTypeEnabled';

// ── Convert image blob to valid PDF 1.4 Uint8Array Data URL ──
async function imageToPdfDataUrl(jpegBlob) {
  const arrayBuffer = await jpegBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const bitmap = await createImageBitmap(jpegBlob);
  const w = bitmap.width;
  const h = bitmap.height;

  const header = `%PDF-1.4\n`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;

  const streamText = `q\n${w} 0 0 ${h} 0 0 cm\n/Im1 Do\nQ\n`;
  const obj5 = `5 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}endstream\nendobj\n`;
  const obj4Head = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`;
  const obj4Tail = `\nendstream\nendobj\n`;

  const enc = new TextEncoder();
  const blobParts = [
    enc.encode(header),
    enc.encode(obj1),
    enc.encode(obj2),
    enc.encode(obj3),
    enc.encode(obj4Head),
    bytes,
    enc.encode(obj4Tail),
    enc.encode(obj5)
  ];

  let offset = header.length;
  const offsets = [0];

  offsets.push(offset);
  offset += enc.encode(obj1).length;

  offsets.push(offset);
  offset += enc.encode(obj2).length;

  offsets.push(offset);
  offset += enc.encode(obj3).length;

  offsets.push(offset);
  offset += enc.encode(obj4Head).length + bytes.length + enc.encode(obj4Tail).length;

  offsets.push(offset);
  offset += enc.encode(obj5).length;

  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ` 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  blobParts.push(enc.encode(xref));
  blobParts.push(enc.encode(trailer));

  const pdfBlob = new Blob(blobParts, { type: 'application/pdf' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(pdfBlob);
  });
}

// ── Fallback helper to fetch/convert image in the active tab context ──
async function convertImageInTab(srcUrl, mimeType) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error('No active tab available');

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (url, type) => {
      try {
        // Try fetching in page context first (inherits page cookies & headers)
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        // Fallback: draw onto HTML5 canvas
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL(type, 0.95));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });
      }
    },
    args: [srcUrl, mimeType]
  });

  if (results && results[0] && results[0].result) {
    return results[0].result;
  }
  throw new Error('Tab script returned empty result');
}

// Helper to convert blob to Data URL
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// ── Convert image URL to target file format ──
async function convertAndSaveImage(srcUrl, targetFormat) {
  let mimeType = 'image/png';
  let ext = targetFormat.toLowerCase();

  if (ext === 'jpg' || ext === 'jpeg') {
    mimeType = 'image/jpeg';
    ext = 'jpg';
  } else if (ext === 'png') {
    mimeType = 'image/png';
  } else if (ext === 'webp') {
    mimeType = 'image/webp';
  } else if (ext === 'gif') {
    mimeType = 'image/gif';
  }

  // Determine default base filename
  let baseName = 'image';
  try {
    const urlObj = new URL(srcUrl);
    const pathname = urlObj.pathname;
    const filePart = pathname.substring(pathname.lastIndexOf('/') + 1);
    if (filePart && filePart.includes('.')) {
      baseName = filePart.substring(0, filePart.lastIndexOf('.'));
    } else if (filePart) {
      baseName = filePart;
    }
  } catch (e) {}

  const filename = `${baseName}.${ext}`;
  let dataUrl = null;

  // Level 1: Try background Service Worker fetch
  try {
    const response = await fetch(srcUrl);
    const blob = await response.blob();

    if (ext === 'gif') {
      if (blob.type === 'image/gif' || blob.type === 'image/x-gif' || srcUrl.toLowerCase().includes('.gif')) {
        // Source is already GIF: keep 100% original GIF data and animation
        dataUrl = await blobToDataUrl(blob);
      } else {
        // Convert non-GIF image to GIF MIME
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const convertedBlob = await canvas.convertToBlob({ type: 'image/png' });
        const gifBlob = new Blob([await convertedBlob.arrayBuffer()], { type: 'image/gif' });
        dataUrl = await blobToDataUrl(gifBlob);
      }
    } else if (ext === 'pdf') {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      dataUrl = await imageToPdfDataUrl(jpegBlob);
    } else {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const convertedBlob = await canvas.convertToBlob({ type: mimeType, quality: 0.95 });
      dataUrl = await blobToDataUrl(convertedBlob);
    }
  } catch (err) {
    console.warn('Background fetch failed, trying tab-side conversion:', err);
    // Level 2: Try executing conversion inside active tab context
    try {
      dataUrl = await convertImageInTab(srcUrl, mimeType);
      if (ext === 'pdf' && dataUrl) {
        const res = await fetch(dataUrl);
        const b = await res.blob();
        dataUrl = await imageToPdfDataUrl(b);
      }
    } catch (tabErr) {
      console.warn('Tab conversion also failed:', tabErr);
    }
  }

  // Level 3: Download converted dataUrl, or fallback to original srcUrl if conversion failed
  if (dataUrl) {
    downloadSingleResource(dataUrl, filename, { saveAs: true });
  } else {
    downloadSingleResource(srcUrl, filename, { saveAs: true });
  }
}

// ── Context Menu Spec Provider ──
function getSaveAsContextMenuSpecs(data) {
  const saveAsMaster = data.saveAsFileTypeEnabled !== false;
  const saveJpg = saveAsMaster && (data.saveAsFileType_jpg !== false);
  const savePng = saveAsMaster && (data.saveAsFileType_png !== false);
  const saveWebp = saveAsMaster && (data.saveAsFileType_webp !== false);
  const saveGif = saveAsMaster && (data.saveAsFileType_gif !== false);
  const savePdf = saveAsMaster && (data.saveAsFileType_pdf !== false);

  const items = [];
  if (savePng) {
    items.push({
      id: 'save_as_png',
      parentId: 'max_tools_parent',
      title: '🖼️ Save Image as PNG',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (saveJpg) {
    items.push({
      id: 'save_as_jpg',
      parentId: 'max_tools_parent',
      title: '🖼️ Save Image as JPG',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (saveWebp) {
    items.push({
      id: 'save_as_webp',
      parentId: 'max_tools_parent',
      title: '🖼️ Save Image as WebP',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (saveGif) {
    items.push({
      id: 'save_as_gif',
      parentId: 'max_tools_parent',
      title: '🖼️ Save Image as GIF',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (savePdf) {
    items.push({
      id: 'save_as_pdf',
      parentId: 'max_tools_parent',
      title: '📄 Save Image as PDF',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  return items;
}

// ── Context Menu Action Handler ──
function handleSaveAsContextMenuClick(info, tab) {
  if (['save_as_jpg', 'save_as_png', 'save_as_webp', 'save_as_gif', 'save_as_pdf'].includes(info.menuItemId)) {
    if (typeof routeContextMenuToContentScript === 'function') {
      routeContextMenuToContentScript(info, tab);
    }
    return true;
  }
  return false;
}

// Helper: remove Vietnamese tones for filename creation
function sanitizeFilenameForBg(name) {
  if (!name) return 'screenshot';
  let str = name.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
                .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
                .replace(/ì|í|ị|ỉ|ĩ/g, "i")
                .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
                .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
                .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
                .replace(/đ/g, "d");
  str = str.replace(/[\\/:*?"<>|]/g, '_').replace(/[^a-zA-Z0-9\s._-]/g, '');
  return str.trim().replace(/\s+/g, ' ').replace(/_+/g, '_') || 'screenshot';
}

function getFormattedTimestampForBg() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const secondsFromMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return `${yy}${mm}${dd}-${secondsFromMidnight}`;
}



// ── Direct Context Action Fallback ──
function executeFallbackAction(menuItemId, srcUrl) {
  if (!srcUrl) return;
  switch (menuItemId) {
    case 'yandex_search_image':
      if (typeof performYandexImageSearch === 'function') {
        performYandexImageSearch(srcUrl);
      } else if (typeof searchImageOnYandex === 'function') {
        searchImageOnYandex(srcUrl);
      }
      break;

    case 'tineye_search_image':
      if (typeof performTinEyeImageSearch === 'function') {
        performTinEyeImageSearch(srcUrl);
      } else if (typeof searchImageOnTinEye === 'function') {
        searchImageOnTinEye(srcUrl);
      }
      break;

    case 'save_as_jpg':
      convertAndSaveImage(srcUrl, 'jpg');
      break;
    case 'save_as_png':
      convertAndSaveImage(srcUrl, 'png');
      break;
    case 'save_as_webp':
      convertAndSaveImage(srcUrl, 'webp');
      break;
    case 'save_as_gif':
      convertAndSaveImage(srcUrl, 'gif');
      break;
    case 'save_as_pdf':
      convertAndSaveImage(srcUrl, 'pdf');
      break;
  }
}

// Export for background script
if (typeof self !== 'undefined') {
  self.executeFallbackAction = executeFallbackAction;
}

// ── Direct Tab Recording Injection ──
function startTabDirectRecording(streamId) {
  if (window.__maxMediaRecorder && window.__maxMediaRecorder.state !== 'inactive') {
    return;
  }

  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  }).then((stream) => {
    window.__maxRecordingStream = stream;
    window.__maxRecordedChunks = [];
    window.__maxRecordingSeconds = 0;
    window.__maxIsRecordingPaused = false;

    let mimeType = 'video/webm;codecs=vp9';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    window.__maxMediaRecorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        window.__maxRecordedChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      setTimeout(() => {
        finishDirectTabRecording();
      }, 150);
    };

    if (stream.getVideoTracks().length > 0) {
      stream.getVideoTracks()[0].onended = () => {
        if (window.__maxMediaRecorder && window.__maxMediaRecorder.state !== 'inactive') {
          window.__maxMediaRecorder.stop();
        }
      };
    }

    recorder.start(1000);

    // Inject Control Bar DOM
    injectRecordBarOverlay();

    // Start timer interval
    if (window.__maxRecordingTimer) clearInterval(window.__maxRecordingTimer);
    window.__maxRecordingTimer = setInterval(() => {
      if (!window.__maxIsRecordingPaused) {
        window.__maxRecordingSeconds++;
      }
      const min = String(Math.floor(window.__maxRecordingSeconds / 60)).padStart(2, '0');
      const sec = String(window.__maxRecordingSeconds % 60).padStart(2, '0');
      const timerEl = document.getElementById('max-record-timer');
      if (timerEl) timerEl.textContent = `${min}:${sec}`;
    }, 1000);

  }).catch(err => {
    console.error('Failed to get media stream in tab:', err);
  });

  function finishDirectTabRecording() {
    if (window.__maxRecordingTimer) {
      clearInterval(window.__maxRecordingTimer);
      window.__maxRecordingTimer = null;
    }

    // Safely stop stream tracks AFTER onstop flushes to eliminate green tail glitch
    if (window.__maxRecordingStream) {
      window.__maxRecordingStream.getTracks().forEach(t => t.stop());
      window.__maxRecordingStream = null;
    }

    if (!window.__maxRecordedChunks || window.__maxRecordedChunks.length === 0) {
      removeOverlay();
      return;
    }

    const blob = new Blob(window.__maxRecordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);
    const pageTitle = (document.title || 'screen-recording').replace(/[\\/:*?"<>|]/g, '_');
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const secStr = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const filename = `${pageTitle} - ${yy}${mm}${dd}-${secStr}.webm`;

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(videoUrl), 3000);

    removeOverlay();
  }

  function removeOverlay() {
    const container = document.getElementById('max-record-bar-container');
    if (container) container.remove();
    const style = document.getElementById('max-record-bar-style');
    if (style) style.remove();
  }

  function injectRecordBarOverlay() {
    if (document.getElementById('max-record-bar-container')) return;

    const style = document.createElement('style');
    style.id = 'max-record-bar-style';
    style.textContent = `
      #max-record-bar-container {
        position: fixed !important;
        bottom: 28px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        pointer-events: auto !important;
        transition: opacity 0.25s ease, transform 0.25s ease !important;
      }
      #max-record-bar-container.is-minimized .max-record-bar {
        opacity: 0.15 !important;
        transform: scale(0.8) translateY(10px) !important;
      }
      #max-record-bar-container.is-minimized:hover .max-record-bar {
        opacity: 1 !important;
        transform: scale(1) translateY(0) !important;
      }
      .max-record-bar {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 8px 16px !important;
        background: rgba(15, 23, 42, 0.92) !important;
        border: 1px solid rgba(6, 182, 212, 0.45) !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 25px rgba(6, 182, 212, 0.35) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border-radius: 40px !important;
        color: #f8fafc !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
      }
      .max-record-drag-handle {
        cursor: grab !important;
        padding: 4px 6px !important;
        color: #64748b !important;
        display: flex !important;
        align-items: center !important;
        font-size: 14px !important;
      }
      .max-record-status {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(239, 68, 68, 0.15) !important;
        border: 1px solid rgba(239, 68, 68, 0.3) !important;
        padding: 4px 12px !important;
        border-radius: 20px !important;
        color: #fca5a5 !important;
      }
      .max-record-dot {
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        background-color: var(--c-red, #ef4444) !important;
        animation: maxRecordDotPulse 1.2s infinite ease-in-out !important;
      }
      @keyframes maxRecordDotPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.35; transform: scale(0.7); }
      }
      .max-record-timer {
        font-variant-numeric: tabular-nums !important;
        font-weight: 700 !important;
        color: #ffffff !important;
      }
      .max-record-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        padding: 5px 12px !important;
        border-radius: 20px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border: none !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        color: #ffffff !important;
      }
      .max-record-btn-hide {
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        padding: 5px 8px !important;
      }
      .max-record-btn-hide:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }
      .max-record-btn-pause {
        background: rgba(255, 255, 255, 0.12) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .max-record-btn-pause:hover {
        background: rgba(255, 255, 255, 0.22) !important;
      }
      .max-record-btn-stop {
        background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%) !important;
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4) !important;
      }
      .max-record-btn-stop:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 16px rgba(6, 182, 212, 0.6) !important;
      }
      .max-record-btn-cancel {
        background: rgba(239, 68, 68, 0.2) !important;
        border: 1px solid rgba(239, 68, 68, 0.4) !important;
        color: #fca5a5 !important;
        padding: 5px 8px !important;
      }
      .max-record-btn-cancel:hover {
        background: rgba(239, 68, 68, 0.85) !important;
        color: #ffffff !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    const container = document.createElement('div');
    container.id = 'max-record-bar-container';
    container.innerHTML = `
      <div class="max-record-bar">
        <div class="max-record-drag-handle" title="Drag to move">⋮⋮</div>
        <div class="max-record-status">
          <span class="max-record-dot"></span>
          <span id="max-record-timer" class="max-record-timer">00:00</span>
        </div>
        <button id="max-record-pause-btn" class="max-record-btn max-record-btn-pause" title="Pause / Resume">
          <span id="max-record-pause-icon">⏸</span> <span id="max-record-pause-text">Pause</span>
        </button>
        <button id="max-record-stop-btn" class="max-record-btn max-record-btn-stop" title="Stop & Save Video">
          <span>⏹</span> <span>Stop & Save</span>
        </button>
        <button id="max-record-hide-btn" class="max-record-btn max-record-btn-hide" title="Minimize Bar (Fade Bar)">
          👁️
        </button>
        <button id="max-record-cancel-btn" class="max-record-btn max-record-btn-cancel" title="Cancel">
          <span>✕</span>
        </button>
      </div>
    `;

    (document.body || document.documentElement).appendChild(container);

    const hideBtn = document.getElementById('max-record-hide-btn');
    if (hideBtn) {
      hideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('is-minimized');
      });
    }

    const pauseBtn = document.getElementById('max-record-pause-btn');
    const stopBtn = document.getElementById('max-record-stop-btn');
    const cancelBtn = document.getElementById('max-record-cancel-btn');

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (!window.__maxMediaRecorder) return;
        const pauseIcon = document.getElementById('max-record-pause-icon');
        const pauseText = document.getElementById('max-record-pause-text');

        if (window.__maxMediaRecorder.state === 'recording') {
          window.__maxMediaRecorder.pause();
          window.__maxIsRecordingPaused = true;
          if (pauseIcon) pauseIcon.textContent = '▶';
          if (pauseText) pauseText.textContent = 'Resume';
        } else if (window.__maxMediaRecorder.state === 'paused') {
          window.__maxMediaRecorder.resume();
          window.__maxIsRecordingPaused = false;
          if (pauseIcon) pauseIcon.textContent = '⏸';
          if (pauseText) pauseText.textContent = 'Pause';
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (window.__maxMediaRecorder && window.__maxMediaRecorder.state !== 'inactive') {
          window.__maxMediaRecorder.stop();
        }
        if (window.__maxRecordingStream) {
          window.__maxRecordingStream.getTracks().forEach(t => t.stop());
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (window.__maxMediaRecorder) {
          window.__maxMediaRecorder.onstop = null;
          if (window.__maxMediaRecorder.state !== 'inactive') {
            window.__maxMediaRecorder.stop();
          }
        }
        if (window.__maxRecordingStream) {
          window.__maxRecordingStream.getTracks().forEach(t => t.stop());
        }
        removeOverlay();
      });
    }

    const handle = container.querySelector('.max-record-drag-handle');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    if (handle) {
      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = container.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        container.style.transform = 'none';
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.bottom = 'auto';

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          container.style.left = `${ev.clientX - offsetX}px`;
          container.style.top = `${ev.clientY - offsetY}px`;
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
  }
}

// Export for background script & window
if (typeof self !== 'undefined') {
  self.getSaveAsContextMenuSpecs = getSaveAsContextMenuSpecs;
  self.handleSaveAsContextMenuClick = handleSaveAsContextMenuClick;
  self.convertAndSaveImage = convertAndSaveImage;
}
if (typeof window !== 'undefined') {
  window.getSaveAsContextMenuSpecs = getSaveAsContextMenuSpecs;
  window.handleSaveAsContextMenuClick = handleSaveAsContextMenuClick;
  window.convertAndSaveImage = convertAndSaveImage;
}
