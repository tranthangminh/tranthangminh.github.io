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
      window.showToast('History cleared!');
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
    countBadge.textContent = `${history.length} ${history.length === 1 ? 'item' : 'items'}`;
  }

  if (!historyList) return;

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty-state">
        <p>No colors picked yet. Click "Pick Color" to start.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history.map(hex => {
    const textColor = window.getContrastColor(hex);
    return `
      <div class="color-card" data-hex="${hex}">
        <div class="color-swatch-square" style="background-color: ${hex};" title="Click to copy HEX">
          <button class="delete-color-btn" title="Delete color">✕</button>
          <span class="color-hex" style="color: ${textColor};" title="Click to copy HEX">${hex.toUpperCase()}</span>
        </div>
        <div class="color-info">
          <div class="copy-buttons-grid">
            <button class="badge copy-badge" data-format="hex" title="Copy HEX">HEX</button>
            <button class="badge copy-badge" data-format="hsl" title="Copy HSL">HSL</button>
            <button class="badge copy-badge" data-format="rgb" title="Copy RGB">RGB</button>
            <button class="badge copy-badge" data-format="cmyk" title="Copy CMYK">CMYK</button>
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
    window.showToast('EyeDropper is not supported in this browser.');
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
              window.showToast(`Picked & Copied: ${hex.toUpperCase()}`);
              if (window.showDonateNudge) window.showDonateNudge();
            })
            .catch((err) => {
              console.error('Clipboard copy failed:', err);
              window.showToast(`Picked color: ${hex.toUpperCase()}`);
              if (window.showDonateNudge) window.showDonateNudge();
            });
        });
      });
    })
    .catch((err) => {
      console.log('EyeDropper cancelled or failed:', err);
    });
}

// Delete a single color from history
function deleteColor(hexToDelete) {
  chrome.storage.local.get({ colorHistory: [] }, (data) => {
    const history = data.colorHistory.filter(hex => hex !== hexToDelete);
    chrome.storage.local.set({ colorHistory: history }, () => {
      renderHistory(history);
      window.showToast('Color removed');
    });
  });
}

// Copy to Clipboard Helper
function copyToClipboard(text, element) {
  navigator.clipboard.writeText(text).then(() => {
    window.showToast(`Copied: ${text}`);
    
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
