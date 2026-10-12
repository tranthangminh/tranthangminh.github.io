// Screen Capture — Visible Area Module

async function captureVisibleArea() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    window.showToast('Active tab not found.');
    return;
  }

  if (isProtectedUrl(tab.url)) {
    window.showToast('Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions. Please try on a normal webpage!');
    return;
  }

  // Trigger unified background service worker visible capture (single source of truth)
  try {
    chrome.runtime.sendMessage({ action: 'trigger_capture_visible', tabId: tab.id }, () => {
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
