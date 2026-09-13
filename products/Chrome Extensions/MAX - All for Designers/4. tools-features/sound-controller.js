/**
 * sound-controller.js — MAX Design Power-Pack
 * Audio Boost (Sound Controller) Content Script
 */

(function () {
  'use strict';

  // Key configurations for storage
  const REMEMBER_BOOST_KEY = 'videoSpeedRememberBoostEnabled';
  const LAST_BOOST_KEY = 'videoSpeedLastBoost';
  const BOOST_SETTINGS_KEY = 'videoSpeedBoostShortcuts';

  // Default shortcut settings (audio boost in dB)
  let boostShortcutSettings = {
    decrease: { key: '[', step: 2 },
    increase: { key: ']', step: 2 },
    reset: { key: ';', value: 0 },
    preferred: { key: "'", value: 20 }
  };
  let rememberBoostLevel = false;
  let lastBoostLevel = 0;

  // Safe extension context & storage helpers
  function isExtensionContextValid() {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function safeStorageSet(items) {
    if (!isExtensionContextValid()) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime && chrome.runtime.lastError) {}
        });
      }
    } catch (e) {}
  }

  function safeStorageGet(keys, callback) {
    if (!isExtensionContextValid()) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, (data) => {
          if (chrome.runtime && chrome.runtime.lastError) return;
          if (typeof callback === 'function') callback(data || {});
        });
      }
    } catch (e) {}
  }

  function ensureMainWorldAudioScript() {
    if (document.getElementById('max-audio-boost-main-script')) return;
    if (!isExtensionContextValid()) return;
    try {
      const script = document.createElement('script');
      script.id = 'max-audio-boost-main-script';
      if (chrome.runtime.getURL) {
        script.src = chrome.runtime.getURL('4. tools-features/sound-controller-main.js');
      }
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {}
  }

  function getBoostText(val) {
    return val > 0 ? `+${val} dB` : `0 dB`;
  }

  // Check storage and initialize
  function init() {
    ensureMainWorldAudioScript();

    if (isExtensionContextValid()) {
      safeStorageGet([REMEMBER_BOOST_KEY, LAST_BOOST_KEY, BOOST_SETTINGS_KEY], (data) => {
        rememberBoostLevel = data[REMEMBER_BOOST_KEY] === true;
        if (data[LAST_BOOST_KEY] !== undefined) {
          lastBoostLevel = data[LAST_BOOST_KEY];
          if (lastBoostLevel >= 100) {
            lastBoostLevel = Math.round((lastBoostLevel - 100) / 4);
            if (lastBoostLevel > 50) lastBoostLevel = 50;
            safeStorageSet({ [LAST_BOOST_KEY]: lastBoostLevel });
          }
        }
        // Load boost shortcut settings from storage
        if (data[BOOST_SETTINGS_KEY]) {
          const storedBoost = data[BOOST_SETTINGS_KEY];
          boostShortcutSettings = {
            decrease: { ...boostShortcutSettings.decrease, ...(storedBoost.decrease || {}) },
            increase: { ...boostShortcutSettings.increase, ...(storedBoost.increase || {}) },
            reset: { ...boostShortcutSettings.reset, ...(storedBoost.reset || {}) },
            preferred: { ...boostShortcutSettings.preferred, ...(storedBoost.preferred || {}) }
          };
          let migrated = false;
          if (boostShortcutSettings.reset.key === 'z') {
            boostShortcutSettings.reset.key = ';';
            migrated = true;
          }
          if (boostShortcutSettings.preferred.key === 'x') {
            boostShortcutSettings.preferred.key = "'";
            migrated = true;
          }
          if (boostShortcutSettings.decrease.step >= 5) {
            boostShortcutSettings.decrease.step = 2;
            boostShortcutSettings.increase.step = 2;
            migrated = true;
          }
          if (boostShortcutSettings.preferred.value >= 50) {
            boostShortcutSettings.preferred.value = 20;
            migrated = true;
          }
          if (boostShortcutSettings.reset.value >= 100) {
            boostShortcutSettings.reset.value = 0;
            migrated = true;
          }
          if (migrated) {
            safeStorageSet({ [BOOST_SETTINGS_KEY]: boostShortcutSettings });
          }
        }
      });

      try {
        if (isExtensionContextValid() && chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
              if (changes[REMEMBER_BOOST_KEY]) {
                rememberBoostLevel = changes[REMEMBER_BOOST_KEY].newValue === true;
              }
              if (changes[LAST_BOOST_KEY]) {
                lastBoostLevel = changes[LAST_BOOST_KEY].newValue || 100;
              }
              if (changes[BOOST_SETTINGS_KEY] && changes[BOOST_SETTINGS_KEY].newValue) {
                const updatedBoost = changes[BOOST_SETTINGS_KEY].newValue;
                boostShortcutSettings = {
                  decrease: { ...boostShortcutSettings.decrease, ...(updatedBoost.decrease || {}) },
                  increase: { ...boostShortcutSettings.increase, ...(updatedBoost.increase || {}) },
                  reset: { ...boostShortcutSettings.reset, ...(updatedBoost.reset || {}) },
                  preferred: { ...boostShortcutSettings.preferred, ...(updatedBoost.preferred || {}) }
                };
              }
            }
          });
        }
      } catch (e) {}
    }

    // Attach global keyboard listener for Audio Boost shortcuts
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // If videos already have controllers, mount sound row
    if (window.maxControllersMap) {
      for (const [video, controller] of window.maxControllersMap.entries()) {
        if (!controller.querySelector('.max-boost-row')) {
          setupSoundBoostRow(video, controller);
        }
      }
    }
  }

  // ── Global Keyboard Shortcuts ─────────────────────────────
  function handleGlobalKeyDown(e) {
    // Ignore shortcuts when Image Studio preview modal / editor is open or active
    const previewModal = document.getElementById('image-preview-modal');
    if (previewModal && (!previewModal.classList.contains('hidden') || previewModal.classList.contains('editor-page-modal'))) {
      return;
    }
    if (typeof window !== 'undefined' && (window.isEditMode || (window.selectedTextObj && window.selectedTextObj.isEditingText))) {
      return;
    }

    // Ignore shortcuts when user is typing in form fields or recording keys
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable ||
      activeEl.classList.contains('max-shortcut-key-box')
    )) {
      return;
    }

    // Ignore if Ctrl, Alt, or Meta keys are held down
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (!e || !e.key) return;
    const pressedKey = (e.key || '').toLowerCase();

    // ── Audio Boost shortcuts ─────────────────────────────
    const bDecKey = boostShortcutSettings.decrease.key.toLowerCase();
    const bIncKey = boostShortcutSettings.increase.key.toLowerCase();
    const bResKey = boostShortcutSettings.reset.key.toLowerCase();
    const bPrefKey = boostShortcutSettings.preferred.key.toLowerCase();

    if (pressedKey === bDecKey || pressedKey === bIncKey || pressedKey === bResKey || pressedKey === bPrefKey) {
      const videos = window.maxGetAllVideos ? window.maxGetAllVideos(document) : Array.from(document.querySelectorAll('video'));
      videos.forEach((video) => {
        let cur = video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0;
        let target = cur;
        if (pressedKey === bDecKey) {
          target = cur - parseFloat(boostShortcutSettings.decrease.step || 2);
        } else if (pressedKey === bIncKey) {
          target = cur + parseFloat(boostShortcutSettings.increase.step || 2);
        } else if (pressedKey === bResKey) {
          const resetVal = parseFloat(boostShortcutSettings.reset.value || 0);
          if (Math.abs(cur - resetVal) > 0.5) {
            video._maxPrevAudioBoostLevel = cur;
            target = resetVal;
          } else if (video._maxPrevAudioBoostLevel !== undefined) {
            target = video._maxPrevAudioBoostLevel;
          } else {
            target = resetVal;
          }
        } else if (pressedKey === bPrefKey) {
          const prefVal = parseFloat(boostShortcutSettings.preferred.value || 20);
          if (cur !== prefVal) {
            video._maxPrevPreferredBoost = cur;
            target = prefVal;
          } else {
            // Re-activating preferred returns to 0 dB or level before preferred
            target = (video._maxPrevPreferredBoost !== undefined && video._maxPrevPreferredBoost !== prefVal)
              ? video._maxPrevPreferredBoost
              : 0;
          }
        }
        target = Math.max(0, Math.min(50, Math.round(target)));
        if (target !== cur) {
          updateAudioBoost(video, target);
        }
      });

      if (typeof window.maxShowAllControllers === 'function') {
        window.maxShowAllControllers();
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  function updateAudioBoost(video, newVal) {
    newVal = Math.max(0, Math.min(50, Math.round(newVal)));
    video._maxAudioBoostLevel = newVal;
    const text = getBoostText(newVal);

    // Trigger center HUD for audio boost changes
    if (video._maxPrevBoostDisplay === undefined) {
      video._maxPrevBoostDisplay = newVal;
    } else if (newVal !== video._maxPrevBoostDisplay) {
      video._maxPrevBoostDisplay = newVal;
      if (typeof window.maxTriggerCenterHud === 'function') {
        window.maxTriggerCenterHud(video, text, true);
      }
    }

    if (rememberBoostLevel) {
      lastBoostLevel = newVal;
      safeStorageSet({ [LAST_BOOST_KEY]: newVal });
    }

    video.dispatchEvent(new CustomEvent('max-set-audio-boost', {
      bubbles: true,
      detail: { db: newVal, level: newVal }
    }));

    updateSoundControllerDisplay(video);
  }

  function updateSoundControllerDisplay(video) {
    if (!window.maxControllersMap) return;
    const controller = window.maxControllersMap.get(video);
    if (!controller) return;

    const boostRow = controller.querySelector('.max-boost-row');
    if (boostRow && video._maxAudioBoostLevel !== undefined) {
      const bVal = video._maxAudioBoostLevel;
      const labelText = getBoostText(bVal);

      const boostDisplay = boostRow.querySelector('.max-speed-display');
      if (boostDisplay) boostDisplay.textContent = labelText;

      const boostSlider = boostRow.querySelector('.max-speed-range-slider');
      if (boostSlider) boostSlider.value = bVal;

      const boostSliderVal = boostRow.querySelector('.max-speed-slider-val');
      if (boostSliderVal) boostSliderVal.textContent = labelText;

      const boostPresetsGrid = boostRow.querySelector('.max-presets-grid');
      if (boostPresetsGrid) {
        const boostPresetVals = [0, 10, 20, 30, 50];
        const boostPresetButtons = boostPresetsGrid.querySelectorAll('.max-preset-btn');
        boostPresetButtons.forEach((btn, index) => {
          if (boostPresetVals[index] === bVal) {
            btn.classList.add('max-active');
          } else {
            btn.classList.remove('max-active');
          }
        });
      }
    }
  }

  // ── Setup Sound Boost Row on HUD Controller ──────────────
  function setupSoundBoostRow(video, controller) {
    if (controller.querySelector('.max-boost-row')) return;

    // Audio Boost Container (% boost display + slider popover on hover)
    const boostContainer = document.createElement('div');
    boostContainer.className = 'max-speed-display-container max-boost-theme';

    const boostDisplay = document.createElement('span');
    boostDisplay.className = 'max-speed-display';
    let currentBoost = rememberBoostLevel ? lastBoostLevel : (video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0);
    boostDisplay.textContent = getBoostText(currentBoost);
    boostDisplay.title = 'Audio Boost (Click to toggle 0 dB / boost)';

    // Apply remembered boost on video startup
    if (rememberBoostLevel && lastBoostLevel > 0) {
      video._maxAudioBoostLevel = lastBoostLevel;
      video.dispatchEvent(new CustomEvent('max-set-audio-boost', {
        bubbles: true,
        detail: { db: lastBoostLevel, level: lastBoostLevel }
      }));
    }

    const boostPopover = document.createElement('div');
    boostPopover.className = 'max-speed-presets';

    // 1. Boost Slider Header
    const boostSliderHeader = document.createElement('div');
    boostSliderHeader.className = 'max-speed-slider-row';
    boostSliderHeader.innerHTML = `<span class="max-speed-slider-label">Audio Boost</span><span class="max-speed-slider-val">${getBoostText(currentBoost)}</span>`;

    // 2. Boost Range Slider (0 dB to +50 dB)
    const boostSlider = document.createElement('input');
    boostSlider.type = 'range';
    boostSlider.className = 'max-speed-range-slider';
    boostSlider.min = '0';
    boostSlider.max = '50';
    boostSlider.step = '1';
    boostSlider.value = currentBoost;

    // 3. Boost Presets Grid
    const boostPresetsGrid = document.createElement('div');
    boostPresetsGrid.className = 'max-presets-grid';
    const boostPresetVals = [0, 10, 20, 30, 50];
    const boostPresetBtns = [];

    boostPresetVals.forEach((val) => {
      const pBtn = document.createElement('button');
      pBtn.className = 'max-preset-btn';
      if (val === currentBoost) pBtn.classList.add('max-active');
      pBtn.textContent = getBoostText(val);
      pBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateAudioBoost(video, val);
      });
      boostPresetsGrid.appendChild(pBtn);
      boostPresetBtns.push(pBtn);
    });

    // Custom drag for boost slider
    let isBoostSliding = false;
    const updateBoostSliderVal = (clientX) => {
      const rect = boostSlider.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      let val = pct * 50;
      updateAudioBoost(video, val);
    };

    boostSlider.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isBoostSliding = true;
      updateBoostSliderVal(e.clientX);
      e.stopPropagation();
      e.preventDefault();
    }, true);

    const handleBoostMove = (e) => {
      if (isBoostSliding) { updateBoostSliderVal(e.clientX); e.stopPropagation(); e.preventDefault(); }
    };
    const handleBoostUp = (e) => {
      if (isBoostSliding) { isBoostSliding = false; e.stopPropagation(); e.preventDefault(); }
    };

    window.addEventListener('mousemove', handleBoostMove, true);
    window.addEventListener('mouseup', handleBoostUp, true);

    boostSlider.addEventListener('input', () => {
      updateAudioBoost(video, parseFloat(boostSlider.value));
    });

    boostContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let cur = video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0;
      let step = parseFloat(boostShortcutSettings.increase.step || 2);
      if (e.deltaY < 0) cur += step; else cur -= step;
      updateAudioBoost(video, cur);
    }, { passive: false });

    boostDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      let cur = video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0;
      if (cur > 0) {
        video._maxPrevAudioBoostLevel = cur;
        updateAudioBoost(video, 0);
      } else if (video._maxPrevAudioBoostLevel && video._maxPrevAudioBoostLevel > 0) {
        updateAudioBoost(video, video._maxPrevAudioBoostLevel);
      } else {
        const prefVal = parseFloat(boostShortcutSettings.preferred.value || 20);
        updateAudioBoost(video, prefVal);
      }
    });

    // JS-based hover for boost popover
    let boostPopoverTimer = null;
    function showBoostPopover() {
      clearTimeout(boostPopoverTimer);
      boostPopover.classList.add('max-popover-visible');
    }
    function hideBoostPopover() {
      clearTimeout(boostPopoverTimer);
      boostPopoverTimer = setTimeout(() => boostPopover.classList.remove('max-popover-visible'), 150);
    }
    boostDisplay.addEventListener('mouseenter', showBoostPopover);
    boostDisplay.addEventListener('mouseleave', hideBoostPopover);
    boostPopover.addEventListener('mouseenter', showBoostPopover);
    boostPopover.addEventListener('mouseleave', hideBoostPopover);

    // Boost - and + buttons
    const boostMinusBtn = document.createElement('button');
    boostMinusBtn.className = 'max-speed-btn max-boost-btn max-boost-minus';
    boostMinusBtn.innerHTML = '−';
    boostMinusBtn.title = `Lower boost by step (Shortcut: ${boostShortcutSettings.decrease.key.toUpperCase()})`;
    boostMinusBtn.addEventListener('click', () => {
      let cur = video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0;
      let step = parseFloat(boostShortcutSettings.decrease.step || 2);
      updateAudioBoost(video, cur - step);
    });

    const boostPlusBtn = document.createElement('button');
    boostPlusBtn.className = 'max-speed-btn max-boost-btn max-boost-plus';
    boostPlusBtn.innerHTML = '+';
    boostPlusBtn.title = `Higher boost by step (Shortcut: ${boostShortcutSettings.increase.key.toUpperCase()})`;
    boostPlusBtn.addEventListener('click', () => {
      let cur = video._maxAudioBoostLevel !== undefined ? video._maxAudioBoostLevel : 0;
      let step = parseFloat(boostShortcutSettings.increase.step || 2);
      updateAudioBoost(video, cur + step);
    });

    // Remember boost level checkbox (right below preset buttons)
    const rememberBoostContainer = document.createElement('label');
    rememberBoostContainer.className = 'max-settings-checkbox-container';
    rememberBoostContainer.innerHTML = `
      <input type="checkbox" class="max-settings-checkbox" ${rememberBoostLevel ? 'checked' : ''}>
      <span class="max-settings-checkbox-label">Remember boost level</span>
    `;
    const rememberBoostCheckbox = rememberBoostContainer.querySelector('.max-settings-checkbox');
    if (rememberBoostCheckbox) {
      rememberBoostCheckbox.addEventListener('change', () => {
        rememberBoostLevel = rememberBoostCheckbox.checked;
        safeStorageSet({ [REMEMBER_BOOST_KEY]: rememberBoostLevel });
        if (rememberBoostLevel) {
          safeStorageSet({ [LAST_BOOST_KEY]: video._maxAudioBoostLevel || 0 });
        }
      });
    }

    // 4. Boost Settings Panel (exact 1:1 copy of settingsPanel structure)
    function saveBoostShortcutsToStorage() {
      safeStorageSet({ [BOOST_SETTINGS_KEY]: boostShortcutSettings });
    }

    const boostSettingsPanel = document.createElement('div');
    boostSettingsPanel.className = 'max-speed-settings-panel';

    function renderBoostSettingsHTML() {
      boostSettingsPanel.innerHTML = `
        <div class="max-settings-header">
          <h4 class="max-settings-title">Shortcut Audio Boost</h4>
        </div>
        <div class="max-settings-combined-row">
          <div class="max-settings-combined-labels">
            <div class="max-settings-row">
              <span class="max-shortcut-label">Decrease boost</span>
              <div class="max-shortcut-key-box" data-action="boost-decrease">${boostShortcutSettings.decrease.key.toUpperCase()}</div>
            </div>
            <div class="max-settings-row">
              <span class="max-shortcut-label">Increase boost</span>
              <div class="max-shortcut-key-box" data-action="boost-increase">${boostShortcutSettings.increase.key.toUpperCase()}</div>
            </div>
          </div>
          <input type="number" class="max-shortcut-val-input" data-action="boost-step" min="1" max="25" step="1" value="${boostShortcutSettings.increase.step}">
        </div>
        <div class="max-settings-row">
          <span class="max-shortcut-label">Reset boost</span>
          <div class="max-shortcut-key-box" data-action="boost-reset">${boostShortcutSettings.reset.key.toUpperCase()}</div>
          <input type="number" class="max-shortcut-val-input" data-action="boost-reset-val" min="0" max="50" step="1" value="${boostShortcutSettings.reset.value}">
        </div>
        <div class="max-settings-row">
          <span class="max-shortcut-label">Preferred boost</span>
          <div class="max-shortcut-key-box" data-action="boost-preferred">${boostShortcutSettings.preferred.key.toUpperCase()}</div>
          <input type="number" class="max-shortcut-val-input" data-action="boost-preferred-val" min="0" max="50" step="1" value="${boostShortcutSettings.preferred.value}">
        </div>
      `;
      setupBoostSettingsListeners();
    }

    function setupBoostSettingsListeners() {
      // Key remap
      const keyBoxes = boostSettingsPanel.querySelectorAll('.max-shortcut-key-box');
      keyBoxes.forEach((box) => {
        box.addEventListener('click', (e) => {
          e.stopPropagation();
          keyBoxes.forEach((b) => b.classList.remove('max-recording'));
          box.classList.add('max-recording');
          const originalText = box.textContent;
          box.textContent = '...';
          const boostKeyCaptureHandler = (ke) => {
            ke.preventDefault();
            ke.stopPropagation();
            const newKey = ke.key.toLowerCase();
            if (newKey === 'escape') {
              box.textContent = originalText;
              box.classList.remove('max-recording');
              window.removeEventListener('keydown', boostKeyCaptureHandler, true);
              return;
            }
            const action = box.dataset.action;
            if (action === 'boost-decrease') {
              boostShortcutSettings.decrease.key = newKey;
              boostMinusBtn.title = `Lower boost by step (Shortcut: ${newKey.toUpperCase()})`;
            } else if (action === 'boost-increase') {
              boostShortcutSettings.increase.key = newKey;
              boostPlusBtn.title = `Higher boost by step (Shortcut: ${newKey.toUpperCase()})`;
            } else if (action === 'boost-reset') {
              boostShortcutSettings.reset.key = newKey;
            } else if (action === 'boost-preferred') {
              boostShortcutSettings.preferred.key = newKey;
            }
            box.textContent = newKey.toUpperCase();
            box.classList.remove('max-recording');
            window.removeEventListener('keydown', boostKeyCaptureHandler, true);
            saveBoostShortcutsToStorage();
          };
          window.addEventListener('keydown', boostKeyCaptureHandler, true);
        });
      });

      // Value inputs
      const inputs = boostSettingsPanel.querySelectorAll('.max-shortcut-val-input');
      inputs.forEach((input) => {
        input.addEventListener('change', () => {
          const action = input.dataset.action;
          const val = parseFloat(input.value);
          if (isNaN(val)) return;
          if (action === 'boost-step') {
            boostShortcutSettings.increase.step = val;
            boostShortcutSettings.decrease.step = val;
          } else if (action === 'boost-reset-val') {
            boostShortcutSettings.reset.value = val;
          } else if (action === 'boost-preferred-val') {
            boostShortcutSettings.preferred.value = val;
          }
          saveBoostShortcutsToStorage();
        });

        input.addEventListener('wheel', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const step = parseFloat(input.step) || 5;
          let val = parseFloat(input.value) || 0;
          if (e.deltaY < 0) val += step; else val -= step;
          const min = parseFloat(input.min);
          const max = parseFloat(input.max);
          if (!isNaN(min)) val = Math.max(min, val);
          if (!isNaN(max)) val = Math.min(max, val);
          input.value = val;
          input.dispatchEvent(new Event('change'));
        }, { passive: false });
      });
    }

    // Assemble boost popover (exact copy of presetsMenu assembly)
    boostPopover.appendChild(boostSliderHeader);
    boostPopover.appendChild(boostSlider);
    boostPopover.appendChild(boostPresetsGrid);
    boostPopover.appendChild(rememberBoostContainer);
    boostPopover.appendChild(boostSettingsPanel);
    renderBoostSettingsHTML();

    boostContainer.appendChild(boostDisplay);
    boostContainer.appendChild(boostPopover);

    const boostRow = document.createElement('div');
    boostRow.className = 'max-controller-row max-boost-row';
    boostRow.appendChild(boostContainer);
    boostRow.appendChild(boostMinusBtn);
    boostRow.appendChild(boostPlusBtn);

    // Append boost row into the controller container
    controller.appendChild(boostRow);

    // Clean up drag listeners if controller is removed
    const cleanupObserver = new MutationObserver((mutations, obs) => {
      if (!controller.isConnected) {
        window.removeEventListener('mousemove', handleBoostMove, true);
        window.removeEventListener('mouseup', handleBoostUp, true);
        obs.disconnect();
      }
    });
    cleanupObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.maxSetupSoundBoostRow = setupSoundBoostRow;

  // Run initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
