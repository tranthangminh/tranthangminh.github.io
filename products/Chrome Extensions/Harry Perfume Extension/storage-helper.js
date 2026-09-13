// Hằng số trạng thái mặc định (Single Source of Truth)
const DEFAULT_SETTINGS = Object.freeze({
  theme: "dark",
  hidePrices: false,
  lastPayloadSizeBytes: 0
});

// Helper chuyển đổi dung lượng byte sang KB/MB/GB (Quy chuẩn Common Utils)
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Helper escAttr làm sạch chuỗi chống XSS/Injection khi render thuộc tính HTML
function escAttr(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

if (typeof window !== "undefined") {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.formatBytes = formatBytes;
  window.escAttr = escAttr;
}

// StorageHelper: Wrapper giúp đọc/ghi dữ liệu qua chrome.storage.local
// Có fallback tự động sang localStorage nếu chạy ngoài môi trường extension.
const StorageHelper = {
  get: function (key, defaultValue = null) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            resolve(defaultValue);
          } else {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          }
        });
      } else {
        try {
          const val = localStorage.getItem(key);
          resolve(val !== null ? JSON.parse(val) : defaultValue);
        } catch (e) {
          resolve(defaultValue);
        }
      }
    });
  },

  set: function (key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
        resolve();
      }
    });
  },

  remove: function (key) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      } else {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
        resolve();
      }
    });
  }
};
