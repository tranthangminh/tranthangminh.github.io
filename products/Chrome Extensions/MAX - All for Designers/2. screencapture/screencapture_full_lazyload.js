/**
 * screencapture_full_lazyload.js — MAX Design Power-Pack
 * Lazy Load Image & Media Pre-Warmup Strategy Module
 */

(function () {
  if (window.__maxScreenCaptureLazyloadInitialized) return;
  window.__maxScreenCaptureLazyloadInitialized = true;

  window.__maxScreenCapture = window.__maxScreenCapture || {};

  /**
   * Force lazy-loaded images to load & decode before capturing slice
   */
  window.__maxScreenCapture.warmupLazyLoad = async function () {
    const images = Array.from(document.querySelectorAll('img'));
    const decodePromises = [];

    for (const img of images) {
      if (!img) continue;

      // Swap data-src or data-srcset to real src attributes
      if (img.dataset) {
        if (img.dataset.src && img.src !== img.dataset.src) {
          img.src = img.dataset.src;
        }
        if (img.dataset.srcset && img.srcset !== img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
        }
      }

      if (img.getAttribute('loading') === 'lazy') {
        img.setAttribute('loading', 'eager');
      }

      // Await image decode with safety timeout
      if (img.src && !img.complete && typeof img.decode === 'function') {
        const decodePromise = Promise.race([
          img.decode().catch(() => {}),
          new Promise((r) => setTimeout(r, 250))
        ]);
        decodePromises.push(decodePromise);
      }
    }

    // Trigger synthetic scroll event so IntersectionObservers refresh
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    if (decodePromises.length > 0) {
      await Promise.all(decodePromises);
    }
  };
})();
