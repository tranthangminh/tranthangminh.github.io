// Welcome Page Script
document.getElementById("btn-open-workspace")?.addEventListener("click", () => {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({}, (tabs) => {
      const existing = tabs.find(t => t.url && t.url.startsWith(dashboardUrl));
      if (existing) {
        chrome.tabs.update(existing.id, { active: true });
        if (chrome.windows) chrome.windows.update(existing.windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: dashboardUrl });
      }
    });
  } else {
    window.location.href = dashboardUrl;
  }
});
