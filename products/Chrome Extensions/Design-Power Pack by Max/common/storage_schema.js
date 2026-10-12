/**
 * storage_schema.js — Unified Storage Schema & State Controller for MAX Extension
 * Compatible with both DOM (window) and Service Worker (self/globalThis) contexts
 */

const DEFAULT_SETTINGS = Object.freeze({
  maxTheme: 'dark',                     // 'dark' | 'light'
  currentViewMode: 'sidepanel',         // 'popup' | 'sidepanel'
  popupWidth: 450,
  popupHeight: 580,
  activeTab: 'colorpicker',            // 'colorpicker' | 'screencapture' | 'multimedia' | 'contexttool'
  activeSubTab: 'images',               // 'images' | 'vectors' | 'videos' | 'sounds'
  captureFormat: 'jpg',                  // 'jpg' | 'png' | 'webp'
  captureResolutionScale: 1,            // 1 | 2 | 3
  maxCaptureWidth: 0,                   // 0 = empty / Auto (no limit)
  maxCaptureHeight: 16000,              // Default 16000px limit
  lastCaptureMode: 'visible',            // 'area' | 'visible' | 'full' | 'record'
  enableContextMenuTools: true,
  videoSpeedControllerEnabled: true,
  hideHudState: false
});

/**
 * Safely fetches app settings merged with DEFAULT_SETTINGS
 * Prevents undefined / missing key crashes during extension updates
 */
async function getAppSettings() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ maxSettings: DEFAULT_SETTINGS }, (data) => {
        const merged = { ...DEFAULT_SETTINGS, ...(data.maxSettings || {}) };
        resolve(merged);
      });
    } else {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('maxSettings') : null;
        const parsed = saved ? JSON.parse(saved) : {};
        resolve({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        resolve({ ...DEFAULT_SETTINGS });
      }
    }
  });
}

/**
 * Safely updates specific settings keys immutably
 */
async function updateAppSettings(partialSettings) {
  const current = await getAppSettings();
  const updated = { ...current, ...partialSettings };

  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ maxSettings: updated }, () => {
        resolve(updated);
      });
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('maxSettings', JSON.stringify(updated));
        }
      } catch (e) {}
      resolve(updated);
    }
  });
}

// Global scope exposure (Window & Service Worker compatible)
const _globalScope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
_globalScope.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
_globalScope.getAppSettings = getAppSettings;
_globalScope.updateAppSettings = updateAppSettings;
