/**
 * Shared Modal Controller for Harry Perfume Extension
 * Quản lý mở/đóng popup đồng bộ, xử lý click nền mờ và phím Escape
 */

function getModalElement(target) {
  if (!target) return null;
  if (typeof target === "string") {
    const id = target.startsWith("#") ? target.substring(1) : target;
    return document.getElementById(id);
  }
  if (target instanceof HTMLElement) {
    return target.closest(".modal-overlay") || target;
  }
  return null;
}

// Mở một modal
function openModal(target) {
  const modal = getModalElement(target);
  if (!modal) return;
  modal.style.display = "flex";
}

// Đóng một modal
function closeModal(target) {
  const modal = getModalElement(target);
  if (!modal) return;
  modal.style.display = "none";
  if (modal.id === "confirmModal") settleConfirm(false);
}

// Hộp xác nhận dùng chung thay window.confirm (#confirmModal trong panel.html), trả về Promise<boolean>.
// Đóng bằng Hủy, ✕, click nền mờ hay phím Escape đều tính là Hủy.
let pendingConfirmResolve = null;

function confirmAction(message, okLabel = "Đồng ý") {
  settleConfirm(false);
  document.getElementById("confirmModalMsg").innerText = message;
  document.getElementById("btnOkConfirmModal").innerText = okLabel;
  openModal("confirmModal");
  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
  });
}

function settleConfirm(result) {
  if (!pendingConfirmResolve) return;
  const resolve = pendingConfirmResolve;
  pendingConfirmResolve = null;
  document.getElementById("confirmModal").style.display = "none";
  resolve(result);
}

// Kiểm tra có modal nào đang mở không
function getOpenModals() {
  const overlays = document.querySelectorAll(".modal-overlay");
  return Array.from(overlays).filter(el => {
    return el.style.display !== "none" && window.getComputedStyle(el).display !== "none";
  });
}

// Đóng tất cả các modal đang mở
function closeAllModals() {
  getOpenModals().forEach(closeModal);
}

// Khởi tạo các bộ lắng nghe sự kiện dùng chung cho toàn bộ modal
function initGlobalModalListeners() {
  // 1. Click vào vùng nền mờ bên ngoài (Backdrop click) -> Tự động đóng modal
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-overlay")) {
      closeModal(e.target);
      return;
    }
    if (e.target.closest("#btnOkConfirmModal")) settleConfirm(true);
    else if (e.target.closest("#btnCancelConfirmModal, #btnCloseConfirmModal")) settleConfirm(false);
  });

  // 2. Nhấn phím Escape -> Tự động đóng modal trên cùng đang mở
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = getOpenModals();
      if (openModals.length > 0) {
        // Đóng modal mở gần nhất (phần tử cuối cùng trong DOM)
        const topModal = openModals[openModals.length - 1];
        closeModal(topModal);
      }
    }
  });
}

// Tự động kích hoạt khi nạp script
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalModalListeners);
  } else {
    initGlobalModalListeners();
  }
}

if (typeof window !== "undefined") {
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.getOpenModals = getOpenModals;
  window.closeAllModals = closeAllModals;
  window.confirmAction = confirmAction;
}
