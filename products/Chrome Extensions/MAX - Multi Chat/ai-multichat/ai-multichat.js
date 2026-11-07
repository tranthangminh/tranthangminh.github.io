// ==========================================================================
// AI MULTI-CHAT INDEPENDENT MODULE
// Centralizes multi-AI grid rendering, prompt broadcasting & state saving.
// ==========================================================================

window.SYSTEM_AI_GROUP_ID = "system-ai-chat";

const DEFAULT_AI_MODELS = Object.freeze([
  Object.freeze({ id: "gemini", name: "Google Gemini", url: "https://gemini.google.com/app", icon: "svg/channels/gemini.svg", active: true }),
  Object.freeze({ id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", icon: "svg/channels/chatgpt.svg", active: true }),
  Object.freeze({ id: "claude", name: "Claude AI", url: "https://claude.ai/chats", icon: "svg/channels/claude.svg", active: true }),
  Object.freeze({ id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com/", icon: "svg/channels/deepseek.svg", active: false }),
  Object.freeze({ id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai/", icon: "svg/channels/perplexity.svg", active: false })
]);
window.DEFAULT_AI_MODELS = DEFAULT_AI_MODELS;

// Ensure System AI Group exists in hierarchy
function ensureSystemAIGroup() {
  if (typeof appState === "undefined" || !appState.hierarchy) return;

  const existingIndex = appState.hierarchy.findIndex(g => g.id === SYSTEM_AI_GROUP_ID);
  const aiGroupObj = {
    id: SYSTEM_AI_GROUP_ID,
    name: "AI Multi-Chat",
    icon: "AI",
    isSystem: true,
    subGroups: []
  };

  if (existingIndex === -1) {
    appState.hierarchy.unshift(aiGroupObj);
  } else {
    appState.hierarchy[existingIndex].isSystem = true;
    appState.hierarchy[existingIndex].name = "AI Multi-Chat";
    appState.hierarchy[existingIndex].icon = "AI";
  }
}

function isValidAIModel(model) {
  if (!model?.id) return false;
  try {
    return /^https?:$/.test(new URL(model.url).protocol);
  } catch {
    return false;
  }
}

// Storage helper
async function saveAIModelsToStorage() {
  if (typeof appState === "undefined" || !appState.aiModels) return;
  await chrome.storage.local.set({ "ai_models": appState.aiModels });
}

// Load and parse AI models list dynamically from svg/channels/ai-models.csv
async function loadAIModelsFromCSV() {
  try {
    const url = chrome.runtime.getURL("svg/channels/ai-models.csv");
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return;

    const parseRow = typeof window.parseCSVRow === "function" ? window.parseCSVRow : (str => str.split(","));
    const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf("id");
    const nameIdx = headers.indexOf("name");
    const urlIdx = headers.indexOf("url");
    const iconIdx = headers.indexOf("icon");
    const activeIdx = headers.indexOf("active");
    const descIdx = headers.indexOf("description");

    const csvModels = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = parseRow(lines[i]);
      if (parts.length >= 3) {
        const id = parts[idIdx]?.trim();
        const name = parts[nameIdx]?.trim();
        const modelUrl = parts[urlIdx]?.trim();
        const icon = parts[iconIdx]?.trim() || "svg/main-icons/AI.svg";
        const defaultActive = parts[activeIdx]?.trim().toLowerCase() === "true";
        const description = descIdx !== -1 ? parts[descIdx]?.trim() : "";

        if (name && isValidAIModel({ id, url: modelUrl })) {
          csvModels.push({
            id,
            name,
            url: modelUrl,
            icon,
            active: defaultActive,
            description
          });
        }
      }
    }

    if (csvModels.length > 0) {
      // Merge with user's saved active states from storage
      const savedResult = await chrome.storage.local.get("ai_models");
      const savedModelsMap = {};
      if (savedResult && Array.isArray(savedResult.ai_models)) {
        savedResult.ai_models.forEach(m => {
          savedModelsMap[m.id] = m.active;
        });
      }

      csvModels.forEach(m => {
        if (savedModelsMap[m.id] !== undefined) {
          m.active = savedModelsMap[m.id];
        }
      });

      appState.aiModels = csvModels;
      await saveAIModelsToStorage();
    }
  } catch (err) {
    console.error("MAX: could not load bundled AI models", err);
  }
}

// Render Sub-sidebar AI Selector Checklist
function renderAISubSidebar(container) {
  if (!container) return;
  container.innerHTML = "";

  const section = document.createElement("div");
  section.className = "sub-group-section";

  const titleRow = document.createElement("div");
  titleRow.className = "sub-group-title-row";
  const title = document.createElement("div");
  title.className = "sub-group-title";
  title.style.color = "var(--accent-primary)";
  title.textContent = "ACTIVE AI BOTS";
  titleRow.appendChild(title);
  section.appendChild(titleRow);

  const list = document.createElement("div");
  list.className = "ai-selector-list";

  appState.aiModels.forEach(ai => {
    const item = document.createElement("div");
    item.className = `tab-link-item ai-selector-item ${ai.active ? "active" : ""}`;
    item.setAttribute("data-ai-id", ai.id);
    item.setAttribute("data-tab-id", ai.id);

    // Reuse createTabIconElement for unified icon rendering
    const modelTabObj = {
      name: ai.name,
      url: ai.url,
      customFavicon: ai.icon,
      iconType: ai.iconType || "favicon",
      iconText: ai.iconText,
      iconBgColor: ai.iconBgColor
    };
    const iconEl = createTabIconElement(modelTabObj);

    const titleEl = document.createElement("span");
    titleEl.className = "tab-title";
    titleEl.textContent = ai.name;

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    switchLabel.innerHTML = `
      <input type="checkbox" ${ai.active ? "checked" : ""}>
      <span class="slider round"></span>
    `;

    item.appendChild(iconEl);
    item.appendChild(titleEl);
    item.appendChild(switchLabel);

    const checkbox = switchLabel.querySelector("input[type='checkbox']");

    const toggleAI = async (e) => {
      e.stopPropagation();
      ai.active = checkbox.checked;
      item.classList.toggle("active", ai.active);
      await saveAIModelsToStorage();
      renderWorkspace();
    };

    checkbox.addEventListener("change", toggleAI);
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".switch")) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      }
    });

    list.appendChild(item);
  });

  section.appendChild(list);
  container.appendChild(section);
}

// Master Workspace Display Switcher
function renderWorkspace() {
  const framesHolder = document.getElementById("frames-holder");
  const aiWorkspace = document.getElementById("ai-workspace");
  const aiSyncInputBar = document.getElementById("ai-sync-input-bar");

  if (!appState) return;

  if (appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) {
    if (framesHolder) framesHolder.style.display = "none";
    if (aiWorkspace) aiWorkspace.style.display = "grid";
    if (aiSyncInputBar) aiSyncInputBar.style.display = "flex";
    renderAIWorkspace();
    claimAISyncPromptFocus();
  } else {
    if (framesHolder) framesHolder.style.display = "flex";
    if (aiWorkspace) aiWorkspace.style.display = "none";
    if (aiSyncInputBar) aiSyncInputBar.style.display = "none";
  }
}

// Never pull focus out of a pane: the user may be typing a password there,
// and Enter in the prompt box would broadcast it to every AI site.
function focusPromptIfIdle(promptInput) {
  const active = document.activeElement;
  if (!active || active === document.body) promptInput.focus();
}

// Focus Reclaimer: Reclaims focus to prompt input when embedded iframes finish loading
function claimAISyncPromptFocus() {
  const promptInput = document.getElementById("ai-sync-prompt");
  if (!promptInput || appState.activeMainGroupId !== SYSTEM_AI_GROUP_ID) return;

  // Re-renders land here too, so only a click outside the panes may move focus right away
  if (document.activeElement?.tagName !== "IFRAME") promptInput.focus();

  // Multi-stage timers to reclaim focus when iframes finish mounting/loading in background
  const milestones = [60, 150, 350, 700, 1200, 2000, 3200];
  milestones.forEach(delay => {
    setTimeout(() => {
      if (appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) focusPromptIfIdle(promptInput);
    }, delay);
  });
}

function createAIPaneIframe(url) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("allow", BASE_FRAME_PERMISSIONS);
  iframe.src = url;
  iframe.addEventListener("load", () => {
    const promptInput = document.getElementById("ai-sync-prompt");
    if (promptInput && appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) focusPromptIfIdle(promptInput);
  });
  return iframe;
}

// Dynamic AI Grid Iframe Loader
function renderAIWorkspace() {
  const aiWorkspace = document.getElementById("ai-workspace");
  if (!aiWorkspace) return;

  const activeAIs = appState.aiModels.filter(ai => ai.active);
  const count = activeAIs.length;

  if (count === 0) {
    aiWorkspace.className = "ai-workspace cols-1";
    aiWorkspace.innerHTML = `
      <div class="pane-placeholder" style="grid-column: 1 / -1;">
        <span class="placeholder-icon">🤖</span>
        <p class="placeholder-text">Please enable at least one AI bot from the sub-sidebar checklist</p>
      </div>
    `;
    return;
  }

  aiWorkspace.className = `ai-workspace cols-${count}`;

  // Keep existing active wrappers to avoid re-rendering active iframes
  const activeIds = new Set(activeAIs.map(ai => ai.id));

  // Remove inactive wrappers
  aiWorkspace.querySelectorAll(".ai-pane-wrapper").forEach(wrapper => {
    const aiId = wrapper.getAttribute("data-ai-id");
    if (!activeIds.has(aiId)) {
      wrapper.remove();
    }
  });

  // Remove placeholder if present
  const placeholder = aiWorkspace.querySelector(".pane-placeholder");
  if (placeholder) placeholder.remove();

  // Inject or keep active wrappers
  activeAIs.forEach(ai => {
    let wrapper = document.getElementById(`wrapper-ai-${ai.id}`);
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "ai-pane-wrapper";
      wrapper.id = `wrapper-ai-${ai.id}`;
      wrapper.setAttribute("data-ai-id", ai.id);

      // Model data comes from the Google Sheet, so it only ever goes in through DOM properties
      wrapper.innerHTML = `
        <div class="ai-pane-header">
          <div class="ai-pane-header-left">
            <span class="ai-pane-status-dot" title="Live Connection"></span>
            <img class="ai-pane-header-icon">
            <span class="ai-pane-name"></span>
          </div>
          <div class="ai-pane-header-actions">
            <button type="button" class="btn-icon-small btn-reload-ai">
              <span class="icon-mask"></span>
            </button>
            <button type="button" class="btn-icon-small btn-external-ai" title="Open in new Tab">
              <span class="icon-mask"></span>
            </button>
          </div>
        </div>
        <div class="ai-pane-content"></div>
      `;

      const headerIcon = wrapper.querySelector(".ai-pane-header-icon");
      headerIcon.src = ai.icon;
      headerIcon.alt = ai.name;
      wrapper.querySelector(".ai-pane-name").textContent = ai.name;

      const content = wrapper.querySelector(".ai-pane-content");
      content.appendChild(createAIPaneIframe(ai.url));

      const reloadBtn = wrapper.querySelector(".btn-reload-ai");
      reloadBtn.title = `Reload ${ai.name}`;
      reloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        content.replaceChildren(createAIPaneIframe(ai.url));
        claimAISyncPromptFocus();
      });

      const externalBtn = wrapper.querySelector(".btn-external-ai");
      externalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(ai.url, "_blank", "noopener");
      });

      aiWorkspace.appendChild(wrapper);
    }
  });

  autoApplyZoomForCount(count);
}

// Docked Prompt Input Bar Handler
const PROMPT_RESULT_TIMEOUT_MS = 1500;
let pendingPrompt = null;

function setPromptStatus(message) {
  const statusEl = document.getElementById("ai-sync-status");
  if (statusEl) statusEl.textContent = message;
}

// Panes that never answered keep the text in the box, so nothing typed is lost silently
function finishPromptDelivery() {
  const { text, waitingFor, total, timer } = pendingPrompt;
  clearTimeout(timer);
  pendingPrompt = null;

  if (waitingFor.size === total) {
    setPromptStatus("No AI pane accepted the prompt. Make sure each pane is signed in and fully loaded.");
    return;
  }

  const promptInput = document.getElementById("ai-sync-prompt");
  if (promptInput.value.trim() === text) {
    promptInput.value = "";
    promptInput.style.height = "42px";
  }
  const missedNames = [...waitingFor].map(id => appState.aiModels.find(ai => ai.id === id)?.name ?? id);
  setPromptStatus(missedNames.length > 0 ? `Not sent to: ${missedNames.join(", ")}` : "");
}

window.addEventListener("message", (event) => {
  if (event.data?.type !== "AI_PROMPT_RESULT" || event.data.promptId !== pendingPrompt?.id) return;
  const wrapper = [...document.querySelectorAll("#ai-workspace .ai-pane-wrapper")]
    .find(w => w.querySelector("iframe")?.contentWindow === event.source);
  if (!wrapper || !event.data.delivered) return;
  pendingPrompt.waitingFor.delete(wrapper.getAttribute("data-ai-id"));
  if (pendingPrompt.waitingFor.size === 0) finishPromptDelivery();
});

function initAISyncInputBar() {
  const sendBtn = document.getElementById("btn-ai-send");
  const promptInput = document.getElementById("ai-sync-prompt");

  if (!sendBtn || !promptInput) return;

  const handleSendPrompt = () => {
    if (pendingPrompt) return;
    const promptText = promptInput.value.trim();
    if (!promptText) return;

    // Only AI panes get the prompt: channel iframes stay alive while hidden and must never receive it.
    const panes = [...document.querySelectorAll("#ai-workspace .ai-pane-wrapper")].flatMap(wrapper => {
      const iframe = wrapper.querySelector("iframe");
      const model = appState.aiModels.find(ai => ai.id === wrapper.getAttribute("data-ai-id"));
      return iframe?.contentWindow && model ? [{ iframe, model }] : [];
    });
    if (panes.length === 0) {
      setPromptStatus("Enable at least one AI bot first.");
      return;
    }

    setPromptStatus("");
    const promptId = "prompt_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    pendingPrompt = {
      id: promptId,
      text: promptText,
      waitingFor: new Set(panes.map(pane => pane.model.id)),
      total: panes.length,
      timer: setTimeout(finishPromptDelivery, PROMPT_RESULT_TIMEOUT_MS)
    };

    // The model's origin as target: a pane redirected to another site must not receive the prompt
    panes.forEach(({ iframe, model }) => {
      iframe.contentWindow.postMessage({ type: "AI_SYNC_PROMPT", prompt: promptText, promptId }, new URL(model.url).origin);
    });

    // Micro-animation feedback
    sendBtn.style.transform = "scale(0.95)";
    setTimeout(() => { sendBtn.style.transform = ""; }, 150);
  };

  sendBtn.addEventListener("click", handleSendPrompt);

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  });

  // Auto-expand textarea vertically when typing long prompts
  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    const newHeight = Math.min(Math.max(promptInput.scrollHeight, 42), 220);
    promptInput.style.height = newHeight + "px";
  });

  initAIZoomController();
}
