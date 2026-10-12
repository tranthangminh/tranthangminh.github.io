// Preview Modal Image Editor - Rendering Engine Module (image_previewmodal-editor-renderer.js)

function renderCompositeCanvas() {
  if (!editCtx || !editCanvas) return;
  editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);

  editorObjects.forEach(obj => {
    if (obj.type === 'brush') {
      renderSingleBrushObjectOnCanvas(obj);
    } else if (obj.type === 'shape') {
      renderSingleShapeObjectOnCanvas(obj);
    } else {
      renderSingleTextObjectOnCanvas(obj);
    }
  });

  // Render Live Polygonal Drawing Preview
  if (window.isDrawingPolygonal && window.currentPolygonalPoints && window.currentPolygonalPoints.length > 0) {
    editCtx.save();
    editCtx.beginPath();
    const pts = window.currentPolygonalPoints;
    editCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      editCtx.lineTo(pts[i].x, pts[i].y);
    }
    if (window.polygonalPreviewMousePos) {
      editCtx.lineTo(window.polygonalPreviewMousePos.x, window.polygonalPreviewMousePos.y);
    }
    const strokeW = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(brushSize || 15, brushSizeMode || 'absolute')
      : (brushSize || 15);
    editCtx.strokeStyle = hexToRgba(brushColor || '#67e8f9', 1);
    editCtx.lineWidth = strokeW;
    editCtx.lineCap = 'round';
    editCtx.lineJoin = 'round';
    editCtx.stroke();
    editCtx.restore();
  }

  if (window.updateVectorUiOverlay) window.updateVectorUiOverlay();
}
window.renderCompositeCanvas = renderCompositeCanvas;

function renderSingleShapeObjectOnCanvas(obj) {
  if (!editCtx || !editCanvas) return;
  editCtx.save();
  editCtx.translate(obj.x, obj.y);
  editCtx.rotate(obj.rotation || 0);

  const sx = obj.scaleX || obj.scale || 1;
  const sy = obj.scaleY || obj.scale || 1;
  editCtx.scale(sx, sy);

  const w = obj.width || 40;
  const h = obj.height || 40;

  if (obj.shapeType === 'polygonal' && obj.points && obj.points.length > 0) {
    editCtx.beginPath();
    editCtx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let i = 1; i < obj.points.length; i++) {
      editCtx.lineTo(obj.points[i].x, obj.points[i].y);
    }
  } else if (obj.shapeType === 'ellipse') {
    editCtx.beginPath();
    editCtx.ellipse(0, 0, Math.max(0.1, w / 2), Math.max(0.1, h / 2), 0, 0, Math.PI * 2);
  } else {
    editCtx.beginPath();
    const sides = obj.sides || 4;
    if (sides === 4) {
      editCtx.rect(-w / 2, -h / 2, w, h);
    } else {
      const rx = w / 2;
      const ry = h / 2;
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2);
        const px = rx * Math.cos(angle);
        const py = ry * Math.sin(angle);
        if (i === 0) editCtx.moveTo(px, py);
        else editCtx.lineTo(px, py);
      }
      editCtx.closePath();
    }
  }

  if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
    editCtx.fillStyle = hexToRgba(obj.backgroundColor, obj.bgOpacity ?? 1);
    editCtx.fill();
  }

  let effectiveLineWidth = obj.strokeWidth;
  if (typeof effectiveLineWidth !== 'number') {
    effectiveLineWidth = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(obj.size || 15, obj.sizeMode || brushSizeMode)
      : (obj.size || 15);
    obj.strokeWidth = effectiveLineWidth;
  }

  if (effectiveLineWidth > 0 && obj.color && obj.color !== 'transparent') {
    editCtx.strokeStyle = hexToRgba(obj.color || '#67e8f9', obj.opacity ?? 1);
    editCtx.lineWidth = effectiveLineWidth;
    editCtx.lineCap = 'round';
    editCtx.lineJoin = 'round';
    editCtx.stroke();
  }

  editCtx.restore();
}
window.renderSingleShapeObjectOnCanvas = renderSingleShapeObjectOnCanvas;

function renderSingleBrushObjectOnCanvas(obj) {
  if (!editCtx || !editCanvas || !obj.points || obj.points.length === 0) return;
  editCtx.save();
  editCtx.translate(obj.x, obj.y);
  editCtx.rotate(obj.rotation || 0);

  const sx = obj.scaleX || obj.scale || 1;
  const sy = obj.scaleY || obj.scale || 1;
  editCtx.scale(sx, sy);

  editCtx.beginPath();
  editCtx.moveTo(obj.points[0].x, obj.points[0].y);
  for (let i = 1; i < obj.points.length; i++) {
    editCtx.lineTo(obj.points[i].x, obj.points[i].y);
  }

  let effectiveLineWidth = obj.strokeWidth;
  if (typeof effectiveLineWidth !== 'number') {
    effectiveLineWidth = (typeof computeNaturalStrokeWidth === 'function')
      ? computeNaturalStrokeWidth(obj.size || 15, obj.sizeMode || brushSizeMode)
      : (obj.size || 15);
    obj.strokeWidth = effectiveLineWidth;
  }

  editCtx.strokeStyle = hexToRgba(obj.color || '#67e8f9', obj.opacity ?? 1);
  editCtx.lineWidth = effectiveLineWidth;
  editCtx.lineCap = 'round';
  editCtx.lineJoin = 'round';
  editCtx.stroke();
  editCtx.restore();
}
window.renderSingleBrushObjectOnCanvas = renderSingleBrushObjectOnCanvas;

function renderAllBrushObjectsOnCanvas() {
  if (!editCtx || !editCanvas) return;
  editorObjects.filter(o => o.type === 'brush').forEach(renderSingleBrushObjectOnCanvas);
}
window.renderAllBrushObjectsOnCanvas = renderAllBrushObjectsOnCanvas;

function renderSingleTextObjectOnCanvas(obj) {
  if (!editCtx || !editCanvas || (!obj.text && !obj.placeholder)) return;
  const bounds = getTextObjectBounds(obj);
  editCtx.save();

  // Translate & Rotate canvas to obj center
  editCtx.translate(obj.x, obj.y);
  editCtx.rotate(obj.rotation || 0);

  const isPlaceholder = !obj.text || obj.text.length === 0;
  const displayText = isPlaceholder ? (obj.placeholder || 'Type text...') : obj.text;

  // Render Text Background Block matching vector-hit-rect 100%
  if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
    const bgOpacity = obj.bgOpacity ?? 1;
    editCtx.fillStyle = hexToRgba(obj.backgroundColor, bgOpacity);
    const rectX = -bounds.halfW;
    const rectY = -bounds.halfH;
    const rectW = bounds.width;
    const rectH = bounds.height;
    const rx = 6;
    editCtx.beginPath();
    if (editCtx.roundRect) {
      editCtx.roundRect(rectX, rectY, rectW, rectH, rx);
    } else {
      editCtx.rect(rectX, rectY, rectW, rectH);
    }
    editCtx.fill();
  }

  // 2. Render Text Characters Font Setup
  editCtx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${bounds.effectiveFontSize}px sans-serif`;
  editCtx.textAlign = obj.align || 'center';
  editCtx.textBaseline = 'middle';

  // 3. Render Translucent Cyan Selection Highlight if active (Ctrl+A or Double-click)
  if (editorMode === 'idle' && selectedTextObj && selectedTextObj.id === obj.id && !isPlaceholder) {
    const sStart = Math.min(selectedTextObj.selectionStart ?? 0, selectedTextObj.selectionEnd ?? 0);
    const sEnd = Math.max(selectedTextObj.selectionStart ?? 0, selectedTextObj.selectionEnd ?? 0);

    if (sStart < sEnd && obj.text) {
      const textStr = obj.text;
      const linesArr = textStr.split('\n');
      let charCounter = 0;

      linesArr.forEach((lineText, lineIndex) => {
        const lineStartIdx = charCounter;
        const lineEndIdx = charCounter + lineText.length;
        charCounter += lineText.length + 1;

        const overlapStart = Math.max(sStart, lineStartIdx);
        const overlapEnd = Math.min(sEnd, lineEndIdx);

        if (overlapStart < overlapEnd) {
          const subStartCol = overlapStart - lineStartIdx;
          const subEndCol = overlapEnd - lineStartIdx;
          const prefixW = editCtx.measureText(lineText.substring(0, subStartCol)).width;
          const selW = editCtx.measureText(lineText.substring(subStartCol, subEndCol)).width;
          const fullW = editCtx.measureText(lineText).width;

          let hlX = 0;
          if (obj.align === 'left') hlX = -bounds.halfW + 16 + prefixW;
          else if (obj.align === 'right') hlX = bounds.halfW - 16 - fullW + prefixW;
          else hlX = -fullW / 2 + prefixW;

          const startY = -((linesArr.length - 1) * bounds.lineHeight) / 2;
          const lineY = startY + lineIndex * bounds.lineHeight;
          editCtx.fillStyle = 'rgba(6, 182, 212, 0.35)';
          editCtx.fillRect(hlX, lineY - bounds.effectiveFontSize / 2 - 2, selW, bounds.effectiveFontSize + 4);
        }
      });
    }
  }

  // 4. Render Text Characters (Filled)
  const textOpacity = obj.opacity ?? 1;
  editCtx.fillStyle = isPlaceholder 
    ? 'rgba(161, 161, 170, 0.6)' 
    : hexToRgba(obj.color || '#000000', textOpacity);
  editCtx.textAlign = obj.align || 'center';
  editCtx.textBaseline = 'middle';

  const lines = displayText.split('\n');
  const startY = -((lines.length - 1) * bounds.lineHeight) / 2;

  lines.forEach((line, i) => {
    let lineX = 0;
    if (obj.align === 'left') lineX = -bounds.halfW + 16;
    else if (obj.align === 'right') lineX = bounds.halfW - 16;
    const currentY = startY + i * bounds.lineHeight;
    editCtx.fillText(line, lineX, currentY);

    if (obj.textDecoration === 'underline' && !isPlaceholder && line) {
      editCtx.save();
      const lineWidth = editCtx.measureText(line).width;
      let startX = lineX;
      if (obj.align === 'left') startX = -bounds.halfW + 16;
      else if (obj.align === 'right') startX = bounds.halfW - 16 - lineWidth;
      else startX = -lineWidth / 2;

      const underlineY = currentY + bounds.effectiveFontSize / 2 + 2;
      editCtx.beginPath();
      editCtx.moveTo(startX, underlineY);
      editCtx.lineTo(startX + lineWidth, underlineY);
      editCtx.strokeStyle = hexToRgba(obj.color || '#000000', textOpacity);
      editCtx.lineWidth = Math.max(1.5, bounds.effectiveFontSize * 0.08);
      editCtx.stroke();
      editCtx.restore();
    }
  });

  // Render Blinking Caret Line if in Inline Editing Mode
  if (editorMode === 'idle' && selectedTextObj && selectedTextObj.id === obj.id && selectedTextObj.isEditingText) {
    const textStr = obj.text || '';
    const targetIdx = Math.min(textStr.length, Math.max(0, obj.cursorIndex ?? textStr.length));
    const linesArr = textStr.split('\n');

    let charCount = 0;
    let targetLineIdx = 0;
    let targetColIdx = 0;

    for (let l = 0; l < linesArr.length; l++) {
      const lineLen = linesArr[l].length;
      if (targetIdx <= charCount + lineLen) {
        targetLineIdx = l;
        targetColIdx = targetIdx - charCount;
        break;
      }
      charCount += lineLen + 1;
    }

    const targetLineText = linesArr[targetLineIdx] || '';
    const subText = targetLineText.substring(0, targetColIdx);
    editCtx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${bounds.effectiveFontSize}px sans-serif`;
    const subWidth = editCtx.measureText(subText).width;
    const fullLineWidth = editCtx.measureText(targetLineText).width;

    let caretX = 0;
    if (obj.align === 'left') caretX = -bounds.halfW + 16 + subWidth;
    else if (obj.align === 'right') caretX = bounds.halfW - 16 - fullLineWidth + subWidth;
    else caretX = -fullLineWidth / 2 + subWidth;

    const caretY = startY + targetLineIdx * bounds.lineHeight;

    if (Math.floor(Date.now() / 400) % 2 === 0) {
      editCtx.beginPath();
      editCtx.moveTo(caretX, caretY - bounds.effectiveFontSize / 2);
      editCtx.lineTo(caretX, caretY + bounds.effectiveFontSize / 2);
      editCtx.strokeStyle = '#06b6d4';
      editCtx.lineWidth = 3;
      editCtx.stroke();
    }
  }

  editCtx.restore();
}
window.renderSingleTextObjectOnCanvas = renderSingleTextObjectOnCanvas;

function renderAllTextObjectsOnCanvas() {
  if (!editCtx || !editCanvas) return;
  editorObjects.filter(o => o.type !== 'brush').forEach(renderSingleTextObjectOnCanvas);
}
window.renderAllTextObjectsOnCanvas = renderAllTextObjectsOnCanvas;

let caretAnimFrame = null;
function startCaretBlink() {
  if (caretAnimFrame) return;
  const loop = () => {
    if (isEditMode && editorMode === 'idle' && selectedTextObj) {
      renderCompositeCanvas();
      caretAnimFrame = requestAnimationFrame(loop);
    } else {
      caretAnimFrame = null;
    }
  };
  caretAnimFrame = requestAnimationFrame(loop);
}
window.startCaretBlink = startCaretBlink;

function syncCanvasOverlayPosition() {
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg || !editCanvas || !isEditMode) return;

  editCanvas.style.left = `${modalImg.offsetLeft}px`;
  editCanvas.style.top = `${modalImg.offsetTop}px`;
  editCanvas.style.width = `${modalImg.offsetWidth}px`;
  editCanvas.style.height = `${modalImg.offsetHeight}px`;
  editCanvas.style.transform = modalImg.style.transform;
}
window.syncCanvasOverlayPosition = syncCanvasOverlayPosition;

function commitActiveTextOverlay() {
  renderCompositeCanvas();
}
window.commitActiveTextOverlay = commitActiveTextOverlay;
