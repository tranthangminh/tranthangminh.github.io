/**
 * video-controller.js — Design-Power Pack by Max
 * Video Speed Row, Shortcuts & HUD Controller (Streamlined & Anti-Bloat)
 */

(function () {
  'use strict';

  const SETTINGS_KEY = 'videoSpeedShortcuts';
  const REMEMBER_KEY = 'videoSpeedRememberEnabled';
  const LAST_SPEED_KEY = 'videoSpeedLastPlayback';

  let shortcutSettings = {
    decrease: { key: 'q', step: 0.05 },
    increase: { key: 'e', step: 0.05 },
    reset: { key: 'r', value: 1.00 },
    preferred: { key: 'g', value: 1.50 },
    hudOpacity: 50
  };
  let rememberPlaybackSpeed = false;
  let lastPlaybackSpeed = 1.0;

  const safeGet = (keys, cb) => (window.maxSafeStorageGet || chrome.storage?.local?.get.bind(chrome.storage?.local))(keys, cb);
  const safeSet = (items) => (window.maxSafeStorageSet || chrome.storage?.local?.set.bind(chrome.storage?.local))(items);

  function init() {
    safeGet([SETTINGS_KEY, REMEMBER_KEY, LAST_SPEED_KEY], (data) => {
      if (data[SETTINGS_KEY]) {
        shortcutSettings = { ...shortcutSettings, ...data[SETTINGS_KEY] };
      } else {
        safeSet({ [SETTINGS_KEY]: shortcutSettings });
      }
      rememberPlaybackSpeed = data[REMEMBER_KEY] === true;
      lastPlaybackSpeed = data[LAST_SPEED_KEY] || 1.0;
    });

    try {
      chrome.storage?.onChanged?.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes[SETTINGS_KEY]?.newValue) {
          shortcutSettings = { ...shortcutSettings, ...changes[SETTINGS_KEY].newValue };
          window.maxControllersMap?.forEach(c => {
            c.style.setProperty('--max-hud-opacity', shortcutSettings.hudOpacity / 100);
            const input = c.querySelector('.max-shortcut-val-input[data-action="step-shared"]');
            if (input) input.value = parseFloat(shortcutSettings.increase.step).toFixed(2);
          });
        }
        if (changes[REMEMBER_KEY]) rememberPlaybackSpeed = changes[REMEMBER_KEY].newValue === true;
        if (changes[LAST_SPEED_KEY]) lastPlaybackSpeed = changes[LAST_SPEED_KEY].newValue || 1.0;
      });
    } catch {}

    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // Mount speed row if controllers already exist
    window.maxControllersMap?.forEach((ctrl, video) => {
      if (!ctrl.querySelector('.max-speed-row')) setupVideoSpeedRow(video, ctrl);
    });
  }

  // Global Keyboard Shortcuts
  function handleGlobalKeyDown(e) {
    if (typeof window.maxIsSpeedControllerEnabled === 'function' && !window.maxIsSpeedControllerEnabled()) return;
    const modal = document.getElementById('image-preview-modal');
    if (modal && (!modal.classList.contains('hidden') || modal.classList.contains('editor-page-modal'))) return;
    if (window.isEditMode || window.selectedTextObj?.isEditingText) return;

    const el = document.activeElement;
    if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable || el.classList.contains('max-shortcut-key-box'))) return;
    if (e.ctrlKey || e.altKey || e.metaKey || !e.key) return;

    const key = e.key.toLowerCase();
    const { decrease, increase, reset, preferred } = shortcutSettings;

    if (![decrease?.key, increase?.key, reset?.key, preferred?.key].map(k => k?.toLowerCase()).includes(key)) return;

    const rawVideos = window.maxGetAllVideos ? window.maxGetAllVideos(document) : [...document.querySelectorAll('video')];
    const videos = rawVideos.filter(v => v instanceof HTMLVideoElement && v.isConnected && v.clientWidth >= 120 && v.clientHeight >= 60);
    if (videos.length === 0) return;

    let changed = false;

    videos.forEach(video => {
      let cur = video.playbackRate;
      let target = cur;

      if (key === decrease.key.toLowerCase()) target -= parseFloat(decrease.step || 0.05);
      else if (key === increase.key.toLowerCase()) target += parseFloat(increase.step || 0.05);
      else if (key === reset.key.toLowerCase()) {
        const resetVal = parseFloat(reset.value || 1.0);
        target = (Math.abs(cur - resetVal) > 0.01) ? (video._maxPrevRate = cur, resetVal) : (video._maxPrevRate ?? resetVal);
      } else if (key === preferred.key.toLowerCase()) {
        const prefVal = parseFloat(preferred.value || 1.5);
        target = (Math.abs(cur - prefVal) > 0.01) ? (video._maxPrevPreferredRate = cur, prefVal) : (video._maxPrevPreferredRate ?? 1.00);
      }

      target = Math.max(0.1, Math.min(16.0, Math.round(target * 100) / 100));
      if (video.playbackRate !== target) {
        video.playbackRate = target;
        updateSpeedControllerDisplay(video);
        changed = true;
      }
    });

    if (changed) window.maxShowAllControllers?.();
    e.preventDefault();
    e.stopPropagation();
  }

  function updateSpeedControllerDisplay(video) {
    const ctrl = window.maxControllersMap?.get(video);
    if (!ctrl) return;

    const rate = video.playbackRate;
    if (video._maxPrevRateDisplay === undefined) {
      video._maxPrevRateDisplay = rate;
    } else if (Math.abs(rate - video._maxPrevRateDisplay) > 0.001) {
      video._maxPrevRateDisplay = rate;
      window.maxTriggerCenterHud?.(video, `${rate.toFixed(2)}x`, false);
    }

    const row = ctrl.querySelector('.max-speed-row');
    if (!row) return;

    const display = row.querySelector('.max-speed-display');
    if (display) display.textContent = rate.toFixed(2);

    const slider = row.querySelector('.max-speed-range-slider');
    if (slider) slider.value = Math.min(3, Math.max(0.25, rate));

    const valLabel = row.querySelector('.max-speed-slider-val');
    if (valLabel) valLabel.textContent = `${rate.toFixed(2)}x`;

    row.querySelectorAll('.max-preset-btn').forEach(btn => {
      const val = parseFloat(btn.dataset.val);
      btn.classList.toggle('max-active', Math.abs(rate - val) < 0.01);
    });
  }

  function adjustSpeed(video, dir) {
    const step = dir > 0 ? parseFloat(shortcutSettings.increase.step) : -parseFloat(shortcutSettings.decrease.step);
    const target = Math.max(0.1, Math.min(16.0, Math.round((video.playbackRate + step) * 100) / 100));
    video.playbackRate = target;
    updateSpeedControllerDisplay(video);
  }

  // Mount Speed Row
  function setupVideoSpeedRow(video, controller) {
    if (controller.querySelector('.max-speed-row')) return;
    if (rememberPlaybackSpeed) video.playbackRate = lastPlaybackSpeed;

    const row = document.createElement('div');
    row.className = 'max-controller-row max-speed-row';

    // Minus Button
    const minusBtn = document.createElement('button');
    minusBtn.className = 'max-speed-btn max-speed-minus';
    minusBtn.textContent = '−';
    minusBtn.title = `Slower (${shortcutSettings.decrease.key.toUpperCase()})`;
    minusBtn.addEventListener('click', () => adjustSpeed(video, -1));

    // Display & Popover Container
    const displayContainer = document.createElement('div');
    displayContainer.className = 'max-speed-display-container';

    const speedDisplay = document.createElement('span');
    speedDisplay.className = 'max-speed-display';
    speedDisplay.textContent = video.playbackRate.toFixed(2);
    speedDisplay.title = `Reset (${shortcutSettings.reset.key.toUpperCase()})`;
    speedDisplay.addEventListener('click', () => {
      const resetVal = parseFloat(shortcutSettings.reset.value || 1.0);
      video.playbackRate = Math.abs(video.playbackRate - resetVal) > 0.01 ? (video._maxPrevRate = video.playbackRate, resetVal) : (video._maxPrevRate ?? resetVal);
      updateSpeedControllerDisplay(video);
    });

    // Popover Menu (CSS :hover handles display automatically)
    const presetsMenu = document.createElement('div');
    presetsMenu.className = 'max-speed-presets';

    // Slider Header
    const sliderRow = document.createElement('div');
    sliderRow.className = 'max-speed-slider-row';
    sliderRow.innerHTML = `<span class="max-speed-slider-label">Video Speed</span><span class="max-speed-slider-val">${video.playbackRate.toFixed(2)}x</span>`;

    // Native Range Slider
    const rangeSlider = document.createElement('input');
    rangeSlider.type = 'range';
    rangeSlider.className = 'max-speed-range-slider';
    rangeSlider.min = '0.25';
    rangeSlider.max = '3';
    rangeSlider.step = parseFloat(shortcutSettings.increase.step || 0.05).toFixed(2);
    rangeSlider.value = Math.min(3, Math.max(0.25, video.playbackRate));
    rangeSlider.addEventListener('input', () => {
      const val = parseFloat(rangeSlider.value);
      sliderRow.querySelector('.max-speed-slider-val').textContent = `${val.toFixed(2)}x`;
      video.playbackRate = val;
      updateSpeedControllerDisplay(video);
    });

    // Presets Grid
    const presetsGrid = document.createElement('div');
    presetsGrid.className = 'max-presets-grid';
    [0.75, 1.0, 1.25, 1.5, 2.0].forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'max-preset-btn';
      btn.dataset.val = val;
      btn.textContent = `${val}x`;
      btn.classList.toggle('max-active', Math.abs(video.playbackRate - val) < 0.01);
      btn.addEventListener('click', () => {
        video.playbackRate = val;
        updateSpeedControllerDisplay(video);
      });
      presetsGrid.appendChild(btn);
    });

    // Remember speed checkbox
    const rememberBox = document.createElement('label');
    rememberBox.className = 'max-settings-checkbox-container';
    rememberBox.innerHTML = `<input type="checkbox" class="max-settings-checkbox" ${rememberPlaybackSpeed ? 'checked' : ''}><span class="max-settings-checkbox-label">Remember playback speed</span>`;
    rememberBox.querySelector('input').addEventListener('change', (e) => {
      rememberPlaybackSpeed = e.target.checked;
      safeSet({ [REMEMBER_KEY]: rememberPlaybackSpeed, [LAST_SPEED_KEY]: video.playbackRate });
    });

    // Settings Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'max-speed-settings-panel';
    renderSettingsPanel(settingsPanel);

    presetsMenu.append(sliderRow, rangeSlider, presetsGrid, rememberBox, settingsPanel);
    displayContainer.append(speedDisplay, presetsMenu);

    // Plus Button
    const plusBtn = document.createElement('button');
    plusBtn.className = 'max-speed-btn max-speed-plus';
    plusBtn.textContent = '+';
    plusBtn.title = `Faster (${shortcutSettings.increase.key.toUpperCase()})`;
    plusBtn.addEventListener('click', () => adjustSpeed(video, 1));

    row.append(displayContainer, minusBtn, plusBtn);
    controller.appendChild(row);

    // Sync remember speed on playback rate change
    video.addEventListener('ratechange', () => {
      if (rememberPlaybackSpeed) safeSet({ [LAST_SPEED_KEY]: video.playbackRate });
    });
  }

  function renderSettingsPanel(panel) {
    panel.innerHTML = `
      <div class="max-settings-header"><h4 class="max-settings-title">Shortcut Video Speed</h4></div>
      <div class="max-settings-combined-row">
        <div class="max-settings-combined-labels">
          <div class="max-settings-row"><span class="max-shortcut-label">Decrease speed</span><div class="max-shortcut-key-box" data-action="decrease">${shortcutSettings.decrease.key.toUpperCase()}</div></div>
          <div class="max-settings-row"><span class="max-shortcut-label">Increase speed</span><div class="max-shortcut-key-box" data-action="increase">${shortcutSettings.increase.key.toUpperCase()}</div></div>
        </div>
        <input type="number" class="max-shortcut-val-input" data-action="step-shared" min="0.05" max="2.00" step="0.05" value="${parseFloat(shortcutSettings.increase.step).toFixed(2)}">
      </div>
      <div class="max-settings-row">
        <span class="max-shortcut-label">Reset speed</span>
        <div class="max-shortcut-key-box" data-action="reset">${shortcutSettings.reset.key.toUpperCase()}</div>
        <input type="number" class="max-shortcut-val-input" data-action="reset" min="0.05" max="16.00" step="0.05" value="${parseFloat(shortcutSettings.reset.value).toFixed(2)}">
      </div>
      <div class="max-settings-row">
        <span class="max-shortcut-label">Preferred speed</span>
        <div class="max-shortcut-key-box" data-action="preferred">${shortcutSettings.preferred.key.toUpperCase()}</div>
        <input type="number" class="max-shortcut-val-input" data-action="preferred" min="0.05" max="16.00" step="0.05" value="${parseFloat(shortcutSettings.preferred.value).toFixed(2)}">
      </div>
      <div class="max-settings-slider-row">
        <span class="max-settings-slider-label">HUD Opacity <span class="max-opacity-val">${shortcutSettings.hudOpacity ?? 50}%</span></span>
        <input type="range" class="max-opacity-slider" min="10" max="100" step="5" value="${shortcutSettings.hudOpacity ?? 50}">
      </div>
    `;

    // Listeners for values & opacity
    panel.querySelectorAll('.max-shortcut-val-input').forEach(input => {
      input.addEventListener('change', () => {
        const { action } = input.dataset;
        const val = parseFloat(input.value);
        if (isNaN(val)) return;
        if (action === 'step-shared') {
          shortcutSettings.increase.step = val;
          shortcutSettings.decrease.step = val;
        } else if (shortcutSettings[action]) {
          shortcutSettings[action][action === 'reset' || action === 'preferred' ? 'value' : 'step'] = val;
        }
        safeSet({ [SETTINGS_KEY]: shortcutSettings });
      });
    });

    const opSlider = panel.querySelector('.max-opacity-slider');
    opSlider?.addEventListener('input', () => {
      const val = parseInt(opSlider.value, 10);
      panel.querySelector('.max-opacity-val').textContent = `${val}%`;
      shortcutSettings.hudOpacity = val;
      window.maxControllersMap?.forEach(c => c.style.setProperty('--max-hud-opacity', val / 100));
    });
    opSlider?.addEventListener('change', () => safeSet({ [SETTINGS_KEY]: shortcutSettings }));

    // Key recording boxes
    panel.querySelectorAll('.max-shortcut-key-box').forEach(box => {
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        if (box.classList.contains('max-recording')) return;
        panel.querySelectorAll('.max-shortcut-key-box').forEach(b => {
          b.classList.remove('max-recording');
          b.textContent = shortcutSettings[b.dataset.action]?.key?.toUpperCase() || '';
        });
        box.classList.add('max-recording');
        box.textContent = '...';

        const onKey = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.key === 'Escape') {
            box.classList.remove('max-recording');
            box.textContent = shortcutSettings[box.dataset.action].key.toUpperCase();
            window.removeEventListener('keydown', onKey, true);
            return;
          }
          if (['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key)) return;
          const newKey = ev.key.toLowerCase();
          shortcutSettings[box.dataset.action].key = newKey;
          box.textContent = newKey.toUpperCase();
          box.classList.remove('max-recording');
          safeSet({ [SETTINGS_KEY]: shortcutSettings });
          window.removeEventListener('keydown', onKey, true);
        };
        window.addEventListener('keydown', onKey, true);
      });
    });
  }

  // Exports
  window.maxSetupVideoSpeedRow = setupVideoSpeedRow;
  window.maxUpdateSpeedControllerDisplay = updateSpeedControllerDisplay;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
