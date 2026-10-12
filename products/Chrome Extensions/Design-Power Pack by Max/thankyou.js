// Theme restoration & real-time synchronization
function initTheme() {
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ maxTheme: 'dark' }, (data) => {
      applyTheme(data.maxTheme);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.maxTheme) {
        applyTheme(changes.maxTheme.newValue);
      }
    });
  }
}

initTheme();

// Onboarding Thank You page script
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Use chrome.tabs extension API to safely close the tab in extension context
      if (window.chrome && chrome.tabs) {
        chrome.tabs.getCurrent((tab) => {
          if (tab) {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } else {
        window.close();
      }
    });
  }
});
