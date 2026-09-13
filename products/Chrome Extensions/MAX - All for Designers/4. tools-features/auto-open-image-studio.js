/**
 * auto-open-image-studio.js — MAX Design Power-Pack
 * Embeds full MAX Image Studio directly in-place on standalone direct image tabs
 * preserving 100% of the original URL in the address bar without redirecting.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'directImageStudioEnabled';
  let isInjected = false;

  function isStandaloneImagePage() {
    if (!window.location) return false;

    // Prevent recursive loop if inside extension page context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && window.location.href.includes(chrome.runtime.id)) {
      return false;
    }

    // Direct match for blob: URLs (Messenger, WhatsApp, Discord, Figma image tabs)
    if (window.location.protocol === 'blob:') {
      return true;
    }

    const protocol = window.location.protocol;
    const allowedProtocols = ['http:', 'https:', 'file:'];
    if (!allowedProtocols.includes(protocol)) {
      return false;
    }

    // Check if content type is direct image (browser native image viewer)
    if (document.contentType && document.contentType.startsWith('image/')) {
      return true;
    }

    // Check if document body contains ONLY 1 image tag and no other content (Chrome native image viewer DOM)
    if (document.body) {
      const children = Array.from(document.body.children).filter(el =>
        el.tagName !== 'SCRIPT' &&
        el.tagName !== 'STYLE' &&
        el.id !== 'image-preview-modal' &&
        !el.id?.includes('max-')
      );
      if (children.length === 1 && children[0].tagName === 'IMG') {
        return true;
      }
    }

    // Fallback check for URLs ending with direct image extensions on standalone document
    const pathname = window.location.pathname.toLowerCase();
    const ext = pathname.substring(pathname.lastIndexOf('.') + 1).split('?')[0];
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif'].includes(ext)) {
      if (!document.body || document.body.children.length <= 2) {
        return true;
      }
    }

    return false;
  }

  function getIconUrl(name) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
        return chrome.runtime.getURL(`svg/${name}`);
      }
    } catch (e) {}
    return `svg/${name}`;
  }

  function createModalHtml() {
    return `
      <!-- Image Edit Toolbar -->
      <div id="modal-edit-toolbar" class="edit-toolbar hidden">
        <div class="edit-toolbar-row">
          <!-- Idle / Selection Mode Button -->
          <button id="edit-idle-mode-btn" class="btn-modal-edit btn-icon active" title="Selection Mode (Drag text to move)">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('cursor.svg')}'); -webkit-mask-image: url('${getIconUrl('cursor.svg')}');"></span>
          </button>

          <!-- Brush Tool Popover Trigger -->
          <div class="edit-tool-popover-wrapper">
            <button id="edit-brush-tool-btn" class="btn-modal-edit btn-dropdown" title="Brush Settings">
              <span class="icon-mask" style="mask-image: url('${getIconUrl('brush.svg')}'); -webkit-mask-image: url('${getIconUrl('brush.svg')}');"></span>
              <span class="dropdown-arrow">▼</span>
            </button>
          </div>

          <!-- Shape Tool Popover Trigger -->
          <div class="edit-tool-popover-wrapper">
            <button id="edit-shape-tool-btn" class="btn-modal-edit btn-dropdown" title="Shape Tool">
              <span class="icon-mask" style="mask-image: url('${getIconUrl('square.svg')}'); -webkit-mask-image: url('${getIconUrl('square.svg')}');"></span>
              <span class="dropdown-arrow">▼</span>
            </button>

            <!-- Shape Settings Popover Panel -->
            <div id="edit-shape-panel" class="edit-brush-panel edit-shape-panel hidden">
              <div class="brush-panel-section">
                <div class="brush-panel-header">
                  <span class="brush-panel-title">Shape Type</span>
                </div>
                <div class="shape-type-grid">
                  <button id="shape-type-rect-btn" class="btn-radio shape-type-btn active" data-shape="rect" title="Polygon / Rectangle (M)">
                    <span class="icon-mask" style="mask-image: url('${getIconUrl('square.svg')}'); -webkit-mask-image: url('${getIconUrl('square.svg')}');"></span>
                    <span>Polygon (M)</span>
                  </button>
                  <button id="shape-type-ellipse-btn" class="btn-radio shape-type-btn" data-shape="ellipse" title="Ellipse (O / L)">
                    <span class="icon-mask" style="mask-image: url('${getIconUrl('circle.svg')}'); -webkit-mask-image: url('${getIconUrl('circle.svg')}');"></span>
                    <span>Ellipse (O)</span>
                  </button>
                  <button id="shape-type-polygonal-btn" class="btn-radio shape-type-btn" data-shape="polygonal" title="Line Path Straight Lines (P)">
                    <span class="icon-mask" style="mask-image: url('${getIconUrl('polygonal.svg')}'); -webkit-mask-image: url('${getIconUrl('polygonal.svg')}');"></span>
                    <span>Line Path (P)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Text Tool Trigger -->
          <button id="edit-text-tool-btn" class="btn-modal-edit btn-icon" title="Add Text">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('text-tool.svg')}'); -webkit-mask-image: url('${getIconUrl('text-tool.svg')}');"></span>
          </button>

          <div class="edit-toolbar-divider"></div>

          <!-- Undo, Redo, Clear Buttons -->
          <button id="edit-undo-btn" class="btn-modal-edit btn-icon" title="Undo (Ctrl+Z)">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('undo.svg')}'); -webkit-mask-image: url('${getIconUrl('undo.svg')}');"></span>
          </button>

          <button id="edit-redo-btn" class="btn-modal-edit btn-icon" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('redo.svg')}'); -webkit-mask-image: url('${getIconUrl('redo.svg')}');"></span>
          </button>

          <button id="edit-clear-btn" class="btn-modal-edit btn-icon" title="Clear drawing">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('clear.svg')}'); -webkit-mask-image: url('${getIconUrl('clear.svg')}');"></span>
          </button>
        </div>

        <!-- Row 2 for Download Edited & Close Modal -->
        <div class="edit-toolbar-row edit-toolbar-row-2">
          <button id="edit-stop-brush-btn" class="edit-btn stop-brush-btn hidden" title="Stop Drawing & Return to Selection Mode">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('close.svg')}'); -webkit-mask-image: url('${getIconUrl('close.svg')}');"></span> Stop
          </button>
          <div class="edit-save-group">
            <button id="edit-copy-btn" class="edit-btn copy-btn" title="Copy edited image to clipboard">
              <span class="icon-mask" style="mask-image: url('${getIconUrl('copy.svg')}'); -webkit-mask-image: url('${getIconUrl('copy.svg')}');"></span> <span>Copy<br>Edited</span>
            </button>
            <button id="edit-save-btn" class="edit-btn save-btn" title="Download edited image">
              <span class="icon-mask" style="mask-image: url('${getIconUrl('download.svg')}'); -webkit-mask-image: url('${getIconUrl('download.svg')}');"></span> <span>Download<br>Edited</span>
            </button>
            <button id="edit-close-modal-btn" class="btn btn-icon edit-close-btn modal-close-btn" title="Close Modal">
              <span class="icon-mask" style="mask-image: url('${getIconUrl('close.svg')}'); -webkit-mask-image: url('${getIconUrl('close.svg')}');"></span>
            </button>
          </div>
        </div>
      </div>

      <img id="modal-image-preview" src="" alt="Preview" />

      <div class="modal-info-wrapper">
        <div class="modal-hud-controls">
          <button id="modal-theme-toggle-btn" class="btn-icon hide-hud-btn modal-theme-toggle-btn" title="Toggle Studio Theme (Dark / Light)">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('light-mode.svg')}'); -webkit-mask-image: url('${getIconUrl('light-mode.svg')}');"></span>
          </button>
          <button id="modal-hide-hud-btn" class="btn-icon hide-hud-btn" title="Toggle Hide HUD (H)">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('hide.svg')}'); -webkit-mask-image: url('${getIconUrl('hide.svg')}');"></span>
          </button>
        </div>

        <div class="modal-info">
          <!-- Row 1: Expandable Hotkey Hint Chips -->
          <div class="modal-info-row modal-info-row-hints modal-info-row-expandable">
            <span class="modal-hint-chip" title="Press A for Selection Mode">
              <img src="${getIconUrl('cursor.svg')}" alt="Select" class="hint-icon-svg" />
              A: Select
            </span>
            <span class="modal-hint-chip" title="Press B for Brush Tool">
              <img src="${getIconUrl('brush.svg')}" alt="Brush" class="hint-icon-svg" />
              B: Brush
            </span>
            <span class="modal-hint-chip" title="Press T for Text Tool">
              <img src="${getIconUrl('text-tool.svg')}" alt="Text" class="hint-icon-svg" />
              T: Text
            </span>
            <span class="modal-hint-chip" title="Press M for Polygon / Rectangle Tool">
              <img src="${getIconUrl('square.svg')}" alt="Polygon" class="hint-icon-svg" />
              M: Polygon
            </span>
            <span class="modal-hint-chip" title="Press O for Ellipse Tool">
              <img src="${getIconUrl('circle.svg')}" alt="Ellipse" class="hint-icon-svg" />
              O: Ellipse
            </span>
            <span class="modal-hint-chip" title="Press P for Line Path Tool">
              <img src="${getIconUrl('polygonal.svg')}" alt="Line Path" class="hint-icon-svg" />
              P: Line Path
            </span>

            <span class="modal-hint-chip chip-purple" title="Press H to Toggle Hide HUD">
              <img src="${getIconUrl('hide.svg')}" alt="Hide HUD" class="hint-icon-svg" />
              H: Hide HUD
            </span>
            <span class="modal-hint-chip chip-purple" title="Press Ctrl+C to Copy Edited Image">
              <img src="${getIconUrl('copy.svg')}" alt="Copy" class="hint-icon-svg" />
              Ctrl C: Copy Edited
            </span>

            <span class="modal-hint-chip chip-cyan" title="Hold & Drag Middle Mouse Button to Pan Image">
              <img src="${getIconUrl('mouse.svg')}" alt="Pan" class="hint-icon-svg" />
              Middle: Pan
            </span>
            <span class="modal-hint-chip chip-cyan" title="Scroll Mouse Wheel to Zoom In/Out">
              <img src="${getIconUrl('zoom.svg')}" alt="Zoom" class="hint-icon-svg" />
              Scroll: Zoom
            </span>
            <span class="modal-hint-chip chip-cyan" title="Double Click Image to Quick Zoom In/Out">
              <img src="${getIconUrl('double-click.svg')}" alt="Fast Zoom" class="hint-icon-svg" />
              DblClick: Fast Zoom
            </span>
            <span class="modal-hint-chip chip-cyan" title="Press 1 to Zoom 100% Natural Size">
              <img src="${getIconUrl('zoom.svg')}" alt="100%" class="hint-icon-svg" />
              1: 100%
            </span>
            <span class="modal-hint-chip chip-cyan" title="Press 2 for Fit on Screen">
              <img src="${getIconUrl('fullscreen.svg')}" alt="Fit" class="hint-icon-svg" />
              2: Fit Screen
            </span>

            <span class="modal-hint-chip chip-red" title="Press Escape to Close Modal">
              <img src="${getIconUrl('close.svg')}" alt="Close" class="hint-icon-svg" />
              ESC: Close
            </span>
          </div>

          <!-- Row 2: Filename & Zoom -->
          <div class="modal-info-row modal-info-row-filename">
            <span id="modal-image-size"></span>
          </div>

          <!-- Row 3: Action Buttons -->
          <div class="modal-info-row modal-info-row-actions">
            <div class="modal-actions">
              <button id="modal-copy-btn" class="btn btn-secondary action-btn secondary-action-btn" title="Copy image to clipboard">
                <span class="icon-mask" style="mask-image: url('${getIconUrl('copy.svg')}'); -webkit-mask-image: url('${getIconUrl('copy.svg')}'); width: 14px; height: 14px;"></span> Copy
              </button>
              <button id="modal-download-btn" class="btn btn-primary action-btn">
                <span class="icon-mask" style="mask-image: url('${getIconUrl('download.svg')}'); -webkit-mask-image: url('${getIconUrl('download.svg')}'); width: 14px; height: 14px;"></span> Download
              </button>
            </div>
          </div>

          <!-- Row 4: Search Image engines -->
          <div class="modal-info-row modal-info-row-search">
            <span class="search-image-label">Search Image on:</span>
            <div class="search-image-actions">
              <button id="modal-yandex-search-btn" class="btn btn-secondary action-btn secondary-action-btn" title="Search Image on Yandex (Exact Full-Res)">
                <span class="icon-mask" style="mask-image: url('${getIconUrl('yandex.svg')}'); -webkit-mask-image: url('${getIconUrl('yandex.svg')}'); width: 14px; height: 14px;"></span> Yandex
              </button>
              <button id="modal-tineye-search-btn" class="btn btn-secondary action-btn secondary-action-btn" title="Search Image on TinEye">
                <span class="icon-mask" style="mask-image: url('${getIconUrl('tineye.svg')}'); -webkit-mask-image: url('${getIconUrl('tineye.svg')}'); width: 14px; height: 14px;"></span> TinEye
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initThemeSync() {
    function applyTheme(theme) {
      const themeBtn = document.getElementById('modal-theme-toggle-btn');
      const iconMask = themeBtn ? themeBtn.querySelector('.icon-mask') : null;
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (document.body) document.body.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.title = 'Switch to Dark Theme';
        if (iconMask) {
          const darkSvg = getIconUrl('dark-mode.svg');
          iconMask.style.maskImage = `url('${darkSvg}')`;
          iconMask.style.webkitMaskImage = `url('${darkSvg}')`;
        }
      } else {
        document.documentElement.removeAttribute('data-theme');
        if (document.body) document.body.removeAttribute('data-theme');
        if (themeBtn) themeBtn.title = 'Switch to Light Theme';
        if (iconMask) {
          const lightSvg = getIconUrl('light-mode.svg');
          iconMask.style.maskImage = `url('${lightSvg}')`;
          iconMask.style.webkitMaskImage = `url('${lightSvg}')`;
        }
      }
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ imageStudioTheme: 'dark' }, (data) => {
        applyTheme(data.imageStudioTheme);
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.imageStudioTheme) {
          applyTheme(changes.imageStudioTheme.newValue);
        }
      });
    }
  }

  function mountInPlaceImageStudio() {
    if (isInjected) return;
    if (!document.body) return;
    isInjected = true;

    // Apply classes to body and root
    document.body.classList.add('max-standalone-image-page');
    document.documentElement.classList.add('max-standalone-image-page');

    initThemeSync();

    // 1. Inject Modal DOM Container into body
    let modal = document.getElementById('image-preview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-preview-modal';
      modal.className = 'modal editor-page-modal';
      modal.innerHTML = createModalHtml();
      document.body.appendChild(modal);
    } else {
      modal.className = 'modal editor-page-modal';
      modal.classList.remove('hidden');
    }

    // 2. Determine target image URL and filename
    const nativeImg = document.querySelector('body > img:not(#modal-image-preview)');
    const targetUrl = (nativeImg && nativeImg.src) ? nativeImg.src : window.location.href;
    let filename = 'image';
    try {
      const urlObj = new URL(targetUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        filename = decodeURIComponent(parts[parts.length - 1]);
      }
    } catch (e) {}

    // 3. Initialize modal & editor modules
    if (typeof initPreviewModal === 'function') {
      initPreviewModal();
    }
    if (typeof initImageEditorModule === 'function') {
      initImageEditorModule();
    }

    // 4. Open preview with full URL and enter edit mode
    if (typeof openPreviewModal === 'function') {
      openPreviewModal(targetUrl, filename, 'Full Resolution');
    }

    // 5. Ensure edit mode starts when image renders
    const modalImg = document.getElementById('modal-image-preview');
    if (modalImg) {
      const startEditing = () => {
        if (typeof updateModalTransform === 'function') {
          updateModalTransform();
        }
        if (typeof enterEditMode === 'function') {
          enterEditMode();
        }
      };

      if (modalImg.complete && modalImg.naturalWidth) {
        setTimeout(startEditing, 80);
      } else {
        modalImg.addEventListener('load', () => {
          setTimeout(startEditing, 80);
        }, { once: true });
      }
    }
  }

  function initDirectImageStudio() {
    if (!isStandaloneImagePage()) return;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ [STORAGE_KEY]: true }, (data) => {
        if (data[STORAGE_KEY] !== false) {
          mountInPlaceImageStudio();
        }
      });
    } else {
      mountInPlaceImageStudio();
    }
  }

  function checkAndMount() {
    if (isStandaloneImagePage()) {
      initDirectImageStudio();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndMount);
  } else {
    checkAndMount();
  }
  setTimeout(checkAndMount, 100);
  setTimeout(checkAndMount, 300);
})();
