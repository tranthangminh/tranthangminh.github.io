/**
 * floating-tools.js — Design-Power Pack by Max
 * Slim tab on the left screen edge that expands into a vertical tool panel on hover.
 * Encapsulated 100% inside Shadow DOM.
 */

(function () {
  'use strict';

  if (window !== window.top) return;
  if (window.__maxFloatingToolsInjected) return;
  window.__maxFloatingToolsInjected = true;

  const STORAGE_KEY = 'floatingToolsEnabled';
  const POS_KEY = 'floatingToolsPosY';
  const TAB_HEIGHT = 52;
  const EDGE_GAP = 8;
  const OPEN_DELAY = 120;
  const CLOSE_DELAY = 300;

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

  // Height kept free below the tab's top: the full panel once measured, so it always opens downward from the tab
  let bottomReserve = TAB_HEIGHT;

  // Stored position is a percentage of the viewport height, kept inside the screen
  function dockTopCss(percent) {
    return `clamp(${EDGE_GAP}px, ${percent}vh, calc(100vh - ${bottomReserve + EDGE_GAP}px))`;
  }

  function initFloatingTools() {
    safeStorageGet({ [STORAGE_KEY]: true, [POS_KEY]: 50 }, (data) => {
      if (data[STORAGE_KEY] === false) return;
      mountFloatingTools(data[POS_KEY] !== undefined ? data[POS_KEY] : 50);
    });

    try {
      if (isExtensionAlive() && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isExtensionAlive()) return;
          if (area === 'local') {
            if (changes[STORAGE_KEY]) {
              if (changes[STORAGE_KEY].newValue === false) {
                unmountFloatingTools();
              } else {
                safeStorageGet({ [POS_KEY]: 50 }, (d) => {
                  mountFloatingTools(d[POS_KEY] !== undefined ? d[POS_KEY] : 50);
                });
              }
            } else if (changes[POS_KEY] && changes[POS_KEY].newValue !== undefined) {
              const newPos = changes[POS_KEY].newValue;
              currentPercentY = (typeof newPos === 'number' && newPos > 100)
                ? Math.max(5, Math.min(95, (newPos / (window.innerHeight || 800)) * 100))
                : Math.max(2, Math.min(98, newPos || 50));
              if (hostEl && hostEl.shadowRoot) {
                const dockEl = hostEl.shadowRoot.querySelector('.dock');
                if (dockEl) {
                  dockEl.style.top = dockTopCss(currentPercentY);
                }
              }
            }
          }
        });
      }
    } catch (e) {}
  }

  let hostEl = null;
  let currentPercentY = 50;
  let currentResizeHandler = null;
  let currentPointerDownHandler = null;
  let currentKeyDownHandler = null;

  function unmountFloatingTools() {
    if (currentResizeHandler) {
      window.removeEventListener('resize', currentResizeHandler);
      currentResizeHandler = null;
    }
    if (currentPointerDownHandler) {
      document.removeEventListener('pointerdown', currentPointerDownHandler);
      currentPointerDownHandler = null;
    }
    if (currentKeyDownHandler) {
      window.removeEventListener('keydown', currentKeyDownHandler);
      currentKeyDownHandler = null;
    }
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
        /* Values from theme.css; its variables are not used directly because websites often define the same names */
        --dock-bg: rgba(25, 25, 25, 0.94);
        --dock-border: rgba(255, 255, 255, 0.1);
        --dock-hover: #343434;
        --dock-text: #bbbbbb;
        --dock-accent: #8DF2F2;
        --dock-tip-bg: #222222;
        --dock-brand: linear-gradient(180deg, #00f2fe 0%, #b19ffb 100%);
      }
      /* Zero-size anchor: only the visible tab or panel can take the mouse, never the empty space around them */
      .dock {
        position: fixed;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        z-index: 2147483647;
      }
      .dock-tab {
        position: absolute;
        top: 0;
        left: 0;
        box-sizing: border-box;
        width: 14px;
        height: ${TAB_HEIGHT}px;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--dock-bg);
        border: 1px solid var(--dock-border);
        border-left: none;
        border-radius: 0 8px 8px 0;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        cursor: grab;
        opacity: 0.55;
        outline: none;
        pointer-events: auto;
        transition: opacity 0.16s ease, width 0.16s ease;
      }
      .dock-tab:hover,
      .dock-tab:focus-visible {
        opacity: 1;
        width: 16px;
      }
      .dock-tab:focus-visible {
        box-shadow: 0 0 0 2px var(--dock-accent);
      }
      .dock-tab-bar {
        width: 3px;
        height: 24px;
        border-radius: 2px;
        background: var(--dock-brand);
      }
      .dock.expanded .dock-tab {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .dock-panel {
        position: absolute;
        top: 0;
        left: 0;
        box-sizing: border-box;
        width: 46px;
        /* 1px border + 12px + half of the 26px grip = 26px, the tab's centre, so the grip opens under the cursor */
        padding: 12px 6px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background: var(--dock-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--dock-border);
        border-left: none;
        border-radius: 0 12px 12px 0;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translate(-8px, var(--panel-shift, 0px));
        transition: opacity 0.16s ease, transform 0.16s ease, visibility 0s linear 0.16s;
      }
      .dock.expanded .dock-panel {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translate(0, var(--panel-shift, 0px));
        transition-delay: 0s;
      }
      .dock-grip {
        position: relative;
        width: 34px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: grab;
      }
      .dock-grip:hover {
        background: var(--dock-hover);
      }
      .dock-tab:active,
      .dock-grip:active {
        cursor: grabbing;
      }
      /* Multicolor logo as a background from icons.css: an <img> would start loading inside this script's call stack */
      .dock-logo {
        width: 18px;
        height: 18px;
        display: block;
        background: var(--max-logo) center / contain no-repeat;
      }
      .dock-sep {
        width: 20px;
        height: 1px;
        margin: 3px 0;
        background: var(--dock-border);
      }
      .action-btn {
        position: relative;
        width: 34px;
        height: 32px;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--dock-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: background-color 0.12s ease, color 0.12s ease;
      }
      .action-btn:hover {
        background: var(--dock-hover);
        color: var(--dock-accent);
      }
      .action-btn:active {
        transform: scale(0.94);
      }
      .action-btn:focus-visible {
        box-shadow: inset 0 0 0 2px var(--dock-accent);
      }
      /* Icon files are declared once in icons.css as --max-dock-icon-* (loading icons.css here logs errors on YouTube) */
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
      .icon-brush { -webkit-mask-image: var(--max-dock-icon-brush); mask-image: var(--max-dock-icon-brush); }
      .icon-camera { -webkit-mask-image: var(--max-dock-icon-camera); mask-image: var(--max-dock-icon-camera); }
      .icon-colorpicker { -webkit-mask-image: var(--max-dock-icon-colorpicker); mask-image: var(--max-dock-icon-colorpicker); }
      .icon-crop { -webkit-mask-image: var(--max-dock-icon-crop); mask-image: var(--max-dock-icon-crop); }
      .icon-fullscreen { -webkit-mask-image: var(--max-dock-icon-fullscreen); mask-image: var(--max-dock-icon-fullscreen); }
      .icon-videos { -webkit-mask-image: var(--max-dock-icon-videos); mask-image: var(--max-dock-icon-videos); }
      /* Tooltip on the right, away from the screen edge */
      .action-btn[data-title]:hover::after,
      .action-btn[data-title]:focus-visible::after,
      .dock-grip[data-title]:hover::after {
        content: attr(data-title);
        position: absolute;
        top: 50%;
        left: calc(100% + 12px);
        transform: translateY(-50%);
        background: var(--dock-tip-bg);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
      @media (prefers-reduced-motion: reduce) {
        .dock-tab,
        .dock-panel,
        .action-btn {
          transition: none;
        }
      }
    `;

    const dock = document.createElement('div');
    dock.className = 'dock';

    // Calculate vertical position as percentage (supports legacy pixel values via safe conversion)
    currentPercentY = 50;
    if (typeof initialPosY === 'number') {
      if (initialPosY > 100) {
        // Legacy pixel value (> 100) -> convert to percentage of window height
        const winH = window.innerHeight || 800;
        currentPercentY = Math.max(5, Math.min(95, (initialPosY / winH) * 100));
        safeStorageSet({ [POS_KEY]: Number(currentPercentY.toFixed(2)) });
      } else {
        currentPercentY = Math.max(2, Math.min(98, initialPosY));
      }
    }
    dock.style.top = dockTopCss(currentPercentY);

    dock.innerHTML = `
      <button class="dock-tab" type="button" aria-label="MAX Quick Tools" aria-expanded="false">
        <span class="dock-tab-bar"></span>
      </button>
      <div class="dock-panel" role="toolbar" aria-label="MAX Quick Tools" aria-orientation="vertical">
        <div class="dock-grip" data-title="Drag to move">
          <span class="dock-logo" aria-hidden="true"></span>
        </div>
        <div class="dock-sep"></div>
        <button class="action-btn" type="button" data-action="color" data-title="Pick Color" aria-label="Pick Color">
          <span class="icon-mask icon-colorpicker" aria-hidden="true"></span>
        </button>
        <div class="dock-sep"></div>
        <button class="action-btn" type="button" data-action="area" data-title="Capture Area" aria-label="Capture Area">
          <span class="icon-mask icon-crop" aria-hidden="true"></span>
        </button>
        <button class="action-btn" type="button" data-action="visible" data-title="Capture Screen" aria-label="Capture Screen">
          <span class="icon-mask icon-camera" aria-hidden="true"></span>
        </button>
        <button class="action-btn" type="button" data-action="full" data-title="Capture Full Page" aria-label="Capture Full Page">
          <span class="icon-mask icon-fullscreen" aria-hidden="true"></span>
        </button>
        <button class="action-btn" type="button" data-action="recorder" data-title="Screen Recorder" aria-label="Screen Recorder">
          <span class="icon-mask icon-videos" aria-hidden="true"></span>
        </button>
        <div class="dock-sep"></div>
        <button class="action-btn" type="button" data-action="draw" data-title="Draw on Web" aria-label="Draw on Web">
          <span class="icon-mask icon-brush" aria-hidden="true"></span>
        </button>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(dock);

    const tab = dock.querySelector('.dock-tab');
    const panel = dock.querySelector('.dock-panel');
    const grip = dock.querySelector('.dock-grip');

    let openTimer = 0;
    let closeTimer = 0;
    // After a tool is picked the panel stays shut until the pointer leaves, so it does not pop open again under the cursor
    let holdClosed = false;
    let isDragging = false;
    let lastDragEnd = 0;

    // The position clamp keeps the panel on screen; a shift is only needed when the window is shorter than the panel
    function placePanel() {
      const top = dock.getBoundingClientRect().top;
      const overflow = top + panel.offsetHeight - (window.innerHeight - EDGE_GAP);
      const shift = overflow > 0 ? -Math.min(overflow, Math.max(0, top - EDGE_GAP)) : 0;
      dock.style.setProperty('--panel-shift', `${shift}px`);
    }

    function setExpanded(expand) {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      if (expand) placePanel();
      dock.classList.toggle('expanded', expand);
      tab.setAttribute('aria-expanded', String(expand));
    }

    // Hover to open, leave to close
    dock.addEventListener('pointerenter', () => {
      clearTimeout(closeTimer);
      if (holdClosed || isDragging || dock.classList.contains('expanded')) return;
      openTimer = setTimeout(() => setExpanded(true), OPEN_DELAY);
    });
    dock.addEventListener('pointerleave', (e) => {
      clearTimeout(openTimer);
      holdClosed = false;
      // Touch fires pointerleave right after every tap, so touch closes by tapping outside instead
      if (e.pointerType !== 'mouse' || isDragging) return;
      closeTimer = setTimeout(() => setExpanded(false), CLOSE_DELAY);
    });

    // Keyboard users open the panel by focusing the tab
    dock.addEventListener('focusin', (e) => {
      if (e.target.matches(':focus-visible')) setExpanded(true);
    });
    dock.addEventListener('focusout', (e) => {
      if (!dock.contains(e.relatedTarget)) setExpanded(false);
    });
    tab.addEventListener('click', () => {
      // A drag ends with a click on the tab; only a real click opens the panel
      if (Date.now() - lastDragEnd > 300) setExpanded(true);
    });

    // Drag the tab or the grip along the Y-axis
    function startDrag(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      clearTimeout(openTimer);
      const startY = e.clientY;
      const startTop = dock.getBoundingClientRect().top;
      let hasMoved = false;

      const onMove = (moveEvent) => {
        const dy = moveEvent.clientY - startY;
        if (!hasMoved && Math.abs(dy) > 4) {
          hasMoved = true;
          isDragging = true;
        }
        if (hasMoved) {
          const maxTop = window.innerHeight - bottomReserve - EDGE_GAP;
          dock.style.top = `${Math.max(EDGE_GAP, Math.min(maxTop, startTop + dy))}px`;
          if (dock.classList.contains('expanded')) placePanel();
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (!hasMoved) return;
        isDragging = false;
        lastDragEnd = Date.now();
        const rawPercent = (dock.getBoundingClientRect().top / (window.innerHeight || 800)) * 100;
        currentPercentY = Number(Math.max(2, Math.min(98, rawPercent)).toFixed(2));
        safeStorageSet({ [POS_KEY]: currentPercentY });
        dock.style.top = dockTopCss(currentPercentY);
        if (dock.classList.contains('expanded')) placePanel();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
    tab.addEventListener('pointerdown', startDrag);
    grip.addEventListener('pointerdown', startDrag);

    // Window resize / zoom listener to ensure dock stays clamped to viewport percentage across zoom levels
    let resizeTicking = false;
    currentResizeHandler = () => {
      if (!resizeTicking) {
        window.requestAnimationFrame(() => {
          if (hostEl && hostEl.isConnected && !isDragging) {
            dock.style.top = dockTopCss(currentPercentY);
            if (dock.classList.contains('expanded')) placePanel();
          }
          resizeTicking = false;
        });
        resizeTicking = true;
      }
    };
    window.addEventListener('resize', currentResizeHandler, { passive: true });

    // Action button triggers (Calling existing extension functions/messages only)
    panel.addEventListener('click', (e) => {
      // The shadow root is open, so page scripts could otherwise trigger captures and downloads with .click()
      if (!e.isTrusted) return;
      const btn = e.target.closest('.action-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      holdClosed = true;
      btn.blur();
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
      } else if (action === 'draw') {
        if (window.__maxWebDraw && typeof window.__maxWebDraw.toggle === 'function') {
          window.__maxWebDraw.toggle();
        }
      }
    });

    // Dismiss on click outside
    currentPointerDownHandler = (e) => {
      if (dock.classList.contains('expanded')) {
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(hostEl) && !path.includes(dock)) {
          setExpanded(false);
        }
      }
    };
    document.addEventListener('pointerdown', currentPointerDownHandler);

    // Dismiss on Escape
    currentKeyDownHandler = (e) => {
      if (e.key === 'Escape' && dock.classList.contains('expanded')) {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', currentKeyDownHandler);

    (document.body || document.documentElement).appendChild(hostEl);

    // Read the panel height after the browser lays it out; reading offsetHeight here would load the icons inside this
    // call stack, and YouTube's "Unsafe attempt" logs would then be filed under the extension's Errors
    new ResizeObserver((entries) => {
      bottomReserve = Math.max(TAB_HEIGHT, entries[0].borderBoxSize[0].blockSize);
      dock.style.top = dockTopCss(currentPercentY);
    }).observe(panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingTools);
  } else {
    initFloatingTools();
  }
})();
