// Preview Modal Image Editor - State & History Module (image_previewmodal-editor-state.js)

let isEditMode = false;
let editCanvas = null;
let editCtx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let undoStack = [];
let redoStack = [];

// Offscreen Brush-only canvas
let brushCanvas = null;
let brushCtx = null;

// Editor Mode: 'idle' (selection/drag) | 'brush' (drawing)
let editorMode = 'idle';

// Global Property Accessors for 100% Backward Compatibility
let brushSize = 15;
let brushSizeMode = 'absolute';
let brushColor = '#67e8f9';
let brushOpacity = 1;
let isLazyMouse = false;
let smoothX = 0;
let smoothY = 0;

let textColor = '#000000';
let textBgColor = 'transparent';
let fontSize = 24;
let textWeight = 'bold';
let textStyle = 'normal';
let textDecoration = 'none';
let textAlign = 'left';

// Unified Layer Stack & Selection State
let editorObjects = [];
let selectedTextObj = null;
let selectedBrushObj = null;
let currentStrokePoints = [];
let currentStrokeCanvasSize = 15;

// Interactive Transform Dragging & Handle States
let dragTextObj = null;
let dragStartCanvasX = 0;
let dragStartCanvasY = 0;
let dragTextStartX = 0;
let dragTextStartY = 0;
let isDraggingText = false;

let isRotatingText = false;
let isScalingText = false;
let dragStartAngle = 0;
let dragStartDist = 0;
let dragStartScale = 1;
let dragStartScaleX = 1;
let dragStartScaleY = 1;
let dragStartLocalX = 1;
let dragStartLocalY = 1;
let dragStartWidth = 40;
let dragStartHeight = 40;
let dragStartFontSize = 28;
let dragStartPoints = null;

// Preset Color Swatches Palette (35 colors)
const PRESET_COLORS = [
  '#000000', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#e4e4e7', '#ffffff',
  '#fca5a5', '#fdba74', '#fde047', '#86efac', '#67e8f9', '#93c5fd', '#f0abfc',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#d946ef',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#c026d3',
  '#991b1b', '#9a3412', '#854d0e', '#166534', '#155e75', '#1e40af', '#86198f'
];
window.PRESET_COLORS = PRESET_COLORS;

// Global Property Exporters for Cross-Module Access
Object.defineProperty(window, 'isEditMode', { get: () => isEditMode, set: (v) => { isEditMode = v; }, configurable: true });
Object.defineProperty(window, 'editCanvas', { get: () => editCanvas, set: (v) => { editCanvas = v; }, configurable: true });
Object.defineProperty(window, 'editCtx', { get: () => editCtx, set: (v) => { editCtx = v; }, configurable: true });
Object.defineProperty(window, 'editorMode', { get: () => editorMode, set: (v) => { editorMode = v; }, configurable: true });
Object.defineProperty(window, 'editorObjects', { get: () => editorObjects, set: (v) => { editorObjects = v; }, configurable: true });
Object.defineProperty(window, 'selectedTextObj', { get: () => selectedTextObj, set: (v) => { selectedTextObj = v; }, configurable: true });
Object.defineProperty(window, 'selectedBrushObj', { get: () => selectedBrushObj, set: (v) => { selectedBrushObj = v; }, configurable: true });
Object.defineProperty(window, 'undoStack', { get: () => undoStack, set: (v) => { undoStack = v; }, configurable: true });
Object.defineProperty(window, 'redoStack', { get: () => redoStack, set: (v) => { redoStack = v; }, configurable: true });
Object.defineProperty(window, 'brushCanvas', { get: () => brushCanvas, set: (v) => { brushCanvas = v; }, configurable: true });
Object.defineProperty(window, 'brushCtx', { get: () => brushCtx, set: (v) => { brushCtx = v; }, configurable: true });
Object.defineProperty(window, 'brushSize', { get: () => brushSize, set: (v) => { brushSize = v; }, configurable: true });
Object.defineProperty(window, 'brushSizeMode', { get: () => brushSizeMode, set: (v) => { brushSizeMode = v; }, configurable: true });
Object.defineProperty(window, 'brushColor', { get: () => brushColor, set: (v) => { brushColor = v; }, configurable: true });
Object.defineProperty(window, 'brushOpacity', { get: () => brushOpacity, set: (v) => { brushOpacity = v; }, configurable: true });
Object.defineProperty(window, 'isLazyMouse', { get: () => isLazyMouse, set: (v) => { isLazyMouse = v; }, configurable: true });
Object.defineProperty(window, 'smoothX', { get: () => smoothX, set: (v) => { smoothX = v; }, configurable: true });
Object.defineProperty(window, 'smoothY', { get: () => smoothY, set: (v) => { smoothY = v; }, configurable: true });
Object.defineProperty(window, 'textColor', { get: () => textColor, set: (v) => { textColor = v; }, configurable: true });
Object.defineProperty(window, 'textBgColor', { get: () => textBgColor, set: (v) => { textBgColor = v; }, configurable: true });
Object.defineProperty(window, 'fontSize', { get: () => fontSize, set: (v) => { fontSize = v; }, configurable: true });
Object.defineProperty(window, 'textWeight', { get: () => textWeight, set: (v) => { textWeight = v; }, configurable: true });
Object.defineProperty(window, 'textStyle', { get: () => textStyle, set: (v) => { textStyle = v; }, configurable: true });
Object.defineProperty(window, 'textDecoration', { get: () => textDecoration, set: (v) => { textDecoration = v; }, configurable: true });
Object.defineProperty(window, 'textAlign', { get: () => textAlign, set: (v) => { textAlign = v; }, configurable: true });
Object.defineProperty(window, 'currentStrokePoints', { get: () => currentStrokePoints, set: (v) => { currentStrokePoints = v; }, configurable: true });
Object.defineProperty(window, 'currentStrokeCanvasSize', { get: () => currentStrokeCanvasSize, set: (v) => { currentStrokeCanvasSize = v; }, configurable: true });

Object.defineProperty(window, 'dragTextObj', { get: () => dragTextObj, set: (v) => { dragTextObj = v; }, configurable: true });
Object.defineProperty(window, 'dragStartCanvasX', { get: () => dragStartCanvasX, set: (v) => { dragStartCanvasX = v; }, configurable: true });
Object.defineProperty(window, 'dragStartCanvasY', { get: () => dragStartCanvasY, set: (v) => { dragStartCanvasY = v; }, configurable: true });
Object.defineProperty(window, 'dragTextStartX', { get: () => dragTextStartX, set: (v) => { dragTextStartX = v; }, configurable: true });
Object.defineProperty(window, 'dragTextStartY', { get: () => dragTextStartY, set: (v) => { dragTextStartY = v; }, configurable: true });
Object.defineProperty(window, 'isDraggingText', { get: () => isDraggingText, set: (v) => { isDraggingText = v; }, configurable: true });
Object.defineProperty(window, 'isRotatingText', { get: () => isRotatingText, set: (v) => { isRotatingText = v; }, configurable: true });
Object.defineProperty(window, 'isScalingText', { get: () => isScalingText, set: (v) => { isScalingText = v; }, configurable: true });
Object.defineProperty(window, 'dragStartAngle', { get: () => dragStartAngle, set: (v) => { dragStartAngle = v; }, configurable: true });
Object.defineProperty(window, 'dragStartDist', { get: () => dragStartDist, set: (v) => { dragStartDist = v; }, configurable: true });
Object.defineProperty(window, 'dragStartScale', { get: () => dragStartScale, set: (v) => { dragStartScale = v; }, configurable: true });
Object.defineProperty(window, 'dragStartScaleX', { get: () => dragStartScaleX, set: (v) => { dragStartScaleX = v; }, configurable: true });
Object.defineProperty(window, 'dragStartScaleY', { get: () => dragStartScaleY, set: (v) => { dragStartScaleY = v; }, configurable: true });
Object.defineProperty(window, 'dragStartLocalX', { get: () => dragStartLocalX, set: (v) => { dragStartLocalX = v; }, configurable: true });
Object.defineProperty(window, 'dragStartLocalY', { get: () => dragStartLocalY, set: (v) => { dragStartLocalY = v; }, configurable: true });
Object.defineProperty(window, 'dragStartWidth', { get: () => dragStartWidth, set: (v) => { dragStartWidth = v; }, configurable: true });
Object.defineProperty(window, 'dragStartHeight', { get: () => dragStartHeight, set: (v) => { dragStartHeight = v; }, configurable: true });
Object.defineProperty(window, 'dragStartFontSize', { get: () => dragStartFontSize, set: (v) => { dragStartFontSize = v; }, configurable: true });
Object.defineProperty(window, 'dragStartPoints', { get: () => dragStartPoints, set: (v) => { dragStartPoints = v; }, configurable: true });

// Compatibility Getters & Setters
Object.defineProperty(window, 'textObjects', {
  get: () => editorObjects.filter(o => o.type !== 'brush'),
  set: (arr) => {
    const brushes = editorObjects.filter(o => o.type === 'brush');
    editorObjects = [...brushes, ...arr];
  },
  configurable: true
});

Object.defineProperty(window, 'brushObjects', {
  get: () => editorObjects.filter(o => o.type === 'brush'),
  set: (arr) => {
    const texts = editorObjects.filter(o => o.type !== 'brush');
    editorObjects = [...texts, ...arr];
  },
  configurable: true
});

function getSelectedObject() {
  return selectedTextObj || selectedBrushObj;
}
window.getSelectedObject = getSelectedObject;

// Centralized Persistent Settings Configuration Object & Defaults
const DEFAULT_IMAGE_EDITOR_SETTINGS = Object.freeze({
  // Brush Defaults
  brushSize: 15,
  brushSizeMode: 'absolute', // 'absolute' | 'relative'
  brushColor: '#67e8f9',
  brushOpacity: 1,
  isLazyMouse: false,

  // Text Tool Defaults
  textColor: '#000000',
  textBgColor: 'transparent',
  fontSize: 24,
  textWeight: 'bold',      // 'bold' | 'normal'
  textStyle: 'normal',     // 'italic' | 'normal'
  textDecoration: 'none',  // 'underline' | 'none'
  textAlign: 'left',       // 'left' | 'center' | 'right'

  // Shape Defaults
  currentShapeType: 'rect', // 'rect' | 'ellipse' | 'polygonal'
  shapeStrokeColor: '#67e8f9',
  shapeBgColor: 'transparent',
  shapeSize: 15,
  shapeSizeMode: 'absolute'
});
window.DEFAULT_IMAGE_EDITOR_SETTINGS = DEFAULT_IMAGE_EDITOR_SETTINGS;

const EditorSettings = { ...DEFAULT_IMAGE_EDITOR_SETTINGS };
window.EditorSettings = EditorSettings;

let _saveEditorSettingsDebounceTimer = null;

function saveEditorSettingsToStorage(partialSettings) {
  if (partialSettings && typeof partialSettings === 'object') {
    Object.assign(EditorSettings, partialSettings);
  }

  // Update in-memory global variables immediately
  if (partialSettings) {
    if (partialSettings.brushSize !== undefined) brushSize = partialSettings.brushSize;
    if (partialSettings.brushSizeMode !== undefined) brushSizeMode = partialSettings.brushSizeMode;
    if (partialSettings.brushColor !== undefined) brushColor = partialSettings.brushColor;
    if (partialSettings.brushOpacity !== undefined) brushOpacity = partialSettings.brushOpacity;
    if (partialSettings.isLazyMouse !== undefined) isLazyMouse = partialSettings.isLazyMouse;

    if (partialSettings.textColor !== undefined) textColor = partialSettings.textColor;
    if (partialSettings.textBgColor !== undefined) textBgColor = partialSettings.textBgColor;
    if (partialSettings.fontSize !== undefined) fontSize = partialSettings.fontSize;
    if (partialSettings.textWeight !== undefined) textWeight = partialSettings.textWeight;
    if (partialSettings.textStyle !== undefined) textStyle = partialSettings.textStyle;
    if (partialSettings.textDecoration !== undefined) textDecoration = partialSettings.textDecoration;
    if (partialSettings.textAlign !== undefined) textAlign = partialSettings.textAlign;

    if (partialSettings.currentShapeType !== undefined && typeof window.currentShapeType !== 'undefined') {
      window.currentShapeType = partialSettings.currentShapeType;
    }
  }

  // Debounced write to storage
  if (_saveEditorSettingsDebounceTimer) clearTimeout(_saveEditorSettingsDebounceTimer);
  _saveEditorSettingsDebounceTimer = setTimeout(() => {
    const dataToSave = { ...EditorSettings };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ imageEditorSettings: dataToSave }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {}
      });
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('imageEditorSettings', JSON.stringify(dataToSave));
      }
    } catch (e) {}
  }, 100);
}
window.saveEditorSettingsToStorage = saveEditorSettingsToStorage;
window.saveEditorSettings = saveEditorSettingsToStorage;

function applyLoadedEditorSettings(settings) {
  if (!settings) return;
  Object.assign(EditorSettings, settings);

  brushSize = EditorSettings.brushSize !== undefined ? EditorSettings.brushSize : 15;
  brushSizeMode = EditorSettings.brushSizeMode || 'absolute';
  brushColor = EditorSettings.brushColor || '#67e8f9';
  brushOpacity = EditorSettings.brushOpacity !== undefined ? EditorSettings.brushOpacity : 1;
  isLazyMouse = EditorSettings.isLazyMouse === true;

  textColor = EditorSettings.textColor || '#000000';
  textBgColor = EditorSettings.textBgColor || 'transparent';
  fontSize = EditorSettings.fontSize || 24;
  textWeight = EditorSettings.textWeight || 'bold';
  textStyle = EditorSettings.textStyle || 'normal';
  textDecoration = EditorSettings.textDecoration || 'none';
  textAlign = EditorSettings.textAlign || 'left';

  if (typeof window.currentShapeType !== 'undefined') {
    window.currentShapeType = EditorSettings.currentShapeType || 'rect';
  }

  // Update Toolbar UI if function is available
  if (typeof window.syncEditorToolbarWithState === 'function') {
    window.syncEditorToolbarWithState();
  }
}
window.applyLoadedEditorSettings = applyLoadedEditorSettings;

function loadEditorSettingsFromStorage(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ imageEditorSettings: DEFAULT_IMAGE_EDITOR_SETTINGS }, (data) => {
      const merged = { ...DEFAULT_IMAGE_EDITOR_SETTINGS, ...(data.imageEditorSettings || {}) };
      applyLoadedEditorSettings(merged);
      if (typeof callback === 'function') callback(merged);
    });
  } else {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('imageEditorSettings') : null;
      const parsed = saved ? JSON.parse(saved) : {};
      const merged = { ...DEFAULT_IMAGE_EDITOR_SETTINGS, ...parsed };
      applyLoadedEditorSettings(merged);
      if (typeof callback === 'function') callback(merged);
    } catch (e) {
      applyLoadedEditorSettings(DEFAULT_IMAGE_EDITOR_SETTINGS);
      if (typeof callback === 'function') callback(DEFAULT_IMAGE_EDITOR_SETTINGS);
    }
  }
}
window.loadEditorSettingsFromStorage = loadEditorSettingsFromStorage;
window.loadEditorSettings = loadEditorSettingsFromStorage;

// Auto-load on initialization
loadEditorSettingsFromStorage();

function bringObjectToTop(obj) {
  if (!obj) return;
  const idx = editorObjects.findIndex(o => o.id === obj.id);
  if (idx !== -1 && idx !== editorObjects.length - 1) {
    editorObjects.splice(idx, 1);
    editorObjects.push(obj);
  }
}
window.bringObjectToTop = bringObjectToTop;

// Session-Based History Manager
let sessionBaseState = null;
let hasSessionDirtyState = false;

function markSessionDirty() {
  hasSessionDirtyState = true;
}
window.markSessionDirty = markSessionDirty;

function startObjectSession() {
  if (!sessionBaseState) {
    sessionBaseState = JSON.stringify(editorObjects);
    hasSessionDirtyState = false;
  }
}
window.startObjectSession = startObjectSession;

function commitObjectSession() {
  if (!sessionBaseState) return;

  if (hasSessionDirtyState) {
    if (undoStack.length >= 30) undoStack.shift();
    undoStack.push(JSON.parse(sessionBaseState));
    redoStack = [];
  }
  sessionBaseState = null;
  hasSessionDirtyState = false;
}
window.commitObjectSession = commitObjectSession;

function cleanupEmptyTextObjects() {
  editorObjects = editorObjects.filter(o => {
    if (o.type === 'text') {
      const isActivelyEditing = (selectedTextObj && selectedTextObj.id === o.id && selectedTextObj.isEditingText);
      if (isActivelyEditing) return true;
      return o.text && o.text.trim() !== '';
    }
    return true;
  });
  if (selectedTextObj && (!selectedTextObj.text || selectedTextObj.text.trim() === '') && !selectedTextObj.isEditingText) {
    selectedTextObj = null;
  }
}
window.cleanupEmptyTextObjects = cleanupEmptyTextObjects;

function deselectAllObjects() {
  if (selectedTextObj) {
    selectedTextObj.isEditingText = false;
    if (!selectedTextObj.text || selectedTextObj.text.trim() === '') {
      editorObjects = editorObjects.filter(o => o.id !== selectedTextObj.id);
      selectedTextObj = null;
    }
  }
  cleanupEmptyTextObjects();
  commitObjectSession();
  selectedTextObj = null;
  selectedBrushObj = null;
  if (window.popoverTargetMode !== 'brushTool' && window.closeVectorColorPopover) {
    window.closeVectorColorPopover();
  }
  if (window.renderCompositeCanvas) window.renderCompositeCanvas();
}
window.deselectAllObjects = deselectAllObjects;

function deselectTextObject() {
  deselectAllObjects();
}
window.deselectTextObject = deselectTextObject;

function saveUndoState() {
  if (undoStack.length >= 30) undoStack.shift();
  undoStack.push(JSON.parse(JSON.stringify(editorObjects)));
  redoStack = [];
}
window.saveUndoState = saveUndoState;

function undoLastStroke() {
  commitObjectSession();
  if (window.commitActiveTextOverlay) window.commitActiveTextOverlay();
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);

  const prevState = undoStack[undoStack.length - 1];
  editorObjects = JSON.parse(JSON.stringify(prevState || []));
  selectedTextObj = null;
  selectedBrushObj = null;
  if (window.renderCompositeCanvas) window.renderCompositeCanvas();
}
window.undoLastStroke = undoLastStroke;

function redoNextStroke() {
  commitObjectSession();
  if (window.commitActiveTextOverlay) window.commitActiveTextOverlay();
  if (redoStack.length === 0) return;

  const nextState = redoStack.pop();
  undoStack.push(nextState);

  const nextStateObj = undoStack[undoStack.length - 1];
  editorObjects = JSON.parse(JSON.stringify(nextStateObj || []));
  selectedTextObj = null;
  selectedBrushObj = null;
  if (window.renderCompositeCanvas) window.renderCompositeCanvas();
}
window.redoNextStroke = redoNextStroke;

function clearCanvasStrokes() {
  if (window.commitActiveTextOverlay) window.commitActiveTextOverlay();
  commitObjectSession();
  const modalImg = document.getElementById('modal-image-preview');
  
  const originalUrl = window.originalModalPreviewUrl || window.modalPreviewUrl;
  if (modalImg && originalUrl) {
    modalImg.src = originalUrl;
    window.modalPreviewUrl = originalUrl;
  }

  editorObjects = [];
  selectedTextObj = null;
  selectedBrushObj = null;
  if (brushCtx && brushCanvas) {
    brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
  }
  undoStack = [];
  redoStack = [];
  if (window.renderCompositeCanvas) window.renderCompositeCanvas();
  saveUndoState();

  if (window.showToast) {
    window.showToast('Cleared all edits');
  }
}
window.clearCanvasStrokes = clearCanvasStrokes;

function hasModalChanges() {
  return Array.isArray(editorObjects) && editorObjects.length > 0;
}
window.hasModalChanges = hasModalChanges;

function clearAllObjectsAndHistory() {
  editorObjects = [];
  undoStack = [];
  redoStack = [];
  selectedTextObj = null;
  selectedBrushObj = null;
  if (brushCtx && brushCanvas) {
    brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
  }
  if (typeof renderCompositeCanvas === 'function') {
    renderCompositeCanvas();
  }
}
let currentPolygonSides = 4;
Object.defineProperty(window, 'currentPolygonSides', {
  get: () => currentPolygonSides,
  set: (v) => { currentPolygonSides = v; },
  configurable: true
});
