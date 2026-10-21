// Hằng số trạng thái mặc định (Single Source of Truth)
const DEFAULT_SETTINGS = Object.freeze({
  theme: "dark",
  hidePrices: false,
  lastPayloadSizeBytes: 0
});

if (typeof window !== "undefined") {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}

// StorageHelper: Wrapper giúp đọc/ghi dữ liệu qua chrome.storage.local
// Có fallback tự động sang localStorage nếu chạy ngoài môi trường extension.
const StorageHelper = {
  get: function (key, defaultValue = null) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime?.lastError) {
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
          // Fallback an toàn khi localStorage bị chặn hoặc chuỗi JSON hỏng
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
        } catch (e) {
          // Bỏ qua nếu quota localStorage vượt giới hạn
        }
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
        } catch (e) {
          // Bỏ qua nếu key không tồn tại
        }
        resolve();
      }
    });
  }
};
