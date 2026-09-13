// Session Persistence Logic for MAX Multi Chat
// Handles saving and restoring active groups, tabs, and split view state.

async function saveSessionState() {
  try {
    const sessionData = {
      activeMainGroupId: appState.activeMainGroupId,
      activeTabId: appState.activeTabId,
      splitViewActive: appState.splitViewActive,
      activeView: appState.activeView,
      leftTabId: appState.leftTabId,
      rightTabId: appState.rightTabId,
      windowModeActive: appState.windowModeActive,
      isSplitLinkActive: appState.isSplitLinkActive,
      autohideActive: appState.autohideActive
    };
    await chrome.storage.local.set({ "app_session_state": sessionData });
  } catch (err) {
    console.error("Failed to save session state:", err);
  }
}

async function loadSessionState() {
  try {
    const result = await chrome.storage.local.get("app_session_state");
    if (!result.app_session_state) return false;

    const session = result.app_session_state;

    // Validate left tab
    if (session.leftTabId && findTabById(session.leftTabId)) {
      appState.leftTabId = session.leftTabId;
    }

    // Validate right tab
    if (session.rightTabId && findTabById(session.rightTabId)) {
      appState.rightTabId = session.rightTabId;
    }

    // Validate active tab
    if (session.activeTabId && findTabById(session.activeTabId)) {
      appState.activeTabId = session.activeTabId;
    }

    // Auto-select the Main Group that actually owns the active link being viewed
    const targetTabId = appState.activeTabId || appState.leftTabId;
    let ownerMainGroupId = null;
    if (targetTabId) {
      for (const mainGroup of appState.hierarchy) {
        for (const subGroup of mainGroup.subGroups) {
          if (subGroup.tabs && subGroup.tabs.some(t => t.id === targetTabId)) {
            ownerMainGroupId = mainGroup.id;
            break;
          }
        }
        if (ownerMainGroupId) break;
      }
    }

    if (ownerMainGroupId) {
      appState.activeMainGroupId = ownerMainGroupId;
    } else if (session.activeMainGroupId && appState.hierarchy.some(g => g.id === session.activeMainGroupId)) {
      appState.activeMainGroupId = session.activeMainGroupId;
    }

    // Restore split view toggle
    if (session.splitViewActive !== undefined) {
      appState.splitViewActive = session.splitViewActive;
    }
    
    if (session.activeView) {
      appState.activeView = session.activeView;
    }

    if (session.windowModeActive !== undefined) {
      appState.windowModeActive = session.windowModeActive;
    }

    if (session.isSplitLinkActive !== undefined) {
      appState.isSplitLinkActive = session.isSplitLinkActive;
    }

    if (session.autohideActive !== undefined) {
      appState.autohideActive = session.autohideActive;
    }

    // Apply visual states based on restored session
    applySplitViewStateFromSession();
    if (typeof applyAutohideState === "function") {
      applyAutohideState();
    }
    return true;
  } catch (err) {
    console.error("Failed to load session state:", err);
    return false;
  }
}

function applySplitViewStateFromSession() {
  const btn = document.getElementById("btn-toggle-split-view");
  const divider = document.getElementById("split-divider");
  const paneRight = document.getElementById("pane-right");
  const paneLeft = document.getElementById("pane-left");
  const framesHolder = document.getElementById("frames-holder");

  if (!btn || !divider || !paneRight || !paneLeft || !framesHolder) return;

  if (appState.splitViewActive) {
    btn.classList.add("active");
    framesHolder.classList.add("split-active");
    divider.style.display = "flex";
    paneRight.style.display = "flex";
    
    // Set default 50/50 proportion
    paneLeft.style.width = "calc(50% - 3px)";
    paneRight.style.width = "calc(50% - 3px)";
    
    // Active view border highlight
    if (appState.activeView === "left") {
      paneLeft.classList.add("active-view-stroke");
      paneRight.classList.remove("active-view-stroke");
    } else {
      paneRight.classList.add("active-view-stroke");
      paneLeft.classList.remove("active-view-stroke");
    }

    // Load Left Tab iframe wrapper
    if (appState.leftTabId) {
      const leftTab = findTabById(appState.leftTabId);
      if (leftTab && window.loadIframeInPane) {
        window.loadIframeInPane("left", leftTab, leftTab.url, !!leftTab.openExternal);
      }
    }

    // Load Right Tab iframe wrapper
    if (appState.rightTabId) {
      const rightTab = findTabById(appState.rightTabId);
      if (rightTab && window.loadIframeInPane) {
        const ph = document.getElementById("pane-right-placeholder");
        if (ph) ph.style.display = "none";
        const rightUrl = rightTab.isSplit ? rightTab.urlRight : rightTab.url;
        const isOpenExternalRight = rightTab.isSplit ? !!rightTab.openExternalRight : !!rightTab.openExternal;
        window.loadIframeInPane("right", rightTab, rightUrl, isOpenExternalRight);
      }
    }
  } else {
    btn.classList.remove("active");
    framesHolder.classList.remove("split-active");
    divider.style.display = "none";
    paneRight.style.display = "none";
    paneLeft.style.width = "100%";
    paneLeft.classList.add("active-view-stroke");

    // Load active tab in Left Pane
    if (appState.activeTabId) {
      const activeTab = findTabById(appState.activeTabId);
      if (activeTab && window.loadIframeInPane) {
        window.loadIframeInPane("left", activeTab, activeTab.url, !!activeTab.openExternal);
      }
    }
  }
}
