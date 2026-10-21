/**
 * Main Stats Controller for Harry Perfume Extension
 * Quản lý router sub-tabs, bảo vệ quyền Quản trị viên và điều phối dữ liệu
 */

let activeStatsSubtab = "finance";

// Khôi phục sub-tab đã chọn gần nhất từ storage (Single Source of Truth)
try {
  const savedSubtab = localStorage.getItem("statsActiveSubtab");
  if (savedSubtab) {
    const parsed = JSON.parse(savedSubtab);
    if (["finance", "sender", "product"].includes(parsed)) {
      activeStatsSubtab = parsed;
    }
  }
} catch (e) {}

// Khởi tạo module thống kê
async function initStatsModule() {
  setupStatsSubnavListeners();

  if (typeof StorageHelper !== "undefined") {
    const savedSubtab = await StorageHelper.get("statsActiveSubtab", activeStatsSubtab);
    if (savedSubtab && ["finance", "sender", "product"].includes(savedSubtab)) {
      activeStatsSubtab = savedSubtab;
    }
  }

  updateStatsSubnavUI(activeStatsSubtab);
}

// Cấu hình sự kiện chuyển đổi các mục thống kê con (3 buttons)
function setupStatsSubnavListeners() {
  const container = document.querySelector(".stats-subnav");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".stats-subnav-btn");
    if (!btn) return;
    const targetSubtab = btn.getAttribute("data-subtab");
    if (targetSubtab && targetSubtab !== activeStatsSubtab) {
      switchStatsSubtab(targetSubtab);
    }
  });
}

// Cập nhật trạng thái active cho 3 button thống kê con
function updateStatsSubnavUI(subtabId) {
  const buttons = document.querySelectorAll(".stats-subnav-btn");
  buttons.forEach(btn => {
    const match = (btn.getAttribute("data-subtab") === subtabId);
    btn.classList.toggle("active", match);
  });
}

// Chuyển đổi giữa các phân hệ thống kê con
function switchStatsSubtab(subtabId) {
  activeStatsSubtab = subtabId;

  // Lưu trạng thái subtab cuối cùng vào storage
  if (typeof StorageHelper !== "undefined") {
    StorageHelper.set("statsActiveSubtab", subtabId);
  }
  try {
    localStorage.setItem("statsActiveSubtab", JSON.stringify(subtabId));
  } catch (e) {}

  // Cập nhật trạng thái active trên 3 nút
  updateStatsSubnavUI(subtabId);

  // Cập nhật pane hiển thị
  const panes = document.querySelectorAll(".stats-subpane");
  panes.forEach(p => {
    p.style.display = "none";
  });

  if (subtabId === "finance") {
    const pane = document.getElementById("statsFinancePane");
    if (pane) {
      pane.style.display = "flex";
      if (typeof window.renderFinanceStatsView === "function") {
        window.renderFinanceStatsView();
      }
    }
  } else if (subtabId === "sender") {
    const pane = document.getElementById("statsSenderPane");
    if (pane) {
      pane.style.display = "flex";
      if (typeof window.renderSenderStatsView === "function") {
        window.renderSenderStatsView();
      }
    }
  } else if (subtabId === "product") {
    const pane = document.getElementById("statsProductPane");
    if (pane) {
      pane.style.display = "flex";
      if (typeof window.renderProductStatsView === "function") {
        window.renderProductStatsView();
      }
    }
  }
}

// Làm mới toàn bộ giao diện Thống Kê
async function refreshStatsView() {
  const isAdmin = await checkIsAdminLoggedIn();
  if (!isAdmin) {
    clearStatsData();
    return;
  }

  // Khôi phục sub-tab từ storage trước khi render
  if (typeof StorageHelper !== "undefined") {
    const savedSubtab = await StorageHelper.get("statsActiveSubtab", activeStatsSubtab);
    if (savedSubtab && ["finance", "sender", "product"].includes(savedSubtab)) {
      activeStatsSubtab = savedSubtab;
    }
  }

  switchStatsSubtab(activeStatsSubtab);
}

// Dọn dẹp sạch dữ liệu thống kê (Khi Đăng xuất Quản trị)
function clearStatsData() {
  activeStatsSubtab = "finance";
  updateStatsSubnavUI("finance");
  const panes = document.querySelectorAll(".stats-subpane");
  panes.forEach(p => {
    p.innerHTML = "";
  });
  if (typeof window.resetFinanceFilters === "function") {
    window.resetFinanceFilters();
  }
  if (typeof window.clearSenderStatsData === "function") {
    window.clearSenderStatsData();
  }
  if (typeof window.clearProductStatsData === "function") {
    window.clearProductStatsData();
  }
}

// Hook được gọi khi dữ liệu tab Nhập có cập nhật (Thêm mới / sửa / reload)
function onImportDataUpdated() {
  const paneStats = document.getElementById("paneStats");
  // Nếu tab Thống Kê đang mở trên màn hình thì tự động render lại số liệu mới
  if (paneStats && paneStats.style.display !== "none") {
    refreshStatsView();
  }
}

document.addEventListener("DOMContentLoaded", initStatsModule);

if (typeof window !== "undefined") {
  window.refreshStatsView = refreshStatsView;
  window.clearStatsData = clearStatsData;
  window.onImportDataUpdated = onImportDataUpdated;
}
