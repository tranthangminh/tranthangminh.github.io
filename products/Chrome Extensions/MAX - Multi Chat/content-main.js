// Main World Content Script running inside all sub-frames (iframes)
// Safe for Content Security Policy (CSP) without inline script DOM injection
(function() {
  // Run strictly inside sub-frames (iframes)
  if (window.self === window.top) return;
  if (window.__MAX_DUAL_ACC_INJECTED__) return;

  const isDualAccFrame = window.location.href.includes("max_dual_acc=1") || 
    (function() {
      try { return sessionStorage.getItem("MAX_DUAL_ACC") === "1"; } catch(e) { return false; }
    })();

  if (!isDualAccFrame) return;

  try { sessionStorage.setItem("MAX_DUAL_ACC", "1"); } catch(e) {}
  window.__MAX_DUAL_ACC_INJECTED__ = true;

  function appendDualAccParam(url) {
    if (!url) return url;
    try {
      const strUrl = typeof url === "string" ? url : (url.href || url.toString());
      if (strUrl.startsWith("data:") || strUrl.startsWith("blob:") || strUrl.startsWith("javascript:")) return url;
      if (strUrl.includes("max_dual_acc=1")) return url;
      const u = new URL(strUrl, window.location.origin);
      u.searchParams.set("max_dual_acc", "1");
      return typeof url === "string" ? u.toString() : u;
    } catch(e) {
      return url;
    }
  }

  // Intercept fetch API in Main World
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      if (typeof input === "string") {
        input = appendDualAccParam(input);
      } else if (input && input.url) {
        try {
          const newUrl = appendDualAccParam(input.url);
          input = new Request(newUrl, input);
        } catch(e) {}
      }
      return origFetch.call(this, input, init);
    };
  }

  // Intercept XMLHttpRequest API in Main World
  const origOpen = XMLHttpRequest.prototype.open;
  if (origOpen) {
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const newUrl = appendDualAccParam(url);
      return origOpen.call(this, method, newUrl, ...rest);
    };
  }
})();
