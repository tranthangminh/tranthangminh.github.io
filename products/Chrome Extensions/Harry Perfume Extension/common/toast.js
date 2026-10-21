/**
 * Shared Toast Notification Manager for Harry Perfume Extension
 * Hiển thị thông báo popup nhanh góc màn hình, tự động ẩn, đồng bộ toàn app
 */

let globalToastTimer = null;

function showToast(message, autoHide = true, duration = 2500) {
  const toastEl = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (!toastEl || !msgEl) return;

  if (globalToastTimer) {
    clearTimeout(globalToastTimer);
    globalToastTimer = null;
  }

  msgEl.innerText = message || "";
  toastEl.classList.add("show");

  if (autoHide) {
    globalToastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      globalToastTimer = null;
    }, duration);
  }
}

function hideToast() {
  const toastEl = document.getElementById("toast");
  if (globalToastTimer) {
    clearTimeout(globalToastTimer);
    globalToastTimer = null;
  }
  if (toastEl) {
    toastEl.classList.remove("show");
  }
}

function showSuccessToast(message, duration = 2500) {
  showToast(`✨ ${message}`, true, duration);
}

function showErrorToast(message, duration = 4000) {
  showToast(`❌ ${message}`, true, duration);
}

function showWarningToast(message, duration = 3000) {
  showToast(`⚠️ ${message}`, true, duration);
}

if (typeof window !== "undefined") {
  window.showToast = showToast;
  window.hideToast = hideToast;
  window.showSuccessToast = showSuccessToast;
  window.showErrorToast = showErrorToast;
  window.showWarningToast = showWarningToast;
}
