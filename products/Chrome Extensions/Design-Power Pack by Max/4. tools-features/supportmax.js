/**
 * supportmax.js — Plug & Play Standalone Support MAX Module
 * Fully self-contained: Auto-renders Support MAX card & Nudge popup with single title "Enjoying MAX?"
 */

const KOFI_URL = 'https://ko-fi.com/maxiechen96';
const NUDGE_KEY = 'maxDonateNudgeLastShown';
const KOFI_ICON_HTML = `<img class="donate-kofi-icon" src="${chrome.runtime.getURL('svg/kofi.svg')}" alt="">`;

function openSupportLink() {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: KOFI_URL, active: true });
  } else {
    window.open(KOFI_URL, '_blank');
  }
}

/**
 * Builds HTML string for Support MAX Card (Unified Title "Enjoying MAX?")
 */
function createSupportMaxCardHtml() {
  return `
    <div class="donate-card">
      <div class="support-max-header">
        <span class="settings-section-icon icon-mask icon-heart support-max-heart-icon" aria-hidden="true"></span>
        <span class="support-max-title" data-i18n="tools.donateTitle">Enjoying MAX?</span>
      </div>
      <p class="donate-desc" data-i18n="tools.donateDesc">If MAX saves you time, consider buying me a coffee ☕ — it helps keep the tool free and updated!</p>
      <div class="donate-nudge-celebrate">
        <span>🥳</span><span>🎉</span>
      </div>
      <a href="${KOFI_URL}" target="_blank" class="btn btn-secondary donate-btn">
        ${KOFI_ICON_HTML}
        <span data-i18n="tools.donateBtn">Support on Ko-fi</span>
      </a>
    </div>
  `;
}

/**
 * Auto-injects Donate Nudge Popup Window into document.body if missing
 */
function ensureDonateNudgePopupInDom() {
  if (document.getElementById('donate-nudge')) return document.getElementById('donate-nudge');

  const popupEl = document.createElement('div');
  popupEl.id = 'donate-nudge';
  popupEl.className = 'donate-nudge-popup hidden';
  popupEl.innerHTML = `
    <div class="donate-card support-max-nudge-card">
      <button id="donate-nudge-close" class="btn btn-ghost donate-nudge-close-btn" title="Close" data-i18n-title="common.close"><span class="icon-mask icon-close" aria-hidden="true"></span></button>
      <div class="support-max-header">
        <span class="settings-section-icon icon-mask icon-heart support-max-heart-icon" aria-hidden="true"></span>
        <span class="support-max-title" data-i18n="tools.donateTitle">Enjoying MAX?</span>
      </div>
      <p class="donate-desc" data-i18n="tools.donateDesc">If MAX saves you time, consider buying me a coffee ☕ — it helps keep the tool free and updated!</p>
      <div class="donate-nudge-celebrate">
        <span>🥳</span><span>🎉</span>
      </div>
      <a id="donate-btn-nudge" href="${KOFI_URL}" target="_blank" class="btn btn-secondary donate-btn">
        ${KOFI_ICON_HTML}
        <span data-i18n="tools.donateBtn">Support on Ko-fi</span>
      </a>
    </div>
  `;
  document.body.appendChild(popupEl);
  if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
    window.i18n.applyTranslations(popupEl);
  }
  return popupEl;
}

/**
 * Auto-scans DOM and renders Support MAX Cards into mount containers
 */
function autoRenderSupportMaxMounts() {
  const mountPoints = document.querySelectorAll('.support-max-mount, [data-support-max]');
  mountPoints.forEach(mount => {
    if (!mount.children || mount.children.length === 0) {
      mount.innerHTML = createSupportMaxCardHtml();
    }
    if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations(mount);
    }
  });
}

function initSupportMax() {
  // Prevent double registration
  if (!window._supportMaxInit) {
    window._supportMaxInit = true;

    window.addEventListener('maxLanguageChanged', () => {
      autoRenderSupportMaxMounts();
      const nudge = document.getElementById('donate-nudge');
      if (nudge && window.i18n && typeof window.i18n.applyTranslations === 'function') {
        window.i18n.applyTranslations(nudge);
      }
    });

    // Delegated click listener strictly scoped for Support MAX cards & popup (Prevent hijacking external websites)
    document.addEventListener('click', (e) => {
      // 1. Check if user clicked close button on floating nudge popup
      if (e.target.closest('#donate-nudge-close, .donate-nudge-close-btn, .donate-nudge-close')) {
        e.preventDefault();
        e.stopPropagation();
        hideDonateNudge();
        return;
      }

      // 2. Check if user clicked strictly inside MAX's own support components
      const maxContainer = e.target.closest('#donate-nudge, .support-max-mount, [data-support-max], .support-max-container');
      if (maxContainer) {
        const card = e.target.closest('.donate-card, .donate-btn, #donate-btn, #donate-btn-context, #donate-btn-nudge, #donate-nudge-link');
        if (card) {
          e.preventDefault();
          e.stopPropagation();
          openSupportLink();
        }
      }
    });

    // Escape key listener to close floating nudge popup
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const nudgeEl = document.getElementById('donate-nudge');
        if (nudgeEl && !nudgeEl.classList.contains('hidden')) {
          e.preventDefault();
          hideDonateNudge();
        }
      }
    });
  }

  // Perform auto-render on initialization
  autoRenderSupportMaxMounts();
}

function hideDonateNudge() {
  const nudgeEl = document.getElementById('donate-nudge');
  if (!nudgeEl) return;
  nudgeEl.classList.add('hidden');
}

/**
 * Helper to check if current date is at least 7 calendar days after last shown date
 */
function isAtLeastOneWeekLater(lastShownTimestamp, currentTimestamp) {
  if (!lastShownTimestamp) return true;
  const lastDate = new Date(lastShownTimestamp);
  const currentDate = new Date(currentTimestamp);
  const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
  const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
  const dayDiff = Math.round((currentMidnight - lastMidnight) / (24 * 60 * 60 * 1000));
  return dayDiff >= 7;
}

/**
 * Public API: Triggers the floating Donate Nudge popup window
 */
function showDonateNudge() {
  const nudgeEl = ensureDonateNudgePopupInDom();
  if (!nudgeEl) return;

  const now = Date.now();
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(NUDGE_KEY, (data) => {
      const last = data[NUDGE_KEY] || 0;
      if (!isAtLeastOneWeekLater(last, now)) return;

      chrome.storage.local.set({ [NUDGE_KEY]: now });
      displayNudgeWindow(nudgeEl);
    });
  } else {
    displayNudgeWindow(nudgeEl);
  }
}

function displayNudgeWindow(nudgeEl) {
  nudgeEl.classList.add('hidden');
  void nudgeEl.offsetWidth; // Force reflow to trigger animations
  nudgeEl.classList.remove('hidden');
}

if (document.readyState !== 'loading') {
  initSupportMax();
} else {
  document.addEventListener('DOMContentLoaded', () => initSupportMax());
}

if (typeof window !== 'undefined') {
  window.initSupportMax = initSupportMax;
  window.showDonateNudge = showDonateNudge;
  window.hideDonateNudge = hideDonateNudge;
  window.createSupportMaxCardHtml = createSupportMaxCardHtml;
}
