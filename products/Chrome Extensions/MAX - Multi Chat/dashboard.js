// Core logic for the Dashboard UI (English Version)

// Main Group icon list — loaded dynamically from svg/main-icons/index.json at runtime
// This is the fallback list used if index.json cannot be fetched
window.MAIN_ICON_LIST = [
  "Achievement", "AI", "Book", "Business", "Chart", "Chat", "Code",
  "Creative", "Folder", "Game", "Health", "Idea",
  "Location", "Money", "Movie", "Music", "Personal",
  "Photo", "Quick", "Robot", "Science", "Shopping", "Social", "Star"
];

window.SWATCH_COLORS = [
  "#ef4444", // 1
  "#f97316", // 2
  "#eab308", // 3
  "#22c55e", // 4
  "#3b82f6", // 5
  "#6366f1", // 6
  "#a855f7", // 7
  "#ffffff", // 8
  "#111827"  // 9
];

window.encodeCustomFavicon = function(iconType, customFavicon, iconText, iconBgColor) {
  if (iconType === "text" || iconText) {
    const text = iconText || "";
    const colorHex = (iconBgColor || "#6366f1").toLowerCase();
    let idx = window.SWATCH_COLORS.indexOf(colorHex);
    if (idx === -1) idx = 5;
    const colorNum = idx + 1;
    return `{${colorNum}}${text}`;
  }
  return customFavicon || "";
};

window.parseCustomFaviconString = function(str) {
  if (!str || typeof str !== "string") {
    return { isText: false, iconType: "favicon", customFavicon: "" };
  }
  const match = str.trim().match(/^\{([1-9])\}([\s\S]*)$/);
  if (match) {
    const colorNum = parseInt(match[1], 10);
    const text = match[2];
    const hexColor = (window.SWATCH_COLORS && window.SWATCH_COLORS[colorNum - 1]) ? window.SWATCH_COLORS[colorNum - 1] : "#6366f1";
    return {
      isText: true,
      iconType: "text",
      iconText: text,
      iconBgColor: hexColor,
      customFavicon: ""
    };
  }
  return {
    isText: false,
    iconType: "favicon",
    customFavicon: str
  };
};

// Dynamic Default Channels List (Loaded from channels.csv)
let DEFAULT_CHANNELS_LIST = [];

// App State
let appState = {
  hierarchy: [],
  activeMainGroupId: null,
  activeTabId: null,
  theme: "dark",
  subSidebarCollapsed: false,
  splitViewActive: false,
  activeView: "left",
  leftTabId: null,
  rightTabId: null,
  windowModeActive: false,
  isSplitLinkActive: false,
  autohideActive: false,
  aiModels: JSON.parse(JSON.stringify(DEFAULT_AI_MODELS))
};

// Ánh xạ lưu trữ frameId hiện tại của các pane (dùng để định tuyến sự kiện điều hướng chính xác)
const paneFrameIdMap = {
  left: null,
  right: null
};


// Default Seed Data (Contains only empty default group and sub-group on clean installations)
const SEED_DATA = [
  {
    id: "main_cskh",
    name: "Customer Care",
    icon: "💬",
    subGroups: [
      {
        id: "sub_cskh_main",
        name: "Channels",
        tabs: []
      }
    ]
  }
];



// Global variables for tabbed default channels
let defaultChannelsByTag = {};
let defaultTagsList = [];

// Load and parse default channels from CSV or Storage
async function loadDefaultChannelsFromCSV() {
  try {
    const storageResult = await chrome.storage.local.get("default_channels");
    if (storageResult.default_channels && Array.isArray(storageResult.default_channels) && storageResult.default_channels.length > 0) {
      const list = storageResult.default_channels;
      const tagsMap = {};
      list.forEach(channel => {
        if (channel.tags && Array.isArray(channel.tags)) {
          channel.tags.forEach(tag => {
            if (!tagsMap[tag]) tagsMap[tag] = [];
            tagsMap[tag].push(channel);
          });
        }
      });
      DEFAULT_CHANNELS_LIST = list;
      defaultChannelsByTag = tagsMap;
      defaultTagsList = Object.keys(tagsMap).sort();
      console.log(`Loaded ${list.length} default channels from storage under ${defaultTagsList.length} tags:`, defaultTagsList);
      return;
    }

    const url = chrome.runtime.getURL("svg/channels/channels.csv");
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length <= 1) {
      console.warn("channels.csv is empty or has only headers.");
      return;
    }
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf("id");
    const nameIdx = headers.indexOf("tab_name");
    const url1Idx = headers.indexOf("tab_url_1");
    const icon1Idx = headers.indexOf("custom_favicon_1");
    const openExternal1Idx = headers.indexOf("open_external_1");
    const isDualAcc1Idx = headers.indexOf("is_dual_acc_1");

    const url2Idx = headers.indexOf("tab_url_2");
    const icon2Idx = headers.indexOf("custom_favicon_2");
    const openExternal2Idx = headers.indexOf("open_external_2");
    const isDualAcc2Idx = headers.indexOf("is_dual_acc_2");

    const groupIdx = headers.indexOf("main_group");
    const tagsIdx = headers.indexOf("tags");

    const list = [];
    const tagsMap = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(",");
      if (cols.length >= 3) {
        const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : "";
        const id = idIdx !== -1 && cols[idIdx] ? cols[idIdx].trim() : ("tab_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_"));
        const url = url1Idx !== -1 && cols[url1Idx] ? cols[url1Idx].trim() : "";
        const icon = icon1Idx !== -1 && cols[icon1Idx] ? cols[icon1Idx].trim() : "";
        let tagsStr = tagsIdx !== -1 && cols[tagsIdx] ? cols[tagsIdx].trim() : "";
        const defaultGroup = groupIdx !== -1 && cols[groupIdx] ? cols[groupIdx].trim() : "";
        const openExtVal = openExternal1Idx !== -1 && cols[openExternal1Idx] ? cols[openExternal1Idx].trim().toLowerCase() : "";
        const openExternal = openExtVal === "true" || openExtVal === "x" || openExtVal === "1";
        const isDualAcc1Val = isDualAcc1Idx !== -1 && cols[isDualAcc1Idx] ? cols[isDualAcc1Idx].trim().toLowerCase() : "";
        const isDualAcc1 = isDualAcc1Val === "true" || isDualAcc1Val === "x" || isDualAcc1Val === "1";

        const url2 = url2Idx !== -1 && cols[url2Idx] ? cols[url2Idx].trim() : "";
        const icon2 = icon2Idx !== -1 && cols[icon2Idx] ? cols[icon2Idx].trim() : "";
        const openExt2Val = openExternal2Idx !== -1 && cols[openExternal2Idx] ? cols[openExternal2Idx].trim().toLowerCase() : "";
        const openExternal2 = openExt2Val === "true" || openExt2Val === "x" || openExt2Val === "1";
        const isDualAcc2Val = isDualAcc2Idx !== -1 && cols[isDualAcc2Idx] ? cols[isDualAcc2Idx].trim().toLowerCase() : "";
        const isDualAcc2 = isDualAcc2Val === "true" || isDualAcc2Val === "x" || isDualAcc2Val === "1";
        
        if (!tagsStr && defaultGroup) {
          tagsStr = defaultGroup;
        }
        const tagsArr = tagsStr.split(";").map(t => t.trim()).filter(t => t !== "");

        const parsedIcon1 = window.parseCustomFaviconString(icon);
        const channel = {
          id: id,
          name: name,
          url: url,
          customFavicon: parsedIcon1.customFavicon,
          defaultGroup: defaultGroup,
          openExternal: openExternal,
          isDualAcc: isDualAcc1,
          tags: tagsArr
        };
        if (parsedIcon1.isText) {
          channel.iconType = "text";
          channel.iconText = parsedIcon1.iconText;
          channel.iconBgColor = parsedIcon1.iconBgColor;
        }

        if (url2) {
          channel.isSplit = true;
          channel.urlRight = url2;
          const parsedIcon2 = window.parseCustomFaviconString(icon2);
          if (parsedIcon2.isText) {
            channel.iconTypeRight = "text";
            channel.iconTextRight = parsedIcon2.iconText;
            channel.iconBgColorRight = parsedIcon2.iconBgColor;
          } else if (parsedIcon2.customFavicon) {
            channel.customFaviconRight = parsedIcon2.customFavicon;
          }
          channel.openExternalRight = openExternal2;
          if (isDualAcc2) channel.isDualAccRight = true;
        }
        
        list.push(channel);
        
        channel.tags.forEach(tag => {
          if (!tagsMap[tag]) {
            tagsMap[tag] = [];
          }
          tagsMap[tag].push(channel);
        });
      }
    }
    
    DEFAULT_CHANNELS_LIST = list;
    defaultChannelsByTag = tagsMap;
    defaultTagsList = Object.keys(tagsMap).sort();
    console.log(`Loaded ${list.length} default channels under ${defaultTagsList.length} tags:`, defaultTagsList);
  } catch (err) {
    console.error("Failed to load default channels from CSV:", err);
    // Fallback logic to prevent empty state in case fetch fails
    const fallbackList = [
      { id: "tab_zalo", name: "Zalo", url: "https://chat.zalo.me/", customFavicon: "", tags: ["Chat"] },
      { id: "tab_messenger", name: "Messenger", url: "https://m.facebook.com/messages/", customFavicon: "", tags: ["Chat"] },
      { id: "tab_discord", name: "Discord", url: "https://discord.com/login", customFavicon: "", tags: ["Social"] },
      { id: "tab_gemini", name: "Gemini", url: "https://gemini.google.com/", customFavicon: "", tags: ["AI"] }
    ];
    DEFAULT_CHANNELS_LIST = fallbackList;
    defaultChannelsByTag = {
      "Chat": fallbackList.filter(c => c.tags.includes("Chat")),
      "Social": fallbackList.filter(c => c.tags.includes("Social")),
      "AI": fallbackList.filter(c => c.tags.includes("AI"))
    };
    defaultTagsList = ["AI", "Chat", "Social"];
  }
}

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  renderWelcomeGuide("welcome-screen");
  await loadDefaultChannelsFromCSV();
  await initApp();
  registerEvents();
  setupSidebarHoverGroup(); // hover cả sidebar-main + sidebar-sub → expand
  setupAutohideHoverEvents(); // hover autohide-bar để hiện sidebar
});

/**
 * Tạo "hover group" cho 2 sidebar.
 * Hover vào sidebar-main HOẶC sidebar-sub → thêm class .expanded vào sidebar-sub.
 * Rời khỏi cả 2 (con trỏ đi sang vùng khác) → xóa .expanded.
 */
function setupSidebarHoverGroup() {
  const sidebarMain = document.querySelector(".sidebar-main");
  const sidebarSub  = document.querySelector(".sidebar-sub");
  const sidebarsWrapper = document.getElementById("sidebars-wrapper");
  if (!sidebarMain || !sidebarSub) return;

  function expand()  { 
    sidebarSub.classList.add("expanded"); 
    if (sidebarsWrapper) sidebarsWrapper.classList.add("expanded");
  }
  function collapse() { 
    sidebarSub.classList.remove("expanded"); 
    if (sidebarsWrapper) sidebarsWrapper.classList.remove("expanded");
  }

  sidebarMain.addEventListener("mouseenter", expand);
  sidebarSub.addEventListener("mouseenter",  expand);

  // Chỉ collapse khi con trỏ rời sidebar mà KHÔNG đi vào sidebar còn lại
  sidebarMain.addEventListener("mouseleave", (e) => {
    if (!e.relatedTarget || !sidebarSub.contains(e.relatedTarget)) collapse();
  });
  sidebarSub.addEventListener("mouseleave", (e) => {
    if (!e.relatedTarget || !sidebarMain.contains(e.relatedTarget)) collapse();
  });
}

let autohideHoverGraceEndTime = 0;

function isAutohideHoverGraceActive() {
  return appState.autohideActive && Date.now() < autohideHoverGraceEndTime;
}

function setupAutohideHoverEvents() {
  const autohideBar = document.getElementById("autohide-bar");
  const sidebarsWrapper = document.getElementById("sidebars-wrapper");
  const appContainer = document.querySelector(".app-container");

  if (!autohideBar || !sidebarsWrapper || !appContainer) return;

  autohideBar.addEventListener("mouseenter", () => {
    if (appState.autohideActive) {
      appContainer.classList.add("sidebar-visible");
      autohideHoverGraceEndTime = Date.now() + 750; // 750ms grace period lock
    }
  });

  sidebarsWrapper.addEventListener("mouseleave", () => {
    if (appState.autohideActive) {
      appContainer.classList.remove("sidebar-visible");
      autohideHoverGraceEndTime = 0;
    }
  });
}

function toggleAutohide() {
  appState.autohideActive = !appState.autohideActive;
  applyAutohideState();
  saveSessionState();
}

function applyAutohideState() {
  const appContainer = document.querySelector(".app-container");
  const autohideBar = document.getElementById("autohide-bar");
  const autohideBtn = document.getElementById("btn-toggle-autohide");

  if (!appContainer) return;

  if (appState.autohideActive) {
    appContainer.classList.add("autohide-active");
    if (autohideBar) autohideBar.style.display = "flex";
    if (autohideBtn) autohideBtn.classList.add("active");
  } else {
    appContainer.classList.remove("autohide-active");
    appContainer.classList.remove("sidebar-visible");
    if (autohideBar) autohideBar.style.display = "none";
    if (autohideBtn) autohideBtn.classList.remove("active");
  }
}


// 1. Initial configuration & storage load
async function initApp() {
  const result = await chrome.storage.local.get(["app_hierarchy", "app_settings", "ai_models"]);
  
  // Settings initialization (Theme & Sidebar Collapse)
  if (result.app_settings) {
    if (result.app_settings.theme) {
      appState.theme = result.app_settings.theme;
    }
    if (result.app_settings.subSidebarCollapsed !== undefined) {
      appState.subSidebarCollapsed = result.app_settings.subSidebarCollapsed;
    }
  }

  if (typeof loadAIModelsFromCSV === "function") {
    await loadAIModelsFromCSV();
  } else if (result.ai_models && Array.isArray(result.ai_models) && result.ai_models.length > 0) {
    appState.aiModels = result.ai_models;
  }

  applyTheme(appState.theme);
  applySubSidebarCollapse();
  applyAutohideState();

  // Load app hierarchy directly, fall back to clean seed data if not present
  let hasLoadedSession = false;
  if (result.app_hierarchy && result.app_hierarchy.length > 0) {
    appState.hierarchy = result.app_hierarchy;
    // Triệt tiêu tận gốc: Reset toàn bộ trạng thái âm thanh tạm thời (isAudible) trên mọi tab về false khi khởi động
    appState.hierarchy.forEach(mainGroup => {
      if (mainGroup.subGroups) {
        mainGroup.subGroups.forEach(subGroup => {
          if (subGroup.tabs) {
            subGroup.tabs.forEach(tab => {
              tab.isAudible = false;
            });
          }
        });
      }
    });
    hasLoadedSession = await loadSessionState();
    
    // Auto-restore independent window mode if last active state was popup
    if (appState.windowModeActive) {
      const currentWin = await chrome.windows.getCurrent();
      if (currentWin.type !== "popup") {
        await chrome.windows.create({
          url: chrome.runtime.getURL("dashboard.html"),
          type: "popup",
          state: "maximized"
        });
        const currentTab = await chrome.tabs.getCurrent();
        if (currentTab) {
          await chrome.tabs.remove(currentTab.id);
        }
        return; // Cancel further initialization on this normal tab since it will be closed
      }
    }
  } else {
    // Tạo cấu trúc phân cấp từ CSV cho người dùng mới hoàn toàn
    const hierarchyFromCSV = [];
    const mainGroupsMap = {}; // Tránh tạo trùng group

    DEFAULT_CHANNELS_LIST.forEach(defaultTab => {
      const gName = defaultTab.defaultGroup;
      if (gName) {
        const cleanGroupName = gName.trim();
        const mainGroupId = "main_" + cleanGroupName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        
        // Nếu Main Group chưa tồn tại trong Map, tiến hành tạo mới
        if (!mainGroupsMap[mainGroupId]) {
          const newMainGroup = {
            id: mainGroupId,
            name: cleanGroupName,
            icon: cleanGroupName, // Tên icon trong main-icons trùng với tên Group
            subGroups: [
              {
                id: "sub_" + cleanGroupName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_channels",
                name: "Channels",
                tabs: []
              }
            ]
          };
          mainGroupsMap[mainGroupId] = newMainGroup;
          hierarchyFromCSV.push(newMainGroup);
        }

        // Tạo tab object mới và thêm vào sub-group Channels của main group đó
        const subGroup = mainGroupsMap[mainGroupId].subGroups[0];
        const newTabId = "tab_" + defaultTab.id.replace("tab_", "") + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const newTab = {
          id: newTabId,
          name: defaultTab.name,
          url: defaultTab.url,
          customFavicon: defaultTab.customFavicon || "",
          openExternal: defaultTab.openExternal || false,
          isDualAcc: defaultTab.isDualAcc || false,
          isActive: false
        };
        if (defaultTab.iconType) newTab.iconType = defaultTab.iconType;
        if (defaultTab.iconText) newTab.iconText = defaultTab.iconText;
        if (defaultTab.iconBgColor) newTab.iconBgColor = defaultTab.iconBgColor;
        if (defaultTab.iconTextColor) newTab.iconTextColor = defaultTab.iconTextColor;

        if (defaultTab.isSplit) {
          newTab.isSplit = true;
          if (defaultTab.urlRight) newTab.urlRight = defaultTab.urlRight;
          if (defaultTab.customFaviconRight) newTab.customFaviconRight = defaultTab.customFaviconRight;
          if (defaultTab.openExternalRight) newTab.openExternalRight = defaultTab.openExternalRight;
          if (defaultTab.isDualAccRight) newTab.isDualAccRight = defaultTab.isDualAccRight;
          if (defaultTab.iconTypeRight) newTab.iconTypeRight = defaultTab.iconTypeRight;
          if (defaultTab.iconTextRight) newTab.iconTextRight = defaultTab.iconTextRight;
          if (defaultTab.iconBgColorRight) newTab.iconBgColorRight = defaultTab.iconBgColorRight;
          if (defaultTab.iconTextColorRight) newTab.iconTextColorRight = defaultTab.iconTextColorRight;
        }
        subGroup.tabs.push(newTab);
      }
    });

    if (hierarchyFromCSV.length > 0) {
      // Tự động active tab đầu tiên của nhóm thông thường đầu tiên (không phải AI Multi-Chat)
      const firstNormalGroup = hierarchyFromCSV.find(g => g.id !== SYSTEM_AI_GROUP_ID) || hierarchyFromCSV[0];
      if (firstNormalGroup && firstNormalGroup.subGroups.length > 0 && firstNormalGroup.subGroups[0].tabs.length > 0) {
        const firstTab = firstNormalGroup.subGroups[0].tabs[0];
        firstTab.isActive = true;
        appState.activeTabId = firstTab.id;
        appState.leftTabId = firstTab.id;
      }
      appState.hierarchy = hierarchyFromCSV;
    } else {
      // Fallback về SEED_DATA nếu CSV trống hoặc không có thông tin nhóm mặc định
      appState.hierarchy = JSON.parse(JSON.stringify(SEED_DATA));
    }
    
    await saveHierarchyToStorage();
  }

  ensureSystemAIGroup();

  // Active group selection if no session restored (Always default to the first normal Main Group, not AI Multi-Chat)
  if (!hasLoadedSession && appState.hierarchy.length > 0) {
    const firstNormalGroup = appState.hierarchy.find(g => g.id !== SYSTEM_AI_GROUP_ID) || appState.hierarchy[0];
    appState.activeMainGroupId = firstNormalGroup.id;
  }

  // Đồng bộ thuộc tính openExternal cho các tab đã lưu với CSV mới nhất
  syncExistingTabsWithCSV();

  initAISyncInputBar();

  renderMainSidebar();
  renderSubSidebar();
  renderEmojiSelector();

  // Initialize Split View event listeners
  initSplitResizer();
  initPaneActiveEvents();
  initPaneDragDropEvents();

  // Highlight onboarding controls on startup
  // Also query and highlight newly rendered Add Link buttons on startup
  document.querySelectorAll(".tab-link-item.add-tab-btn").forEach(btn => {
    btn.classList.add("flash-highlight");
  });

  // Remove flash-highlight class after 3 seconds (3 pulses complete)
  setTimeout(() => {
    document.querySelectorAll(".flash-highlight").forEach(el => {
      el.classList.remove("flash-highlight");
    });
  }, 3000);

  // If activeTabId is set, select it to trigger iframe rendering (only if no session was loaded)
  if (!hasLoadedSession && appState.activeTabId) {
    const activeTab = findTabById(appState.activeTabId);
    if (activeTab) {
      selectTab(activeTab.id, activeTab.url);
    }
  }

  // Check if extension is running in popup (independent window) mode
  chrome.windows.getCurrent((win) => {
    if (win && win.type === "popup") {
      const btn = document.getElementById("btn-toggle-window-mode");
      if (btn) {
        btn.classList.add("active");
        btn.title = "Back to Chrome Tab";
      }
    }
  });

  // Daily Background Sync from Google Sheet
  if (typeof checkAndSyncGoogleSheetDaily === "function") {
    checkAndSyncGoogleSheetDaily();
  }
}


// Default Channels modal logic moved to modals/default-channels.js

// 2. Storage utilities
async function saveHierarchyToStorage() {
  const cleanHierarchy = JSON.parse(JSON.stringify(appState.hierarchy));
  cleanHierarchy.forEach(mainGroup => {
    if (mainGroup.subGroups) {
      mainGroup.subGroups.forEach(subGroup => {
        if (subGroup.tabs) {
          subGroup.tabs.forEach(tab => {
            delete tab.isAudible;
          });
        }
      });
    }
  });
  await chrome.storage.local.set({ "app_hierarchy": cleanHierarchy });
}

async function saveSettingsToStorage() {
  await chrome.storage.local.set({ 
    "app_settings": { 
      theme: appState.theme,
      subSidebarCollapsed: appState.subSidebarCollapsed
    } 
  });
}

// 3. Theme toggles
function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    document.getElementById("theme-toggle-btn").querySelector(".icon").textContent = "☀️";
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    document.getElementById("theme-toggle-btn").querySelector(".icon").textContent = "🌙";
  }
}

function toggleTheme() {
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  applyTheme(appState.theme);
  saveSettingsToStorage();
}

function applySubSidebarCollapse() {
  // sidebar-sub is always in collapsed state.
  // Expanding is handled purely by CSS :hover (overlay, no layout shift).
  const sidebar = document.getElementById("sidebar-sub");
  const toggleBtn = document.getElementById("btn-toggle-sub-sidebar");
  if (sidebar) sidebar.classList.add("collapsed");
  // Hide the toggle button since it's no longer needed
  if (toggleBtn) toggleBtn.style.display = "none";
}

// toggleSubSidebar kept for backward-compat but is now a no-op
function toggleSubSidebar() {
  // No-op: sidebar expand/collapse is handled by CSS :hover
}

// 4. Render Main Sidebar (Column 1)
function renderMainSidebar() {
  const container = document.getElementById("main-groups-list");
  container.innerHTML = "";

  // Filter out system AI group from lower list since it is placed in top action bar
  appState.hierarchy.filter(group => group.id !== SYSTEM_AI_GROUP_ID).forEach(group => {
    const item = document.createElement("div");
    item.className = `group-item ${group.id === appState.activeMainGroupId ? "active" : ""}`;
    item.title = group.name;
    item.setAttribute("data-main-group-id", group.id);
    // Render icon: SVG mask span hoặc emoji
    if (group.icon && window.MAIN_ICON_LIST && window.MAIN_ICON_LIST.includes(group.icon)) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "icon-mask";
      iconSpan.style.webkitMaskImage = `url('svg/main-icons/${group.icon}.svg')`;
      iconSpan.style.maskImage = `url('svg/main-icons/${group.icon}.svg')`;
      item.appendChild(iconSpan);
    } else {
      item.textContent = group.icon || "📁";
    }

    const isGroupAudible = group.subGroups && group.subGroups.some(sub => sub.tabs && sub.tabs.some(t => t.isAudible));
    if (isGroupAudible) {
      const groupSoundBadge = document.createElement("span");
      groupSoundBadge.className = "tab-sound-icon";
      groupSoundBadge.title = "Group contains channels playing audio";
      item.appendChild(groupSoundBadge);
    }
    
    item.setAttribute("draggable", "true");
    item.addEventListener("click", () => {
      selectMainGroup(group.id);
    });

    // Main Group Drag and Drop listeners
    item.addEventListener("dragstart", handleMainGroupDragStart);
    item.addEventListener("dragend", handleMainGroupDragEnd);
    item.addEventListener("dragover", handleMainGroupDragOver);
    item.addEventListener("dragenter", handleMainGroupDragEnter);
    item.addEventListener("dragleave", handleMainGroupDragLeave);
    item.addEventListener("drop", handleMainGroupDrop);

    container.appendChild(item);
  });

  // Append Add Main Group button dynamically at the end of the list
  const addBtn = document.createElement("button");
  addBtn.id = "add-main-group-btn";
  addBtn.className = "group-item add-btn";
  addBtn.title = "Add Main Group";
  addBtn.innerHTML = `<span class="icon-add"></span>`;
  addBtn.addEventListener("click", openAddMainGroupModal);
  container.appendChild(addBtn);

  // Sync active state for top action bar AI Multi-Chat circular button
  const aiBtn = document.getElementById("btn-ai-multichat-group");
  if (aiBtn) {
    aiBtn.classList.toggle("active", appState.activeMainGroupId === SYSTEM_AI_GROUP_ID);
    const aiGroup = appState.hierarchy.find(g => g.id === SYSTEM_AI_GROUP_ID);
    const isAiAudible = aiGroup && aiGroup.subGroups && aiGroup.subGroups.some(sub => sub.tabs && sub.tabs.some(t => t.isAudible));
    let aiSoundBadge = aiBtn.querySelector(".tab-sound-icon");
    if (isAiAudible) {
      if (!aiSoundBadge) {
        aiSoundBadge = document.createElement("span");
        aiSoundBadge.className = "tab-sound-icon";
        aiSoundBadge.title = "AI Multi-Chat is playing audio";
        aiBtn.appendChild(aiSoundBadge);
      }
      aiSoundBadge.style.display = "inline-block";
    } else if (aiSoundBadge) {
      aiSoundBadge.style.display = "none";
    }
  }
}

let lastAutoOpenedGroupId = null;

function checkAndShowDefaultChannelsPopup() {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;
  
  // Tính tổng số tab trong tất cả các phân nhóm của Nhóm chính hiện tại
  const totalTabs = activeMainGroup.subGroups.reduce((acc, sub) => acc + (sub.tabs ? sub.tabs.length : 0), 0);
  
  if (totalTabs === 0) {
    // Nếu chưa từng tự động mở cho nhóm này trong phiên hiện tại
    if (lastAutoOpenedGroupId !== activeMainGroup.id) {
      lastAutoOpenedGroupId = activeMainGroup.id;
      
      // Delay một khoảng nhỏ để giao diện render mượt mà trước khi hiện popup
      setTimeout(() => {
        const modal = document.getElementById("tab-modal");
        if (modal && !modal.classList.contains("show")) {
          const activeSubGroupId = activeMainGroup.subGroups.length > 0 ? activeMainGroup.subGroups[0].id : null;
          if (activeSubGroupId) {
            openAddTabModal(activeSubGroupId, "tab-pane-default");
          }
        }
      }, 300);
    }
  } else {
    // Nếu đã có tab, reset tracking để có thể tự động mở lại nếu nhóm bị xóa hết tab trong tương lai
    if (lastAutoOpenedGroupId === activeMainGroup.id) {
      lastAutoOpenedGroupId = null;
    }
  }
}

// 5. Render Sub Sidebar (Column 2)
function renderSubSidebar() {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  const titleEl = document.getElementById("active-main-group-title");
  const subContainer = document.getElementById("sub-groups-container");
  const sidebarSub = document.getElementById("sidebar-sub");
  const editGroupBtn = document.getElementById("edit-main-group-btn");
  const deleteGroupBtn = document.getElementById("delete-main-group-btn");
  const addSubGroupBtn = document.getElementById("add-sub-group-btn");

  if (!activeMainGroup) {
    titleEl.textContent = "No Group";
    subContainer.innerHTML = "";
    sidebarSub.style.display = "none";
    return;
  }

  // Handle Special System AI Multi-Chat Group
  if (activeMainGroup.id === SYSTEM_AI_GROUP_ID) {
    if (editGroupBtn) editGroupBtn.style.display = "none";
    if (deleteGroupBtn) deleteGroupBtn.style.display = "none";
    if (addSubGroupBtn) addSubGroupBtn.style.display = "none";

    sidebarSub.style.display = "flex";
    const iconHtml = `<img src="svg/main-icons/AI.svg" alt="AI" style="width:24px;height:24px;object-fit:contain;filter:brightness(0) invert(0.85);vertical-align:middle;">`;
    titleEl.innerHTML = `<span class="group-header-icon">${iconHtml}</span> <span class="group-header-text"></span>`;
    titleEl.querySelector(".group-header-text").textContent = activeMainGroup.name;
    subContainer.innerHTML = "";

    renderAISubSidebar(subContainer);
    renderWorkspace();
    return;
  } else {
    if (editGroupBtn) editGroupBtn.style.display = "inline-block";
    if (deleteGroupBtn) {
      if (activeMainGroup.id === "main_cskh") {
        deleteGroupBtn.style.display = "none";
      } else {
        deleteGroupBtn.style.display = "inline-block";
      }
    }
    if (addSubGroupBtn) addSubGroupBtn.style.display = "flex";
  }

  sidebarSub.style.display = "flex";
  // Render header icon: SVG hoặc emoji cũ
  const iconHtml = (activeMainGroup.icon && window.MAIN_ICON_LIST && window.MAIN_ICON_LIST.includes(activeMainGroup.icon))
    ? `<img src="svg/main-icons/${activeMainGroup.icon}.svg" alt="${activeMainGroup.icon}" style="width:24px;height:24px;object-fit:contain;filter:brightness(0) invert(0.85);vertical-align:middle;">`
    : (activeMainGroup.icon || "📁");
  titleEl.innerHTML = `<span class="group-header-icon">${iconHtml}</span> <span class="group-header-text"></span>`;
  titleEl.querySelector(".group-header-text").textContent = activeMainGroup.name;
  subContainer.innerHTML = "";
  renderWorkspace();

  activeMainGroup.subGroups.forEach(sub => {
    const subSection = document.createElement("div");
    subSection.className = "sub-group-section";

    // Row Title + CRUD Actions
    const titleRow = document.createElement("div");
    titleRow.className = "sub-group-title-row";

    const title = document.createElement("div");
    title.className = "sub-group-title";
    title.textContent = sub.name;
    titleRow.appendChild(title);

    // Nút quản lý
    const actions = document.createElement("div");
    actions.className = "sub-group-actions";
    
    const editSubBtn = document.createElement("button");
    editSubBtn.className = "btn-icon-small edit-btn";
    editSubBtn.dataset.action = "edit-sub-group";
    editSubBtn.dataset.subGroupId = sub.id;
    editSubBtn.dataset.subGroupName = sub.name;
    editSubBtn.title = "Edit Sub-group";
    editSubBtn.innerHTML = '<span class="icon-mask"></span>';

    const cloneSubBtn = document.createElement("button");
    cloneSubBtn.className = "btn-icon-small clone-btn";
    cloneSubBtn.dataset.action = "clone-sub-group";
    cloneSubBtn.dataset.subGroupId = sub.id;
    cloneSubBtn.title = "Clone Sub-group";
    cloneSubBtn.innerHTML = '<span class="icon-mask"></span>';

    const delSubBtn = document.createElement("button");
    delSubBtn.className = "btn-icon-small delete-btn danger";
    delSubBtn.dataset.action = "delete-sub-group";
    delSubBtn.dataset.subGroupId = sub.id;
    delSubBtn.title = "Delete Sub-group";
    delSubBtn.innerHTML = '<span class="icon-mask"></span>';

    actions.appendChild(editSubBtn);
    actions.appendChild(cloneSubBtn);
    actions.appendChild(delSubBtn);
    titleRow.appendChild(actions);
    subSection.appendChild(titleRow);

    // List tabs
    const tabsList = document.createElement("div");
    tabsList.className = "tabs-list";
    tabsList.id = `tabs-list-${sub.id}`;

    // Sub-group level dragover listeners to support dropping tab into empty sub-groups
    tabsList.addEventListener("dragover", handleTabsListDragOver);
    tabsList.addEventListener("drop", handleTabsListDrop);

    sub.tabs.forEach(tab => {


      const tabItem = document.createElement("div");
      
      const isTabActive = tab.id === appState.activeTabId;
      const isTabSibling = appState.splitViewActive && 
                           tab.id === (appState.activeView === "left" ? appState.rightTabId : appState.leftTabId);
      const isTabLoaded = !!(document.getElementById(`wrapper-left-${tab.id}`) || document.getElementById(`wrapper-right-${tab.id}`));
      
      tabItem.className = `tab-link-item ${isTabActive ? "active" : ""} ${isTabSibling ? "active-sibling" : ""} ${isTabLoaded ? "loaded" : ""} ${(tab.hasError || tab.openExternal) ? "connection-error" : ""}`;
      tabItem.setAttribute("draggable", "true");
      tabItem.setAttribute("data-tab-id", tab.id);
      tabItem.setAttribute("data-sub-group-id", sub.id);
      
      // Build icon element (CSP-safe: no inline event handlers)
      const iconEl = createTabIconElement(tab);

      // Build tab-title
      const titleEl = document.createElement("span");
      titleEl.className = "tab-title";
      titleEl.textContent = tab.name;

      // Dual Account badges (Left and/or Right side)
      let dualBadgeLeft = null;
      let dualBadgeRight = null;

      if (tab.isDualAcc) {
        dualBadgeLeft = document.createElement("span");
        dualBadgeLeft.className = tab.isSplit ? "badge-dual-acc badge-dual-left" : "badge-dual-acc";
        dualBadgeLeft.textContent = tab.isSplit ? "2" : "👤²";
        dualBadgeLeft.title = "Left Dual Account Mode (Isolated Session)";
      }

      if (tab.isDualAccRight) {
        dualBadgeRight = document.createElement("span");
        dualBadgeRight.className = "badge-dual-acc badge-dual-right";
        dualBadgeRight.textContent = tab.isSplit ? "2" : "👤²";
        dualBadgeRight.title = "Right Dual Account Mode (Isolated Session)";
      }

      // Sound playing badge
      let soundBadge = null;
      if (tab.isAudible) {
        soundBadge = document.createElement("span");
        soundBadge.className = "tab-sound-icon";
        soundBadge.title = "Audio Playing";
      }

      // Build tab-actions
      const actionsEl = document.createElement("div");
      actionsEl.className = "tab-actions";

      const closeTabBtn = document.createElement("button");
      closeTabBtn.className = "btn-icon-small close-btn danger";
      closeTabBtn.dataset.action = "close-active-tab";
      closeTabBtn.dataset.subGroupId = sub.id;
      closeTabBtn.dataset.tabId = tab.id;
      closeTabBtn.title = "Stop & Close Tab";
      closeTabBtn.innerHTML = '<span class="icon-mask"></span>';

      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon-small edit-btn";
      editBtn.dataset.action      = "edit-tab";
      editBtn.dataset.subGroupId  = sub.id;
      editBtn.dataset.tabId       = tab.id;
      editBtn.dataset.tabName     = tab.name;
      editBtn.dataset.tabUrl      = tab.url;
      editBtn.title = "Edit";
      editBtn.innerHTML = '<span class="icon-mask"></span>';

      const cloneBtn = document.createElement("button");
      cloneBtn.className = "btn-icon-small clone-btn";
      cloneBtn.dataset.action     = "clone-tab";
      cloneBtn.dataset.subGroupId = sub.id;
      cloneBtn.dataset.tabId      = tab.id;
      cloneBtn.title = "Clone Link";
      cloneBtn.innerHTML = '<span class="icon-mask"></span>';

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-small delete-btn danger";
      delBtn.dataset.action     = "delete-tab";
      delBtn.dataset.subGroupId = sub.id;
      delBtn.dataset.tabId      = tab.id;
      delBtn.title = "Delete";
      delBtn.innerHTML = '<span class="icon-mask"></span>';

      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(cloneBtn);
      actionsEl.appendChild(closeTabBtn);
      actionsEl.appendChild(delBtn);

      // Assemble tabItem
      tabItem.innerHTML = ""; // clear
      tabItem.appendChild(iconEl);
      tabItem.appendChild(titleEl);
      if (soundBadge) tabItem.appendChild(soundBadge);
      if (dualBadgeLeft) tabItem.appendChild(dualBadgeLeft);
      if (dualBadgeRight) tabItem.appendChild(dualBadgeRight);
      tabItem.appendChild(actionsEl);

      tabItem.addEventListener("click", () => {
        selectTab(tab.id, tab.url);
      });

      // Drag and Drop listeners
      tabItem.addEventListener("dragstart", handleDragStart);
      tabItem.addEventListener("dragover", handleDragOver);
      tabItem.addEventListener("dragenter", handleDragEnter);
      tabItem.addEventListener("dragleave", handleDragLeave);
      tabItem.addEventListener("dragend", handleDragEnd);
      tabItem.addEventListener("drop", handleDrop);

      tabsList.appendChild(tabItem);
    });

    // Append Add Link button dynamically at the end of the tabs list
    const addLinkBtn = document.createElement("div");
    addLinkBtn.className = "tab-link-item add-tab-btn";
    addLinkBtn.innerHTML = `
      <span class="icon-add"></span>
      <span class="tab-title" style="font-weight: 500;">Add Link</span>
    `;
    addLinkBtn.addEventListener("click", () => {
      openAddTabModal(sub.id);
    });
    tabsList.appendChild(addLinkBtn);

    subSection.appendChild(tabsList);
    subContainer.appendChild(subSection);
  });
  checkAndShowDefaultChannelsPopup();
}

function selectMainGroup(id) {
  appState.activeMainGroupId = id;
  renderMainSidebar();
  renderSubSidebar();
  saveSessionState();
}

window.loadIframeInPane = function(pane, tabObj, url, isOpenExternal) {
  const contentContainer = document.getElementById(`pane-${pane}-content`);
  if (!contentContainer) return;
  contentContainer.querySelectorAll(".iframe-wrapper").forEach(w => w.classList.remove("active"));

  let wrapper = document.getElementById(`wrapper-${pane}-${tabObj.id}`);
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "iframe-wrapper active";
    wrapper.id = `wrapper-${pane}-${tabObj.id}`;

    if (isOpenExternal) {
      wrapper.innerHTML = `
        <div class="external-tab-warning">
          <div class="warning-icon-svg"></div>
          <h3>I tried my best!</h3>
          <p>Due to security restrictions, this website must be opened in a new tab.</p>
          <button class="open-external-btn">Open in New Tab</button>
        </div>
      `;
      const btn = wrapper.querySelector(".open-external-btn");
      btn.addEventListener("click", () => {
        window.open(url, "_blank");
      });
    } else {
      const iframe = document.createElement("iframe");
      let iframeUrl = url;
      const isDualForThisPane = tabObj && (pane === "right" ? tabObj.isDualAccRight : tabObj.isDualAcc);
      if (isDualForThisPane) {
        try {
          const u = new URL(url);
          u.searchParams.set("max_dual_acc", "1");
          iframeUrl = u.toString();
        } catch (e) {
          iframeUrl = url + (url.includes("?") ? "&" : "?") + "max_dual_acc=1";
        }
        iframe.setAttribute("credentialless", "true");
        iframe.setAttribute("data-dual-acc", "true");
      }
      iframe.src = iframeUrl;
      if (tabObj && tabObj.id) {
        iframe.name = tabObj.id;
        iframe.setAttribute("name", tabObj.id);
      }
      iframe.setAttribute("allow", "geolocation; microphone; camera; midi; encrypted-media; clipboard-write; clipboard-read; autoplay");
      wrapper.appendChild(iframe);
    }
    contentContainer.appendChild(wrapper);
  } else {
    wrapper.classList.add("active");
  }

  // Sync Address Bar & Title
  const titleEl = document.getElementById(`pane-${pane}-title`);
  if (titleEl) titleEl.textContent = tabObj.name;
  
  const addressInput = document.getElementById(`address-bar-input-${pane}`);
  if (addressInput) addressInput.value = url;

  if (pane === "right") {
    const ph = document.getElementById("pane-right-placeholder");
    if (ph) ph.style.display = "none";
  }
  
  const welcome = document.getElementById("welcome-screen");
  if (welcome) welcome.style.display = "none";
};

function selectTab(tabId, url) {
  // Clear error status on retry selection
  const tabObj = findTabById(tabId);
  if (tabObj && tabObj.hasError) {
    tabObj.hasError = false;
  }

  // Hide welcome screen
  document.getElementById("welcome-screen").style.display = "none";

  if (tabObj && tabObj.isSplit) {
    // ==================== DUAL SPLIT LINK LOGIC ====================
    appState.isSplitLinkActive = true;
    setSplitViewActive(true);

    appState.leftTabId = tabId;
    appState.rightTabId = tabId;
    appState.activeTabId = tabId;
    appState.activeView = "left";

    paneFrameIdMap.left = null;
    paneFrameIdMap.right = null;

    document.getElementById("pane-right-placeholder").style.display = "none";

    window.loadIframeInPane("left", tabObj, tabObj.url, !!tabObj.openExternal);
    window.loadIframeInPane("right", tabObj, tabObj.urlRight, !!tabObj.openExternalRight);

    console.log(`Initialized Split Link: ${tabObj.url} & ${tabObj.urlRight}`);
  } else {
    // ==================== SINGLE LINK LOGIC ====================
    if (appState.isSplitLinkActive) {
      appState.isSplitLinkActive = false;
      setSplitViewActive(false);

      appState.leftTabId = tabId;
      appState.activeTabId = tabId;
      appState.activeView = "left";
      paneFrameIdMap.left = null;

      window.loadIframeInPane("left", tabObj, url, tabObj ? !!tabObj.openExternal : false);
    } else {
      if (appState.splitViewActive) {
        const targetPane = appState.activeView;
        
        if (targetPane === "left") {
          appState.leftTabId = tabId;
        } else {
          appState.rightTabId = tabId;
          document.getElementById("pane-right-placeholder").style.display = "none";
        }
        
        appState.activeTabId = tabId;
        paneFrameIdMap[targetPane] = null;

        window.loadIframeInPane(targetPane, tabObj, url, tabObj ? !!tabObj.openExternal : false);
      } else {
        appState.leftTabId = tabId;
        appState.activeTabId = tabId;
        appState.activeView = "left";
        paneFrameIdMap.left = null;

        window.loadIframeInPane("left", tabObj, url, tabObj ? !!tabObj.openExternal : false);
      }
    }
  }

  renderSubSidebar();
  saveSessionState();
}


// Helper: Find a tab object by its ID in the hierarchy
function findTabById(tabId) {
  for (const mainGroup of appState.hierarchy) {
    for (const subGroup of mainGroup.subGroups) {
      const tab = subGroup.tabs.find(t => t.id === tabId);
      if (tab) return tab;
    }
  }
  return null;
}

// Xử lý khi người dùng chỉnh sửa URL trực tiếp trên thanh address bar
async function handleAddressBarSubmit(paneSide) {
  const inputEl = document.getElementById(`address-bar-input-${paneSide}`);
  if (!inputEl) return;

  const tabId = (paneSide === "left") ? appState.leftTabId : appState.rightTabId;
  if (!tabId) return;

  const tabObj = findTabById(tabId);
  if (!tabObj) return;

  let newUrl = inputEl.value.trim();
  
  // Nếu xoá trống, trả về URL cũ của tab
  if (!newUrl) {
    inputEl.value = tabObj.url;
    return;
  }

  // Tự động thêm protocol nếu thiếu
  if (!/^https?:\/\//i.test(newUrl)) {
    newUrl = "https://" + newUrl;
  }
  
  inputEl.value = newUrl;

  // Nếu có thay đổi URL thực sự
  if (tabObj.url !== newUrl) {
    const oldUrl = tabObj.url;
    tabObj.url = newUrl;

    // Cập nhật src cho iframe tương ứng trong DOM
    const wrapper = document.getElementById(`wrapper-${paneSide}-${tabId}`);
    if (wrapper) {
      const iframe = wrapper.querySelector("iframe");
      if (iframe) {
        iframe.src = newUrl;
        console.log(`Updated pane ${paneSide} iframe src from address bar to: ${newUrl}`);
      }
    }

    // Lưu lại cấu trúc dữ liệu mới
    await saveHierarchyToStorage();

    // Cập nhật dataset trên nút Edit để đồng bộ
    const editBtn = document.querySelector(`[data-action="edit-tab"][data-tab-id="${tabId}"]`);
    if (editBtn) {
      editBtn.setAttribute("data-tab-url", newUrl);
    }
  }
}


window.destroyIframePane = function(pane, tabId) {
  const wrapper = document.getElementById(`wrapper-${pane}-${tabId}`);
  if (wrapper) wrapper.remove();
};

function destroyIframe(tabId) {
  window.destroyIframePane("left", tabId);
  window.destroyIframePane("right", tabId);
}

function closeTabSession(tabId) {
  if (!tabId) return;
  destroyIframe(tabId);
  const tabObj = findTabById(tabId);
  if (tabObj) {
    tabObj.hasError = false;
    tabObj.isAudible = false;
  }

  // If this tab was active in left pane
  if (appState.leftTabId === tabId) {
    appState.leftTabId = null;
    const inputLeft = document.getElementById("address-bar-input-left");
    if (inputLeft) inputLeft.value = "";
    const titleLeft = document.getElementById("pane-left-title");
    if (titleLeft) titleLeft.textContent = "";
  }

  // If this tab was active in right pane
  if (appState.rightTabId === tabId) {
    appState.rightTabId = null;
    const inputRight = document.getElementById("address-bar-input-right");
    if (inputRight) inputRight.value = "";
    const titleRight = document.getElementById("pane-right-title");
    if (titleRight) titleRight.textContent = "";
    const placeholder = document.getElementById("pane-right-placeholder");
    if (placeholder) placeholder.style.display = "flex";
  }

  if (appState.activeTabId === tabId) {
    appState.activeTabId = appState.leftTabId || appState.rightTabId || null;
  }

  // Show welcome screen if no tab is active in left pane
  if (!appState.leftTabId) {
    const welcome = document.getElementById("welcome-screen");
    if (welcome) welcome.style.display = "flex";
  }

  renderSubSidebar();
  saveSessionState();
}

// ==================== CRUD LOGIC ====================

// --- MAIN GROUPS ---
// Main Group CRUD logic moved to modals/main-group.js

// --- SUB GROUPS ---
// Sub Group CRUD logic moved to modals/sub-group.js

// --- CHANNELS / TABS ---
// Custom Tab Link CRUD logic moved to modals/tab-link.js

// ==================== DRAG & DROP HANDLERS ====================
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  draggedElement.classList.add("dragging");
  document.body.classList.add("dragging-tab");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", draggedElement.getAttribute("data-tab-id"));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  const targetElement = e.currentTarget;
  if (!draggedElement || targetElement === draggedElement) return false;

  const draggedSubId = draggedElement.getAttribute("data-sub-group-id");
  const targetSubId = targetElement.getAttribute("data-sub-group-id");

  const rect = targetElement.getBoundingClientRect();
  // Check if cursor is over the top half or bottom half of the target element
  const isAfter = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

  const parent = targetElement.parentNode;
  parent.insertBefore(draggedElement, isAfter ? targetElement.nextSibling : targetElement);
  
  // Dynamically update the sub-group reference while dragging over another sub-group
  if (draggedSubId !== targetSubId) {
    draggedElement.setAttribute("data-sub-group-id", targetSubId);
  }
  
  return false;
}

function handleDragEnter(e) {
  e.preventDefault();
}

function handleDragLeave(e) {
  // No-op for live reordering
}

async function handleDragEnd(e) {
  if (draggedElement) {
    draggedElement.classList.remove("dragging");
  }
  document.body.classList.remove("dragging-tab");
  
  // Scan DOM to save the new order
  await saveNewTabsOrder();
  draggedElement = null;
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}

async function saveNewTabsOrder() {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;

  // 1. Gather all original tabs inside this Main Group to prevent losing tabs when dragging across sub-groups
  const allOriginalTabs = new Map();
  activeMainGroup.subGroups.forEach(sub => {
    if (Array.isArray(sub.tabs)) {
      sub.tabs.forEach(tab => {
        allOriginalTabs.set(tab.id, tab);
      });
    }
  });

  // 2. Scan each DOM list and rebuild the tabs array for each sub-group
  activeMainGroup.subGroups.forEach(sub => {
    const tabsListEl = document.getElementById(`tabs-list-${sub.id}`);
    if (tabsListEl) {
      const tabElements = Array.from(tabsListEl.querySelectorAll(".tab-link-item"));
      const visibleTabs = [];
      
      tabElements.forEach(el => {
        const tabId = el.getAttribute("data-tab-id");
        const tabObj = allOriginalTabs.get(tabId);
        if (tabObj) {
          visibleTabs.push(tabObj);
        }
      });

      sub.tabs = visibleTabs;
    }
  });

  await saveHierarchyToStorage();
  // Re-render to ensure all background states match
  renderSubSidebar();
}

// ==================== CROSS-GROUP DRAG & DROP HANDLERS ====================

// --- 1. Main Group Drag/Drop Actions (Column 1 Sidebar Reordering & Receiving Tabs) ---
let draggedMainGroupElement = null;

function handleMainGroupDragStart(e) {
  draggedMainGroupElement = e.currentTarget;
  draggedMainGroupElement.classList.add("dragging");
  document.body.classList.add("dragging-main-group");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", draggedMainGroupElement.getAttribute("data-main-group-id"));
}

async function handleMainGroupDragEnd(e) {
  if (draggedMainGroupElement) {
    draggedMainGroupElement.classList.remove("dragging");
  }
  document.body.classList.remove("dragging-main-group");

  if (draggedMainGroupElement) {
    await saveNewMainGroupsOrder();
  }
  draggedMainGroupElement = null;
}

async function saveNewMainGroupsOrder() {
  const container = document.getElementById("main-groups-list");
  if (!container) return;

  const groupElements = Array.from(container.querySelectorAll(".group-item[data-main-group-id]"));
  const newOrderedIds = groupElements.map(el => el.getAttribute("data-main-group-id"));

  const reorderedHierarchy = [];

  // Keep System AI group at top (if present)
  const aiGroup = appState.hierarchy.find(g => g.id === SYSTEM_AI_GROUP_ID);
  if (aiGroup) {
    reorderedHierarchy.push(aiGroup);
  }

  // Add reordered groups in order of newOrderedIds
  newOrderedIds.forEach(id => {
    const g = appState.hierarchy.find(item => item.id === id);
    if (g && g.id !== SYSTEM_AI_GROUP_ID) {
      reorderedHierarchy.push(g);
    }
  });

  // Append any remaining groups that might not have been in the DOM list
  appState.hierarchy.forEach(g => {
    if (!reorderedHierarchy.includes(g)) {
      reorderedHierarchy.push(g);
    }
  });

  appState.hierarchy = reorderedHierarchy;
  await saveHierarchyToStorage();
}

function handleMainGroupDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  const targetItem = e.currentTarget;

  if (draggedMainGroupElement) {
    if (targetItem !== draggedMainGroupElement && targetItem.classList.contains("group-item") && !targetItem.classList.contains("add-btn")) {
      const rect = targetItem.getBoundingClientRect();
      const isAfter = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      const parent = targetItem.parentNode;
      parent.insertBefore(draggedMainGroupElement, isAfter ? targetItem.nextSibling : targetItem);
    }
    return false;
  }

  return false;
}

function handleMainGroupDragEnter(e) {
  e.preventDefault();
  if (draggedElement && !draggedMainGroupElement) {
    e.currentTarget.classList.add("drag-over-group");
  }
}

function handleMainGroupDragLeave(e) {
  if (draggedElement && !draggedMainGroupElement) {
    e.currentTarget.classList.remove("drag-over-group");
  }
}

async function handleMainGroupDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over-group");

  if (draggedMainGroupElement) {
    return false;
  }

  const targetMainGroupId = e.currentTarget.getAttribute("data-main-group-id");
  if (!draggedElement) return false;

  const draggedTabId = draggedElement.getAttribute("data-tab-id");
  const sourceSubGroupId = draggedElement.getAttribute("data-sub-group-id");

  // Locate the tab and its sources in the current hierarchy
  let sourceMainGroup = null;
  let sourceSubGroup = null;
  let tabObj = null;

  for (const main of appState.hierarchy) {
    const sub = main.subGroups.find(s => s.id === sourceSubGroupId);
    if (sub) {
      const tab = sub.tabs.find(t => t.id === draggedTabId);
      if (tab) {
        sourceMainGroup = main;
        sourceSubGroup = sub;
        tabObj = tab;
        break;
      }
    }
  }

  // Prevent dropping onto the active main group itself (same-main-group is handled by live DOM dragover)
  if (sourceMainGroup && sourceMainGroup.id !== targetMainGroupId && tabObj) {
    const targetMainGroup = appState.hierarchy.find(g => g.id === targetMainGroupId);
    if (!targetMainGroup) return false;

    // Remove tab from source sub-group
    sourceSubGroup.tabs = sourceSubGroup.tabs.filter(t => t.id !== draggedTabId);

    // Get or create destination sub-group
    let targetSubGroup = targetMainGroup.subGroups[0];
    if (!targetSubGroup) {
      targetSubGroup = {
        id: "sub_" + Date.now(),
        name: "Channels",
        tabs: []
      };
      targetMainGroup.subGroups.push(targetSubGroup);
    }

    // Insert tab into destination sub-group
    targetSubGroup.tabs.push(tabObj);

    await saveHierarchyToStorage();

    // Destroy active iframe of the moved tab so it can be re-rendered in the new window context
    destroyIframe(draggedTabId);

    // Switch view to the target main group
    appState.activeMainGroupId = targetMainGroupId;
    renderMainSidebar();
    renderSubSidebar();

    // Auto-select the newly moved tab
    setTimeout(() => {
      selectTab(tabObj.id, tabObj.url);
    }, 100);
  }

  draggedElement = null;
  return false;
}

// --- 2. Sub-group List Drag/Drop Actions (Column 2 Empty Zones) ---
function handleTabsListDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  if (!draggedElement) return false;

  const targetSubGroupId = e.currentTarget.id.replace("tabs-list-", "");
  const sourceSubGroupId = draggedElement.getAttribute("data-sub-group-id");

  // If hovering over another sub-group zone, append the dragged element to the end of that list
  if (targetSubGroupId !== sourceSubGroupId) {
    e.currentTarget.appendChild(draggedElement);
    draggedElement.setAttribute("data-sub-group-id", targetSubGroupId);
  }
  return false;
}

function handleTabsListDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}

// ==================== SPLIT VIEW SYSTEM LOGIC ====================

function setSplitViewActive(active) {
  if (appState.splitViewActive === active) return;
  appState.splitViewActive = active;
  
  const btn = document.getElementById("btn-toggle-split-view");
  const divider = document.getElementById("split-divider");
  const paneRight = document.getElementById("pane-right");
  const paneLeft = document.getElementById("pane-left");
  const framesHolder = document.getElementById("frames-holder");
  
  if (appState.splitViewActive) {
    btn?.classList.add("active");
    framesHolder?.classList.add("split-active");
    if (divider) divider.style.display = "flex";
    if (paneRight) paneRight.style.display = "flex";
    
    // Default left pane active on split enable
    appState.activeView = "left";
    paneLeft?.classList.add("active-view-stroke");
    paneRight?.classList.remove("active-view-stroke");
    
    // Set starting positions
    if (paneLeft) paneLeft.style.width = "calc(50% - 3px)";
    if (paneRight) paneRight.style.width = "calc(50% - 3px)";
    
    // Handle right pane active states
    if (!appState.rightTabId) {
      const ph = document.getElementById("pane-right-placeholder");
      if (ph) ph.style.display = "flex";
      const title = document.getElementById("pane-right-title");
      if (title) title.textContent = "Right View";
      const address = document.getElementById("address-bar-input-right");
      if (address) address.value = "";
    } else {
      const ph = document.getElementById("pane-right-placeholder");
      if (ph) ph.style.display = "none";
      const tabObj = findTabById(appState.rightTabId);
      const title = document.getElementById("pane-right-title");
      if (title) title.textContent = tabObj ? tabObj.name : "Right View";
      const address = document.getElementById("address-bar-input-right");
      if (address) address.value = tabObj ? tabObj.url : "";
      
      const rightContent = document.getElementById("pane-right-content");
      rightContent?.querySelectorAll(".iframe-wrapper").forEach(w => {
        if (w.id === `wrapper-right-${appState.rightTabId}`) {
          w.classList.add("active");
        } else {
          w.classList.remove("active");
        }
      });
    }
    
    // Sync left pane header title and address
    if (appState.leftTabId) {
      const leftTabObj = findTabById(appState.leftTabId);
      const title = document.getElementById("pane-left-title");
      if (title) title.textContent = leftTabObj ? leftTabObj.name : "Left View";
      const address = document.getElementById("address-bar-input-left");
      if (address) address.value = leftTabObj ? leftTabObj.url : "";
      appState.activeTabId = appState.leftTabId;
    }
  } else {
    btn?.classList.remove("active");
    if (framesHolder) {
      framesHolder.classList.remove("split-active");
    }
    if (divider) divider.style.display = "none";
    if (paneRight) paneRight.style.display = "none";
    if (paneLeft) {
      paneLeft.style.width = "100%";
      paneLeft.classList.add("active-view-stroke");
    }
    
    // Clear right pane iframes to save memory
    clearRightPane();
    
    appState.activeView = "left";
    if (appState.leftTabId) {
      appState.activeTabId = appState.leftTabId;
      const tabObj = findTabById(appState.leftTabId);
      const address = document.getElementById("address-bar-input-left");
      if (tabObj && address) {
        address.value = tabObj.url;
      }
    }
  }
  
  renderSubSidebar();
  saveSessionState();
}

function toggleSplitView() {
  appState.isSplitLinkActive = false;
  setSplitViewActive(!appState.splitViewActive);
}

async function handleWindowModeToggle() {
  const currentWin = await chrome.windows.getCurrent();
  if (currentWin.type === "popup") {
    appState.windowModeActive = false;
    await saveSessionState();
    // Chuyển trở lại làm Tab của Chrome
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    await chrome.windows.remove(currentWin.id);
  } else {
    appState.windowModeActive = true;
    await saveSessionState();
    // Tách thành cửa sổ Popup độc lập
    await chrome.windows.create({
      url: chrome.runtime.getURL("dashboard.html"),
      type: "popup",
      state: "maximized"
    });
    const currentTab = await chrome.tabs.getCurrent();
    if (currentTab) {
      await chrome.tabs.remove(currentTab.id);
    }
  }
}

function clearRightPane() {
  const rightContent = document.getElementById("pane-right-content");
  if (rightContent) {
    rightContent.querySelectorAll(".iframe-wrapper").forEach(w => w.remove());
  }
  appState.rightTabId = null;
  document.getElementById("pane-right-placeholder").style.display = "flex";
  document.getElementById("pane-right-title").textContent = "Right View";
  document.getElementById("address-bar-input-right").value = "";
}

function initSplitResizer() {
  const divider = document.getElementById("split-divider");
  const paneLeft = document.getElementById("pane-left");
  const paneRight = document.getElementById("pane-right");
  const framesHolder = document.getElementById("frames-holder");
  
  let isDragging = false;
  
  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    divider.classList.add("dragging");
    
    // Add resizing overlay to prevent iframe from capturing mouse moves
    const overlay = document.createElement("div");
    overlay.className = "resizing-overlay";
    framesHolder.appendChild(overlay);
    
    const handleMouseMove = (moveEvent) => {
      if (!isDragging) return;
      
      const containerRect = framesHolder.getBoundingClientRect();
      const relativeX = moveEvent.clientX - containerRect.left;
      
      const minWidth = containerRect.width * 0.15;
      const maxWidth = containerRect.width * 0.85;
      
      let leftWidth = Math.max(minWidth, Math.min(relativeX, maxWidth));
      let rightWidth = containerRect.width - leftWidth - 6; // 6px divider width
      
      paneLeft.style.width = `${leftWidth}px`;
      paneRight.style.width = `${rightWidth}px`;
    };
    
    const handleMouseUp = () => {
      isDragging = false;
      divider.classList.remove("dragging");
      
      const overlay = framesHolder.querySelector(".resizing-overlay");
      if (overlay) overlay.remove();
      
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
}

function initPaneActiveEvents() {
  const paneLeft = document.getElementById("pane-left");
  const paneRight = document.getElementById("pane-right");
  
  paneLeft.addEventListener("click", () => {
    if (!appState.splitViewActive) return;
    if (appState.activeView !== "left") {
      setActivePane("left");
    }
  });
  
  paneRight.addEventListener("click", () => {
    if (!appState.splitViewActive) return;
    if (appState.activeView !== "right") {
      setActivePane("right");
    }
  });

  // Periodically check focus of dynamic iframes to capture active view focus automatically
  setInterval(() => {
    if (!appState.splitViewActive) return;
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === "IFRAME") {
      if (activeEl.closest("#pane-left-content")) {
        if (appState.activeView !== "left") {
          setActivePane("left");
        }
      } else if (activeEl.closest("#pane-right-content")) {
        if (appState.activeView !== "right") {
          setActivePane("right");
        }
      }
    }
  }, 150);
}

function setActivePane(pane) {
  appState.activeView = pane;
  
  const paneLeft = document.getElementById("pane-left");
  const paneRight = document.getElementById("pane-right");
  
  if (pane === "left") {
    paneLeft.classList.add("active-view-stroke");
    paneRight.classList.remove("active-view-stroke");
    appState.activeTabId = appState.leftTabId;
  } else {
    paneRight.classList.add("active-view-stroke");
    paneLeft.classList.remove("active-view-stroke");
    appState.activeTabId = appState.rightTabId;
  }
  
  renderSubSidebar();
  saveSessionState();
}

function initPaneDragDropEvents() {
  const paneLeft = document.getElementById("pane-left");
  const paneRight = document.getElementById("pane-right");

  [paneLeft, paneRight].forEach(pane => {
    const paneId = pane.id;
    const targetView = paneId === "pane-left" ? "left" : "right";

    pane.addEventListener("dragover", (e) => {
      if (draggedElement && draggedElement.classList.contains("tab-link-item")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        pane.classList.add("drag-over-pane");
      }
    });

    pane.addEventListener("dragenter", (e) => {
      if (draggedElement && draggedElement.classList.contains("tab-link-item")) {
        e.preventDefault();
        pane.classList.add("drag-over-pane");
      }
    });

    pane.addEventListener("dragleave", () => {
      pane.classList.remove("drag-over-pane");
    });

    pane.addEventListener("drop", async (e) => {
      e.preventDefault();
      pane.classList.remove("drag-over-pane");

      if (!draggedElement || !draggedElement.classList.contains("tab-link-item")) return;

      const tabId = draggedElement.getAttribute("data-tab-id");
      const tabObj = findTabById(tabId);
      if (tabObj) {
        if (targetView === "right" && !appState.splitViewActive) {
          toggleSplitView();
        }

        setActivePane(targetView);
        selectTab(tabId, tabObj.url);
        console.log(`Dropped tab ${tabId} into ${targetView} pane`);
      }
      
      draggedElement = null;
    });
  });
}

// ==================== EVENTS & HELPERS ====================

function registerEvents() {
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("btn-toggle-sub-sidebar")?.addEventListener("click", toggleSubSidebar);
  document.getElementById("btn-toggle-split-view")?.addEventListener("click", toggleSplitView);
  document.getElementById("btn-toggle-window-mode")?.addEventListener("click", handleWindowModeToggle);
  document.getElementById("btn-toggle-autohide")?.addEventListener("click", toggleAutohide);
  document.getElementById("btn-open-settings-modal")?.addEventListener("click", () => {
    if (typeof openSettingsModal === "function") openSettingsModal();
    else if (typeof openInfoModal === "function") openInfoModal();
  });
  document.getElementById("btn-open-info-modal")?.addEventListener("click", () => {
    if (typeof openSettingsModal === "function") openSettingsModal();
    else if (typeof openInfoModal === "function") openInfoModal();
  });

  // Manual Google Sheet Sync Button Handler
  document.getElementById("btn-sync-google-sheet")?.addEventListener("click", async () => {
    const syncBtn = document.getElementById("btn-sync-google-sheet");
    if (syncBtn) syncBtn.disabled = true;

    if (typeof syncGoogleSheetManual === "function") {
      await syncGoogleSheetManual((step, message) => {
        if (typeof updateSyncStatusUI === "function") {
          updateSyncStatusUI(step, message);
        }
        if (step === "success" || step === "error") {
          if (syncBtn) syncBtn.disabled = false;
        }
      });
    } else {
      if (syncBtn) syncBtn.disabled = false;
    }
  });

  const aiBtn = document.getElementById("btn-ai-multichat-group");
  if (aiBtn) {
    aiBtn.addEventListener("click", () => {
      selectMainGroup(SYSTEM_AI_GROUP_ID);
    });
  }

  // Global Modal Shortcuts: ENTER = Save/Submit, ESC = Cancel/Close (Active anywhere inside modal)
  window.addEventListener("keydown", (e) => {
    const mainModal = document.getElementById("main-group-modal");
    const subModal = document.getElementById("sub-group-modal");
    const tabModal = document.getElementById("tab-modal");
    const infoModal = document.getElementById("info-modal");
    const settingsModal = document.getElementById("settings-modal");

    // 1. ESC KEY -> Close active modal
    if (e.key === "Escape") {
      if (mainModal && mainModal.classList.contains("show")) closeModal("main-group-modal");
      else if (subModal && subModal.classList.contains("show")) closeModal("sub-group-modal");
      else if (tabModal && tabModal.classList.contains("show")) closeModal("tab-modal");
      else if (settingsModal && settingsModal.classList.contains("show")) closeModal("settings-modal");
      else if (infoModal && infoModal.classList.contains("show")) closeModal("info-modal");
      return;
    }

    // 2. ENTER KEY -> Save active modal regardless of element focus
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      if (mainModal && mainModal.classList.contains("show")) {
        e.preventDefault();
        if (typeof saveMainGroup === "function") saveMainGroup();
      } else if (subModal && subModal.classList.contains("show")) {
        e.preventDefault();
        if (typeof saveSubGroup === "function") saveSubGroup();
      } else if (tabModal && tabModal.classList.contains("show")) {
        e.preventDefault();
        const customPane = document.getElementById("tab-pane-custom");
        if (customPane && customPane.classList.contains("active")) {
          if (typeof saveTab === "function") saveTab();
        } else {
          if (typeof submitDefaultChannelsSetup === "function") submitDefaultChannelsSetup();
        }
      } else if (settingsModal && settingsModal.classList.contains("show")) {
        e.preventDefault();
        closeModal("settings-modal");
      } else if (infoModal && infoModal.classList.contains("show")) {
        e.preventDefault();
        closeModal("info-modal");
      }
    }
  });

  // Event Delegation for action buttons in sub-groups container (Column 2)
  // Note: modal open/save/close bindings are handled within each modal JS file
  document.getElementById("sub-groups-container")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    e.stopPropagation(); // Avoid triggering active tab selection on parent link click

    const action = btn.getAttribute("data-action");
    const subGroupId = btn.getAttribute("data-sub-group-id");
    const subGroupName = btn.getAttribute("data-sub-group-name");
    const tabId = btn.getAttribute("data-tab-id");
    const tabName = btn.getAttribute("data-tab-name");
    const tabUrl = btn.getAttribute("data-tab-url");

    if (action === "add-tab") {
      openAddTabModal(subGroupId);
    } else if (action === "edit-sub-group") {
      openEditSubGroupModal(subGroupId, subGroupName);
    } else if (action === "clone-sub-group") {
      cloneSubGroup(subGroupId);
    } else if (action === "delete-sub-group") {
      deleteSubGroup(subGroupId);
    } else if (action === "close-active-tab") {
      closeTabSession(tabId);
    } else if (action === "edit-tab") {
      openEditTabModal(subGroupId, tabId, tabName, tabUrl);
    } else if (action === "clone-tab") {
      cloneTab(subGroupId, tabId);
    } else if (action === "delete-tab") {
      deleteTab(subGroupId, tabId);
    }
  });

  // Address Bar Controls (Left Pane)
  document.getElementById("btn-reload-left")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (appState.leftTabId) {
      const wrapper = document.getElementById(`wrapper-left-${appState.leftTabId}`);
      if (wrapper) {
        const activeTab = findTabById(appState.leftTabId);
        const url = activeTab ? activeTab.url : wrapper.querySelector("iframe")?.src;
        if (url) {
          wrapper.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.setAttribute("allow", "geolocation; microphone; camera; midi; encrypted-media; clipboard-write; clipboard-read");
          iframe.src = url;
          wrapper.appendChild(iframe);
          console.log(`Re-created left iframe node for tab: ${appState.leftTabId}`);
        }
      }
    }
  });

  document.getElementById("btn-open-external-left")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (appState.leftTabId) {
      const activeTab = findTabById(appState.leftTabId);
      if (activeTab && activeTab.url) {
        window.open(activeTab.url, "_blank");
      }
    }
  });

  // Address Bar Controls (Right Pane)
  document.getElementById("btn-reload-right")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (appState.rightTabId) {
      const wrapper = document.getElementById(`wrapper-right-${appState.rightTabId}`);
      if (wrapper) {
        const activeTab = findTabById(appState.rightTabId);
        const url = (activeTab && activeTab.urlRight) ? activeTab.urlRight : wrapper.querySelector("iframe")?.src;
        if (url) {
          wrapper.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.setAttribute("allow", "geolocation; microphone; camera; midi; encrypted-media; clipboard-write; clipboard-read");
          iframe.src = url;
          wrapper.appendChild(iframe);
          console.log(`Re-created right iframe node for tab: ${appState.rightTabId}`);
        }
      }
    }
  });

  document.getElementById("btn-open-external-right")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (appState.rightTabId) {
      const activeTab = findTabById(appState.rightTabId);
      if (activeTab && activeTab.url) {
        window.open(activeTab.url, "_blank");
      }
    }
  });

  // Gắn sự kiện lắng nghe chỉnh sửa địa chỉ trực tiếp trên address bar (Enter và blur)
  const addAddressBarListeners = (side) => {
    const inputEl = document.getElementById(`address-bar-input-${side}`);
    if (!inputEl) return;

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddressBarSubmit(side);
        inputEl.blur();
      }
    });

    inputEl.addEventListener("blur", () => {
      handleAddressBarSubmit(side);
    });
  };

  addAddressBarListeners("left");
  addAddressBarListeners("right");
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("show");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
}

// renderEmojiSelector moved to modals/main-group.js

// Global Exports (Exposing strictly required helper functions)
window.openModal = openModal;
window.closeModal = closeModal;

// Listen for subframe audio playback events via postMessage
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "MAX_AUDIO_STATE") {
    const isAudible = !!event.data.isAudible;
    const tabId = event.data.tabId;
    const frameUrl = event.data.url;

    let targetTab = null;
    if (tabId) {
      targetTab = findTabById(tabId);
    }
    if (!targetTab && frameUrl) {
      targetTab = findTabByFrameUrl(frameUrl);
    }

    if (targetTab) {
      const hasLeftWrapper = !!document.getElementById(`wrapper-left-${targetTab.id}`);
      const hasRightWrapper = !!document.getElementById(`wrapper-right-${targetTab.id}`);
      const effectiveAudible = (hasLeftWrapper || hasRightWrapper) ? isAudible : false;

      if (targetTab.isAudible !== effectiveAudible) {
        targetTab.isAudible = effectiveAudible;
        updateTabAudioIconUI(targetTab.id, effectiveAudible);
      }
    }
  }
});

function findTabByFrameUrl(url) {
  if (!url) return null;
  const cleanUrl = url.toLowerCase();
  for (const mainGroup of appState.hierarchy) {
    for (const subGroup of mainGroup.subGroups) {
      const tab = subGroup.tabs.find(t => {
        if (!t.url) return false;
        try {
          const h1 = new URL(t.url).hostname.replace(/^www\./, "").toLowerCase();
          const h2 = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
          return h1 === h2 || h1.includes(h2) || h2.includes(h1);
        } catch (e) {
          return cleanUrl.includes(t.url.toLowerCase()) || t.url.toLowerCase().includes(cleanUrl);
        }
      });
      if (tab) return tab;
    }
  }
  return null;
}

function updateTabAudioIconUI(tabId, isAudible) {
  const tabEl = document.querySelector(`.tab-link-item[data-tab-id="${tabId}"]`);
  if (tabEl) {
    const actionsEl = tabEl.querySelector(".tab-actions");
    let soundIcon = tabEl.querySelector(".tab-sound-icon");

    if (isAudible) {
      if (!soundIcon) {
        soundIcon = document.createElement("span");
        soundIcon.className = "tab-sound-icon";
        soundIcon.title = "Audio Playing";
        if (actionsEl) {
          tabEl.insertBefore(soundIcon, actionsEl);
        } else {
          tabEl.appendChild(soundIcon);
        }
      }
      soundIcon.style.display = "inline-block";
    } else {
      if (soundIcon) soundIcon.style.display = "none";
    }
  }

  // Also update Column 1 Main Group sound badge
  renderMainSidebar();
}

// Helper to manually test audio icon in browser console
window.testAudioState = function(tabId, isAudible = true) {
  const tabObj = findTabById(tabId);
  if (tabObj) {
    tabObj.isAudible = isAudible;
    updateTabAudioIconUI(tabId, isAudible);
    console.log(`Updated audio state for tab ${tabId} (${tabObj.name}): ${isAudible}`);
  } else {
    console.warn(`Tab ID ${tabId} not found.`);
  }
};

// Listen for message from background.js/content.js to detect iframe navigation errors & details
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "IFRAME_LOAD_ERROR") {
    handleIframeLoadError(message.url);
  } else if (message.type === "FAVICON_DETECTED") {
    handleFaviconDetected(message.url, message.faviconUrl);
  } else if (message.type === "IFRAME_NAVIGATED") {
    handleIframeNavigated(message.frameId, message.url);
  } else if (message.type === "SUBFRAME_URL_CHANGED" && sender && typeof sender.frameId !== "undefined") {
    handleIframeNavigated(sender.frameId, message.url);
  }
});

async function handleFaviconDetected(url, faviconUrl) {
  let foundTab = null;
  for (const mainGroup of appState.hierarchy) {
    for (const subGroup of mainGroup.subGroups) {
      const tab = subGroup.tabs.find(t => {
        if (!t.url) return false;
        try {
          return new URL(t.url).hostname === new URL(url).hostname;
        } catch (e) {
          return t.url.includes(url) || url.includes(t.url);
        }
      });
      if (tab) {
        foundTab = tab;
        break;
      }
    }
  }

  // Only auto-update custom tab favicons, skip the default websites to preserve high-quality icons
  const isDefaultTab = (foundTab && typeof DEFAULT_CHANNELS_LIST !== "undefined" && DEFAULT_CHANNELS_LIST.some(d => foundTab.id.startsWith(d.id))) || 
                       (foundTab?.url && (foundTab.url.includes("discord.com") || foundTab.url.includes("telegram.org") || foundTab.url.includes("slack.com") || foundTab.url.includes("larksuite.com") || foundTab.url.includes("teams.live.com") || foundTab.url.includes("whatsapp.com") || foundTab.url.includes("viber.com")));

  if (foundTab && !isDefaultTab && foundTab.customFavicon !== faviconUrl) {
    foundTab.customFavicon = faviconUrl;
    await saveHierarchyToStorage();
    
    // Dynamically update the DOM image src to prevent flashing UI due to full re-render
    const imgEl = document.querySelector(`[data-tab-id="${foundTab.id}"] img.tab-favicon`);
    if (imgEl) {
      imgEl.src = faviconUrl;
      imgEl.style.display = "inline-block";
      const fallbackSpan = imgEl.nextElementSibling;
      if (fallbackSpan && fallbackSpan.tagName === "SPAN") {
        fallbackSpan.style.display = "none";
      }
    }
  }
}

function handleIframeLoadError(url) {
  let foundTab = null;
  for (const mainGroup of appState.hierarchy) {
    for (const subGroup of mainGroup.subGroups) {
      const tab = subGroup.tabs.find(t => {
        if (!t.url) return false;
        try {
          return new URL(t.url).hostname === new URL(url).hostname;
        } catch (e) {
          return t.url.includes(url) || url.includes(t.url);
        }
      });
      if (tab) {
        foundTab = tab;
        break;
      }
    }
  }

  if (foundTab) {
    foundTab.hasError = true;
    
    // Instantly highlight the tab title in red in the DOM
    const tabEl = document.querySelector(`[data-tab-id="${foundTab.id}"]`);
    if (tabEl) {
      tabEl.classList.add("connection-error");
      tabEl.setAttribute("title", "Connection failed or page blocked");
    }
  }
}

// Global Event Listener for Favicon error handling (to bypass CSP inline error restriction)
document.addEventListener("error", (e) => {
  if (e.target && e.target.tagName === "IMG" && e.target.classList.contains("tab-favicon")) {
    e.target.style.display = "none";
    const fallbackEl = e.target.nextElementSibling;
    if (fallbackEl) {
      fallbackEl.style.display = "inline-block";
    }
  }
}, true); // Use capture phase because image error event does not bubble

// Hàm định tuyến và cập nhật URL cho Address Bar (pane-address-container) khi iframe chuyển hướng
function handleIframeNavigated(frameId, url) {
  // 1. Kiểm tra xem frameId đã được map vào pane nào chưa
  if (paneFrameIdMap.left === frameId) {
    const inputLeft = document.getElementById("address-bar-input-left");
    if (inputLeft && inputLeft.value !== url) {
      inputLeft.value = url;
    }
    return;
  }
  if (paneFrameIdMap.right === frameId) {
    const inputRight = document.getElementById("address-bar-input-right");
    if (inputRight && inputRight.value !== url) {
      inputRight.value = url;
    }
    return;
  }

  // 2. Nếu chưa được map (lần đầu tiên load của frame mới)
  const leftTab = findTabById(appState.leftTabId);
  const rightTab = findTabById(appState.rightTabId);

  const getDomain = (u) => {
    try { 
      return new URL(u).hostname.replace("www.", "").toLowerCase(); 
    } catch (e) { 
      return ""; 
    }
  };

  const targetDomain = getDomain(url);
  if (!targetDomain) return;

  const leftDomain = leftTab ? getDomain(leftTab.url) : "";
  const rightDomain = rightTab ? getDomain(rightTab.url) : "";

  if (leftDomain && (targetDomain.includes(leftDomain) || leftDomain.includes(targetDomain))) {
    paneFrameIdMap.left = frameId;
    const inputLeft = document.getElementById("address-bar-input-left");
    if (inputLeft) inputLeft.value = url;
  } else if (rightDomain && (targetDomain.includes(rightDomain) || rightDomain.includes(targetDomain))) {
    paneFrameIdMap.right = frameId;
    const inputRight = document.getElementById("address-bar-input-right");
    if (inputRight) inputRight.value = url;
  }
}

// Đồng bộ thuộc tính openExternal của các tab đã lưu trong Storage với file channels.csv mới nhất
function syncExistingTabsWithCSV() {
  let changed = false;
  appState.hierarchy.forEach(mainGroup => {
    if (mainGroup.subGroups) {
      mainGroup.subGroups.forEach(subGroup => {
        if (subGroup.tabs) {
          subGroup.tabs.forEach(tab => {
            const defaultTab = DEFAULT_CHANNELS_LIST.find(dt => {
              try {
                const dtHost = new URL(dt.url).hostname.replace("www.", "").toLowerCase();
                const tHost = new URL(tab.url).hostname.replace("www.", "").toLowerCase();
                return dtHost === tHost;
              } catch (e) {
                return tab.url.includes(dt.url) || dt.url.includes(tab.url);
              }
            });
            
            if (defaultTab) {
              const shouldBeExternal = !!defaultTab.openExternal;
              if (tab.openExternal !== shouldBeExternal) {
                tab.openExternal = shouldBeExternal;
                changed = true;
                console.log(`Synced tab "${tab.name}" openExternal property to: ${shouldBeExternal}`);
              }
            }
          });
        }
      });
    }
  });
  
  if (changed) {
    saveHierarchyToStorage();
  }
}



