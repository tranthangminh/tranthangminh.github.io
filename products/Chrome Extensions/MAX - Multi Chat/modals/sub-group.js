// Sub-group Modal actions (Add/Edit/Rename/Bulk-Delete Sub Group)

function openAddSubGroupModal() {
  if (!appState.activeMainGroupId) return;
  document.getElementById("sub-group-modal-title").textContent = "Add Sub-group";
  document.getElementById("edit-sub-group-id").value = "";
  document.getElementById("sub-group-name").value = "";
  document.getElementById("sub-group-name").readOnly = false;
  document.getElementById("sub-group-tabs-delete-container").style.display = "none";
  openModal("sub-group-modal");

  setTimeout(() => {
    const input = document.getElementById("sub-group-name");
    if (input && !input.readOnly) {
      input.focus();
      input.select();
    }
  }, 50);
}

function openEditSubGroupModal(id, name) {
  document.getElementById("sub-group-modal-title").textContent = "Edit Sub-group";
  document.getElementById("edit-sub-group-id").value = id;
  document.getElementById("sub-group-name").value = name;

  if (id === "sub_cskh_main") {
    document.getElementById("sub-group-name").readOnly = true;
  } else {
    document.getElementById("sub-group-name").readOnly = false;
  }

  document.getElementById("sub-group-tabs-delete-container").style.display = "block";
  
  const grid = document.getElementById("sub-group-tabs-delete-grid");
  if (grid) {
    grid.innerHTML = "";

    const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
    if (!activeMainGroup) return;
    const sub = activeMainGroup.subGroups.find(s => s.id === id);
    if (!sub) return;

    if (!sub.tabs || sub.tabs.length === 0) {
      grid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px 0;">No channels in this sub-group.</div>`;
    } else {
      sub.tabs.forEach(tab => {
        const el = createGridCard(tab, "sub-group-grid-item", false, (cardEl) => {
          cardEl.classList.toggle("delete-selected");
        });
        grid.appendChild(el);
      });
    }
  }

  openModal("sub-group-modal");

  setTimeout(() => {
    const input = document.getElementById("sub-group-name");
    if (input && !input.readOnly) {
      input.focus();
      input.select();
    }
  }, 50);
}

async function saveSubGroup() {
  const id = document.getElementById("edit-sub-group-id").value;
  const name = document.getElementById("sub-group-name").value.trim();
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);

  if (!activeMainGroup) return;
  if (!name) {
    alert("Please enter the sub-group name.");
    return;
  }

  if (id) {
    const sub = activeMainGroup.subGroups.find(s => s.id === id);
    if (sub) {
      if (id !== "sub_cskh_main") {
        sub.name = name;
      }

      // Bulk delete logic for selected cards
      const selectedDeleteCards = document.querySelectorAll("#sub-group-tabs-delete-grid .sub-group-grid-item.delete-selected");
      if (selectedDeleteCards.length > 0) {
        const idsToDelete = new Set(Array.from(selectedDeleteCards).map(c => c.getAttribute("data-tab-id")));
        
        // Remove from memory hierarchy
        sub.tabs = sub.tabs.filter(tab => {
          if (idsToDelete.has(tab.id)) {
            destroyIframe(tab.id);
            if (appState.activeTabId === tab.id) {
              appState.activeTabId = null;
            }
            return false;
          }
          return true;
        });

        // If active tab was deleted, reset iframe display to welcome screen
        if (appState.activeTabId === null) {
          document.getElementById("welcome-screen").style.display = "flex";
          const header = document.getElementById("content-header");
          if (header) header.style.display = "none";
        }
      }
    }
  } else {
    const newSub = {
      id: "sub_" + Date.now(),
      name: name,
      tabs: []
    };
    activeMainGroup.subGroups.push(newSub);
  }

  await saveHierarchyToStorage();
  closeModal("sub-group-modal");
  renderSubSidebar();
}

async function deleteSubGroup(subId) {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;
  if (!confirm("Are you sure you want to delete this sub-group?")) return;

  const sub = activeMainGroup.subGroups.find(s => s.id === subId);
  if (sub) {
    sub.tabs.forEach(tab => {
      destroyIframe(tab.id);
    });

    if (appState.activeTabId && sub.tabs.some(t => t.id === appState.activeTabId)) {
      appState.activeTabId = null;
    }
    if (appState.leftTabId && sub.tabs.some(t => t.id === appState.leftTabId)) {
      appState.leftTabId = null;
    }
    if (appState.rightTabId && sub.tabs.some(t => t.id === appState.rightTabId)) {
      appState.rightTabId = null;
    }

    if (!appState.leftTabId && !appState.rightTabId) {
      document.getElementById("welcome-screen").style.display = "flex";
    }
  }

  activeMainGroup.subGroups = activeMainGroup.subGroups.filter(s => s.id !== subId);
  
  if (activeMainGroup.subGroups.length === 0) {
    const newSub = {
      id: "sub_" + Date.now(),
      name: "Channels",
      tabs: []
    };
    activeMainGroup.subGroups.push(newSub);
  }

  await saveHierarchyToStorage();
  renderSubSidebar();
  saveSessionState();
}

/** Nhân bản Sub-group */
async function cloneSubGroup(subId) {
  const activeMainGroup = appState.hierarchy.find(g => g.id === appState.activeMainGroupId);
  if (!activeMainGroup) return;

  const subIndex = activeMainGroup.subGroups.findIndex(s => s.id === subId);
  if (subIndex === -1) return;

  const originalSub = activeMainGroup.subGroups[subIndex];

  // Deep clone toàn bộ Sub-group (bao gồm tabs bên trong)
  const clonedSub = JSON.parse(JSON.stringify(originalSub));
  clonedSub.id = "sub_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  if (Array.isArray(clonedSub.tabs)) {
    clonedSub.tabs.forEach((tab, tabIdx) => {
      tab.id = "tab_" + Date.now() + "_" + tabIdx + "_" + Math.floor(Math.random() * 1000);
      tab.isActive = false;
    });
  }

  // Chèn ngay sau Sub-group gốc
  activeMainGroup.subGroups.splice(subIndex + 1, 0, clonedSub);

  await saveHierarchyToStorage();
  renderSubSidebar();
}

// Bind DOM Events
document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("add-sub-group-btn");
  if (addBtn) addBtn.addEventListener("click", openAddSubGroupModal);

  const saveBtn = document.getElementById("save-sub-group-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveSubGroup);
  
  const cancelBtn = document.getElementById("cancel-sub-group-modal");
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal("sub-group-modal"));
  
  const closeBtn = document.getElementById("close-sub-group-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("sub-group-modal"));
});
