// Main Group Modal — SVG icon selector
// Icons are loaded dynamically from svg/main-icons/index.json
// To add a new icon: drop the .svg into svg/main-icons/ and add its name to index.json

const DEFAULT_MAIN_ICON = "Robot";

/** Trả về path SVG của icon */
function mainIconPath(name) {
  return `svg/main-icons/${name}.svg`;
}

/**
 * Tự động quét folder svg/main-icons/ và lấy danh sách file .svg.
 * Dùng chrome.runtime.getPackageDirectoryEntry() — API native của Chrome Extension.
 * Fallback: index.json → hardcode list.
 */
async function loadAndRenderIconSelector() {
  try {
    const names = await _scanIconFolder();
    if (names && names.length > 0) {
      if (!window.MAIN_ICON_LIST) window.MAIN_ICON_LIST = [];
      window.MAIN_ICON_LIST.length = 0;
      names.forEach(n => window.MAIN_ICON_LIST.push(n));
    }
  } catch (e) {
    console.warn("[main-group] Auto-scan failed, trying index.json fallback.", e);
    try {
      const res = await fetch("svg/main-icons/index.json");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.icons) && data.icons.length > 0) {
          if (!window.MAIN_ICON_LIST) window.MAIN_ICON_LIST = [];
          window.MAIN_ICON_LIST.length = 0;
          data.icons.forEach(n => window.MAIN_ICON_LIST.push(n));
        }
      }
    } catch (e2) {
      console.warn("[main-group] index.json also failed, using hardcode list.", e2);
    }
  }
  renderEmojiSelector();
  
  // Re-render Main Sidebar to show dynamic SVG icons correctly after scanning
  if (typeof renderMainSidebar === "function") {
    renderMainSidebar();
  }
}

/**
 * Dùng chrome.runtime.getPackageDirectoryEntry() để đọc folder svg/main-icons/.
 * Trả về mảng tên file (không có .svg), đã sort theo alphabet.
 */
function _scanIconFolder() {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.runtime || !chrome.runtime.getPackageDirectoryEntry) {
      return reject(new Error("getPackageDirectoryEntry not available"));
    }
    chrome.runtime.getPackageDirectoryEntry(root => {
      root.getDirectory("svg/main-icons", {}, dir => {
        const reader = dir.createReader();
        const entries = [];

        // readEntries có thể cần gọi nhiều lần cho đến khi trả về mảng rỗng
        function readBatch() {
          reader.readEntries(batch => {
            if (batch.length === 0) {
              // Done — lọc .svg và sort
              const names = entries
                .filter(e => e.isFile && e.name.toLowerCase().endsWith(".svg"))
                .map(e => e.name.slice(0, -4)) // bỏ ".svg"
                .sort((a, b) => a.localeCompare(b));
              resolve(names);
            } else {
              entries.push(...batch);
              readBatch(); // tiếp tục đọc batch tiếp theo
            }
          }, reject);
        }
        readBatch();
      }, reject);
    });
  });
}

/** Mở modal thêm mới */
function openAddMainGroupModal() {
  document.getElementById("main-group-modal-title").textContent = "Add Main Group";
  document.getElementById("edit-main-group-id").value = "";

  // Auto-select first icon from available SVG icons list
  const firstIcon = (window.MAIN_ICON_LIST && window.MAIN_ICON_LIST.length > 0) ? window.MAIN_ICON_LIST[0] : DEFAULT_MAIN_ICON;
  document.getElementById("main-group-emoji").value = firstIcon;
  document.getElementById("main-group-name").value = "";

  _selectIconEl(firstIcon, /*autoFillName=*/true);
  openModal("main-group-modal");

  setTimeout(() => {
    const input = document.getElementById("main-group-name");
    if (input) {
      input.focus();
      input.select();
    }
  }, 50);
}

/** Mở modal chỉnh sửa */
function openEditMainGroupModal() {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;

  document.getElementById("main-group-modal-title").textContent = "Edit Main Group";
  document.getElementById("edit-main-group-id").value = activeMainGroup.id;
  document.getElementById("main-group-name").value = activeMainGroup.name;

  // icon có thể là tên SVG ("Robot") hoặc emoji cũ ("🤖") — fallback về default nếu không match
  const savedIcon = activeMainGroup.icon || DEFAULT_MAIN_ICON;
  const iconName = MAIN_ICON_LIST.includes(savedIcon) ? savedIcon : DEFAULT_MAIN_ICON;
  document.getElementById("main-group-emoji").value = iconName;

  _selectIconEl(iconName, /*autoFillName=*/false);
  openModal("main-group-modal");

  setTimeout(() => {
    const input = document.getElementById("main-group-name");
    if (input) {
      input.focus();
      input.select();
    }
  }, 50);
}

/** Lưu Main Group */
async function saveMainGroup() {
  const id = document.getElementById("edit-main-group-id").value;
  const name = document.getElementById("main-group-name").value.trim();
  const icon = document.getElementById("main-group-emoji").value;

  if (!name) {
    alert("Please enter the main group name.");
    return;
  }

  if (id) {
    const group = appState.hierarchy.find(g => g.id === id);
    if (group) {
      group.name = name;
      group.icon = icon;
    }
  } else {
    const newGroupId = "main_" + Date.now();
    const newGroup = {
      id: newGroupId,
      name: name,
      icon: icon,
      subGroups: [
        {
          id: "sub_" + Date.now(),
          name: "Channels",
          tabs: []
        }
      ]
    };
    appState.hierarchy.push(newGroup);
    appState.activeMainGroupId = newGroupId;
  }

  await saveHierarchyToStorage();
  closeModal("main-group-modal");
  renderMainSidebar();
  renderSubSidebar();
}

/** Xóa Main Group */
async function deleteMainGroup() {
  if (!appState.activeMainGroupId) return;
  if (appState.activeMainGroupId === "main_cskh") {
    alert("Default Main Group cannot be deleted.");
    return;
  }
  if (!confirm("Are you sure you want to delete this Main Group? All sub-groups and channels inside will be lost permanently!")) return;

  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (activeMainGroup) {
    activeMainGroup.subGroups.forEach(sub => {
      sub.tabs.forEach(tab => destroyIframe(tab.id));
    });
  }

  appState.hierarchy = appState.hierarchy.filter(g => g.id !== appState.activeMainGroupId);

  // AI Multi-Chat is always index 0. Index 1 is the first user main group.
  if (appState.hierarchy[1]) {
    appState.activeMainGroupId = appState.hierarchy[1].id;
  } else if (appState.hierarchy[0]) {
    appState.activeMainGroupId = appState.hierarchy[0].id;
  } else {
    appState.activeMainGroupId = null;
  }

  appState.activeTabId = null;
  appState.leftTabId = null;
  appState.rightTabId = null;
  document.getElementById("welcome-screen").style.display = "flex";

  await saveHierarchyToStorage();
  renderMainSidebar();
  renderSubSidebar();
  saveSessionState();
}

/** Nhân bản Main Group */
async function cloneMainGroup() {
  if (!appState.activeMainGroupId) return;
  const aiGroupId = window.SYSTEM_AI_GROUP_ID || "main_ai_multichat";
  if (appState.activeMainGroupId === aiGroupId) {
    alert("System AI Multi-Chat Group cannot be cloned.");
    return;
  }

  const groupIndex = appState.hierarchy.findIndex(g => g.id === appState.activeMainGroupId);
  if (groupIndex === -1) return;

  const originalGroup = appState.hierarchy[groupIndex];

  // Deep clone toàn bộ Main Group (bao gồm subGroups và tabs bên trong)
  const clonedGroup = JSON.parse(JSON.stringify(originalGroup));
  const newGroupId = "main_" + Date.now();
  clonedGroup.id = newGroupId;

  // Cập nhật ID mới cho tất cả subGroups và tabs bên trong
  if (Array.isArray(clonedGroup.subGroups)) {
    clonedGroup.subGroups.forEach((sub, subIdx) => {
      sub.id = "sub_" + Date.now() + "_" + subIdx;
      if (Array.isArray(sub.tabs)) {
        sub.tabs.forEach((tab, tabIdx) => {
          tab.id = "tab_" + Date.now() + "_" + subIdx + "_" + tabIdx;
          tab.isActive = false;
        });
      }
    });
  }

  // Chèn ngay sau Main Group gốc
  appState.hierarchy.splice(groupIndex + 1, 0, clonedGroup);

  // Focus vào nhóm mới nhân bản
  appState.activeMainGroupId = newGroupId;

  await saveHierarchyToStorage();
  renderMainSidebar();
  renderSubSidebar();
  saveSessionState();
}

/**
 * Render lưới icon SVG.
 * Khi click icon: cập nhật hidden field + auto-fill group name bằng tên file.
 */
function renderEmojiSelector() {
  const container = document.getElementById("emoji-selector");
  if (!container) return;
  container.innerHTML = "";

  const list = window.MAIN_ICON_LIST || [];
  list.forEach(name => {
    const el = document.createElement("div");
    el.className = "emoji-option";
    el.setAttribute("data-emoji", name);

    const img = document.createElement("img");
    img.src = mainIconPath(name);
    img.alt = name;
    img.title = name;
    img.style.cssText = "width:28px;height:28px;object-fit:contain;pointer-events:none;";

    el.appendChild(img);

    el.addEventListener("click", () => {
      _selectIconEl(name, /*autoFillName=*/true);
    });

    container.appendChild(el);
  });
}

/** Highlight icon được chọn + tuỳ chọn auto-fill tên group */
function _selectIconEl(name, autoFillName) {
  document.querySelectorAll(".emoji-option").forEach(item => item.classList.remove("selected"));
  const target = document.querySelector(`.emoji-option[data-emoji="${name}"]`);
  if (target) target.classList.add("selected");

  document.getElementById("main-group-emoji").value = name;

  if (autoFillName) {
    const nameInput = document.getElementById("main-group-name");
    const current = nameInput.value.trim();
    // Auto-fill nếu ô đang trống hoặc đang là tên icon trước đó
    const isPrevIconName = MAIN_ICON_LIST.includes(current);
    if (!current || isPrevIconName) {
      nameInput.value = name;
    }
  }
}

// Bind DOM Events
document.addEventListener("DOMContentLoaded", () => {
  // Load icon list từ index.json rồi render — tự nhận file mới mỗi lần reload extension
  loadAndRenderIconSelector();

  const saveBtn = document.getElementById("save-main-group-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveMainGroup);

  const cancelBtn = document.getElementById("cancel-main-group-modal");
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal("main-group-modal"));

  const closeBtn = document.getElementById("close-main-group-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("main-group-modal"));

  const editBtn = document.getElementById("edit-main-group-btn");
  if (editBtn) editBtn.addEventListener("click", openEditMainGroupModal);

  const cloneBtn = document.getElementById("clone-main-group-btn");
  if (cloneBtn) cloneBtn.addEventListener("click", cloneMainGroup);

  const deleteBtn = document.getElementById("delete-main-group-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", deleteMainGroup);
});
