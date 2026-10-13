// Screen Capture — Custom Area (Selection / Snipping) Module

async function startCustomAreaCapture() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    const notFound = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('screencapture.activeTabNotFound')
      : 'Active tab not found.';
    window.showToast(notFound);
    return;
  }

  if (isProtectedUrl(tab.url)) {
    const restricted = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('screencapture.systemPageRestricted')
      : 'Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions. Please try on a normal webpage!';
    window.showToast(restricted);
    return;
  }

  // Send message to background to start overlay
  try {
    chrome.runtime.sendMessage({ action: 'start_area_capture', tabId: tab.id, windowId: tab.windowId }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {}
    });
  } catch (e) {}

  // Close popup if not in side panel
  const isSidePanel = document.body.classList.contains('sidepanel-mode') || window.location.search.includes('view=sidepanel');
  if (!isSidePanel) {
    setTimeout(() => {
      window.close();
    }, 150);
  }
}
