// Google Sheet Realtime Sync Engine for MAX - Multi Chat
// Handles daily automatic background sync and manual sync with real-time status reporting.

window.GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyEqMN2Yw6Pdd5O8_Jey46yeJxmKHvCaDi-wnsKE4HCNz0duJ9yPn0T5hLJ9HPbo8AERw/exec";

/**
 * Validates and converts Google Sheet JSON payload into extension storage structure.
 * Implements Atomic Swap: only returns converted hierarchy/models if validation passes 100%.
 */
function parseSheetPayload(jsonData) {
  if (!jsonData || jsonData.status !== "success") {
    throw new Error(jsonData?.message || "Invalid JSON payload structure returned from Google Sheet.");
  }

  const rawChannels = Array.isArray(jsonData.channels) ? jsonData.channels : [];
  const rawAiModels = Array.isArray(jsonData.ai_models) ? jsonData.ai_models : [];

  if (rawChannels.length === 0 && rawAiModels.length === 0) {
    throw new Error("Google Sheet returned empty Channels and AI Models list.");
  }

  // 1. Build defaultChannelsList from rawChannels (for Default Channels library selection)
  const defaultChannelsList = [];
  const tagsMap = {};

  rawChannels.forEach(item => {
    const tabName = (item.tab_name || "").trim();
    const tabUrl1 = (item.tab_url_1 || "").trim();

    if (!tabName || !tabUrl1) return;

    const iconStr1 = (item.custom_favicon_1 || "").trim();
    const parsedFavicon1 = window.parseCustomFaviconString ? window.parseCustomFaviconString(iconStr1) : { isText: false, customFavicon: iconStr1 };

    const openExt1 = String(item.open_external_1 || "").trim().toLowerCase();
    const isDual1 = String(item.is_dual_acc_1 || "").trim().toLowerCase();

    let tagsStr = (item.tags || "").trim();
    const defaultGroup = (item.main_group || "").trim();
    if (!tagsStr && defaultGroup) {
      tagsStr = defaultGroup;
    }
    const tagsArr = tagsStr.split(";").map(t => t.trim()).filter(Boolean);

    const channelObj = {
      id: "tab_" + tabName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      name: tabName,
      url: tabUrl1,
      customFavicon: parsedFavicon1.customFavicon,
      main_group: defaultGroup,
      main_group_icon: (item.main_group_icon || "").trim(),
      sub_group: (item.sub_group || "").trim(),
      defaultGroup: defaultGroup,
      openExternal: openExt1 === "true" || openExt1 === "x" || openExt1 === "1",
      isDualAcc: isDual1 === "true" || isDual1 === "x" || isDual1 === "1",
      tags: tagsArr
    };

    if (parsedFavicon1.isText) {
      channelObj.iconType = "text";
      channelObj.iconText = parsedFavicon1.iconText;
      channelObj.iconBgColor = parsedFavicon1.iconBgColor;
    }

    const tabUrl2 = (item.tab_url_2 || "").trim();
    if (tabUrl2) {
      channelObj.isSplit = true;
      channelObj.urlRight = tabUrl2;
      const iconStr2 = (item.custom_favicon_2 || "").trim();
      const parsedFavicon2 = window.parseCustomFaviconString ? window.parseCustomFaviconString(iconStr2) : { isText: false, customFavicon: iconStr2 };
      if (parsedFavicon2.isText) {
        channelObj.iconTypeRight = "text";
        channelObj.iconTextRight = parsedFavicon2.iconText;
        channelObj.iconBgColorRight = parsedFavicon2.iconBgColor;
      } else if (parsedFavicon2.customFavicon) {
        channelObj.customFaviconRight = parsedFavicon2.customFavicon;
      }
      const openExt2 = String(item.open_external_2 || "").trim().toLowerCase();
      const isDual2 = String(item.is_dual_acc_2 || "").trim().toLowerCase();
      channelObj.openExternalRight = openExt2 === "true" || openExt2 === "x" || openExt2 === "1";
      if (isDual2 === "true" || isDual2 === "x" || isDual2 === "1") {
        channelObj.isDualAccRight = true;
      }
    }

    defaultChannelsList.push(channelObj);

    tagsArr.forEach(tag => {
      if (!tagsMap[tag]) tagsMap[tag] = [];
      tagsMap[tag].push(channelObj);
    });
  });

  // 2. Build ai_models array
  const aiModels = rawAiModels.map(m => ({
    id: m.id,
    name: m.name || m.id,
    url: m.url,
    icon: m.icon || "",
    active: String(m.active).trim().toUpperCase() === "TRUE" || String(m.active).trim() === "1" || m.active === true,
    description: m.description || ""
  }));

  return { defaultChannelsList, tagsMap, aiModels };
}

/**
 * Performs manual sync triggered by user click in Settings.
 * Calls statusCallback(step, message) to report progress in real-time.
 */
async function syncGoogleSheetManual(statusCallback) {
  const url = window.GOOGLE_SHEET_WEB_APP_URL ? window.GOOGLE_SHEET_WEB_APP_URL.trim() : "";
  if (!url) {
    if (statusCallback) statusCallback("error", "Google Sheet Web App API URL has not been configured yet.");
    return false;
  }

  try {
    if (statusCallback) statusCallback("connecting", "Connecting to Google Sheet Web App...");

    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    if (statusCallback) statusCallback("downloading", "Downloading and validating data...");
    const rawText = await response.text();

    let jsonData;
    try {
      jsonData = JSON.parse(rawText);
    } catch (parseErr) {
      if (rawText.trim().startsWith("<")) {
        throw new Error("Google Web App returned HTML instead of JSON. Please ensure 'Who has access' is set to 'Anyone' in Web App deployment.");
      }
      throw new Error("Invalid JSON data format returned from Google Sheet.");
    }

    // Atomic Swap Validation
    const { defaultChannelsList, tagsMap, aiModels } = parseSheetPayload(jsonData);

    // Apply Default Channels atomically to storage and global variables
    if (defaultChannelsList.length > 0) {
      window.DEFAULT_CHANNELS_LIST = defaultChannelsList;
      window.defaultChannelsByTag = tagsMap;
      window.defaultTagsList = Object.keys(tagsMap).sort();
      await chrome.storage.local.set({ "default_channels": defaultChannelsList });
    }

    if (aiModels.length > 0) {
      if (typeof appState !== "undefined") {
        appState.aiModels = aiModels;
      }
      await chrome.storage.local.set({ "ai_models": aiModels });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const channelsCount = defaultChannelsList.length;
    const modelsCount = aiModels.length;

    await chrome.storage.local.set({
      "last_google_sheet_sync_date": todayStr,
      "last_google_sheet_sync_channels_count": channelsCount,
      "last_google_sheet_sync_models_count": modelsCount
    });

    const resultMsg = `Successfully updated on ${todayStr}\n(${channelsCount} Default Channels, ${modelsCount} AI Models)`;
    if (statusCallback) statusCallback("success", resultMsg);
    return true;
  } catch (err) {
    console.error("Google Sheet Sync Error:", err);
    if (statusCallback) statusCallback("error", `Sync failed: ${err.message}`);
    return false;
  }
}

/**
 * Helper to update status element in Settings modal UI
 */
function updateSyncStatusUI(step, message) {
  const statusEl = document.getElementById("google-sheet-sync-status");
  if (!statusEl) return;
  statusEl.style.display = "block";
  statusEl.style.backgroundColor = "transparent";
  statusEl.style.border = "none";
  statusEl.style.padding = "0";
  statusEl.style.whiteSpace = "pre-line";

  if (step === "connecting") {
    statusEl.style.color = "#60a5fa";
    statusEl.textContent = message;
  } else if (step === "downloading") {
    statusEl.style.color = "#facc15";
    statusEl.textContent = message;
  } else if (step === "success") {
    statusEl.style.color = "#4ade80";
    statusEl.textContent = message;
  } else if (step === "error") {
    statusEl.style.color = "#f87171";
    statusEl.textContent = message;
  }
}

/**
 * Daily Background Sync Check
 * Runs automatically on startup once per day without interrupting user flow.
 */
async function checkAndSyncGoogleSheetDaily() {
  const url = window.GOOGLE_SHEET_WEB_APP_URL ? window.GOOGLE_SHEET_WEB_APP_URL.trim() : "";
  if (!url) return;

  const data = await chrome.storage.local.get([
    "last_google_sheet_sync_date",
    "last_google_sheet_sync_channels_count",
    "last_google_sheet_sync_models_count"
  ]);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (data.last_google_sheet_sync_date === todayStr) {
    console.log("Google Sheet data is already up-to-date for today:", todayStr);
    const channelsCount = data.last_google_sheet_sync_channels_count || (window.DEFAULT_CHANNELS_LIST ? window.DEFAULT_CHANNELS_LIST.length : 0);
    const modelsCount = data.last_google_sheet_sync_models_count || (typeof appState !== "undefined" && appState.aiModels ? appState.aiModels.length : 0);
    const successMsg = `Successfully updated on ${todayStr}\n(${channelsCount} Default Channels, ${modelsCount} AI Models)`;
    updateSyncStatusUI("success", successMsg);
    return;
  }

  console.log("Starting daily background sync from Google Sheet...");
  await syncGoogleSheetManual((step, msg) => {
    console.log(`[Google Sheet Daily Sync] ${step}: ${msg}`);
    updateSyncStatusUI(step, msg);
  });
}

window.updateSyncStatusUI = updateSyncStatusUI;
window.syncGoogleSheetManual = syncGoogleSheetManual;
window.checkAndSyncGoogleSheetDaily = checkAndSyncGoogleSheetDaily;
