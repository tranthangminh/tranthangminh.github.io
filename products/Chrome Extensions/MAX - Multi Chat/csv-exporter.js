// CSV Exporter Utility for MAX Multi Chat
// Flattens appState.hierarchy and exports to standardized UTF-8 BOM CSV format.

function escapeCSVField(str) {
  if (str === null || str === undefined) return "";
  const stringified = String(str);
  if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n") || stringified.includes("\r")) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

function exportHierarchyToCSV() {
  if (typeof appState === "undefined" || !appState.hierarchy || appState.hierarchy.length === 0) {
    alert("No channel list available to export.");
    return;
  }

  // Header row matching standard specification (12 columns)
  const headers = [
    "main_group",
    "main_group_icon",
    "sub_group",
    "tab_name",
    "tab_url_1",
    "custom_favicon_1",
    "open_external_1",
    "is_dual_acc_1",
    "tab_url_2",
    "custom_favicon_2",
    "open_external_2",
    "is_dual_acc_2"
  ];

  const csvRows = [headers.join(",")];

  appState.hierarchy.forEach(mainGroup => {
    const mainName = mainGroup.name || "";
    const mainIcon = mainGroup.icon || "";

    if (mainGroup.subGroups && Array.isArray(mainGroup.subGroups)) {
      mainGroup.subGroups.forEach(subGroup => {
        const subName = subGroup.name || "Channels";
        if (subGroup.tabs && Array.isArray(subGroup.tabs)) {
          subGroup.tabs.forEach(tab => {
            const favicon1Export = window.encodeCustomFavicon ? window.encodeCustomFavicon(tab.iconType, tab.customFavicon, tab.iconText, tab.iconBgColor) : (tab.customFavicon || "");
            const favicon2Export = window.encodeCustomFavicon ? window.encodeCustomFavicon(tab.iconTypeRight, tab.customFaviconRight, tab.iconTextRight, tab.iconBgColorRight) : (tab.customFaviconRight || "");
            const row = [
              escapeCSVField(mainName),
              escapeCSVField(mainIcon),
              escapeCSVField(subName),
              escapeCSVField(tab.name || ""),
              escapeCSVField(tab.url || ""),
              escapeCSVField(favicon1Export),
              escapeCSVField(tab.openExternal ? "true" : "false"),
              escapeCSVField(tab.isDualAcc ? "true" : "false"),
              escapeCSVField(tab.urlRight || ""),
              escapeCSVField(favicon2Export),
              escapeCSVField(tab.openExternalRight ? "true" : "false"),
              escapeCSVField(tab.isDualAccRight ? "true" : "false")
            ];
            csvRows.push(row.join(","));
          });
        }
      });
    }
  });

  const csvString = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `MAX_Multi_Chat_Backup_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCSVRow(rowStr) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      if (inQuotes && rowStr[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function importHierarchyFromCSV(csvText) {
  if (!csvText || typeof csvText !== "string") return;

  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length <= 1) {
    alert("File CSV không có dữ liệu!");
    return;
  }

  const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());

  const mainGroupIdx = headers.indexOf("main_group");
  const mainGroupIconIdx = headers.indexOf("main_group_icon");
  const subGroupIdx = headers.indexOf("sub_group");
  const tabNameIdx = headers.indexOf("tab_name");
  const tabUrl1Idx = headers.indexOf("tab_url_1");
  const customFavicon1Idx = headers.indexOf("custom_favicon_1");
  const openExternal1Idx = headers.indexOf("open_external_1");
  const isDualAcc1Idx = headers.indexOf("is_dual_acc_1");

  const tabUrl2Idx = headers.indexOf("tab_url_2");
  const customFavicon2Idx = headers.indexOf("custom_favicon_2");
  const openExternal2Idx = headers.indexOf("open_external_2");
  const isDualAcc2Idx = headers.indexOf("is_dual_acc_2");

  if (tabNameIdx === -1 || tabUrl1Idx === -1) {
    alert("Cấu trúc file CSV không hợp lệ (thiếu cột tab_name hoặc tab_url_1)!");
    return;
  }

  const mainGroupsMap = {};
  const importedHierarchy = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length >= 2) {
      const mainName = mainGroupIdx !== -1 && cols[mainGroupIdx] ? cols[mainGroupIdx].trim() : "Channels";
      const mainIcon = mainGroupIconIdx !== -1 && cols[mainGroupIconIdx] ? cols[mainGroupIconIdx].trim() : "Folder";
      const subName = subGroupIdx !== -1 && cols[subGroupIdx] ? cols[subGroupIdx].trim() : "Channels";
      const tabName = cols[tabNameIdx] ? cols[tabNameIdx].trim() : "";
      const tabUrl = cols[tabUrl1Idx] ? cols[tabUrl1Idx].trim() : "";
      const customFavicon = customFavicon1Idx !== -1 && cols[customFavicon1Idx] ? cols[customFavicon1Idx].trim() : "";
      const openExtVal = openExternal1Idx !== -1 && cols[openExternal1Idx] ? cols[openExternal1Idx].trim().toLowerCase() : "";
      const openExternal = openExtVal === "true" || openExtVal === "x" || openExtVal === "1";
      const isDualAcc1Val = isDualAcc1Idx !== -1 && cols[isDualAcc1Idx] ? cols[isDualAcc1Idx].trim().toLowerCase() : "";
      const isDualAcc1 = isDualAcc1Val === "true" || isDualAcc1Val === "x" || isDualAcc1Val === "1";

      const tabUrl2 = tabUrl2Idx !== -1 && cols[tabUrl2Idx] ? cols[tabUrl2Idx].trim() : "";
      const customFavicon2 = customFavicon2Idx !== -1 && cols[customFavicon2Idx] ? cols[customFavicon2Idx].trim() : "";
      const openExt2Val = openExternal2Idx !== -1 && cols[openExternal2Idx] ? cols[openExternal2Idx].trim().toLowerCase() : "";
      const openExternal2 = openExt2Val === "true" || openExt2Val === "x" || openExt2Val === "1";
      const isDualAcc2Val = isDualAcc2Idx !== -1 && cols[isDualAcc2Idx] ? cols[isDualAcc2Idx].trim().toLowerCase() : "";
      const isDualAcc2 = isDualAcc2Val === "true" || isDualAcc2Val === "x" || isDualAcc2Val === "1";

      const isSplit = !!tabUrl2;

      if (!tabName || !tabUrl) continue;

      const mainGroupId = "main_" + (mainName ? mainName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "general");

      if (!mainGroupsMap[mainGroupId]) {
        const newMain = {
          id: mainGroupId,
          name: mainName || "Channels",
          icon: mainIcon || "Folder",
          subGroups: []
        };
        mainGroupsMap[mainGroupId] = newMain;
        importedHierarchy.push(newMain);
      }

      const mainGroupObj = mainGroupsMap[mainGroupId];
      let subGroupObj = mainGroupObj.subGroups.find(s => s.name === subName);
      if (!subGroupObj) {
        const subGroupId = "sub_" + mainGroupId.replace("main_", "") + "_" + (subName ? subName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "default");
        subGroupObj = {
          id: subGroupId,
          name: subName || "Channels",
          tabs: []
        };
        mainGroupObj.subGroups.push(subGroupObj);
      }

      const parsedFavicon1 = window.parseCustomFaviconString ? window.parseCustomFaviconString(customFavicon) : { isText: false, customFavicon: customFavicon };
      const tabObj = {
        id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
        name: tabName,
        url: tabUrl,
        customFavicon: parsedFavicon1.customFavicon,
        openExternal: openExternal
      };
      if (parsedFavicon1.isText) {
        tabObj.iconType = "text";
        tabObj.iconText = parsedFavicon1.iconText;
        tabObj.iconBgColor = parsedFavicon1.iconBgColor;
      }

      if (isDualAcc1) {
        tabObj.isDualAcc = true;
      }

      if (isSplit) {
        tabObj.isSplit = true;
        tabObj.urlRight = tabUrl2 || tabUrl;
        const parsedFavicon2 = window.parseCustomFaviconString ? window.parseCustomFaviconString(customFavicon2) : { isText: false, customFavicon: customFavicon2 };
        if (parsedFavicon2.isText) {
          tabObj.iconTypeRight = "text";
          tabObj.iconTextRight = parsedFavicon2.iconText;
          tabObj.iconBgColorRight = parsedFavicon2.iconBgColor;
        } else if (parsedFavicon2.customFavicon) {
          tabObj.customFaviconRight = parsedFavicon2.customFavicon;
        }
        tabObj.openExternalRight = openExternal2;
        if (isDualAcc2) tabObj.isDualAccRight = true;
      }

      subGroupObj.tabs.push(tabObj);
    }
  }

  if (importedHierarchy.length === 0) {
    alert("Không tìm thấy kênh hợp lệ nào trong file CSV!");
    return;
  }

  const SYSTEM_AI_ID = typeof SYSTEM_AI_GROUP_ID !== "undefined" ? SYSTEM_AI_GROUP_ID : "main_ai_multichat";
  const existingAIGroup = typeof appState !== "undefined" && appState.hierarchy ? appState.hierarchy.find(g => g.id === SYSTEM_AI_ID) : null;

  appState.hierarchy = importedHierarchy;
  if (existingAIGroup && !appState.hierarchy.some(g => g.id === SYSTEM_AI_ID)) {
    appState.hierarchy.unshift(existingAIGroup);
  }

  if (typeof ensureSystemAIGroup === "function") ensureSystemAIGroup();

  if (appState.hierarchy.length > 0) {
    appState.activeMainGroupId = appState.hierarchy[0].id;
  }

  if (typeof saveHierarchyToStorage === "function") saveHierarchyToStorage();
  if (typeof saveSessionState === "function") saveSessionState();
  if (typeof renderMainSidebar === "function") renderMainSidebar();
  if (typeof renderSubSidebar === "function") renderSubSidebar();

  alert(`Đã khôi phục thành công danh sách kênh từ file sao lưu! 🚀`);
}

function triggerCSVImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvContent = evt.target.result;
      importHierarchyFromCSV(csvContent);
    };
    reader.readAsText(file, "UTF-8");
  };
  input.click();
}

window.exportHierarchyToCSV = exportHierarchyToCSV;
window.importHierarchyFromCSV = importHierarchyFromCSV;
window.triggerCSVImport = triggerCSVImport;
