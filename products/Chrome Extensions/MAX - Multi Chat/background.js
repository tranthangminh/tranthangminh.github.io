import {
  getBaseDomain,
  isGoogleDomain,
  extractUrlsFromHierarchy,
  ensureGlobalAntiFrameDNRRule,
  updateDNRAntiFrameHeaders,
  forceSameSiteNoneForDomain,
  syncAllDomainCookies
} from "./connections/common.js";

// Immediately activate Global Anti-Frame DNR Rules upon Service Worker startup
ensureGlobalAntiFrameDNRRule();
chrome.storage.local.get(["app_hierarchy", "ai_models"], (data) => {
  const urls = extractUrlsFromHierarchy(data.app_hierarchy || [], data.ai_models || []);
  syncAllDomainCookies(urls);
});

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

// Listen for storage changes to sync DNR Rules and Cookies
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.app_hierarchy || changes.ai_models)) {
    console.log("Configuration changed, syncing DNR Rules & Cookies...");
    chrome.storage.local.get(["app_hierarchy", "ai_models"], (data) => {
      const urls = extractUrlsFromHierarchy(data.app_hierarchy || [], data.ai_models || []);
      updateDNRAntiFrameHeaders(urls);
      syncAllDomainCookies(urls);
    });
  }
});

// Listen for cookie changes in the browser to immediately sync SameSite=None
chrome.cookies.onChanged.addListener((changeInfo) => {
  const cookie = changeInfo.cookie;
  if (isGoogleDomain(cookie.domain)) return;
  if (cookie.sameSite !== "no_restriction" || !cookie.secure) {
    chrome.storage.local.get("app_hierarchy", (data) => {
      const urls = extractUrlsFromHierarchy(data.app_hierarchy || []);
      const isMonitored = urls.some(urlStr => {
        try {
          const url = new URL(urlStr);
          return cookie.domain.includes(url.hostname) || url.hostname.includes(cookie.domain);
        } catch (e) {
          return false;
        }
      });

      if (isMonitored) {
        const domainClean = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const protocol = "https://";
        const url = `${protocol}${domainClean}${cookie.path}`;
        
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

        // __Host- cookies must NOT have a domain attribute specified
        if (!cookie.name.startsWith("__Host-")) {
          newCookie.domain = cookie.domain;
        }

        chrome.cookies.set(newCookie).catch(err => {
          console.warn(`Failed to sync changed cookie ${cookie.name}:`, err);
        });
      }
    });
  }
});



// Sync on installation/update and Service Worker wakeup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("MAX Multi Chat Extension installed/updated. Reason:", details ? details.reason : "unknown");
  const data = await chrome.storage.local.get(["app_hierarchy", "ai_models"]);
  const urls = extractUrlsFromHierarchy(data.app_hierarchy || [], data.ai_models || []);
  updateDNRAntiFrameHeaders(urls);
  syncAllDomainCookies(urls);

  if (details && details.reason === "install") {
    const welcomeUrl = chrome.runtime.getURL("welcome.html");
    chrome.tabs.create({ url: welcomeUrl });
  }
});

// Listen for navigation errors in sub_frames (iframes) and notify Dashboard
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.frameId > 0) {
    console.warn(`Frame navigation error on: ${details.url}. Error: ${details.error}`);
    // Broadcast the error message to the Dashboard tab
    chrome.runtime.sendMessage({
      type: "IFRAME_LOAD_ERROR",
      url: details.url,
      error: details.error
    }).catch(err => {
      // Catch error when no active dashboard tab is listening
    });
  }
});

// Listen for successful navigation in sub_frames to auto-detect actual site favicon
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId > 0) {
    const url = details.url;
    if (!url.startsWith("http")) return; // Skip extensions internal pages or errors

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
        const detectedFavicon = results[0].result;
        // Notify the Dashboard tab about the detected favicon
        chrome.runtime.sendMessage({
          type: "FAVICON_DETECTED",
          url: url,
          faviconUrl: detectedFavicon
        }).catch(err => {
          // Ignore when no dashboard tab is active/listening
        });
      }

      // Inject audio observer into iframe subframe
      chrome.scripting.executeScript({
        target: { tabId: details.tabId, frameIds: [details.frameId] },
        func: () => {
          if (window.__maxAudioObserverInjected) return;
          window.__maxAudioObserverInjected = true;

          function checkMedia() {
            const mediaEls = document.querySelectorAll("audio, video");
            let isPlaying = false;
            mediaEls.forEach(el => {
              if (!el.paused && !el.ended && el.volume > 0 && !el.muted) {
                isPlaying = true;
              }
            });
            return isPlaying;
          }

          function notifyAudioState(playing) {
            try {
              window.parent.postMessage({
                type: "MAX_AUDIO_STATE",
                isAudible: playing,
                tabId: window.name || "",
                url: window.location.href
              }, "*");
            } catch (e) {}
          }

          document.addEventListener("play", () => notifyAudioState(true), true);
          document.addEventListener("playing", () => notifyAudioState(true), true);
          document.addEventListener("timeupdate", () => {
            if (checkMedia()) notifyAudioState(true);
          }, true);
          document.addEventListener("pause", () => {
            setTimeout(() => notifyAudioState(checkMedia()), 300);
          }, true);
          document.addEventListener("ended", () => {
            setTimeout(() => notifyAudioState(checkMedia()), 300);
          }, true);

          setInterval(() => {
            notifyAudioState(checkMedia());
          }, 1500);
        }
      }).catch(() => {});
    } catch (err) {
      console.warn("Failed to extract actual favicon in iframe:", err);
    }
  }
});





// Run immediately on background start
chrome.storage.local.get("app_hierarchy", (data) => {
  const urls = extractUrlsFromHierarchy(data.app_hierarchy || []);
  updateDNRAntiFrameHeaders(urls);
  syncAllDomainCookies(urls);
});
