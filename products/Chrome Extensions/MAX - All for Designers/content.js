/**
 * content.js — MAX Design Power-Pack
 * Injected content script for DOM Image Detection & Selection Modal
 */

(function () {
  'use strict';
  if (window.__maxContentScriptInjected) return;
  window.__maxContentScriptInjected = true;

  let lastRightClickCoords = { x: 0, y: 0 };

  // Listen for context menu right-clicks to store coordinates
  document.addEventListener('contextmenu', (e) => {
    lastRightClickCoords = { x: e.clientX, y: e.clientY };
  }, true);

  function safeSendMessage(message, callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      try {
        const res = chrome.runtime.sendMessage(message, callback);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
        return res;
      } catch (err) {
        // Extension context invalidated on reloaded extensions
      }
    }
  }

  // Listen for messages from background script
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'context_menu_action') {
        handleContextMenuAction(message.menuItemId, message.srcUrl);
        sendResponse({ received: true });
      }
    });
  }

  // Direct Page Keyboard Shortcut Listener (Dual-Pass for 100% Reliability)
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable
    )) {
      return;
    }

    if (e.altKey && e.shiftKey) {
      const key = (e.key || '').toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        safeSendMessage({ action: 'start_area_capture' });
      } else if (key === 'x') {
        e.preventDefault();
        safeSendMessage({ action: 'trigger_capture_visible' });
      } else if (key === 'c') {
        e.preventDefault();
        safeSendMessage({ action: 'trigger_capture_full' });
      } else if (key === 'v') {
        e.preventDefault();
        safeSendMessage({ action: 'trigger_screen_recorder' });
      }
    }
  }, true);

  // Main Action Handler
  async function handleContextMenuAction(menuItemId, nativeSrc) {
    const x = lastRightClickCoords.x;
    const y = lastRightClickCoords.y;

    // 1. Scan coordinates for all stacked images
    const candidateUrls = findImagesAtCoords(x, y, nativeSrc);

    if (candidateUrls.length === 0) {
      showToast('No images found under the cursor.');
      return;
    }

    // 2. Load details for each candidate image
    const candidates = [];
    const promises = candidateUrls.map(async (url) => {
      const details = await getImageDetails(url);
      if (details.loaded && details.width > 0 && details.height > 0) {
        try {
          const sizeInfo = await new Promise((resolve) => {
            safeSendMessage({ action: 'get_image_file_size', url: url }, (res) => {
              resolve(res);
            });
          });
          if (sizeInfo && sizeInfo.success && sizeInfo.size) {
            details.sizeText = formatBytes(sizeInfo.size);
          }
        } catch (e) {}
        candidates.push(details);
      }
    });

    await Promise.all(promises);

    const MIN_IMAGE_SIZE = 16;
    const validCandidates = candidates.filter(c => {
      if (!c.loaded || c.width <= 0 || c.height <= 0) return false;
      return c.width >= MIN_IMAGE_SIZE && c.height >= MIN_IMAGE_SIZE;
    });

    if (validCandidates.length === 0) {
      showToast('No valid images found under the cursor.');
      return;
    }

    if (validCandidates.length === 1) {
      executeAction(menuItemId, validCandidates[0].url);
      return;
    }

    showImageSelectionModal(validCandidates, menuItemId);
  }

  // ── DOM Scanning Algorithm ──
  function findImagesAtCoords(x, y, nativeSrc) {
    const urls = new Set();
    if (nativeSrc) {
      urls.add(nativeSrc);
    }

    const elements = getElementsUnderPoint(document, x, y);

    for (const el of elements) {
      if (el.tagName === 'IMG') {
        if (el.currentSrc) {
          urls.add(resolveUrl(el.currentSrc));
        } else if (el.src) {
          urls.add(resolveUrl(el.src));
        }
        if (el.srcset && !el.currentSrc) {
          const best = pickBestSrcset(el.srcset);
          if (best) urls.add(resolveUrl(best));
        }
      }

      if (el.tagName === 'image') {
        const href = el.getAttribute('href') || el.getAttribute('xlink:href');
        if (href) urls.add(resolveUrl(href));
      }

      try {
        const style = window.getComputedStyle(el);
        addBgImageUrl(style.backgroundImage, urls);

        const beforeStyle = window.getComputedStyle(el, '::before');
        addBgImageUrl(beforeStyle.backgroundImage, urls);

        const afterStyle = window.getComputedStyle(el, '::after');
        addBgImageUrl(afterStyle.backgroundImage, urls);
      } catch (e) {}

      if (el.tagName === 'VIDEO' && el.poster) {
        urls.add(resolveUrl(el.poster));
      }

      if (el.tagName === 'CANVAS') {
        try {
          urls.add(el.toDataURL());
        } catch (e) {}
      }
    }

    return Array.from(urls).filter(url => {
      if (!url || typeof url !== 'string') return false;

      const lowerUrl = url.toLowerCase();
      const cleanUrl = lowerUrl.split(/[?#]/)[0];
      if (cleanUrl.endsWith('.svg') || cleanUrl.endsWith('.xml')) {
        return false;
      }
      if (lowerUrl.startsWith('data:image/svg+xml') || lowerUrl.includes('xml')) {
        return false;
      }

      if (url.startsWith('data:image/gif') && url.length < 300) {
        return false;
      }
      return true;
    });
  }

  function getElementsUnderPoint(root, x, y) {
    let elements = [];
    try {
      elements = Array.from(root.elementsFromPoint(x, y)) || [];
    } catch (e) {}

    let shadowElements = [];
    for (const el of elements) {
      if (el.shadowRoot) {
        const sub = getElementsUnderPoint(el.shadowRoot, x, y);
        shadowElements = shadowElements.concat(sub);
      }
    }
    return elements.concat(shadowElements);
  }

  function addBgImageUrl(bg, urlSet) {
    if (bg && bg !== 'none') {
      const match = bg.match(/url\((['"]?)(.*?)\1\)/);
      if (match && match[2]) {
        urlSet.add(resolveUrl(match[2]));
      }
    }
  }

  function parseSrcset(srcset) {
    if (!srcset || typeof srcset !== 'string') return [];
    return srcset.split(',').map(part => {
      const subparts = part.trim().split(/\s+/);
      return { url: subparts[0], descriptor: subparts[1] || '' };
    });
  }

  function pickBestSrcset(srcset) {
    const entries = parseSrcset(srcset).filter(e => e.url);
    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0].url;

    const wEntries = entries.filter(e => /^\d+w$/i.test(e.descriptor));
    if (wEntries.length > 0) {
      wEntries.sort((a, b) => parseInt(b.descriptor) - parseInt(a.descriptor));
      return wEntries[0].url;
    }

    const xEntries = entries.filter(e => /^[\d.]+x$/i.test(e.descriptor));
    if (xEntries.length > 0) {
      xEntries.sort((a, b) => parseFloat(b.descriptor) - parseFloat(a.descriptor));
      return xEntries[0].url;
    }

    return entries[0].url;
  }

  function resolveUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch (e) {
      return url;
    }
  }

  function getImageDetails(url) {
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const onResolve = (success) => {
        if (resolved) return;
        resolved = true;
        const w = (success && img.naturalWidth) ? img.naturalWidth : 0;
        const h = (success && img.naturalHeight) ? img.naturalHeight : 0;
        resolve({
          url: url,
          width: w,
          height: h,
          loaded: success && w > 0 && h > 0,
          format: getUrlExtension(url),
          sizeText: ''
        });
      };

      img.onload = () => onResolve(true);
      img.onerror = () => onResolve(false);

      setTimeout(() => onResolve(false), 2000);
      img.src = url;
    });
  }

  function getUrlExtension(url) {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:image\/([a-zA-Z0-9+]+);/);
      return match ? match[1].toUpperCase() : 'IMG';
    }
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const ext = pathname.substring(pathname.lastIndexOf('.') + 1).toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
        return ext === 'jpeg' ? 'JPG' : ext.toUpperCase();
      }
    } catch (e) {}
    return 'IMG';
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '0 KB';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  function executeAction(menuItemId, imageUrl) {
    chrome.runtime.sendMessage({
      action: 'execute_context_menu_action',
      menuItemId: menuItemId,
      imageUrl: imageUrl
    });
  }

  function showImageSelectionModal(candidates, menuItemId) {
    const existing = document.getElementById('max-image-selector-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'max-image-selector-container';
    container.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; overflow: visible !important;';

    const shadow = container.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .max-select-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(15, 23, 42, 0.75) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif) !important;
        color: var(--text-primary, #f8fafc) !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        z-index: 2147483647 !important;
        animation: maxFadeIn 0.2s ease !important;
      }
      
      .max-select-card {
        background: var(--bg-secondary, #0f172a) !important;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15)) !important;
        border-radius: var(--border-radius, 16px) !important;
        padding: 24px !important;
        width: 90% !important;
        max-width: 680px !important;
        max-height: 80vh !important;
        box-shadow: var(--shadow-md, 0 25px 50px -12px rgba(0, 0, 0, 0.5)) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        box-sizing: border-box !important;
        animation: maxScaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }

      .max-select-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }

      .max-select-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        background: var(--accent-gradient, linear-gradient(135deg, #00f2fe 0%, #b19ffb 100%)) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        margin: 0 !important;
      }

      .max-select-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
        gap: 16px !important;
        overflow-y: auto !important;
        padding-right: 4px !important;
        max-height: 52vh !important;
      }

      .max-select-grid::-webkit-scrollbar {
        width: 6px !important;
      }
      .max-select-grid::-webkit-scrollbar-track {
        background: transparent !important;
      }
      .max-select-grid::-webkit-scrollbar-thumb {
        background: var(--border-color, rgba(255, 255, 255, 0.15)) !important;
        border-radius: 10px !important;
      }
      .max-select-grid::-webkit-scrollbar-thumb:hover {
        background: var(--border-hover, rgba(255, 255, 255, 0.3)) !important;
      }

      .max-select-item {
        background: var(--bg-tertiary, rgba(255, 255, 255, 0.03)) !important;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)) !important;
        border-radius: 12px !important;
        padding: 12px !important;
        cursor: pointer !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        transition: all var(--transition-speed, 0.2s) ease !important;
        align-items: center !important;
        box-sizing: border-box !important;
      }

      .max-select-item:hover {
        background: var(--bg-primary, rgba(255, 255, 255, 0.06)) !important;
        border-color: var(--accent-primary) !important;
        box-shadow: 0 0 15px rgba(0, 242, 254, 0.25) !important;
        transform: translateY(-3px) !important;
      }

      .max-select-img-wrap {
        width: 100% !important;
        height: 110px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: var(--bg-primary, rgba(0, 0, 0, 0.2)) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }

      .max-select-img {
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
      }

      .max-select-info {
        font-size: 11px !important;
        color: var(--text-secondary, #94a3b8) !important;
        text-align: center !important;
        line-height: 1.4 !important;
      }

      .max-select-footer {
        display: flex !important;
        justify-content: flex-end !important;
      }

      .max-select-cancel-btn {
        background: var(--bg-tertiary, rgba(255, 255, 255, 0.08)) !important;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15)) !important;
        color: var(--text-primary, #f8fafc) !important;
        padding: 8px 18px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all var(--transition-speed, 0.15s) ease !important;
      }

      .max-select-cancel-btn:hover {
        background: rgba(239, 68, 68, 0.15) !important;
        border-color: var(--c-red, #ef4444) !important;
        color: var(--c-red, #ef4444) !important;
      }

      @keyframes maxFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes maxScaleUp {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    shadow.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'max-select-overlay';

    const card = document.createElement('div');
    card.className = 'max-select-card';

    const header = document.createElement('div');
    header.className = 'max-select-header';
    header.innerHTML = `<h2 class="max-select-title">Select an Image</h2>`;
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'max-select-grid';

    candidates.forEach(cand => {
      const item = document.createElement('div');
      item.className = 'max-select-item';
      item.setAttribute('data-url', cand.url);

      const wrap = document.createElement('div');
      wrap.className = 'max-select-img-wrap';

      const img = document.createElement('img');
      img.className = 'max-select-img';
      
      img.onerror = () => {
        item.remove();
        const remainingItems = grid.querySelectorAll('.max-select-item');
        if (remainingItems.length === 1) {
          const lastUrl = remainingItems[0].getAttribute('data-url');
          executeAction(menuItemId, lastUrl);
          container.remove();
        } else if (remainingItems.length === 0) {
          showToast('No valid images found.');
          container.remove();
        }
      };

      img.src = cand.url;
      wrap.appendChild(img);
      item.appendChild(wrap);

      const infoEl = document.createElement('div');
      infoEl.className = 'max-select-info';
      
      const parts = [];
      if (cand.width > 0 && cand.height > 0) {
        parts.push(`${cand.width} × ${cand.height} px`);
      }
      if (cand.sizeText) {
        parts.push(cand.sizeText);
      }
      if (cand.format) {
        parts.push(cand.format);
      }
      infoEl.textContent = parts.join(' • ');
      item.appendChild(infoEl);

      item.addEventListener('click', () => {
        executeAction(menuItemId, cand.url);
        container.remove();
      });

      grid.appendChild(item);
    });

    card.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'max-select-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'max-select-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      container.remove();
    });
    footer.appendChild(cancelBtn);
    card.appendChild(footer);

    overlay.appendChild(card);
    shadow.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        container.remove();
      }
    });

    (document.body || document.documentElement).appendChild(container);
  }

  function showToast(text) {
    const existing = document.getElementById('max-toast-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'max-toast-container';
    container.style.cssText = 'position: fixed !important; bottom: 32px !important; left: 50% !important; transform: translateX(-50%) !important; z-index: 2147483647 !important; pointer-events: none !important;';

    const style = document.createElement('style');
    style.textContent = `
      .max-toast {
        background: var(--bg-secondary, rgba(15, 23, 42, 0.9)) !important;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15)) !important;
        color: var(--text-primary, #f8fafc) !important;
        padding: 10px 20px !important;
        border-radius: 30px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        box-shadow: var(--shadow-md, 0 10px 25px -5px rgba(0, 0, 0, 0.3)) !important;
        animation: maxToastFade 0.2s ease-in-out !important;
      }
      @keyframes maxToastFade {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    
    const shadow = container.attachShadow({ mode: 'closed' });
    shadow.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'max-toast';
    toast.textContent = text;
    shadow.appendChild(toast);

    (document.body || document.documentElement).appendChild(container);
    setTimeout(() => container.remove(), 3000);
  }
})();
