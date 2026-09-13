// Cloud Synchronization Logic for MAX Multi Chat
// Listens to chrome.storage.sync changes to keep multiple devices or tabs synchronized in real-time.

// Listen to Chrome storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  console.log("Received storage change sync from Cloud / other device context", changes);

  // 1. Sync Hierarchy (Groups, Sub-groups, and Channels)
  if (changes.app_hierarchy) {
    const newValue = changes.app_hierarchy.newValue || [];
    appState.hierarchy = newValue;

    // Validate active main group ID
    const activeGroupExists = appState.hierarchy.some(g => g.id === appState.activeMainGroupId);
    if (!activeGroupExists && appState.hierarchy.length > 0) {
      appState.activeMainGroupId = appState.hierarchy[0].id;
    } else if (appState.hierarchy.length === 0) {
      appState.activeMainGroupId = null;
    }

    // Validate active tab ID
    if (appState.activeTabId && !findTabById(appState.activeTabId)) {
      appState.activeTabId = null;
      if (appState.leftTabId && !findTabById(appState.leftTabId)) appState.leftTabId = null;
      if (appState.rightTabId && !findTabById(appState.rightTabId)) appState.rightTabId = null;
      
      // If no tab remains, show welcome guide
      if (!appState.leftTabId && !appState.rightTabId) {
        const welcome = document.getElementById("welcome-screen");
        if (welcome) welcome.style.display = "flex";
      }
    }

    // Redraw UI to reflect cloud updates immediately
    if (typeof renderMainSidebar === "function") renderMainSidebar();
    if (typeof renderSubSidebar === "function") renderSubSidebar();
  }

  // 2. Sync Settings (Sidebar toggle only, excluding Theme)
  if (changes.app_settings) {
    const newSettings = changes.app_settings.newValue;
    if (newSettings) {
      // Sync Sidebar Collapse state
      if (newSettings.subSidebarCollapsed !== undefined && newSettings.subSidebarCollapsed !== appState.subSidebarCollapsed) {
        appState.subSidebarCollapsed = newSettings.subSidebarCollapsed;
        if (typeof applySubSidebarCollapse === "function") applySubSidebarCollapse(appState.subSidebarCollapsed);
      }
    }
  }
});
