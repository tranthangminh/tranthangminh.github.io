/**
 * Shared Mini Window & Panel Controller for Harry Perfume Extension
 * Điều khiển mở Extension dạng Cửa sổ Mini Window độc lập hoặc Side Panel
 */

const MINI_WINDOW_DEFAULTS = {
  width: 420,
  height: 720
};

// Kiểm tra xem trang hiện tại có đang chạy trong cửa sổ Mini Window (Popup) hay không
function isRunningInMiniWindow() {
  if (typeof window === "undefined") return false;
  // Cửa sổ popup thường không có chrome.sidePanel gắn trực tiếp và có window.opener hoặc thanh địa chỉ tối giản
  return window.location.search.includes("mode=mini") || window.innerWidth <= 450;
}

// Mở Extension dưới dạng cửa sổ Mini Window độc lập
function openMiniWindow(options = {}) {
  const width = options.width || MINI_WINDOW_DEFAULTS.width;
  const height = options.height || MINI_WINDOW_DEFAULTS.height;
  const url = chrome && chrome.runtime ? chrome.runtime.getURL("panel.html?mode=mini") : "panel.html?mode=mini";

  if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.create) {
    chrome.windows.create({
      url: url,
      type: "popup",
      width: width,
      height: height,
      focused: true
    }).catch(err => {
      // Fallback nếu không có quyền chrome.windows
      window.open(url, "HarryPerfumeMiniWindow", `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
    });
  } else {
    window.open(url, "HarryPerfumeMiniWindow", `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
  }
}

if (typeof window !== "undefined") {
  window.isRunningInMiniWindow = isRunningInMiniWindow;
  window.openMiniWindow = openMiniWindow;
  window.MINI_WINDOW_DEFAULTS = MINI_WINDOW_DEFAULTS;
}
