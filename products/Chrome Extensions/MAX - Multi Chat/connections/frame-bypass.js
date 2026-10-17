// connections/frame-bypass.js
// Universal Main World script injection to bypass iframe/window.top embedding detection
// (used for Telegram Web, Weavy, and other embedded messaging clients).
(function() {
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

  // Bypass parent, top, self to refer to window
  if (!bypassProperty(window, 'parent', window)) {
    bypassProperty(Window.prototype, 'parent', window);
  }
  if (!bypassProperty(window, 'top', window)) {
    bypassProperty(Window.prototype, 'top', window);
  }
  if (!bypassProperty(window, 'self', window)) {
    bypassProperty(Window.prototype, 'self', window);
  }

  // Bypass frameElement to return null
  if (!bypassProperty(window, 'frameElement', null)) {
    bypassProperty(Window.prototype, 'frameElement', null);
  }
})();
