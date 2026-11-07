import {
  syncDashboardFrameRules,
  removeLegacyDynamicFrameRules,
  removeLegacySameSiteCookies
} from "./connections/common.js";

// Immediately refresh the dashboard-scoped DNR rules upon Service Worker startup
syncDashboardFrameRules();

// 1. Open Dashboard page when Extension Icon is clicked
chrome.action.onClicked.addListener(async () => {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(t => t.url && t.url.startsWith(dashboardUrl));
  
  if (existingTab) {
    chrome.tabs.update(existingTab.id, { active: true });
    chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: dashboardUrl });
  }
});

// 2. LISTENERS

// Listen for storage changes to sync DNR Rules
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.app_hierarchy || changes.ai_models)) {
    syncDashboardFrameRules();
  }
});

// Dashboard asks for its rules before creating iframes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SYNC_FRAME_RULES") return;
  syncDashboardFrameRules().finally(() => sendResponse());
  return true;
});

// Header bypass must end as soon as a dashboard tab closes or navigates elsewhere
chrome.tabs.onRemoved.addListener(() => syncDashboardFrameRules());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) syncDashboardFrameRules();
});

// Sync on installation/update
chrome.runtime.onInstalled.addListener(async (details) => {
  await removeLegacyDynamicFrameRules();
  syncDashboardFrameRules();

  if (details.reason !== "install") {
    await removeLegacySameSiteCookies();
  } else {
    await chrome.storage.local.set({ legacy_cookies_cleaned: true });
    const welcomeUrl = chrome.runtime.getURL("welcome.html");
    chrome.tabs.create({ url: welcomeUrl });
  }
});

// Only a pane of a dashboard tab is ours: frames in the user's other tabs must stay untouched
async function isDashboardPane(details) {
  if (details.parentFrameId !== 0) return false;
  try {
    const tab = await chrome.tabs.get(details.tabId);
    return (tab.pendingUrl || tab.url || "").startsWith(chrome.runtime.getURL("dashboard.html"));
  } catch {
    return false;
  }
}

// Listen for navigation errors in panes and notify Dashboard
chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  // ERR_ABORTED only means the pane was replaced or reloaded before it finished
  if (details.error === "net::ERR_ABORTED" || !(await isDashboardPane(details))) return;
  chrome.runtime.sendMessage({
    type: "IFRAME_LOAD_ERROR",
    url: details.url,
    error: details.error
  }).catch(() => {
    // Catch error when no active dashboard tab is listening
  });
});

// Listen for successful navigation in panes to auto-detect actual site favicon
chrome.webNavigation.onCompleted.addListener(async (details) => {
  const url = details.url;
  if (!url.startsWith("http") || !(await isDashboardPane(details))) return;

  try {
    // Inject script to extract the actual favicon from iframe document link tags
    const results = await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      func: () => {
        let faviconUrl = '';
        const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
        for (const rel of rels) {
          const link = document.querySelector(`link[rel*="${rel}"]`);
          if (link && link.href) {
            faviconUrl = link.href;
            break;
          }
        }
        if (!faviconUrl) {
          // Fallback to domain root favicon.ico
          faviconUrl = window.location.origin + '/favicon.ico';
        }
        return faviconUrl;
      }
    });

    if (results && results[0] && results[0].result) {
      // Notify the Dashboard tab about the detected favicon
      chrome.runtime.sendMessage({
        type: "FAVICON_DETECTED",
        url: url,
        faviconUrl: results[0].result
      }).catch(() => {
        // Ignore when no dashboard tab is active/listening
      });
    }
  } catch (err) {
    console.debug("MAX: favicon not readable in this frame:", err.message);
  }
});
