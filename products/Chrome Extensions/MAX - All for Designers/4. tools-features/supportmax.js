/**
 * supportmax.js — Plug & Play Standalone Support MAX Module
 * Fully self-contained: Auto-renders Support MAX card & Nudge popup with single title "Enjoying MAX?"
 */

const KOFI_URL = 'https://ko-fi.com/maxiechen96';
const NUDGE_KEY = 'maxDonateNudgeLastShown';
const KOFI_SVG_INLINE = `<svg class="donate-kofi-icon" width="18" height="18" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"><g transform="matrix(0.953828,0,0,0.953828,0.600643,0.564686)"><path d="M11.477,5.563C14.374,5.563 16.432,5.593 17.504,5.803C19.253,6.147 20.753,6.854 20.753,9.572C20.753,12.289 18.604,12.921 16.553,12.921C16.04,15.177 14.79,18.414 9.874,18.414C4.596,18.414 3.518,14.712 3.281,11.59C3.182,10.296 3.145,9.17 3.149,8.518C3.157,7.385 4.317,5.717 6.448,5.666C8.58,5.615 10.016,5.563 11.477,5.563ZM16.537,8.104C16.537,7.743 16.767,7.546 17.243,7.546C17.718,7.546 18.9,7.89 18.9,9.351C18.9,10.811 17.653,11.09 17.243,11.09C16.832,11.09 16.564,10.911 16.564,10.579C16.564,10.038 16.537,8.465 16.537,8.104Z" fill="white"/><path d="M11.477,1.785C14.725,1.785 17.031,1.86 18.232,2.095C20.262,2.494 22.007,3.352 23.168,4.945C23.944,6.011 24.532,7.462 24.532,9.572C24.532,10.08 24.489,10.548 24.413,10.981L24.026,12.357L23.357,13.62L22.457,14.675C21.629,15.456 20.566,15.999 19.4,16.324C18.796,17.687 17.892,19.042 16.527,20.109C15.012,21.292 12.911,22.193 9.874,22.193C6.544,22.193 4.322,21.119 2.772,19.682C0.589,17.658 -0.276,14.654 -0.487,11.876C-0.596,10.452 -0.634,9.212 -0.629,8.494L-0.471,7.2L-0.075,6.045L0.52,4.991L1.312,4.032L2.307,3.193L3.502,2.52L4.87,2.069C5.336,1.965 5.831,1.901 6.357,1.888C8.528,1.836 9.989,1.785 11.477,1.785ZM11.477,5.563C10.016,5.563 8.58,5.615 6.448,5.666C4.317,5.717 3.157,7.385 3.149,8.518C3.145,9.17 3.182,10.296 3.281,11.59C3.518,14.712 4.596,18.414 9.874,18.414C14.79,18.414 16.04,15.177 16.553,12.921C18.604,12.921 20.753,12.289 20.753,9.572C20.753,6.854 19.253,6.147 17.504,5.803C16.432,5.593 14.374,5.563 11.477,5.563ZM16.537,8.104C16.537,7.743 16.767,7.546 17.243,7.546C17.718,7.546 18.9,7.89 18.9,9.351C18.9,10.811 17.653,11.09 17.243,11.09C16.832,11.09 16.564,10.911 16.564,10.579C16.564,10.038 16.537,8.465 16.537,8.104Z" fill="white"/><path d="M11.477,3.674C14.549,3.674 16.732,3.726 17.868,3.949C19.408,4.252 20.76,4.849 21.64,6.058C22.228,6.865 22.643,7.974 22.643,9.572C22.643,11.306 22.029,12.482 21.161,13.3C20.342,14.072 19.218,14.513 18.013,14.7C17.54,16.08 16.751,17.536 15.364,18.62C14.116,19.594 12.376,20.304 9.874,20.304C7.153,20.304 5.323,19.47 4.057,18.297C2.229,16.602 1.574,14.058 1.397,11.733C1.293,10.374 1.256,9.191 1.26,8.506C1.271,6.691 2.987,3.859 6.403,3.777C8.554,3.725 10.003,3.674 11.477,3.674ZM11.477,5.563C10.016,5.563 8.58,5.615 6.448,5.666C4.317,5.717 3.157,7.385 3.149,8.518C3.145,9.17 3.182,10.296 3.281,11.59C3.518,14.712 4.596,18.414 9.874,18.414C14.79,18.414 16.04,15.177 16.553,12.921C18.604,12.921 20.753,12.289 20.753,9.572C20.753,6.854 19.253,6.147 17.504,5.803C16.432,5.593 14.374,5.563 11.477,5.563ZM16.537,8.104C16.537,7.743 16.767,7.546 17.243,7.546C17.718,7.546 18.9,7.89 18.9,9.351C18.9,10.811 17.653,11.09 17.243,11.09C16.832,11.09 16.564,10.911 16.564,10.579C16.564,10.038 16.537,8.465 16.537,8.104Z" fill="currentColor"/><g transform="matrix(0.129635,0,0,0.122706,-2.296672,3.339025)"><path d="M95.526,61.146C101.435,42.48 113.253,42.48 119.162,47.525C125.071,52.57 125.071,62.66 119.162,72.75C115.026,80.317 104.39,87.884 95.526,92.929C86.663,87.884 76.027,80.317 71.89,72.75C65.981,62.66 65.981,52.57 71.89,47.525C77.799,42.48 89.617,42.48 95.526,61.146Z" style="fill:rgb(255,90,22);stroke:rgb(255,90,22);stroke-width:16.61px;"/></g></g></svg>`;

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
        <span class="settings-section-icon icon-mask support-max-heart-icon"></span>
        <span class="support-max-title">Enjoying MAX?</span>
      </div>
      <p class="donate-desc">If MAX saves you time, consider buying me a coffee ☕ — it helps keep the tool free and updated!</p>
      <div class="donate-nudge-celebrate">
        <span>🥳</span><span>🎉</span>
      </div>
      <a href="${KOFI_URL}" target="_blank" class="btn btn-secondary donate-btn">
        ${KOFI_SVG_INLINE}
        Support on Ko-fi
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
      <button id="donate-nudge-close" class="btn btn-ghost donate-nudge-close-btn" title="Close">✕</button>
      <div class="support-max-header">
        <span class="settings-section-icon icon-mask support-max-heart-icon"></span>
        <span class="support-max-title">Enjoying MAX?</span>
      </div>
      <p class="donate-desc">If MAX saves you time, consider buying me a coffee ☕ — it helps keep the tool free and updated!</p>
      <div class="donate-nudge-celebrate">
        <span>🥳</span><span>🎉</span>
      </div>
      <a id="donate-btn-nudge" href="${KOFI_URL}" target="_blank" class="btn btn-secondary donate-btn">
        ${KOFI_SVG_INLINE}
        Support on Ko-fi
      </a>
    </div>
  `;
  document.body.appendChild(popupEl);
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
  });
}

function initSupportMax() {
  // Prevent double registration
  if (!window._supportMaxInit) {
    window._supportMaxInit = true;

    // Delegated click listener for Support MAX cards & popup
    document.addEventListener('click', (e) => {
      // 1. Check if user clicked close button on floating nudge popup
      if (e.target.closest('#donate-nudge-close, .donate-nudge-close-btn, .donate-nudge-close')) {
        e.preventDefault();
        e.stopPropagation();
        hideDonateNudge();
        return;
      }

      // 2. Check if user clicked anywhere on Support MAX card or donation buttons
      const card = e.target.closest('.donate-card, .support-max-container, .donate-btn, #donate-btn, #donate-btn-context, #donate-btn-nudge, #donate-nudge-link');
      if (card) {
        e.preventDefault();
        e.stopPropagation();
        openSupportLink();
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
