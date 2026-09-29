// Image Edit Overlay Canvas Interaction Handler Module (image_previewmodal-editor-interaction.js)

let isDrawingPolygonal = false;
let currentPolygonalPoints = [];
let polygonalPreviewMousePos = null;

// Double-click on canvas to select text and enter inline editing mode
function handleCanvasDblClick(e) {
  if (window.isDrawingPolygonal) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window.finishPolygonalDrawing === 'function') {
      window.finishPolygonalDrawing();
    }
    return;
  }
  if (!isEditMode || editorMode !== 'idle') return;
  const pos = getCanvasCoordinates(e);
  const hitObj = findTextObjectAtCanvas(pos);
  if (hitObj) {
    e.stopPropagation();
    selectedTextObj = hitObj;
    selectedTextObj.isEditingText = true;
    selectedTextObj.selectionStart = 0;
    selectedTextObj.selectionEnd = (hitObj.text || '').length;
    selectedTextObj.cursorIndex = (hitObj.text || '').length;
    renderCompositeCanvas();
    startCaretBlink();
    return;
  }
  if (typeof window.toggleModalZoom === 'function') {
    window.toggleModalZoom(e);
  }
}
window.handleCanvasDblClick = handleCanvasDblClick;

function getCursorIndexFromLocalPos(obj, lx, ly) {
  if (!editCtx) return (obj.text || '').length;
  const bounds = getTextObjectBounds(obj);
  const lines = (obj.text || '').split('\n');
  const startY = -((lines.length - 1) * bounds.lineHeight) / 2;

  let lineIdx = Math.floor((ly - (startY - bounds.lineHeight / 2)) / bounds.lineHeight);
  lineIdx = Math.max(0, Math.min(lines.length - 1, lineIdx));

  const targetLine = lines[lineIdx] || '';

  editCtx.save();
  const effectiveFontSize = (obj.fontSize || 28) * (obj.scale || 1);
  editCtx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${effectiveFontSize}px sans-serif`;
  const lineWidth = editCtx.measureText(targetLine).width;

  let lineStartX = 0;
  if (obj.align === 'left') lineStartX = -bounds.halfW + 16;
  else if (obj.align === 'right') lineStartX = bounds.halfW - 16 - lineWidth;
  else lineStartX = -lineWidth / 2;

  const relX = lx - lineStartX;
  let charIdx = 0;
  for (let l = 0; l < lineIdx; l++) {
    charIdx += (lines[l] || '').length + 1;
  }

  let minDiff = Infinity;
  let colIdx = 0;
  for (let c = 0; c <= targetLine.length; c++) {
    const subW = editCtx.measureText(targetLine.substring(0, c)).width;
    const diff = Math.abs(subW - relX);
    if (diff < minDiff) {
      minDiff = diff;
      colIdx = c;
    }
  }
  editCtx.restore();

  return charIdx + colIdx;
}
window.getCursorIndexFromLocalPos = getCursorIndexFromLocalPos;

function handleCanvasMouseDown(e) {
  if (!isEditMode || e.button !== 0) return;
  e.stopPropagation();

  const pos = getCanvasCoordinates(e);

  if (editorMode === 'idle') {
    const selectedObj = getSelectedObject();
    if (selectedObj) {
      const bounds = selectedObj.type === 'brush'
        ? getBrushObjectBounds(selectedObj)
        : (selectedObj.type === 'shape'
          ? getShapeObjectBounds(selectedObj)
          : getTextObjectBounds(selectedObj));
      const local = worldToLocal(pos, selectedObj);
      const scaleRatio = getScreenScaleRatio();
      const hitRadiusCanvas = 22 * scaleRatio;

      // Check Rotate Handle (top right corner: halfW, -halfH)
      const distRotate = Math.hypot(local.lx - bounds.halfW, local.ly - (-bounds.halfH));
      if (distRotate <= hitRadiusCanvas) {
        isRotatingText = true;
        dragStartAngle = Math.atan2(pos.y - selectedObj.y, pos.x - selectedObj.x) - (selectedObj.rotation || 0);
        startGlobalWindowDrag(e);
        return;
      }

      // Check Scale Handle (bottom right corner: halfW, halfH)
      const distScale = Math.hypot(local.lx - bounds.halfW, local.ly - bounds.halfH);
      if (distScale <= hitRadiusCanvas) {
        isScalingText = true;
        dragStartDist = Math.hypot(pos.x - selectedObj.x, pos.y - selectedObj.y) || 1;
        dragStartScale = selectedObj.scale || 1;
        dragStartScaleX = selectedObj.scaleX || selectedObj.scale || 1;
        dragStartScaleY = selectedObj.scaleY || selectedObj.scale || 1;
        if (typeof window.normalizeObjectScale === 'function') window.normalizeObjectScale(selectedObj);
        dragStartWidth = selectedObj.width || 40;
        dragStartHeight = selectedObj.height || 40;
        dragStartFontSize = selectedObj.fontSize || 28;
        if ((selectedObj.type === 'brush' || (selectedObj.type === 'shape' && selectedObj.shapeType === 'polygonal')) && selectedObj.points) {
          dragStartPoints = selectedObj.points.map(p => ({ x: p.x, y: p.y }));
        } else {
          dragStartPoints = null;
        }
        const startLocal = worldToLocal(pos, selectedObj);
        dragStartLocalX = Math.abs(startLocal.lx) || 1;
        dragStartLocalY = Math.abs(startLocal.ly) || 1;
        startGlobalWindowDrag(e);
        return;
      }
    }

    // Check if clicking body of any vector object (top-to-bottom)
    const hitObj = findVectorObjectAtCanvas(pos);

    if (hitObj) {
      if (window.cleanupEmptyTextObjects && (!selectedTextObj || selectedTextObj.id !== hitObj.id)) {
        window.cleanupEmptyTextObjects();
      }
      bringObjectToTop(hitObj);
      if (hitObj.type === 'brush' || hitObj.type === 'shape') {
        if (!selectedBrushObj || selectedBrushObj.id !== hitObj.id) {
          commitObjectSession();
          selectedBrushObj = hitObj;
          selectedTextObj = null;
          if (hitObj.size) brushSize = hitObj.size;
          if (hitObj.sizeMode) brushSizeMode = hitObj.sizeMode;
          startObjectSession();
        }
      } else {
        if (selectedTextObj && selectedTextObj.id === hitObj.id) {
          selectedTextObj.isEditingText = true;
          const local = worldToLocal(pos, hitObj);
          selectedTextObj.selectionStart = 0;
          selectedTextObj.selectionEnd = 0;
          selectedTextObj.cursorIndex = getCursorIndexFromLocalPos(hitObj, local.lx, local.ly);
        } else {
          commitObjectSession();
          selectedTextObj = hitObj;
          selectedBrushObj = null;
          selectedTextObj.isEditingText = false;
          startObjectSession();
        }
      }

      dragTextObj = hitObj;
      dragStartCanvasX = pos.x;
      dragStartCanvasY = pos.y;
      dragTextStartX = hitObj.x;
      dragTextStartY = hitObj.y;
      isDraggingText = true;
      startGlobalWindowDrag(e);
      renderCompositeCanvas();
      if (hitObj.type !== 'brush') startCaretBlink();
    } else {
      deselectAllObjects();
      if (typeof window.startPanDrag === 'function') {
        window.startPanDrag(e);
      }
    }
    return;
  }

  if (editorMode === 'shape') {
    commitActiveTextOverlay();

    if (currentShapeType === 'polygonal') {
      if (e.button === 2) {
        // Right click finishes polygonal drawing
        finishPolygonalDrawing();
        return;
      }

      if (!isDrawingPolygonal) {
        deselectAllObjects();
        isDrawingPolygonal = true;
        currentPolygonalPoints = [{ x: pos.x, y: pos.y }];
        window.isDrawingPolygonal = true;
        window.currentPolygonalPoints = currentPolygonalPoints;
        window.polygonalPreviewMousePos = pos;
        renderCompositeCanvas();
        return;
      } else {
        const lastPt = currentPolygonalPoints[currentPolygonalPoints.length - 1];
        const dist = Math.hypot(pos.x - lastPt.x, pos.y - lastPt.y);
        if (dist < 5) {
          finishPolygonalDrawing();
        } else {
          currentPolygonalPoints.push({ x: pos.x, y: pos.y });
          window.polygonalPreviewMousePos = pos;
          renderCompositeCanvas();
        }
        return;
      }
    }

    deselectAllObjects();
    isDrawingShape = true;
    shapeStartX = pos.x;
    shapeStartY = pos.y;

    const strokeW = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(brushSize, brushSizeMode)
      : brushSize;

    currentShapeObj = {
      id: 'shape_' + Date.now(),
      type: 'shape',
      shapeType: currentShapeType || 'rect',
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      color: brushColor || '#67e8f9',
      backgroundColor: textBgColor || 'transparent',
      size: brushSize || 15,
      sizeMode: brushSizeMode || 'absolute',
      strokeWidth: strokeW,
      rotation: 0,
      scale: 1
    };
    startGlobalWindowDrag(e);
    return;
  }

  if (editorMode === 'brush') {
    commitActiveTextOverlay();
    isDrawing = true;
    lastX = pos.x;
    lastY = pos.y;
    smoothX = pos.x;
    smoothY = pos.y;
    drawSegment(lastX, lastY, lastX, lastY, pos.renderRect);
    return;
  }
}
window.handleCanvasMouseDown = handleCanvasMouseDown;

function finishPolygonalDrawing() {
  if (!isDrawingPolygonal || !currentPolygonalPoints || currentPolygonalPoints.length < 2) {
    isDrawingPolygonal = false;
    currentPolygonalPoints = [];
    window.isDrawingPolygonal = false;
    window.currentPolygonalPoints = [];
    window.polygonalPreviewMousePos = null;
    renderCompositeCanvas();
    return;
  }

  markSessionDirty();

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  currentPolygonalPoints.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = Math.max(12, maxX - minX);
  const h = Math.max(12, maxY - minY);

  const normPoints = currentPolygonalPoints.map(p => ({
    x: p.x - cx,
    y: p.y - cy
  }));

  const strokeW = (typeof computeNaturalStrokeWidth === 'function')
    ? computeNaturalStrokeWidth(brushSize || 15, brushSizeMode || 'absolute')
    : (brushSize || 15);

  const newObj = {
    id: 'shape_' + Date.now(),
    type: 'shape',
    shapeType: 'polygonal',
    points: normPoints,
    x: cx,
    y: cy,
    width: w,
    height: h,
    color: brushColor || '#67e8f9',
    backgroundColor: 'transparent',
    size: brushSize || 15,
    sizeMode: brushSizeMode || 'absolute',
    strokeWidth: strokeW,
    rotation: 0,
    scale: 1
  };

  editorObjects.push(newObj);
  selectedBrushObj = newObj;
  selectedTextObj = null;

  isDrawingPolygonal = false;
  currentPolygonalPoints = [];
  window.isDrawingPolygonal = false;
  window.currentPolygonalPoints = [];
  window.polygonalPreviewMousePos = null;

  setEditorMode('idle');
  renderCompositeCanvas();
  saveUndoState();
}
window.finishPolygonalDrawing = finishPolygonalDrawing;

function handleCanvasMouseMove(e) {
  if (!isEditMode) return;

  const pos = getCanvasCoordinates(e);

  if (isDrawingPolygonal) {
    window.polygonalPreviewMousePos = pos;
    renderCompositeCanvas();
    return;
  }

  if (isDrawingShape && currentShapeObj) {
    const dx = pos.x - shapeStartX;
    const dy = pos.y - shapeStartY;

    let w = dx;
    let h = dy;
    if (e.shiftKey) {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      w = dx >= 0 ? side : -side;
      h = dy >= 0 ? side : -side;
    }

    currentShapeObj.x = shapeStartX + w / 2;
    currentShapeObj.y = shapeStartY + h / 2;
    currentShapeObj.width = Math.abs(w);
    currentShapeObj.height = Math.abs(h);

    renderCompositeCanvas();
    if (window.renderSingleShapeObjectOnCanvas) {
      window.renderSingleShapeObjectOnCanvas(currentShapeObj);
    }
    return;
  }

  if (editorMode === 'idle') {
    const activeObj = getSelectedObject();

    if (isRotatingText && activeObj) {
      markSessionDirty();
      let currentAngle = Math.atan2(pos.y - activeObj.y, pos.x - activeObj.x) - dragStartAngle;
      if (e && e.shiftKey) {
        const snap = Math.PI / 4; // 45 degrees snap
        currentAngle = Math.round(currentAngle / snap) * snap;
      }
      activeObj.rotation = currentAngle;
      renderCompositeCanvas();
      return;
    }

    if (isScalingText && activeObj) {
      markSessionDirty();
      const currentDist = Math.hypot(pos.x - activeObj.x, pos.y - activeObj.y);

      let ratioX = 1;
      let ratioY = 1;

      if (e && e.shiftKey) {
        // Free scale (Scale tự do khi đè Shift)
        const local = worldToLocal(pos, activeObj);
        ratioX = Math.abs(local.lx) / (dragStartLocalX || 1);
        ratioY = Math.abs(local.ly) / (dragStartLocalY || 1);
      } else {
        // Uniform Proportional scale (Scale đúng tỉ lệ khi kéo bình thường)
        const ratio = currentDist / (dragStartDist || 1);
        ratioX = ratio;
        ratioY = ratio;
      }

      // Reset scale = 1 so strokeWidth is ALWAYS 100% uniform around all sides!
      activeObj.scale = 1;
      activeObj.scaleX = 1;
      activeObj.scaleY = 1;

      if (activeObj.type === 'shape') {
        activeObj.width = Math.max(12, (dragStartWidth || 40) * ratioX);
        activeObj.height = Math.max(12, (dragStartHeight || 40) * ratioY);
        if (activeObj.shapeType === 'polygonal' && dragStartPoints && dragStartPoints.length > 0) {
          activeObj.points = dragStartPoints.map(p => ({
            x: p.x * ratioX,
            y: p.y * ratioY
          }));
        }
      } else if (activeObj.type === 'brush') {
        if (dragStartPoints && dragStartPoints.length > 0) {
          activeObj.points = dragStartPoints.map(p => ({
            x: p.x * ratioX,
            y: p.y * ratioY
          }));
        }
      } else if (activeObj.type === 'text') {
        const scaleFactor = (e && e.shiftKey) ? ratioY : ratioX;
        activeObj.fontSize = Math.max(8, (dragStartFontSize || 28) * scaleFactor);
      }

      renderCompositeCanvas();
      return;
    }

    if (isDraggingText && dragTextObj) {
      markSessionDirty();
      const dx = pos.x - dragStartCanvasX;
      const dy = pos.y - dragStartCanvasY;
      dragTextObj.x = dragTextStartX + dx;
      dragTextObj.y = dragTextStartY + dy;
      renderCompositeCanvas();
      return;
    }

    // Update Cursor depending on handles hover
    if (editCanvas && activeObj) {
      const bounds = activeObj.type === 'brush'
        ? getBrushObjectBounds(activeObj)
        : (activeObj.type === 'shape'
          ? getShapeObjectBounds(activeObj)
          : getTextObjectBounds(activeObj));
      const local = worldToLocal(pos, activeObj);
      const scaleRatio = getScreenScaleRatio();
      const hitRadiusCanvas = 22 * scaleRatio;

      const distRotate = Math.hypot(local.lx - bounds.halfW, local.ly - (-bounds.halfH));
      const distScale = Math.hypot(local.lx - bounds.halfW, local.ly - bounds.halfH);

      if (distRotate <= hitRadiusCanvas) {
        editCanvas.style.cursor = 'grab';
        return;
      }
      if (distScale <= hitRadiusCanvas) {
        editCanvas.style.cursor = 'nwse-resize';
        return;
      }

      const hitObj = findVectorObjectAtCanvas(pos);
      if (hitObj) {
        editCanvas.style.cursor = 'move';
      } else {
        editCanvas.style.cursor = 'default';
      }
    }
    return;
  }

  if (editorMode === 'brush') {
    updateBrushCursorPosition(e);
    if (isDrawing) {
      if (isLazyMouse) {
        smoothX += (pos.x - smoothX) * 0.25;
        smoothY += (pos.y - smoothY) * 0.25;
        drawSegment(lastX, lastY, smoothX, smoothY, pos.renderRect);
        lastX = smoothX;
        lastY = smoothY;
      } else {
        drawSegment(lastX, lastY, pos.x, pos.y, pos.renderRect);
        lastX = pos.x;
        lastY = pos.y;
      }
    }
  }
}
window.handleCanvasMouseMove = handleCanvasMouseMove;

function handleCanvasMouseUp() {
  if (isDrawingShape && currentShapeObj) {
    isDrawingShape = false;
    if (currentShapeObj.width > 4 || currentShapeObj.height > 4) {
      markSessionDirty();
      editorObjects.push(currentShapeObj);
      selectedBrushObj = currentShapeObj;
      selectedTextObj = null;
      setEditorMode('idle');
      renderCompositeCanvas();
      saveUndoState();
    }
    currentShapeObj = null;
    return;
  }

  if (isDrawing) {
    isDrawing = false;
    if (currentStrokePoints.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      currentStrokePoints.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const localPoints = currentStrokePoints.map(p => ({
        x: p.x - centerX,
        y: p.y - centerY
      }));

      const actualStrokeWidth = (typeof computeNaturalStrokeWidth === 'function')
        ? computeNaturalStrokeWidth(brushSize, brushSizeMode)
        : brushSize;

      const newBrushObj = {
        id: 'brush_' + Date.now(),
        type: 'brush',
        x: centerX,
        y: centerY,
        points: localPoints,
        color: brushColor,
        opacity: brushOpacity,
        size: brushSize,
        sizeMode: brushSizeMode,
        strokeWidth: actualStrokeWidth,
        rotation: 0,
        scale: 1
      };

      markSessionDirty();
      commitObjectSession();
      editorObjects.push(newBrushObj);
      currentStrokePoints = [];
    }
    renderCompositeCanvas();
    saveUndoState();
  }
}
window.handleCanvasMouseUp = handleCanvasMouseUp;

function createNewTextObject(e = null) {
  if (selectedTextObj) {
    selectedTextObj.isEditingText = false;
  }
  if (window.cleanupEmptyTextObjects) window.cleanupEmptyTextObjects();

  if (!editCanvas) return;
  const modalImg = document.getElementById('modal-image-preview');

  let canvasX = editCanvas.width / 2;
  let canvasY = editCanvas.height / 2;

  let initialFontSize = 32;
  if (modalImg) {
    const renderRect = getImageRenderedRect(modalImg);
    if (renderRect.width > 0) {
      const scaleRatio = editCanvas.width / renderRect.width;
      const targetScreenFontSize = 35;
      initialFontSize = Math.round(targetScreenFontSize * scaleRatio);

      // Compute exact center of the visible modal window / viewport
      const modalBox = modalImg.parentNode ? modalImg.parentNode.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const modalCenterX = modalBox.left + modalBox.width / 2;
      const modalCenterY = modalBox.top + modalBox.height / 2;

      canvasX = ((modalCenterX - renderRect.left) / (renderRect.width || 1)) * editCanvas.width;
      canvasY = ((modalCenterY - renderRect.top) / (renderRect.height || 1)) * editCanvas.height;
    }
  }

  commitObjectSession();
  const newObj = {
    id: 'text_' + Date.now(),
    type: 'text',
    text: '',
    placeholder: 'Type text...',
    x: canvasX,
    y: canvasY,
    color: textColor || '#000000',
    backgroundColor: textBgColor || 'transparent',
    align: textAlign || 'left',
    fontWeight: textWeight || 'bold',
    fontStyle: textStyle || 'normal',
    textDecoration: textDecoration || 'none',
    fontSize: initialFontSize,
    rotation: 0,
    scale: 1,
    isEditingText: true,
    cursorIndex: 0,
    selectionStart: 0,
    selectionEnd: 0
  };

  markSessionDirty();
  editorObjects.push(newObj);
  selectedTextObj = newObj;
  selectedBrushObj = null;

  editorMode = 'idle';
  const brushToolBtn = document.getElementById('edit-brush-tool-btn');
  const idleModeBtn = document.getElementById('edit-idle-mode-btn');
  const textToolBtn = document.getElementById('edit-text-tool-btn');
  const brushPanel = document.getElementById('edit-brush-panel');

  if (idleModeBtn) idleModeBtn.classList.add('active');
  if (brushToolBtn) brushToolBtn.classList.remove('active');
  if (textToolBtn) textToolBtn.classList.remove('active');
  if (brushPanel) brushPanel.classList.add('hidden');

  startObjectSession();
  renderCompositeCanvas();
  saveUndoState();
  startCaretBlink();
}
window.createNewTextObject = createNewTextObject;

function drawSegment(x1, y1, x2, y2, renderRect) {
  if (!editCtx || !editCanvas) return;

  if (currentStrokePoints.length === 0) {
    currentStrokePoints.push({ x: x1, y: y1 });
  }
  currentStrokePoints.push({ x: x2, y: y2 });

  const strokeWidth = (typeof getCanvasLineWidth === 'function')
    ? getCanvasLineWidth(brushSize, brushSizeMode)
    : brushSize;
  currentStrokeCanvasSize = strokeWidth;

  const style = hexToRgba(brushColor, brushOpacity);
  editCtx.beginPath();
  editCtx.moveTo(x1, y1);
  editCtx.lineTo(x2, y2);
  editCtx.strokeStyle = style;
  editCtx.lineWidth = strokeWidth;
  editCtx.lineCap = 'round';
  editCtx.lineJoin = 'round';
  editCtx.stroke();
}
window.drawSegment = drawSegment;

function startGlobalWindowDrag(e) {
  window.addEventListener('mousemove', handleGlobalWindowMouseMove, true);
  window.addEventListener('mouseup', handleGlobalWindowMouseUp, true);
}
window.startGlobalWindowDrag = startGlobalWindowDrag;

function handleGlobalWindowMouseMove(e) {
  if (!isEditMode) return;
  handleCanvasMouseMove(e);
}
window.handleGlobalWindowMouseMove = handleGlobalWindowMouseMove;

function commitObjectScaleTransform(activeObj) {
  if (!activeObj) return;
  const s = activeObj.scale || 1;
  if (Math.abs(s - 1) < 0.001) return;

  if (activeObj.type === 'brush') {
    activeObj.size = Number(((activeObj.size || 15) * s).toFixed(1));

    activeObj.strokeWidth = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(activeObj.size, activeObj.sizeMode || brushSizeMode)
      : activeObj.size;

    if (activeObj.points && activeObj.points.length > 0) {
      activeObj.points = activeObj.points.map(pt => ({
        x: pt.x * s,
        y: pt.y * s
      }));
    }

    activeObj.scale = 1;
  } else if (activeObj.type === 'shape') {
    activeObj.width = Math.round((activeObj.width || 40) * s);
    activeObj.height = Math.round((activeObj.height || 40) * s);
    activeObj.size = Number(((activeObj.size || 15) * s).toFixed(1));
    activeObj.strokeWidth = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(activeObj.size, activeObj.sizeMode || brushSizeMode)
      : activeObj.size;
    activeObj.scale = 1;
  } else if (activeObj.type === 'text') {
    activeObj.fontSize = Math.round((activeObj.fontSize || 24) * s);
    activeObj.scale = 1;
  }
}
window.commitObjectScaleTransform = commitObjectScaleTransform;

function handleGlobalWindowMouseUp(e) {
  if (isDraggingText || isRotatingText || isScalingText) {
    if (isScalingText) {
      const activeObj = getSelectedObject();
      if (activeObj) {
        commitObjectScaleTransform(activeObj);
      }
    }
    isDraggingText = false;
    isRotatingText = false;
    isScalingText = false;
    dragTextObj = null;
    renderCompositeCanvas();
    saveUndoState();
  }
  window.removeEventListener('mousemove', handleGlobalWindowMouseMove, true);
  window.removeEventListener('mouseup', handleGlobalWindowMouseUp, true);
}
window.handleGlobalWindowMouseUp = handleGlobalWindowMouseUp;

// Native Image Context Menu Pass-Through (Allows full Chrome native <img> right-click context menu)
window.addEventListener('pointerdown', (e) => {
  if (e.button === 2 && !window.isDrawingPolygonal) {
    if (editCanvas) editCanvas.style.pointerEvents = 'none';
    const svgOverlay = document.getElementById('edit-ui-vector-overlay');
    if (svgOverlay) svgOverlay.style.pointerEvents = 'none';
  }
}, true);

window.addEventListener('contextmenu', () => {
  setTimeout(() => {
    if (editCanvas) editCanvas.style.pointerEvents = 'auto';
    const svgOverlay = document.getElementById('edit-ui-vector-overlay');
    if (svgOverlay) svgOverlay.style.pointerEvents = '';
  }, 40);
}, true);
