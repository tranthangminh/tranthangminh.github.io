/**
 * screencapture_full_snap.js — MAX Design Power-Pack
 * Section Snap & Fullpage Scroll Strategy Module.
 * Detects section slides (Fullpage.js, Swiper, Section Snap) and handles slide-by-slide navigation.
 */

(function () {
  if (window.__maxScreenCaptureSnapInitialized) return;
  window.__maxScreenCaptureSnapInitialized = true;

  window.__maxScreenCapture = window.__maxScreenCapture || {};
  window.__maxSnapBackups = window.__maxSnapBackups || [];

  /**
   * Find all Section Slide elements on the page.
   * Detects presentation slides (Fullpage.js, Swiper, Section Snap, HTML5 section tags)
   * while filtering out non-section app containers (like Google Drive, Gmail).
   */
  window.__maxScreenCapture.findSnapSections = function () {
    const vh = window.innerHeight || 1080;
    const minH = vh * 0.7;

    // Explicit section selectors for Fullpage.js, Swiper, Section Snap libraries & HTML5 section tags
    const selectors = [
      'section', '.section', '[data-section]', '.fp-section',
      '.fullpage-section', '.section-snap', '[data-scroll-snap]',
      '.snap-section', '.fp-slide', '.slide', '[data-slide]'
    ];

    const candidateSet = new Set();
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el && (el.clientHeight >= minH || el.offsetHeight >= minH)) {
          candidateSet.add(el);
        }
      });
    });

    const candidates = Array.from(candidateSet);
    if (candidates.length < 2) return [];

    // Group candidates by vertical position (rect.top + scrollY)
    const topPositions = new Set();
    candidates.forEach(el => {
      const rect = el.getBoundingClientRect();
      const top = Math.round(rect.top + (window.scrollY || 0));
      topPositions.add(Math.round(top / 100) * 100);
    });

    // Check if candidates are explicit section elements (tag=section, or class contains section/fp-/slide/data-section)
    const isExplicitSection = candidates.every(el => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      return tag === 'section' || cls.includes('section') || cls.includes('fp-') || cls.includes('slide') || el.hasAttribute('data-section');
    });

    // If candidate elements are arbitrary elements all stacked at top:0, they are app layers (like Google Drive), NOT slides.
    if (topPositions.size < 2 && !isExplicitSection) {
      return [];
    }

    return candidates;
  };

  /**
   * Check if current page is a Section Snap / Fullpage Scroll site
   */
  window.__maxScreenCapture.isSnapPage = function () {
    const sections = window.__maxScreenCapture.findSnapSections();
    const docH = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight || 0 : 0,
      window.innerHeight || 0
    );
    const isDocLocked = docH <= (window.innerHeight || 1080) + 50;
    return isDocLocked && sections.length >= 2;
  };

  /**
   * Trigger slide navigation to section index
   */
  window.__maxScreenCapture.triggerSnapStep = async function (index) {
    const sections = window.__maxScreenCapture.findSnapSections();
    if (sections && sections[index]) {
      const target = sections[index];
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } catch (e) {
        window.scrollTo({ top: index * window.innerHeight, left: 0, behavior: 'instant' });
      }

      // Dispatch synthetic wheel & keyboard events for JS scroll libraries (Fullpage.js)
      try {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', code: 'PageDown', bubbles: true }));
      } catch (e) {}
    } else {
      window.scrollTo({ top: index * window.innerHeight, left: 0, behavior: 'instant' });
    }

    await new Promise((r) => setTimeout(r, 250));
    return {
      scrollY: window.scrollY || 0
    };
  };

  /**
   * Measure initial state & force instant scroll behavior on html + body
   */
  window.__maxScreenCapture.initUniversalSnap = function () {
    window.__maxSnapBackups = [];

    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    if (htmlEl) {
      window.__maxSnapBackups.push({ element: htmlEl, originalScrollBehavior: htmlEl.style.scrollBehavior });
      htmlEl.style.setProperty('scroll-behavior', 'auto', 'important');
    }
    if (bodyEl) {
      window.__maxSnapBackups.push({ element: bodyEl, originalScrollBehavior: bodyEl.style.scrollBehavior });
      bodyEl.style.setProperty('scroll-behavior', 'auto', 'important');
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    return {
      initialScrollY: window.scrollY || 0,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  };

  /**
   * Scroll to targetScrollY using instant window.scrollTo
   */
  window.__maxScreenCapture.triggerUniversalStep = async function (stepIndex, targetScrollY) {
    const target = (stepIndex === 0) ? 0 : (targetScrollY || 0);

    window.scrollTo({ top: target, left: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 80));

    return {
      scrollY: window.scrollY || 0
    };
  };

  /**
   * Restore original scroll-behavior on html + body
   */
  window.__maxScreenCapture.restoreUniversalSnap = function () {
    if (window.__maxSnapBackups && Array.isArray(window.__maxSnapBackups)) {
      for (const item of window.__maxSnapBackups) {
        if (item.element) {
          item.element.style.scrollBehavior = item.originalScrollBehavior || '';
        }
      }
      window.__maxSnapBackups = [];
    }
  };
})();
