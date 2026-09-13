// Screen Capture Tab Main UI & Controller

let currentCaptureUrl = null;
let currentCaptureFilename = 'screenshot.png';

if (document.readyState !== 'loading') {
  initScreenCapture();
} else {
  document.addEventListener('DOMContentLoaded', initScreenCapture);
}

function initScreenCapture() {
  const modeCards = document.querySelectorAll('.capture-mode-card');
  const startBtn = document.getElementById('start-capture-btn');

  // Restore saved capture mode or default to 'visible'
  chrome.storage.local.get({ lastCaptureMode: 'visible' }, (data) => {
    const savedMode = data.lastCaptureMode;
    modeCards.forEach(card => {
      if (card.getAttribute('data-mode') === savedMode) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
    updateFormatUIForMode(savedMode);
  });

  // Handle Mode Card Clicks
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      const mode = card.getAttribute('data-mode');
      chrome.storage.local.set({ lastCaptureMode: mode });
      updateFormatUIForMode(mode);
    });
  });

  // Handle Image Format radio changes
  const formatRadios = document.querySelectorAll('input[name="capture-format"]');
  chrome.storage.local.get(['maxSettings', 'captureFormat'], (data) => {
    const saved = data.maxSettings || {};
    const savedFmt = data.captureFormat || saved.captureFormat || 'jpg';
    formatRadios.forEach(radio => {
      if (radio.value === savedFmt) {
        radio.checked = true;
      }
    });
  });

  formatRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value || 'jpg';
      chrome.storage.local.set({ captureFormat: val });
      chrome.storage.local.get('maxSettings', (res) => {
        const settings = res.maxSettings || {};
        settings.captureFormat = val;
        chrome.storage.local.set({ maxSettings: settings });
      });
    });
  });

  // Handle Resolution Scale radio changes
  const scaleRadios = document.querySelectorAll('input[name="capture-scale"]');
  chrome.storage.local.get({ captureResolutionScale: 1 }, (data) => {
    const savedScale = data.captureResolutionScale || 1;
    scaleRadios.forEach(radio => {
      if (parseInt(radio.value, 10) === savedScale) {
        radio.checked = true;
      }
    });
  });

  scaleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const val = parseInt(radio.value, 10) || 1;
      chrome.storage.local.set({ captureResolutionScale: val });
    });
  });

  // Handle Max Capture Width & Height input changes
  const maxWidthInput = document.getElementById('max-capture-width-input');
  const maxHeightInput = document.getElementById('max-capture-height-input');

  if (maxWidthInput && maxHeightInput) {
    chrome.storage.local.get(['maxSettings', 'maxCaptureWidth', 'maxCaptureHeight'], (data) => {
      const savedSettings = data.maxSettings || {};
      const savedW = data.maxCaptureWidth !== undefined ? data.maxCaptureWidth : (savedSettings.maxCaptureWidth || 0);
      const savedH = data.maxCaptureHeight !== undefined ? data.maxCaptureHeight : (savedSettings.maxCaptureHeight !== undefined ? savedSettings.maxCaptureHeight : 16000);

      maxWidthInput.value = savedW > 0 ? savedW : '';
      maxHeightInput.value = savedH !== undefined && savedH !== null && savedH !== '' ? savedH : 16000;
    });

    const saveLimits = () => {
      const wVal = Math.max(0, parseInt(maxWidthInput.value, 10) || 0);
      const hVal = Math.max(0, parseInt(maxHeightInput.value, 10) || 0);

      chrome.storage.local.set({
        maxCaptureWidth: wVal,
        maxCaptureHeight: hVal
      });

      chrome.storage.local.get('maxSettings', (res) => {
        const settings = res.maxSettings || {};
        settings.maxCaptureWidth = wVal;
        settings.maxCaptureHeight = hVal;
        chrome.storage.local.set({ maxSettings: settings });
      });
    };

    maxWidthInput.addEventListener('input', saveLimits);
    maxHeightInput.addEventListener('input', saveLimits);
  }

  // Handle Start Capture Click
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const selectedCard = document.querySelector('.capture-mode-card.selected');
      const mode = selectedCard ? selectedCard.getAttribute('data-mode') : 'visible';

      if (mode === 'visible') {
        captureVisibleArea();
      } else if (mode === 'full') {
        captureFullPage();
      } else if (mode === 'area') {
        startCustomAreaCapture();
      } else if (mode === 'record') {
        chrome.runtime.sendMessage({ action: 'trigger_screen_recorder' });
      }
    });
  }
}

// Global helper to get current resolution scale
window.getCaptureResolutionScale = async function() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ captureResolutionScale: 1 }, (data) => {
      resolve(parseInt(data.captureResolutionScale, 10) || 1);
    });
  });
};

// Get active tab of the current browser window
async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        resolve(tabs[0]);
      } else {
        resolve(null);
      }
    });
  });
}

// Check if URL is protected by Chrome security policy
function isProtectedUrl(url) {
  if (!url) return false;
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('about:') || 
         url.includes('chrome.google.com/webstore') || 
         url.includes('chromewebstore.google.com');
}

// Remove Vietnamese tones for portable filenames
function removeVietnameseTones(str) {
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

// Sanitize filename by removing invalid characters
function sanitizeFilename(name) {
  if (!name) return 'screenshot';
  let cleanName = removeVietnameseTones(name);
  cleanName = cleanName.replace(/[\\/:*?"<>|]/g, '_');
  cleanName = cleanName.replace(/[^a-zA-Z0-9\s._-]/g, '');
  return cleanName.trim().replace(/\s+/g, ' ').replace(/_+/g, '_') || 'screenshot';
}

// Get formatted current timestamp suffix (- yymmdd-secondsFromMidnight)
function getFormattedTimestamp() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const secondsFromMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return `${yy}${mm}${dd}-${secondsFromMidnight}`;
}

// Show Preview card
function showPreview(dataUrl) {
  const previewContainer = document.getElementById('capture-preview-container');
  const previewImg = document.getElementById('capture-preview-img');
  
  currentCaptureUrl = dataUrl;

  if (previewContainer && previewImg) {
    previewImg.src = dataUrl;
    previewContainer.classList.remove('hidden');
    previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Helper: re-encode a PNG dataUrl to a different MIME type via canvas
// [M10 Fix] Wrapped in img.onload Promise — drawImage was being called before decode finished,
// producing a blank canvas on some devices/browsers.
function convertCanvasFormat(dataUrl, mime) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
      resolve(canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.92 : undefined));
    };
    img.onerror = () => reject(new Error('convertCanvasFormat: failed to load image'));
    img.src = dataUrl;
  });
}

// Helper to convert Data URL to Blob URL for large downloads
function dataURLtoBlobUrl(dataUrl) {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to convert data URL to blob URL:', e);
    return dataUrl;
  }
}

// Download Screenshot Image
function downloadImage(dataUrl, filename, callback) {
  if (typeof window.downloadSingleResource === 'function') {
    window.downloadSingleResource(dataUrl, filename, { callback });
  } else if (typeof chrome !== 'undefined' && chrome.downloads) {
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        if (callback) callback(null);
      } else {
        if (window.showToast) window.showToast('Screenshot downloaded successfully!');
        if (window.showDonateNudge) window.showDonateNudge();
        if (callback) callback(downloadId);
      }
    });
  }
}

// Helper for direct anchor download fallback
function fallbackDownloadDirect(downloadUrl, filename) {
  try {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (downloadUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
    }
  } catch (error) {
    console.error('Direct download failed:', error);
    window.showToast('Download failed. Please try again!');
  }
}

// Update format section & scale section according to current capture mode
function updateFormatUIForMode(mode) {
  const formatSection = document.querySelector('.capture-format-section');
  const scaleSection = document.getElementById('capture-scale-section');
  const scale3Wrapper = document.getElementById('scale-3-wrapper');
  const scale3Input = document.getElementById('scale-3');

  if (mode === 'record') {
    if (formatSection) formatSection.classList.add('hidden');
    if (scaleSection) scaleSection.classList.add('hidden');
  } else {
    if (formatSection) formatSection.classList.remove('hidden');
    if (scaleSection) scaleSection.classList.remove('hidden');

    if (mode === 'full') {
      if (scale3Wrapper) scale3Wrapper.classList.add('disabled');
      if (scale3Input) scale3Input.disabled = true;
      if (scale3Input && scale3Input.checked) {
        const scale2Input = document.getElementById('scale-2');
        if (scale2Input) {
          scale2Input.checked = true;
          chrome.storage.local.set({ captureResolutionScale: 2 });
        }
      }
    } else {
      if (scale3Wrapper) scale3Wrapper.classList.remove('disabled');
      if (scale3Input) scale3Input.disabled = false;
    }
  }
}
