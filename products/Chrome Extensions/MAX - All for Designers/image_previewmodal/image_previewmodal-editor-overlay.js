// Preview Modal Image Editor - SVG Overlay & Controls Module (image_previewmodal-editor-overlay.js)

function updateVectorUiOverlay() {
  const selectedObj = getSelectedObject();
  const modalImg = document.getElementById('modal-image-preview');
  let svg = document.getElementById('edit-ui-vector-overlay');

  if (!selectedObj || !modalImg || !editCanvas) {
    if (svg) svg.style.display = 'none';
    if (window.popoverTargetMode !== 'brushTool' && window.closeVectorColorPopover) {
      window.closeVectorColorPopover();
    }
    return;
  }

  const renderRect = getImageRenderedRect(modalImg);
  const modalRect = modalImg.parentNode.getBoundingClientRect();

  const screenX = (renderRect.left - modalRect.left) + (selectedObj.x / editCanvas.width) * renderRect.width;
  const screenY = (renderRect.top - modalRect.top) + (selectedObj.y / editCanvas.height) * renderRect.height;

  const bounds = selectedObj.type === 'brush'
    ? getBrushObjectBounds(selectedObj)
    : (selectedObj.type === 'shape'
      ? getShapeObjectBounds(selectedObj)
      : getTextObjectBounds(selectedObj));

  const screenWidth = (bounds.width / editCanvas.width) * renderRect.width;
  const screenHeight = (bounds.height / editCanvas.height) * renderRect.height;
  const halfW = screenWidth / 2;
  const halfH = screenHeight / 2;
  const rotDeg = ((selectedObj.rotation || 0) * 180) / Math.PI;

  if (!svg) {
    const svgNS = 'http://www.w3.org/2000/svg';
    svg = document.createElementNS(svgNS, 'svg');
    svg.id = 'edit-ui-vector-overlay';

    const getSvgIconUrl = (name) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
          return chrome.runtime.getURL(`svg/${name}`);
        }
      } catch (e) {}
      return `svg/${name}`;
    };

    svg.innerHTML = `
      <defs>
        <mask id="vector-stroke-mask">
          <image href="${getSvgIconUrl('stroke.svg')}" width="18" height="18" x="-9" y="-9" style="filter: brightness(0) invert(1);" />
        </mask>
        <mask id="vector-text-color-mask">
          <image href="${getSvgIconUrl('text-color.svg')}" width="16" height="16" x="-8" y="-8" style="filter: brightness(0) invert(1);" />
        </mask>
      </defs>

      <g id="vector-selection-group">
        <rect id="vector-hit-rect" fill="transparent" pointer-events="none" />
        <rect id="vector-shadow-rect" />
        <rect id="vector-dash-rect" />

        <g id="vector-rotate-handle" class="vector-handle" style="cursor: grab;" title="Rotate Object">
          <circle r="12" />
          <image id="vector-rotate-icon" href="${getSvgIconUrl('rotate.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>

        <g id="vector-scale-handle" class="vector-handle" style="cursor: nwse-resize;" title="Scale Object">
          <circle r="12" />
          <image id="vector-scale-icon" href="${getSvgIconUrl('scale.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>
      </g>

      <g id="vector-toolbar-capsule">
        <rect id="vector-toolbar-box" />
        <line id="vector-toolbar-divider" />
        <line id="vector-toolbar-divider-2" />
        
        <g id="vector-text-color-btn" class="vector-toolbar-btn" title="Text Color">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <rect id="vector-text-color-indicator" width="16" height="16" x="-8" y="-8" fill="#ffffff" mask="url(#vector-text-color-mask)" />
        </g>

        <g id="vector-color-btn" class="vector-toolbar-btn" title="Stroke Color">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <rect id="vector-stroke-color-indicator" width="18" height="18" x="-9" y="-9" fill="#67e8f9" mask="url(#vector-stroke-mask)" />
        </g>

        <g id="vector-bg-color-btn" class="vector-toolbar-btn" title="Background Color (Right-click: Transparent)">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <rect id="vector-bg-color-rect" width="18" height="18" x="-9" y="-9" rx="4" fill="none" stroke="#ffffff" stroke-width="1.5" />
          <line id="vector-bg-color-slash" x1="-7" y1="7" x2="7" y2="-7" stroke="var(--c-red)" stroke-width="2" stroke-linecap="round" class="hidden" />
        </g>

        <g id="vector-align-btn" class="vector-toolbar-btn" title="Text Alignment">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <image id="vector-align-icon" href="${getSvgIconUrl('align-left.svg')}" width="16" height="16" x="-8" y="-8" style="filter: invert(1);" />
        </g>

        <g id="vector-bold-btn" class="vector-toolbar-btn" title="Toggle Bold">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <image href="${getSvgIconUrl('text-bold.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>

        <g id="vector-italic-btn" class="vector-toolbar-btn" title="Toggle Italic">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <image href="${getSvgIconUrl('text-italic.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>

        <g id="vector-underline-btn" class="vector-toolbar-btn" title="Toggle Underline">
          <rect width="28" height="28" x="-14" y="-14" fill="transparent" rx="6" />
          <image href="${getSvgIconUrl('text-underline.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>

        <g id="vector-brush-size-btn" class="vector-toolbar-btn hidden" title="Brush Size (Click to type or cycle presets)">
          <rect width="36" height="28" x="-18" y="-14" fill="transparent" rx="6" />
          <text id="vector-brush-size-text" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" y="4">15px</text>
        </g>

        <g id="vector-sides-btn" class="vector-toolbar-btn hidden" title="Polygon Sides Count (Hover for slider, click to edit)">
          <rect width="32" height="28" x="-16" y="-14" fill="transparent" rx="6" />
          <text id="vector-sides-text" font-size="11" font-weight="bold" fill="var(--accent-primary)" text-anchor="middle" y="4">4s</text>
        </g>

        <g id="vector-brush-mode-btn" class="vector-toolbar-btn hidden" title="Toggle Size Mode (Fixed to Screen / Fixed to Image)">
          <rect width="58" height="22" x="-29" y="-11" fill="rgba(0, 242, 254, 0.15)" stroke="var(--accent-primary)" stroke-width="1" rx="5" />
          <text id="vector-brush-mode-text" font-size="10" font-weight="bold" fill="var(--accent-primary)" text-anchor="middle" y="3.5">Screen</text>
        </g>

        <!-- Standalone Delete Button on the Same Horizontal Row -->
        <g id="vector-delete-handle" class="vector-handle" title="Delete Object">
          <circle r="14" />
          <image href="${getSvgIconUrl('close.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1);" />
        </g>
      </g>
    `;

    modalImg.parentNode.appendChild(svg);

    const alignBtn = svg.querySelector('#vector-align-btn');
    const colorBtn = svg.querySelector('#vector-color-btn');
    const bgColorBtn = svg.querySelector('#vector-bg-color-btn');
    const rotateGroup = svg.querySelector('#vector-rotate-handle');
    const boldBtn = svg.querySelector('#vector-bold-btn');
    const italicBtn = svg.querySelector('#vector-italic-btn');
    const underlineBtn = svg.querySelector('#vector-underline-btn');
    const deleteBtn = svg.querySelector('#vector-delete-handle');
    const scaleGroup = svg.querySelector('#vector-scale-handle');
    const brushSizeBtn = svg.querySelector('#vector-brush-size-btn');
    const brushModeBtn = svg.querySelector('#vector-brush-mode-btn');

    if (alignBtn) {
      alignBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedTextObj) return;
        markSessionDirty();
        const currentAlign = selectedTextObj.align || 'left';
        const nextAlign = currentAlign === 'left' ? 'center' : (currentAlign === 'center' ? 'right' : 'left');
        selectedTextObj.align = nextAlign;
        textAlign = nextAlign;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ textAlign: nextAlign });
        }
        const alignIcon = svg.querySelector('#vector-align-icon');
        if (alignIcon) alignIcon.setAttribute('href', getSvgIconUrl(`align-${nextAlign}.svg`));
        renderCompositeCanvas();
      });
    }

    const textColorBtn = svg.querySelector('#vector-text-color-btn');
    if (textColorBtn) {
      textColorBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const obj = getSelectedObject();
        if (!obj) return;
        if (window.openVectorColorPopover) window.openVectorColorPopover('textColor');
      });
    }

    if (colorBtn) {
      colorBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const obj = getSelectedObject();
        if (!obj) return;
        if (window.openVectorColorPopover) window.openVectorColorPopover('strokeColor');
      });
    }

    if (bgColorBtn) {
      bgColorBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const obj = getSelectedObject();
        if (!obj) return;

        if (e.button === 2 || e.shiftKey) {
          markSessionDirty();
          obj.backgroundColor = 'transparent';
          if (obj.type === 'text') {
            textBgColor = 'transparent';
            if (typeof saveEditorSettingsToStorage === 'function') {
              saveEditorSettingsToStorage({ textBgColor: 'transparent' });
            }
          }
          renderCompositeCanvas();
          return;
        }
        if (window.openVectorColorPopover) window.openVectorColorPopover('bgColor');
      });

      bgColorBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const obj = getSelectedObject();
        if (obj) {
          markSessionDirty();
          obj.backgroundColor = 'transparent';
          if (obj.type === 'text') {
            textBgColor = 'transparent';
            if (typeof saveEditorSettingsToStorage === 'function') {
              saveEditorSettingsToStorage({ textBgColor: 'transparent' });
            }
          }
          renderCompositeCanvas();
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        markSessionDirty();
        commitObjectSession();
        if (selectedTextObj) {
          editorObjects = editorObjects.filter(o => o.id !== selectedTextObj.id);
          selectedTextObj = null;
        } else if (selectedBrushObj) {
          editorObjects = editorObjects.filter(o => o.id !== selectedBrushObj.id);
          selectedBrushObj = null;
        }
        renderCompositeCanvas();
        saveUndoState();
      });
    }

    if (rotateGroup) {
      rotateGroup.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const obj = getSelectedObject();
        if (!obj) return;
        const pos = getCanvasCoordinates(e);
        isRotatingText = true;
        dragStartAngle = Math.atan2(pos.y - obj.y, pos.x - obj.x) - (obj.rotation || 0);
        if (window.startGlobalWindowDrag) window.startGlobalWindowDrag(e);
      });
    }

    if (boldBtn) {
      boldBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedTextObj) return;
        markSessionDirty();
        const nextWeight = selectedTextObj.fontWeight === 'bold' ? 'normal' : 'bold';
        selectedTextObj.fontWeight = nextWeight;
        textWeight = nextWeight;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ textWeight: nextWeight });
        }
        renderCompositeCanvas();
      });
    }

    if (italicBtn) {
      italicBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedTextObj) return;
        markSessionDirty();
        const nextStyle = selectedTextObj.fontStyle === 'italic' ? 'normal' : 'italic';
        selectedTextObj.fontStyle = nextStyle;
        textStyle = nextStyle;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ textStyle: nextStyle });
        }
        renderCompositeCanvas();
      });
    }

    if (underlineBtn) {
      underlineBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedTextObj) return;
        markSessionDirty();
        const nextDeco = selectedTextObj.textDecoration === 'underline' ? 'none' : 'underline';
        selectedTextObj.textDecoration = nextDeco;
        textDecoration = nextDeco;
        if (typeof saveEditorSettingsToStorage === 'function') {
          saveEditorSettingsToStorage({ textDecoration: nextDeco });
        }
        renderCompositeCanvas();
      });
    }

function openInlineVectorSizeInput(brushSizeBtn) {
  const selectedObj = getSelectedObject();
  if (!selectedObj || selectedObj.type !== 'brush') return;

  const btnRect = brushSizeBtn.getBoundingClientRect();
  const modal = document.getElementById('image-preview-modal') || document.body;
  const modalRect = modal.getBoundingClientRect();

  let inlineInput = document.getElementById('vector-inline-size-input');
  if (!inlineInput) {
    inlineInput = document.createElement('input');
    inlineInput.id = 'vector-inline-size-input';
    inlineInput.type = 'number';
    inlineInput.step = '0.1';
    inlineInput.min = '0.5';
    inlineInput.max = '500';
    inlineInput.className = 'vector-inline-size-input';
    modal.appendChild(inlineInput);

    const commitChange = () => {
      const val = parseFloat(inlineInput.value);
      if (!isNaN(val) && val > 0 && typeof window.applyVectorSize === 'function') {
        window.applyVectorSize(val);
      }
      inlineInput.classList.add('hidden');
    };

    inlineInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        commitChange();
        inlineInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        inlineInput.classList.add('hidden');
        inlineInput.blur();
      }
    });

    inlineInput.addEventListener('blur', () => {
      commitChange();
    });
  }

  const rawSize = (selectedObj.size || 15) * (selectedObj.scale || 1);
  const curSize = Number(rawSize.toFixed(1));
  inlineInput.value = curSize;

  const width = Math.max(52, btnRect.width + 12);
  const height = btnRect.height + 6;
  const left = (btnRect.left - modalRect.left) + (btnRect.width / 2) - (width / 2);
  const top = (btnRect.top - modalRect.top) + (btnRect.height / 2) - (height / 2);

  inlineInput.style.left = `${left}px`;
  inlineInput.style.top = `${top}px`;
  inlineInput.style.width = `${width}px`;
  inlineInput.style.height = `${height}px`;

  inlineInput.classList.remove('hidden');
  inlineInput.focus();
  inlineInput.select();
}
window.openInlineVectorSizeInput = openInlineVectorSizeInput;

function openInlineVectorSidesInput(sidesBtn) {
  const selectedObj = getSelectedObject();
  const modalImg = document.getElementById('modal-image-preview');
  if (!selectedObj || !sidesBtn || !modalImg) return;

  const btnRect = sidesBtn.getBoundingClientRect();
  const modalRect = modalImg.parentNode.getBoundingClientRect();

  let inlineInput = document.getElementById('vector-inline-sides-input');
  if (!inlineInput) {
    inlineInput = document.createElement('input');
    inlineInput.id = 'vector-inline-sides-input';
    inlineInput.type = 'number';
    inlineInput.min = '3';
    inlineInput.max = '30';
    inlineInput.step = '1';
    inlineInput.className = 'vector-inline-size-input';
    document.body.appendChild(inlineInput);

    inlineInput.addEventListener('mousedown', (e) => e.stopPropagation());
    inlineInput.addEventListener('click', (e) => e.stopPropagation());

    const commitChange = () => {
      const val = parseInt(inlineInput.value, 10);
      if (!isNaN(val) && val >= 3) {
        markSessionDirty();
        currentPolygonSides = val;
        selectedObj.sides = val;
        renderCompositeCanvas();
      }
      inlineInput.classList.add('hidden');
    };

    inlineInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        commitChange();
        inlineInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        inlineInput.classList.add('hidden');
        inlineInput.blur();
      }
    });

    inlineInput.addEventListener('blur', () => {
      commitChange();
    });
  }

  const curSides = selectedObj.sides || 4;
  inlineInput.value = curSides;

  const width = Math.max(52, btnRect.width + 12);
  const height = btnRect.height + 6;
  const left = (btnRect.left - modalRect.left) + (btnRect.width / 2) - (width / 2);
  const top = (btnRect.top - modalRect.top) + (btnRect.height / 2) - (height / 2);

  inlineInput.style.left = `${left}px`;
  inlineInput.style.top = `${top}px`;
  inlineInput.style.width = `${width}px`;
  inlineInput.style.height = `${height}px`;

  inlineInput.classList.remove('hidden');
  inlineInput.focus();
  inlineInput.select();
}
window.openInlineVectorSidesInput = openInlineVectorSidesInput;

    if (brushSizeBtn) {
      brushSizeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof window.openVectorColorPopover === 'function') {
          window.openVectorColorPopover('size');
        }
      });
    }

    const vectorSidesBtn = svg.querySelector('#vector-sides-btn');
    if (vectorSidesBtn) {
      vectorSidesBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof window.openVectorColorPopover === 'function') {
          window.openVectorColorPopover('sides');
        }
      });
    }

    if (brushModeBtn) {
      brushModeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof window.toggleBrushSizeMode === 'function') {
          window.toggleBrushSizeMode();
        }
      });
    }

    if (scaleGroup) {
      scaleGroup.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const obj = getSelectedObject();
        if (!obj) return;
        const pos = getCanvasCoordinates(e);
        isScalingText = true;
        dragStartDist = Math.hypot(pos.x - obj.x, pos.y - obj.y) || 1;
        dragStartScale = obj.scale || 1;
        dragStartScaleX = obj.scaleX || obj.scale || 1;
        dragStartScaleY = obj.scaleY || obj.scale || 1;
        if (typeof window.normalizeObjectScale === 'function') window.normalizeObjectScale(obj);
        dragStartWidth = obj.width || 40;
        dragStartHeight = obj.height || 40;
        dragStartFontSize = obj.fontSize || 28;
        if ((obj.type === 'brush' || (obj.type === 'shape' && obj.shapeType === 'polygonal')) && obj.points) {
          dragStartPoints = obj.points.map(p => ({ x: p.x, y: p.y }));
        } else {
          dragStartPoints = null;
        }
        const startLocal = worldToLocal(pos, obj);
        dragStartLocalX = Math.abs(startLocal.lx) || 1;
        dragStartLocalY = Math.abs(startLocal.ly) || 1;
        if (window.startGlobalWindowDrag) window.startGlobalWindowDrag(e);
      });
    }
  }

  svg.style.display = 'block';

  const group = svg.querySelector('#vector-selection-group');
  const hitRect = svg.querySelector('#vector-hit-rect');
  const shadowRect = svg.querySelector('#vector-shadow-rect');
  const dashRect = svg.querySelector('#vector-dash-rect');
  const toolbarCapsule = svg.querySelector('#vector-toolbar-capsule');
  const toolbarBox = svg.querySelector('#vector-toolbar-box');
  const toolbarDivider = svg.querySelector('#vector-toolbar-divider');
  const alignBtn = svg.querySelector('#vector-align-btn');
  const textColorBtn = svg.querySelector('#vector-text-color-btn');
  const colorBtn = svg.querySelector('#vector-color-btn');
  const bgColorBtn = svg.querySelector('#vector-bg-color-btn');
  const boldBtn = svg.querySelector('#vector-bold-btn');
  const italicBtn = svg.querySelector('#vector-italic-btn');
  const underlineBtn = svg.querySelector('#vector-underline-btn');
  const brushSizeBtn = svg.querySelector('#vector-brush-size-btn');
  const vectorSidesBtn = svg.querySelector('#vector-sides-btn');
  const brushModeBtn = svg.querySelector('#vector-brush-mode-text') ? svg.querySelector('#vector-brush-mode-btn') : null;
  const deleteBtn = svg.querySelector('#vector-delete-handle');

  const rotateGroup = svg.querySelector('#vector-rotate-handle');
  const scaleGroup = svg.querySelector('#vector-scale-handle');

  if (selectedObj && typeof window.updateStrokePreview === 'function') {
    const curSize = Number(((selectedObj.size || 15) * (selectedObj.scale || 1)).toFixed(1));
    const curColor = selectedObj.color || brushColor;
    window.updateStrokePreview(curSize, curColor);
  }

  if (group) group.setAttribute('transform', `translate(${screenX}, ${screenY}) rotate(${rotDeg})`);

  if (hitRect) {
    hitRect.setAttribute('x', -halfW);
    hitRect.setAttribute('y', -halfH);
    hitRect.setAttribute('width', screenWidth);
    hitRect.setAttribute('height', screenHeight);
  }
  if (shadowRect) {
    shadowRect.setAttribute('x', -halfW);
    shadowRect.setAttribute('y', -halfH);
    shadowRect.setAttribute('width', screenWidth);
    shadowRect.setAttribute('height', screenHeight);
  }
  if (dashRect) {
    dashRect.setAttribute('x', -halfW);
    dashRect.setAttribute('y', -halfH);
    dashRect.setAttribute('width', screenWidth);
    dashRect.setAttribute('height', screenHeight);
  }

  // Position Floating Combined Toolbar Capsule (Unrotated, ALWAYS Horizontal on Top)
  if (toolbarCapsule) {
    const rotRad = selectedObj.rotation || 0;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);

    const cornersY = [
      -halfW * sin + (-halfH) * cos,
       halfW * sin + (-halfH) * cos,
       halfW * sin +   halfH  * cos,
      -halfW * sin +   halfH  * cos
    ];

    const minY = Math.min(...cornersY);
    let toolbarY = screenY + minY - 24;

    if (toolbarY < 30) {
      const maxY = Math.max(...cornersY);
      toolbarY = screenY + maxY + 24;
    }

    toolbarCapsule.setAttribute('transform', `translate(${screenX}, ${toolbarY})`);
  }

  const alignIcon = svg.querySelector('#vector-align-icon');
  if (alignIcon && selectedObj.type !== 'brush') {
    let alignSvgUrl = `svg/align-${selectedObj.align || 'left'}.svg`;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
        alignSvgUrl = chrome.runtime.getURL(`svg/align-${selectedObj.align || 'left'}.svg`);
      }
    } catch (e) {}
    alignIcon.setAttribute('href', alignSvgUrl);
  }

  if (selectedObj.type === 'brush') {
    // Brush Tool: Items 2 (Stroke Color), 4 (Stroke Size), 5 (Screen/Image Mode)
    if (vectorSidesBtn) vectorSidesBtn.classList.add('hidden');
    if (textColorBtn) textColorBtn.classList.add('hidden');
    if (bgColorBtn) bgColorBtn.classList.add('hidden');
    if (alignBtn) alignBtn.classList.add('hidden');
    if (boldBtn) boldBtn.classList.add('hidden');
    if (italicBtn) italicBtn.classList.add('hidden');
    if (underlineBtn) underlineBtn.classList.add('hidden');
    if (toolbarDivider) toolbarDivider.classList.add('hidden');

    if (colorBtn) {
      colorBtn.classList.remove('hidden');
      colorBtn.setAttribute('transform', 'translate(-52, 0)');
      const strokeIndicator = colorBtn.querySelector('#vector-stroke-color-indicator');
      if (strokeIndicator) strokeIndicator.setAttribute('fill', selectedObj.color || brushColor || '#67e8f9');
    }

    if (brushSizeBtn) {
      brushSizeBtn.classList.remove('hidden');
      brushSizeBtn.setAttribute('transform', 'translate(-16, 0)');
      const textEl = brushSizeBtn.querySelector('#vector-brush-size-text');
      const rawSize = (selectedObj.size || 15) * (selectedObj.scale || 1);
      const curSize = Number(rawSize.toFixed(1));
      if (textEl) textEl.textContent = `${curSize}px`;
    }

    if (brushModeBtn) {
      brushModeBtn.classList.remove('hidden');
      brushModeBtn.setAttribute('transform', 'translate(34, 0)');
      const modeText = brushModeBtn.querySelector('#vector-brush-mode-text');
      const isScreen = (selectedObj.sizeMode || brushSizeMode) === 'absolute';
      if (modeText) modeText.textContent = isScreen ? 'Screen' : 'Image';
    }

    if (deleteBtn) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.setAttribute('transform', 'translate(96, 0)');
    }
    if (toolbarBox) {
      toolbarBox.setAttribute('x', '-72');
      toolbarBox.setAttribute('y', '-16');
      toolbarBox.setAttribute('width', '144');
      toolbarBox.setAttribute('height', '32');
    }
  } else if (selectedObj.type === 'shape') {
    // Shape Tool: Items 2 (Stroke Color), 3 (Background Color), 4 (Stroke Size), [5 (Sides if polygon)], 6 (Screen/Image Mode)
    if (textColorBtn) textColorBtn.classList.add('hidden');
    if (alignBtn) alignBtn.classList.add('hidden');
    if (boldBtn) boldBtn.classList.add('hidden');
    if (italicBtn) italicBtn.classList.add('hidden');
    if (underlineBtn) underlineBtn.classList.add('hidden');
    if (toolbarDivider) toolbarDivider.classList.add('hidden');

    const vectorSidesBtn = svg.querySelector('#vector-sides-btn');
    const isPolygonal = selectedObj.shapeType === 'polygonal';
    const isEllipse = selectedObj.shapeType === 'ellipse';

    if (isPolygonal) {
      if (bgColorBtn) bgColorBtn.classList.add('hidden');
      if (vectorSidesBtn) vectorSidesBtn.classList.add('hidden');

      if (colorBtn) {
        colorBtn.classList.remove('hidden');
        colorBtn.setAttribute('transform', 'translate(-52, 0)');
        const strokeIndicator = colorBtn.querySelector('#vector-stroke-color-indicator');
        if (strokeIndicator) strokeIndicator.setAttribute('fill', selectedObj.color || brushColor || '#67e8f9');
      }

      if (brushSizeBtn) {
        brushSizeBtn.classList.remove('hidden');
        brushSizeBtn.setAttribute('transform', 'translate(-16, 0)');
        const textEl = brushSizeBtn.querySelector('#vector-brush-size-text');
        const rawSize = (selectedObj.size || 15) * (selectedObj.scale || 1);
        const curSize = Number(rawSize.toFixed(1));
        if (textEl) textEl.textContent = `${curSize}px`;
      }

      if (brushModeBtn) {
        brushModeBtn.classList.remove('hidden');
        brushModeBtn.setAttribute('transform', 'translate(34, 0)');
        const modeText = brushModeBtn.querySelector('#vector-brush-mode-text');
        const isScreen = (selectedObj.sizeMode || brushSizeMode) === 'absolute';
        if (modeText) modeText.textContent = isScreen ? 'Screen' : 'Image';
      }

      if (deleteBtn) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.setAttribute('transform', 'translate(96, 0)');
      }
      if (toolbarBox) {
        toolbarBox.setAttribute('x', '-72');
        toolbarBox.setAttribute('y', '-16');
        toolbarBox.setAttribute('width', '144');
        toolbarBox.setAttribute('height', '32');
      }
    } else if (isEllipse) {
      if (vectorSidesBtn) vectorSidesBtn.classList.add('hidden');

      if (colorBtn) {
        colorBtn.classList.remove('hidden');
        colorBtn.setAttribute('transform', 'translate(-68, 0)');
        const strokeIndicator = colorBtn.querySelector('#vector-stroke-color-indicator');
        if (strokeIndicator) strokeIndicator.setAttribute('fill', selectedObj.color || brushColor || '#67e8f9');
      }

      if (bgColorBtn) {
        bgColorBtn.classList.remove('hidden');
        bgColorBtn.setAttribute('transform', 'translate(-36, 0)');

        const rectEl = bgColorBtn.querySelector('#vector-bg-color-rect');
        const slashEl = bgColorBtn.querySelector('#vector-bg-color-slash');
        const isTransparent = !selectedObj.backgroundColor || selectedObj.backgroundColor === 'transparent';
        if (rectEl) rectEl.setAttribute('fill', isTransparent ? 'none' : selectedObj.backgroundColor);
        if (slashEl) slashEl.classList.toggle('hidden', !isTransparent);
      }

      if (brushSizeBtn) {
        brushSizeBtn.classList.remove('hidden');
        brushSizeBtn.setAttribute('transform', 'translate(-4, 0)');
        const textEl = brushSizeBtn.querySelector('#vector-brush-size-text');
        const rawSize = (selectedObj.size || 15) * (selectedObj.scale || 1);
        const curSize = Number(rawSize.toFixed(1));
        if (textEl) textEl.textContent = `${curSize}px`;
      }

      if (brushModeBtn) {
        brushModeBtn.classList.remove('hidden');
        brushModeBtn.setAttribute('transform', 'translate(44, 0)');
        const modeText = brushModeBtn.querySelector('#vector-brush-mode-text');
        const isScreen = (selectedObj.sizeMode || brushSizeMode) === 'absolute';
        if (modeText) modeText.textContent = isScreen ? 'Screen' : 'Image';
      }

      if (deleteBtn) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.setAttribute('transform', 'translate(108, 0)');
      }
      if (toolbarBox) {
        toolbarBox.setAttribute('x', '-84');
        toolbarBox.setAttribute('y', '-16');
        toolbarBox.setAttribute('width', '168');
        toolbarBox.setAttribute('height', '32');
      }
    } else {
      // Polygon / Rectangle Shape with Sides Selector
      if (colorBtn) {
        colorBtn.classList.remove('hidden');
        colorBtn.setAttribute('transform', 'translate(-88, 0)');
        const strokeIndicator = colorBtn.querySelector('#vector-stroke-color-indicator');
        if (strokeIndicator) strokeIndicator.setAttribute('fill', selectedObj.color || brushColor || '#67e8f9');
      }

      if (bgColorBtn) {
        bgColorBtn.classList.remove('hidden');
        bgColorBtn.setAttribute('transform', 'translate(-56, 0)');

        const rectEl = bgColorBtn.querySelector('#vector-bg-color-rect');
        const slashEl = bgColorBtn.querySelector('#vector-bg-color-slash');
        const isTransparent = !selectedObj.backgroundColor || selectedObj.backgroundColor === 'transparent';
        if (rectEl) rectEl.setAttribute('fill', isTransparent ? 'none' : selectedObj.backgroundColor);
        if (slashEl) slashEl.classList.toggle('hidden', !isTransparent);
      }

      if (brushSizeBtn) {
        brushSizeBtn.classList.remove('hidden');
        brushSizeBtn.setAttribute('transform', 'translate(-24, 0)');
        const textEl = brushSizeBtn.querySelector('#vector-brush-size-text');
        const rawSize = (selectedObj.size || 15) * (selectedObj.scale || 1);
        const curSize = Number(rawSize.toFixed(1));
        if (textEl) textEl.textContent = `${curSize}px`;
      }

      if (vectorSidesBtn) {
        vectorSidesBtn.classList.remove('hidden');
        vectorSidesBtn.setAttribute('transform', 'translate(16, 0)');
        const textEl = vectorSidesBtn.querySelector('#vector-sides-text');
        const sides = selectedObj.sides || 4;
        if (textEl) textEl.textContent = `${sides}s`;
      }

      if (brushModeBtn) {
        brushModeBtn.classList.remove('hidden');
        brushModeBtn.setAttribute('transform', 'translate(66, 0)');
        const modeText = brushModeBtn.querySelector('#vector-brush-mode-text');
        const isScreen = (selectedObj.sizeMode || brushSizeMode) === 'absolute';
        if (modeText) modeText.textContent = isScreen ? 'Screen' : 'Image';
      }

      if (deleteBtn) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.setAttribute('transform', 'translate(130, 0)');
      }

      if (toolbarBox) {
        toolbarBox.setAttribute('x', '-106');
        toolbarBox.setAttribute('y', '-16');
        toolbarBox.setAttribute('width', '212');
        toolbarBox.setAttribute('height', '32');
      }
    }
  } else {
    // Text Tool: Items 1 (Text Color), 3 (Background Color), Divider, 6 (Align), 7 (Bold), 8 (Italic), 9 (Underline)
    if (vectorSidesBtn) vectorSidesBtn.classList.add('hidden');
    if (colorBtn) colorBtn.classList.add('hidden');
    if (brushSizeBtn) brushSizeBtn.classList.add('hidden');
    if (brushModeBtn) brushModeBtn.classList.add('hidden');

    if (textColorBtn) {
      textColorBtn.classList.remove('hidden');
      textColorBtn.setAttribute('transform', 'translate(-80, 0)');
      const textIndicator = textColorBtn.querySelector('#vector-text-color-indicator');
      if (textIndicator) textIndicator.setAttribute('fill', selectedObj.color || textColor || '#ffffff');
    }

    if (bgColorBtn) {
      bgColorBtn.classList.remove('hidden');
      bgColorBtn.setAttribute('transform', 'translate(-48, 0)');

      const rectEl = bgColorBtn.querySelector('#vector-bg-color-rect');
      const slashEl = bgColorBtn.querySelector('#vector-bg-color-slash');
      const isTransparent = !selectedObj.backgroundColor || selectedObj.backgroundColor === 'transparent';
      if (rectEl) rectEl.setAttribute('fill', isTransparent ? 'none' : selectedObj.backgroundColor);
      if (slashEl) slashEl.classList.toggle('hidden', !isTransparent);
    }

    if (toolbarDivider) {
      toolbarDivider.classList.remove('hidden');
      toolbarDivider.setAttribute('x1', '-30');
      toolbarDivider.setAttribute('y1', '-10');
      toolbarDivider.setAttribute('x2', '-30');
      toolbarDivider.setAttribute('y2', '10');
    }

    if (alignBtn) {
      alignBtn.classList.remove('hidden');
      alignBtn.setAttribute('transform', 'translate(-12, 0)');
    }
    if (boldBtn) {
      boldBtn.classList.remove('hidden');
      boldBtn.setAttribute('transform', 'translate(18, 0)');
      if (selectedObj.fontWeight === 'bold') {
        boldBtn.classList.add('active');
      } else {
        boldBtn.classList.remove('active');
      }
    }
    if (italicBtn) {
      italicBtn.classList.remove('hidden');
      italicBtn.setAttribute('transform', 'translate(48, 0)');
      if (selectedObj.fontStyle === 'italic') {
        italicBtn.classList.add('active');
      } else {
        italicBtn.classList.remove('active');
      }
    }
    if (underlineBtn) {
      underlineBtn.classList.remove('hidden');
      underlineBtn.setAttribute('transform', 'translate(78, 0)');
      if (selectedObj.textDecoration === 'underline') {
        underlineBtn.classList.add('active');
      } else {
        underlineBtn.classList.remove('active');
      }
    }

    if (deleteBtn) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.setAttribute('transform', 'translate(124, 0)');
    }
    if (toolbarBox) {
      toolbarBox.setAttribute('x', '-100');
      toolbarBox.setAttribute('y', '-16');
      toolbarBox.setAttribute('width', '200');
      toolbarBox.setAttribute('height', '32');
    }
  }

  // Update Color & BgColor indicators
  const colorIconPath = svg.querySelector('#vector-color-icon-path');
  if (colorIconPath) {
    const curCol = selectedObj.color || (selectedObj.type === 'brush' ? '#67e8f9' : '#000000');
    colorIconPath.setAttribute('fill', curCol);
    if (curCol.toLowerCase() === '#000000' || curCol.toLowerCase() === '#27272a' || curCol.toLowerCase() === '#151924') {
      colorIconPath.setAttribute('stroke', '#ffffff');
      colorIconPath.setAttribute('stroke-width', '1.5');
    } else {
      colorIconPath.setAttribute('stroke', 'none');
    }
  }

  const bgColorRect = svg.querySelector('#vector-bg-color-rect');
  const bgColorSlash = svg.querySelector('#vector-bg-color-slash');
  if (bgColorRect && bgColorSlash) {
    const bgCol = selectedObj.backgroundColor;
    if (bgCol && bgCol !== 'transparent') {
      bgColorRect.setAttribute('fill', bgCol);
      bgColorRect.setAttribute('stroke', '#ffffff');
      bgColorSlash.classList.add('hidden');
    } else {
      bgColorRect.setAttribute('fill', '#ffffff');
      bgColorRect.setAttribute('stroke', '#ffffff');
      bgColorSlash.classList.remove('hidden');
    }
  }

  // Rotate Handle at Top Right Corner (halfW, -halfH)
  if (rotateGroup) {
    rotateGroup.setAttribute('transform', `translate(${halfW}, ${-halfH})`);
  }

  // Scale Handle at Bottom Right Corner (halfW, halfH)
  if (scaleGroup) {
    scaleGroup.setAttribute('transform', `translate(${halfW}, ${halfH})`);
  }

  // Reposition Color Popover if currently visible
  const popover = document.getElementById('vector-color-popover');
  if (popover && !popover.classList.contains('hidden') && window.positionVectorColorPopover) {
    window.positionVectorColorPopover(popover);
  }

  // Reposition Size Popover if currently visible
  const sizePopover = document.getElementById('vector-size-popover');
  if (sizePopover && !sizePopover.classList.contains('hidden') && window.positionVectorSizePopover) {
    if (window.updateVectorSizePopoverValues) window.updateVectorSizePopoverValues();
    window.positionVectorSizePopover(sizePopover);
  }
}
window.updateVectorUiOverlay = updateVectorUiOverlay;
