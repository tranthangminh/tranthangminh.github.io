/**
 * sound-controller.js — Design-Power Pack by Max
 * Audio Boost Row, Shortcuts & HUD Controller (Streamlined & Anti-Bloat)
 */

(function () {
  'use strict';

  const REMEMBER_BOOST_KEY = 'videoSpeedRememberBoostEnabled';
  const LAST_BOOST_KEY = 'videoSpeedLastBoost';
  const BOOST_SETTINGS_KEY = 'videoSpeedBoostShortcuts';

  let boostShortcutSettings = {
    decrease: { key: '[', step: 2 },
    increase: { key: ']', step: 2 },
    reset: { key: ';', value: 0 },
    preferred: { key: "'", value: 20 }
  };
  let rememberBoostLevel = false;
  let lastBoostLevel = 0;

  const safeGet = (keys, cb) => (window.maxSafeStorageGet || chrome.storage?.local?.get.bind(chrome.storage?.local))(keys, cb);
  const safeSet = (items) => (window.maxSafeStorageSet || chrome.storage?.local?.set.bind(chrome.storage?.local))(items);

  const getBoostText = (val) => val > 0 ? `+${val} dB` : '0 dB';

  function init() {
    safeGet([REMEMBER_BOOST_KEY, LAST_BOOST_KEY, BOOST_SETTINGS_KEY], (data) => {
      rememberBoostLevel = data[REMEMBER_BOOST_KEY] === true;
      if (data[LAST_BOOST_KEY] !== undefined) {
        lastBoostLevel = data[LAST_BOOST_KEY];
        if (lastBoostLevel >= 100) lastBoostLevel = Math.min(50, Math.round((lastBoostLevel - 100) / 4));
      }
      if (data[BOOST_SETTINGS_KEY]) {
        boostShortcutSettings = { ...boostShortcutSettings, ...data[BOOST_SETTINGS_KEY] };
      }
    });

    try {
      chrome.storage?.onChanged?.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes[REMEMBER_BOOST_KEY]) rememberBoostLevel = changes[REMEMBER_BOOST_KEY].newValue === true;
        if (changes[LAST_BOOST_KEY]) lastBoostLevel = changes[LAST_BOOST_KEY].newValue || 0;
        if (changes[BOOST_SETTINGS_KEY]?.newValue) {
          boostShortcutSettings = { ...boostShortcutSettings, ...changes[BOOST_SETTINGS_KEY].newValue };
        }
      });
    } catch {}

    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // Mount sound boost row if controllers already exist
    window.maxControllersMap?.forEach((ctrl, video) => {
      if (!ctrl.querySelector('.max-boost-row')) setupSoundBoostRow(video, ctrl);
    });
  }

  // Audio Boost Application & Event Dispatching
  function updateAudioBoost(video, level) {
    let cleanLevel = Math.max(0, Math.min(50, Math.round(level)));
    video._maxAudioBoostLevel = cleanLevel;

    video.dispatchEvent(new CustomEvent('max-set-audio-boost', {
      bubbles: true,
      detail: { db: cleanLevel, level: cleanLevel }
    }));

    if (rememberBoostLevel) safeSet({ [LAST_BOOST_KEY]: cleanLevel });

    const ctrl = window.maxControllersMap?.get(video);
    if (!ctrl) return;

    const row = ctrl.querySelector('.max-boost-row');
    if (!row) return;

    const display = row.querySelector('.max-speed-display');
    if (display) display.textContent = getBoostText(cleanLevel);

    const slider = row.querySelector('.max-speed-range-slider');
    if (slider) slider.value = cleanLevel;

    const valLabel = row.querySelector('.max-speed-slider-val');
    if (valLabel) valLabel.textContent = getBoostText(cleanLevel);

    row.querySelectorAll('.max-preset-btn').forEach(btn => {
      const val = parseFloat(btn.dataset.val);
      btn.classList.toggle('max-active', val === cleanLevel);
    });

    window.maxTriggerCenterHud?.(video, getBoostText(cleanLevel), true);
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
    const { decrease, increase, reset, preferred } = boostShortcutSettings;

    if (![decrease?.key, increase?.key, reset?.key, preferred?.key].map(k => k?.toLowerCase()).includes(key)) return;

    const rawVideos = window.maxGetAllVideos ? window.maxGetAllVideos(document) : [...document.querySelectorAll('video')];
    const videos = rawVideos.filter(v => v instanceof HTMLVideoElement && v.isConnected && v.clientWidth >= 120 && v.clientHeight >= 60);
    if (videos.length === 0) return;

    let changed = false;

    videos.forEach(video => {
      let cur = video._maxAudioBoostLevel || 0;
      let target = cur;

      if (key === decrease.key.toLowerCase()) target -= parseFloat(decrease.step || 2);
      else if (key === increase.key.toLowerCase()) target += parseFloat(increase.step || 2);
      else if (key === reset.key.toLowerCase()) {
        const resetVal = parseFloat(reset.value || 0);
        target = (cur > 0) ? (video._maxPrevAudioBoostLevel = cur, resetVal) : (video._maxPrevAudioBoostLevel ?? resetVal);
      } else if (key === preferred.key.toLowerCase()) {
        const prefVal = parseFloat(preferred.value || 20);
        target = (cur !== prefVal) ? (video._maxPrevAudioBoostLevel = cur, prefVal) : 0;
      }

      target = Math.max(0, Math.min(50, Math.round(target)));
      if (cur !== target) {
        updateAudioBoost(video, target);
        changed = true;
      }
    });

    if (changed) window.maxShowAllControllers?.();
    e.preventDefault();
    e.stopPropagation();
  }

  // Mount Sound Boost Row
  function setupSoundBoostRow(video, controller) {
    if (controller.querySelector('.max-boost-row')) return;

    let currentBoost = rememberBoostLevel ? lastBoostLevel : (video._maxAudioBoostLevel || 0);
    if (rememberBoostLevel && lastBoostLevel > 0) {
      video._maxAudioBoostLevel = lastBoostLevel;
      video.dispatchEvent(new CustomEvent('max-set-audio-boost', {
        bubbles: true,
        detail: { db: lastBoostLevel, level: lastBoostLevel }
      }));
    }

    const row = document.createElement('div');
    row.className = 'max-controller-row max-boost-row';

    // Minus Button
    const minusBtn = document.createElement('button');
    minusBtn.className = 'max-speed-btn max-boost-btn max-boost-minus';
    minusBtn.textContent = '−';
    minusBtn.title = `Lower Boost (${boostShortcutSettings.decrease.key.toUpperCase()})`;
    minusBtn.addEventListener('click', () => {
      const cur = video._maxAudioBoostLevel || 0;
      updateAudioBoost(video, cur - parseFloat(boostShortcutSettings.decrease.step || 2));
    });

    // Display & Popover Container
    const displayContainer = document.createElement('div');
    displayContainer.className = 'max-speed-display-container max-boost-theme';

    const boostDisplay = document.createElement('span');
    boostDisplay.className = 'max-speed-display';
    boostDisplay.textContent = getBoostText(currentBoost);
    boostDisplay.title = 'Audio Boost (Click to toggle 0 dB / boost)';
    boostDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = video._maxAudioBoostLevel || 0;
      if (cur > 0) {
        video._maxPrevAudioBoostLevel = cur;
        updateAudioBoost(video, 0);
      } else {
        const pref = video._maxPrevAudioBoostLevel || parseFloat(boostShortcutSettings.preferred.value || 20);
        updateAudioBoost(video, pref);
      }
    });

    // Popover Menu (CSS :hover handles display automatically)
    const presetsMenu = document.createElement('div');
    presetsMenu.className = 'max-speed-presets';

    // Slider Header
    const sliderRow = document.createElement('div');
    sliderRow.className = 'max-speed-slider-row';
    sliderRow.innerHTML = `<span class="max-speed-slider-label">Audio Boost</span><span class="max-speed-slider-val">${getBoostText(currentBoost)}</span>`;

    // Native Range Slider
    const rangeSlider = document.createElement('input');
    rangeSlider.type = 'range';
    rangeSlider.className = 'max-speed-range-slider';
    rangeSlider.min = '0';
    rangeSlider.max = '50';
    rangeSlider.step = '1';
    rangeSlider.value = currentBoost;
    rangeSlider.addEventListener('input', () => {
      updateAudioBoost(video, parseFloat(rangeSlider.value));
    });

    // Presets Grid
    const presetsGrid = document.createElement('div');
    presetsGrid.className = 'max-presets-grid';
    [0, 10, 20, 30, 50].forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'max-preset-btn';
      btn.dataset.val = val;
      btn.textContent = getBoostText(val);
      btn.classList.toggle('max-active', val === currentBoost);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateAudioBoost(video, val);
      });
      presetsGrid.appendChild(btn);
    });

    // Remember boost checkbox
    const rememberBox = document.createElement('label');
    rememberBox.className = 'max-settings-checkbox-container';
    rememberBox.innerHTML = `<input type="checkbox" class="max-settings-checkbox" ${rememberBoostLevel ? 'checked' : ''}><span class="max-settings-checkbox-label">Remember boost level</span>`;
    rememberBox.querySelector('input').addEventListener('change', (e) => {
      rememberBoostLevel = e.target.checked;
      safeSet({ [REMEMBER_BOOST_KEY]: rememberBoostLevel, [LAST_BOOST_KEY]: video._maxAudioBoostLevel || 0 });
    });

    // Settings Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'max-speed-settings-panel';
    renderBoostSettingsPanel(settingsPanel);

    presetsMenu.append(sliderRow, rangeSlider, presetsGrid, rememberBox, settingsPanel);
    displayContainer.append(boostDisplay, presetsMenu);

    // Mousewheel on container to adjust boost
    displayContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = video._maxAudioBoostLevel || 0;
      const step = parseFloat(boostShortcutSettings.increase.step || 2);
      updateAudioBoost(video, e.deltaY < 0 ? cur + step : cur - step);
    }, { passive: false });

    // Plus Button
    const plusBtn = document.createElement('button');
    plusBtn.className = 'max-speed-btn max-boost-btn max-boost-plus';
    plusBtn.textContent = '+';
    plusBtn.title = `Higher Boost (${boostShortcutSettings.increase.key.toUpperCase()})`;
    plusBtn.addEventListener('click', () => {
      const cur = video._maxAudioBoostLevel || 0;
      updateAudioBoost(video, cur + parseFloat(boostShortcutSettings.increase.step || 2));
    });

    row.append(displayContainer, minusBtn, plusBtn);
    controller.appendChild(row);
  }

  function renderBoostSettingsPanel(panel) {
    panel.innerHTML = `
      <div class="max-settings-header"><h4 class="max-settings-title">Shortcut Audio Boost</h4></div>
      <div class="max-settings-combined-row">
        <div class="max-settings-combined-labels">
          <div class="max-settings-row"><span class="max-shortcut-label">Decrease boost</span><div class="max-shortcut-key-box" data-action="decrease">${boostShortcutSettings.decrease.key.toUpperCase()}</div></div>
          <div class="max-settings-row"><span class="max-shortcut-label">Increase boost</span><div class="max-shortcut-key-box" data-action="increase">${boostShortcutSettings.increase.key.toUpperCase()}</div></div>
        </div>
        <input type="number" class="max-shortcut-val-input" data-action="boost-step" min="1" max="25" step="1" value="${boostShortcutSettings.increase.step}">
      </div>
      <div class="max-settings-row">
        <span class="max-shortcut-label">Reset boost</span>
        <div class="max-shortcut-key-box" data-action="reset">${boostShortcutSettings.reset.key.toUpperCase()}</div>
        <input type="number" class="max-shortcut-val-input" data-action="reset" min="0" max="50" step="1" value="${boostShortcutSettings.reset.value}">
      </div>
      <div class="max-settings-row">
        <span class="max-shortcut-label">Preferred boost</span>
        <div class="max-shortcut-key-box" data-action="preferred">${boostShortcutSettings.preferred.key.toUpperCase()}</div>
        <input type="number" class="max-shortcut-val-input" data-action="preferred" min="0" max="50" step="1" value="${boostShortcutSettings.preferred.value}">
      </div>
    `;

    panel.querySelectorAll('.max-shortcut-val-input').forEach(input => {
      input.addEventListener('change', () => {
        const { action } = input.dataset;
        const val = parseFloat(input.value);
        if (isNaN(val)) return;
        if (action === 'boost-step') {
          boostShortcutSettings.increase.step = val;
          boostShortcutSettings.decrease.step = val;
        } else if (boostShortcutSettings[action]) {
          boostShortcutSettings[action].value = val;
        }
        safeSet({ [BOOST_SETTINGS_KEY]: boostShortcutSettings });
      });
    });

    panel.querySelectorAll('.max-shortcut-key-box').forEach(box => {
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        if (box.classList.contains('max-recording')) return;
        panel.querySelectorAll('.max-shortcut-key-box').forEach(b => {
          b.classList.remove('max-recording');
          b.textContent = boostShortcutSettings[b.dataset.action]?.key?.toUpperCase() || '';
        });
        box.classList.add('max-recording');
        box.textContent = '...';

        const onKey = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.key === 'Escape') {
            box.classList.remove('max-recording');
            box.textContent = boostShortcutSettings[box.dataset.action].key.toUpperCase();
            window.removeEventListener('keydown', onKey, true);
            return;
          }
          if (['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key)) return;
          const newKey = ev.key.toLowerCase();
          boostShortcutSettings[box.dataset.action].key = newKey;
          box.textContent = newKey.toUpperCase();
          box.classList.remove('max-recording');
          safeSet({ [BOOST_SETTINGS_KEY]: boostShortcutSettings });
          window.removeEventListener('keydown', onKey, true);
        };
        window.addEventListener('keydown', onKey, true);
      });
    });
  }

  // Exports
  window.maxSetupSoundBoostRow = setupSoundBoostRow;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
