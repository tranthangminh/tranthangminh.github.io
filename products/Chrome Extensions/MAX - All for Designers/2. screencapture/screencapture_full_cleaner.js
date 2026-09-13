/**
 * screencapture_full_cleaner.js — MAX Design Power-Pack
 * Fixed & Sticky Element Cleaner Strategy Module
 */

(function () {
  if (window.__maxScreenCaptureCleanerInitialized) return;
  window.__maxScreenCaptureCleanerInitialized = true;

  window.__maxScreenCapture = window.__maxScreenCapture || {};
  window.__maxCleanerBackups = window.__maxCleanerBackups || [];

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, 'important');
  }

  // ── prepareLayout ──────────────────────────────────────────────────────────

  window.__maxScreenCapture.prepareLayout = function () {
    const html = document.documentElement;
    const body = document.body;

    // Disable CSS transitions & animations for clean screenshots
    if (!document.getElementById('__max_no_transition')) {
      const s = document.createElement('style');
      s.id = '__max_no_transition';
      s.innerHTML = '* { transition: none !important; transition-delay: 0s !important; animation-duration: 0.001s !important; animation-delay: 0s !important; }';
      (document.head || document.documentElement).appendChild(s);
    }

    // Hide scrollbars from screenshots
    if (!document.getElementById('__max_no_scrollbar')) {
      const s = document.createElement('style');
      s.id = '__max_no_scrollbar';
      s.innerHTML = 'html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; } html, body { scrollbar-width: none !important; }';
      (document.head || document.documentElement).appendChild(s);
    }

    const scrollHeight = Math.max(
      html.scrollHeight || 0,
      body.scrollHeight || 0,
      html.clientHeight || 0,
      window.innerHeight || 0
    );

    return {
      scrollHeight:               scrollHeight,
      clientHeight:               window.innerHeight || html.clientHeight,
      clientWidth:                window.innerWidth  || html.clientWidth,
      devicePixelRatio:           window.devicePixelRatio || 1,
      originalOverflow:           body.style.overflow || '',
      originalScrollTop:          window.scrollY || html.scrollTop || 0,
      originalHtmlScrollBehavior: html.style.scrollBehavior || '',
      originalBodyScrollBehavior: body.style.scrollBehavior || ''
    };
  };

  // ── prepareStepCleaner ────────────────────────────────────────────────────

  /**
   * Suppress fixed/sticky elements that repeat across capture slices.
   *
   * Classification (applies to position:fixed elements):
   *
   *   "small overlay"    height < 50% viewport
   *                      = top navbars, channel headers, banners, cookie bars
   *                      → visible on step 0, hidden on step 1+
   *
   *   "bottom-only"      top > 80% viewport AND height < 20% viewport
   *                      = FABs, bottom nav bars, chat bubbles
   *                      → hidden on all steps except last
   *
   *   "structural"       height >= 50% viewport (sidebars, drawers, large panels)
   *                      → never hidden — they are part of the page chrome that
   *                         should appear consistently in the full-page image
   *
   *   position:sticky    rect.top < 40% viewport = currently stuck at top
   *                      → hidden on step 1+
   *                      otherwise: leave untouched (mid-page sticky content)
   */
  window.__maxScreenCapture.prepareStepCleaner = function (stepY, stepIndex, totalSteps) {
    window.scrollTo({ top: stepY, left: 0, behavior: 'instant' });

    const viewportHeight = window.innerHeight;
    const allElements    = document.body ? Array.from(document.body.getElementsByTagName('*')) : [];

    for (const el of allElements) {
      if (!el) continue;
      if (el.id === 'max-capture-progress-hud' || el.closest('#max-capture-progress-hud')) continue;

      const computed = window.getComputedStyle(el);
      const position = computed.position;
      if (position !== 'fixed' && position !== 'sticky') continue;

      const rect = el.getBoundingClientRect();
      // Skip collapsed / zero-size elements
      if (rect.width === 0 && rect.height === 0) continue;

      // Classification
      // "bottom-only" = floating element whose top starts in the LOWER HALF of viewport
      //   AND is not taller than 40% of viewport (side widgets, FABs, chat buttons, share bars)
      //   → hide on all steps except last (they belong at the bottom of the page)
      // Previously used top > 80%, but addThis_listSharing sits at top=618/vh=861 = 71.8%
      // so 50% is the correct threshold to catch all lower-half floating elements.
      const isBottomOnly   = rect.top > viewportHeight * 0.5 && rect.height < viewportHeight * 0.4;
      const isSmallOverlay = rect.height > 0 && rect.height < viewportHeight * 0.5 && !isBottomOnly;
      const isStructural   = rect.height >= viewportHeight * 0.5; // sidebars, large drawers

      // First encounter: backup inline visibility
      if (!el.__maxCleanerBackup) {
        el.__maxCleanerBackup = {
          visibility: el.style.visibility,
          display:    el.style.display,
          opacity:    el.style.opacity
        };
        window.__maxCleanerBackups.push(el);
      }
      const backup = el.__maxCleanerBackup;

      if (position === 'fixed') {
        if (isStructural) {
          // Sidebars, large panels: never hide — leave as-is
          el.style.visibility = backup.visibility || '';
        } else if (isBottomOnly) {
          // Bottom bars / FABs: hide on all steps except last
          if (stepIndex < totalSteps - 1) {
            setImportant(el, 'visibility', 'hidden');
          } else {
            el.style.visibility = backup.visibility || '';
          }
        } else if (isSmallOverlay) {
          // Navbars, channel headers, banners: show on step 0 only
          if (stepIndex > 0) {
            setImportant(el, 'visibility', 'hidden');
          } else {
            el.style.visibility = backup.visibility || '';
          }
        }
      } else if (position === 'sticky') {
        // Only suppress sticky if it is actively stuck near the viewport top
        const isStuckAtTop = rect.top < viewportHeight * 0.4 && rect.height < viewportHeight * 0.5;
        if (stepIndex > 0 && isStuckAtTop) {
          setImportant(el, 'visibility', 'hidden');
        } else {
          el.style.visibility = backup.visibility || '';
        }
      }
    }
  };

  // ── restoreLayout ──────────────────────────────────────────────────────────

  window.__maxScreenCapture.restoreLayout = function (top, overflow, htmlScroll, bodyScroll) {
    ['__max_no_transition', '__max_no_scrollbar'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    });

    if (window.__maxCleanerBackups && Array.isArray(window.__maxCleanerBackups)) {
      for (var i = 0; i < window.__maxCleanerBackups.length; i++) {
        var el = window.__maxCleanerBackups[i];
        if (!el || !el.__maxCleanerBackup) continue;
        var b = el.__maxCleanerBackup;
        el.style.visibility = b.visibility || '';
        el.style.display    = b.display    || '';
        el.style.opacity    = b.opacity    || '';
        delete el.__maxCleanerBackup;
      }
      window.__maxCleanerBackups = [];
    }

    document.documentElement.style.scrollBehavior = htmlScroll || '';
    document.body.style.overflow = overflow || '';
    window.scrollTo(0, top || 0);
  };
})();
