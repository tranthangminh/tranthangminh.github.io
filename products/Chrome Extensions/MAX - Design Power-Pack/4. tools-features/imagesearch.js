/**
 * imagesearch.js — MAX Design Power-Pack
 * Reverse Image Search via Yandex & TinEye
 */

const YANDEX_SEARCH_KEY = 'yandexSearchEnabled';
const TINEYE_SEARCH_KEY = 'tineyeSearchEnabled';

// ── Search Handlers ──
function performYandexImageSearch(imageUrl) {
  if (!imageUrl) return;
  const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: searchUrl, active: true });
  } else {
    window.open(searchUrl, '_blank');
  }
}

function performTinEyeImageSearch(imageUrl) {
  if (!imageUrl) return;
  const searchUrl = `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}&sort=size&order=desc`;
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: searchUrl, active: true });
  } else {
    window.open(searchUrl, '_blank');
  }
}

// ── Context Menu Spec Provider ──
function getImageSearchContextMenuSpecs(data) {
  const searchMaster = data.searchImageMasterEnabled !== false;
  const yandexEnabled = searchMaster && (data.yandexSearchEnabled !== false);
  const tineyeEnabled = searchMaster && (data.tineyeSearchEnabled !== false);

  const items = [];
  if (yandexEnabled) {
    items.push({
      id: 'yandex_search_image',
      parentId: 'max_tools_parent',
      title: '🔎 Search Image on Yandex',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  if (tineyeEnabled) {
    items.push({
      id: 'tineye_search_image',
      parentId: 'max_tools_parent',
      title: '🔎 Search Image on TinEye',
      contexts: ['page', 'selection', 'link', 'image', 'video']
    });
  }
  return items;
}

// ── Context Menu Action Handler ──
function handleImageSearchContextMenuClick(info, tab) {
  if (info.menuItemId === 'yandex_search_image' || info.menuItemId === 'tineye_search_image') {
    if (typeof routeContextMenuToContentScript === 'function') {
      routeContextMenuToContentScript(info, tab);
    }
    return true;
  }
  return false;
}

// Export for background & window
if (typeof self !== 'undefined') {
  self.performYandexImageSearch = performYandexImageSearch;
  self.performTinEyeImageSearch = performTinEyeImageSearch;
  self.getImageSearchContextMenuSpecs = getImageSearchContextMenuSpecs;
  self.handleImageSearchContextMenuClick = handleImageSearchContextMenuClick;
}
if (typeof window !== 'undefined') {
  window.performYandexImageSearch = performYandexImageSearch;
  window.performTinEyeImageSearch = performTinEyeImageSearch;
  window.getImageSearchContextMenuSpecs = getImageSearchContextMenuSpecs;
  window.handleImageSearchContextMenuClick = handleImageSearchContextMenuClick;
}
