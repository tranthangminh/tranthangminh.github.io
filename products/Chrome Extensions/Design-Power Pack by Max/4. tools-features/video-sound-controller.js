/**
 * video-sound-controller.js — Design-Power Pack by Max
 * Floating Video & Sound Controller Script (Refactored & Streamlined)
 */

(function () {
  'use strict';

  let speedControllerEnabled = true;
  let scanTimer = null;
  let hudOpacity = 50;

  const controllers = new Map();
  window.maxControllersMap = controllers;

  const STORAGE_KEY = 'videoSpeedControllerEnabled';
  const SETTINGS_KEY = 'videoSpeedShortcuts';

  // Storage & Context Helpers
  const isExtValid = () => typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  const safeGet = (keys, cb) => isExtValid() && chrome.storage?.local?.get(keys, d => !chrome.runtime?.lastError && cb?.(d || {}));
  const safeSet = (items) => isExtValid() && chrome.storage?.local?.set(items, () => chrome.runtime?.lastError);

  window.maxIsExtensionContextValid = isExtValid;
  window.maxSafeStorageGet = safeGet;
  window.maxSafeStorageSet = safeSet;
  window.maxIsSpeedControllerEnabled = () => speedControllerEnabled;

  // Video Eligibility (Visible, connected, and rendered above minimal size)
  const isValidVideo = (v) => v instanceof HTMLVideoElement && v.isConnected && v.clientWidth >= 120 && v.clientHeight >= 60;

  // Resolve True Player Frame Container (Handles YouTube, HTML5 players with letterbox/black bars)
  function getPlayerContainer(video) {
    if (!video) return null;
    const knownPlayer = video.closest('.html5-video-player, .jwplayer, .video-js, [data-player], .player-container, .video-player');
    if (knownPlayer) return knownPlayer;

    let cur = video.parentElement;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const rect = cur.getBoundingClientRect();
      const vRect = video.getBoundingClientRect();
      if (rect.width >= vRect.width * 0.95 && rect.height >= vRect.height * 0.95) {
        const pos = window.getComputedStyle(cur).position;
        if (pos === 'relative' || pos === 'absolute' || pos === 'fixed') {
          return cur;
        }
      }
      cur = cur.parentElement;
    }
    return video.parentElement;
  }
  window.maxGetPlayerContainer = getPlayerContainer;

  // Visibility Helpers
  function showController(c, ms = 2500) {
    if (!c?.isConnected) return;
    c.classList.add('max-visible');
    clearTimeout(c._idleTimer);
    if (ms > 0) {
      c._idleTimer = setTimeout(() => c.classList.remove('max-visible'), ms);
    }
  }

  window.maxShowController = showController;
  window.maxShowAllControllers = (ms = 1500) => controllers.forEach(c => showController(c, ms));
  window.maxHideAllControllers = () => controllers.forEach(c => { clearTimeout(c._idleTimer); c.classList.remove('max-visible'); });

  // DOM Video Discovery (including Shadow DOM)
  function getAllVideos(root = document) {
    if (!root?.querySelectorAll) return [];
    const videos = [...root.querySelectorAll('video')];
    root.querySelectorAll('*').forEach(el => el.shadowRoot && videos.push(...getAllVideos(el.shadowRoot)));
    return videos;
  }
  window.maxGetAllVideos = getAllVideos;

  // Video Detection & Duplicate Prevention
  function findAndSetupVideos() {
    if (!speedControllerEnabled) return;

    // Purge dead controllers
    controllers.forEach((c, v) => {
      if (!v.isConnected || !c.isConnected) {
        c.remove();
        controllers.delete(v);
        v.removeAttribute('data-max-speed-controlled');
      }
    });

    // Remove any duplicate controllers inside the same container
    document.querySelectorAll('.max-video-speed-controller').forEach(ctrl => {
      const siblings = ctrl.parentElement?.querySelectorAll(':scope > .max-video-speed-controller');
      if (siblings && siblings.length > 1) {
        for (let i = 1; i < siblings.length; i++) siblings[i].remove();
      }
    });

    getAllVideos().forEach(v => !controllers.has(v) && !v.hasAttribute('data-max-speed-controlled') && isValidVideo(v) && setupControllerForVideo(v));
  }
  window.maxFindAndSetupVideos = findAndSetupVideos;

  // Setup Controller for Single Video
  function setupControllerForVideo(video) {
    const playerContainer = getPlayerContainer(video) || video.parentElement;
    if (!playerContainer || !isValidVideo(video) || controllers.has(video) || video.hasAttribute('data-max-speed-controlled')) return;

    // Guard: Prevent duplicate controller in the same container or parent
    const existing = playerContainer.querySelector(':scope > .max-video-speed-controller') || video.parentElement?.querySelector(':scope > .max-video-speed-controller');
    if (existing) {
      controllers.set(video, existing);
      video.setAttribute('data-max-speed-controlled', 'true');
      return;
    }

    if (getComputedStyle(playerContainer).position === 'static') {
      playerContainer.style.setProperty('position', 'relative', 'important');
    }
    video.setAttribute('data-max-speed-controlled', 'true');

    // Create Controller DOM
    const controller = document.createElement('div');
    controller.className = 'max-video-speed-controller';
    controller.style.setProperty('--max-hud-opacity', hudOpacity / 100);

    const initTop = Math.max(12, Math.round((video.clientHeight || 300) * 0.06));
    const initLeft = Math.max(8, Math.round((video.clientWidth || 500) * 0.01));
    controller.style.setProperty('top', `${initTop}px`, 'important');
    controller.style.setProperty('left', `${initLeft}px`, 'important');

    ['click', 'dblclick', 'mousedown', 'mouseup', 'keydown', 'keypress', 'keyup'].forEach(e => controller.addEventListener(e, ev => ev.stopPropagation()));
    controller.addEventListener('dragstart', e => { e.preventDefault(); e.stopPropagation(); });

    // Draggable Logic (Compensating for CSS zoom: 0.8 scale factor to maintain 1:1 mouse tracking)
    let isDragging = false, hasDragged = false, startX = 0, startY = 0;
    let startVisualLeft = 0, startVisualTop = 0, zoomFactor = 0.8;

    controller.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.max-speed-presets, .max-speed-settings-panel')) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;

      zoomFactor = parseFloat(window.getComputedStyle(controller).zoom) || 0.8;
      const cRect = controller.getBoundingClientRect();
      const pRect = playerContainer ? playerContainer.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      startVisualLeft = cRect.left - pRect.left;
      startVisualTop = cRect.top - pRect.top;

      controller.style.setProperty('transition', 'none', 'important');

      const onDragMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged = true;

        const newVisualLeft = startVisualLeft + dx;
        const newVisualTop = startVisualTop + dy;

        const maxVisualLeft = (playerContainer?.clientWidth || pRect.width) - cRect.width;
        const maxVisualTop = (playerContainer?.clientHeight || pRect.height) - cRect.height;
        const clampedVisualLeft = Math.max(0, Math.min(Math.max(0, maxVisualLeft), newVisualLeft));
        const clampedVisualTop = Math.max(0, Math.min(Math.max(0, maxVisualTop), newVisualTop));

        controller.style.setProperty('left', `${clampedVisualLeft / zoomFactor}px`, 'important');
        controller.style.setProperty('top', `${clampedVisualTop / zoomFactor}px`, 'important');
        ev.preventDefault();
      };

      const onDragUp = () => {
        isDragging = false;
        controller.style.removeProperty('transition');
        document.removeEventListener('mousemove', onDragMove, true);
        document.removeEventListener('mouseup', onDragUp, true);
      };

      document.addEventListener('mousemove', onDragMove, true);
      document.addEventListener('mouseup', onDragUp, true);
      e.preventDefault();
    });

    controller.addEventListener('click', (e) => {
      if (hasDragged) { e.stopPropagation(); e.preventDefault(); hasDragged = false; }
    }, true);

    // Hover & Idle Listeners covering whole player container, black bars, and video
    const onMove = () => speedControllerEnabled && showController(controller, 2500);
    const onLeave = (e) => {
      const to = e.relatedTarget;
      // If moving into controller, video, or anywhere inside the player container, DO NOT HIDE!
      if (to && (
        to === controller || controller.contains(to) ||
        to === video || video.contains(to) ||
        (playerContainer && (to === playerContainer || playerContainer.contains(to)))
      )) {
        return;
      }
      clearTimeout(controller._idleTimer);
      controller._idleTimer = setTimeout(() => controller.classList.remove('max-visible'), 800);
    };

    video.addEventListener('mousemove', onMove, { passive: true });
    video.addEventListener('mouseleave', onLeave, { passive: true });
    if (playerContainer) {
      playerContainer.addEventListener('mousemove', onMove, { capture: true, passive: true });
      playerContainer.addEventListener('mouseleave', onLeave, { passive: true });
    }
    controller.addEventListener('mousemove', onMove, { passive: true });
    controller.addEventListener('mouseenter', onMove, { passive: true });

    // Mount Rows
    window.maxSetupVideoSpeedRow?.(video, controller);
    window.maxSetupSoundBoostRow?.(video, controller);

    // Cleanup when video or container disconnects
    const cleanup = new MutationObserver(() => {
      if (!controller.isConnected || !video.isConnected) {
        cleanup.disconnect();
        video.removeEventListener('mousemove', onMove);
        video.removeEventListener('mouseleave', onLeave);
        if (playerContainer) {
          playerContainer.removeEventListener('mousemove', onMove, { capture: true });
          playerContainer.removeEventListener('mouseleave', onLeave);
        }
        controller.removeEventListener('mousemove', onMove);
        controller.removeEventListener('mouseenter', onMove);
        clearTimeout(controller._idleTimer);
        controller.remove();
        controllers.delete(video);
        video.removeAttribute('data-max-speed-controlled');
      }
    });
    cleanup.observe(playerContainer, { childList: true });

    playerContainer.appendChild(controller);
    controllers.set(video, controller);
  }
  window.maxSetupControllerForVideo = setupControllerForVideo;

  // Active Media Handler
  function handleMediaActivity(e) {
    const t = e.target;
    if (speedControllerEnabled && t?.tagName === 'VIDEO' && !controllers.has(t) && !t.hasAttribute('data-max-speed-controlled') && isValidVideo(t)) {
      setupControllerForVideo(t);
    }
  }

  // Lifecycle Controller
  function startSpeedController() {
    findAndSetupVideos();
    ['play', 'loadedmetadata', 'loadeddata', 'canplay', 'timeupdate'].forEach(evt => document.addEventListener(evt, handleMediaActivity, true));

    if (!window.__maxVideoObserver) {
      window.__maxVideoObserver = new MutationObserver(() => {
        if (!speedControllerEnabled) return;
        clearTimeout(scanTimer);
        scanTimer = setTimeout(findAndSetupVideos, 80);
      });
      window.__maxVideoObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function stopSpeedController() {
    clearTimeout(scanTimer);
    controllers.forEach((c, v) => {
      clearTimeout(c._idleTimer);
      c.remove();
      v.removeAttribute('data-max-speed-controlled');
    });
    controllers.clear();
    document.querySelectorAll('.max-video-speed-controller').forEach(el => el.remove());
    document.querySelectorAll('[data-max-speed-controlled]').forEach(el => el.removeAttribute('data-max-speed-controlled'));
    ['play', 'loadedmetadata', 'loadeddata', 'canplay', 'timeupdate'].forEach(evt => document.removeEventListener(evt, handleMediaActivity, true));
    window.__maxVideoObserver?.disconnect();
    window.__maxVideoObserver = null;
  }

  // Center Video HUD Text Popup Trigger
  function triggerCenterHud(video, text, isBoost) {
    if (!video?.isConnected) return;
    const target = document.fullscreenElement || document.body;
    let hud = document.querySelector('.max-center-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'max-center-hud';
      target.appendChild(hud);
    } else if (hud.parentElement !== target) {
      target.appendChild(hud);
    }

    const rect = video.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;

    const cRect = target.getBoundingClientRect();
    const maxW = rect.width * 0.5, maxH = rect.height * 0.5;
    const fontSize = Math.max(20, Math.min(80, Math.min(maxH * 0.45, maxW * 0.35)));

    hud.style.setProperty('top', `${rect.top - cRect.top + rect.height / 2}px`, 'important');
    hud.style.setProperty('left', `${rect.left - cRect.left + rect.width / 2}px`, 'important');
    hud.style.setProperty('max-width', `${maxW}px`, 'important');
    hud.style.setProperty('max-height', `${maxH}px`, 'important');
    hud.style.setProperty('font-size', `${fontSize}px`, 'important');
    hud.textContent = text;
    hud.classList.toggle('max-boost-mode', !!isBoost);
    hud.classList.add('max-visible');

    clearTimeout(hud._fadeTimer);
    hud._fadeTimer = setTimeout(() => hud.classList.remove('max-visible'), 750);
  }
  window.maxTriggerCenterHud = triggerCenterHud;

  // Initialize
  function init() {
    if (!isExtValid()) return startSpeedController();

    safeGet([STORAGE_KEY, SETTINGS_KEY], (data) => {
      speedControllerEnabled = data[STORAGE_KEY] !== false;
      hudOpacity = data[SETTINGS_KEY]?.hudOpacity ?? hudOpacity;
      if (speedControllerEnabled) startSpeedController();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[STORAGE_KEY]) {
        speedControllerEnabled = changes[STORAGE_KEY].newValue !== false;
        speedControllerEnabled ? startSpeedController() : stopSpeedController();
      }
      if (changes[SETTINGS_KEY]?.newValue?.hudOpacity !== undefined) {
        hudOpacity = changes[SETTINGS_KEY].newValue.hudOpacity;
        controllers.forEach(c => c.style.setProperty('--max-hud-opacity', hudOpacity / 100));
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
