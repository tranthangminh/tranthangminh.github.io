// Color Picker Feature Logic

if (document.readyState !== 'loading') {
  initColorPicker();
} else {
  document.addEventListener('DOMContentLoaded', initColorPicker);
}

function initColorPicker() {
  const eyedropperBtn = document.getElementById('eyedropper-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const historyList = document.getElementById('color-history-list');

  // Load and render color history on startup
  loadColorHistory();

  // Listen for storage changes to update UI if color was added asynchronously
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.colorHistory) {
      renderHistory(changes.colorHistory.newValue || []);
    }
  });

  // Pick color button event - MUST call EyeDropper synchronously here
  eyedropperBtn.addEventListener('click', () => {
    triggerColorPicker();
  });

  // Clear history event
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ colorHistory: [] }, () => {
      renderHistory([]);
      const msg = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t('colorpicker.historyCleared') : 'History cleared!';
      window.showToast(msg);
    });
  });

  // Event delegation for copy and delete buttons
  historyList.addEventListener('click', (e) => {
    const card = e.target.closest('.color-card');
    if (!card) return;

    const hex = card.getAttribute('data-hex');

    // Handle delete button click
    if (e.target.closest('.delete-color-btn')) {
      e.stopPropagation();
      deleteColor(hex);
      return;
    }

    // Handle format badge click
    const badge = e.target.closest('.copy-badge');
    if (badge) {
      const format = badge.getAttribute('data-format');
      let textToCopy = hex;

      if (format === 'rgb') {
        textToCopy = window.hexToRgbStr(hex);
      } else if (format === 'hsl') {
        textToCopy = window.hexToHslStr(hex);
      } else if (format === 'cmyk') {
        textToCopy = window.hexToCmykStr(hex);
      } else {
        textToCopy = hex.toUpperCase();
      }

      copyToClipboard(textToCopy, badge);
      return;
    }

    // Default: Click anywhere on the swatch/hex copies hex
    if (e.target.closest('.color-hex') || e.target.closest('.color-swatch-square')) {
      const hexTextEl = card.querySelector('.color-hex');
      copyToClipboard(hex, hexTextEl);
    }
  });
}

// Load color history from chrome.storage.local
function loadColorHistory() {
  chrome.storage.local.get({ colorHistory: [] }, (data) => {
    renderHistory(data.colorHistory);
  });
}

// Render history UI list (3 Columns x Card Layout: Square Swatch with Hex Label inside -> [HEX][HSL]/[RGB][CMYK])
function renderHistory(history) {
  const historyList = document.getElementById('color-history-list');
  const countBadge = document.getElementById('color-history-count');

  if (countBadge) {
    const itemLabel = (window.i18n && typeof window.i18n.t === 'function')
      ? (history.length === 1 ? window.i18n.t('common.item') : window.i18n.t('common.items'))
      : (history.length === 1 ? 'item' : 'items');
    countBadge.textContent = `${history.length} ${itemLabel}`;
  }

  if (!historyList) return;

  if (history.length === 0) {
    const emptyMsg = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('colorpicker.emptyHistory')
      : 'No colors picked yet. Click "Pick Color" to start.';
    historyList.innerHTML = `
      <div class="history-empty-state">
        <p>${emptyMsg}</p>
      </div>
    `;
    return;
  }

  const t = (k, def) => ((window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(k, def) : def);

  historyList.innerHTML = history.map(hex => {
    const textColor = window.getContrastColor(hex);
    return `
      <div class="color-card" data-hex="${hex}">
        <div class="color-swatch-square" style="background-color: ${hex};" title="${t('colorpicker.clickCopyHex', 'Click to copy HEX')}">
          <button class="delete-color-btn" title="${t('colorpicker.deleteColor', 'Delete color')}">✕</button>
          <span class="color-hex" style="color: ${textColor};" title="${t('colorpicker.clickCopyHex', 'Click to copy HEX')}">${hex.toUpperCase()}</span>
        </div>
        <div class="color-info">
          <div class="copy-buttons-grid">
            <button class="badge copy-badge" data-format="hex" title="${t('colorpicker.copyHex', 'Copy HEX')}">HEX</button>
            <button class="badge copy-badge" data-format="hsl" title="${t('colorpicker.copyHsl', 'Copy HSL')}">HSL</button>
            <button class="badge copy-badge" data-format="rgb" title="${t('colorpicker.copyRgb', 'Copy RGB')}">RGB</button>
            <button class="badge copy-badge" data-format="cmyk" title="${t('colorpicker.copyCmyk', 'Copy CMYK')}">CMYK</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Trigger Color Picker directly in the extension context (Popup or Side Panel)
// This preserves the user gesture and works 100% of the time.
function triggerColorPicker() {
  if (!window.EyeDropper) {
    const notSupported = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('colorpicker.eyeDropperNotSupported')
      : 'EyeDropper is not supported in this browser.';
    window.showToast(notSupported);
    return;
  }

  const eyeDropper = new EyeDropper();
  
  // Call open synchronously in the call stack of the click event
  eyeDropper.open()
    .then((result) => {
      const hex = result.sRGBHex;
      
      // Save color to storage
      chrome.storage.local.get({ colorHistory: [] }, (data) => {
        let history = data.colorHistory;
        history = history.filter(c => c.toLowerCase() !== hex.toLowerCase());
        history.unshift(hex);
        history = history.slice(0, 30); // Keep last 30 colors
        
        chrome.storage.local.set({ colorHistory: history }, () => {
          // Copy to clipboard
          navigator.clipboard.writeText(hex)
            .then(() => {
              const msg = (window.i18n && typeof window.i18n.t === 'function')
                ? window.i18n.t('colorpicker.pickedCopied', `Picked & Copied: ${hex.toUpperCase()}`, [hex.toUpperCase()])
                : `Picked & Copied: ${hex.toUpperCase()}`;
              window.showToast(msg);
              if (window.showDonateNudge) window.showDonateNudge();
            })
            .catch((err) => {
              console.error('Clipboard copy failed:', err);
              const msg = (window.i18n && typeof window.i18n.t === 'function')
                ? window.i18n.t('colorpicker.pickedColor', `Picked color: ${hex.toUpperCase()}`, [hex.toUpperCase()])
                : `Picked color: ${hex.toUpperCase()}`;
              window.showToast(msg);
              if (window.showDonateNudge) window.showDonateNudge();
            });
        });
      });
    })
    .catch(() => {
      // User cancelled EyeDropper or window lost focus
    });
}

// Delete a single color from history
function deleteColor(hexToDelete) {
  chrome.storage.local.get({ colorHistory: [] }, (data) => {
    const history = data.colorHistory.filter(hex => hex !== hexToDelete);
    chrome.storage.local.set({ colorHistory: history }, () => {
      renderHistory(history);
      const msg = (window.i18n && typeof window.i18n.t === 'function')
        ? window.i18n.t('colorpicker.colorRemoved')
        : 'Color removed';
      window.showToast(msg);
    });
  });
}

// Copy to Clipboard Helper
function copyToClipboard(text, element) {
  navigator.clipboard.writeText(text).then(() => {
    const msg = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('colorpicker.copied', `Copied: ${text}`, [text])
      : `Copied: ${text}`;
    window.showToast(msg);
    
    if (element) {
      element.classList.add('copied');
      setTimeout(() => {
        element.classList.remove('copied');
      }, 1000);
    }
  }).catch(err => {
    console.error('Could not copy text: ', err);
  });
}

// Color conversion utilities
// [D7, D8] Color conversion helpers are in color-utils.js (window.*)
// hexToRgbStr, hexToHslStr, hexToCmykStr, getContrastColor
