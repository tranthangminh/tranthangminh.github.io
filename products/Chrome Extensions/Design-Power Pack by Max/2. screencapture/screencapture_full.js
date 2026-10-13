// Screen Capture — Full Page Module

async function captureFullPage() {
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

  // Trigger unified background service worker full page capture (single source of truth)
  try {
    chrome.runtime.sendMessage({ action: 'trigger_capture_full', tabId: tab.id }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {}
    });
  } catch (e) {}

  // Close popup if in popup window mode
  const isSidePanel = document.body.classList.contains('sidepanel-mode') || window.location.search.includes('view=sidepanel');
  if (!isSidePanel) {
    setTimeout(() => {
      window.close();
    }, 150);
  }
}
