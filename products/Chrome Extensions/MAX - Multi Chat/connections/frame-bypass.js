// connections/frame-bypass.js
// Universal Main World script injection to bypass iframe/window.top embedding detection
// (used for Telegram Web, Weavy, and other embedded messaging clients).
(function() {
  // These sites can also be embedded by other websites, where their real parent must stay reachable
  const isInDashboard = Array.from(location.ancestorOrigins || []).some(origin => origin.startsWith("chrome-extension://"));
  if (!isInDashboard) return;

  function bypassProperty(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        configurable: true
      });
      return true;
    } catch {
      return false;
    }
  }

  // Bypass parent and self to refer to window. window.top cannot be redefined by any script.
  if (!bypassProperty(window, 'parent', window)) {
    bypassProperty(Window.prototype, 'parent', window);
  }
  if (!bypassProperty(window, 'self', window)) {
    bypassProperty(Window.prototype, 'self', window);
  }

  // Bypass frameElement to return null
  if (!bypassProperty(window, 'frameElement', null)) {
    bypassProperty(Window.prototype, 'frameElement', null);
  }
})();
