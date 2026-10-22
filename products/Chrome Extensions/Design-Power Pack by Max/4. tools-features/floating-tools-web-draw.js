/**
 * floating-tools-web-draw.js — Design-Power Pack by Max
 * Web Draw Mode Bridge: Leverages 100% of Image Studio's existing engine, UI, overlays, and controls
 */

(function () {
  'use strict';

  if (window !== window.top) return;
  if (window.__maxWebDrawBridgeInitialized) return;
  window.__maxWebDrawBridgeInitialized = true;

  window.isWebDrawMode = false;
  window.isDrawingsHidden = false;

  let scrollTicking = false;

  function isExtensionAlive() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function getIconUrl(name) {
    try {
      if (isExtensionAlive() && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(`svg/${name}`);
      }
    } catch (e) {}
    return `svg/${name}`;
  }

  function ensureModalMounted() {
    let modal = document.getElementById('image-preview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-preview-modal';
      modal.className = 'modal hidden';
      if (typeof window.createImageStudioModalHtml === 'function') {
        modal.innerHTML = window.createImageStudioModalHtml();
      }
      (document.body || document.documentElement).appendChild(modal);
      if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
        window.i18n.applyTranslations(modal);
      }
    }
    return modal;
  }

  function isPointerOverUI(clientX, clientY, target) {
    if (target && target.closest) {
      if (target.closest('#modal-edit-toolbar, #vector-color-popover, #vector-size-popover, #vector-toolbar-capsule, #vector-rotate-handle, #vector-scale-handle, .edit-brush-panel, .vector-popover, .edit-tool-popover-wrapper, .discard-dialog-box')) {
        return true;
      }
    }

    const toolbar = document.getElementById('modal-edit-toolbar');
    const colorPop = document.getElementById('vector-color-popover');
    const sizePop = document.getElementById('vector-size-popover');
    const brushPanel = document.getElementById('edit-brush-panel');
    const shapePanel = document.getElementById('edit-shape-panel');
    const capsule = document.getElementById('vector-toolbar-capsule');
    const rotateHandle = document.getElementById('vector-rotate-handle');
    const scaleHandle = document.getElementById('vector-scale-handle');

    const elements = [toolbar, colorPop, sizePop, brushPanel, shapePanel, capsule, rotateHandle, scaleHandle];
    for (const el of elements) {
      if (!el || el.classList?.contains('hidden') || el.style?.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 &&
          clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return true;
      }
    }
    return false;
  }

  function updateToggleDrawingsBtnUI() {
    const toggleBtn = document.getElementById('edit-toggle-drawings-btn');
    if (!toggleBtn) return;
    const iconSpan = toggleBtn.querySelector('.icon-mask');
    const textSpan = toggleBtn.querySelector('.toggle-drawings-text');
    if (window.isDrawingsHidden) {
      if (iconSpan) {
        const eyeSvg = getIconUrl('eye.svg');
        iconSpan.style.maskImage = `url('${eyeSvg}')`;
        iconSpan.style.webkitMaskImage = `url('${eyeSvg}')`;
      }
      const text = window.i18n ? window.i18n.t('editor.showDrawingsHtml', 'Show<br>Drawings') : 'Show<br>Drawings';
      const title = window.i18n ? window.i18n.t('editor.showDrawings', 'Show Drawings') : 'Show Drawings';
      if (textSpan) textSpan.innerHTML = text;
      toggleBtn.title = title;
    } else {
      if (iconSpan) {
        const hideSvg = getIconUrl('hide.svg');
        iconSpan.style.maskImage = `url('${hideSvg}')`;
        iconSpan.style.webkitMaskImage = `url('${hideSvg}')`;
      }
      const text = window.i18n ? window.i18n.t('editor.hideDrawingsHtml', 'Hide<br>Drawings') : 'Hide<br>Drawings';
      const title = window.i18n ? window.i18n.t('editor.hideDrawings', 'Hide Drawings') : 'Hide Drawings';
      if (textSpan) textSpan.innerHTML = text;
      toggleBtn.title = title;
    }
  }

  function onWindowScroll() {
    if (!window.isWebDrawMode) return;
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        if (typeof renderCompositeCanvas === 'function') {
          renderCompositeCanvas();
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  let resizeTicking = false;
  function onWindowResize() {
    if (!window.isWebDrawMode) return;
    if (!resizeTicking) {
      window.requestAnimationFrame(() => {
        handleWebDrawResize();
        resizeTicking = false;
      });
      resizeTicking = true;
    }
  }

  function handleWebDrawResize() {
    if (!window.isWebDrawMode || !window.editCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const oldDpr = window.__webDrawDpr || dpr;

    // Rescale vector coordinates if DPR changed (e.g. browser zoom or moved across monitors)
    if (oldDpr !== dpr && oldDpr > 0) {
      const ratio = dpr / oldDpr;
      if (Array.isArray(window.editorObjects)) {
        window.editorObjects.forEach(obj => {
          if (typeof obj.x === 'number') obj.x *= ratio;
          if (typeof obj.y === 'number') obj.y *= ratio;
          if (typeof obj.width === 'number') obj.width *= ratio;
          if (typeof obj.height === 'number') obj.height *= ratio;
          if (typeof obj.strokeWidth === 'number') obj.strokeWidth *= ratio;
          if (typeof obj.fontSize === 'number') obj.fontSize *= ratio;
          if (typeof obj.anchorContentLeft === 'number') obj.anchorContentLeft *= ratio;
          if (Array.isArray(obj.points)) {
            obj.points.forEach(p => {
              if (typeof p.x === 'number') p.x *= ratio;
              if (typeof p.y === 'number') p.y *= ratio;
            });
          }
        });
      }
    }
    window.__webDrawDpr = dpr;

    // Content-Left Anchor Shift for Centered Layouts
    const currentContentLeftCss = (typeof window.getMainContentLeft === 'function') ? window.getMainContentLeft() : 0;
    const currentContentLeftCanvas = currentContentLeftCss * dpr;

    if (Array.isArray(window.editorObjects)) {
      window.editorObjects.forEach(obj => {
        if (typeof obj.anchorContentLeft === 'number') {
          const delta = currentContentLeftCanvas - obj.anchorContentLeft;
          if (Math.abs(delta) > 0.5) {
            obj.x += delta;
            obj.anchorContentLeft = currentContentLeftCanvas;
          }
        } else if (currentContentLeftCanvas > 0) {
          obj.anchorContentLeft = currentContentLeftCanvas;
        }
      });
    }

    const newW = Math.round(window.innerWidth * dpr);
    const newH = Math.round(window.innerHeight * dpr);

    if (window.editCanvas.width !== newW || window.editCanvas.height !== newH) {
      window.editCanvas.width = newW;
      window.editCanvas.height = newH;
    }

    if (window.brushCanvas) {
      window.brushCanvas.width = newW;
      window.brushCanvas.height = newH;
    }

    const modalImg = document.getElementById('modal-image-preview');
    if (modalImg && modalImg.classList.contains('web-draw-mode')) {
      const transparentSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${newW}" height="${newH}"></svg>`;
      if (modalImg.src !== transparentSvg) {
        modalImg.src = transparentSvg;
      }
    }

    if (typeof syncCanvasOverlayPosition === 'function') {
      syncCanvasOverlayPosition();
    }

    if (typeof renderCompositeCanvas === 'function') {
      renderCompositeCanvas();
    }
  }
  window.handleWebDrawResize = handleWebDrawResize;

  function onWindowMouseDown(e) {
    if (!window.isWebDrawMode || !window.editCanvas) return;
    if (isPointerOverUI(e.clientX, e.clientY, e.target)) {
      window.editCanvas.style.pointerEvents = 'none';
    }
  }

  function onWindowMouseMove(e) {
    if (!window.isWebDrawMode || !window.editCanvas) return;

    // 1. UI Priority Guard: Over Toolbar, Popovers, Panels -> disable canvas pointer events
    if (isPointerOverUI(e.clientX, e.clientY, e.target)) {
      window.editCanvas.style.pointerEvents = 'none';
      return;
    }

    // 2. Select (A) Dual Mode
    if (window.editorMode === 'idle') {
      if (window.isDrawingsHidden) {
        window.editCanvas.style.pointerEvents = 'none';
        window.editCanvas.style.cursor = 'default';
        return;
      }

      // If actively dragging, rotating, or scaling, keep active
      if (window.isDraggingText || window.isRotatingText || window.isScalingText) {
        window.editCanvas.style.pointerEvents = 'auto';
        return;
      }

      const pos = (typeof getCanvasCoordinates === 'function')
        ? getCanvasCoordinates(e)
        : { x: e.clientX, y: e.clientY };

      const hitObj = (typeof findVectorObjectAtCanvas === 'function')
        ? findVectorObjectAtCanvas(pos)
        : null;

      let hitHandle = false;
      const selectedObj = (typeof getSelectedObject === 'function')
        ? getSelectedObject()
        : (window.selectedTextObj || window.selectedBrushObj);

      if (selectedObj) {
        const scaleRatio = (typeof getScreenScaleRatio === 'function') ? getScreenScaleRatio() : 1;
        const hitRadius = 24 * scaleRatio;
        const bounds = selectedObj.type === 'brush'
          ? getBrushObjectBounds(selectedObj)
          : (selectedObj.type === 'shape' ? getShapeObjectBounds(selectedObj) : getTextObjectBounds(selectedObj));
        const local = (typeof worldToLocal === 'function')
          ? worldToLocal(pos, selectedObj)
          : { lx: 0, ly: 0 };

        const distRotate = Math.hypot(local.lx - bounds.halfW, local.ly - (-bounds.halfH));
        const distScale = Math.hypot(local.lx - bounds.halfW, local.ly - bounds.halfH);
        if (distRotate <= hitRadius || distScale <= hitRadius) {
          hitHandle = true;
        }
      }

      if (hitObj || hitHandle || (selectedObj && selectedObj.type === 'text' && selectedObj.isEditingText)) {
        window.editCanvas.style.pointerEvents = 'auto';
        window.editCanvas.style.cursor = (selectedObj && selectedObj.isEditingText) ? 'text' : 'move';
      } else {
        window.editCanvas.style.pointerEvents = 'none';
        window.editCanvas.style.cursor = 'default';
      }
      return;
    }

    // 3. Drawing modes (brush, shape, text): Canvas is active
    if (['brush', 'shape', 'text'].includes(window.editorMode)) {
      window.editCanvas.style.pointerEvents = 'auto';
      if (window.editorMode === 'text') {
        window.editCanvas.style.cursor = 'text';
      }
    }
  }

  function bindWebDrawToolbarEvents() {
    const toggleBtn = document.getElementById('edit-toggle-drawings-btn');
    if (toggleBtn && !toggleBtn.__webDrawBound) {
      toggleBtn.__webDrawBound = true;
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.isDrawingsHidden = !window.isDrawingsHidden;
        if (window.isDrawingsHidden) {
          if (typeof deselectAllObjects === 'function') deselectAllObjects();
          if (window.editCanvas) {
            window.editCanvas.style.pointerEvents = 'none';
            window.editCanvas.style.cursor = 'default';
          }
          const svg = document.getElementById('edit-ui-vector-overlay');
          if (svg) svg.style.display = 'none';
          if (typeof closeVectorColorPopover === 'function') closeVectorColorPopover();
        }
        updateToggleDrawingsBtnUI();
        if (typeof renderCompositeCanvas === 'function') renderCompositeCanvas();
      });
    }

    const closeBtn = document.getElementById('edit-close-modal-btn');
    if (closeBtn && !closeBtn.__webDrawBound) {
      closeBtn.__webDrawBound = true;
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.requestClosePreviewModal === 'function') {
          window.requestClosePreviewModal();
        } else {
          stopWebDraw();
        }
      });
    }

    // Auto-unhide drawings when switching to drawing tools
    const toolBtns = document.querySelectorAll('#edit-brush-tool-btn, #edit-shape-tool-btn, #edit-text-tool-btn, .shape-type-btn');
    toolBtns.forEach(b => {
      if (!b.__webDrawUnhideBound) {
        b.__webDrawUnhideBound = true;
        b.addEventListener('click', () => {
          if (window.isDrawingsHidden) {
            window.isDrawingsHidden = false;
            updateToggleDrawingsBtnUI();
            if (typeof renderCompositeCanvas === 'function') renderCompositeCanvas();
          }
        });
      }
    });
  }

  function startWebDraw() {
    if (window.isWebDrawMode) return;
    const modal = ensureModalMounted();

    if (typeof initPreviewModal === 'function') initPreviewModal();
    if (typeof initImageEditorModule === 'function') initImageEditorModule();

    window.isWebDrawMode = true;
    window.isDrawingsHidden = false;

    modal.classList.remove('hud-hidden');
    modal.classList.add('web-draw-mode');
    modal.classList.remove('hidden');

    const toolbar = document.getElementById('modal-edit-toolbar');
    if (toolbar) {
      toolbar.classList.add('web-draw-mode');
      toolbar.classList.remove('hidden');
    }

    const modalImg = document.getElementById('modal-image-preview');
    if (modalImg) {
      modalImg.classList.add('web-draw-mode');
    }

    // Viewport resolution SVG data URL
    const dpr = window.devicePixelRatio || 1;
    window.__webDrawDpr = dpr;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    const transparentSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`;

    if (typeof openPreviewModal === 'function') {
      openPreviewModal(transparentSvg, 'webpage_draw.png', 'Viewport');
    }

    const checkAndSetup = () => {
      modal.classList.remove('hud-hidden');
      if (!window.editCanvas) {
        if (typeof enterEditMode === 'function') enterEditMode();
        setTimeout(checkAndSetup, 50);
        return;
      }

      window.editCanvas.classList.add('web-draw-mode');

      const svg = document.getElementById('edit-ui-vector-overlay');
      if (svg) svg.classList.add('web-draw-mode');

      if (typeof activateIdleMode === 'function') {
        activateIdleMode();
      }

      if (typeof syncCanvasOverlayPosition === 'function') {
        syncCanvasOverlayPosition();
      }

      if (typeof renderCompositeCanvas === 'function') {
        renderCompositeCanvas();
      }

      bindWebDrawToolbarEvents();
      updateToggleDrawingsBtnUI();

      window.addEventListener('scroll', onWindowScroll, { passive: true });
      window.addEventListener('resize', onWindowResize);
      window.addEventListener('mousemove', onWindowMouseMove, true);
      window.addEventListener('mousedown', onWindowMouseDown, true);
    };

    setTimeout(checkAndSetup, 60);
  }

  function stopWebDraw() {
    if (!window.isWebDrawMode) return;
    window.isWebDrawMode = false;
    window.isDrawingsHidden = false;

    window.removeEventListener('scroll', onWindowScroll, { passive: true });
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('mousemove', onWindowMouseMove, true);
    window.removeEventListener('mousedown', onWindowMouseDown, true);

    const modal = document.getElementById('image-preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('web-draw-mode');
    }

    const toolbar = document.getElementById('modal-edit-toolbar');
    if (toolbar) {
      toolbar.classList.add('hidden');
      toolbar.classList.remove('web-draw-mode');
    }

    const modalImg = document.getElementById('modal-image-preview');
    if (modalImg) {
      modalImg.classList.remove('web-draw-mode');
    }

    if (window.editCanvas) {
      window.editCanvas.classList.remove('web-draw-mode');
      window.editCanvas.style.pointerEvents = 'none';
    }

    const svg = document.getElementById('edit-ui-vector-overlay');
    if (svg) {
      svg.classList.remove('web-draw-mode');
      svg.style.display = 'none';
    }

    if (typeof exitEditMode === 'function') {
      exitEditMode();
    }
  }

  function toggleWebDraw() {
    if (window.isWebDrawMode) {
      stopWebDraw();
    } else {
      startWebDraw();
    }
  }

  window.__maxWebDraw = {
    start: startWebDraw,
    stop: stopWebDraw,
    toggle: toggleWebDraw,
    isActive: () => Boolean(window.isWebDrawMode)
  };
})();
