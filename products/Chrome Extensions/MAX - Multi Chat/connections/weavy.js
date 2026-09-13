// connections/weavy.js
// Bypass Weavy iframe detection using Main World script injection.
(function() {
  function bypassProperty(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        configurable: true
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Try bypassing parent, top, self to refer to window
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

  console.log("MAX Multi Chat: Weavy iframe bypass activated (top/parent/self/frameElement overridden).");
})();
