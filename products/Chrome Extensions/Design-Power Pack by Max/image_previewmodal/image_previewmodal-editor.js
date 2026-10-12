// Preview Modal Image Editor Main Module (image_previewmodal-editor.js)

let isEditorInitialized = false;

function updateStrokePreview(size, color) {
  const previewPath = document.getElementById('stroke-preview-path');
  if (!previewPath) return;
  if (size !== undefined && size !== null) {
    const numSize = Number(size);
    if (!isNaN(numSize) && numSize > 0) {
      previewPath.setAttribute('stroke-width', Math.min(60, Math.max(1, numSize)));
    }
  }
  if (color) {
    previewPath.setAttribute('stroke', color);
  }
}
window.updateStrokePreview = updateStrokePreview;

function initImageEditorModule() {
  const editToolbar = document.getElementById('modal-edit-toolbar');
  if (!editToolbar) return;

  if (isEditorInitialized) return;
  isEditorInitialized = true;

  const cancelBtn = document.getElementById('edit-cancel-btn');
  const saveBtn = document.getElementById('edit-save-btn');
  const stopBrushBtn = document.getElementById('edit-stop-brush-btn');
  const idleModeBtn = document.getElementById('edit-idle-mode-btn');
  const undoBtn = document.getElementById('edit-undo-btn');
  const clearBtn = document.getElementById('edit-clear-btn');

  const brushToolBtn = document.getElementById('edit-brush-tool-btn');
  const brushPanel = document.getElementById('edit-brush-panel');
  const brushToolWrapper = document.querySelector('.edit-tool-popover-wrapper');
  const textToolBtn = document.getElementById('edit-text-tool-btn');

  const sizeSlider = document.getElementById('edit-size-slider');
  const sizeBadge = document.getElementById('edit-size-badge');
  const modeBtn = document.getElementById('edit-size-mode-btn');
  const colorInput = document.getElementById('edit-color-input');
  const opacitySlider = document.getElementById('edit-opacity-slider');
  const opacityBadge = document.getElementById('edit-opacity-badge');
  const lazyMouseBtn = document.getElementById('edit-lazy-mouse-btn');
  const swatchesGrid = document.getElementById('brush-color-swatches');

  // Auto-hide Brush Options Panel when mouse leaves panel or toolbar
  if (brushToolWrapper) {
    brushToolWrapper.addEventListener('mouseleave', (e) => {
      const related = e.relatedTarget;
      if (related && ((brushPanel && brushPanel.contains(related)) || (editToolbar && editToolbar.contains(related)))) return;
      if (brushPanel) brushPanel.classList.add('hidden');
    });
  }

  if (brushPanel) {
    brushPanel.addEventListener('mouseleave', (e) => {
      const related = e.relatedTarget;
      if (related && ((brushToolWrapper && brushToolWrapper.contains(related)) || (editToolbar && editToolbar.contains(related)))) return;
      brushPanel.classList.add('hidden');
    });
  }

  if (swatchesGrid && window.PRESET_COLORS) {
    swatchesGrid.innerHTML = PRESET_COLORS.map(hex => `
      <div class="color-swatch ${hex.toLowerCase() === brushColor.toLowerCase() ? 'active' : ''}" 
           style="background-color: ${hex};" 
           data-color="${hex}">
      </div>
    `).join('');

    swatchesGrid.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const hex = swatch.getAttribute('data-color');
        brushColor = hex;
        textColor = hex;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ brushColor: hex, textColor: hex, shapeStrokeColor: hex });
        }
        if (colorInput) colorInput.value = hex;
        swatchesGrid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        updateStrokePreview(brushSize, hex);
      });
    });
  }

  if (lazyMouseBtn) {
    lazyMouseBtn.addEventListener('click', () => {
      isLazyMouse = !isLazyMouse;
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ isLazyMouse: isLazyMouse });
      }
      if (isLazyMouse) {
        lazyMouseBtn.textContent = 'On';
        lazyMouseBtn.classList.add('active');
        if (window.showToast) window.showToast('Lazy Mouse Enabled (Smooth)');
      } else {
        lazyMouseBtn.textContent = 'Off';
        lazyMouseBtn.classList.remove('active');
        if (window.showToast) window.showToast('Lazy Mouse Disabled');
      }
    });
  }

  bindToolbarControls();
  syncEditorToolbarWithState();
}

function activateIdleMode() {
  if (selectedTextObj) selectedTextObj.isEditingText = false;
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  deselectAllObjects();
  setEditorMode('idle');
}
window.activateIdleMode = activateIdleMode;

let currentShapeType = 'rect'; // 'rect' | 'ellipse'
window.currentShapeType = currentShapeType;

let isDrawingShape = false;
let shapeStartX = 0;
let shapeStartY = 0;
let currentShapeObj = null;

function updateShapeToolBtnIcon(shapeType) {
  const shapeBtn = document.getElementById('edit-shape-tool-btn');
  if (!shapeBtn) return;
  const getSvgPath = (name) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
        return chrome.runtime.getURL(`svg/${name}`);
      }
    } catch (e) {}
    return `svg/${name}`;
  };
  let iconPath = getSvgPath('square.svg');
  if (shapeType === 'ellipse') {
    iconPath = getSvgPath('circle.svg');
  } else if (shapeType === 'polygonal') {
    iconPath = getSvgPath('polygonal.svg');
  }
  const maskSpan = shapeBtn.querySelector('.icon-mask');
  if (maskSpan) {
    maskSpan.style.maskImage = `url('${iconPath}')`;
    maskSpan.style.webkitMaskImage = `url('${iconPath}')`;
  }
  const img = shapeBtn.querySelector('.tool-icon-svg');
  if (img) {
    img.src = iconPath;
  }
}
window.updateShapeToolBtnIcon = updateShapeToolBtnIcon;

function activateShapeMode(showOptions = false) {
  if (window.isDrawingPolygonal) {
    if (typeof window.finishPolygonalDrawing === 'function') {
      window.finishPolygonalDrawing();
    }
  }
  if (selectedTextObj) selectedTextObj.isEditingText = false;
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  deselectAllObjects();
  setEditorMode('shape', showOptions);
}
window.activateShapeMode = activateShapeMode;

function activateBrushMode(showOptions = false) {
  if (selectedTextObj) selectedTextObj.isEditingText = false;
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  deselectAllObjects();
  setEditorMode('brush', showOptions);
}
window.activateBrushMode = activateBrushMode;

function activateTextMode() {
  if (selectedTextObj) selectedTextObj.isEditingText = false;
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  setEditorMode('text');
  createNewTextObject();
}
window.activateTextMode = activateTextMode;

function bindToolbarControls() {
  const editToolbar = document.getElementById('modal-edit-toolbar');
  const idleModeBtn = document.getElementById('edit-idle-mode-btn');
  const brushToolBtn = document.getElementById('edit-brush-tool-btn');
  const brushToolWrapper = brushToolBtn ? brushToolBtn.closest('.edit-tool-popover-wrapper') : null;
  const textToolBtn = document.getElementById('edit-text-tool-btn');
  const stopBrushBtn = document.getElementById('edit-stop-brush-btn');
  const cancelBtn = document.getElementById('edit-cancel-btn');
  const saveBtn = document.getElementById('edit-save-btn');
  const copyBtn = document.getElementById('edit-copy-btn');
  const colorInput = document.getElementById('edit-color-input');
  const sizeSlider = document.getElementById('edit-size-slider');
  const sizeBadge = document.getElementById('edit-size-badge');
  const modeBtn = document.getElementById('edit-size-mode-btn');
  const lazyMouseBtn = document.getElementById('edit-lazy-mouse-btn');
  const opacitySlider = document.getElementById('edit-opacity-slider');
  const opacityBadge = document.getElementById('edit-opacity-badge');
  const undoBtn = document.getElementById('edit-undo-btn');
  const redoBtn = document.getElementById('edit-redo-btn');
  const clearBtn = document.getElementById('edit-clear-btn');

  if (cancelBtn) cancelBtn.addEventListener('click', exitEditMode);
  if (saveBtn) saveBtn.addEventListener('click', saveEditChanges);
  if (copyBtn) copyBtn.addEventListener('click', copyEditedImage);

  if (idleModeBtn) {
    idleModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateIdleMode();
    });
  }

  if (brushToolBtn) {
    brushToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateBrushMode(true);
    });
  }

  if (textToolBtn) {
    textToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateTextMode();
    });
  }

  const shapeToolBtn = document.getElementById('edit-shape-tool-btn');
  const shapePanel = document.getElementById('edit-shape-panel');
  const shapeToolWrapper = shapeToolBtn ? shapeToolBtn.closest('.edit-tool-popover-wrapper') : null;

  if (shapeToolBtn) {
    shapeToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateShapeMode(true);
    });
  }

  if (shapeToolWrapper) {
    shapeToolWrapper.addEventListener('mouseleave', (e) => {
      const related = e.relatedTarget;
      if (related && ((shapePanel && shapePanel.contains(related)) || (editToolbar && editToolbar.contains(related)))) return;
      if (shapePanel) shapePanel.classList.add('hidden');
    });
  }

  if (shapePanel) {
    shapePanel.addEventListener('mouseleave', (e) => {
      const related = e.relatedTarget;
      if (related && ((shapeToolWrapper && shapeToolWrapper.contains(related)) || (editToolbar && editToolbar.contains(related)))) return;
      if (shapePanel) shapePanel.classList.add('hidden');
    });
  }

  const rectChip = document.getElementById('shape-type-rect-btn');
  const ellipseChip = document.getElementById('shape-type-ellipse-btn');
  const polygonalChip = document.getElementById('shape-type-polygonal-btn');

  if (rectChip) {
    rectChip.addEventListener('click', (e) => {
      e.stopPropagation();
      currentShapeType = 'rect';
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ currentShapeType: 'rect' });
      }
      if (rectChip) rectChip.classList.add('active');
      if (ellipseChip) ellipseChip.classList.remove('active');
      if (polygonalChip) polygonalChip.classList.remove('active');
      updateShapeToolBtnIcon('rect');
      activateShapeMode(true);
    });
  }
  if (ellipseChip) {
    ellipseChip.addEventListener('click', (e) => {
      e.stopPropagation();
      currentShapeType = 'ellipse';
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ currentShapeType: 'ellipse' });
      }
      if (ellipseChip) ellipseChip.classList.add('active');
      if (rectChip) rectChip.classList.remove('active');
      if (polygonalChip) polygonalChip.classList.remove('active');
      updateShapeToolBtnIcon('ellipse');
      activateShapeMode(true);
    });
  }
  if (polygonalChip) {
    polygonalChip.addEventListener('click', (e) => {
      e.stopPropagation();
      currentShapeType = 'polygonal';
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ currentShapeType: 'polygonal' });
      }
      if (polygonalChip) polygonalChip.classList.add('active');
      if (rectChip) rectChip.classList.remove('active');
      if (ellipseChip) ellipseChip.classList.remove('active');
      updateShapeToolBtnIcon('polygonal');
      activateShapeMode(true);
    });
  }

  if (stopBrushBtn) {
    stopBrushBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateIdleMode();
    });
  }

  if (undoBtn) undoBtn.addEventListener('click', undoLastStroke);
  if (redoBtn) redoBtn.addEventListener('click', redoNextStroke);

  if (clearBtn) clearBtn.addEventListener('click', clearCanvasStrokes);

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const val = Math.round(parseInt(e.target.value, 10));
      brushSize = val;
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ brushSize: val, shapeSize: val });
      }
      if (selectedBrushObj) {
        selectedBrushObj.size = val;
        selectedBrushObj.scale = 1;
        selectedBrushObj.strokeWidth = (typeof computeNaturalStrokeWidth === 'function')
          ? computeNaturalStrokeWidth(val, selectedBrushObj.sizeMode || brushSizeMode)
          : val;
      }
      if (sizeBadge) sizeBadge.textContent = `${val}px`;
      updateStrokePreview(val, brushColor);
      renderCompositeCanvas();
    });
  }

  if (modeBtn) {
    modeBtn.textContent = brushSizeMode === 'absolute' ? 'Fixed to Screen' : 'Fixed to Image';
    modeBtn.addEventListener('click', () => {
      toggleBrushSizeMode();
    });
  }

  if (colorInput) {
    colorInput.addEventListener('input', (e) => {
      brushColor = e.target.value;
      textColor = e.target.value;
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ brushColor: e.target.value, textColor: e.target.value, shapeStrokeColor: e.target.value });
      }
      updateStrokePreview(brushSize, brushColor);
    });
  }

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      brushOpacity = parseInt(e.target.value, 10) / 100;
      if (typeof saveEditorSettingsToStorage === 'function') {
        saveEditorSettingsToStorage({ brushOpacity: brushOpacity });
      }
      if (opacityBadge) opacityBadge.textContent = `${Math.round(brushOpacity * 100)}%`;
    });
  }

function toggleBrushSizeMode() {
  markSessionDirty();
  if (selectedBrushObj) {
    const currentMode = selectedBrushObj.sizeMode || brushSizeMode;
    const newMode = currentMode === 'absolute' ? 'relative' : 'absolute';
    selectedBrushObj.sizeMode = newMode;
    selectedBrushObj.strokeWidth = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(selectedBrushObj.size || brushSize, newMode)
      : (selectedBrushObj.size || brushSize);
  } else {
    brushSizeMode = brushSizeMode === 'absolute' ? 'relative' : 'absolute';
  }

  const activeMode = selectedBrushObj ? (selectedBrushObj.sizeMode || brushSizeMode) : brushSizeMode;
  const rawSize = selectedBrushObj ? ((selectedBrushObj.size || brushSize) * (selectedBrushObj.scale || 1)) : brushSize;
  const curSize = Number(rawSize.toFixed(1));

  if (typeof saveEditorSettingsToStorage === 'function') {
    saveEditorSettingsToStorage({ brushSizeMode: activeMode, shapeSizeMode: activeMode });
  }

  const sizeSlider = document.getElementById('edit-size-slider');
  const sizeBadge = document.getElementById('edit-size-badge');
  const modeBtn = document.getElementById('edit-size-mode-btn');

  if (sizeSlider) sizeSlider.value = curSize;
  if (sizeBadge) sizeBadge.textContent = `${curSize}px`;
  if (modeBtn) modeBtn.textContent = activeMode === 'absolute' ? 'Fixed to Screen' : 'Fixed to Image';

  renderCompositeCanvas();
}
window.toggleBrushSizeMode = toggleBrushSizeMode;

function syncEditorToolbarWithState() {
  const sizeSlider = document.getElementById('edit-size-slider');
  const sizeBadge = document.getElementById('edit-size-badge');
  const modeBtn = document.getElementById('edit-size-mode-btn');
  const colorInput = document.getElementById('edit-color-input');
  const opacitySlider = document.getElementById('edit-opacity-slider');
  const opacityBadge = document.getElementById('edit-opacity-badge');
  const lazyMouseBtn = document.getElementById('edit-lazy-mouse-btn');
  const swatchesGrid = document.getElementById('brush-color-swatches');

  if (sizeSlider) sizeSlider.value = brushSize;
  if (sizeBadge) sizeBadge.textContent = `${brushSize}px`;
  if (modeBtn) modeBtn.textContent = brushSizeMode === 'absolute' ? 'Fixed to Screen' : 'Fixed to Image';
  if (colorInput) colorInput.value = brushColor;
  if (opacitySlider) opacitySlider.value = Math.round(brushOpacity * 100);
  if (opacityBadge) opacityBadge.textContent = `${Math.round(brushOpacity * 100)}%`;

  if (lazyMouseBtn) {
    lazyMouseBtn.textContent = isLazyMouse ? 'On' : 'Off';
    lazyMouseBtn.classList.toggle('active', isLazyMouse);
  }

  if (swatchesGrid) {
    swatchesGrid.querySelectorAll('.color-swatch').forEach(swatch => {
      const hex = swatch.getAttribute('data-color');
      swatch.classList.toggle('active', hex && hex.toLowerCase() === brushColor.toLowerCase());
    });
  }

  const rectChip = document.getElementById('shape-type-rect-btn');
  const ellipseChip = document.getElementById('shape-type-ellipse-btn');
  const polygonalChip = document.getElementById('shape-type-polygonal-btn');
  const curShape = currentShapeType || 'rect';

  if (rectChip) rectChip.classList.toggle('active', curShape === 'rect');
  if (ellipseChip) ellipseChip.classList.toggle('active', curShape === 'ellipse');
  if (polygonalChip) polygonalChip.classList.toggle('active', curShape === 'polygonal');

  if (typeof updateShapeToolBtnIcon === 'function') {
    updateShapeToolBtnIcon(curShape);
  }
  if (typeof updateStrokePreview === 'function') {
    updateStrokePreview(brushSize, brushColor);
  }
}
window.syncEditorToolbarWithState = syncEditorToolbarWithState;

  // Window Resize Sync Listener
  window.addEventListener('resize', () => {
    if (isEditMode) {
      syncCanvasOverlayPosition();
      renderCompositeCanvas();
    }
  });

  // Global Keydown Handler delegated to image_previewmodal-editor-shortcuts.js
  if (typeof initEditorShortcutsModule === 'function') {
    initEditorShortcutsModule();
  }

  createBrushCursorRing();
}
window.initImageEditorModule = initImageEditorModule;

function bindModalEditBtn() {
  const editBtn = document.getElementById('modal-edit-btn');
  if (editBtn && !editBtn.dataset.editorBound) {
    editBtn.dataset.editorBound = 'true';
    editBtn.addEventListener('click', enterEditMode);
  }
}
window.bindModalEditBtn = bindModalEditBtn;

function enterEditMode() {
  initImageEditorModule();

  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg || !modalImg.src) {
    if (window.showToast) window.showToast('No image available to edit');
    return;
  }

  if (!window.originalModalPreviewUrl) {
    window.originalModalPreviewUrl = modalImg.src;
  }

  const container = modalImg.parentNode;
  if (!container) return;

  if (!editCanvas) {
    editCanvas = document.createElement('canvas');
    editCanvas.id = 'image-previewmodal-editcanvas';
    editCanvas.style.position = 'absolute';
    editCanvas.style.top = '0';
    editCanvas.style.left = '0';
    editCanvas.style.zIndex = '999';
    editCanvas.style.touchAction = 'none';

    container.appendChild(editCanvas);

    editCtx = editCanvas.getContext('2d');

    // Create Offscreen Brush Canvas
    brushCanvas = document.createElement('canvas');
    brushCtx = brushCanvas.getContext('2d');

    editCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    editCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    editCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    editCanvas.addEventListener('dblclick', handleCanvasDblClick);
    editCanvas.addEventListener('contextmenu', (e) => {
      if (window.isDrawingPolygonal) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.finishPolygonalDrawing === 'function') {
          window.finishPolygonalDrawing();
        }
      }
    });
  }

  // Calculate resolution from image natural dimensions
  const naturalW = modalImg.naturalWidth || 1200;
  const naturalH = modalImg.naturalHeight || 800;

  editCanvas.width = naturalW;
  editCanvas.height = naturalH;

  brushCanvas.width = naturalW;
  brushCanvas.height = naturalH;

  isEditMode = true;
  createBrushCursorRing();
  setEditorMode('idle');
  syncCanvasOverlayPosition();

  // Show Editor Controls Bar
  const editorToolbar = document.getElementById('modal-edit-toolbar');
  if (editorToolbar) editorToolbar.classList.remove('hidden');

  editorObjects = [];
  undoStack = [];
  redoStack = [];
  selectedTextObj = null;
  selectedBrushObj = null;
  saveUndoState();

  renderCompositeCanvas();
}
window.enterEditMode = enterEditMode;

function exitEditMode() {
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  isEditMode = false;
  const editorToolbar = document.getElementById('modal-edit-toolbar');
  if (editorToolbar) editorToolbar.classList.add('hidden');

  const brushPanel = document.getElementById('edit-brush-panel');
  if (brushPanel) brushPanel.classList.add('hidden');

  selectedTextObj = null;
  selectedBrushObj = null;
  closeVectorColorPopover();
  const svg = document.getElementById('edit-ui-vector-overlay');
  if (svg) svg.style.display = 'none';

  hideBrushCursor();
}
window.exitEditMode = exitEditMode;

function setEditorMode(mode, showOptions = false) {
  if (window.isDrawingPolygonal) {
    if (typeof window.finishPolygonalDrawing === 'function') {
      window.finishPolygonalDrawing();
    }
  }
  if (selectedTextObj) {
    selectedTextObj.isEditingText = false;
  }
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();
  editorMode = mode;
  const brushToolBtn = document.getElementById('edit-brush-tool-btn');
  const idleModeBtn = document.getElementById('edit-idle-mode-btn');
  const textToolBtn = document.getElementById('edit-text-tool-btn');
  const shapeToolBtn = document.getElementById('edit-shape-tool-btn');
  const stopBrushBtn = document.getElementById('edit-stop-brush-btn');
  const brushPanel = document.getElementById('edit-brush-panel');
  const shapePanel = document.getElementById('edit-shape-panel');

  if (idleModeBtn) idleModeBtn.classList.remove('active');
  if (brushToolBtn) brushToolBtn.classList.remove('active');
  if (textToolBtn) textToolBtn.classList.remove('active');
  if (shapeToolBtn) shapeToolBtn.classList.remove('active');

  if (mode === 'brush') {
    createBrushCursorRing();
    deselectAllObjects();
    if (brushToolBtn) brushToolBtn.classList.add('active');
    if (showOptions && typeof window.openVectorColorPopover === 'function') {
      window.openVectorColorPopover('brushTool');
    } else if (typeof window.scheduleCloseVectorColorPopover === 'function') {
      window.scheduleCloseVectorColorPopover(0);
    }
    if (shapePanel) shapePanel.classList.add('hidden');
    if (stopBrushBtn) stopBrushBtn.classList.remove('hidden');
    if (editCanvas) editCanvas.style.cursor = 'none';
  } else if (mode === 'shape') {
    deselectAllObjects();
    if (shapeToolBtn) shapeToolBtn.classList.add('active');
    if (showOptions && shapePanel) {
      shapePanel.classList.remove('hidden');
    } else if (shapePanel) {
      shapePanel.classList.add('hidden');
    }
    if (typeof window.scheduleCloseVectorColorPopover === 'function') {
      window.scheduleCloseVectorColorPopover(0);
    }
    if (brushPanel) brushPanel.classList.add('hidden');
    if (stopBrushBtn) stopBrushBtn.classList.remove('hidden');
    if (editCanvas) editCanvas.style.cursor = 'crosshair';
    hideBrushCursor();
  } else if (mode === 'text') {
    if (textToolBtn) textToolBtn.classList.add('active');
    if (brushPanel) brushPanel.classList.add('hidden');
    if (stopBrushBtn) stopBrushBtn.classList.add('hidden');
    if (editCanvas) editCanvas.style.cursor = 'default';
    hideBrushCursor();
  } else {
    // Default mode === 'idle'
    if (idleModeBtn) idleModeBtn.classList.add('active');
    if (brushPanel) brushPanel.classList.add('hidden');
    if (stopBrushBtn) stopBrushBtn.classList.add('hidden');
    if (editCanvas) editCanvas.style.cursor = 'default';
    hideBrushCursor();
  }
}
window.setEditorMode = setEditorMode;

// updateShapeToolBtnIcon defined above

// Canvas Mouse & Touch Interaction Handlers delegated to image_previewmodal-editor-interaction.js

// Custom Brush Cursor Ring Implementation
let brushCursorRing = null;
function createBrushCursorRing() {
  if (brushCursorRing) {
    brushCursorRing.style.display = (isEditMode && editorMode === 'brush') ? 'block' : 'none';
    return;
  }
  brushCursorRing = document.createElement('div');
  brushCursorRing.id = 'edit-brush-cursor-ring';
  brushCursorRing.style.position = 'fixed';
  brushCursorRing.style.pointerEvents = 'none';
  brushCursorRing.style.borderRadius = '50%';
  brushCursorRing.style.border = '1.5px solid #ffffff';
  brushCursorRing.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.6)';
  brushCursorRing.style.transform = 'translate(-50%, -50%)';
  brushCursorRing.style.zIndex = '999999';
  brushCursorRing.style.display = 'none';

  const modal = document.getElementById('image-preview-modal') || document.body;
  modal.appendChild(brushCursorRing);

  window.addEventListener('mousemove', updateBrushCursorPosition, true);
  window.addEventListener('pointermove', updateBrushCursorPosition, true);
}

function updateBrushCursorPosition(e = null) {
  if (!brushCursorRing) createBrushCursorRing();
  if (!brushCursorRing) return;

  if (!isEditMode || editorMode !== 'brush') {
    brushCursorRing.style.display = 'none';
    return;
  }

  const screenDiameter = (typeof getBrushCursorScreenDiameter === 'function')
    ? getBrushCursorScreenDiameter(brushSize, brushSizeMode)
    : Math.max(4, brushSize);

  brushCursorRing.style.display = 'block';
  if (e && typeof e.clientX === 'number') {
    brushCursorRing.style.left = `${e.clientX}px`;
    brushCursorRing.style.top = `${e.clientY}px`;
  }
  brushCursorRing.style.width = `${screenDiameter}px`;
  brushCursorRing.style.height = `${screenDiameter}px`;
  brushCursorRing.style.borderColor = brushColor === '#ffffff' ? '#000000' : '#ffffff';
}
window.updateBrushCursorPosition = updateBrushCursorPosition;

function hideBrushCursor() {
  if (brushCursorRing) brushCursorRing.style.display = 'none';
}

// Save & Export Operations delegated to image_previewmodal-editor-export.js

// Auto-run initImageEditorModule on script load / DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageEditorModule);
} else {
  initImageEditorModule();
}
