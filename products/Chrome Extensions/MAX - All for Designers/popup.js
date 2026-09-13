// Tab Navigation and UI Controller
let currentWindowId = null;

function initPopup() {
  // Pre-fetch the browser window ID (not the popup's window ID) to preserve user gesture
  chrome.windows.getLastFocused({ windowTypes: ['normal'] }, (win) => {
    if (win) {
      currentWindowId = win.id;
    }
  });

  setupThemeToggle();
  setupSidePanelButtons();
  initTabsListeners();
  initSubTabsListeners();
  initResizer();
  handleAutoCapture();

  // BATCHED SINGLE STORAGE READ: Get all startup preferences in 1 round-trip
  chrome.storage.local.get({
    maxTheme: 'dark',
    currentViewMode: 'sidepanel',
    popupWidth: 450,
    popupHeight: 580,
    activeTab: 'colorpicker',
    activeSubTab: 'images'
  }, (data) => {
    applyTheme(data.maxTheme);
    applySidePanelLayout(data);
    restoreActiveTab(data.activeTab);
    restoreActiveSubTab(data.activeSubTab);
  });
}

// Automatically switch tab and trigger full-page capture if autoCapture=full parameter is in the URL
function handleAutoCapture() {
  const urlParams = new URLSearchParams(window.location.search);
  const autoCapture = urlParams.get('autoCapture');
  if (autoCapture === 'full') {
    // Clear pending context capture in storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove('pendingContextCapture');
    }
    // Switch to screencapture tab
    restoreActiveTab('screencapture');
    chrome.storage.local.set({ activeTab: 'screencapture' });

    // Wait for the scripts and assets to load, then trigger captureFullPage
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (typeof captureFullPage === 'function') {
          captureFullPage();
        } else {
          console.error('captureFullPage function not found');
        }
      }, 500);
    });
  }
}

function applyTheme(theme) {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const iconMask = themeToggleBtn ? themeToggleBtn.querySelector('.icon-mask') : null;
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggleBtn) themeToggleBtn.title = "Switch to Dark Theme";
    if (iconMask) {
      iconMask.style.maskImage = "url('svg/dark-mode.svg')";
      iconMask.style.webkitMaskImage = "url('svg/dark-mode.svg')";
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeToggleBtn) themeToggleBtn.title = "Switch to Light Theme";
    if (iconMask) {
      iconMask.style.maskImage = "url('svg/light-mode.svg')";
      iconMask.style.webkitMaskImage = "url('svg/light-mode.svg')";
    }
  }
}

function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  // Toggle button click listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const nextTheme = isLight ? 'dark' : 'light';
      chrome.storage.local.set({ maxTheme: nextTheme }, () => {
        applyTheme(nextTheme);
      });
    });
  }

  // Sync theme changes in real-time (e.g. between popup and sidepanel)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.maxTheme) {
      applyTheme(changes.maxTheme.newValue);
    }
  });
}

if (document.readyState !== 'loading') {
  initPopup();
} else {
  document.addEventListener('DOMContentLoaded', initPopup);
}

// Detect and Initialize Side Panel mode
function applySidePanelLayout(data) {
  const urlParams = new URLSearchParams(window.location.search);
  const isSidePanel = urlParams.get('view') === 'sidepanel';

  if (isSidePanel) {
    document.body.classList.add('sidepanel-mode');
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.width = '';
    document.body.style.height = '';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.style.width = '';
      appContainer.style.height = '';
    }
  } else {
    document.body.classList.remove('sidepanel-mode');
    document.documentElement.style.width = data.popupWidth + 'px';
    document.documentElement.style.height = data.popupHeight + 'px';
    document.body.style.width = data.popupWidth + 'px';
    document.body.style.height = data.popupHeight + 'px';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.style.width = data.popupWidth + 'px';
      appContainer.style.height = data.popupHeight + 'px';
    }
  }
}

function setupSidePanelButtons() {
  const openSidepanelBtn = document.getElementById('open-sidepanel-btn');
  if (openSidepanelBtn) {
    openSidepanelBtn.addEventListener('click', () => {
      if (!currentWindowId) {
        window.showToast('Window not ready, please try again.');
        return;
      }
      
      try {
        chrome.storage.local.set({ currentViewMode: 'sidepanel' }, () => {
          chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
          chrome.sidePanel.setOptions({ path: "popup.html?view=sidepanel", enabled: true }, () => {
            chrome.sidePanel.open({ windowId: currentWindowId }, () => {
              if (chrome.runtime.lastError) {
                console.error('Failed to open side panel:', chrome.runtime.lastError);
                window.showToast(`Error: ${chrome.runtime.lastError.message}`);
              } else {
                window.close();
              }
            });
          });
        });
      } catch (err) {
        console.error('Sync error opening side panel:', err);
        window.showToast(`Error: ${err.message}`);
      }
    });
  }

  const openPopupBtn = document.getElementById('open-popup-btn');
  if (openPopupBtn) {
    openPopupBtn.addEventListener('click', () => {
      try {
        chrome.storage.local.set({ currentViewMode: 'popup' }, () => {
          chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
          chrome.sidePanel.setOptions({ enabled: false });
        });

        chrome.action.openPopup(() => {
          if (chrome.runtime.lastError) {
            console.error('Failed to open popup:', chrome.runtime.lastError);
          }
          window.close();
        });
      } catch (err) {
        console.error('Error opening popup:', err);
        window.close();
      }
    });
  }
}

// Restore Active Tab directly without simulating click/double reflow
function restoreActiveTab(savedTab) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === savedTab);
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${savedTab}`);
  });
}

function initTabsListeners() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      const activeContent = document.getElementById(`tab-${targetTab}`);
      if (activeContent) {
        activeContent.classList.add('active');
      }

      chrome.storage.local.set({ activeTab: targetTab });
    });
  });
}

function restoreActiveSubTab(savedSubTab) {
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  const tabMultimedia = document.getElementById('tab-multimedia');

  subTabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subtab') === savedSubTab);
  });
  if (tabMultimedia) {
    tabMultimedia.classList.remove('show-images', 'show-vectors', 'show-videos', 'show-sounds');
    tabMultimedia.classList.add(`show-${savedSubTab}`);
  }
}

function initSubTabsListeners() {
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  const tabMultimedia = document.getElementById('tab-multimedia');

  subTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSubTab = button.getAttribute('data-subtab');

      subTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      if (tabMultimedia) {
        tabMultimedia.classList.remove('show-images', 'show-vectors', 'show-videos', 'show-sounds');
        tabMultimedia.classList.add(`show-${targetSubTab}`);
      }

      chrome.storage.local.set({ activeSubTab: targetSubTab });
    });
  });
}

// Global utility: Show toast notification
window.showToast = function(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');

  // Clear any existing timeout on the toast
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  // Hide toast after 3s
  window.toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
};

// Initialize Custom Popup Resizer
function initResizer() {
  const handle = document.getElementById('popup-resize-handle');
  if (!handle) return;

  let startX, startY, startWidth, startHeight;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = document.documentElement.clientWidth;
    startHeight = document.documentElement.clientHeight;
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  function doDrag(e) {
    let newWidth = startWidth + (e.clientX - startX);
    let newHeight = startHeight + (e.clientY - startY);
    
    // Limits matching Chrome's popup bounds:
    // Min width: 380px, Max width: 800px
    // Min height: 400px, Max height: 600px
    newWidth = Math.max(380, Math.min(800, newWidth));
    newHeight = Math.max(400, Math.min(600, newHeight));
    
    applyDimensions(newWidth, newHeight);
  }

  function stopDrag() {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Save dimensions
    const width = parseInt(document.documentElement.style.width, 10);
    const height = parseInt(document.documentElement.style.height, 10);
    chrome.storage.local.set({ popupWidth: width, popupHeight: height });
  }

  function applyDimensions(w, h) {
    document.documentElement.style.width = w + 'px';
    document.documentElement.style.height = h + 'px';
    document.body.style.width = w + 'px';
    document.body.style.height = h + 'px';
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.style.width = w + 'px';
      appContainer.style.height = h + 'px';
    }
  }
}
