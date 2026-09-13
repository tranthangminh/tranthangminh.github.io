// Fullscreen Image Preview Modal Feature (Zoom & Pan Handling) - image_previewmodal.js

let isModalInitialized = false; // [C3 Fix] Guard against duplicate document-level listeners

let modalPreviewUrl = '';
let modalPreviewFilename = '';
let modalPreviewSizeLabel = '';
let scale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// Update the CSS transform and zoom percentage label in the UI
function updateModalTransform() {
  const modal = document.getElementById('image-preview-modal');
  const modalImg = document.getElementById('modal-image-preview');
  if (modalImg && modal) {
    if (!modal.classList.contains('hud-hidden')) {
      const editToolbar = document.getElementById('modal-edit-toolbar');
      const modalInfo = document.querySelector('.modal-info');
      
      let topOffset = 24;
      if (editToolbar && !editToolbar.classList.contains('hidden')) {
        const toolbarRect = editToolbar.getBoundingClientRect();
        if (toolbarRect.height > 0) {
          topOffset = Math.max(12, toolbarRect.bottom + 8);
        }
      }
        
      let bottomOffset = 60;
      if (modalInfo) {
        const infoRect = modalInfo.getBoundingClientRect();
        if (infoRect.height > 0) {
          bottomOffset = Math.max(16, window.innerHeight - infoRect.top + 8);
        }
      }

      modalImg.style.position = 'absolute';
      modalImg.style.top = `${topOffset}px`;
      modalImg.style.bottom = `${bottomOffset}px`;
      modalImg.style.left = '0';
      modalImg.style.right = '0';
      modalImg.style.margin = 'auto';
      modalImg.style.maxHeight = `calc(100vh - ${topOffset + bottomOffset}px)`;
    } else {
      modalImg.style.position = '';
      modalImg.style.top = '';
      modalImg.style.bottom = '';
      modalImg.style.left = '';
      modalImg.style.right = '';
      modalImg.style.margin = '';
      modalImg.style.maxHeight = '100vh';
    }
    modalImg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  const modalSize = document.getElementById('modal-image-size');
  if (modalSize && modalImg) {
    let displayPercent = Math.round(scale * 100);
    if (modalImg.naturalWidth && modalImg.clientWidth) {
      displayPercent = Math.round((modalImg.clientWidth / modalImg.naturalWidth) * scale * 100);
    }
    modalSize.textContent = `[${displayPercent}%] ${modalPreviewFilename} (${modalPreviewSizeLabel})`;
  }
  if (typeof window.syncCanvasOverlayPosition === 'function') {
    window.syncCanvasOverlayPosition();
  }
  if (typeof window.updateVectorUiOverlay === 'function') {
    window.updateVectorUiOverlay();
  }
  if (typeof window.updateBrushCursorPosition === 'function') {
    window.updateBrushCursorPosition();
  }
}

// Initialize all preview modal event listeners
function initPreviewModal() {
  const modal = document.getElementById('image-preview-modal');
  if (!modal) return;

  // [C3 Fix] Prevent duplicate document-level listeners (keydown, mousemove, mouseup)
  if (isModalInitialized) return;
  isModalInitialized = true;
  applySavedHideHudState();

  const closeBtn = modal.querySelector('.modal-close-btn');
  const downloadBtn = document.getElementById('modal-download-btn');
  const modalImg = document.getElementById('modal-image-preview');

  // Update transform/zoom scale indicator when image loads and resolves clientWidth
  if (modalImg) {
    modalImg.addEventListener('load', () => {
      updateModalTransform();
    });
  }

  function createDiscardDialog() {
    let dialog = document.getElementById('discard-changes-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('div');
    dialog.id = 'discard-changes-dialog';
    dialog.className = 'modal-backdrop discard-dialog-overlay hidden';
    dialog.innerHTML = `
      <div class="modal-dialog discard-dialog-box">
        <div class="discard-dialog-icon">⚠️</div>
        <h3 class="discard-dialog-title">Discard All Changes?</h3>
        <p class="discard-dialog-msg">You have unsaved drawings or text edits. Are you sure you want to discard everything?</p>
        <div class="discard-dialog-actions">
          <button id="discard-cancel-btn" class="btn btn-secondary">Keep Editing</button>
          <button id="discard-confirm-btn" class="btn btn-danger">Discard All</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const cancelBtn = dialog.querySelector('#discard-cancel-btn');
    const confirmBtn = dialog.querySelector('#discard-confirm-btn');

    cancelBtn.addEventListener('click', () => {
      dialog.classList.add('hidden');
    });

    confirmBtn.addEventListener('click', () => {
      dialog.classList.add('hidden');
      if (typeof window.clearAllObjectsAndHistory === 'function') {
        window.clearAllObjectsAndHistory();
      }
      forceClosePreviewModal();
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.classList.add('hidden');
      }
    });

    return dialog;
  }

  function showDiscardDialog() {
    const dialog = createDiscardDialog();
    dialog.classList.remove('hidden');
  }

  function forceClosePreviewModal() {
    if (modal && modal.classList.contains('editor-page-modal')) {
      window.close();
      return;
    }
    if (modal) modal.classList.add('hidden');
    if (typeof window.exitEditMode === 'function') {
      window.exitEditMode();
    } else if (typeof exitEditMode === 'function') {
      exitEditMode();
    }
  }

  function requestClosePreviewModal() {
    const modal = document.getElementById('image-preview-modal');
    if (!modal || (modal.classList.contains('hidden') && !modal.classList.contains('editor-page-modal'))) return;

    // Check if open discard dialog is currently visible -> hide dialog
    const discardDialog = document.getElementById('discard-changes-dialog');
    if (discardDialog && !discardDialog.classList.contains('hidden')) {
      discardDialog.classList.add('hidden');
      return;
    }

    // Check if open popovers are visible -> close popover first
    const sizePopover = document.getElementById('vector-size-popover');
    if (sizePopover && !sizePopover.classList.contains('hidden')) {
      sizePopover.classList.add('hidden');
      return;
    }
    const colorPopover = document.getElementById('vector-color-popover');
    if (colorPopover && !colorPopover.classList.contains('hidden')) {
      colorPopover.classList.add('hidden');
      return;
    }
    const inlineInput = document.getElementById('vector-inline-size-input');
    if (inlineInput && !inlineInput.classList.contains('hidden')) {
      inlineInput.classList.add('hidden');
      return;
    }

    if (typeof window.hasModalChanges === 'function' && window.hasModalChanges()) {
      showDiscardDialog();
    } else {
      forceClosePreviewModal();
    }
  }
  window.requestClosePreviewModal = requestClosePreviewModal;
  window.closePreviewModal = requestClosePreviewModal;

  // Close on close button click (binds all close buttons including edit-close-modal-btn)
  const closeBtns = document.querySelectorAll('.modal-close-btn, #edit-close-modal-btn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      requestClosePreviewModal();
    });
  });

  // Close on modal background click (prevent close when in edit mode)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (window.isEditMode || window.activeTextWrapper) {
        if (typeof window.commitActiveTextOverlay === 'function') {
          window.commitActiveTextOverlay();
        }
        return;
      }
      requestClosePreviewModal();
    }
  });

  // Global capture-phase ESC hotkey (Escape to close modal/tab anytime anywhere regardless of object selection)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('image-preview-modal');
      if (!modal) return;
      if (!modal.classList.contains('hidden') || modal.classList.contains('editor-page-modal')) {
        e.preventDefault();
        e.stopPropagation();
        requestClosePreviewModal();
      }
    }
  }, true);

  // Global capture-phase hotkeys (H for Hide HUD, 1 for 100% Zoom, 2 for Fit Screen)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const modal = document.getElementById('image-preview-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    const active = document.activeElement;
    const isTypingInput = active && (
      (active.tagName === 'INPUT' && (active.type === 'text' || active.type === 'search' || !active.type)) ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable
    );
    const isActivelyTypingText = typeof window.selectedTextObj !== 'undefined' && window.selectedTextObj && window.selectedTextObj.isEditingText;

    if (isTypingInput || isActivelyTypingText) return;

    const key = e.key.toLowerCase();
    if (key === 'h') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.toggleHideHud === 'function') {
        window.toggleHideHud();
      } else if (typeof toggleHideHud === 'function') {
        toggleHideHud();
      }
    } else if (key === '1') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.zoomTo100Percent === 'function') {
        window.zoomTo100Percent();
      } else if (typeof zoomTo100Percent === 'function') {
        zoomTo100Percent();
      }
    } else if (key === '2') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.zoomToFitScreen === 'function') {
        window.zoomToFitScreen();
      } else if (typeof zoomToFitScreen === 'function') {
        zoomToFitScreen();
      }
    }
  }, true);

  // Modal download button action
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const url = modalPreviewUrl || window.modalPreviewUrl;
      const name = modalPreviewFilename || window.modalPreviewFilename;
      if (url) {
        if (typeof window.downloadSingleResource === 'function') {
          window.downloadSingleResource(url, name);
        } else if (typeof window.downloadSingleImage === 'function') {
          window.downloadSingleImage(url, name);
        } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'downloadImage',
            url: url,
            filename: name
          });
        }
      }
    });
  }
  // Modal Open Tab button action
  const openTabModalBtn = document.getElementById('modal-open-tab-btn');
  if (openTabModalBtn) {
    openTabModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = modalPreviewUrl || window.modalPreviewUrl || window.originalModalPreviewUrl;
      if (!url) return;

      if (typeof window.openInNewTab === 'function') {
        window.openInNewTab(url);
      } else if (typeof openInNewTab === 'function') {
        openInNewTab(url);
      } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // Modal Copy button action
  const copyModalBtn = document.getElementById('modal-copy-btn');
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', async () => {
      if (!modalPreviewUrl) return;
      try {
        const resp = await fetch(modalPreviewUrl);
        const blob = await resp.blob();
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          let pngBlob = blob;
          if (blob.type !== 'image/png') {
            const img = new Image();
            img.src = modalPreviewUrl;
            await new Promise(r => { img.onload = r; img.onerror = r; });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 150;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
          }
          const item = new ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([item]);
          if (window.showToast) window.showToast('Copied to clipboard!');
        } else {
          if (window.showToast) window.showToast('Clipboard API not supported');
        }
      } catch (err) {
        if (window.showToast) window.showToast('Failed to copy image');
      }
    });
  }

  // Modal Yandex Search button action
  const yandexSearchBtn = document.getElementById('modal-yandex-search-btn');
  if (yandexSearchBtn) {
    yandexSearchBtn.addEventListener('click', () => {
      if (modalPreviewUrl) {
        if (typeof window.performYandexImageSearch === 'function') {
          window.performYandexImageSearch(modalPreviewUrl);
        } else {
          window.open(`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(modalPreviewUrl)}`, '_blank');
        }
      }
    });
  }

  // Modal TinEye Search button action
  const tineyeSearchBtn = document.getElementById('modal-tineye-search-btn');
  if (tineyeSearchBtn) {
    tineyeSearchBtn.addEventListener('click', () => {
      if (modalPreviewUrl) {
        if (typeof window.performTinEyeImageSearch === 'function') {
          window.performTinEyeImageSearch(modalPreviewUrl);
        } else {
          window.open(`https://tineye.com/search?url=${encodeURIComponent(modalPreviewUrl)}`, '_blank');
        }
      }
    });
  }

  // Initialize studio theme sync & listener
  initModalThemeSync();

  // Hide HUD toggle button action
  const hideHudBtn = document.getElementById('modal-hide-hud-btn');
  if (hideHudBtn) {
    hideHudBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHideHud();
    });
  }

  // Zoom on wheel scroll (centered at mouse cursor position)
  modal.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.12;
    
    // Calculate dynamic maxScale
    let maxScale = 10;
    if (modalImg && modalImg.clientWidth) {
      const containerWidth = modal.clientWidth || 300;
      const fitContainerScale = containerWidth / modalImg.clientWidth;
      const naturalWidth = modalImg.naturalWidth || modalImg.clientWidth;
      const naturalScale = naturalWidth / modalImg.clientWidth;
      maxScale = Math.max(10, fitContainerScale, naturalScale);
    }
    
    const oldScale = scale;
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale += zoomIntensity * scale;
    } else {
      newScale -= zoomIntensity * scale;
    }
    
    newScale = Math.max(1, Math.min(maxScale, newScale));
    
    if (newScale === 1) {
      panX = 0;
      panY = 0;
      scale = 1;
    } else {
      const modalBox = modal.getBoundingClientRect();
      const modalCenterX = modalBox.left + modalBox.width / 2;
      const modalCenterY = modalBox.top + modalBox.height / 2;
      
      const scaleFactor = newScale / oldScale;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      panX = (mouseX - modalCenterX) + (panX - (mouseX - modalCenterX)) * scaleFactor;
      panY = (mouseY - modalCenterY) + (panY - (mouseY - modalCenterY)) * scaleFactor;
      scale = newScale;
    }
    
    updateModalTransform();
    if (modalImg) {
      modalImg.style.cursor = (scale > 1 && !window.isEditMode) ? 'grab' : 'default';
    }
  }, { passive: false });

  const startPanDrag = (e) => {
    const isLeftClickZoomed = (e.button === 0 && scale > 1 && (!window.isEditMode || window.editorMode === 'idle'));
    const isMiddleClick = (e.button === 1);

    if (!isLeftClickZoomed && !isMiddleClick) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    if (modalImg) modalImg.style.cursor = 'grabbing';
  };
  window.startPanDrag = startPanDrag;

  if (modalImg) {
    modalImg.addEventListener('mousedown', startPanDrag);
  }

  modal.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      startPanDrag(e);
    }
  });

  // Prevent browser middle-click auto-scroll icon
  modal.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panX += dx;
    panY += dy;
    startX = e.clientX;
    startY = e.clientY;
    updateModalTransform();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (modalImg) modalImg.style.cursor = (scale > 1 && !window.isEditMode) ? 'grab' : 'default';
    }
  });

function toggleModalZoom(e = null) {
  const modalImg = document.getElementById('modal-image-preview');
  const modal = document.getElementById('image-preview-modal');
  if (!modalImg || !modal) return;

  if (scale > 1) {
    scale = 1;
    panX = 0;
    panY = 0;
  } else {
    let zoomTarget = 3;
    if (modalImg.clientWidth) {
      const containerWidth = modal.clientWidth || 300;
      const fitContainerScale = containerWidth / modalImg.clientWidth;
      const naturalWidth = modalImg.naturalWidth || modalImg.clientWidth;
      const naturalScale = naturalWidth / modalImg.clientWidth;
      zoomTarget = Math.max(3, fitContainerScale, naturalScale);
    }

    const oldScale = scale;
    const newScale = zoomTarget;
    const scaleFactor = newScale / oldScale;

    if (e && typeof e.clientX === 'number') {
      const modalBox = modal.getBoundingClientRect();
      const modalCenterX = modalBox.left + modalBox.width / 2;
      const modalCenterY = modalBox.top + modalBox.height / 2;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      panX = (mouseX - modalCenterX) + (panX - (mouseX - modalCenterX)) * scaleFactor;
      panY = (mouseY - modalCenterY) + (panY - (mouseY - modalCenterY)) * scaleFactor;
    } else {
      panX = 0;
      panY = 0;
    }
    scale = newScale;
  }
  updateModalTransform();
  if (modalImg) {
    modalImg.style.cursor = (scale > 1 && !window.isEditMode) ? 'grab' : 'default';
  }
}
window.toggleModalZoom = toggleModalZoom;

function zoomTo100Percent() {
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg) return;

  panX = 0;
  panY = 0;

  if (modalImg.naturalWidth && modalImg.clientWidth) {
    scale = modalImg.naturalWidth / modalImg.clientWidth;
  } else {
    scale = 1;
  }

  updateModalTransform();
  if (modalImg) {
    modalImg.style.cursor = (scale > 1 && !window.isEditMode) ? 'grab' : 'default';
  }
}
window.zoomTo100Percent = zoomTo100Percent;

function zoomToFitScreen() {
  const modalImg = document.getElementById('modal-image-preview');
  const modal = document.getElementById('image-preview-modal');
  if (!modalImg || !modal) return;

  panX = 0;
  panY = 0;

  const modalBox = modal.getBoundingClientRect();
  const isHudHidden = modal.classList.contains('hud-hidden');
  const availableWidth = (modalBox.width || window.innerWidth) * (isHudHidden ? 0.98 : 0.95);

  const editToolbar = document.getElementById('modal-edit-toolbar');
  const modalInfo = document.querySelector('.modal-info');
  
  let topOffset = 24;
  if (editToolbar && !editToolbar.classList.contains('hidden')) {
    const toolbarRect = editToolbar.getBoundingClientRect();
    if (toolbarRect.height > 0) {
      topOffset = Math.max(12, toolbarRect.bottom + 8);
    }
  }
    
  let bottomOffset = 60;
  if (modalInfo) {
    const infoRect = modalInfo.getBoundingClientRect();
    if (infoRect.height > 0) {
      bottomOffset = Math.max(16, window.innerHeight - infoRect.top + 8);
    }
  }

  const availableHeight = isHudHidden
    ? (modalBox.height || window.innerHeight) * 0.98
    : Math.max(100, (modalBox.height || window.innerHeight) - topOffset - bottomOffset);

  const imgWidth = modalImg.naturalWidth || modalImg.clientWidth || 100;
  const imgHeight = modalImg.naturalHeight || modalImg.clientHeight || 100;

  const fitScale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

  if (modalImg.clientWidth) {
    scale = (imgWidth * fitScale) / modalImg.clientWidth;
  } else {
    scale = fitScale;
  }

  updateModalTransform();
  if (modalImg) {
    modalImg.style.cursor = 'default';
  }
}
window.zoomToFitScreen = zoomToFitScreen;

  if (modalImg) {
    // Double click to toggle quick zoom
    modalImg.addEventListener('dblclick', (e) => {
      e.preventDefault();
      toggleModalZoom(e);
    });
  }
}

// Open the preview modal with the specific image resource
function openPreviewModal(url, filename, sizeLabel) {
  initPreviewModal();
  const modal = document.getElementById('image-preview-modal');
  const modalImg = document.getElementById('modal-image-preview');

  if (!modal || !modalImg) return;

  modalPreviewUrl = url;
  window.modalPreviewUrl = url;
  window.originalModalPreviewUrl = url;
  modalPreviewFilename = filename;
  window.modalPreviewFilename = filename;
  modalPreviewSizeLabel = sizeLabel;

  modalImg.src = url;

  // Reset zoom & pan on open
  scale = 1;
  panX = 0;
  panY = 0;
  isDragging = false;
  if (modalImg) modalImg.style.cursor = 'default';
  updateModalTransform();

  modal.classList.remove('hidden');
  applySavedHideHudState();

  // Automatically trigger Edit Mode upon opening Preview Modal
  const autoEnterEdit = () => {
    if (typeof window.enterEditMode === 'function') {
      window.enterEditMode();
    } else if (typeof enterEditMode === 'function') {
      enterEditMode();
    }
  };

  if (modalImg.complete && modalImg.naturalWidth) {
    setTimeout(autoEnterEdit, 50);
  } else {
    modalImg.addEventListener('load', () => {
      setTimeout(autoEnterEdit, 50);
    }, { once: true });
  }
}

const MODAL_THEME_STORAGE_KEY = 'imageStudioTheme';

function applyModalTheme(theme) {
  const modal = document.getElementById('image-preview-modal');
  const themeBtn = document.getElementById('modal-theme-toggle-btn');
  const iconMask = themeBtn ? themeBtn.querySelector('.icon-mask') : null;
  const getSvgPath = (name) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
        return chrome.runtime.getURL(`svg/${name}`);
      }
    } catch (e) {}
    return `svg/${name}`;
  };

  const isStandalone = document.body && document.body.classList.contains('max-standalone-image-page');

  if (theme === 'light') {
    if (modal) modal.setAttribute('data-theme', 'light');
    if (isStandalone) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');
    }
    if (themeBtn) themeBtn.title = 'Switch to Dark Theme';
    if (iconMask) {
      const darkSvg = getSvgPath('dark-mode.svg');
      iconMask.style.maskImage = `url('${darkSvg}')`;
      iconMask.style.webkitMaskImage = `url('${darkSvg}')`;
    }
  } else {
    if (modal) modal.removeAttribute('data-theme');
    if (isStandalone) {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    if (themeBtn) themeBtn.title = 'Switch to Light Theme';
    if (iconMask) {
      const lightSvg = getSvgPath('light-mode.svg');
      iconMask.style.maskImage = `url('${lightSvg}')`;
      iconMask.style.webkitMaskImage = `url('${lightSvg}')`;
    }
  }
}
window.applyModalTheme = applyModalTheme;

function initModalThemeSync() {
  const themeBtn = document.getElementById('modal-theme-toggle-btn');

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ [MODAL_THEME_STORAGE_KEY]: 'dark' }, (data) => {
      applyModalTheme(data[MODAL_THEME_STORAGE_KEY]);
    });

    if (!window._hasModalThemeStorageListener) {
      window._hasModalThemeStorageListener = true;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[MODAL_THEME_STORAGE_KEY]) {
          applyModalTheme(changes[MODAL_THEME_STORAGE_KEY].newValue);
        }
      });
    }
  } else {
    try {
      const saved = localStorage.getItem(MODAL_THEME_STORAGE_KEY) || 'dark';
      applyModalTheme(saved);
    } catch (e) {}
  }

  if (themeBtn && !themeBtn.dataset.themeBound) {
    themeBtn.dataset.themeBound = 'true';
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = document.getElementById('image-preview-modal');
      const isLight = modal ? modal.getAttribute('data-theme') === 'light' : false;
      const nextTheme = isLight ? 'dark' : 'light';

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [MODAL_THEME_STORAGE_KEY]: nextTheme }, () => {
          applyModalTheme(nextTheme);
        });
      } else {
        try {
          localStorage.setItem(MODAL_THEME_STORAGE_KEY, nextTheme);
        } catch (err) {}
        applyModalTheme(nextTheme);
      }
    });
  }
}
window.initModalThemeSync = initModalThemeSync;

function toggleHideHud(forceState = null) {
  const modal = document.getElementById('image-preview-modal');
  if (!modal) return;

  if (typeof forceState === 'boolean') {
    modal.classList.toggle('hud-hidden', forceState);
  } else {
    modal.classList.toggle('hud-hidden');
  }

  const isHidden = modal.classList.contains('hud-hidden');
  const hideHudBtn = document.getElementById('modal-hide-hud-btn');
  if (hideHudBtn) {
    hideHudBtn.title = isHidden ? 'Show HUD (H)' : 'Toggle Hide HUD (H)';
  }

  try {
    localStorage.setItem('hideHudState', isHidden ? 'true' : 'false');
  } catch (e) {}

  if (typeof updateAppSettings === 'function') {
    updateAppSettings({ hideHudState: isHidden });
  } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ hideHudState: isHidden });
  }

  if (typeof updateModalTransform === 'function') {
    updateModalTransform();
  }
}
window.toggleHideHud = toggleHideHud;

function applySavedHideHudState() {
  let isHidden = false;
  try {
    isHidden = localStorage.getItem('hideHudState') === 'true';
  } catch (e) {}

  if (isHidden) {
    toggleHideHud(true);
  }

  if (typeof getAppSettings === 'function') {
    getAppSettings().then(settings => {
      if (settings && typeof settings.hideHudState === 'boolean') {
        toggleHideHud(settings.hideHudState);
      }
    });
  } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['hideHudState'], (res) => {
      if (res && typeof res.hideHudState === 'boolean') {
        toggleHideHud(res.hideHudState);
      }
    });
  }
}
window.applySavedHideHudState = applySavedHideHudState;

// Expose functions globally
window.initPreviewModal = initPreviewModal;
window.openPreviewModal = openPreviewModal;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPreviewModal();
  });
} else {
  initPreviewModal();
}
