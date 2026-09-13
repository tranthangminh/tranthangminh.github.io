if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get({ maxTheme: 'dark' }, (data) => {
    if (data.maxTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  });
}
