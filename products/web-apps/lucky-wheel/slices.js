/**
 * Lucky Wheel - Slices Module (CRUD, Drag & Drop, Sort, Bulk Edit, Rainbow)
 * (Separated from app.js)
 */

window.LuckyWheelSlices = (function () {
    let slices = [];
    let settings = null;
    let wheelEngine = null;
    let saveStateCallback = null;
    let PALETTE = [];

    let slicesListEl = null;
    let sliceCountBadge = null;
    let tabSliceCountBadge = null;
    let toggleAllSlicesBtn = null;
    let toggleAllIcon = null;
    let toggleAllText = null;
    let sortSelect = null;

    let bulkEditOpenBtn = null;
    let bulkEditModal = null;
    let bulkEditTextarea = null;
    let bulkEditApplyBtn = null;
    let bulkEditCancelBtn = null;
    let bulkEditCloseBtn = null;

    let draggedSliceIndex = null;

    function init(options) {
        slices = options.slices || [];
        settings = options.settings;
        wheelEngine = options.wheelEngine;
        saveStateCallback = options.saveState || function () {};
        PALETTE = options.PALETTE || [];

        slicesListEl = document.getElementById('slicesList');
        sliceCountBadge = document.getElementById('sliceCountBadge');
        tabSliceCountBadge = document.getElementById('tabSliceCountBadge');
        toggleAllSlicesBtn = document.getElementById('toggleAllSlicesBtn');
        toggleAllIcon = document.getElementById('toggleAllIcon');
        toggleAllText = document.getElementById('toggleAllText');
        sortSelect = document.getElementById('sortSelect');

        bulkEditOpenBtn = document.getElementById('bulkEditOpenBtn');
        bulkEditModal = document.getElementById('bulkEditModal');
        bulkEditTextarea = document.getElementById('bulkEditTextarea');
        bulkEditApplyBtn = document.getElementById('bulkEditApplyBtn');
        bulkEditCancelBtn = document.getElementById('bulkEditCancelBtn');
        bulkEditCloseBtn = document.getElementById('bulkEditCloseBtn');

        // Toggle all slices (Show all / Hide all)
        if (toggleAllSlicesBtn) {
            toggleAllSlicesBtn.addEventListener('click', () => {
                const hasDisabled = slices.some(s => s.enabled === false);
                slices.forEach(s => {
                    s.enabled = hasDisabled;
                });
                saveStateCallback();
                renderSlices();
                wheelEngine.setSlices(slices);
            });
        }

        // Sort selection handler (A-Z, Z-A, Weight Descending, Weight Ascending)
        if (sortSelect) {
            sortSelect.addEventListener('change', handleSortChange);
        }

        // Bulk Edit Modal
        if (bulkEditOpenBtn) {
            bulkEditOpenBtn.addEventListener('click', () => {
                bulkEditTextarea.value = slices.map(s => {
                    return (s.weight && s.weight > 1) ? `${s.text} : ${s.weight}` : s.text;
                }).join('\n');
                openModal(bulkEditModal);
            });
        }

        if (bulkEditApplyBtn) {
            bulkEditApplyBtn.addEventListener('click', () => {
                const raw = bulkEditTextarea.value.trim();
                const i18n = window.LuckyWheelI18n;
                if (!raw) {
                    alert(i18n ? i18n.t('bulk.emptyAlert') : 'Please enter at least one item.');
                    return;
                }

                const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length < 2) {
                    alert(i18n ? i18n.t('bulk.minAlert') : 'Please provide at least 2 items.');
                    return;
                }

                slices.length = 0;
                lines.forEach((line, idx) => {
                    let text = line;
                    let weight = 1;
                    if (line.includes(':')) {
                        const parts = line.split(':');
                        text = parts[0].trim();
                        weight = Math.max(1, parseInt(parts[1].trim(), 10) || 1);
                    }
                    slices.push({
                        id: 's_' + Date.now() + '_' + idx,
                        text: text,
                        color: PALETTE[idx % PALETTE.length],
                        weight: weight,
                        enabled: true
                    });
                });

                if (settings.autoRainbow) {
                    applyRainbowColors();
                }

                saveStateCallback();
                renderSlices();
                wheelEngine.setSlices(slices);
                closeModal(bulkEditModal);
            });
        }

        if (bulkEditCancelBtn) bulkEditCancelBtn.addEventListener('click', () => closeModal(bulkEditModal));
        if (bulkEditCloseBtn) bulkEditCloseBtn.addEventListener('click', () => closeModal(bulkEditModal));

        if (bulkEditModal) {
            bulkEditModal.addEventListener('click', (e) => {
                if (e.target === bulkEditModal) {
                    closeModal(bulkEditModal);
                }
            });
        }

        renderSlices();
    }

    function openModal(el) {
        if (el) el.classList.add('is-open');
    }
    function closeModal(el) {
        if (el) el.classList.remove('is-open');
    }

    function hslToHex(h, s, l) {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function applyRainbowColors() {
        if (!slices || slices.length === 0) return;
        const total = slices.length;
        slices.forEach((slice, idx) => {
            if (!slice._originalColor) {
                slice._originalColor = slice.color;
            }
            // Evenly distribute from Red (0°) through Yellow, Green, Blue, Violet to Magenta/Pink (315°)
            const hue = total <= 1 ? 0 : Math.round((idx / (total - 1)) * 315);
            slice.color = hslToHex(hue, 85, 52);
        });
    }

    function restoreOriginalColors() {
        slices.forEach((slice, idx) => {
            if (slice._originalColor) {
                slice.color = slice._originalColor;
                delete slice._originalColor;
            } else {
                slice.color = PALETTE[idx % PALETTE.length];
            }
        });
    }

    function updateToggleAllBtnUI() {
        if (!toggleAllSlicesBtn || !toggleAllText || !toggleAllIcon) return;
        const hasDisabled = slices.some(s => s.enabled === false);
        const i18n = window.LuckyWheelI18n;
        if (hasDisabled) {
            toggleAllIcon.textContent = '👁️';
            toggleAllText.textContent = i18n ? i18n.t('slices.showAll') : 'Hiện Hết';
        } else {
            toggleAllIcon.textContent = '🙈';
            toggleAllText.textContent = i18n ? i18n.t('slices.hideAll') : 'Ẩn Hết';
        }
    }

    function handleSortChange(e) {
        const sortType = e.target.value;
        if (!sortType || slices.length < 2) {
            if (sortSelect) sortSelect.value = '';
            return;
        }

        if (sortType === 'az') {
            slices.sort((a, b) => (a.text || '').localeCompare(a.text || '', 'vi', { sensitivity: 'base', numeric: true }));
        } else if (sortType === 'za') {
            slices.sort((a, b) => (b.text || '').localeCompare(a.text || '', 'vi', { sensitivity: 'base', numeric: true }));
        } else if (sortType === 'weight-desc') {
            slices.sort((a, b) => (b.weight || 1) - (a.weight || 1));
        } else if (sortType === 'weight-asc') {
            slices.sort((a, b) => (a.weight || 1) - (b.weight || 1));
        }

        if (settings.autoRainbow) {
            applyRainbowColors();
        }
        saveStateCallback();
        renderSlices();
        wheelEngine.setSlices(slices);
        if (sortSelect) sortSelect.value = '';
    }

    function renderSlices() {
        if (settings.autoRainbow) {
            applyRainbowColors();
        }

        slicesListEl.innerHTML = '';
        if (sliceCountBadge) sliceCountBadge.textContent = `${slices.length}`;
        if (tabSliceCountBadge) tabSliceCountBadge.textContent = `${slices.length}`;

        slices.forEach((slice, index) => {
            const li = document.createElement('li');
            li.className = `slice-item ${slice.enabled === false ? 'is-disabled' : ''}`;
            li.dataset.id = slice.id;
            li.dataset.index = index;
            li.draggable = true;

            const isEqualMode = settings.sizingMode === 'equal';
            const displayWeight = isEqualMode ? 1 : (slice.weight || 1);
            const isRainbowLocked = !!settings.autoRainbow;

            li.innerHTML = `
                <div class="slice-drag-handle">
                    <span class="drag-grip-icon">⠿</span>
                    <span class="slice-index">${index + 1}</span>
                </div>
                <input type="color" class="input-color slice-color-picker" value="${slice.color}" ${isRainbowLocked ? 'disabled' : ''}>
                <span class="slice-text">${escapeHtml(slice.text)}</span>
                <input type="number" class="slice-weight-input" value="${displayWeight}" min="1" max="100" ${isEqualMode ? 'disabled' : ''}>
                <div class="slice-actions">
                    <button type="button" class="btn-item-action btn-toggle">
                        ${slice.enabled === false ? '⚪' : '🟢'}
                    </button>
                    <button type="button" class="btn-item-action btn-delete">✕</button>
                </div>
            `;

            // Color picker change
            const colorInput = li.querySelector('.slice-color-picker');
            colorInput.addEventListener('click', (e) => {
                if (settings.autoRainbow) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            colorInput.addEventListener('input', (e) => {
                if (settings.autoRainbow) return;
                slice.color = e.target.value;
                slice._originalColor = e.target.value;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            });

            // Direct weight edit on item row
            const weightInput = li.querySelector('.slice-weight-input');
            const handleWeightUpdate = (e) => {
                if (settings.sizingMode === 'equal') return;
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 100) val = 100;
                e.target.value = val;
                slice.weight = val;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            };
            weightInput.addEventListener('change', handleWeightUpdate);
            weightInput.addEventListener('input', (e) => {
                if (settings.sizingMode === 'equal') return;
                let val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 100) {
                    slice.weight = val;
                    saveStateCallback();
                    wheelEngine.setSlices(slices);
                }
            });

            // Middle-mouse wheel scroll to increment / decrement weight
            weightInput.addEventListener('wheel', (e) => {
                if (settings.sizingMode === 'equal') return;
                e.preventDefault();
                let current = parseInt(weightInput.value, 10) || 1;
                if (e.deltaY < 0) {
                    current = Math.min(100, current + 1);
                } else if (e.deltaY > 0) {
                    current = Math.max(1, current - 1);
                }
                weightInput.value = current;
                slice.weight = current;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            }, { passive: false });

            // Inline edit slice text on single click
            const textSpan = li.querySelector('.slice-text');
            textSpan.addEventListener('click', () => {
                const currentText = slice.text;
                const inlineInput = document.createElement('input');
                inlineInput.type = 'text';
                inlineInput.className = 'form-input';
                inlineInput.style.height = '24px';
                inlineInput.style.fontSize = '12px';
                inlineInput.value = currentText;
                textSpan.replaceWith(inlineInput);
                inlineInput.focus();
                inlineInput.select();

                inlineInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (val.trim()) {
                        slice.text = val;
                        wheelEngine.setSlices(slices);
                    }
                });

                let isDone = false;
                const finishEdit = () => {
                    if (isDone) return;
                    isDone = true;
                    const val = inlineInput.value.trim();
                    if (val) {
                        slice.text = val;
                        saveStateCallback();
                        wheelEngine.setSlices(slices);
                    }
                    renderSlices();
                };

                inlineInput.addEventListener('blur', finishEdit);
                inlineInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishEdit();
                    } else if (e.key === 'Escape') {
                        isDone = true;
                        renderSlices();
                    }
                });
            });

            // Toggle enable / disable
            const toggleBtn = li.querySelector('.btn-toggle');
            toggleBtn.addEventListener('click', () => {
                slice.enabled = slice.enabled === false ? true : false;
                saveStateCallback();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            // Delete slice
            const deleteBtn = li.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => {
                const idx = slices.findIndex(s => s.id === slice.id);
                if (idx !== -1) {
                    slices.splice(idx, 1);
                }
                saveStateCallback();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            // HTML5 Drag and Drop reordering
            li.addEventListener('dragstart', (e) => {
                draggedSliceIndex = index;
                li.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
            });

            li.addEventListener('dragend', () => {
                draggedSliceIndex = null;
                li.classList.remove('is-dragging');
                slicesListEl.querySelectorAll('.slice-item').forEach(el => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            });

            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                if (e.clientY < midpoint) {
                    li.classList.add('drag-over-top');
                    li.classList.remove('drag-over-bottom');
                } else {
                    li.classList.add('drag-over-bottom');
                    li.classList.remove('drag-over-top');
                }
            });

            li.addEventListener('dragleave', (e) => {
                if (!li.contains(e.relatedTarget)) {
                    li.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });

            li.addEventListener('drop', (e) => {
                e.preventDefault();
                li.classList.remove('drag-over-top', 'drag-over-bottom');
                if (draggedSliceIndex === null || draggedSliceIndex === undefined) return;
                const fromIdx = draggedSliceIndex;
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                let toIdx = e.clientY < midpoint ? index : index + 1;

                if (fromIdx === toIdx || (fromIdx === toIdx - 1 && e.clientY >= midpoint)) return;

                const [movedItem] = slices.splice(fromIdx, 1);
                if (fromIdx < toIdx) {
                    toIdx--;
                }
                slices.splice(toIdx, 0, movedItem);

                if (settings.autoRainbow) {
                    applyRainbowColors();
                }
                saveStateCallback();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            slicesListEl.appendChild(li);
        });

        // Always append the inline auto-add row at the bottom
        appendNewSliceRow();
        updateToggleAllBtnUI();
    }

    /**
     * Bottom Inline Auto-Adding Slice Row
     */
    function appendNewSliceRow() {
        const isEqualMode = settings.sizingMode === 'equal';
        const nextColor = settings.autoRainbow
            ? hslToHex(slices.length <= 0 ? 0 : Math.round((slices.length / Math.max(1, slices.length)) * 315), 85, 52)
            : PALETTE[slices.length % PALETTE.length];
        const i18n = window.LuckyWheelI18n;
        const placeholderText = i18n ? i18n.t('slices.newPlaceholder') : '+ Nhập để thêm ô mới...';
        const isRainbowLocked = !!settings.autoRainbow;

        const newLi = document.createElement('li');
        newLi.className = 'slice-item slice-item-new';
        newLi.innerHTML = `
            <div class="slice-drag-handle is-new">
                <span class="drag-grip-icon" style="visibility: hidden;">⠿</span>
                <span class="slice-index">+</span>
            </div>
            <input type="color" class="input-color slice-color-picker new-slice-color" value="${nextColor}" ${isRainbowLocked ? 'disabled' : ''}>
            <input type="text" class="new-slice-input" placeholder="${placeholderText}" autocomplete="off">
            <input type="number" class="slice-weight-input new-slice-weight" value="1" min="1" max="100" ${isEqualMode ? 'disabled' : ''}>
        `;

        const nameInput = newLi.querySelector('.new-slice-input');
        const colorInput = newLi.querySelector('.new-slice-color');
        const weightInput = newLi.querySelector('.new-slice-weight');

        let createdSlice = null;

        nameInput.addEventListener('input', () => {
            const val = nameInput.value;
            if (!createdSlice) {
                if (val.length > 0) {
                    const newId = 's_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    createdSlice = {
                        id: newId,
                        text: val,
                        color: colorInput.value,
                        weight: parseInt(weightInput.value, 10) || 1,
                        enabled: true
                    };
                    slices.push(createdSlice);
                    if (settings.autoRainbow) {
                        applyRainbowColors();
                        // Update color picker values for existing items
                        slicesListEl.querySelectorAll('.slice-item:not(.slice-item-new)').forEach(row => {
                            const sId = row.dataset.id;
                            const sl = slices.find(s => s.id === sId);
                            if (sl) {
                                const cp = row.querySelector('.slice-color-picker');
                                if (cp) cp.value = sl.color;
                            }
                        });
                        colorInput.value = createdSlice.color;
                    }
                    saveStateCallback();
                    wheelEngine.setSlices(slices);
                    if (sliceCountBadge) sliceCountBadge.textContent = `${slices.length}`;
                    if (tabSliceCountBadge) tabSliceCountBadge.textContent = `${slices.length}`;
                    updateToggleAllBtnUI();

                    newLi.classList.remove('slice-item-new');
                    newLi.dataset.id = newId;

                    // Immediately spawn the next empty input row beneath it!
                    appendNewSliceRow();
                }
            } else {
                createdSlice.text = val;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            }
        });

        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (createdSlice) {
                    const allInputs = slicesListEl.querySelectorAll('.new-slice-input');
                    const lastInput = allInputs[allInputs.length - 1];
                    if (lastInput && lastInput !== nameInput) {
                        lastInput.focus();
                    } else {
                        renderSlices();
                        const next = slicesListEl.querySelector('.slice-item-new .new-slice-input');
                        if (next) next.focus();
                    }
                }
            }
        });

        nameInput.addEventListener('blur', () => {
            if (createdSlice && !createdSlice.text.trim()) {
                const idx = slices.findIndex(s => s.id === createdSlice.id);
                if (idx !== -1) {
                    slices.splice(idx, 1);
                }
                saveStateCallback();
                wheelEngine.setSlices(slices);
                renderSlices();
            } else if (createdSlice) {
                renderSlices();
            }
        });

        colorInput.addEventListener('click', (e) => {
            if (settings.autoRainbow) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        colorInput.addEventListener('input', (e) => {
            if (settings.autoRainbow) return;
            if (createdSlice) {
                createdSlice.color = e.target.value;
                createdSlice._originalColor = e.target.value;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            }
        });

        weightInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 100) val = 100;
            e.target.value = val;
            if (createdSlice) {
                createdSlice.weight = val;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            }
        });

        weightInput.addEventListener('wheel', (e) => {
            if (isEqualMode) return;
            e.preventDefault();
            let current = parseInt(weightInput.value, 10) || 1;
            if (e.deltaY < 0) current = Math.min(100, current + 1);
            else if (e.deltaY > 0) current = Math.max(1, current - 1);
            weightInput.value = current;
            if (createdSlice) {
                createdSlice.weight = current;
                saveStateCallback();
                wheelEngine.setSlices(slices);
            }
        }, { passive: false });

        // Drop handler on bottom row to place dragged item at the end
        newLi.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            newLi.classList.add('drag-over-top');
        });

        newLi.addEventListener('dragleave', () => {
            newLi.classList.remove('drag-over-top');
        });

        newLi.addEventListener('drop', (e) => {
            e.preventDefault();
            newLi.classList.remove('drag-over-top');
            if (draggedSliceIndex === null || draggedSliceIndex === undefined) return;
            const [movedItem] = slices.splice(draggedSliceIndex, 1);
            slices.push(movedItem);
            if (settings.autoRainbow) {
                applyRainbowColors();
            }
            saveStateCallback();
            renderSlices();
            wheelEngine.setSlices(slices);
        });

        slicesListEl.appendChild(newLi);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setSlices(newSlices) {
        slices = newSlices;
        renderSlices();
    }

    function getSlices() {
        return slices;
    }

    return {
        init,
        renderSlices,
        applyRainbowColors,
        restoreOriginalColors,
        updateToggleAllBtnUI,
        setSlices,
        getSlices
    };
})();
