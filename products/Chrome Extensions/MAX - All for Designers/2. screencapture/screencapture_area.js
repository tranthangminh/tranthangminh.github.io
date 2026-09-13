// Screen Capture — Custom Area (Selection / Snipping) Module

async function startCustomAreaCapture() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    window.showToast('Active tab not found.');
    return;
  }

  if (isProtectedUrl(tab.url)) {
    window.showToast('Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions. Please try on a normal webpage!');
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
