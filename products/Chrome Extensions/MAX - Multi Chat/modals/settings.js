// App Settings Modal Handler (modals/settings.js)

const DEFAULT_FEATURE_VISIBILITY = {
  aiMultiChat: true,
  splitView: true,
  windowMode: true,
  autohide: true
};

let currentFeatureVisibility = { ...DEFAULT_FEATURE_VISIBILITY };

function applyFeatureVisibility() {
  const aiBtn = document.getElementById("btn-ai-multichat-group");
  if (aiBtn) {
    aiBtn.style.display = currentFeatureVisibility.aiMultiChat ? "" : "none";
  }

  const splitBtn = document.getElementById("btn-toggle-split-view");
  if (splitBtn) {
    splitBtn.style.display = currentFeatureVisibility.splitView ? "" : "none";
  }

  const windowBtn = document.getElementById("btn-toggle-window-mode");
  if (windowBtn) {
    windowBtn.style.display = currentFeatureVisibility.windowMode ? "" : "none";
  }

  const autohideBtn = document.getElementById("btn-toggle-autohide");
  if (autohideBtn) {
    autohideBtn.style.display = currentFeatureVisibility.autohide ? "" : "none";
  }
}

function loadFeatureVisibility() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("maxFeatureVisibility", (data) => {
      if (data && data.maxFeatureVisibility) {
        currentFeatureVisibility = { ...DEFAULT_FEATURE_VISIBILITY, ...data.maxFeatureVisibility };
      }
      syncToggleSwitchesUI();
      applyFeatureVisibility();
    });
  } else {
    applyFeatureVisibility();
  }
}

function saveFeatureVisibility() {
  applyFeatureVisibility();
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ maxFeatureVisibility: currentFeatureVisibility });
  }
}

function syncToggleSwitchesUI() {
  const toggleAi = document.getElementById("toggle-feat-ai");
  if (toggleAi) toggleAi.checked = !!currentFeatureVisibility.aiMultiChat;

  const toggleSplit = document.getElementById("toggle-feat-split");
  if (toggleSplit) toggleSplit.checked = !!currentFeatureVisibility.splitView;

  const toggleWindow = document.getElementById("toggle-feat-window");
  if (toggleWindow) toggleWindow.checked = !!currentFeatureVisibility.windowMode;

  const toggleAutohide = document.getElementById("toggle-feat-autohide");
  if (toggleAutohide) toggleAutohide.checked = !!currentFeatureVisibility.autohide;
}

function openSettingsModal() {
  const versionEl = document.getElementById("app-info-version");
  if (versionEl) {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
      try {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
          versionEl.textContent = `v${manifest.version}`;
        }
      } catch (e) {
        console.warn("Could not read manifest version", e);
      }
    }
  }
  syncToggleSwitchesUI();
  if (typeof openModal === "function") {
    openModal("settings-modal");
  } else {
    document.getElementById("settings-modal")?.classList.add("show");
  }
}

function closeSettingsModal() {
  if (typeof closeModal === "function") {
    closeModal("settings-modal");
  } else {
    document.getElementById("settings-modal")?.classList.remove("show");
  }
}

function initSettingsModal() {
  loadFeatureVisibility();

  const openBtn = document.getElementById("btn-open-settings-modal") || document.getElementById("btn-open-info-modal");
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  const closeBtn = document.getElementById("close-settings-modal") || document.getElementById("close-info-modal");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSettingsModal();
    });
  }

  const closeBtnFooter = document.getElementById("close-settings-modal-btn") || document.getElementById("close-info-modal-btn");
  if (closeBtnFooter) {
    closeBtnFooter.addEventListener("click", (e) => {
      e.preventDefault();
      closeSettingsModal();
    });
  }

  // Bind toggle switches
  document.getElementById("toggle-feat-ai")?.addEventListener("change", (e) => {
    currentFeatureVisibility.aiMultiChat = e.target.checked;
    saveFeatureVisibility();
  });

  document.getElementById("toggle-feat-split")?.addEventListener("change", (e) => {
    currentFeatureVisibility.splitView = e.target.checked;
    saveFeatureVisibility();
  });

  document.getElementById("toggle-feat-window")?.addEventListener("change", (e) => {
    currentFeatureVisibility.windowMode = e.target.checked;
    saveFeatureVisibility();
  });

  document.getElementById("toggle-feat-autohide")?.addEventListener("change", (e) => {
    currentFeatureVisibility.autohide = e.target.checked;
    saveFeatureVisibility();
  });

  // Bind Backup & Restore CSV buttons
  document.getElementById("btn-export-csv")?.addEventListener("click", () => {
    if (typeof exportHierarchyToCSV === "function") {
      exportHierarchyToCSV();
    }
  });

  document.getElementById("btn-import-csv")?.addEventListener("click", () => {
    if (typeof triggerCSVImport === "function") {
      triggerCSVImport();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSettingsModal);
} else {
  initSettingsModal();
}

window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openInfoModal = openSettingsModal;
window.closeInfoModal = closeSettingsModal;
