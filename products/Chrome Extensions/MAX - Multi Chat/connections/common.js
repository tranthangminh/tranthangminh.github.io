// MAX Multi Chat - Common Connection Logic
// This script is imported by the service worker (background.js) to manage
// declarativeNetRequest rules and SameSite cookie sync for embedded iframes.


// Helper: Check if domain belongs to Google services (Google cookies are sensitive and tamper-proof)
function isGoogleDomain(domain) {
  if (!domain) return false;
  const d = domain.toLowerCase();
  return d.includes("google.com") || 
         d.includes("google.com.vn") || 
         d.includes("google.net") || 
         d.includes("gstatic.com") ||
         d.includes("googleusercontent.com");
}

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

// 1. Bypass X-Frame-Options, CSP, COOP/COEP globally for ALL sub_frames using Declarative Net Request (DNR)
async function ensureGlobalAntiFrameDNRRule() {
  try {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = currentRules.map(rule => rule.id);

    const rules = [
      {
        id: 9996,
        priority: 20000,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "cookie", operation: "remove" },
            { header: "authorization", operation: "remove" },
            { header: "sec-fetch-dest", operation: "set", value: "document" },
            { header: "sec-fetch-site", operation: "set", value: "none" },
            { header: "sec-fetch-mode", operation: "set", value: "navigate" }
          ],
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "cross-origin-opener-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy", operation: "remove" }
          ]
        },
        condition: {
          resourceTypes: ["sub_frame", "xmlhttprequest", "other"],
          urlFilter: "*max_dual_acc=1*"
        }
      },
      {
        id: 9998,
        priority: 10000,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "sec-fetch-dest", operation: "set", value: "document" },
            { header: "sec-fetch-site", operation: "set", value: "none" },
            { header: "sec-fetch-mode", operation: "set", value: "navigate" }
          ],
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "content-security-policy-report-only", operation: "remove" },
            { header: "x-webkit-csp", operation: "remove" },
            { header: "x-content-security-policy", operation: "remove" },
            { header: "x-content-type-options", operation: "remove" },
            { header: "cross-origin-opener-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy", operation: "remove" },
            { header: "cross-origin-resource-policy", operation: "remove" }
          ]
        },
        condition: {
          resourceTypes: ["sub_frame"]
        }
      },
      {
        id: 9999,
        priority: 10000,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "content-security-policy-report-only", operation: "remove" },
            { header: "x-webkit-csp", operation: "remove" },
            { header: "x-content-security-policy", operation: "remove" },
            { header: "cross-origin-opener-policy", operation: "remove" },
            { header: "cross-origin-embedder-policy", operation: "remove" },
            { header: "cross-origin-resource-policy", operation: "remove" }
          ]
        },
        condition: {
          resourceTypes: ["xmlhttprequest", "script", "stylesheet", "other"]
        }
      }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: rules
    });
  } catch (error) {
    // Suppress dynamic rule update failure
  }
}

// Applies SameSite=None; Secure to a single cookie object (skipping Google domains)
async function applySameSiteNoneToCookie(cookie) {
  if (!cookie || isGoogleDomain(cookie.domain)) return;
  if (cookie.sameSite === "no_restriction" && cookie.secure) return;

  const domainClean = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
  const url = `https://${domainClean}${cookie.path}`;

  const newCookie = {
    url: url,
    name: cookie.name,
    value: cookie.value,
    path: cookie.path,
    secure: true,
    sameSite: "no_restriction",
    expirationDate: cookie.expirationDate,
    httpOnly: cookie.httpOnly,
    storeId: cookie.storeId
  };

  if (!cookie.name.startsWith("__Host-")) {
    newCookie.domain = cookie.domain;
  }

  try {
    await chrome.cookies.set(newCookie);
  } catch {
    // Ignore individual cookie set failures
  }
}

// 2. SameSite Cookie Sync (Bypass Cookie SameSite restriction in iframe)
// Converts Lax/Strict cookies to SameSite=None; Secure dynamically
async function forceSameSiteNoneForDomain(domain) {
  if (isGoogleDomain(domain)) return;
  try {
    const cookies = await chrome.cookies.getAll({ domain: domain });
    for (const cookie of cookies) {
      await applySameSiteNoneToCookie(cookie);
    }
  } catch {
    // Ignore domain cookie sync errors
  }
}

// Sync all domains in monitoring list
function syncAllDomainCookies(urls) {
  const domains = new Set();
  urls.forEach(urlStr => {
    try {
      const url = new URL(urlStr);
      domains.add(url.hostname);
      
      // Also sync base domains (e.g. .facebook.com)
      const parts = url.hostname.split('.');
      if (parts.length >= 2) {
        domains.add(`.${parts.slice(-2).join('.')}`);
        domains.add(parts.slice(-2).join('.'));
      }
    } catch {}
  });

  domains.forEach(domain => {
    forceSameSiteNoneForDomain(domain);
  });
}

// Export for ES module import in service worker
export {
  isGoogleDomain,
  extractUrlsFromHierarchy,
  ensureGlobalAntiFrameDNRRule,
  applySameSiteNoneToCookie,
  forceSameSiteNoneForDomain,
  syncAllDomainCookies
};
