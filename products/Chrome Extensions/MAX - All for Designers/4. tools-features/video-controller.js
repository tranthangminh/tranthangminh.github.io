/**
 * video-controller.js — MAX Design Power-Pack
 * Floating Video Speed Controller Content Script
 */

(function () {
  'use strict';

  // Key configurations for storage
  const SETTINGS_KEY = 'videoSpeedShortcuts';
  const REMEMBER_KEY = 'videoSpeedRememberEnabled';
  const LAST_SPEED_KEY = 'videoSpeedLastPlayback';

  // Default shortcut settings (speed)
  let shortcutSettings = {
    decrease: { key: 'q', step: 0.05 },
    increase: { key: 'e', step: 0.05 },
    reset: { key: 'r', value: 1.00 },
    preferred: { key: 'g', value: 1.50 },
    hudOpacity: 50
  };
  let rememberPlaybackSpeed = false;
  let lastPlaybackSpeed = 1.0;

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

  // Check storage and initialize
  function init() {
    if (isExtensionContextValid()) {
      safeStorageGet([SETTINGS_KEY, REMEMBER_KEY, LAST_SPEED_KEY], (data) => {
        let migrated = false;
        if (data[SETTINGS_KEY]) {
          const stored = data[SETTINGS_KEY];
          // Safe merge with defaults to prevent crashes on partial/corrupted storage
          shortcutSettings = {
            decrease: { ...shortcutSettings.decrease, ...(stored.decrease || {}) },
            increase: { ...shortcutSettings.increase, ...(stored.increase || {}) },
            reset: { ...shortcutSettings.reset, ...(stored.reset || {}) },
            preferred: { ...shortcutSettings.preferred, ...(stored.preferred || {}) },
            hudOpacity: stored.hudOpacity !== undefined ? stored.hudOpacity : shortcutSettings.hudOpacity
          };

          // Migrate old defaults to new defaults
          if (shortcutSettings.decrease.key === 's' || shortcutSettings.decrease.key === 'o') {
            shortcutSettings.decrease.key = 'q';
            migrated = true;
          }
          if (shortcutSettings.increase.key === 'd' || shortcutSettings.increase.key === 'p') {
            shortcutSettings.increase.key = 'e';
            migrated = true;
          }
          if (shortcutSettings.preferred.key === 't') {
            shortcutSettings.preferred.key = 'g';
            migrated = true;
          }
          if (shortcutSettings.decrease.step === 0.1 || shortcutSettings.decrease.step === 0.5) {
            shortcutSettings.decrease.step = 0.05;
            migrated = true;
          }
          if (shortcutSettings.increase.step === 0.1 || shortcutSettings.increase.step === 0.5) {
            shortcutSettings.increase.step = 0.05;
            migrated = true;
          }
          if (shortcutSettings.preferred.value === 1.8) {
            shortcutSettings.preferred.value = 1.50;
            migrated = true;
          }
        } else {
          migrated = true;
        }

        if (migrated) {
          safeStorageSet({ [SETTINGS_KEY]: shortcutSettings });
        }
        rememberPlaybackSpeed = data[REMEMBER_KEY] === true;
        if (data[LAST_SPEED_KEY]) {
          lastPlaybackSpeed = data[LAST_SPEED_KEY];
        }
      });

      try {
        if (isExtensionContextValid() && chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
              if (changes[SETTINGS_KEY] && changes[SETTINGS_KEY].newValue) {
                const updated = changes[SETTINGS_KEY].newValue;
                shortcutSettings = {
                  decrease: { ...shortcutSettings.decrease, ...(updated.decrease || {}) },
                  increase: { ...shortcutSettings.increase, ...(updated.increase || {}) },
                  reset: { ...shortcutSettings.reset, ...(updated.reset || {}) },
                  preferred: { ...shortcutSettings.preferred, ...(updated.preferred || {}) },
                  hudOpacity: updated.hudOpacity !== undefined ? updated.hudOpacity : shortcutSettings.hudOpacity
                };
                if (window.maxControllersMap) {
                  for (const [v, c] of window.maxControllersMap.entries()) {
                    c.style.setProperty('--max-hud-opacity', shortcutSettings.hudOpacity / 100);
                    const stepInput = c.querySelector('.max-shortcut-val-input[data-action="step-shared"]');
                    if (stepInput) stepInput.value = parseFloat(shortcutSettings.increase.step).toFixed(2);
                  }
                }
              }
              if (changes[REMEMBER_KEY]) {
                rememberPlaybackSpeed = changes[REMEMBER_KEY].newValue === true;
              }
              if (changes[LAST_SPEED_KEY]) {
                lastPlaybackSpeed = changes[LAST_SPEED_KEY].newValue || 1.0;
              }
            }
          });
        }
      } catch (e) {}
    }

    // Attach global keyboard listener for Speed shortcuts
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // If videos already have controllers, mount speed row
    if (window.maxControllersMap) {
      for (const [video, controller] of window.maxControllersMap.entries()) {
        if (!controller.querySelector('.max-speed-row')) {
          setupVideoSpeedRow(video, controller);
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

    // Ignore if Ctrl, Alt, or Meta keys are held down (to avoid conflicting with browser shortcuts)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (!e || !e.key) return;
    const pressedKey = (e.key || '').toLowerCase();

    // Check if the pressed key matches any of our custom shortcuts
    const decKey = (shortcutSettings && shortcutSettings.decrease && shortcutSettings.decrease.key) ? shortcutSettings.decrease.key.toLowerCase() : '';
    const incKey = (shortcutSettings && shortcutSettings.increase && shortcutSettings.increase.key) ? shortcutSettings.increase.key.toLowerCase() : '';
    const resKey = (shortcutSettings && shortcutSettings.reset && shortcutSettings.reset.key) ? shortcutSettings.reset.key.toLowerCase() : '';
    const prefKey = (shortcutSettings && shortcutSettings.preferred && shortcutSettings.preferred.key) ? shortcutSettings.preferred.key.toLowerCase() : '';

    if (pressedKey === decKey || pressedKey === incKey || pressedKey === resKey || pressedKey === prefKey) {
      let speedChange = 0;
      let resetSpeed = false;
      let setPreferred = false;

      if (pressedKey === decKey) {
        speedChange = -parseFloat(shortcutSettings.decrease.step || 0.1);
      } else if (pressedKey === incKey) {
        speedChange = parseFloat(shortcutSettings.increase.step || 0.1);
      } else if (pressedKey === resKey) {
        resetSpeed = true;
      } else if (pressedKey === prefKey) {
        setPreferred = true;
      }

      // Apply to all videos found on page (including Shadow DOM)
      let rateChanged = false;
      const videos = window.maxGetAllVideos ? window.maxGetAllVideos(document) : Array.from(document.querySelectorAll('video'));
      videos.forEach((video) => {
        let currentRate = video.playbackRate;
        let targetRate = currentRate;

        if (resetSpeed) {
          const resetVal = parseFloat(shortcutSettings.reset.value || 1.0);
          if (Math.abs(currentRate - resetVal) > 0.01) {
            video._maxPrevRate = currentRate;
            targetRate = resetVal;
          } else if (video._maxPrevRate !== undefined) {
            targetRate = video._maxPrevRate;
          } else {
            targetRate = resetVal;
          }
        } else if (setPreferred) {
          const prefVal = parseFloat(shortcutSettings.preferred.value || 1.50);
          if (Math.abs(currentRate - prefVal) > 0.01) {
            video._maxPrevPreferredRate = currentRate;
            targetRate = prefVal;
          } else {
            // Re-activating preferred returns to 1.00 or rate before preferred
            targetRate = (video._maxPrevPreferredRate !== undefined && Math.abs(video._maxPrevPreferredRate - prefVal) > 0.01)
              ? video._maxPrevPreferredRate
              : 1.00;
          }
        } else {
          targetRate = Math.round((currentRate + speedChange) * 100) / 100;
        }

        // Clamp rate between 0.1x and 16.0x (Chrome constraints)
        targetRate = Math.max(0.1, Math.min(16.0, targetRate));

        if (video.playbackRate !== targetRate) {
          video.playbackRate = targetRate;
          updateSpeedControllerDisplay(video);
          rateChanged = true;
        }
      });

      if (rateChanged) {
        if (typeof window.maxShowAllControllers === 'function') {
          window.maxShowAllControllers();
        }
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  function updateSpeedControllerDisplay(video) {
    if (!window.maxControllersMap) return;
    const controller = window.maxControllersMap.get(video);
    if (!controller) return;

    const currentRate = video.playbackRate;

    // Trigger center HUD for speed changes (skip initial load)
    if (video._maxPrevRateDisplay === undefined) {
      video._maxPrevRateDisplay = currentRate;
    } else if (Math.abs(currentRate - video._maxPrevRateDisplay) > 0.001) {
      video._maxPrevRateDisplay = currentRate;
      if (typeof window.maxTriggerCenterHud === 'function') {
        window.maxTriggerCenterHud(video, `${currentRate.toFixed(2)}x`, false);
      }
    }

    // Speed Row updates
    const speedRow = controller.querySelector('.max-speed-row');
    if (speedRow) {
      const speedDisplay = speedRow.querySelector('.max-speed-display');
      if (speedDisplay) speedDisplay.textContent = formatSpeed(currentRate);

      const speedRangeSlider = speedRow.querySelector('.max-speed-range-slider');
      if (speedRangeSlider) speedRangeSlider.value = Math.min(3, Math.max(0.25, currentRate));

      const speedSliderVal = speedRow.querySelector('.max-speed-slider-val');
      if (speedSliderVal) speedSliderVal.textContent = `${currentRate.toFixed(2)}x`;

      const speedPresetsGrid = speedRow.querySelector('.max-presets-grid');
      if (speedPresetsGrid) {
        const presetValues = [0.75, 1.0, 1.25, 1.5, 2.0];
        const presetButtons = speedPresetsGrid.querySelectorAll('.max-preset-btn');
        presetButtons.forEach((btn, index) => {
          if (Math.abs(currentRate - presetValues[index]) < 0.01) {
            btn.classList.add('max-active');
          } else {
            btn.classList.remove('max-active');
          }
        });
      }
    }
  }

  function adjustSpeed(video, amount) {
    let currentRate = video.playbackRate;
    let step = amount > 0 ? parseFloat(shortcutSettings.increase.step) : -parseFloat(shortcutSettings.decrease.step);
    let targetRate = Math.round((currentRate + step) * 100) / 100;
    // Clamp
    targetRate = Math.max(0.1, Math.min(16.0, targetRate));
    video.playbackRate = targetRate;
    updateSpeedControllerDisplay(video);
  }

  function formatSpeed(rate) {
    return rate.toFixed(2);
  }

  // ── Setup Video Speed Row on HUD Controller ──────────────
  function setupVideoSpeedRow(video, controller) {
    if (controller.querySelector('.max-speed-row')) return;

    // Apply remembered playback speed on video start
    if (rememberPlaybackSpeed) {
      video.playbackRate = lastPlaybackSpeed;
    }

    // Sub-elements creation
    const minusBtn = document.createElement('button');
    minusBtn.className = 'max-speed-btn max-speed-minus';
    minusBtn.innerHTML = '−';
    minusBtn.title = `Slower by step (Shortcut: ${shortcutSettings.decrease.key.toUpperCase()})`;
    minusBtn.addEventListener('click', () => {
      adjustSpeed(video, -1);
    });

    const displayContainer = document.createElement('div');
    displayContainer.className = 'max-speed-display-container';

    const speedDisplay = document.createElement('span');
    speedDisplay.className = 'max-speed-display';
    speedDisplay.textContent = formatSpeed(video.playbackRate);
    speedDisplay.title = `Reset (Shortcut: ${shortcutSettings.reset.key.toUpperCase()})`;
    speedDisplay.addEventListener('click', () => {
      const resetVal = parseFloat(shortcutSettings.reset.value || 1.0);
      let targetRate = resetVal;
      if (Math.abs(video.playbackRate - resetVal) > 0.01) {
        video._maxPrevRate = video.playbackRate;
        targetRate = resetVal;
      } else if (video._maxPrevRate !== undefined) {
        targetRate = video._maxPrevRate;
      }
      video.playbackRate = targetRate;
      updateSpeedControllerDisplay(video);
    });

    // Presets menu (popover: slider + presets grid + settings)
    const presetsMenu = document.createElement('div');
    presetsMenu.className = 'max-speed-presets';

    // Speed slider header
    const speedSliderHeader = document.createElement('div');
    speedSliderHeader.className = 'max-speed-slider-row';
    speedSliderHeader.innerHTML = `<span class="max-speed-slider-label">Video Speed</span><span class="max-speed-slider-val">${formatSpeed(video.playbackRate)}x</span>`;

    // Speed slider (snap 0.5, max 5x)
    const speedRangeSlider = document.createElement('input');
    speedRangeSlider.type = 'range';
    speedRangeSlider.className = 'max-speed-range-slider';
    speedRangeSlider.min = '0.25';
    speedRangeSlider.max = '3';
    speedRangeSlider.step = parseFloat(shortcutSettings.increase.step || 0.05).toFixed(2);
    speedRangeSlider.value = Math.min(3, Math.max(0.25, video.playbackRate));

    // Custom drag for speed slider
    let isSpeedSliding = false;
    const updateSpeedSliderPos = (clientX) => {
      const rect = speedRangeSlider.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      const step = Math.max(0.01, parseFloat(shortcutSettings.increase.step) || 0.05);
      const stepStr = step.toFixed(2);
      if (speedRangeSlider.step !== stepStr) speedRangeSlider.step = stepStr;
      let val = 0.25 + pct * (3 - 0.25);
      val = Math.round(val / step) * step;
      val = Math.max(0.25, Math.min(3, Math.round(val * 100) / 100));
      speedRangeSlider.value = val;
      const valLabel = speedSliderHeader.querySelector('.max-speed-slider-val');
      if (valLabel) valLabel.textContent = `${val.toFixed(2)}x`;
      video.playbackRate = val;
      updateSpeedControllerDisplay(video);
    };

    speedRangeSlider.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isSpeedSliding = true;
      updateSpeedSliderPos(e.clientX);
      e.stopPropagation();
      e.preventDefault();
    }, true);

    const handleSpeedSliderMove = (e) => {
      if (isSpeedSliding) { updateSpeedSliderPos(e.clientX); e.stopPropagation(); e.preventDefault(); }
    };
    const handleSpeedSliderUp = (e) => {
      if (isSpeedSliding) { isSpeedSliding = false; e.stopPropagation(); e.preventDefault(); }
    };
    window.addEventListener('mousemove', handleSpeedSliderMove, true);
    window.addEventListener('mouseup', handleSpeedSliderUp, true);

    speedRangeSlider.addEventListener('input', () => {
      const val = parseFloat(speedRangeSlider.value);
      const valLabel = speedSliderHeader.querySelector('.max-speed-slider-val');
      if (valLabel) valLabel.textContent = `${val.toFixed(2)}x`;
      video.playbackRate = val;
      updateSpeedControllerDisplay(video);
    });

    // Presets grid (5 items: 0.75, 1, 1.25, 1.5, 2)
    const presetsGrid = document.createElement('div');
    presetsGrid.className = 'max-presets-grid';

    const presetValues = [0.75, 1.0, 1.25, 1.5, 2.0];
    presetValues.forEach((val) => {
      const pBtn = document.createElement('button');
      pBtn.className = 'max-preset-btn';
      pBtn.textContent = val + 'x';
      if (Math.abs(video.playbackRate - val) < 0.01) {
        pBtn.classList.add('max-active');
      }
      pBtn.addEventListener('click', () => {
        video.playbackRate = val;
      });
      presetsGrid.appendChild(pBtn);
    });

    // JS-based hover: popover shows ONLY when hovering the speed badge or inside the popover
    let speedPopoverTimer = null;
    function showSpeedPopover() {
      clearTimeout(speedPopoverTimer);
      presetsMenu.classList.add('max-popover-visible');
    }
    function hideSpeedPopover() {
      clearTimeout(speedPopoverTimer);
      speedPopoverTimer = setTimeout(() => presetsMenu.classList.remove('max-popover-visible'), 150);
    }
    speedDisplay.addEventListener('mouseenter', showSpeedPopover);
    speedDisplay.addEventListener('mouseleave', hideSpeedPopover);
    presetsMenu.addEventListener('mouseenter', showSpeedPopover);
    presetsMenu.addEventListener('mouseleave', hideSpeedPopover);

    displayContainer.appendChild(speedDisplay);
    displayContainer.appendChild(presetsMenu);

    const plusBtn = document.createElement('button');
    plusBtn.className = 'max-speed-btn max-speed-plus';
    plusBtn.innerHTML = '+';
    plusBtn.title = `Faster by step (Shortcut: ${shortcutSettings.increase.key.toUpperCase()})`;
    plusBtn.addEventListener('click', () => {
      adjustSpeed(video, 1);
    });

    // Shortcuts Settings Popover Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'max-speed-settings-panel';
    
    function renderSettingsHTML() {
      settingsPanel.innerHTML = `
        <div class="max-settings-header">
          <h4 class="max-settings-title">Shortcut Video Speed</h4>
        </div>
        <div class="max-settings-combined-row">
          <div class="max-settings-combined-labels">
            <div class="max-settings-row">
              <span class="max-shortcut-label">Decrease speed</span>
              <div class="max-shortcut-key-box" data-action="decrease">${shortcutSettings.decrease.key}</div>
            </div>
            <div class="max-settings-row">
              <span class="max-shortcut-label">Increase speed</span>
              <div class="max-shortcut-key-box" data-action="increase">${shortcutSettings.increase.key}</div>
            </div>
          </div>
          <input type="number" class="max-shortcut-val-input" data-action="step-shared" min="0.05" max="2.00" step="0.05" value="${parseFloat(shortcutSettings.increase.step).toFixed(2)}">
        </div>
        <div class="max-settings-row">
          <span class="max-shortcut-label">Reset speed</span>
          <div class="max-shortcut-key-box" data-action="reset">${shortcutSettings.reset.key}</div>
          <input type="number" class="max-shortcut-val-input" data-action="reset" min="0.05" max="16.00" step="0.05" value="${parseFloat(shortcutSettings.reset.value).toFixed(2)}">
        </div>
        <div class="max-settings-row">
          <span class="max-shortcut-label">Preferred speed</span>
          <div class="max-shortcut-key-box" data-action="preferred">${shortcutSettings.preferred.key}</div>
          <input type="number" class="max-shortcut-val-input" data-action="preferred" min="0.05" max="16.00" step="0.05" value="${parseFloat(shortcutSettings.preferred.value).toFixed(2)}">
        </div>
        <div class="max-settings-slider-row">
          <span class="max-settings-slider-label">HUD Opacity <span class="max-opacity-val">${shortcutSettings.hudOpacity !== undefined ? shortcutSettings.hudOpacity : 50}%</span></span>
          <input type="range" class="max-opacity-slider" min="10" max="100" step="5" value="${shortcutSettings.hudOpacity !== undefined ? shortcutSettings.hudOpacity : 50}">
        </div>
      `;
      setupSettingsListeners();
    }

    function setupSettingsListeners() {
      // 1. Value Inputs Change
      const inputs = settingsPanel.querySelectorAll('.max-shortcut-val-input');
      inputs.forEach((input) => {
        input.addEventListener('change', () => {
          const action = input.dataset.action;
          const val = parseFloat(input.value);
          if (isNaN(val)) return;

          if (action === 'step-shared') {
            shortcutSettings.increase.step = val;
            shortcutSettings.decrease.step = val;
            const ctrl = settingsPanel.closest('.max-video-speed-controller');
            if (ctrl) {
              const slider = ctrl.querySelector('.max-speed-range-slider');
              if (slider) slider.step = val.toFixed(2);
            }
          } else if (action === 'decrease' || action === 'increase') {
            shortcutSettings[action].step = val;
          } else if (action === 'reset' || action === 'preferred') {
            shortcutSettings[action].value = val;
          }
          saveShortcutsToStorage();
        });
      });

      // 2.5 Opacity Slider Change
      const opacitySlider = settingsPanel.querySelector('.max-opacity-slider');
      if (opacitySlider) {
        let isSliding = false;

        const updateSliderVal = (clientX) => {
          const rect = opacitySlider.getBoundingClientRect();
          let pct = (clientX - rect.left) / rect.width;
          pct = Math.max(0, Math.min(1, pct));

          const min = parseInt(opacitySlider.min) || 10;
          const max = parseInt(opacitySlider.max) || 100;
          const step = parseInt(opacitySlider.step) || 5;

          let val = min + pct * (max - min);
          val = Math.round(val / step) * step;
          val = Math.max(min, Math.min(max, val));

          opacitySlider.value = val;
          opacitySlider.dispatchEvent(new Event('input'));
        };

        opacitySlider.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          isSliding = true;
          updateSliderVal(e.clientX);
          e.stopPropagation();
          e.preventDefault();
        }, true);

        const handleSliderMove = (e) => {
          if (isSliding) {
            updateSliderVal(e.clientX);
            e.stopPropagation();
            e.preventDefault();
          }
        };

        const handleSliderUp = (e) => {
          if (isSliding) {
            isSliding = false;
            opacitySlider.dispatchEvent(new Event('change'));
            e.stopPropagation();
            e.preventDefault();
          }
        };

        window.addEventListener('mousemove', handleSliderMove, true);
        window.addEventListener('mouseup', handleSliderUp, true);

        // Cleanup global listeners when controller is destroyed
        const ctrl = settingsPanel.closest('.max-video-speed-controller');
        if (ctrl) {
          const observer = new MutationObserver((mutations, obs) => {
            if (!ctrl.isConnected) {
              window.removeEventListener('mousemove', handleSliderMove, true);
              window.removeEventListener('mouseup', handleSliderUp, true);
              obs.disconnect();
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        opacitySlider.addEventListener('input', () => {
          const val = opacitySlider.value;
          const valDisplay = settingsPanel.querySelector('.max-opacity-val');
          if (valDisplay) valDisplay.textContent = `${val}%`;

          shortcutSettings.hudOpacity = parseInt(val);

          if (window.maxControllersMap) {
            for (const c of window.maxControllersMap.values()) {
              c.style.setProperty('--max-hud-opacity', val / 100);
            }
          }
        });

        opacitySlider.addEventListener('change', () => {
          saveShortcutsToStorage();
        });
      }

      // 3. Click to bind new Shortcut Key
      const keyBoxes = settingsPanel.querySelectorAll('.max-shortcut-key-box');
      keyBoxes.forEach((box) => {
        box.addEventListener('click', (e) => {
          e.stopPropagation();
          if (box.classList.contains('max-recording')) return;

          settingsPanel.querySelectorAll('.max-shortcut-key-box').forEach((b) => {
            b.classList.remove('max-recording');
            const act = b.dataset.action;
            b.textContent = shortcutSettings[act].key.toUpperCase();
          });

          box.classList.add('max-recording');
          settingsPanel.classList.add('max-open');
          box.textContent = 'Key...';

          const keyCaptureHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const action = box.dataset.action;
            const newKey = event.key;

            if (newKey === 'Escape') {
              box.classList.remove('max-recording');
              settingsPanel.classList.remove('max-open');
              box.textContent = shortcutSettings[action].key.toUpperCase();
              window.removeEventListener('keydown', keyCaptureHandler, true);
              return;
            }

            if (['Control', 'Shift', 'Alt', 'Meta'].includes(newKey)) return;

            shortcutSettings[action].key = newKey;
            box.textContent = newKey.toUpperCase();
            box.classList.remove('max-recording');
            settingsPanel.classList.remove('max-open');
            saveShortcutsToStorage();

            if (action === 'decrease') minusBtn.title = `Slower by step (Shortcut: ${newKey.toUpperCase()})`;
            if (action === 'increase') plusBtn.title = `Faster by step (Shortcut: ${newKey.toUpperCase()})`;
            if (action === 'reset') speedDisplay.title = `Reset (Shortcut: ${newKey.toUpperCase()})`;

            window.removeEventListener('keydown', keyCaptureHandler, true);
          };

          window.addEventListener('keydown', keyCaptureHandler, true);
        });
      });

      // 4. Mouse Wheel Scroll on inputs
      inputs.forEach((input) => {
        input.addEventListener('wheel', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const step = parseFloat(input.step) || 0.05;
          let val = parseFloat(input.value) || 0;

          if (e.deltaY < 0) {
            val = Math.round((val + step) * 100) / 100;
          } else {
            val = Math.round((val - step) * 100) / 100;
          }

          const min = parseFloat(input.min);
          const max = parseFloat(input.max);
          if (!isNaN(min)) val = Math.max(min, val);
          if (!isNaN(max)) val = Math.min(max, val);

          input.value = val.toFixed(2);
          input.dispatchEvent(new Event('change'));
        }, { passive: false });
      });
    }

    function saveShortcutsToStorage() {
      safeStorageSet({ [SETTINGS_KEY]: shortcutSettings });
    }

    // Remember speed checkbox
    const rememberSpeedContainer = document.createElement('label');
    rememberSpeedContainer.className = 'max-settings-checkbox-container';
    rememberSpeedContainer.innerHTML = `
      <input type="checkbox" class="max-settings-checkbox" ${rememberPlaybackSpeed ? 'checked' : ''}>
      <span class="max-settings-checkbox-label">Remember playback speed</span>
    `;
    const rememberSpeedCheckbox = rememberSpeedContainer.querySelector('.max-settings-checkbox');
    if (rememberSpeedCheckbox) {
      rememberSpeedCheckbox.addEventListener('change', () => {
        rememberPlaybackSpeed = rememberSpeedCheckbox.checked;
        safeStorageSet({ [REMEMBER_KEY]: rememberPlaybackSpeed });
        if (rememberPlaybackSpeed) {
          safeStorageSet({ [LAST_SPEED_KEY]: video.playbackRate });
        }
      });
    }

    // Assemble presetsMenu (slider, grid, remember checkbox, settings panel)
    presetsMenu.appendChild(speedSliderHeader);
    presetsMenu.appendChild(speedRangeSlider);
    presetsMenu.appendChild(presetsGrid);
    presetsMenu.appendChild(rememberSpeedContainer);
    presetsMenu.appendChild(settingsPanel);
    renderSettingsHTML();

    const speedRow = document.createElement('div');
    speedRow.className = 'max-controller-row max-speed-row';
    speedRow.appendChild(displayContainer);
    speedRow.appendChild(minusBtn);
    speedRow.appendChild(plusBtn);

    // Insert speed row as the first row in controller
    if (controller.firstChild) {
      controller.insertBefore(speedRow, controller.firstChild);
    } else {
      controller.appendChild(speedRow);
    }

    // Update preset highlights and label when speed changes natively
    video.addEventListener('ratechange', () => {
      const currentRate = video.playbackRate;
      updateSpeedControllerDisplay(video);

      if (rememberPlaybackSpeed) {
        lastPlaybackSpeed = currentRate;
        safeStorageSet({ [LAST_SPEED_KEY]: currentRate });
      }
    });

    // Clean up drag listeners if controller is removed
    const cleanupObserver = new MutationObserver((mutations, obs) => {
      if (!controller.isConnected) {
        window.removeEventListener('mousemove', handleSpeedSliderMove, true);
        window.removeEventListener('mouseup', handleSpeedSliderUp, true);
        obs.disconnect();
      }
    });
    cleanupObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.maxSetupVideoSpeedRow = setupVideoSpeedRow;

  // Run initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
