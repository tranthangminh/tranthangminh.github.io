// Web Content Scale / Zoom Controller Handler
let currentAiZoom = 1.0;

function getDefaultZoomForCount(count) {
  if (count <= 2) return 0.9;
  if (count <= 4) return 0.8;
  return 0.7;
}

function applyZoom(zoomVal, isCustom = false) {
  currentAiZoom = Math.min(Math.max(parseFloat(zoomVal.toFixed(2)), 0.5), 1.5);
  const aiWorkspace = document.getElementById("ai-workspace");
  const zoomText = document.getElementById("zoom-level-text");

  if (aiWorkspace) aiWorkspace.style.setProperty("--ai-iframe-zoom", currentAiZoom);
  if (zoomText) zoomText.textContent = `${Math.round(currentAiZoom * 100)}%`;

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ "ai_zoom_level": currentAiZoom, "ai_zoom_custom": isCustom });
  }
}

function autoApplyZoomForCount(count) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["ai_zoom_level", "ai_zoom_custom"], (data) => {
      if (data && data.ai_zoom_custom && data.ai_zoom_level) {
        applyZoom(data.ai_zoom_level, true);
      } else {
        const defaultZoom = getDefaultZoomForCount(count);
        applyZoom(defaultZoom, false);
      }
    });
  } else {
    applyZoom(getDefaultZoomForCount(count), false);
  }
}

function initAIZoomController() {
  const zoomInBtn = document.getElementById("btn-zoom-in");
  const zoomOutBtn = document.getElementById("btn-zoom-out");
  const zoomResetBtn = document.getElementById("btn-zoom-reset");

  if (!zoomInBtn || !zoomOutBtn || !zoomResetBtn) return;

  zoomInBtn.addEventListener("click", () => {
    applyZoom(currentAiZoom + 0.1, true);
  });

  zoomOutBtn.addEventListener("click", () => {
    applyZoom(currentAiZoom - 0.1, true);
  });

  zoomResetBtn.addEventListener("click", () => {
    const activeCount = appState.aiModels ? appState.aiModels.filter(ai => ai.active).length : 2;
    const defaultZoom = getDefaultZoomForCount(activeCount);
    applyZoom(defaultZoom, false);
  });
}
