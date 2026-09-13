/**
 * screencapture_full_finder.js — MAX Design Power-Pack
 * ScrollFinder Module — Detects the primary scrollable container
 *
 * On most pages, window is the scroll target. But some apps (Gmail, Notion,
 * Linear, dashboards) render inside a fixed-height div with overflow:auto/scroll
 * rather than scrolling the window itself. In those cases window.scrollHeight
 * equals window.innerHeight (not scrollable), and the real content lives inside
 * a sub-container.
 *
 * findScrollableTarget() mirrors GoFullPage _findByDim: walk the DOM, score
 * every element by its scrollable area, return the best candidate if it beats
 * the window's own scrollHeight by a meaningful margin.
 */

(function () {
  if (window.__maxScreenCaptureFinderInitialized) return;
  window.__maxScreenCaptureFinderInitialized = true;

  window.__maxScreenCapture = window.__maxScreenCapture || {};

  /**
   * Find the best scrollable sub-element to use as the scroll target.
   *
   * Returns an object { elt, scrollHeight, clientHeight, scrollWidth, clientWidth }
   * if a suitable sub-element is found, or null to use window (default behavior).
   *
   * Criteria (GoFullPage _findByDim approach):
   *  1. Element must be visible and inside the viewport (clientHeight > 50)
   *  2. overflowY must be 'auto' or 'scroll'
   *  3. scrollHeight > clientHeight (actually scrollable, not just overflow:auto with no overflow)
   *  4. Must not be document.body or document.documentElement
   *  5. scrollHeight must be > window.scrollHeight * 0.8
   *     (the sub-element has a comparable or larger scroll range than the window itself)
   *  6. Among candidates, pick the one with the largest scrollHeight
   */
  window.__maxScreenCapture.findScrollableTarget = function () {
    const windowScrollH = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight || 0 : 0
    );
    const windowClientH = window.innerHeight || document.documentElement.clientHeight;
    const isWindowScrollable = windowScrollH > windowClientH + 150;

    let bestEl     = null;
    let bestScore  = 0;

    const walker = document.createTreeWalker(
      document.body || document.documentElement,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node = walker.nextNode();
    while (node) {
      if (node === document.body || node === document.documentElement) {
        node = walker.nextNode();
        continue;
      }
      if (node.id === 'max-capture-progress-hud' || node.id === 'max-web-toast') {
        node = walker.nextNode();
        continue;
      }

      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;

      // Support auto, scroll, overlay, or any element with actual scrollable overflow
      const isScrollableOverflow = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      const scrollH = node.scrollHeight || 0;
      const clientH = node.clientHeight || 0;

      if (!isScrollableOverflow && scrollH <= clientH + 40) {
        node = walker.nextNode();
        continue;
      }

      if (scrollH <= clientH + 20 || clientH < 100) {
        node = walker.nextNode();
        continue;
      }

      if (isWindowScrollable && scrollH <= windowScrollH + 200) {
        node = walker.nextNode();
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= windowClientH) {
        node = walker.nextNode();
        continue;
      }

      const score = scrollH * (clientH / windowClientH);
      if (score > bestScore) {
        bestScore = score;
        bestEl    = node;
      }

      node = walker.nextNode();
    }

    if (!bestEl) return null;

    return {
      elt:          bestEl,
      scrollHeight: bestEl.scrollHeight,
      clientHeight: bestEl.clientHeight,
      scrollWidth:  bestEl.scrollWidth,
      clientWidth:  bestEl.clientWidth
    };
  };
})();
