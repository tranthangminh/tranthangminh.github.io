let isShortcutsInitialized = false;

function initEditorShortcutsModule() {
  if (isShortcutsInitialized) return;
  isShortcutsInitialized = true;

  window.addEventListener('keydown', (e) => {
    if (!isEditMode) return;

    // Ctrl+Z / Cmd+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault();
      undoLastStroke();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z (Redo)
    if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
      e.preventDefault();
      redoNextStroke();
      return;
    }

    // Ctrl+C / Cmd+C (Copy edited image if not typing text inside input or text object)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      const isActivelyTypingText = selectedTextObj && selectedTextObj.isEditingText;
      const isInputElement = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (!isActivelyTypingText && !isInputElement) {
        e.preventDefault();
        copyEditedImage();
        return;
      }
    }

    // Single-key Tool Mode Hotkeys (A / V for Selection Mode, B for Brush Tool, T for Text Tool)
    const isActivelyTypingText = selectedTextObj && selectedTextObj.isEditingText;
    const active = document.activeElement;
    const isTypingInput = active && (
      (active.tagName === 'INPUT' && (active.type === 'text' || active.type === 'search' || !active.type)) ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable
    );

    if (!e.ctrlKey && !e.altKey && !e.metaKey && !isActivelyTypingText && !isTypingInput) {
      const k = e.key.toLowerCase();
      if (k === '1') {
        e.preventDefault();
        if (typeof window.zoomTo100Percent === 'function') window.zoomTo100Percent();
        return;
      }
      if (k === '2') {
        e.preventDefault();
        if (typeof window.zoomToFitScreen === 'function') window.zoomToFitScreen();
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        if (typeof window.toggleHideHud === 'function') {
          window.toggleHideHud();
        } else if (typeof toggleHideHud === 'function') {
          toggleHideHud();
        }
        return;
      }
      if (k === 'a') {
        e.preventDefault();
        activateIdleMode();
        return;
      }
      if (k === 'b') {
        e.preventDefault();
        activateBrushMode();
        return;
      }
      if (k === 't') {
        e.preventDefault();
        activateTextMode();
        return;
      }
      if (k === 'm') {
        e.preventDefault();
        currentShapeType = 'rect';
        if (typeof updateShapeToolBtnIcon === 'function') updateShapeToolBtnIcon('rect');
        activateShapeMode();
        return;
      }
      if (k === 'o' || k === 'l') {
        e.preventDefault();
        currentShapeType = 'ellipse';
        if (typeof updateShapeToolBtnIcon === 'function') updateShapeToolBtnIcon('ellipse');
        activateShapeMode();
        return;
      }
      if (k === 'p') {
        e.preventDefault();
        currentShapeType = 'polygonal';
        if (typeof updateShapeToolBtnIcon === 'function') updateShapeToolBtnIcon('polygonal');
        activateShapeMode();
        return;
      }
    }

    // Ctrl+A (Select All Text in active text object)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      if (editorMode === 'idle' && selectedTextObj) {
        e.preventDefault();
        selectedTextObj.isEditingText = true;
        selectedTextObj.selectionStart = 0;
        selectedTextObj.selectionEnd = (selectedTextObj.text || '').length;
        selectedTextObj.cursorIndex = (selectedTextObj.text || '').length;
        renderCompositeCanvas();
        startCaretBlink();
        return;
      }
    }

    // Keyboard Typing & Caret Navigation onto Selected Text Object or Delete Brush Object
    if (editorMode === 'idle' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (selectedBrushObj && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        markSessionDirty();
        commitObjectSession();
        editorObjects = editorObjects.filter(o => o.id !== selectedBrushObj.id);
        selectedBrushObj = null;
        renderCompositeCanvas();
        saveUndoState();
        return;
      }

      if (selectedTextObj) {
        if (!selectedTextObj.isEditingText) {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            markSessionDirty();
            commitObjectSession();
            editorObjects = editorObjects.filter(o => o.id !== selectedTextObj.id);
            selectedTextObj = null;
            renderCompositeCanvas();
            saveUndoState();
            return;
          } else if (e.key.length === 1 || e.key === 'Enter') {
            selectedTextObj.isEditingText = true;
          }
        }

        const textStr = selectedTextObj.text || '';
        const selStart = Math.min(selectedTextObj.selectionStart ?? 0, selectedTextObj.selectionEnd ?? 0);
        const selEnd = Math.max(selectedTextObj.selectionStart ?? 0, selectedTextObj.selectionEnd ?? 0);
        const hasSelection = selStart < selEnd;
        let curIdx = selectedTextObj.cursorIndex ?? textStr.length;
        curIdx = Math.min(textStr.length, Math.max(0, curIdx));

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          selectedTextObj.selectionStart = 0;
          selectedTextObj.selectionEnd = 0;
          selectedTextObj.cursorIndex = Math.max(0, curIdx - 1);
          renderCompositeCanvas();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          selectedTextObj.selectionStart = 0;
          selectedTextObj.selectionEnd = 0;
          selectedTextObj.cursorIndex = Math.min(textStr.length, curIdx + 1);
          renderCompositeCanvas();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          markSessionDirty();
          if (hasSelection) {
            selectedTextObj.text = textStr.slice(0, selStart) + textStr.slice(selEnd);
            selectedTextObj.cursorIndex = selStart;
            selectedTextObj.selectionStart = 0;
            selectedTextObj.selectionEnd = 0;
            renderCompositeCanvas();
          } else if (curIdx > 0) {
            selectedTextObj.text = textStr.slice(0, curIdx - 1) + textStr.slice(curIdx);
            selectedTextObj.cursorIndex = curIdx - 1;
            renderCompositeCanvas();
          }
        } else if (e.key === 'Delete') {
          e.preventDefault();
          markSessionDirty();
          if (hasSelection) {
            selectedTextObj.text = textStr.slice(0, selStart) + textStr.slice(selEnd);
            selectedTextObj.cursorIndex = selStart;
            selectedTextObj.selectionStart = 0;
            selectedTextObj.selectionEnd = 0;
            renderCompositeCanvas();
          } else if (curIdx < textStr.length) {
            selectedTextObj.text = textStr.slice(0, curIdx) + textStr.slice(curIdx + 1);
            selectedTextObj.cursorIndex = curIdx;
            renderCompositeCanvas();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          markSessionDirty();
          if (hasSelection) {
            selectedTextObj.text = textStr.slice(0, selStart) + '\n' + textStr.slice(selEnd);
            selectedTextObj.cursorIndex = selStart + 1;
            selectedTextObj.selectionStart = 0;
            selectedTextObj.selectionEnd = 0;
          } else {
            selectedTextObj.text = textStr.slice(0, curIdx) + '\n' + textStr.slice(curIdx);
            selectedTextObj.cursorIndex = curIdx + 1;
          }
          renderCompositeCanvas();
        } else if (e.key.length === 1) {
          e.preventDefault();
          markSessionDirty();
          if (hasSelection) {
            selectedTextObj.text = textStr.slice(0, selStart) + e.key + textStr.slice(selEnd);
            selectedTextObj.cursorIndex = selStart + 1;
            selectedTextObj.selectionStart = 0;
            selectedTextObj.selectionEnd = 0;
          } else if (selectedTextObj.text === 'Text') {
            selectedTextObj.text = e.key;
            selectedTextObj.cursorIndex = 1;
          } else {
            selectedTextObj.text = textStr.slice(0, curIdx) + e.key + textStr.slice(curIdx);
            selectedTextObj.cursorIndex = curIdx + 1;
          }
          renderCompositeCanvas();
        }
      }
    }
  });
}

window.initEditorShortcutsModule = initEditorShortcutsModule;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditorShortcutsModule);
} else {
  initEditorShortcutsModule();
}
