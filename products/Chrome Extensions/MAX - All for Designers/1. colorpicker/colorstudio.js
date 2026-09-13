/**
 * colorstudio.js — Photoshop-style Photoshop 2D/1D Color Picker Studio
 * Real-time Bidirectional Live Sync (HEX, RGB, HSL, CMYK, 2D Spectrum & Hue Slider)
 */

let isStudioInitialized = false;

function setupLazyColorStudio() {
  const studioBtn = document.getElementById('color-studio-btn');
  if (studioBtn) {
    studioBtn.addEventListener('click', () => {
      if (!isStudioInitialized) {
        isStudioInitialized = true;
        initColorStudioModule(true);
      }
    });
  }
}

if (document.readyState !== 'loading') {
  setupLazyColorStudio();
} else {
  document.addEventListener('DOMContentLoaded', setupLazyColorStudio);
}

function initColorStudioModule(autoOpen = false) {
  const studioBtn = document.getElementById('color-studio-btn');
  const panel = document.getElementById('color-studio-panel');
  const overlay = document.getElementById('color-studio-overlay');
  const closeBtn = document.getElementById('color-studio-close-btn');

  if (!panel || !overlay) return;

  // Working State
  let initialHex = '#20B14C';
  let currentHsv = { h: 138, s: 82, v: 69 }; // Hue [0..360], Sat [0..100], Val [0..100]

  // Elements
  const spectrumWrapper = document.getElementById('studio-spectrum-wrapper');
  const spectrumBg = document.getElementById('studio-spectrum-bg');
  const pickerHandle = document.getElementById('studio-picker-handle');

  const hueWrapper = document.getElementById('studio-hue-wrapper');
  const hueHandle = document.getElementById('studio-hue-handle');

  const compareNew = document.getElementById('studio-compare-new');
  const compareCurrent = document.getElementById('studio-compare-current');

  const addBtn = document.getElementById('studio-add-btn');

  // Input elements
  const inputHex = document.getElementById('studio-hex-input');
  
  const inputR = document.getElementById('studio-r-input');
  const inputG = document.getElementById('studio-g-input');
  const inputB = document.getElementById('studio-b-input');

  const inputH = document.getElementById('studio-h-input');
  const inputS = document.getElementById('studio-s-input');
  const inputL = document.getElementById('studio-l-input');

  const inputC = document.getElementById('studio-c-input');
  const inputM = document.getElementById('studio-m-input');
  const inputY = document.getElementById('studio-y-input');
  const inputK = document.getElementById('studio-k-input');

  // Open Panel
  function openStudio() {
    // Determine starting color from last picked color or default #20B14C
    chrome.storage.local.get({ colorHistory: [] }, (data) => {
      if (data.colorHistory && data.colorHistory.length > 0) {
        initialHex = data.colorHistory[0].toUpperCase();
      } else {
        initialHex = '#20B14C';
      }

      const rgb = window.hexToRgbObj(initialHex) || { r: 32, g: 177, b: 76 };
      currentHsv = window.rgbToHsvObj(rgb.r, rgb.g, rgb.b);

      compareCurrent.style.backgroundColor = initialHex;
      compareCurrent.style.color = window.getContrastTextColor(initialHex);

      panel.classList.remove('hidden');
      overlay.classList.remove('hidden');
      updateAllUI('init');

      // [M11 Fix] Attach drag listeners only while panel is open
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    });
  }

  // Close Panel
  function closeStudio() {
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
    // [M11 Fix] Remove drag listeners when panel is closed
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  }

  if (studioBtn) studioBtn.addEventListener('click', openStudio);
  if (closeBtn) closeBtn.addEventListener('click', closeStudio);
  if (overlay) overlay.addEventListener('click', closeStudio);

  if (autoOpen) {
    openStudio();
  }

  // Click on "current" half resets color back to initial
  if (compareCurrent) {
    compareCurrent.addEventListener('click', () => {
      const rgb = window.hexToRgbObj(initialHex) || { r: 32, g: 177, b: 76 };
      currentHsv = window.rgbToHsvObj(rgb.r, rgb.g, rgb.b);
      updateAllUI('reset');
    });
  }

  // Add Color Button
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const rgb = window.hsvToRgbObj(currentHsv.h, currentHsv.s, currentHsv.v);
      const hex = window.rgbToHexStr(rgb.r, rgb.g, rgb.b);

      chrome.storage.local.get({ colorHistory: [] }, (data) => {
        let history = data.colorHistory || [];
        history = history.filter(c => c.toLowerCase() !== hex.toLowerCase());
        history.unshift(hex);
        history = history.slice(0, 30);

        chrome.storage.local.set({ colorHistory: history }, () => {
          if (typeof renderHistory === 'function') {
            renderHistory(history);
          }
          if (window.showToast) {
            window.showToast(`+ Added ${hex} to Color History!`);
          }
          if (window.showDonateNudge) {
            window.showDonateNudge();
          }
        });
      });
    });
  }

  // ── Bidirectional Live Sync Engine ──
  function updateAllUI(source) {
    // 1. Ensure HSV range bounds
    currentHsv.h = Math.max(0, Math.min(360, currentHsv.h));
    currentHsv.s = Math.max(0, Math.min(100, currentHsv.s));
    currentHsv.v = Math.max(0, Math.min(100, currentHsv.v));

    // Calculate RGB, HEX, HSL, CMYK
    const rgb = window.hsvToRgbObj(currentHsv.h, currentHsv.s, currentHsv.v);
    const hex = window.rgbToHexStr(rgb.r, rgb.g, rgb.b);
    const hsl = window.rgbToHslObj(rgb.r, rgb.g, rgb.b);
    const cmyk = window.rgbToCmykObj(rgb.r, rgb.g, rgb.b);

    // 2. Update 2D Spectrum Box
    if (spectrumBg) {
      spectrumBg.style.backgroundColor = `hsl(${currentHsv.h}, 100%, 50%)`;
    }
    if (pickerHandle) {
      pickerHandle.style.left = `${currentHsv.s}%`;
      pickerHandle.style.top = `${100 - currentHsv.v}%`;
    }

    // 3. Update 1D Hue Slider
    if (hueHandle) {
      hueHandle.style.top = `${(currentHsv.h / 360) * 100}%`;
    }

    // 4. Update New Color Preview
    if (compareNew) {
      compareNew.style.backgroundColor = hex;
      compareNew.style.color = window.getContrastTextColor(hex);
    }

    // 5. Update Inputs (skip source if user is typing into that specific input)
    if (source !== 'hex' && inputHex) {
      inputHex.value = hex;
    }

    if (source !== 'rgb') {
      if (inputR) inputR.value = rgb.r;
      if (inputG) inputG.value = rgb.g;
      if (inputB) inputB.value = rgb.b;
    }

    if (source !== 'hsl') {
      if (inputH) inputH.value = hsl.h;
      if (inputS) inputS.value = hsl.s;
      if (inputL) inputL.value = hsl.l;
    }

    if (source !== 'cmyk') {
      if (inputC) inputC.value = cmyk.c;
      if (inputM) inputM.value = cmyk.m;
      if (inputY) inputY.value = cmyk.y;
      if (inputK) inputK.value = cmyk.k;
    }
  }

  // ── Drag Handlers for 2D Spectrum Box ──
  let isDraggingSpectrum = false;
  let spectrumRect = null; // [M12 Fix] Cached on mousedown, not re-queried every mousemove

  function handleSpectrumMove(e) {
    if (!spectrumWrapper || !spectrumRect) return;
    const x = Math.max(0, Math.min(spectrumRect.width, e.clientX - spectrumRect.left));
    const y = Math.max(0, Math.min(spectrumRect.height, e.clientY - spectrumRect.top));

    currentHsv.s = Math.round((x / spectrumRect.width) * 100);
    currentHsv.v = Math.round((1 - (y / spectrumRect.height)) * 100);

    updateAllUI('spectrum');
  }

  if (spectrumWrapper) {
    spectrumWrapper.addEventListener('mousedown', (e) => {
      isDraggingSpectrum = true;
      spectrumRect = spectrumWrapper.getBoundingClientRect(); // [M12 Fix] Cache rect once
      handleSpectrumMove(e);
    });
  }

  // ── Drag Handlers for 1D Hue Slider ──
  let isDraggingHue = false;
  let hueRect = null; // [M12 Fix] Cached on mousedown

  function handleHueMove(e) {
    if (!hueWrapper || !hueRect) return;
    const y = Math.max(0, Math.min(hueRect.height, e.clientY - hueRect.top));

    currentHsv.h = Math.round((y / hueRect.height) * 360);
    updateAllUI('hue');
  }

  if (hueWrapper) {
    hueWrapper.addEventListener('mousedown', (e) => {
      isDraggingHue = true;
      hueRect = hueWrapper.getBoundingClientRect(); // [M12 Fix] Cache rect once
      handleHueMove(e);
    });
  }

  // [M11 Fix] Named handlers so they can be added/removed with openStudio/closeStudio
  function onWindowMouseMove(e) {
    if (isDraggingSpectrum) handleSpectrumMove(e);
    if (isDraggingHue) handleHueMove(e);
  }

  function onWindowMouseUp() {
    isDraggingSpectrum = false;
    isDraggingHue = false;
    spectrumRect = null;
    hueRect = null;
  }

  // ── Input Live Listeners ──

  // HEX Input
  if (inputHex) {
    inputHex.addEventListener('input', () => {
      let val = inputHex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      const rgb = window.hexToRgbObj(val);
      if (rgb) {
        currentHsv = window.rgbToHsvObj(rgb.r, rgb.g, rgb.b);
        updateAllUI('hex');
      }
    });
  }

  // Helper: Attach mouse wheel scroll handler to number inputs
  function setupWheelScroll(inputElement, minVal, maxVal, onChangeCallback) {
    if (!inputElement) return;
    inputElement.addEventListener('wheel', (e) => {
      e.preventDefault(); // Prevent page scrolling
      const step = e.shiftKey ? 10 : 1;
      let curr = parseInt(inputElement.value) || 0;

      if (e.deltaY < 0) {
        curr = Math.min(maxVal, curr + step); // Scroll UP -> Increase
      } else if (e.deltaY > 0) {
        curr = Math.max(minVal, curr - step); // Scroll DOWN -> Decrease
      }

      inputElement.value = curr;
      onChangeCallback();
    }, { passive: false });
  }

  // RGB Inputs
  function onRgbInputChange() {
    const r = Math.max(0, Math.min(255, parseInt(inputR.value) || 0));
    const g = Math.max(0, Math.min(255, parseInt(inputG.value) || 0));
    const b = Math.max(0, Math.min(255, parseInt(inputB.value) || 0));

    currentHsv = window.rgbToHsvObj(r, g, b);
    updateAllUI('rgb');
  }

  if (inputR) {
    inputR.addEventListener('input', onRgbInputChange);
    setupWheelScroll(inputR, 0, 255, onRgbInputChange);
  }
  if (inputG) {
    inputG.addEventListener('input', onRgbInputChange);
    setupWheelScroll(inputG, 0, 255, onRgbInputChange);
  }
  if (inputB) {
    inputB.addEventListener('input', onRgbInputChange);
    setupWheelScroll(inputB, 0, 255, onRgbInputChange);
  }

  // HSL Inputs
  function onHslInputChange() {
    const h = Math.max(0, Math.min(360, parseInt(inputH.value) || 0));
    const s = Math.max(0, Math.min(100, parseInt(inputS.value) || 0));
    const l = Math.max(0, Math.min(100, parseInt(inputL.value) || 0));

    const rgb = window.hslToRgbObj(h, s, l);
    currentHsv = window.rgbToHsvObj(rgb.r, rgb.g, rgb.b);
    updateAllUI('hsl');
  }

  if (inputH) {
    inputH.addEventListener('input', onHslInputChange);
    setupWheelScroll(inputH, 0, 360, onHslInputChange);
  }
  if (inputS) {
    inputS.addEventListener('input', onHslInputChange);
    setupWheelScroll(inputS, 0, 100, onHslInputChange);
  }
  if (inputL) {
    inputL.addEventListener('input', onHslInputChange);
    setupWheelScroll(inputL, 0, 100, onHslInputChange);
  }

  // CMYK Inputs
  function onCmykInputChange() {
    const c = Math.max(0, Math.min(100, parseInt(inputC.value) || 0));
    const m = Math.max(0, Math.min(100, parseInt(inputM.value) || 0));
    const y = Math.max(0, Math.min(100, parseInt(inputY.value) || 0));
    const k = Math.max(0, Math.min(100, parseInt(inputK.value) || 0));

    const rgb = window.cmykToRgbObj(c, m, y, k);
    currentHsv = window.rgbToHsvObj(rgb.r, rgb.g, rgb.b);
    updateAllUI('cmyk');
  }

  if (inputC) {
    inputC.addEventListener('input', onCmykInputChange);
    setupWheelScroll(inputC, 0, 100, onCmykInputChange);
  }
  if (inputM) {
    inputM.addEventListener('input', onCmykInputChange);
    setupWheelScroll(inputM, 0, 100, onCmykInputChange);
  }
  if (inputY) {
    inputY.addEventListener('input', onCmykInputChange);
    setupWheelScroll(inputY, 0, 100, onCmykInputChange);
  }
  if (inputK) {
    inputK.addEventListener('input', onCmykInputChange);
    setupWheelScroll(inputK, 0, 100, onCmykInputChange);
  }
}

// [D7, D8] All color math functions are now in color-utils.js (window.*)
// colorstudio.js references them via window.hexToRgbObj, window.hsvToRgbObj, etc.
