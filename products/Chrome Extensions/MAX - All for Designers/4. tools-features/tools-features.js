/**
 * tools-features.js — MAX Design Power-Pack
 * Master Coordinator for Context Menu Registration, Popup Settings Sync & Action Routing.
 */

// ── Shared Content Script Router Helper ──
function routeContextMenuToContentScript(info, tab) {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'context_menu_action',
      menuItemId: info.menuItemId,
      srcUrl: info.srcUrl
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'context_menu_action',
            menuItemId: info.menuItemId,
            srcUrl: info.srcUrl
          });
        }).catch((err) => {
          console.warn('Failed to inject content.js for context action:', err);
        });
      }
    });
  }
}

// ── Master Context Menu Builder ──
function updateUnifiedContextMenus() {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

  if (self._isUpdatingContextMenus) {
    self._updateContextMenusPending = true;
    return;
  }

  self._isUpdatingContextMenus = true;

  const storageKeys = [
    'saveAsFileTypeEnabled',
    'saveAsFileType_jpg',
    'saveAsFileType_png',
    'saveAsFileType_webp',
    'saveAsFileType_gif',
    'saveAsFileType_pdf',
    'searchImageMasterEnabled',
    'yandexSearchEnabled',
    'tineyeSearchEnabled',
    'screenCaptureContextEnabled',
    'captureContext_area',
    'captureContext_visible',
    'captureContext_full',
    'captureContext_record'
  ];

  chrome.storage.local.get(storageKeys, (data) => {
    // 1. Gather context menu specs from dedicated feature modules
    const captureItems = typeof getScreenCaptureContextMenuSpecs === 'function'
      ? getScreenCaptureContextMenuSpecs(data)
      : [];

    const searchItems = typeof getImageSearchContextMenuSpecs === 'function'
      ? getImageSearchContextMenuSpecs(data)
      : [];

    const saveAsItems = typeof getSaveAsContextMenuSpecs === 'function'
      ? getSaveAsContextMenuSpecs(data)
      : [];

    const hasCapture = captureItems.length > 0;
    const hasSearch = searchItems.length > 0;
    const hasSaveAs = saveAsItems.length > 0;

    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {}

      const finishUpdate = () => {
        self._isUpdatingContextMenus = false;
        if (self._updateContextMenusPending) {
          self._updateContextMenusPending = false;
          updateUnifiedContextMenus();
        }
      };

      if (!hasCapture && !hasSearch && !hasSaveAs) {
        finishUpdate();
        return;
      }

      const safeCreate = (spec) => {
        chrome.contextMenus.create(spec, () => {
          if (chrome.runtime.lastError) {}
        });
      };

      // Create single parent menu item for MAX Tools
      safeCreate({
        id: 'max_tools_parent',
        title: 'MAX — Design Power-Pack',
        contexts: ['page', 'selection', 'link', 'image', 'video']
      });

      // Group 1: Screen Capture Tools
      captureItems.forEach(item => safeCreate(item));

      // Separator Line 1
      if (hasCapture && (hasSearch || hasSaveAs)) {
        safeCreate({
          id: 'sep_1',
          parentId: 'max_tools_parent',
          type: 'separator',
          contexts: ['page', 'selection', 'link', 'image', 'video']
        });
      }

      // Group 2: Search Image Tools
      searchItems.forEach(item => safeCreate(item));

      // Separator Line 2
      if (hasSearch && hasSaveAs) {
        safeCreate({
          id: 'sep_2',
          parentId: 'max_tools_parent',
          type: 'separator',
          contexts: ['page', 'selection', 'link', 'image', 'video']
        });
      }

      // Group 3: Save Image As Options
      saveAsItems.forEach(item => safeCreate(item));

      finishUpdate();
    });
  });
}

// ── Background Service Worker Event Listeners ──
if (typeof window === 'undefined' && typeof chrome !== 'undefined') {
  // Listen for context menu item clicks
  if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (!info || !info.menuItemId) return;

      // Delegate to module handlers in order
      if (typeof handleScreenCaptureContextMenuClick === 'function' && handleScreenCaptureContextMenuClick(info, tab)) {
        return;
      }
      if (typeof handleImageSearchContextMenuClick === 'function' && handleImageSearchContextMenuClick(info, tab)) {
        return;
      }
      if (typeof handleSaveAsContextMenuClick === 'function' && handleSaveAsContextMenuClick(info, tab)) {
        return;
      }
    });
  }

  // Listen for background update messages
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'update_context_menus') {
        updateUnifiedContextMenus();
      }
    });
  }
}

// ── Popup UI Settings Manager ──
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const saveAsTypeToggle = document.getElementById('setting-save-as-type');
    const searchImageMasterToggle = document.getElementById('setting-search-image-master');
    const screenCaptureContextToggle = document.getElementById('setting-screencapture-context');
    const videoSpeedControllerToggle = document.getElementById('setting-video-speed-controller');
    const directImageStudioToggle = document.getElementById('setting-direct-image-studio');

    const masterToggles = [
      { element: saveAsTypeToggle, key: 'saveAsFileTypeEnabled' },
      { element: searchImageMasterToggle, key: 'searchImageMasterEnabled' },
      { element: screenCaptureContextToggle, key: 'screenCaptureContextEnabled' },
      { element: videoSpeedControllerToggle, key: 'videoSpeedControllerEnabled' },
      { element: directImageStudioToggle, key: 'directImageStudioEnabled' }
    ];

    const chips = Array.from(document.querySelectorAll('.context-option-chip'));
    const chipKeys = chips.map(chip => chip.dataset.key).filter(Boolean);
    const masterKeys = masterToggles.map(t => t.key);
    const allKeys = [...masterKeys, ...chipKeys, 'yandexSearchEnabled', 'tineyeSearchEnabled'];

    // Load saved states
    chrome.storage.local.get(allKeys, (data) => {
      masterToggles.forEach(({ element, key }) => {
        if (element) {
          if (key === 'searchImageMasterEnabled') {
            if (data.searchImageMasterEnabled !== undefined) {
              element.checked = data.searchImageMasterEnabled !== false;
            } else {
              element.checked = (data.yandexSearchEnabled !== false || data.tineyeSearchEnabled !== false);
            }
          } else {
            element.checked = data[key] !== false; // Default to true
          }
        }
      });

      chips.forEach(chip => {
        const key = chip.dataset.key;
        if (key) {
          const isEnabled = data[key] !== false; // Default to true
          chip.classList.toggle('active', isEnabled);
        }
      });
    });

    const notifyBackground = () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'update_context_menus' });
      }
    };

    // Save master toggles on change
    masterToggles.forEach(({ element, key }) => {
      if (element) {
        element.addEventListener('change', () => {
          const state = { [key]: element.checked };

          if (key === 'searchImageMasterEnabled') {
            state['yandexSearchEnabled'] = element.checked;
            state['tineyeSearchEnabled'] = element.checked;
            chips.forEach(chip => {
              if (chip.dataset.key === 'yandexSearchEnabled' || chip.dataset.key === 'tineyeSearchEnabled') {
                chip.classList.toggle('active', element.checked);
              }
            });
          }

          chrome.storage.local.set(state, notifyBackground);
        });
      }
    });

    // Save sub-option chips on click
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = chip.dataset.key;
        if (!key) return;

        const isNowActive = !chip.classList.contains('active');
        chip.classList.toggle('active', isNowActive);

        const updateData = { [key]: isNowActive };

        if (key === 'yandexSearchEnabled' || key === 'tineyeSearchEnabled') {
          const yandexChip = chips.find(c => c.dataset.key === 'yandexSearchEnabled');
          const tineyeChip = chips.find(c => c.dataset.key === 'tineyeSearchEnabled');
          const yandexActive = yandexChip ? yandexChip.classList.contains('active') : false;
          const tineyeActive = tineyeChip ? tineyeChip.classList.contains('active') : false;
          const anyActive = yandexActive || tineyeActive;

          if (searchImageMasterToggle) {
            searchImageMasterToggle.checked = anyActive;
          }
          updateData['searchImageMasterEnabled'] = anyActive;
        }

        chrome.storage.local.set(updateData, notifyBackground);
      });
    });
  });
}

// Export for background script & window
if (typeof self !== 'undefined') {
  self.updateUnifiedContextMenus = updateUnifiedContextMenus;
  self.routeContextMenuToContentScript = routeContextMenuToContentScript;
}
if (typeof window !== 'undefined') {
  window.updateUnifiedContextMenus = updateUnifiedContextMenus;
  window.routeContextMenuToContentScript = routeContextMenuToContentScript;
}
