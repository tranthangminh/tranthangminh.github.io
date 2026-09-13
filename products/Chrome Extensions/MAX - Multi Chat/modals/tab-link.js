// Custom Tab Link Modal actions (Add/Edit Custom Tab Web Link & Default Channels selection)

// State variables for Default Channels tab selection
let activeSetupTag = null;
const selectedSetupChannelIds = new Set();

function getContrastColor(hexColor) {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 186) ? "#111827" : "#ffffff";
}

function updateIconPreviewForSide(side) {
  const isLeft = side === "left";
  const radioSel = isLeft ? 'input[name="tab-icon-type"]:checked' : 'input[name="tab-icon-type-right"]:checked';
  const radioEl = document.querySelector(radioSel);
  const iconType = radioEl ? radioEl.value : "favicon";
  
  const previewAvatar = document.getElementById(isLeft ? "icon-preview-avatar" : "icon-preview-avatar-right");
  if (!previewAvatar) return;

  if (iconType === "favicon") {
    document.getElementById(isLeft ? "custom-icon-inputs" : "custom-icon-inputs-right").classList.add("hidden");
    const urlVal = document.getElementById(isLeft ? "tab-url" : "tab-url-right").value.trim();
    const tabName = document.getElementById("tab-name").value.trim();
    
    const tempTab = { url: urlVal, name: tabName };
    const faviconUrl = getTabFaviconUrl(tempTab);
    
    previewAvatar.innerHTML = "";
    const faviconImg = document.createElement("img");
    faviconImg.src = faviconUrl;
    const fallbackSpan = document.createElement("span");
    fallbackSpan.className = "tab-favicon";
    fallbackSpan.textContent = "🌐";
    fallbackSpan.style.cssText = "display:none; margin-right:0;";
    faviconImg.addEventListener("error", () => {
      faviconImg.style.display = "none";
      fallbackSpan.style.display = "inline-block";
    });
    previewAvatar.appendChild(faviconImg);
    previewAvatar.appendChild(fallbackSpan);
    previewAvatar.style.backgroundColor = "transparent";
    previewAvatar.style.color = "inherit";
    previewAvatar.style.border = "none";
  } else {
    document.getElementById(isLeft ? "custom-icon-inputs" : "custom-icon-inputs-right").classList.remove("hidden");
    const nameVal = document.getElementById("tab-name").value.trim();
    const textInputId = isLeft ? "tab-icon-text" : "tab-icon-text-right";
    const textVal = document.getElementById(textInputId).value.trim().substring(0, 15) || nameVal.substring(0, 15).toUpperCase() || (isLeft ? "L" : "R");
    
    const bgInputId = isLeft ? "tab-icon-bg" : "tab-icon-bg-right";
    const bgVal = document.getElementById(bgInputId).value || "#6366f1";
    const textCol = getContrastColor(bgVal);

    previewAvatar.innerHTML = "";
    previewAvatar.textContent = textVal;
    previewAvatar.style.backgroundColor = bgVal;
    previewAvatar.style.color = textCol;
    previewAvatar.style.border = "1.5px solid rgba(255, 255, 255, 0.2)";

    const len = textVal.length;
    if (len > 10) {
      previewAvatar.style.fontSize = "7.5px";
      previewAvatar.style.lineHeight = "1.05";
    } else if (len > 6) {
      previewAvatar.style.fontSize = "8.5px";
      previewAvatar.style.lineHeight = "1.1";
    } else if (len > 3) {
      previewAvatar.style.fontSize = "10px";
      previewAvatar.style.lineHeight = "1.15";
    } else {
      previewAvatar.style.fontSize = "12px";
      previewAvatar.style.lineHeight = "1.2";
    }
  }
}

function updateIconPreview() {
  updateIconPreviewForSide("left");
  updateIconPreviewForSide("right");
}

function toggleSplitLinkForm(isSplit) {
  const modal = document.getElementById("tab-modal");
  const colRight = document.getElementById("split-col-right");
  const divider = document.getElementById("split-form-divider");
  const titleLeft = document.getElementById("col-title-left");
  const isSplitCheckbox = document.getElementById("tab-is-split");
  
  if (isSplitCheckbox) isSplitCheckbox.checked = isSplit;

  if (isSplit) {
    modal.classList.add("split-active-modal");
    if (colRight) colRight.style.display = "flex";
    if (divider) divider.style.display = "block";
    if (titleLeft) titleLeft.style.display = "block";
  } else {
    modal.classList.remove("split-active-modal");
    if (colRight) colRight.style.display = "none";
    if (divider) divider.style.display = "none";
    if (titleLeft) titleLeft.style.display = "none";
  }
  updateIconPreview();
}

// Hàm chuyển đổi tab trong modal
function switchModalTab(targetPaneId) {
  // Active/deactive các tab button
  document.querySelectorAll(".modal-tab-btn").forEach(btn => {
    if (btn.getAttribute("data-target") === targetPaneId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Ẩn/hiện các pane
  document.querySelectorAll(".modal-pane").forEach(pane => {
    if (pane.id === targetPaneId) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });

  // Ẩn/hiện nút submit tương ứng dưới footer
  const saveBtn = document.getElementById("save-tab-btn");
  const submitSetupBtn = document.getElementById("btn-submit-setup");
  const leftActions = document.getElementById("footer-left-actions");
  
  if (targetPaneId === "tab-pane-custom") {
    if (saveBtn) saveBtn.style.display = "inline-block";
    if (submitSetupBtn) submitSetupBtn.style.display = "none";
    if (leftActions) leftActions.style.display = "none";
  } else {
    if (saveBtn) saveBtn.style.display = "none";
    if (submitSetupBtn) submitSetupBtn.style.display = "inline-block";
    if (leftActions) leftActions.style.display = "flex";
    
    // Nếu chuyển sang tab default, kích hoạt render grid kênh mặc định
    initDefaultChannelsTab();
  }
}

function openAddTabModal(subGroupId, startTab = "tab-pane-custom") {
  document.getElementById("tab-modal-title").textContent = "Add Channel / Web Link";
  document.getElementById("target-sub-group-id").value = subGroupId;
  document.getElementById("edit-tab-id").value = "";
  document.getElementById("tab-name").value = "";
  document.getElementById("tab-url").value = "";
  document.getElementById("tab-url-right").value = "";
  
  // Hiển thị tab switcher khi thêm mới
  const tabSwitcher = document.getElementById("modal-tab-switcher");
  if (tabSwitcher) tabSwitcher.style.display = "flex";
  
  const modalHeader = document.getElementById("tab-modal-header");
  if (modalHeader) modalHeader.classList.add("has-tabs");

  // Reset Icon Config Left
  document.querySelector('input[name="tab-icon-type"][value="favicon"]').checked = true;
  document.getElementById("tab-icon-text").value = "";
  document.getElementById("tab-icon-bg").value = "#6366f1";

  // Reset Icon Config Right
  const radioFaviconRight = document.querySelector('input[name="tab-icon-type-right"][value="favicon"]');
  if (radioFaviconRight) radioFaviconRight.checked = true;
  const textInputRight = document.getElementById("tab-icon-text-right");
  if (textInputRight) textInputRight.value = "";
  const bgInputRight = document.getElementById("tab-icon-bg-right");
  if (bgInputRight) bgInputRight.value = "#6366f1";
  
  document.querySelectorAll("#color-swatches-left .swatch").forEach(s => {
    if (s.getAttribute("data-color") === "#6366f1") {
      s.classList.add("selected");
    } else {
      s.classList.remove("selected");
    }
  });

  document.querySelectorAll("#color-swatches-right .swatch").forEach(s => {
    if (s.getAttribute("data-color") === "#6366f1") {
      s.classList.add("selected");
    } else {
      s.classList.remove("selected");
    }
  });

  // Tắt các cần gạt khi add mới
  const dualAcc1Checkbox = document.getElementById("tab-is-dual-acc-1");
  if (dualAcc1Checkbox) dualAcc1Checkbox.checked = false;
  const dualAcc2Checkbox = document.getElementById("tab-is-dual-acc-2");
  if (dualAcc2Checkbox) dualAcc2Checkbox.checked = false;
  toggleSplitLinkForm(false);
  
  // Kích hoạt tab mặc định
  switchModalTab(startTab);
  
  openModal("tab-modal");

  setTimeout(() => {
    const input = document.getElementById("tab-name");
    if (input) {
      input.focus();
      input.select();
    }
  }, 50);
}

function openEditTabModal(subGroupId, tabId, name, url) {
  document.getElementById("tab-modal-title").textContent = "Edit Channel / Web Link";
  document.getElementById("target-sub-group-id").value = subGroupId;
  document.getElementById("edit-tab-id").value = tabId;
  document.getElementById("tab-name").value = name;

  // Ẩn tab switcher khi chỉnh sửa (chỉ cho phép sửa Custom Link)
  const tabSwitcher = document.getElementById("modal-tab-switcher");
  if (tabSwitcher) tabSwitcher.style.display = "none";
  
  const modalHeader = document.getElementById("tab-modal-header");
  if (modalHeader) modalHeader.classList.remove("has-tabs");

  // Load Icon Config from tab object
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  const subGroup = activeMainGroup ? activeMainGroup.subGroups.find(s => s.id === subGroupId) : null;
  const tab = subGroup ? subGroup.tabs.find(t => t.id === tabId) : null;

  // URL trong Edit Channel luôn hiển thị đúng URL gốc đã lưu trong Storage
  document.getElementById("tab-url").value = (tab && tab.url) ? tab.url : url;

  const isDualAcc1 = tab && tab.isDualAcc ? true : false;
  const dualAcc1Checkbox = document.getElementById("tab-is-dual-acc-1");
  if (dualAcc1Checkbox) dualAcc1Checkbox.checked = isDualAcc1;

  const isDualAcc2 = tab && tab.isDualAccRight ? true : false;
  const dualAcc2Checkbox = document.getElementById("tab-is-dual-acc-2");
  if (dualAcc2Checkbox) dualAcc2Checkbox.checked = isDualAcc2;

  const isSplit = tab && tab.isSplit ? true : false;
  
  // Điền URL Right nếu có
  const urlRightInput = document.getElementById("tab-url-right");
  if (urlRightInput) urlRightInput.value = (tab && tab.urlRight) ? tab.urlRight : "";

  // Left side icon
  const iconType = tab && tab.iconType ? tab.iconType : "favicon";
  const iconText = tab && tab.iconText ? tab.iconText : "";
  const iconBgColor = tab && tab.iconBgColor ? tab.iconBgColor : "#6366f1";

  const radioFavicon = document.querySelector('input[name="tab-icon-type"][value="favicon"]');
  const radioText = document.querySelector('input[name="tab-icon-type"][value="text"]');
  if (iconType === "text") {
    if (radioText) radioText.checked = true;
  } else {
    if (radioFavicon) radioFavicon.checked = true;
  }

  document.getElementById("tab-icon-text").value = iconText;
  document.getElementById("tab-icon-bg").value = iconBgColor;

  document.querySelectorAll("#color-swatches-left .swatch").forEach(s => {
    if (s.getAttribute("data-color").toLowerCase() === iconBgColor.toLowerCase()) {
      s.classList.add("selected");
    } else {
      s.classList.remove("selected");
    }
  });

  // Right side icon (Nếu có)
  const iconTypeRight = tab && tab.iconTypeRight ? tab.iconTypeRight : "favicon";
  const iconTextRight = tab && tab.iconTextRight ? tab.iconTextRight : "";
  const iconBgColorRight = tab && tab.iconBgColorRight ? tab.iconBgColorRight : "#6366f1";

  const radioFaviconRight = document.querySelector('input[name="tab-icon-type-right"][value="favicon"]');
  const radioTextRight = document.querySelector('input[name="tab-icon-type-right"][value="text"]');
  if (iconTypeRight === "text") {
    if (radioTextRight) radioTextRight.checked = true;
  } else {
    if (radioFaviconRight) radioFaviconRight.checked = true;
  }

  const textInputRight = document.getElementById("tab-icon-text-right");
  if (textInputRight) textInputRight.value = iconTextRight;
  const bgInputRight = document.getElementById("tab-icon-bg-right");
  if (bgInputRight) bgInputRight.value = iconBgColorRight;

  document.querySelectorAll("#color-swatches-right .swatch").forEach(s => {
    if (s.getAttribute("data-color").toLowerCase() === iconBgColorRight.toLowerCase()) {
      s.classList.add("selected");
    } else {
      s.classList.remove("selected");
    }
  });

  // Đồng bộ trạng thái cần gạt hiển thị cột
  toggleSplitLinkForm(isSplit);
  
  // Luôn bắt buộc mở Pane Custom Link khi chỉnh sửa
  switchModalTab("tab-pane-custom");
  
  openModal("tab-modal");

  setTimeout(() => {
    const input = document.getElementById("tab-name");
    if (input) {
      input.focus();
      input.select();
    }
  }, 50);
}

async function saveTab() {
  const subGroupId = document.getElementById("target-sub-group-id").value;
  const tabId = document.getElementById("edit-tab-id").value;
  const name = document.getElementById("tab-name").value.trim();
  let url = document.getElementById("tab-url").value.trim();
  
  const isDualAcc1Checkbox = document.getElementById("tab-is-dual-acc-1");
  const isDualAcc1 = isDualAcc1Checkbox ? isDualAcc1Checkbox.checked : false;

  const isDualAcc2Checkbox = document.getElementById("tab-is-dual-acc-2");
  const isDualAcc2 = isDualAcc2Checkbox ? isDualAcc2Checkbox.checked : false;

  const isSplitCheckbox = document.getElementById("tab-is-split");
  const isSplit = isSplitCheckbox ? isSplitCheckbox.checked : false;
  let urlRight = "";

  if (isSplit) {
    const urlRightInput = document.getElementById("tab-url-right");
    urlRight = urlRightInput ? urlRightInput.value.trim() : "";
    if (!name || !url || !urlRight) {
      alert("Please enter display name and both Left & Right URL addresses.");
      return;
    }
    if (!/^https?:\/\//i.test(urlRight)) {
      urlRight = "https://" + urlRight;
    }
  } else {
    if (!name || !url) {
      alert("Please enter both the display name and URL address.");
      return;
    }
  }

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;

  const subGroup = activeMainGroup.subGroups.find(s => s.id === subGroupId);
  if (!subGroup) return;

  // Thu thập thông tin icon trái
  const iconType = document.querySelector('input[name="tab-icon-type"]:checked').value;
  const iconText = document.getElementById("tab-icon-text").value.trim().substring(0, 15);
  const iconBgColor = document.getElementById("tab-icon-bg").value;
  const iconTextColor = getContrastColor(iconBgColor);

  // Thu thập thông tin icon phải
  let iconTypeRight = "favicon";
  let iconTextRight = "";
  let iconBgColorRight = "#6366f1";
  let iconTextColorRight = "#ffffff";
  if (isSplit) {
    const radioRight = document.querySelector('input[name="tab-icon-type-right"]:checked');
    iconTypeRight = radioRight ? radioRight.value : "favicon";
    iconTextRight = document.getElementById("tab-icon-text-right").value.trim().substring(0, 15);
    iconBgColorRight = document.getElementById("tab-icon-bg-right").value;
    iconTextColorRight = getContrastColor(iconBgColorRight);
  }

  if (tabId) {
    // Edit
    const tab = subGroup.tabs.find(t => t.id === tabId);
    if (tab) {
      const oldUrl = tab.url;
      const oldUrlRight = tab.urlRight;
      const oldIsDualAcc1 = !!tab.isDualAcc;
      const oldIsDualAcc2 = !!tab.isDualAccRight;
      const oldIsSplit = !!tab.isSplit;
      
      tab.name = name;
      tab.url = url;
      tab.iconType = iconType;
      tab.iconText = iconText;
      tab.iconBgColor = iconBgColor;
      tab.iconTextColor = iconTextColor;

      if (isDualAcc1) {
        tab.isDualAcc = true;
      } else {
        delete tab.isDualAcc;
      }

      if (isSplit && isDualAcc2) {
        tab.isDualAccRight = true;
      } else {
        delete tab.isDualAccRight;
      }

      if (isSplit) {
        tab.isSplit = true;
        tab.urlRight = urlRight;
        tab.iconTypeRight = iconTypeRight;
        tab.iconTextRight = iconTextRight;
        tab.iconBgColorRight = iconBgColorRight;
        tab.iconTextColorRight = iconTextColorRight;
      } else {
        delete tab.isSplit;
        delete tab.urlRight;
        delete tab.iconTypeRight;
        delete tab.iconTextRight;
        delete tab.iconBgColorRight;
        delete tab.iconTextColorRight;
      }

      // Nếu URL địa chỉ bên trái hoặc phải thay đổi, xóa favicon cũ đã lưu để tự động cập nhật favicon theo URL mới
      if (oldUrl !== url) {
        delete tab.customFavicon;
      }
      if (oldUrlRight !== urlRight) {
        delete tab.customFaviconRight;
      }

      // Tối ưu hóa Reload iframe: Chỉ tiêu hủy đúng pane có thay đổi URL hoặc Dual Account
      const recreateLeft = (oldUrl !== url || oldIsDualAcc1 !== isDualAcc1);
      const recreateRight = isSplit && (oldUrlRight !== urlRight || oldIsDualAcc2 !== isDualAcc2);
      const splitToggledOff = oldIsSplit && !isSplit;

      if (recreateLeft) {
        if (typeof window.destroyIframePane === "function") {
          window.destroyIframePane("left", tabId);
        } else {
          destroyIframe(tabId);
        }
      }

      if (recreateRight || splitToggledOff) {
        if (typeof window.destroyIframePane === "function") {
          window.destroyIframePane("right", tabId);
        }
      }

      // Cập nhật trạng thái hiển thị nếu tab đang active
      if (appState.activeTabId === tabId) {
        setTimeout(() => {
          selectTab(tabId, url);
          if (typeof updateAddressBarUI === "function") {
            updateAddressBarUI();
          }
        }, 50);
      }
    }
  } else {
    // Add new custom tab
    const newTab = {
      id: "tab_" + Date.now(),
      name: name,
      url: url,
      isActive: false,
      iconType: iconType,
      iconText: iconText,
      iconBgColor: iconBgColor,
      iconTextColor: iconTextColor
    };

    if (isDualAcc1) {
      newTab.isDualAcc = true;
    }

    if (isSplit) {
      newTab.isSplit = true;
      newTab.urlRight = urlRight;
      newTab.iconTypeRight = iconTypeRight;
      newTab.iconTextRight = iconTextRight;
      newTab.iconBgColorRight = iconBgColorRight;
      newTab.iconTextColorRight = iconTextColorRight;
      if (isDualAcc2) {
        newTab.isDualAccRight = true;
      }
    }

    subGroup.tabs.push(newTab);
    
    setTimeout(() => {
      selectTab(newTab.id, newTab.url);
    }, 100);
  }

  await saveHierarchyToStorage();
  closeModal("tab-modal");
  renderSubSidebar();
}

async function deleteTab(subGroupId, tabId) {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;
  if (!confirm("Are you sure you want to delete this channel/link?")) return;

  const subGroup = activeMainGroup.subGroups.find(s => s.id === subGroupId);
  if (!subGroup) return;

  subGroup.tabs = subGroup.tabs.filter(t => t.id !== tabId);
  destroyIframe(tabId);

  if (appState.activeTabId === tabId) {
    appState.activeTabId = null;
  }
  if (appState.leftTabId === tabId) {
    appState.leftTabId = null;
  }
  if (appState.rightTabId === tabId) {
    appState.rightTabId = null;
  }

  if (!appState.leftTabId && !appState.rightTabId) {
    document.getElementById("welcome-screen").style.display = "flex";
  }

  await saveHierarchyToStorage();
  renderSubSidebar();
  saveSessionState();
}

async function cloneTab(subGroupId, tabId) {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;

  const subGroup = activeMainGroup.subGroups.find(s => s.id === subGroupId);
  if (!subGroup) return;

  const tabIndex = subGroup.tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const originalTab = subGroup.tabs[tabIndex];

  // Sao chép y chang toàn bộ thông tin đối tượng tab (Split, Dual, Name, URLs, Favicons...)
  const clonedTab = JSON.parse(JSON.stringify(originalTab));
  clonedTab.id = "tab_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  clonedTab.isActive = false;

  // Chèn ngay sau vị trí của tab gốc
  subGroup.tabs.splice(tabIndex + 1, 0, clonedTab);

  await saveHierarchyToStorage();
  renderSubSidebar();
}

/* ==================== LOGIC CHO TAB DEFAULT CHANNELS ==================== */
function initDefaultChannelsTab() {
  const tabsRow = document.getElementById("setup-tabs-row");
  const grid = document.getElementById("setup-channels-grid");
  
  tabsRow.innerHTML = "";
  grid.innerHTML = "";
  selectedSetupChannelIds.clear();
  
  if (defaultTagsList.length === 0) {
    tabsRow.innerHTML = "<span style='color: var(--text-secondary); font-size: 13px;'>No categories found.</span>";
    return;
  }
  
  activeSetupTag = defaultTagsList[0];
  
  // Render setup tabs
  defaultTagsList.forEach(tag => {
    const tabEl = document.createElement("div");
    tabEl.className = `setup-tab ${tag === activeSetupTag ? "active" : ""}`;
    tabEl.textContent = tag;
    tabEl.onclick = () => {
      document.querySelectorAll(".setup-tab").forEach(el => el.classList.remove("active"));
      tabEl.classList.add("active");
      activeSetupTag = tag;
      renderSetupGridForTag(tag);
    };
    tabsRow.appendChild(tabEl);
  });
  
  function renderSetupGridForTag(tag) {
    grid.innerHTML = "";
    const channels = defaultChannelsByTag[tag] || [];
    
    channels.forEach(tab => {
      const isSelected = selectedSetupChannelIds.has(tab.id);
      const card = createGridCard(tab, "setup-grid-card", isSelected, (cardEl) => {
        if (cardEl.classList.toggle("selected")) {
          selectedSetupChannelIds.add(tab.id);
        } else {
          selectedSetupChannelIds.delete(tab.id);
        }
      });
      grid.appendChild(card);
    });
  }
  
  renderSetupGridForTag(activeSetupTag);
}

// Submit xử lý chọn kênh mặc định
async function submitDefaultChannelsSetup() {
  if (selectedSetupChannelIds.size === 0) {
    alert("Please select at least one channel to add.");
    return;
  }
  
  const subGroupId = document.getElementById("target-sub-group-id").value;
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) {
    alert("Main group not found.");
    return;
  }
  
  const activeSubGroup = activeMainGroup.subGroups.find(s => s.id === subGroupId);
  if (!activeSubGroup) {
    alert("Sub-group not found.");
    return;
  }

  let lastAddedTab = null;
  selectedSetupChannelIds.forEach(tabId => {
    const defaultTab = DEFAULT_CHANNELS_LIST.find(t => t.id === tabId);
    if (defaultTab) {
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
      activeSubGroup.tabs.push(newTab);
      lastAddedTab = newTab;
    }
  });
  
  await saveHierarchyToStorage();
  closeModal("tab-modal");
  renderSubSidebar();
  
  if (lastAddedTab) {
    selectTab(lastAddedTab.id, lastAddedTab.url);
  }
}

// Bind DOM Events
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-tab-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveTab);
  
  const cancelBtn = document.getElementById("cancel-tab-modal");
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal("tab-modal"));
  
  const closeBtn = document.getElementById("close-tab-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("tab-modal"));
  
  // Đăng ký click event cho tab switcher
  document.querySelectorAll(".modal-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetPane = e.target.getAttribute("data-target");
      switchModalTab(targetPane);
    });
  });

  // Đăng ký sự kiện submit setup default channels
  const submitSetupBtn = document.getElementById("btn-submit-setup");
  if (submitSetupBtn) submitSetupBtn.addEventListener("click", submitDefaultChannelsSetup);

  // Đăng ký sự kiện Select/Deselect All cho default channels
  const selectAllBtn = document.getElementById("btn-setup-select-all");
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const currentChannels = defaultChannelsByTag[activeSetupTag] || [];
      currentChannels.forEach(tab => {
        selectedSetupChannelIds.add(tab.id);
      });
      document.querySelectorAll(".setup-grid-card").forEach(c => c.classList.add("selected"));
    });
  }

  const deselectAllBtn = document.getElementById("btn-setup-deselect-all");
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", () => {
      const currentChannels = defaultChannelsByTag[activeSetupTag] || [];
      currentChannels.forEach(tab => {
        selectedSetupChannelIds.delete(tab.id);
      });
      document.querySelectorAll(".setup-grid-card").forEach(c => c.classList.remove("selected"));
    });
  }

  // Đăng ký sự kiện cho cần gạt Split Link (Dual View)
  const isSplitCheckbox = document.getElementById("tab-is-split");
  if (isSplitCheckbox) {
    isSplitCheckbox.addEventListener("change", (e) => {
      toggleSplitLinkForm(e.target.checked);
    });
  }

  // Cột trái Event Listeners
  document.querySelectorAll('input[name="tab-icon-type"]').forEach(radio => {
    radio.addEventListener("change", updateIconPreview);
  });

  const tabName = document.getElementById("tab-name");
  if (tabName) tabName.addEventListener("input", updateIconPreview);
  
  const tabUrl = document.getElementById("tab-url");
  if (tabUrl) tabUrl.addEventListener("input", updateIconPreview);
  
  const tabIconText = document.getElementById("tab-icon-text");
  if (tabIconText) tabIconText.addEventListener("input", updateIconPreview);

  document.querySelectorAll("#color-swatches-left .swatch").forEach(swatch => {
    swatch.addEventListener("click", (e) => {
      const color = e.target.getAttribute("data-color");
      const bgInput = document.getElementById("tab-icon-bg");
      if (bgInput) bgInput.value = color;
      
      document.querySelectorAll("#color-swatches-left .swatch").forEach(s => s.classList.remove("selected"));
      e.target.classList.add("selected");
      
      updateIconPreview();
    });
  });

  // Cột phải Event Listeners
  document.querySelectorAll('input[name="tab-icon-type-right"]').forEach(radio => {
    radio.addEventListener("change", updateIconPreview);
  });

  const tabUrlRight = document.getElementById("tab-url-right");
  if (tabUrlRight) tabUrlRight.addEventListener("input", updateIconPreview);
  
  const tabIconTextRight = document.getElementById("tab-icon-text-right");
  if (tabIconTextRight) tabIconTextRight.addEventListener("input", updateIconPreview);

  document.querySelectorAll("#color-swatches-right .swatch").forEach(swatch => {
    swatch.addEventListener("click", (e) => {
      const color = e.target.getAttribute("data-color");
      const bgInput = document.getElementById("tab-icon-bg-right");
      if (bgInput) bgInput.value = color;
      
      document.querySelectorAll("#color-swatches-right .swatch").forEach(s => s.classList.remove("selected"));
      e.target.classList.add("selected");
      
      updateIconPreview();
    });
  });
});
