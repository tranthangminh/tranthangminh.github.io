/**
 * dom-utils.js - Shared DOM Utilities for Color Sync, Toast, and Image Drop/Paste
 * Used across QR Convert, QR Generate, and 8-Bit Pixel Art modes.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class DomUtils {
    /**
     * Show animated transient toast notification
     * @param {HTMLElement} toastEl
     * @param {string} text
     * @param {number} [duration=2500]
     */
    static showToast(toastEl, text, duration = 2500) {
        if (!toastEl || !text) return;
        toastEl.textContent = text;
        toastEl.classList.add('is-show');
        clearTimeout(toastEl._hideTimer);
        toastEl._hideTimer = setTimeout(() => {
            toastEl.classList.remove('is-show');
        }, duration);
    }

    /**
     * Bi-directional synchronization between native color picker and hex text input
     * @param {HTMLInputElement} swatchEl
     * @param {HTMLInputElement} textEl
     * @param {Function} [onChangeCallback]
     */
    static syncColorInputs(swatchEl, textEl, onChangeCallback) {
        if (!swatchEl || !textEl) return;
        swatchEl.addEventListener('input', () => {
            textEl.value = swatchEl.value.toUpperCase();
            if (onChangeCallback) onChangeCallback();
        });
        textEl.addEventListener('change', () => {
            let val = textEl.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                swatchEl.value = val;
                textEl.value = val.toUpperCase();
                if (onChangeCallback) onChangeCallback();
            } else {
                textEl.value = swatchEl.value.toUpperCase();
            }
        });
    }

    /**
     * Setup drag-and-drop and clipboard paste listeners for image files
     * @param {Object} options
     * @param {HTMLElement} options.stageViewport
     * @param {HTMLInputElement} options.fileInput
     * @param {HTMLElement} [options.stageEmptyState]
     * @param {HTMLElement} [options.btnUploadToolbar]
     * @param {Function} options.onFileLoaded
     */
    static bindDropAndPaste(options) {
        const { stageViewport, fileInput, stageEmptyState, btnUploadToolbar, onFileLoaded } = options;

        if (stageEmptyState && fileInput) {
            stageEmptyState.addEventListener('click', (e) => {
                if (e.target && e.target.closest('#emptyCardGenerate')) return;
                fileInput.click();
            });
        }
        if (btnUploadToolbar && fileInput) {
            btnUploadToolbar.addEventListener('click', () => fileInput.click());
        }

        if (stageViewport && fileInput) {
            stageViewport.addEventListener('dragover', (e) => {
                e.preventDefault();
                stageViewport.classList.add('is-dragover');
            });
            stageViewport.addEventListener('dragleave', (e) => {
                if (e.target === stageViewport) stageViewport.classList.remove('is-dragover');
            });
            stageViewport.addEventListener('drop', (e) => {
                e.preventDefault();
                stageViewport.classList.remove('is-dragover');
                if (e.dataTransfer?.files?.[0]) onFileLoaded(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files?.[0]) onFileLoaded(e.target.files[0]);
            });
        }

        let pasteLock = false;
        window.addEventListener('paste', (e) => {
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (pasteLock) return;
            const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const f = items[i].getAsFile();
                    if (f) {
                        pasteLock = true;
                        setTimeout(() => { pasteLock = false; }, 600);
                        onFileLoaded(f, true);
                    }
                    break;
                }
            }
        });
    }
}

if (typeof window !== 'undefined') {
    window.DomUtils = DomUtils;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DomUtils };
}
