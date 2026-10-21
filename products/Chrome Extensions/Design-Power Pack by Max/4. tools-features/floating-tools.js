/**
 * floating-tools.js — Design-Power Pack by Max
 * Floating Speed Dial action button docked on the left screen edge.
 * Encapsulated 100% inside Shadow DOM.
 */

(function () {
  'use strict';

  if (window !== window.top) return;
  if (window.__maxFloatingToolsInjected) return;
  window.__maxFloatingToolsInjected = true;

  const STORAGE_KEY = 'floatingToolsEnabled';
  const POS_KEY = 'floatingToolsPosY';

  function isExtensionAlive() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function safeStorageGet(keys, callback) {
    if (!isExtensionAlive()) return;
    try {
      chrome.storage.local.get(keys, (res) => {
        if (chrome.runtime?.lastError) return;
        if (typeof callback === 'function') callback(res || {});
      });
    } catch (e) {}
  }

  function safeStorageSet(items, callback) {
    if (!isExtensionAlive()) return;
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime?.lastError) return;
        if (typeof callback === 'function') callback();
      });
    } catch (e) {}
  }

  function safeSendMessage(msg, callback) {
    if (!isExtensionAlive()) return;
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime?.lastError) return;
        if (typeof callback === 'function') callback(res);
      });
    } catch (e) {}
  }

  function getIconUrl(name) {
    try {
      if (isExtensionAlive() && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(`svg/${name}`);
      }
    } catch (e) {}
    return `svg/${name}`;
  }

  function initFloatingTools() {
    safeStorageGet({ [STORAGE_KEY]: true, [POS_KEY]: 60 }, (data) => {
      if (data[STORAGE_KEY] === false) return;
      mountFloatingTools(data[POS_KEY] || 60);
    });

    try {
      if (isExtensionAlive() && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isExtensionAlive()) return;
          if (area === 'local' && changes[STORAGE_KEY]) {
            if (changes[STORAGE_KEY].newValue === false) {
              unmountFloatingTools();
            } else {
              safeStorageGet({ [POS_KEY]: 60 }, (d) => {
                mountFloatingTools(d[POS_KEY] || 60);
              });
            }
          }
        });
      }
    } catch (e) {}
  }

  let hostEl = null;

  function unmountFloatingTools() {
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
      hostEl = null;
    }
  }

  function mountFloatingTools(initialPosY) {
    if (hostEl && document.contains(hostEl)) return;

    hostEl = document.createElement('div');
    hostEl.id = 'max-floating-tools-host';
    hostEl.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

    const shadow = hostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      .dock-container {
        position: fixed;
        left: 10px;
        display: flex;
        align-items: center;
        user-select: none;
        -webkit-user-select: none;
        pointer-events: auto;
        z-index: 2147483647;
      }
      .main-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        opacity: 0.45;
        transition: opacity 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
        padding: 0;
        outline: none;
      }
      .main-btn:hover {
        opacity: 1 !important;
        transform: scale(1.06);
        border-color: rgba(56, 189, 248, 0.5);
      }
      .main-btn:active {
        cursor: grabbing;
        transform: scale(0.95);
      }
      .dock-container.expanded .main-btn {
        opacity: 1 !important;
        border-color: #38bdf8;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
      }
      .main-btn-logo {
        width: 22px;
        height: 22px;
        pointer-events: none;
        display: block;
      }
      .actions-menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        margin-left: 8px;
        opacity: 0;
        pointer-events: none;
        transform: translateX(-10px) scale(0.92);
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dock-container.expanded .actions-menu {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0) scale(1);
      }
      .action-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(30, 41, 59, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        outline: none;
        position: relative;
        color: #f1f5f9;
        transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, color 0.15s ease;
      }
      .action-btn:hover {
        background: #334155;
        border-color: #38bdf8;
        color: #38bdf8;
        transform: translateY(-2px) scale(1.06);
      }
      .action-btn:active {
        transform: translateY(0) scale(0.94);
      }
      .icon-mask {
        display: inline-block;
        width: 17px;
        height: 17px;
        background-color: currentColor;
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        pointer-events: none;
      }
      /* Custom Tooltip */
      .action-btn[data-title]:hover::after {
        content: attr(data-title);
        position: absolute;
        top: -28px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.96);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        z-index: 10;
      }
    `;

    const dock = document.createElement('div');
    dock.className = 'dock-container';

    // Calculate clamped vertical position
    let currentTop = typeof initialPosY === 'number'
      ? Math.max(16, Math.min(window.innerHeight - 56, initialPosY))
      : 100;
    dock.style.top = `${currentTop}px`;

    dock.innerHTML = `
      <button class="main-btn" title="MAX Quick Tools" aria-label="MAX Quick Tools">
        <img class="main-btn-logo" src="${getIconUrl('logo-MAX.svg')}" alt="MAX" />
      </button>
      <div class="actions-menu">
        <button class="action-btn" data-action="color" data-title="Pick Color" title="Pick Color">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('colorpicker.svg')}'); -webkit-mask-image: url('${getIconUrl('colorpicker.svg')}');"></span>
        </button>
        <button class="action-btn" data-action="area" data-title="Capture Area" title="Capture Area">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('crop.svg')}'); -webkit-mask-image: url('${getIconUrl('crop.svg')}');"></span>
        </button>
        <button class="action-btn" data-action="visible" data-title="Capture Screen" title="Capture Screen">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('camera.svg')}'); -webkit-mask-image: url('${getIconUrl('camera.svg')}');"></span>
        </button>
        <button class="action-btn" data-action="full" data-title="Capture Full Page" title="Capture Full Page">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('fullscreen.svg')}'); -webkit-mask-image: url('${getIconUrl('fullscreen.svg')}');"></span>
        </button>
        <button class="action-btn" data-action="recorder" data-title="Screen Recorder" title="Screen Recorder">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('rec-screen.svg')}'); -webkit-mask-image: url('${getIconUrl('rec-screen.svg')}');"></span>
        </button>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(dock);

    const mainBtn = dock.querySelector('.main-btn');
    const actionsMenu = dock.querySelector('.actions-menu');

    function setExpanded(expand) {
      if (expand) {
        dock.classList.add('expanded');
      } else {
        dock.classList.remove('expanded');
      }
    }

    // Drag along Y-axis handling
    let isDragging = false;
    let startY = 0;
    let startTop = 0;
    let hasMoved = false;

    mainBtn.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startY = e.clientY;
      startTop = dock.offsetTop;

      const onMouseMove = (moveEvent) => {
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dy) > 4) {
          hasMoved = true;
        }
        if (hasMoved) {
          const maxTop = window.innerHeight - 56;
          currentTop = Math.max(16, Math.min(maxTop, startTop + dy));
          dock.style.top = `${currentTop}px`;
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          safeStorageSet({ [POS_KEY]: currentTop });
        } else {
          // Pure click without dragging -> toggle expanded state
          setExpanded(!dock.classList.contains('expanded'));
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Action button triggers (Calling existing extension functions/messages only)
    actionsMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      setExpanded(false);

      if (action === 'color') {
        if (window.EyeDropper) {
          const dropper = new EyeDropper();
          dropper.open()
            .then((result) => {
              const hex = result.sRGBHex;
              safeStorageGet({ colorHistory: [] }, (data) => {
                let history = data.colorHistory || [];
                history = history.filter(c => c.toLowerCase() !== hex.toLowerCase());
                history.unshift(hex);
                history = history.slice(0, 30);
                safeStorageSet({ colorHistory: history }, () => {
                  navigator.clipboard.writeText(hex).catch(() => {});
                });
              });
            })
            .catch(() => {});
        }
      } else if (action === 'area') {
        safeSendMessage({ action: 'start_area_capture' });
      } else if (action === 'visible') {
        safeSendMessage({ action: 'trigger_capture_visible' });
      } else if (action === 'full') {
        safeSendMessage({ action: 'trigger_capture_full' });
      } else if (action === 'recorder') {
        safeSendMessage({ action: 'trigger_screen_recorder' });
      }
    });

    // Dismiss on click outside
    document.addEventListener('pointerdown', (e) => {
      if (dock.classList.contains('expanded')) {
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(hostEl) && !path.includes(dock)) {
          setExpanded(false);
        }
      }
    });

    // Dismiss on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dock.classList.contains('expanded')) {
        setExpanded(false);
      }
    });

    (document.body || document.documentElement).appendChild(hostEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingTools);
  } else {
    initFloatingTools();
  }
})();
