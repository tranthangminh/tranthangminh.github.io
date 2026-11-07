// MAX Multi Chat - Common Connection Logic
// This script is imported by the service worker (background.js) to manage
// declarativeNetRequest rules for embedded iframes.

// Helper: Extract all URLs from group hierarchy tree and AI models list
function extractUrlsFromHierarchy(hierarchy, aiModels = []) {
  const urls = [];
  if (Array.isArray(hierarchy)) {
    hierarchy.forEach(mainGroup => {
      if (mainGroup && Array.isArray(mainGroup.subGroups)) {
        mainGroup.subGroups.forEach(subGroup => {
          if (subGroup && Array.isArray(subGroup.tabs)) {
            subGroup.tabs.forEach(tab => {
              if (tab && tab.url) {
                urls.push(tab.url);
                // If it's a split link, also track the right side URL
                if (tab.isSplit && tab.urlRight) {
                  urls.push(tab.urlRight);
                }
              }
            });
          }
        });
      }
    });
  }

  if (Array.isArray(aiModels)) {
    aiModels.forEach(ai => {
      if (ai && ai.url) {
        urls.push(ai.url);
      }
    });
  }

  return urls;
}

// 9999 is no longer created, but versions before 1.0.2 saved it as a dynamic rule that must be removed
const FRAME_RULE_IDS = [9996, 9997, 9998, 9999];

// Old versions never rewrote Google cookies, so they must never be cleaned up either
const OLD_SKIPPED_COOKIE_DOMAINS = /google\.(com|net)|gstatic\.com|googleusercontent\.com/;

// Only these two block embedding. DNR cannot edit a header's value, so the whole CSP has to go.
const STRIPPED_RESPONSE_HEADERS = ["x-frame-options", "content-security-policy"].map(header => ({ header, operation: "remove" }));

// These sites refuse to load in a frame unless the request looks like a normal page visit
// (accounts.google.com answers 401, chat.google.com 403, Meta sites an error page).
// Others must not get this: chatgpt.com answers it with a Cloudflare challenge.
const TOP_LEVEL_ONLY_DOMAINS = ["facebook.com", "instagram.com", "messenger.com", "whatsapp.com", "threads.com", "threads.net", "x.com", "google.com"];

const NAVIGATION_REQUEST_HEADERS = [
  { header: "sec-fetch-dest", operation: "set", value: "document" },
  { header: "sec-fetch-site", operation: "set", value: "none" },
  { header: "sec-fetch-mode", operation: "set", value: "navigate" }
];

function getConfiguredHosts(urls) {
  const hosts = urls.flatMap(urlStr => {
    try {
      const url = new URL(urlStr);
      return /^https?:$/.test(url.protocol) ? [url.hostname] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(hosts)];
}

// 1. Bypass X-Frame-Options, CSP, COOP/COEP only inside open dashboard tabs.
// tabIds requires session rules, which reset on browser restart: the dashboard re-syncs on load.
async function syncDashboardFrameRules() {
  try {
    const dashboardUrl = chrome.runtime.getURL("dashboard.html");
    const tabs = await chrome.tabs.query({});
    const tabIds = tabs
      .filter(tab => (tab.pendingUrl || tab.url || "").startsWith(dashboardUrl))
      .map(tab => tab.id);

    const addRules = [];
    if (tabIds.length > 0) {
      addRules.push(
        {
          id: 9996,
          priority: 10000,
          action: { type: "modifyHeaders", requestHeaders: NAVIGATION_REQUEST_HEADERS },
          condition: { tabIds, requestDomains: TOP_LEVEL_ONLY_DOMAINS, resourceTypes: ["sub_frame"] }
        },
        {
          id: 9998,
          priority: 10000,
          action: { type: "modifyHeaders", responseHeaders: STRIPPED_RESPONSE_HEADERS },
          condition: { tabIds, resourceTypes: ["sub_frame"] }
        }
      );

      // Service worker fetches carry no tab id, so they are limited to the hosts the user configured.
      const { app_hierarchy, ai_models } = await chrome.storage.local.get(["app_hierarchy", "ai_models"]);
      const requestDomains = getConfiguredHosts(extractUrlsFromHierarchy(app_hierarchy || [], ai_models || []));
      if (requestDomains.length > 0) {
        addRules.push({
          id: 9997,
          priority: 10000,
          action: { type: "modifyHeaders", responseHeaders: STRIPPED_RESPONSE_HEADERS },
          condition: {
            tabIds: [chrome.tabs.TAB_ID_NONE],
            requestDomains,
            resourceTypes: ["xmlhttprequest", "other"]
          }
        });
      }
    }

    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: FRAME_RULE_IDS, addRules });
  } catch (error) {
    console.error("MAX: could not update dashboard frame rules", error);
  }
}

// Removes the browser-wide rules persisted by versions before 1.0.2
async function removeLegacyDynamicFrameRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: FRAME_RULE_IDS });
  } catch (error) {
    console.error("MAX: could not remove legacy frame rules", error);
  }
}

// Versions before 1.0.2 rewrote cookies to SameSite=None and left domain-wide copies that go stale and break logins.
// Runs once per profile. Remove this and the "cookies" permission once old installs are gone.
async function removeLegacySameSiteCookies() {
  try {
    const { legacy_cookies_cleaned, app_hierarchy, ai_models } = await chrome.storage.local.get(["legacy_cookies_cleaned", "app_hierarchy", "ai_models"]);
    if (legacy_cookies_cleaned) return;

    const hosts = getConfiguredHosts(extractUrlsFromHierarchy(app_hierarchy || [], ai_models || []));
    const baseDomains = hosts.map(host => host.split(".").slice(-2).join("."));
    const cookies = await chrome.cookies.getAll({});

    // Mirrors the old matching exactly, including its loose substring check ("netflix.com" for tab "x.com")
    const removals = cookies.flatMap(cookie => {
      const domain = cookie.domain.replace(/^\./, "");
      const wasRewritten = baseDomains.some(base => domain === base || domain.endsWith(`.${base}`)) || hosts.some(host => domain.includes(host));
      const isCandidate = !cookie.hostOnly && cookie.secure && cookie.sameSite === "no_restriction" && wasRewritten && !OLD_SKIPPED_COOKIE_DOMAINS.test(domain);
      return isCandidate ? [chrome.cookies.remove({ url: `https://${domain}${cookie.path}`, name: cookie.name, storeId: cookie.storeId })] : [];
    });

    await Promise.allSettled(removals);
    await chrome.storage.local.set({ legacy_cookies_cleaned: true });
  } catch (error) {
    // Flag stays unset, so the cleanup retries on the next update
    console.error("MAX: legacy cookie cleanup failed", error);
  }
}

// Export for ES module import in service worker
export {
  extractUrlsFromHierarchy,
  syncDashboardFrameRules,
  removeLegacyDynamicFrameRules,
  removeLegacySameSiteCookies
};
