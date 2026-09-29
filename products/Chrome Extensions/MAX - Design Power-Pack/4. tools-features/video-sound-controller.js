/**
 * video-sound-controller.js — MAX Design Power-Pack
 * Base Core Floating Video & Sound Controller Script
 */

(function () {
  'use strict';

  let speedControllerEnabled = true;
  const controllers = new Map(); // Maps video elements to their controller elements
  window.maxControllersMap = controllers;

  let globalIdleTimer = null;
  let isMouseOverController = false;

  // Key configurations for storage
  const STORAGE_KEY = 'videoSpeedControllerEnabled';
  const SETTINGS_KEY = 'videoSpeedShortcuts';

  let hudOpacity = 50;

  // Safe extension context & storage helpers
  function isExtensionContextValid() {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }
  window.maxIsExtensionContextValid = isExtensionContextValid;

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
  window.maxSafeStorageSet = safeStorageSet;

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
  window.maxSafeStorageGet = safeStorageGet;

  // Check storage and initialize
  function init() {
    if (isExtensionContextValid()) {
      safeStorageGet([STORAGE_KEY, SETTINGS_KEY], (data) => {
        speedControllerEnabled = data[STORAGE_KEY] !== false; // Default is true
        if (data[SETTINGS_KEY] && data[SETTINGS_KEY].hudOpacity !== undefined) {
          hudOpacity = data[SETTINGS_KEY].hudOpacity;
        }

        if (speedControllerEnabled) {
          startSpeedController();
        }
      });

      try {
        if (isExtensionContextValid() && chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
              if (changes[STORAGE_KEY]) {
                speedControllerEnabled = changes[STORAGE_KEY].newValue !== false;
                if (speedControllerEnabled) {
                  startSpeedController();
                } else {
                  stopSpeedController();
                }
              }
              if (changes[SETTINGS_KEY] && changes[SETTINGS_KEY].newValue) {
                const updated = changes[SETTINGS_KEY].newValue;
                if (updated.hudOpacity !== undefined) {
                  hudOpacity = updated.hudOpacity;
                  for (const [v, c] of controllers.entries()) {
                    c.style.setProperty('--max-hud-opacity', hudOpacity / 100);
                  }
                }
              }
            }
          });
        }
      } catch (e) {}
    } else {
      startSpeedController();
    }
  }

  // Active media listeners
  function handleMediaActivity(e) {
    if (!speedControllerEnabled) return;
    const target = e.target;
    if (target && target.tagName === 'VIDEO' && !controllers.has(target)) {
      setupControllerForVideo(target);
    }
  }

  function startSpeedController() {
    findAndSetupVideos();

    // Attach listeners on document capture phase to catch new videos immediately when they load/play
    document.addEventListener('play', handleMediaActivity, true);
    document.addEventListener('loadedmetadata', handleMediaActivity, true);
    document.addEventListener('loadeddata', handleMediaActivity, true);
    document.addEventListener('canplay', handleMediaActivity, true);
    document.addEventListener('timeupdate', handleMediaActivity, true);

    // Watch for dynamically added video elements (e.g., in SPAs like YouTube, Netflix, Facebook)
    if (!window.__maxVideoObserver) {
      window.__maxVideoObserver = new MutationObserver((mutations) => {
        if (!speedControllerEnabled) return;
        let shouldScan = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'VIDEO' || node.querySelector('video') || node.shadowRoot) {
                  shouldScan = true;
                  break;
                }
              }
            }
          }
          if (shouldScan) break;
        }
        if (shouldScan) {
          findAndSetupVideos();
        }
      });

      window.__maxVideoObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    // Global mousemove for idle/fade logic
    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
  }

  function stopSpeedController() {
    // Remove all controllers from the DOM
    for (const [video, controller] of controllers.entries()) {
      controller.remove();
    }
    controllers.clear();

    document.removeEventListener('play', handleMediaActivity, true);
    document.removeEventListener('loadedmetadata', handleMediaActivity, true);
    document.removeEventListener('loadeddata', handleMediaActivity, true);
    document.removeEventListener('canplay', handleMediaActivity, true);
    document.removeEventListener('timeupdate', handleMediaActivity, true);

    if (window.__maxVideoObserver) {
      window.__maxVideoObserver.disconnect();
      window.__maxVideoObserver = null;
    }

    document.removeEventListener('mousemove', handleGlobalMouseMove);

    if (globalIdleTimer) {
      clearTimeout(globalIdleTimer);
      globalIdleTimer = null;
    }
  }

  // ── Global Mouse Movement & Idle Logic ───────────────────
  function handleGlobalMouseMove() {
    if (!speedControllerEnabled || isMouseOverController) return;

    showAllControllers();

    if (globalIdleTimer) {
      clearTimeout(globalIdleTimer);
    }

    // Keep visible for 3 seconds of mouse inactivity, then fade out
    globalIdleTimer = setTimeout(() => {
      if (!isMouseOverController) {
        hideAllControllers();
      }
    }, 3000);
  }

  function showAllControllers() {
    for (const controller of controllers.values()) {
      controller.classList.add('max-visible');
    }
  }
  window.maxShowAllControllers = showAllControllers;

  function hideAllControllers() {
    for (const controller of controllers.values()) {
      controller.classList.remove('max-visible');
    }
  }
  window.maxHideAllControllers = hideAllControllers;

  // ── Shadow DOM Traversal ─────────────────────────────────
  function getAllVideos(root) {
    const videos = [];
    if (!root) return videos;

    const vEls = root.querySelectorAll ? root.querySelectorAll('video') : [];
    vEls.forEach(v => videos.push(v));

    const allEls = root.querySelectorAll ? root.querySelectorAll('*') : [];
    allEls.forEach(el => {
      if (el.shadowRoot) {
        const shadowVideos = getAllVideos(el.shadowRoot);
        shadowVideos.forEach(sv => videos.push(sv));
      }
    });

    return videos;
  }
  window.maxGetAllVideos = getAllVideos;

  function isInAnyShadow(node) {
    let curr = node;
    while (curr) {
      if (curr instanceof ShadowRoot) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  // ── Video Detection & Controller Setup ───────────────────
  function findAndSetupVideos() {
    if (!speedControllerEnabled) return;
    const allVideos = getAllVideos(document);

    allVideos.forEach((video) => {
      if (controllers.has(video)) return;
      if (video.hasAttribute('data-max-speed-controlled')) return;

      const rect = video.getBoundingClientRect();
      const isTiny = (video.clientWidth > 0 && video.clientWidth < 100) || 
                    (video.clientHeight > 0 && video.clientHeight < 50);
      if (isTiny) return;

      setupControllerForVideo(video);
    });
  }
  window.maxFindAndSetupVideos = findAndSetupVideos;

  function setupControllerForVideo(video) {
    const parent = video.parentElement;
    if (!parent) return;

    // Ensure the parent has relative positioning so the controller places correctly
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.setProperty('position', 'relative', 'important');
    }

    video.setAttribute('data-max-speed-controlled', 'true');

    // Create controller DOM
    const controller = document.createElement('div');
    controller.className = 'max-video-speed-controller';
    controller.style.setProperty('--max-hud-opacity', hudOpacity / 100);

    // Initial position: 2% left, 10% top relative to video dimensions
    const videoHeight = video.clientHeight || video.offsetHeight || 300;
    const videoWidth = video.clientWidth || video.offsetWidth || 500;
    const initTop = Math.max(12, Math.round(videoHeight * 0.06));
    const initLeft = Math.max(8, Math.round(videoWidth * 0.01));

    controller.style.setProperty('top', `${initTop}px`, 'important');
    controller.style.setProperty('left', `${initLeft}px`, 'important');

    // Stop all media player events from bubbling up and triggering play/pause/focus
    ['click', 'dblclick', 'mousedown', 'mouseup', 'keydown', 'keypress', 'keyup'].forEach((event) => {
      controller.addEventListener(event, (e) => e.stopPropagation(), false);
    });

    // Prevent default HTML5 dragstart (ghost images) so custom dragging and sliders work smoothly
    controller.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Make the controller draggable (allowing drag starting from buttons but preventing click action if moved)
    let isDragging = false;
    let hasDragged = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    controller.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      // Do not drag HUD if clicking presets list or settings panel (since those have inputs and sliders)
      if (e.target.closest('.max-speed-presets') || e.target.closest('.max-speed-settings-panel')) {
        return; 
      }

      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;

      // Get current position or default to current offset
      startLeft = controller.offsetLeft;
      startTop = controller.offsetTop;

      // Disable transition animations during drag for snappy movement
      controller.style.setProperty('transition', 'none', 'important');

      document.addEventListener('mousemove', onDragMove, true);
      document.addEventListener('mouseup', onDragEnd, true);

      e.preventDefault();
      e.stopPropagation();
    });

    function onDragMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // If moved more than 4px, mark as drag to prevent clicking action on mouseup
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasDragged = true;
      }

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      controller.style.setProperty('left', `${newLeft}px`, 'important');
      controller.style.setProperty('top', `${newTop}px`, 'important');

      e.preventDefault();
      e.stopPropagation();
    }

    function onDragEnd(e) {
      if (!isDragging) return;
      isDragging = false;

      // Re-enable transition styles (for fade out/in)
      controller.style.removeProperty('transition');

      document.removeEventListener('mousemove', onDragMove, true);
      document.removeEventListener('mouseup', onDragEnd, true);

      e.preventDefault();
      e.stopPropagation();
    }

    // Intercept click on the controller in the capture phase.
    // If we dragged, we prevent the click from reaching the buttons!
    controller.addEventListener('click', (e) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        hasDragged = false; // reset
      }
    }, true);

    // Track mouse hover state on controller
    controller.addEventListener('mouseenter', () => {
      isMouseOverController = true;
      if (globalIdleTimer) {
        clearTimeout(globalIdleTimer);
        globalIdleTimer = null;
      }
    });

    controller.addEventListener('mouseleave', () => {
      isMouseOverController = false;
      if (globalIdleTimer) clearTimeout(globalIdleTimer);
      globalIdleTimer = setTimeout(hideAllControllers, 3000);
    });

    // Mount Video Speed Row & Sound Boost Row
    if (typeof window.maxSetupVideoSpeedRow === 'function') {
      window.maxSetupVideoSpeedRow(video, controller);
    }
    if (typeof window.maxSetupSoundBoostRow === 'function') {
      window.maxSetupSoundBoostRow(video, controller);
    }

    // Clean up observer if controller is removed from DOM
    const cleanupObserver = new MutationObserver((mutations, obs) => {
      if (!controller.isConnected) {
        obs.disconnect();
      }
    });
    cleanupObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Append to video's parent element
    parent.appendChild(controller);
    controllers.set(video, controller);

    // Make visible initially on creation
    showAllControllers();
    if (globalIdleTimer) clearTimeout(globalIdleTimer);
    globalIdleTimer = setTimeout(hideAllControllers, 3000);
  }
  window.maxSetupControllerForVideo = setupControllerForVideo;

  // Center Video HUD Text Popup Trigger
  function triggerCenterHud(video, text, isBoost) {
    if (!video || !document.body.contains(video)) return;

    const targetContainer = document.fullscreenElement || document.body;

    let centerHud = document.querySelector('.max-center-hud');
    if (!centerHud) {
      centerHud = document.createElement('div');
      centerHud.className = 'max-center-hud';
      targetContainer.appendChild(centerHud);
    } else if (centerHud.parentElement !== targetContainer) {
      targetContainer.appendChild(centerHud);
    }

    const rect = video.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Skip if video is completely off-screen
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      return;
    }

    const maxW = rect.width * 0.5;
    const maxH = rect.height * 0.5;

    const containerRect = targetContainer.getBoundingClientRect();
    const relativeLeft = (rect.left - containerRect.left) + (rect.width / 2);
    const relativeTop = (rect.top - containerRect.top) + (rect.height / 2);

    centerHud.style.setProperty('top', `${relativeTop}px`, 'important');
    centerHud.style.setProperty('left', `${relativeLeft}px`, 'important');
    centerHud.style.setProperty('max-width', `${maxW}px`, 'important');
    centerHud.style.setProperty('max-height', `${maxH}px`, 'important');

    const fontCalc = Math.min(maxH * 0.45, maxW * 0.35);
    const fontSize = Math.max(20, Math.min(80, fontCalc));
    centerHud.style.setProperty('font-size', `${fontSize}px`, 'important');

    centerHud.textContent = text;

    if (isBoost) {
      centerHud.classList.add('max-boost-mode');
    } else {
      centerHud.classList.remove('max-boost-mode');
    }

    // 1. Immediately ensure text is in visible state at 50% opacity (0s -> 0.25s fade-in)
    centerHud.classList.add('max-visible');

    // 2. Clear previous hold/fade timers so continuous changes keep text steadily illuminated
    if (centerHud._fadeTimer) {
      clearTimeout(centerHud._fadeTimer);
    }

    // 3. Hold at 50% opacity until 0.75s after last change, then fade out to 0% at 1.0s
    centerHud._fadeTimer = setTimeout(() => {
      centerHud.classList.remove('max-visible');
    }, 750);
  }
  window.maxTriggerCenterHud = triggerCenterHud;

  // Run initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
