// ==========================================================================
// AI MULTI-CHAT INDEPENDENT MODULE
// Centralizes multi-AI grid rendering, prompt broadcasting & state saving.
// ==========================================================================

const SYSTEM_AI_GROUP_ID = "system-ai-chat";

const DEFAULT_AI_MODELS = [
  { id: "gemini", name: "Google Gemini", url: "https://gemini.google.com/app", icon: "svg/channels/gemini.svg", active: true },
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", icon: "svg/channels/chatgpt.svg", active: true },
  { id: "claude", name: "Claude AI", url: "https://claude.ai/chats", icon: "svg/channels/claude.svg", active: true },
  { id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com/", icon: "svg/channels/deepseek.svg", active: false },
  { id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai/", icon: "svg/channels/perplexity.svg", active: false }
];

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

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf("id");
    const nameIdx = headers.indexOf("name");
    const urlIdx = headers.indexOf("url");
    const iconIdx = headers.indexOf("icon");
    const activeIdx = headers.indexOf("active");
    const descIdx = headers.indexOf("description");

    const csvModels = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 3) {
        const id = parts[idIdx]?.trim();
        const name = parts[nameIdx]?.trim();
        const modelUrl = parts[urlIdx]?.trim();
        const icon = parts[iconIdx]?.trim() || "svg/main-icons/Robot.svg";
        const defaultActive = parts[activeIdx]?.trim().toLowerCase() === "true";
        const description = descIdx !== -1 ? parts[descIdx]?.trim() : "";

        if (id && name && modelUrl) {
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
    console.warn("Failed to load ai-models.csv:", err);
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
    const iconEl = (typeof createTabIconElement === "function")
      ? createTabIconElement(modelTabObj)
      : document.createElement("div");

    if (typeof createTabIconElement !== "function") {
      iconEl.className = "tab-favicon";
      iconEl.innerHTML = `<img src="${ai.icon}" alt="${ai.name}" style="width:100%;height:100%;object-fit:contain;">`;
    }

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

// Focus Reclaimer: Reclaims focus to prompt input when embedded iframes finish loading
function claimAISyncPromptFocus() {
  const promptInput = document.getElementById("ai-sync-prompt");
  if (!promptInput || appState.activeMainGroupId !== SYSTEM_AI_GROUP_ID) return;

  promptInput.focus();

  // Multi-stage timers to reclaim focus when iframes finish mounting/loading in background
  const milestones = [60, 150, 350, 700, 1200, 2000, 3200];
  milestones.forEach(delay => {
    setTimeout(() => {
      if (appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) {
        const active = document.activeElement;
        if (!active || active.tagName === "IFRAME" || active === document.body) {
          promptInput.focus();
        }
      }
    }, delay);
  });
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

      wrapper.innerHTML = `
        <div class="ai-pane-header">
          <div class="ai-pane-header-left">
            <span class="ai-pane-status-dot" title="Live Connection"></span>
            <img src="${ai.icon}" class="ai-pane-header-icon" alt="${ai.name}">
            <span>${ai.name}</span>
          </div>
          <div class="ai-pane-header-actions">
            <button type="button" class="btn-icon-small btn-reload-ai" title="Reload ${ai.name}">
              <span class="icon-mask"></span>
            </button>
            <button type="button" class="btn-icon-small btn-external-ai" title="Open in new Tab">
              <span class="icon-mask"></span>
            </button>
          </div>
        </div>
        <div class="ai-pane-content">
          <iframe src="${ai.url}" allow="geolocation; microphone; camera; midi; encrypted-media; clipboard-write; clipboard-read"></iframe>
        </div>
      `;

      const iframe = wrapper.querySelector("iframe");
      if (iframe) {
        iframe.addEventListener("load", () => {
          if (appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) {
            const promptInput = document.getElementById("ai-sync-prompt");
            if (promptInput && (!document.activeElement || document.activeElement.tagName === "IFRAME" || document.activeElement === document.body)) {
              promptInput.focus();
            }
          }
        });
      }

      const reloadBtn = wrapper.querySelector(".btn-reload-ai");
      reloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const content = wrapper.querySelector(".ai-pane-content");
        if (content) {
          content.innerHTML = "";
          const newIframe = document.createElement("iframe");
          newIframe.setAttribute("allow", "geolocation; microphone; camera; midi; encrypted-media; clipboard-write; clipboard-read");
          newIframe.src = ai.url;
          newIframe.addEventListener("load", () => {
            if (appState.activeMainGroupId === SYSTEM_AI_GROUP_ID) {
              claimAISyncPromptFocus();
            }
          });
          content.appendChild(newIframe);
        }
      });

      const externalBtn = wrapper.querySelector(".btn-external-ai");
      externalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(ai.url, "_blank");
      });

      aiWorkspace.appendChild(wrapper);
    }
  });

  autoApplyZoomForCount(count);
}

// Docked Prompt Input Bar Handler
let isSendingPromptDebounce = false;

function initAISyncInputBar() {
  const sendBtn = document.getElementById("btn-ai-send");
  const promptInput = document.getElementById("ai-sync-prompt");

  if (!sendBtn || !promptInput) return;

  const handleSendPrompt = () => {
    if (isSendingPromptDebounce) return;
    const promptText = promptInput.value.trim();
    if (!promptText) return;

    isSendingPromptDebounce = true;
    setTimeout(() => { isSendingPromptDebounce = false; }, 600);

    const promptId = "prompt_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    // 1. Direct postMessage to all active iframe contentWindows in #ai-workspace
    const iframes = document.querySelectorAll("#ai-workspace iframe");
    iframes.forEach(iframe => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: "AI_SYNC_PROMPT",
            prompt: promptText,
            promptId: promptId
          }, "*");
        }
      } catch (e) {
        console.warn("postMessage to iframe failed:", e);
      }
    });

    // 2. Direct script execution via chrome.scripting API into all subframes
    if (typeof chrome !== "undefined" && chrome.scripting && chrome.webNavigation) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const tabId = tabs[0].id;
          chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
            if (frames && Array.isArray(frames)) {
              frames.forEach(frame => {
                if (frame.frameId > 0) {
                  // Direct script injection into subframe
                  chrome.scripting.executeScript({
                    target: { tabId: tabId, frameIds: [frame.frameId] },
                    func: (promptText, promptId) => {
                      if (!window._lastAISyncPromptId) window._lastAISyncPromptId = null;
                      if (!window._lastAISyncPromptTime) window._lastAISyncPromptTime = 0;

                      const now = Date.now();
                      if (promptId === window._lastAISyncPromptId || (now - window._lastAISyncPromptTime < 600)) {
                        return; // Ignore duplicate execution inside same subframe
                      }
                      window._lastAISyncPromptId = promptId;
                      window._lastAISyncPromptTime = now;

                      const host = window.location.hostname.toLowerCase();

                      function setVal(el, val) {
                        if (!el) return;
                        el.focus();
                        const setter = Object.getOwnPropertyDescriptor(el, 'value')?.set || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
                        if (setter) setter.call(el, val); else el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                      }

                      function setCEVal(el, val) {
                        if (!el) return;
                        el.focus();
                        try {
                          const doc = el.ownerDocument || window.document;
                          doc.execCommand('selectAll', false, null);
                          doc.execCommand('insertText', false, val);
                        } catch(e) { el.innerText = val; }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                      }

                      function isStopButton(btn) {
                        if (!btn) return false;
                        const label = (btn.getAttribute('aria-label') || '' ) + (btn.getAttribute('title') || '') + (btn.innerText || '');
                        const lower = label.toLowerCase();
                        return lower.includes('stop') || lower.includes('dừng') || lower.includes('cancel');
                      }

                      function pressEnter(el) {
                        if (!el) return;
                        const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
                        el.dispatchEvent(new KeyboardEvent('keydown', opts));
                        el.dispatchEvent(new KeyboardEvent('keypress', opts));
                        el.dispatchEvent(new KeyboardEvent('keyup', opts));
                      }

                      let inputEl = null, btn = null;

                      if (host.includes("chatgpt.com")) {
                        inputEl = document.getElementById("prompt-textarea") || document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
                        if (inputEl) {
                          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') setVal(inputEl, promptText); else setCEVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[data-testid*="send"]') || document.querySelector('button[aria-label*="Send"]');
                            if (btn && !btn.disabled && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      } else if (host.includes("gemini.google.com")) {
                        inputEl = document.querySelector('.ql-editor[contenteditable="true"]') || document.querySelector('rich-textarea .ql-editor') || document.querySelector('rich-textarea textarea');
                        if (inputEl) {
                          if (inputEl.tagName === 'TEXTAREA') setVal(inputEl, promptText); else setCEVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('.send-button-container button') || document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[aria-label*="Send"]') || document.querySelector('button[aria-label*="Gửi"]');
                            if (btn && !btn.disabled && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      } else if (host.includes("claude.ai")) {
                        inputEl = document.querySelector('div[contenteditable="true"]') || document.querySelector('.ProseMirror[contenteditable="true"]') || document.querySelector('[data-testid="textarea"]');
                        if (inputEl) {
                          if (inputEl.tagName === 'TEXTAREA') setVal(inputEl, promptText); else setCEVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('button[aria-label="Send Message"]') || document.querySelector('button[aria-label*="Send"]');
                            if (btn && !btn.disabled && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      } else if (host.includes("deepseek.com")) {
                        inputEl = document.getElementById("chat-input") || document.querySelector('textarea');
                        if (inputEl) {
                          setVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('div[class*="send-btn"]') || document.querySelector('button[class*="send"]');
                            if (btn && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      } else if (host.includes("perplexity.ai")) {
                        inputEl = document.querySelector('textarea[placeholder*="Ask"]') || document.querySelector('textarea');
                        if (inputEl) {
                          setVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('button[aria-label*="Submit"]') || document.querySelector('button[aria-label*="Send"]');
                            if (btn && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      } else {
                        inputEl = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
                        if (inputEl) {
                          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') setVal(inputEl, promptText); else setCEVal(inputEl, promptText);
                          setTimeout(() => {
                            btn = document.querySelector('button[type="submit"]') || document.querySelector('button[aria-label*="send" i]');
                            if (btn && !isStopButton(btn)) btn.click(); else if (!btn) pressEnter(inputEl);
                          }, 200);
                        }
                      }
                    },
                    args: [promptText, promptId]
                  }).catch(() => {});
                }
              });
            }
          });
        }
      });
    }

    // Micro-animation feedback
    sendBtn.style.transform = "scale(0.95)";
    setTimeout(() => {
      sendBtn.style.transform = "";
      promptInput.value = "";
      promptInput.style.height = "42px";
    }, 150);
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
