// Preview Modal Image Editor - Math & Hit-Testing Module (image_previewmodal-editor-math.js)

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex === 'transparent') return 'transparent';
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
window.hexToRgba = hexToRgba;

// Calculate exact visible image bounds on screen (excluding letterbox padding)
function getImageRenderedRect(img) {
  const rect = img.getBoundingClientRect();
  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;

  const imgRatio = naturalWidth / naturalHeight;
  const containerRatio = rect.width / rect.height;

  let renderWidth = rect.width;
  let renderHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (containerRatio > imgRatio) {
    renderWidth = rect.height * imgRatio;
    offsetX = (rect.width - renderWidth) / 2;
  } else {
    renderHeight = rect.width / imgRatio;
    offsetY = (rect.height - renderHeight) / 2;
  }

  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: renderWidth,
    height: renderHeight
  };
}
window.getImageRenderedRect = getImageRenderedRect;

function getScreenScaleRatio() {
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg || !editCanvas) return 1;
  const displayW = modalImg.clientWidth || modalImg.offsetWidth || 1;
  return editCanvas.width / displayW;
}
window.getScreenScaleRatio = getScreenScaleRatio;

function getZoomScale() {
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg) return 1;
  const displayW = modalImg.clientWidth || modalImg.offsetWidth || 1;
  const renderRect = (typeof getImageRenderedRect === 'function') ? getImageRenderedRect(modalImg) : { width: displayW };
  return (renderRect.width || displayW) / displayW;
}
window.getZoomScale = getZoomScale;

// Centralized 2D Canvas Line Width Helper (for editCtx.lineWidth)
function getCanvasLineWidth(size, sizeMode) {
  const baseSize = size || 15;
  const mode = sizeMode || window.brushSizeMode || 'absolute';
  if (mode === 'relative') {
    return baseSize;
  }
  const baseScaleRatio = getScreenScaleRatio();
  const zoomScale = getZoomScale();
  return (baseSize * baseScaleRatio) / (zoomScale || 1);
}
window.getCanvasLineWidth = getCanvasLineWidth;

// Centralized Natural Image Canvas Stroke Width Calculation
function computeNaturalStrokeWidth(size, sizeMode) {
  const baseSize = size || 15;
  const mode = sizeMode || 'absolute';
  if (mode === 'relative') {
    return baseSize;
  }
  const baseScaleRatio = getScreenScaleRatio();
  const zoomScale = getZoomScale();
  return (baseSize * baseScaleRatio) / (zoomScale || 1);
}
window.computeNaturalStrokeWidth = computeNaturalStrokeWidth;

// Centralized Brush Cursor Ring Screen Diameter Helper (for #edit-brush-cursor-ring)
function getBrushCursorScreenDiameter(size, sizeMode) {
  const baseSize = size || 15;
  const mode = sizeMode || window.brushSizeMode || 'absolute';
  if (mode === 'absolute') {
    return Math.max(4, baseSize);
  }
  const baseScaleRatio = getScreenScaleRatio();
  const zoomScale = getZoomScale();
  const screenDiameter = (baseSize / baseScaleRatio) * zoomScale;
  return Math.max(4, screenDiameter);
}
window.getBrushCursorScreenDiameter = getBrushCursorScreenDiameter;

function getCanvasCoordinates(e) {
  const modalImg = document.getElementById('modal-image-preview');
  const renderRect = getImageRenderedRect(modalImg);

  const mouseX = e.clientX - renderRect.left;
  const mouseY = e.clientY - renderRect.top;

  const canvasX = (mouseX / renderRect.width) * editCanvas.width;
  const canvasY = (mouseY / renderRect.height) * editCanvas.height;

  return { x: canvasX, y: canvasY, renderRect };
}
window.getCanvasCoordinates = getCanvasCoordinates;

function worldToLocal(pos, obj) {
  const dx = pos.x - obj.x;
  const dy = pos.y - obj.y;
  const rot = obj.rotation || 0;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  return {
    lx: dx * cos - dy * sin,
    ly: dx * sin + dy * cos
  };
}
window.worldToLocal = worldToLocal;

function getTextObjectBounds(obj) {
  if (!editCtx) return { width: 100, height: 40, halfW: 50, halfH: 20, effectiveFontSize: 28, lineHeight: 36 };
  const sx = obj.scaleX || obj.scale || 1;
  const sy = obj.scaleY || obj.scale || 1;
  const fontSize = obj.fontSize || 28;
  const effectiveFontSize = fontSize * sy;
  editCtx.save();
  editCtx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${effectiveFontSize}px sans-serif`;

  const displayText = (obj.text && obj.text.length > 0) ? obj.text : (obj.placeholder || 'Type text...');
  const lines = displayText.split('\n');
  let maxW = 0;
  lines.forEach(line => {
    const w = editCtx.measureText(line).width;
    if (w > maxW) maxW = w;
  });
  if (maxW === 0) {
    maxW = editCtx.measureText('M').width;
  }
  editCtx.restore();

  const lineHeight = effectiveFontSize * 1.3;
  const paddingX = 16 * sx;
  const paddingY = 12 * sy;
  const width = Math.max(48 * sx, maxW + paddingX * 2);
  const height = Math.max(32 * sy, lines.length * lineHeight + paddingY * 2);

  return {
    width,
    height,
    halfW: width / 2,
    halfH: height / 2,
    effectiveFontSize,
    lineHeight
  };
}
function normalizeObjectScale(obj) {
  if (!obj) return;
  const sx = obj.scaleX || obj.scale || 1;
  const sy = obj.scaleY || obj.scale || 1;
  if (sx === 1 && sy === 1) return;

  if (obj.type === 'shape') {
    obj.width = (obj.width || 40) * sx;
    obj.height = (obj.height || 40) * sy;
  } else if (obj.type === 'brush' && obj.points) {
    obj.points = obj.points.map(p => ({ x: p.x * sx, y: p.y * sy }));
  } else if (obj.type === 'text') {
    obj.fontSize = (obj.fontSize || 28) * sy;
  }
  obj.scale = 1;
  obj.scaleX = 1;
  obj.scaleY = 1;
}
window.normalizeObjectScale = normalizeObjectScale;

function getShapeObjectBounds(shapeObj) {
  const sx = shapeObj.scaleX || shapeObj.scale || 1;
  const sy = shapeObj.scaleY || shapeObj.scale || 1;
  const strokeW = (shapeObj.strokeWidth || 1) * Math.max(sx, sy);

  if (shapeObj.shapeType === 'polygonal' && shapeObj.points && shapeObj.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapeObj.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const pad = strokeW / 2 + 8;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;

    const width = Math.max(32 * sx, (maxX - minX) * sx);
    const height = Math.max(32 * sy, (maxY - minY) * sy);
    return {
      width,
      height,
      halfW: width / 2,
      halfH: height / 2
    };
  }

  const width = Math.max(16, (shapeObj.width || 40) * sx) + strokeW;
  const height = Math.max(16, (shapeObj.height || 40) * sy) + strokeW;
  return {
    width,
    height,
    halfW: width / 2,
    halfH: height / 2
  };
}
window.getShapeObjectBounds = getShapeObjectBounds;

function getBrushObjectBounds(brushObj) {
  const sx = brushObj.scaleX || brushObj.scale || 1;
  const sy = brushObj.scaleY || brushObj.scale || 1;
  if (!brushObj.points || brushObj.points.length === 0) {
    return { width: 40 * sx, height: 40 * sy, halfW: 20 * sx, halfH: 20 * sy };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  brushObj.points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const pad = (brushObj.size || 15) / 2 + 10;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const width = Math.max(40 * sx, (maxX - minX) * sx);
  const height = Math.max(40 * sy, (maxY - minY) * sy);

  return {
    width,
    height,
    halfW: width / 2,
    halfH: height / 2
  };
}
window.getBrushObjectBounds = getBrushObjectBounds;

function distToSegmentSquared(px, py, ax, ay, bx, by) {
  const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (l2 === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}
window.distToSegmentSquared = distToSegmentSquared;

function isPointNearStrokePoints(pos, obj) {
  if (!obj || !obj.points || obj.points.length === 0) return false;

  const local = worldToLocal(pos, obj);
  const bounds = obj.type === 'brush' ? getBrushObjectBounds(obj) : getShapeObjectBounds(obj);

  if (Math.abs(local.lx) > bounds.halfW || Math.abs(local.ly) > bounds.halfH) {
    return false;
  }

  const sx = obj.scaleX || obj.scale || 1;
  const sy = obj.scaleY || obj.scale || 1;
  const lx = local.lx / sx;
  const ly = local.ly / sy;

  const strokeWidth = obj.strokeWidth || obj.size || 15;
  const hitRadius = (strokeWidth / 2) + 12; // 12px forgiving touch margin
  const maxDistSq = hitRadius * hitRadius;

  if (obj.points.length === 1) {
    const dx = lx - obj.points[0].x;
    const dy = ly - obj.points[0].y;
    return (dx * dx + dy * dy) <= maxDistSq;
  }

  for (let i = 1; i < obj.points.length; i++) {
    const p1 = obj.points[i - 1];
    const p2 = obj.points[i];
    const dSq = distToSegmentSquared(lx, ly, p1.x, p1.y, p2.x, p2.y);
    if (dSq <= maxDistSq) return true;
  }
  return false;
}
window.isPointNearStrokePoints = isPointNearStrokePoints;

function isPointNearVectorObject(pos, obj) {
  if (!obj) return false;

  if (obj.type === 'shape') {
    const local = worldToLocal(pos, obj);
    const bounds = getShapeObjectBounds(obj);
    const hitMargin = 12;
    if (obj.shapeType === 'polygonal') {
      return isPointNearStrokePoints(pos, obj);
    } else if (obj.shapeType === 'ellipse') {
      const rx = bounds.halfW + hitMargin;
      const ry = bounds.halfH + hitMargin;
      return ((local.lx * local.lx) / (rx * rx) + (local.ly * local.ly) / (ry * ry)) <= 1;
    } else {
      return Math.abs(local.lx) <= bounds.halfW + hitMargin && Math.abs(local.ly) <= bounds.halfH + hitMargin;
    }
  }

  // 1. Brush Object Hit Test (Distance to drawn stroke segments)
  if (obj.type === 'brush') {
    return isPointNearStrokePoints(pos, obj);
  }

  // 2. Text Object Hit Test (Exact character/line bounding boxes or solid background)
  const local = worldToLocal(pos, obj);
  const bounds = getTextObjectBounds(obj);

  if (Math.abs(local.lx) > bounds.halfW + 8 || Math.abs(local.ly) > bounds.halfH + 8) {
    return false;
  }

  if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
    return Math.abs(local.lx) <= bounds.halfW && Math.abs(local.ly) <= bounds.halfH;
  }

  const isPlaceholder = !obj.text || obj.text.length === 0;
  const displayText = isPlaceholder ? (obj.placeholder || 'Type text...') : obj.text;
  const lines = displayText.split('\n');
  const startY = -((lines.length - 1) * bounds.lineHeight) / 2;

  if (!editCtx) return Math.abs(local.lx) <= bounds.halfW && Math.abs(local.ly) <= bounds.halfH;

  editCtx.save();
  editCtx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${bounds.effectiveFontSize}px sans-serif`;

  let isHit = false;
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] || '';
    const lineY = startY + i * bounds.lineHeight;
    const halfLineH = bounds.lineHeight / 2 + 4;

    if (Math.abs(local.ly - lineY) <= halfLineH) {
      const lineWidth = editCtx.measureText(lineText).width;
      let lineLeft = 0;

      if (obj.align === 'left') {
        lineLeft = -bounds.halfW + 16;
      } else if (obj.align === 'right') {
        lineLeft = bounds.halfW - 16 - lineWidth;
      } else {
        lineLeft = -lineWidth / 2;
      }

      const pad = 10;
      if (local.lx >= lineLeft - pad && local.lx <= lineLeft + lineWidth + pad) {
        isHit = true;
        break;
      }
    }
  }

  editCtx.restore();
  return isHit;
}
window.isPointNearVectorObject = isPointNearVectorObject;

function findVectorObjectAtCanvas(pos) {
  for (let i = editorObjects.length - 1; i >= 0; i--) {
    const obj = editorObjects[i];
    if (isPointNearVectorObject(pos, obj)) {
      return obj;
    }
  }
  return null;
}
window.findVectorObjectAtCanvas = findVectorObjectAtCanvas;

function findTextObjectAtCanvas(pos) {
  return findVectorObjectAtCanvas(pos);
}
window.findTextObjectAtCanvas = findTextObjectAtCanvas;

function findBrushObjectAtCanvas(pos) {
  return findVectorObjectAtCanvas(pos);
}
window.findBrushObjectAtCanvas = findBrushObjectAtCanvas;
