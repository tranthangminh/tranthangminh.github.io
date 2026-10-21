/**
 * floating-tools-web-draw.js — Design-Power Pack by Max
 * Direct On-Webpage Drawing Engine with Viewport Canvas, Full Vector Controls & UI Priority
 */

(function () {
  'use strict';

  if (window !== window.top) return;
  if (window.__maxWebDrawInitialized) return;
  window.__maxWebDrawInitialized = true;

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000',
    '#67e8f9', '#a855f7', '#84cc16', '#e2e8f0', '#64748b'
  ];

  let isWebDrawActive = false;
  let isDrawingsHidden = false;
  let currentMode = 'select'; // 'select' | 'brush' | 'shape' | 'text'
  let currentShapeType = 'rect'; // 'rect' | 'ellipse' | 'polygonal'
  let strokeColor = '#67e8f9';
  let strokeWidth = 6;
  let strokeOpacity = 1;
  let fillColor = 'transparent';

  let objects = [];
  let undoStack = [];
  let redoStack = [];

  let canvas = null;
  let ctx = null;
  let toolbarEl = null;
  let popoverEl = null;
  let shapePanelEl = null;
  let vectorOverlaySvg = null;

  let isDrawing = false;
  let isDraggingObject = false;
  let isRotating = false;
  let isScaling = false;

  let selectedObj = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let rotateStartAngle = 0;
  let rotateStartMouseAngle = 0;
  let scaleStartDist = 1;
  let scaleStartObjScale = 1;

  let lastTextClickTime = 0;
  let lastTextClickObj = null;

  let currentPoints = [];
  let currentShapePreview = null;
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

  function hexToRgba(hex, alpha = 1) {
    if (!hex || hex === 'transparent') return 'transparent';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return hex;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ── UI Priority Guard: Ensures Toolbar and Popovers are NEVER blocked by Canvas ──

  function isPointerOverUI(clientX, clientY, target) {
    if (target && target.closest) {
      if (target.closest('#modal-edit-toolbar, #vector-color-popover, #max-vector-toolbar-capsule, #max-vector-rotate-handle, #max-vector-scale-handle, .edit-brush-panel, .vector-popover')) {
        return true;
      }
    }

    const rotateHandle = document.getElementById('max-vector-rotate-handle');
    const scaleHandle = document.getElementById('max-vector-scale-handle');
    const capsule = document.getElementById('max-vector-toolbar-capsule');

    const uiElements = [
      toolbarEl,
      popoverEl,
      shapePanelEl,
      document.getElementById('vector-color-popover'),
      rotateHandle,
      scaleHandle,
      capsule
    ];

    for (const el of uiElements) {
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

  // ── Canvas Setup & Resizing ──

  function initCanvas() {
    if (canvas && document.contains(canvas)) return;

    canvas = document.createElement('canvas');
    canvas.id = 'max-web-draw-canvas';
    canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483640 !important;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    `;

    document.documentElement.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      renderAll();
      updateVectorUiOverlay();
    }
  }

  // ── Object Bounding Box & Center Calculations ──

  function getObjectCenter(obj) {
    if (!obj) return { cx: 0, cy: 0, w: 0, h: 0 };
    if (obj.type === 'brush') {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of obj.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = (obj.width || 6);
      const w = Math.max(maxX - minX + pad, 20);
      const h = Math.max(maxY - minY + pad, 20);
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w, h };
    } else if (obj.type === 'shape') {
      const minX = Math.min(obj.startX, obj.endX);
      const minY = Math.min(obj.startY, obj.endY);
      const maxX = Math.max(obj.startX, obj.endX);
      const maxY = Math.max(obj.startY, obj.endY);
      const pad = (obj.width || 4);
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: Math.max(maxX - minX + pad, 20), h: Math.max(maxY - minY + pad, 20) };
    } else if (obj.type === 'text') {
      const fontSize = (obj.fontSize || 20) * (obj.scale || 1);
      const lines = (obj.text || '').split('\n');
      const maxLen = Math.max(...lines.map(l => l.length), 1);
      const w = maxLen * (fontSize * 0.62) + 20;
      const h = lines.length * (fontSize * 1.3) + 10;
      return { cx: obj.x + w / 2, cy: obj.y + h / 2, w, h };
    }
    return { cx: 0, cy: 0, w: 0, h: 0 };
  }

  function isPointInsideObject(docX, docY, obj) {
    const center = getObjectCenter(obj);
    const scale = obj.scale || 1;
    const w = center.w * scale;
    const h = center.h * scale;

    // Transform click to local rotated space
    const rot = obj.rotation || 0;
    const dx = docX - center.cx;
    const dy = docY - center.cy;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const pad = 12;
    return Math.abs(localX) <= (w / 2 + pad) && Math.abs(localY) <= (h / 2 + pad);
  }

  function findObjectAt(docX, docY) {
    if (isDrawingsHidden) return null;
    for (let i = objects.length - 1; i >= 0; i--) {
      if (isPointInsideObject(docX, docY, objects[i])) {
        return objects[i];
      }
    }
    return null;
  }

  function moveObject(obj, dx, dy) {
    if (!obj) return;
    if (obj.type === 'brush' && obj.points) {
      for (const p of obj.points) {
        p.x += dx;
        p.y += dy;
      }
    } else if (obj.type === 'shape') {
      obj.startX += dx;
      obj.startY += dy;
      obj.endX += dx;
      obj.endY += dy;
    } else if (obj.type === 'text') {
      obj.x += dx;
      obj.y += dy;
    }
  }

  // ── Render Engine with Scroll Matrix Shift & Transform Support ──

  function renderAll() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (isDrawingsHidden) {
      ctx.restore();
      return;
    }

    // Shift coordinate system by current viewport scroll offset
    ctx.translate(-window.scrollX, -window.scrollY);

    // Draw all objects
    for (let i = 0; i < objects.length; i++) {
      renderSingleObject(ctx, objects[i]);
    }

    // Draw live in-progress drawing preview
    if (currentShapePreview) {
      renderSingleObject(ctx, currentShapePreview);
    } else if (currentPoints.length > 1 && currentMode === 'brush') {
      renderBrushStroke(ctx, currentPoints, strokeColor, strokeWidth, strokeOpacity);
    }

    ctx.restore();
    updateVectorUiOverlay();
  }

  function renderSingleObject(c, obj) {
    if (!obj) return;
    const center = getObjectCenter(obj);

    c.save();
    c.translate(center.cx, center.cy);
    if (obj.rotation) c.rotate(obj.rotation);
    if (obj.scale && obj.scale !== 1) c.scale(obj.scale, obj.scale);

    if (obj.type === 'brush') {
      renderBrushLocal(c, obj, center);
    } else if (obj.type === 'shape') {
      renderShapeLocal(c, obj, center);
    } else if (obj.type === 'text') {
      renderTextLocal(c, obj, center);
    }

    c.restore();
  }

  function renderBrushLocal(c, obj, center) {
    const pts = obj.points;
    if (!pts || pts.length < 1) return;
    c.strokeStyle = hexToRgba(obj.color || strokeColor, obj.opacity ?? 1);
    c.lineWidth = obj.width || 6;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    c.beginPath();
    c.moveTo(pts[0].x - center.cx, pts[0].y - center.cy);

    if (pts.length === 1) {
      c.arc(pts[0].x - center.cx, pts[0].y - center.cy, (obj.width || 6) / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }

    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2 - center.cx;
      const yc = (pts[i].y + pts[i + 1].y) / 2 - center.cy;
      c.quadraticCurveTo(pts[i].x - center.cx, pts[i].y - center.cy, xc, yc);
    }
    c.lineTo(pts[pts.length - 1].x - center.cx, pts[pts.length - 1].y - center.cy);
    c.stroke();
  }

  function renderShapeLocal(c, shape, center) {
    c.strokeStyle = hexToRgba(shape.color, shape.opacity ?? 1);
    c.lineWidth = shape.width || 4;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (shape.fill && shape.fill !== 'transparent') {
      c.fillStyle = shape.fill;
    }

    const halfW = Math.abs(shape.endX - shape.startX) / 2;
    const halfH = Math.abs(shape.endY - shape.startY) / 2;

    if (shape.shapeType === 'rect') {
      c.beginPath();
      c.rect(-halfW, -halfH, halfW * 2, halfH * 2);
      if (shape.fill && shape.fill !== 'transparent') c.fill();
      c.stroke();
    } else if (shape.shapeType === 'ellipse') {
      c.beginPath();
      c.ellipse(0, 0, Math.max(1, halfW), Math.max(1, halfH), 0, 0, Math.PI * 2);
      if (shape.fill && shape.fill !== 'transparent') c.fill();
      c.stroke();
    } else if (shape.shapeType === 'polygonal' || shape.shapeType === 'arrow') {
      const x1 = shape.startX - center.cx;
      const y1 = shape.startY - center.cy;
      const x2 = shape.endX - center.cx;
      const y2 = shape.endY - center.cy;

      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(12, (shape.width || 4) * 2.5);
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      c.moveTo(x2, y2);
      c.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      c.stroke();
    }
  }

  function renderTextLocal(c, obj, center) {
    if (!obj || !obj.text) return;
    const fontSize = obj.fontSize || 20;
    c.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'bold'} ${fontSize}px system-ui, -apple-system, sans-serif`;
    c.fillStyle = hexToRgba(obj.color || '#ffffff', obj.opacity ?? 1);
    c.textBaseline = 'top';

    const lines = obj.text.split('\n');
    const lineHeight = fontSize * 1.3;
    const halfH = (lines.length * lineHeight) / 2;
    const halfW = center.w / 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let startX = -halfW + 8;
      if (obj.align === 'center') {
        const textW = c.measureText(line).width;
        startX = -textW / 2;
      } else if (obj.align === 'right') {
        const textW = c.measureText(line).width;
        startX = halfW - textW - 8;
      }
      c.fillText(line, startX, -halfH + 4 + i * lineHeight);
    }
  }

  function renderBrushStroke(c, pts, color, width, opacity) {
    if (!pts || pts.length < 1) return;
    c.save();
    c.strokeStyle = hexToRgba(color, opacity ?? 1);
    c.lineWidth = width || 6;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      c.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    c.stroke();
    c.restore();
  }

  // ── History Management ──

  function pushHistory() {
    undoStack.push(JSON.parse(JSON.stringify(objects)));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.parse(JSON.stringify(objects)));
    objects = undoStack.pop();
    selectedObj = null;
    renderAll();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.parse(JSON.stringify(objects)));
    objects = redoStack.pop();
    selectedObj = null;
    renderAll();
  }

  function clearCanvas() {
    if (objects.length === 0) return;
    pushHistory();
    objects = [];
    selectedObj = null;
    renderAll();
  }

  // ── Full SVG Vector Controls Overlay (Rotate, Scale, Capsule Toolbar) ──

  function ensureVectorOverlayExists() {
    if (vectorOverlaySvg && document.contains(vectorOverlaySvg)) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'max-web-draw-vector-overlay';
    svg.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483645 !important;
      pointer-events: none !important;
      overflow: visible !important;
      display: none;
    `;

    svg.innerHTML = `
      <g id="max-vector-selection-group">
        <rect id="max-vector-dash-rect" fill="none" stroke="#00f2fe" stroke-width="1.5" stroke-dasharray="4,4" />
        
        <!-- Rotate Handle with stem -->
        <line id="max-vector-rotate-stem" stroke="#00f2fe" stroke-width="1.5" />
        <g id="max-vector-rotate-handle" style="cursor: grab; pointer-events: auto;">
          <circle r="13" fill="#0f172a" stroke="#00f2fe" stroke-width="1.5" />
          <image href="${getIconUrl('rotate.svg')}" width="14" height="14" x="-7" y="-7" style="filter: invert(1); pointer-events: none;" />
        </g>

        <!-- Scale Handle -->
        <g id="max-vector-scale-handle" style="cursor: nwse-resize; pointer-events: auto;">
          <circle r="12" fill="#0f172a" stroke="#00f2fe" stroke-width="1.5" />
          <image href="${getIconUrl('scale.svg')}" width="13" height="13" x="-6.5" y="-6.5" style="filter: invert(1); pointer-events: none;" />
        </g>
      </g>

      <!-- Floating Vector Capsule Toolbar -->
      <g id="max-vector-toolbar-capsule" style="pointer-events: auto;">
        <rect id="max-capsule-bg" rx="8" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="1" filter="drop-shadow(0 6px 16px rgba(0,0,0,0.5))" />
        
        <!-- Stroke / Text Color Button -->
        <g id="max-capsule-color-btn" style="cursor: pointer;" title="Change Color">
          <rect width="26" height="28" x="7" y="4" fill="transparent" />
          <circle r="8" cx="20" cy="18" id="max-capsule-color-dot" fill="#67e8f9" stroke="#ffffff" stroke-width="1.5" pointer-events="none" />
        </g>

        <!-- Fill Color Button -->
        <g id="max-capsule-fill-btn" style="cursor: pointer;" title="Toggle Fill Color">
          <rect width="26" height="28" x="33" y="4" fill="transparent" />
          <rect width="16" height="16" x="38" y="10" rx="3" id="max-capsule-fill-rect" fill="none" stroke="#ffffff" stroke-width="1.5" pointer-events="none" />
          <line id="max-capsule-fill-slash" x1="40" y1="24" x2="52" y2="12" stroke="#ef4444" stroke-width="1.5" pointer-events="none" />
        </g>

        <!-- Size Badge & Trigger -->
        <g id="max-capsule-size-btn" style="cursor: pointer;" title="Stroke / Font Size">
          <rect width="30" height="28" x="57" y="4" fill="transparent" />
          <text id="max-capsule-size-text" x="72" y="22" font-size="11" font-weight="700" font-family="system-ui, -apple-system, sans-serif" fill="#f8fafc" text-anchor="middle" pointer-events="none">6px</text>
        </g>

        <!-- Duplicate Button -->
        <g id="max-capsule-dup-btn" style="cursor: pointer;" title="Duplicate Object">
          <rect width="24" height="28" x="87" y="4" fill="transparent" />
          <image href="${getIconUrl('copy.svg')}" width="15" height="15" x="91.5" y="10.5" style="filter: invert(1); pointer-events: none;" />
        </g>

        <!-- Delete Button -->
        <g id="max-capsule-del-btn" style="cursor: pointer;" title="Delete Object">
          <rect width="24" height="28" x="111" y="4" fill="transparent" />
          <image href="${getIconUrl('clear.svg')}" width="15" height="15" x="115.5" y="10.5" style="filter: invert(0.3) sepia(1) saturate(50) hue-rotate(330deg); pointer-events: none;" />
        </g>
      </g>
    `;

    document.documentElement.appendChild(svg);
    vectorOverlaySvg = svg;
    setupVectorOverlayInteractions();
  }

  function updateVectorUiOverlay() {
    ensureVectorOverlayExists();
    if (!vectorOverlaySvg) return;

    if (!selectedObj || currentMode !== 'select' || isDrawingsHidden) {
      vectorOverlaySvg.style.display = 'none';
      return;
    }

    vectorOverlaySvg.style.display = 'block';

    const center = getObjectCenter(selectedObj);
    const scale = selectedObj.scale || 1;
    const w = center.w * scale;
    const h = center.h * scale;
    const halfW = w / 2;
    const halfH = h / 2;

    const screenX = center.cx - window.scrollX;
    const screenY = center.cy - window.scrollY;
    const rotDeg = ((selectedObj.rotation || 0) * 180) / Math.PI;

    // 1. Update Selection Group (Rotation + Bounding Box + Handles)
    const selGroup = vectorOverlaySvg.querySelector('#max-vector-selection-group');
    if (selGroup) {
      selGroup.setAttribute('transform', `translate(${screenX}, ${screenY}) rotate(${rotDeg})`);

      const dashRect = selGroup.querySelector('#max-vector-dash-rect');
      dashRect.setAttribute('x', -halfW);
      dashRect.setAttribute('y', -halfH);
      dashRect.setAttribute('width', w);
      dashRect.setAttribute('height', h);

      const rotateStem = selGroup.querySelector('#max-vector-rotate-stem');
      rotateStem.setAttribute('x1', 0);
      rotateStem.setAttribute('y1', -halfH);
      rotateStem.setAttribute('x2', 0);
      rotateStem.setAttribute('y2', -halfH - 24);

      const rotateHandle = selGroup.querySelector('#max-vector-rotate-handle');
      rotateHandle.setAttribute('transform', `translate(0, ${-halfH - 24})`);

      const scaleHandle = selGroup.querySelector('#max-vector-scale-handle');
      scaleHandle.setAttribute('transform', `translate(${halfW + 4}, ${halfH + 4})`);
    }

    // 2. Update Floating Capsule Toolbar
    const capsule = vectorOverlaySvg.querySelector('#max-vector-toolbar-capsule');
    if (capsule) {
      const capsuleW = 142;
      const capsuleH = 36;
      let capX = screenX - capsuleW / 2;
      let capY = screenY - halfH - 48;

      // Keep inside screen viewport
      capX = Math.max(16, Math.min(window.innerWidth - capsuleW - 16, capX));
      if (capY < 70) capY = screenY + halfH + 20;

      capsule.setAttribute('transform', `translate(${capX}, ${capY})`);

      const capBg = capsule.querySelector('#max-capsule-bg');
      capBg.setAttribute('width', capsuleW);
      capBg.setAttribute('height', capsuleH);

      const colorDot = capsule.querySelector('#max-capsule-color-dot');
      if (colorDot) colorDot.setAttribute('fill', selectedObj.color || strokeColor);

      const fillRect = capsule.querySelector('#max-capsule-fill-rect');
      const fillSlash = capsule.querySelector('#max-capsule-fill-slash');
      if (fillRect && fillSlash) {
        if (!selectedObj.fill || selectedObj.fill === 'transparent') {
          fillRect.setAttribute('fill', 'none');
          fillSlash.style.display = 'block';
        } else {
          fillRect.setAttribute('fill', selectedObj.fill);
          fillSlash.style.display = 'none';
        }
      }

      const sizeText = capsule.querySelector('#max-capsule-size-text');
      if (sizeText) {
        const val = selectedObj.type === 'text' ? (selectedObj.fontSize || 20) : (selectedObj.width || 6);
        sizeText.textContent = `${Math.round(val)}px`;
      }
    }
  }

  function setupVectorOverlayInteractions() {
    if (!vectorOverlaySvg || vectorOverlaySvg.__webDrawListenersAttached) return;
    vectorOverlaySvg.__webDrawListenersAttached = true;

    // Rotate Handle Dragging
    const rotateHandle = vectorOverlaySvg.querySelector('#max-vector-rotate-handle');
    if (rotateHandle) {
      rotateHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedObj) return;

        isRotating = true;
        document.body.style.cursor = 'grabbing';
        const center = getObjectCenter(selectedObj);
        const docX = e.clientX + window.scrollX;
        const docY = e.clientY + window.scrollY;

        rotateStartAngle = selectedObj.rotation || 0;
        rotateStartMouseAngle = Math.atan2(docY - center.cy, docX - center.cx);
        pushHistory();
      });
    }

    // Scale Handle Dragging
    const scaleHandle = vectorOverlaySvg.querySelector('#max-vector-scale-handle');
    if (scaleHandle) {
      scaleHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!selectedObj) return;

        isScaling = true;
        document.body.style.cursor = 'nwse-resize';
        const center = getObjectCenter(selectedObj);
        const docX = e.clientX + window.scrollX;
        const docY = e.clientY + window.scrollY;

        scaleStartDist = Math.hypot(docX - center.cx, docY - center.cy);
        scaleStartObjScale = selectedObj.scale || 1;
        pushHistory();
      });
    }

    // Color Button -> Opens Color Popover docked to capsule
    const colorBtn = vectorOverlaySvg.querySelector('#max-capsule-color-btn');
    if (colorBtn) {
      colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedObj) return;
        toggleBrushPopover(colorBtn.getBoundingClientRect());
      });
    }

    // Fill Button -> Toggles transparent vs solid fill color
    const fillBtn = vectorOverlaySvg.querySelector('#max-capsule-fill-btn');
    if (fillBtn) {
      fillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedObj) return;
        pushHistory();
        if (!selectedObj.fill || selectedObj.fill === 'transparent') {
          selectedObj.fill = selectedObj.color || strokeColor;
        } else {
          selectedObj.fill = 'transparent';
        }
        renderAll();
      });
    }

    // Size Button -> Quick cycle size presets
    const sizeBtn = vectorOverlaySvg.querySelector('#max-capsule-size-btn');
    if (sizeBtn) {
      sizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedObj) return;
        pushHistory();
        if (selectedObj.type === 'text') {
          const sizes = [16, 20, 28, 36, 48];
          const cur = selectedObj.fontSize || 20;
          const next = sizes[(sizes.indexOf(cur) + 1) % sizes.length] || 20;
          selectedObj.fontSize = next;
        } else {
          const sizes = [3, 6, 12, 20, 35];
          const cur = selectedObj.width || 6;
          const next = sizes[(sizes.indexOf(cur) + 1) % sizes.length] || 6;
          selectedObj.width = next;
        }
        renderAll();
      });
    }

    // Duplicate Button
    const dupBtn = vectorOverlaySvg.querySelector('#max-capsule-dup-btn');
    if (dupBtn) {
      dupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedObj) return;
        pushHistory();
        const clone = JSON.parse(JSON.stringify(selectedObj));
        moveObject(clone, 20, 20);
        objects.push(clone);
        selectedObj = clone;
        renderAll();
      });
    }

    // Delete Button
    const delBtn = vectorOverlaySvg.querySelector('#max-capsule-del-btn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedObj) return;
        pushHistory();
        objects = objects.filter(o => o !== selectedObj);
        selectedObj = null;
        renderAll();
      });
    }
  }

  // ── Unified Pointer & Mouse Handlers ──

  function onPointerMove(e) {
    if (!isWebDrawActive) return;

    const docX = e.clientX + window.scrollX;
    const docY = e.clientY + window.scrollY;

    // Handle Active Rotation
    if (isRotating && selectedObj) {
      e.preventDefault();
      e.stopPropagation();
      const center = getObjectCenter(selectedObj);
      const currentMouseAngle = Math.atan2(docY - center.cy, docX - center.cx);
      selectedObj.rotation = rotateStartAngle + (currentMouseAngle - rotateStartMouseAngle);
      renderAll();
      return;
    }

    // Handle Active Scaling
    if (isScaling && selectedObj) {
      e.preventDefault();
      e.stopPropagation();
      const center = getObjectCenter(selectedObj);
      const currentDist = Math.hypot(docX - center.cx, docY - center.cy);
      const ratio = currentDist / Math.max(scaleStartDist, 1);
      selectedObj.scale = Math.max(0.2, Math.min(6, scaleStartObjScale * ratio));
      renderAll();
      return;
    }

    // Handle Active Dragging
    if (isDraggingObject && selectedObj) {
      e.preventDefault();
      e.stopPropagation();
      const dx = docX - dragStartX;
      const dy = docY - dragStartY;
      moveObject(selectedObj, dx, dy);
      dragStartX = docX;
      dragStartY = docY;
      renderAll();
      return;
    }

    // Handle Active Brush Drawing
    if (currentMode === 'brush' && isDrawing) {
      canvas.style.pointerEvents = 'auto';
      currentPoints.push({ x: docX, y: docY });
      renderAll();
      return;
    }

    // Handle Active Shape Drawing
    if (currentMode === 'shape' && isDrawing && currentShapePreview) {
      canvas.style.pointerEvents = 'auto';
      currentShapePreview.endX = docX;
      currentShapePreview.endY = docY;
      renderAll();
      return;
    }

    // UI Priority Barrier: If hovering over Toolbar or Popovers, disable canvas pointer events
    if (isPointerOverUI(e.clientX, e.clientY, e.target)) {
      if (canvas) canvas.style.pointerEvents = 'none';
      return;
    }

    // Handle Select Mode (Dynamic hover hit-testing on vectors)
    if (currentMode === 'select') {
      const hit = findObjectAt(docX, docY);
      if (hit) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'move';
      } else {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
      }
      return;
    }

    // Default cursor for active drawing modes
    if (['brush', 'shape', 'text'].includes(currentMode)) {
      canvas.style.pointerEvents = 'auto';
      canvas.style.cursor = currentMode === 'text' ? 'text' : 'crosshair';
    }
  }

  function onPointerDown(e) {
    if (!isWebDrawActive) return;
    if (e.button !== 0) return; // Left click only

    // Absolute UI barrier: If click is inside Toolbar, Handles, or Popovers, let UI handle it natively
    if (isPointerOverUI(e.clientX, e.clientY, e.target)) {
      return;
    }

    const docX = e.clientX + window.scrollX;
    const docY = e.clientY + window.scrollY;

    if (currentMode === 'select') {
      const hit = findObjectAt(docX, docY);
      if (hit) {
        e.preventDefault();
        e.stopPropagation();

        // Double click detection for editing text objects
        if (hit.type === 'text') {
          const now = Date.now();
          if (now - lastTextClickTime < 350 && lastTextClickObj === hit) {
            editExistingText(hit);
            return;
          }
          lastTextClickTime = now;
          lastTextClickObj = hit;
        }

        selectedObj = hit;
        isDraggingObject = true;
        dragStartX = docX;
        dragStartY = docY;
        pushHistory();
        renderAll();
      } else {
        if (selectedObj) {
          selectedObj = null;
          renderAll();
        }
      }
      return;
    }

    if (currentMode === 'brush') {
      e.preventDefault();
      e.stopPropagation();
      isDrawing = true;
      currentPoints = [{ x: docX, y: docY }];
      canvas.style.pointerEvents = 'auto';
      renderAll();
      return;
    }

    if (currentMode === 'shape') {
      e.preventDefault();
      e.stopPropagation();
      isDrawing = true;
      currentShapePreview = {
        type: 'shape',
        shapeType: currentShapeType || 'rect',
        startX: docX,
        startY: docY,
        endX: docX,
        endY: docY,
        color: strokeColor,
        width: strokeWidth,
        opacity: strokeOpacity,
        fill: fillColor
      };
      canvas.style.pointerEvents = 'auto';
      renderAll();
      return;
    }

    if (currentMode === 'text') {
      e.preventDefault();
      e.stopPropagation();
      createInlineTextInput(e.clientX, e.clientY, docX, docY);
      return;
    }
  }

  function onPointerUp(e) {
    if (!isWebDrawActive) return;

    document.body.style.cursor = '';

    if (isRotating) {
      isRotating = false;
      return;
    }

    if (isScaling) {
      isScaling = false;
      return;
    }

    if (currentMode === 'select') {
      isDraggingObject = false;
      return;
    }

    if (currentMode === 'brush' && isDrawing) {
      isDrawing = false;
      if (currentPoints.length > 0) {
        pushHistory();
        objects.push({
          type: 'brush',
          points: currentPoints,
          color: strokeColor,
          width: strokeWidth,
          opacity: strokeOpacity,
          rotation: 0,
          scale: 1
        });
        currentPoints = [];
        renderAll();
      }
      return;
    }

    if (currentMode === 'shape' && isDrawing && currentShapePreview) {
      isDrawing = false;
      const w = Math.abs(currentShapePreview.endX - currentShapePreview.startX);
      const h = Math.abs(currentShapePreview.endY - currentShapePreview.startY);
      if (w > 4 || h > 4) {
        pushHistory();
        currentShapePreview.rotation = 0;
        currentShapePreview.scale = 1;
        objects.push(currentShapePreview);
      }
      currentShapePreview = null;
      renderAll();
      return;
    }
  }

  function createInlineTextInput(screenX, screenY, docX, docY) {
    const existing = document.getElementById('max-web-draw-text-input');
    if (existing) existing.remove();

    const input = document.createElement('textarea');
    input.id = 'max-web-draw-text-input';
    input.rows = 1;
    input.placeholder = 'Type text...';
    input.style.cssText = `
      position: fixed !important;
      left: ${screenX}px !important;
      top: ${screenY}px !important;
      z-index: 2147483647 !important;
      background: rgba(15, 23, 42, 0.95) !important;
      color: ${strokeColor} !important;
      border: 1.5px dashed #00f2fe !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
      font-size: 20px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-weight: 700 !important;
      padding: 6px 10px !important;
      border-radius: 6px !important;
      outline: none !important;
      min-width: 140px !important;
      max-width: 450px !important;
      resize: none !important;
    `;

    document.documentElement.appendChild(input);
    input.focus();

    const commitText = () => {
      const val = input.value.trim();
      if (val) {
        pushHistory();
        objects.push({
          type: 'text',
          text: val,
          x: docX,
          y: docY,
          color: strokeColor,
          fontSize: 20,
          fontWeight: 'bold',
          opacity: strokeOpacity,
          rotation: 0,
          scale: 1
        });
        renderAll();
      }
      input.remove();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitText();
      } else if (e.key === 'Escape') {
        input.remove();
      }
    });

    input.addEventListener('blur', commitText);
  }

  function editExistingText(textObj) {
    if (!textObj) return;
    const screenX = textObj.x - window.scrollX;
    const screenY = textObj.y - window.scrollY;

    const existing = document.getElementById('max-web-draw-text-input');
    if (existing) existing.remove();

    const input = document.createElement('textarea');
    input.id = 'max-web-draw-text-input';
    input.rows = (textObj.text || '').split('\n').length || 1;
    input.value = textObj.text || '';
    input.style.cssText = `
      position: fixed !important;
      left: ${screenX}px !important;
      top: ${screenY}px !important;
      z-index: 2147483647 !important;
      background: rgba(15, 23, 42, 0.95) !important;
      color: ${textObj.color || strokeColor} !important;
      border: 1.5px dashed #00f2fe !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
      font-size: ${textObj.fontSize || 20}px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-weight: ${textObj.fontWeight || 'bold'} !important;
      padding: 6px 10px !important;
      border-radius: 6px !important;
      outline: none !important;
      min-width: 140px !important;
      max-width: 450px !important;
      resize: none !important;
    `;

    document.documentElement.appendChild(input);
    input.focus();
    input.select();

    const commitEdit = () => {
      const val = input.value.trim();
      if (val) {
        pushHistory();
        textObj.text = val;
      } else {
        pushHistory();
        objects = objects.filter(o => o !== textObj);
        selectedObj = null;
      }
      input.remove();
      renderAll();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        input.remove();
      }
    });

    input.addEventListener('blur', commitEdit);
  }

  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        renderAll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  // ── Toolbar & Color Popover UI ──

  function applyFixedToolbarStyles() {
    if (!toolbarEl) return;
    toolbarEl.style.setProperty('position', 'fixed', 'important');
    toolbarEl.style.setProperty('top', '16px', 'important');
    toolbarEl.style.setProperty('bottom', 'auto', 'important');
    toolbarEl.style.setProperty('left', '50%', 'important');
    toolbarEl.style.setProperty('transform', 'translateX(-50%)', 'important');
    toolbarEl.style.setProperty('z-index', '2147483647', 'important');
    toolbarEl.style.setProperty('pointer-events', 'auto', 'important');
  }

  function removeFixedToolbarStyles() {
    if (!toolbarEl) return;
    toolbarEl.style.removeProperty('position');
    toolbarEl.style.removeProperty('top');
    toolbarEl.style.removeProperty('bottom');
    toolbarEl.style.removeProperty('left');
    toolbarEl.style.removeProperty('transform');
    toolbarEl.style.removeProperty('z-index');
    toolbarEl.style.removeProperty('pointer-events');
  }

  function ensureToolbarExists() {
    let tb = document.getElementById('modal-edit-toolbar');
    if (tb) {
      if (tb.parentElement && tb.parentElement.id === 'image-preview-modal') {
        tb.__originalParent = tb.parentElement;
        document.documentElement.appendChild(tb);
      }
      toolbarEl = tb;
      applyFixedToolbarStyles();
      return;
    }

    tb = document.createElement('div');
    tb.id = 'modal-edit-toolbar';
    tb.className = 'edit-toolbar web-draw-mode hidden';

    tb.innerHTML = `
      <div class="edit-toolbar-row">
        <button id="edit-idle-mode-btn" class="btn-modal-edit btn-icon active" title="Select (A)" data-i18n-title="editor.select">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('cursor.svg')}'); -webkit-mask-image: url('${getIconUrl('cursor.svg')}');"></span>
        </button>

        <div class="edit-tool-popover-wrapper">
          <button id="edit-brush-tool-btn" class="btn-modal-edit btn-dropdown" title="Brush Tool (B)" data-i18n-title="editor.brush">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('brush.svg')}'); -webkit-mask-image: url('${getIconUrl('brush.svg')}');"></span>
            <span class="dropdown-arrow">▼</span>
          </button>
        </div>

        <div class="edit-tool-popover-wrapper">
          <button id="edit-shape-tool-btn" class="btn-modal-edit btn-dropdown" title="Shapes (M)" data-i18n-title="editor.shapes">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('square.svg')}'); -webkit-mask-image: url('${getIconUrl('square.svg')}');"></span>
            <span class="dropdown-arrow">▼</span>
          </button>

          <div id="edit-shape-panel" class="edit-brush-panel edit-shape-panel hidden">
            <div class="brush-panel-section">
              <div class="brush-panel-header">
                <span class="brush-panel-title">Shape Type</span>
              </div>
              <div class="shape-type-grid">
                <button id="shape-type-rect-btn" class="btn-radio shape-type-btn active" data-shape="rect">
                  <span class="icon-mask" style="mask-image: url('${getIconUrl('square.svg')}'); -webkit-mask-image: url('${getIconUrl('square.svg')}');"></span>
                  <span>Rectangle</span>
                </button>
                <button id="shape-type-ellipse-btn" class="btn-radio shape-type-btn" data-shape="ellipse">
                  <span class="icon-mask" style="mask-image: url('${getIconUrl('circle.svg')}'); -webkit-mask-image: url('${getIconUrl('circle.svg')}');"></span>
                  <span>Circle</span>
                </button>
                <button id="shape-type-polygonal-btn" class="btn-radio shape-type-btn" data-shape="polygonal">
                  <span class="icon-mask" style="mask-image: url('${getIconUrl('polygonal.svg')}'); -webkit-mask-image: url('${getIconUrl('polygonal.svg')}');"></span>
                  <span>Arrow / Line</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button id="edit-text-tool-btn" class="btn-modal-edit btn-icon" title="Text Tool (T)" data-i18n-title="editor.text">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('text-tool.svg')}'); -webkit-mask-image: url('${getIconUrl('text-tool.svg')}');"></span>
        </button>

        <div class="edit-toolbar-divider"></div>

        <button id="edit-undo-btn" class="btn-modal-edit btn-icon" title="Undo (Ctrl+Z)" data-i18n-title="editor.undo">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('undo.svg')}'); -webkit-mask-image: url('${getIconUrl('undo.svg')}');"></span>
        </button>

        <button id="edit-redo-btn" class="btn-modal-edit btn-icon" title="Redo (Ctrl+Y)" data-i18n-title="editor.redo">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('redo.svg')}'); -webkit-mask-image: url('${getIconUrl('redo.svg')}');"></span>
        </button>

        <button id="edit-clear-btn" class="btn-modal-edit btn-icon" title="Clear Canvas" data-i18n-title="editor.clear">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('clear.svg')}'); -webkit-mask-image: url('${getIconUrl('clear.svg')}');"></span>
        </button>
      </div>

      <div class="edit-toolbar-row edit-toolbar-row-2">
        <button id="edit-stop-brush-btn" class="edit-btn stop-brush-btn hidden" title="Stop Drawing" data-i18n-title="editor.stopDrawing">
          <span class="icon-mask" style="mask-image: url('${getIconUrl('close.svg')}'); -webkit-mask-image: url('${getIconUrl('close.svg')}');"></span> <span>Stop</span>
        </button>
        <div class="edit-save-group">
          <button id="edit-copy-btn" class="edit-btn copy-btn">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('copy.svg')}'); -webkit-mask-image: url('${getIconUrl('copy.svg')}');"></span> <span>Copy<br>Edited</span>
          </button>
          <button id="edit-save-btn" class="edit-btn save-btn">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('download.svg')}'); -webkit-mask-image: url('${getIconUrl('download.svg')}');"></span> <span>Download<br>Edited</span>
          </button>
          <button id="edit-toggle-drawings-btn" class="edit-btn toggle-drawings-btn" title="Hide Drawings" data-i18n-title="editor.hideDrawings">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('hide.svg')}'); -webkit-mask-image: url('${getIconUrl('hide.svg')}');"></span> <span class="toggle-drawings-text">Hide<br>Drawings</span>
          </button>
          <button id="edit-close-modal-btn" class="btn btn-icon edit-close-btn modal-close-btn" title="Close (Esc)" data-i18n-title="editor.close">
            <span class="icon-mask" style="mask-image: url('${getIconUrl('close.svg')}'); -webkit-mask-image: url('${getIconUrl('close.svg')}');"></span>
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(tb);
    toolbarEl = tb;
    applyFixedToolbarStyles();

    if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations(tb);
    }
  }

  function ensureBrushPopoverExists() {
    let pop = document.getElementById('vector-color-popover');
    if (pop) {
      popoverEl = pop;
      return;
    }

    pop = document.createElement('div');
    pop.id = 'vector-color-popover';
    pop.className = 'vector-popover hidden';
    pop.innerHTML = `
      <div class="vector-popover-header">
        <span class="vector-popover-title">COLOR & SIZE</span>
        <div class="vector-popover-header-actions">
          <div class="vector-popover-custom-wrap" title="Custom Color Picker">
            <input type="color" id="max-web-draw-custom-color" class="vector-popover-custom-input" value="${strokeColor}">
          </div>
        </div>
      </div>
      <div class="vector-popover-section">
        <div id="max-web-draw-swatches" class="vector-popover-swatches">
          ${PRESET_COLORS.map(c => `<div class="vector-popover-swatch popover-swatch color-swatch ${c.toLowerCase() === strokeColor.toLowerCase() ? 'active' : ''}" style="background-color: ${c};" data-color="${c}"></div>`).join('')}
        </div>
      </div>
      <div class="vector-popover-section">
        <div class="vector-popover-section-header">
          <span class="vector-popover-label">Size</span>
          <span id="max-web-draw-size-badge" class="badge vector-popover-badge">${strokeWidth}px</span>
        </div>
        <input type="range" id="max-web-draw-size-slider" min="2" max="60" value="${strokeWidth}" class="input-range vector-popover-slider">
        <div class="vector-popover-presets">
          <button class="chip size-preset-chip" data-size="3">3px</button>
          <button class="chip size-preset-chip" data-size="6">6px</button>
          <button class="chip size-preset-chip" data-size="12">12px</button>
          <button class="chip size-preset-chip" data-size="20">20px</button>
          <button class="chip size-preset-chip" data-size="35">35px</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(pop);
    popoverEl = pop;

    const customColor = pop.querySelector('#max-web-draw-custom-color');
    if (customColor) {
      customColor.addEventListener('input', (e) => {
        strokeColor = e.target.value;
        if (selectedObj) {
          pushHistory();
          selectedObj.color = strokeColor;
          renderAll();
        }
        updateSwatchesActive();
      });
    }

    const swatches = pop.querySelector('#max-web-draw-swatches');
    if (swatches) {
      swatches.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch) return;
        strokeColor = swatch.dataset.color;
        if (selectedObj) {
          pushHistory();
          selectedObj.color = strokeColor;
          renderAll();
        }
        if (customColor) customColor.value = strokeColor;
        updateSwatchesActive();
      });
    }

    const slider = pop.querySelector('#max-web-draw-size-slider');
    const badge = pop.querySelector('#max-web-draw-size-badge');
    if (slider) {
      slider.addEventListener('input', (e) => {
        strokeWidth = parseInt(e.target.value, 10) || 6;
        if (badge) badge.textContent = `${strokeWidth}px`;
        if (selectedObj) {
          pushHistory();
          if (selectedObj.type === 'text') selectedObj.fontSize = strokeWidth;
          else selectedObj.width = strokeWidth;
          renderAll();
        }
      });
    }

    pop.querySelectorAll('.size-preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        strokeWidth = parseInt(btn.dataset.size, 10) || 6;
        if (slider) slider.value = strokeWidth;
        if (badge) badge.textContent = `${strokeWidth}px`;
        if (selectedObj) {
          pushHistory();
          if (selectedObj.type === 'text') selectedObj.fontSize = strokeWidth;
          else selectedObj.width = strokeWidth;
          renderAll();
        }
      });
    });
  }

  function updateSwatchesActive() {
    if (!popoverEl) return;
    popoverEl.querySelectorAll('.color-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color?.toLowerCase() === strokeColor.toLowerCase());
    });
  }

  function setupToolbarInteractions() {
    if (!toolbarEl || toolbarEl.__webDrawListenersAttached) return;
    toolbarEl.__webDrawListenersAttached = true;

    const idleBtn = toolbarEl.querySelector('#edit-idle-mode-btn');
    const brushBtn = toolbarEl.querySelector('#edit-brush-tool-btn');
    const shapeBtn = toolbarEl.querySelector('#edit-shape-tool-btn');
    const textBtn = toolbarEl.querySelector('#edit-text-tool-btn');
    const undoBtn = toolbarEl.querySelector('#edit-undo-btn');
    const redoBtn = toolbarEl.querySelector('#edit-redo-btn');
    const clearBtn = toolbarEl.querySelector('#edit-clear-btn');
    const closeBtn = toolbarEl.querySelector('#edit-close-modal-btn');
    const toggleDrawingsBtn = toolbarEl.querySelector('#edit-toggle-drawings-btn');
    shapePanelEl = toolbarEl.querySelector('#edit-shape-panel');

    // Hover Priority Barrier: on toolbar hover, canvas lets events pass cleanly to buttons
    toolbarEl.addEventListener('mouseenter', () => {
      if (canvas) canvas.style.pointerEvents = 'none';
    });

    toolbarEl.addEventListener('mouseleave', () => {
      if (!isWebDrawActive) return;
      if (['brush', 'shape', 'text'].includes(currentMode)) {
        if (canvas) canvas.style.pointerEvents = 'auto';
      }
    });

    function setActiveMode(mode) {
      currentMode = mode;
      [idleBtn, brushBtn, shapeBtn, textBtn].forEach(b => b?.classList.remove('active'));

      if (shapePanelEl) shapePanelEl.classList.add('hidden');
      if (popoverEl) popoverEl.classList.add('hidden');

      if (mode === 'select') {
        idleBtn?.classList.add('active');
        if (canvas) canvas.style.pointerEvents = 'none';
      } else if (mode === 'brush') {
        brushBtn?.classList.add('active');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.cursor = 'crosshair';
        }
      } else if (mode === 'shape') {
        shapeBtn?.classList.add('active');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.cursor = 'crosshair';
        }
      } else if (mode === 'text') {
        textBtn?.classList.add('active');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.cursor = 'text';
        }
      }

      selectedObj = null;
      renderAll();
    }

    idleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveMode('select');
    });

    brushBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentMode === 'brush') {
        toggleBrushPopover();
      } else {
        setActiveMode('brush');
      }
    });

    shapeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentMode === 'shape') {
        if (shapePanelEl) shapePanelEl.classList.toggle('hidden');
      } else {
        setActiveMode('shape');
        if (shapePanelEl) shapePanelEl.classList.remove('hidden');
      }
    });

    if (shapePanelEl) {
      shapePanelEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.shape-type-btn');
        if (!btn) return;
        currentShapeType = btn.dataset.shape || 'rect';
        shapePanelEl.querySelectorAll('.shape-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shapePanelEl.classList.add('hidden');
      });
    }

    textBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveMode('text');
    });

    undoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      undo();
    });

    redoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      redo();
    });

    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearCanvas();
    });

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      stopWebDraw();
    });

    // Toggle Hide/Show Drawings Button
    if (toggleDrawingsBtn) {
      toggleDrawingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isDrawingsHidden = !isDrawingsHidden;
        const iconSpan = toggleDrawingsBtn.querySelector('.icon-mask');
        const textSpan = toggleDrawingsBtn.querySelector('.toggle-drawings-text');
        if (isDrawingsHidden) {
          if (iconSpan) {
            iconSpan.style.maskImage = `url('${getIconUrl('eye.svg')}')`;
            iconSpan.style.webkitMaskImage = `url('${getIconUrl('eye.svg')}')`;
          }
          const text = window.i18n ? window.i18n.t('editor.showDrawingsHtml') : 'Show<br>Drawings';
          const title = window.i18n ? window.i18n.t('editor.showDrawings') : 'Show Drawings';
          if (textSpan) textSpan.innerHTML = text;
          toggleDrawingsBtn.title = title;
        } else {
          if (iconSpan) {
            iconSpan.style.maskImage = `url('${getIconUrl('hide.svg')}')`;
            iconSpan.style.webkitMaskImage = `url('${getIconUrl('hide.svg')}')`;
          }
          const text = window.i18n ? window.i18n.t('editor.hideDrawingsHtml') : 'Hide<br>Drawings';
          const title = window.i18n ? window.i18n.t('editor.hideDrawings') : 'Hide Drawings';
          if (textSpan) textSpan.innerHTML = text;
          toggleDrawingsBtn.title = title;
        }
        renderAll();
      });
    }
  }

  function toggleBrushPopover(customAnchorRect) {
    ensureBrushPopoverExists();
    if (!popoverEl) return;
    const isHidden = popoverEl.classList.contains('hidden');
    if (isHidden || customAnchorRect) {
      const rect = customAnchorRect || toolbarEl?.getBoundingClientRect();
      popoverEl.style.position = 'fixed';
      popoverEl.style.top = `${rect ? rect.bottom + 8 : 70}px`;
      popoverEl.style.left = `${rect ? Math.max(16, Math.min(window.innerWidth - 260, rect.left)) : 100}px`;
      popoverEl.style.zIndex = '2147483647';
      popoverEl.classList.remove('hidden');
    } else {
      popoverEl.classList.add('hidden');
    }
  }

  function onKeyDown(e) {
    if (!isWebDrawActive) return;

    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    const key = (e.key || '').toLowerCase();
    if (key === 'a') {
      const btn = toolbarEl?.querySelector('#edit-idle-mode-btn');
      btn?.click();
    } else if (key === 'b') {
      const btn = toolbarEl?.querySelector('#edit-brush-tool-btn');
      btn?.click();
    } else if (key === 'm') {
      const btn = toolbarEl?.querySelector('#edit-shape-tool-btn');
      btn?.click();
    } else if (key === 't') {
      const btn = toolbarEl?.querySelector('#edit-text-tool-btn');
      btn?.click();
    } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      redo();
    } else if (key === 'escape') {
      if (popoverEl && !popoverEl.classList.contains('hidden')) {
        popoverEl.classList.add('hidden');
      } else if (shapePanelEl && !shapePanelEl.classList.contains('hidden')) {
        shapePanelEl.classList.add('hidden');
      } else if (selectedObj) {
        selectedObj = null;
        renderAll();
      } else {
        stopWebDraw();
      }
    } else if (key === 'delete' || key === 'backspace') {
      if (selectedObj) {
        pushHistory();
        objects = objects.filter(o => o !== selectedObj);
        selectedObj = null;
        renderAll();
      }
    }
  }

  // ── Public Start / Stop API ──

  function startWebDraw() {
    if (isWebDrawActive) return;
    isWebDrawActive = true;

    initCanvas();
    ensureToolbarExists();
    ensureBrushPopoverExists();
    ensureVectorOverlayExists();
    setupToolbarInteractions();

    toolbarEl.classList.add('web-draw-mode');
    toolbarEl.classList.remove('hidden');
    applyFixedToolbarStyles();

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);

    // Initial tool is Select (A)
    const idleBtn = toolbarEl.querySelector('#edit-idle-mode-btn');
    idleBtn?.click();

    renderAll();
  }

  function stopWebDraw() {
    if (!isWebDrawActive) return;
    isWebDrawActive = false;

    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('scroll', onScroll, { passive: true });
    window.removeEventListener('resize', resizeCanvas, { passive: true });
    window.removeEventListener('keydown', onKeyDown, true);

    if (toolbarEl) {
      toolbarEl.classList.add('hidden');
      toolbarEl.classList.remove('web-draw-mode');
      removeFixedToolbarStyles();
      if (toolbarEl.__originalParent) {
        toolbarEl.__originalParent.appendChild(toolbarEl);
        delete toolbarEl.__originalParent;
      }
    }
    if (popoverEl) popoverEl.classList.add('hidden');
    if (shapePanelEl) shapePanelEl.classList.add('hidden');
    if (vectorOverlaySvg) vectorOverlaySvg.style.display = 'none';

    if (canvas) {
      canvas.style.pointerEvents = 'none';
      canvas.style.cursor = 'default';
    }
  }

  function toggleWebDraw() {
    if (isWebDrawActive) {
      stopWebDraw();
    } else {
      startWebDraw();
    }
  }

  // Global export
  window.__maxWebDraw = {
    start: startWebDraw,
    stop: stopWebDraw,
    toggle: toggleWebDraw,
    isActive: () => isWebDrawActive
  };
})();
