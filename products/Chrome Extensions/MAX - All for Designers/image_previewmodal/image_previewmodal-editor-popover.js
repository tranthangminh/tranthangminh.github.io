// Preview Modal Image Editor - Unified Popover Module (image_previewmodal-editor-popover.js)

let popoverTargetMode = 'brushTool'; // 'brushTool' | 'strokeColor' | 'textColor' | 'bgColor' | 'size'
Object.defineProperty(window, 'popoverTargetMode', {
  get: () => popoverTargetMode,
  set: (v) => { popoverTargetMode = v; },
  configurable: true
});

function openVectorColorPopover(mode = 'brushTool') {
  popoverTargetMode = mode;

  let popover = document.getElementById('vector-color-popover');
  const modal = document.getElementById('image-preview-modal') || document.body;

  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'vector-color-popover';
    popover.className = 'vector-popover hidden';
    popover.innerHTML = `
      <div class="vector-popover-header">
        <span id="vector-popover-title" class="vector-popover-title">BRUSH SETTINGS</span>
        <div class="vector-popover-header-actions">
          <div id="vector-popover-trans-btn" class="color-swatch transparent-swatch" title="Set Transparent" data-color="transparent"></div>
          <div class="vector-popover-custom-wrap" title="Custom Color Picker">
            <input type="color" id="vector-popover-custom-color" class="vector-popover-custom-input">
          </div>
        </div>
      </div>

      <!-- Color Swatches Section -->
      <div id="vector-popover-color-section" class="vector-popover-section">
        <div id="vector-popover-swatches" class="vector-popover-swatches"></div>
      </div>

      <!-- Size & Preview Section -->
      <div id="vector-popover-size-section" class="vector-popover-section">
        <div class="vector-popover-section-header">
          <span class="vector-popover-label">Size</span>
          <span id="vector-popover-size-badge" class="badge vector-popover-badge">15px</span>
        </div>
        <div class="stroke-preview-container">
          <svg class="stroke-preview-svg" viewBox="0 0 200 30">
            <path id="stroke-preview-path" d="M 10 15 Q 50 5, 100 15 T 190 15" fill="none" stroke="#67e8f9" stroke-width="15" stroke-linecap="round" />
          </svg>
        </div>
        <input type="range" id="vector-popover-size-slider" min="1" max="100" value="15" class="input-range vector-popover-slider">
        <div id="vector-popover-size-presets" class="vector-popover-presets">
          <button class="chip size-preset-chip" data-size="5">5px</button>
          <button class="chip size-preset-chip" data-size="10">10px</button>
          <button class="chip size-preset-chip" data-size="15">15px</button>
          <button class="chip size-preset-chip" data-size="25">25px</button>
          <button class="chip size-preset-chip" data-size="40">40px</button>
        </div>
      </div>

      <!-- Polygon Sides Section -->
      <div id="vector-popover-sides-section" class="vector-popover-section hidden">
        <div class="vector-popover-section-header">
          <span class="vector-popover-label">Polygon Sides</span>
          <span id="vector-popover-sides-badge" class="badge vector-popover-badge">4s</span>
        </div>
        <input type="range" id="vector-popover-sides-slider" min="3" max="12" value="4" class="input-range vector-popover-slider">
        <div id="vector-popover-sides-presets" class="vector-popover-presets">
          <button class="chip sides-preset-chip size-preset-chip" data-sides="3">3s</button>
          <button class="chip sides-preset-chip size-preset-chip" data-sides="4">4s</button>
          <button class="chip sides-preset-chip size-preset-chip" data-sides="5">5s</button>
          <button class="chip sides-preset-chip size-preset-chip" data-sides="6">6s</button>
          <button class="chip sides-preset-chip size-preset-chip" data-sides="8">8s</button>
        </div>
      </div>

      <!-- Toggles Section: Size Mode & Lazy Mouse -->
      <div id="vector-popover-toggles-section" class="vector-popover-section">
        <div class="vector-popover-toggles-row">
          <div class="vector-popover-toggle-col">
            <span class="vector-popover-label-sm">Size Mode</span>
            <button id="vector-popover-size-mode-btn" class="btn btn-secondary vector-popover-toggle-btn active" title="Toggle Size Mode">Fixed to Screen</button>
          </div>
          <div class="vector-popover-toggle-col">
            <span class="vector-popover-label-sm">Lazy Mouse</span>
            <button id="vector-popover-lazy-mouse-btn" class="btn btn-secondary vector-popover-toggle-btn" title="Toggle Smooth Lazy Mouse">Off</button>
          </div>
        </div>
      </div>

      <!-- Opacity Section -->
      <div id="vector-popover-opacity-section" class="vector-popover-section">
        <div class="vector-popover-opacity-header">
          <span class="vector-popover-label">Opacity</span>
          <span id="vector-popover-opacity-badge" class="badge vector-popover-badge">100%</span>
        </div>
        <input type="range" id="vector-popover-opacity-slider" min="0" max="100" value="100" class="input-range vector-popover-slider">
      </div>

      <!-- Footer Actions -->
      <div class="vector-popover-footer">
        <button id="vector-popover-ok-btn" class="btn btn-primary vector-popover-ok-btn" title="Done">OK</button>
      </div>
    `;
    modal.appendChild(popover);

    // Event listeners
    const customColorInput = popover.querySelector('#vector-popover-custom-color');
    const opacitySlider = popover.querySelector('#vector-popover-opacity-slider');
    const sizeSlider = popover.querySelector('#vector-popover-size-slider');
    const sizeModeBtn = popover.querySelector('#vector-popover-size-mode-btn');
    const lazyMouseBtn = popover.querySelector('#vector-popover-lazy-mouse-btn');
    const okBtn = popover.querySelector('#vector-popover-ok-btn');
    const transBtn = popover.querySelector('#vector-popover-trans-btn');

    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        applyPopoverColor(e.target.value);
      });
    }

    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) / 100;
        applyPopoverOpacity(val);
      });
    }

    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        applyPopoverSize(val);
      });
    }

    if (sizeModeBtn) {
      sizeModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.toggleBrushSizeMode === 'function') {
          window.toggleBrushSizeMode();
        } else {
          brushSizeMode = brushSizeMode === 'absolute' ? 'relative' : 'absolute';
        }
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ brushSizeMode: brushSizeMode, shapeSizeMode: brushSizeMode });
        }
        updatePopoverValues();
      });
    }

    if (lazyMouseBtn) {
      lazyMouseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isLazyMouse = !isLazyMouse;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ isLazyMouse: isLazyMouse });
        }
        updatePopoverValues();
      });
    }

    if (okBtn) {
      okBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeVectorColorPopover();
      });
    }

    if (transBtn) {
      transBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyPopoverColor('transparent');
      });
    }

    const presetChips = popover.querySelectorAll('.size-preset-chip');
    presetChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const sizeVal = parseFloat(chip.getAttribute('data-size'));
        if (!isNaN(sizeVal)) {
          applyPopoverSize(sizeVal);
        }
      });
    });

    const sidesSlider = popover.querySelector('#vector-popover-sides-slider');
    if (sidesSlider) {
      sidesSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        applyPopoverSides(val);
      });
    }

    const sidesPresetChips = popover.querySelectorAll('.sides-preset-chip');
    sidesPresetChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = parseInt(chip.getAttribute('data-sides'), 10);
        if (!isNaN(val)) {
          applyPopoverSides(val);
        }
      });
    });

    popover.addEventListener('mousedown', (e) => e.stopPropagation());
    popover.addEventListener('mouseup', (e) => e.stopPropagation());
    popover.addEventListener('click', (e) => e.stopPropagation());
    popover.addEventListener('pointerdown', (e) => e.stopPropagation());

    if (!window._popoverClickOutsideBound) {
      window._popoverClickOutsideBound = true;
      document.addEventListener('pointerdown', (e) => {
        const pop = document.getElementById('vector-color-popover');
        if (!pop || pop.classList.contains('hidden')) return;
        const brushBtn = document.getElementById('edit-brush-tool-btn');
        const vectorOverlay = document.getElementById('edit-ui-vector-overlay');
        if (pop.contains(e.target) || (brushBtn && brushBtn.contains(e.target)) || (vectorOverlay && vectorOverlay.contains(e.target))) return;
        const customColorInput = pop.querySelector('#vector-popover-custom-color');
        if (document.activeElement === customColorInput) return;
        closeVectorColorPopover();
      }, true);
    }
  }

  // Update Section Visibility & Values
  updatePopoverValues();
  popover.classList.remove('hidden');
  positionVectorColorPopover(popover);
}
window.openVectorColorPopover = openVectorColorPopover;

function updatePopoverValues() {
  const popover = document.getElementById('vector-color-popover');
  if (!popover) return;
  const obj = getSelectedObject();
  const mode = popoverTargetMode;

  const titleEl = popover.querySelector('#vector-popover-title');
  const transBtn = popover.querySelector('#vector-popover-trans-btn');
  const colorSec = popover.querySelector('#vector-popover-color-section');
  const sizeSec = popover.querySelector('#vector-popover-size-section');
  const sidesSec = popover.querySelector('#vector-popover-sides-section');
  const togglesSec = popover.querySelector('#vector-popover-toggles-section');
  const opacitySec = popover.querySelector('#vector-popover-opacity-section');

  // Mode visibility configuration:
  if (mode === 'brushTool') {
    if (titleEl) titleEl.textContent = 'BRUSH SETTINGS';
    if (colorSec) colorSec.classList.remove('hidden');
    if (sizeSec) sizeSec.classList.remove('hidden');
    if (sidesSec) sidesSec.classList.add('hidden');
    if (togglesSec) togglesSec.classList.remove('hidden');
    if (opacitySec) opacitySec.classList.remove('hidden');
    if (transBtn) transBtn.classList.remove('hidden');
  } else if (mode === 'size') {
    if (titleEl) titleEl.textContent = 'STROKE SIZE';
    if (colorSec) colorSec.classList.add('hidden');
    if (sizeSec) sizeSec.classList.remove('hidden');
    if (sidesSec) sidesSec.classList.add('hidden');
    if (togglesSec) togglesSec.classList.add('hidden');
    if (opacitySec) opacitySec.classList.add('hidden');
    if (transBtn) transBtn.classList.add('hidden');
  } else if (mode === 'sides') {
    if (titleEl) titleEl.textContent = 'POLYGON SIDES';
    if (colorSec) colorSec.classList.add('hidden');
    if (sizeSec) sizeSec.classList.add('hidden');
    if (sidesSec) sidesSec.classList.remove('hidden');
    if (togglesSec) togglesSec.classList.add('hidden');
    if (opacitySec) opacitySec.classList.add('hidden');
    if (transBtn) transBtn.classList.add('hidden');
  } else {
    // Color modes: 'strokeColor', 'textColor', 'bgColor'
    if (titleEl) {
      if (mode === 'bgColor') titleEl.textContent = 'BACKGROUND COLOR';
      else if (mode === 'textColor') titleEl.textContent = 'TEXT COLOR';
      else titleEl.textContent = 'STROKE COLOR';
    }
    if (colorSec) colorSec.classList.remove('hidden');
    if (sizeSec) sizeSec.classList.add('hidden');
    if (sidesSec) sidesSec.classList.add('hidden');
    if (togglesSec) togglesSec.classList.add('hidden');
    if (opacitySec) opacitySec.classList.remove('hidden');
    if (transBtn) transBtn.classList.remove('hidden');
  }

  // Value resolution
  let currentColor = brushColor;
  let currentOpacity = brushOpacity;
  let currentSize = brushSize;
  let currentSizeMode = brushSizeMode;

  if (mode === 'bgColor') {
    currentColor = obj ? (obj.backgroundColor || 'transparent') : textBgColor;
    currentOpacity = obj ? (obj.bgOpacity ?? 1) : 1;
  } else if (mode === 'textColor') {
    currentColor = obj ? (obj.color || '#ffffff') : textColor;
    currentOpacity = obj ? (obj.opacity ?? 1) : 1;
  } else if (mode === 'strokeColor') {
    currentColor = obj ? (obj.color || '#67e8f9') : brushColor;
    currentOpacity = obj ? (obj.opacity ?? 1) : brushOpacity;
  } else if (obj) {
    currentColor = obj.color || brushColor;
    currentOpacity = obj.opacity ?? brushOpacity;
    currentSize = obj.size || brushSize;
    currentSizeMode = obj.sizeMode || brushSizeMode;
  }

  // Update controls UI
  const transActive = !currentColor || currentColor === 'transparent';
  if (transBtn) transBtn.classList.toggle('active', transActive);

  const customInput = popover.querySelector('#vector-popover-custom-color');
  if (customInput && !transActive) {
    customInput.value = currentColor;
  }

  const swatchesContainer = popover.querySelector('#vector-popover-swatches');
  if (swatchesContainer) {
    if (swatchesContainer.children.length === 0) {
      swatchesContainer.innerHTML = PRESET_COLORS.map(hex => `
        <div class="color-swatch" 
             style="background-color: ${hex};" 
             title="${hex}"
             data-color="${hex}">
        </div>
      `).join('');

      swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          const hex = swatch.getAttribute('data-color');
          applyPopoverColor(hex);
        });
      });
    }

    const curLower = (currentColor || '').toLowerCase();
    swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
      const hex = (swatch.getAttribute('data-color') || '').toLowerCase();
      swatch.classList.toggle('active', hex === curLower);
    });
  }

  const opacitySlider = popover.querySelector('#vector-popover-opacity-slider');
  const opacityBadge = popover.querySelector('#vector-popover-opacity-badge');
  const opacityPct = Math.round(currentOpacity * 100);
  if (opacitySlider) opacitySlider.value = opacityPct;
  if (opacityBadge) opacityBadge.textContent = `${opacityPct}%`;

  const sizeSlider = popover.querySelector('#vector-popover-size-slider');
  const sizeBadge = popover.querySelector('#vector-popover-size-badge');
  if (sizeSlider) sizeSlider.value = currentSize;
  if (sizeBadge) sizeBadge.textContent = `${currentSize}px`;

  const sizeModeBtn = popover.querySelector('#vector-popover-size-mode-btn');
  if (sizeModeBtn) {
    const isScreen = currentSizeMode === 'absolute';
    sizeModeBtn.textContent = isScreen ? 'Fixed to Screen' : 'Fixed to Image';
    sizeModeBtn.classList.toggle('active', isScreen);
  }

  const lazyMouseBtn = popover.querySelector('#vector-popover-lazy-mouse-btn');
  if (lazyMouseBtn) {
    lazyMouseBtn.textContent = isLazyMouse ? 'On' : 'Off';
    lazyMouseBtn.classList.toggle('active', isLazyMouse);
  }

  const presetChips = popover.querySelectorAll('.size-preset-chip');
  presetChips.forEach(chip => {
    const val = parseFloat(chip.getAttribute('data-size'));
    chip.classList.toggle('active', Math.abs(val - currentSize) < 0.5);
  });

  const currentSides = obj ? (obj.sides || 4) : (currentPolygonSides || 4);
  const sidesSlider = popover.querySelector('#vector-popover-sides-slider');
  const sidesBadge = popover.querySelector('#vector-popover-sides-badge');
  if (sidesSlider) sidesSlider.value = currentSides;
  if (sidesBadge) sidesBadge.textContent = `${currentSides}s`;

  const sidesPresetChips = popover.querySelectorAll('.sides-preset-chip');
  sidesPresetChips.forEach(chip => {
    const val = parseInt(chip.getAttribute('data-sides'), 10);
    chip.classList.toggle('active', val === currentSides);
  });

  if (typeof window.updateStrokePreview === 'function') {
    window.updateStrokePreview(currentSize, currentColor);
  }
}
window.updatePopoverValues = updatePopoverValues;

function applyPopoverColor(hex) {
  const obj = getSelectedObject();
  markSessionDirty();

  if (popoverTargetMode === 'bgColor') {
    textBgColor = hex;
    if (obj) obj.backgroundColor = hex;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ textBgColor: hex, shapeBgColor: hex });
    }
  } else if (popoverTargetMode === 'strokeColor') {
    brushColor = hex;
    if (obj) obj.color = hex;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ brushColor: hex, shapeStrokeColor: hex });
    }
  } else if (popoverTargetMode === 'textColor') {
    textColor = hex;
    if (obj) obj.color = hex;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ textColor: hex });
    }
  } else {
    brushColor = hex;
    textColor = hex;
    if (obj) obj.color = hex;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ brushColor: hex, textColor: hex, shapeStrokeColor: hex });
    }
  }

  updatePopoverValues();
  renderCompositeCanvas();
}
window.applyPopoverColor = applyPopoverColor;

function applyPopoverOpacity(val) {
  const obj = getSelectedObject();
  markSessionDirty();

  if (popoverTargetMode === 'bgColor') {
    if (obj) obj.bgOpacity = val;
  } else {
    brushOpacity = val;
    if (obj) obj.opacity = val;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ brushOpacity: val });
    }
  }

  updatePopoverValues();
  renderCompositeCanvas();
}
window.applyPopoverOpacity = applyPopoverOpacity;

function applyPopoverSize(val) {
  const obj = getSelectedObject();
  markSessionDirty();

  if (obj && obj.type === 'text') {
    fontSize = val;
    obj.fontSize = val;
    obj.scale = 1;
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ fontSize: val });
    }
  } else {
    brushSize = val;
    if (obj) {
      obj.size = val;
      obj.scale = 1;
      obj.strokeWidth = (typeof computeNaturalStrokeWidth === 'function')
        ? computeNaturalStrokeWidth(val, obj.sizeMode || brushSizeMode)
        : val;
    }
    if (typeof saveEditorSettingsToStorage === 'function') {
      saveEditorSettingsToStorage({ brushSize: val, shapeSize: val });
    }
  }

  updatePopoverValues();
  renderCompositeCanvas();
}
window.applyPopoverSize = applyPopoverSize;

function applyPopoverSides(val) {
  const obj = getSelectedObject();
  markSessionDirty();

  currentPolygonSides = val;
  if (obj) {
    obj.sides = val;
  }
  if (typeof saveEditorSettingsToStorage === 'function') {
    saveEditorSettingsToStorage({ polygonSides: val });
  }

  updatePopoverValues();
  renderCompositeCanvas();
}
window.applyPopoverSides = applyPopoverSides;

let popoverHideTimer = null;

function scheduleCloseVectorColorPopover(delay = 250) {
  if (popoverHideTimer) clearTimeout(popoverHideTimer);
  popoverHideTimer = setTimeout(() => {
    const popover = document.getElementById('vector-color-popover');
    if (popover && document.activeElement && popover.contains(document.activeElement)) return;
    closeVectorColorPopover();
  }, delay);
}
window.scheduleCloseVectorColorPopover = scheduleCloseVectorColorPopover;

Object.defineProperty(window, 'popoverHideTimer', {
  get: () => popoverHideTimer,
  set: (v) => { popoverHideTimer = v; },
  configurable: true
});

function closeVectorColorPopover() {
  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = null;
  }
  const popover = document.getElementById('vector-color-popover');
  if (popover) popover.classList.add('hidden');
}
window.closeVectorColorPopover = closeVectorColorPopover;

function positionVectorColorPopover(popover) {
  if (!popover) return;

  if (popoverTargetMode === 'brushTool') {
    const brushToolBtn = document.getElementById('edit-brush-tool-btn');
    if (brushToolBtn) {
      const btnRect = brushToolBtn.getBoundingClientRect();
      const modal = document.getElementById('image-preview-modal') || document.body;
      const modalRect = modal.getBoundingClientRect();

      const popoverWidth = popover.offsetWidth || 260;
      const popoverHeight = popover.offsetHeight || 420;

      let left = (btnRect.left - modalRect.left) + (btnRect.width / 2) - (popoverWidth / 2);
      let top = (btnRect.top - modalRect.top) - popoverHeight - 10;

      left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, left));
      if (top < 10) top = btnRect.bottom - modalRect.top + 10;

      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      return;
    }
  }

  const selectedObj = getSelectedObject();
  const modalImg = document.getElementById('modal-image-preview');
  if (!selectedObj || !modalImg || !editCanvas) return;

  const renderRect = getImageRenderedRect(modalImg);
  const modalRect = modalImg.parentNode.getBoundingClientRect();

  const screenX = (renderRect.left - modalRect.left) + (selectedObj.x / editCanvas.width) * renderRect.width;
  const screenY = (renderRect.top - modalRect.top) + (selectedObj.y / editCanvas.height) * renderRect.height;
  const bounds = selectedObj.type === 'brush'
    ? getBrushObjectBounds(selectedObj)
    : (selectedObj.type === 'shape'
      ? getShapeObjectBounds(selectedObj)
      : getTextObjectBounds(selectedObj));
  const screenHeight = (bounds.height / editCanvas.height) * renderRect.height;

  const halfH = screenHeight / 2;
  const rotateY = -halfH - 32;

  const popoverWidth = popover.offsetWidth || 250;
  const popoverHeight = popover.offsetHeight || 320;

  let popoverLeft = screenX - (popoverWidth / 2);
  let popoverTop = screenY + rotateY - popoverHeight;

  if (popoverTop < 10) popoverTop = screenY + halfH + 20;
  popoverLeft = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, popoverLeft));

  popover.style.left = `${popoverLeft}px`;
  popover.style.top = `${popoverTop}px`;
}
window.positionVectorColorPopover = positionVectorColorPopover;
