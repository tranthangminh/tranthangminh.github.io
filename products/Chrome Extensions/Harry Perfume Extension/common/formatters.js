/**
 * Shared Formatters & String Helpers for Harry Perfume Extension
 * Single Source of Truth cho: Tab Nước hoa, Tab Đơn hàng, Tab Nhập hàng, Tab Bảng tin
 */

// Hàm chuẩn hóa chuỗi an toàn chống lỗi null / undefined
function cleanString(val) {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

// Hàm chuẩn hóa tiếng Việt không dấu (diacritics-insensitive)
function removeAccents(str) {
  const cleaned = cleanString(str);
  if (!cleaned) return "";
  return cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

// Thoát mã HTML chống lỗi XSS khi nhúng vào innerHTML
function escHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Thoát mã giá trị thuộc tính HTML (data-*, value, title...)
function escAttr(val) {
  if (val === undefined || val === null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Định dạng tiền tệ VNĐ chuẩn có phân cách dấu chấm (Mặc định không kèm đơn vị 'đ' theo Rule Tab Nhập)
function formatMoneyVND(val) {
  if (val === undefined || val === null || val === "" || val === "-") return "0";
  const num = typeof val === "number" ? val : parseInt(String(val).replace(/\D/g, ""), 10);
  if (isNaN(num)) return "0";
  return num.toLocaleString("vi-VN");
}

// Định dạng tiền tệ cho đơn hàng (hỗ trợ kèm hoặc không kèm đơn vị 'đ')
function formatVND(num, withUnit = true) {
  const n = typeof num === "number" ? num : (parseInt(String(num || "0").replace(/\D/g, ""), 10) || 0);
  const formatted = n.toLocaleString("vi-VN");
  return withUnit ? `${formatted}đ` : formatted;
}

// Chuẩn hóa giá nhập vào: "Nhập nhiêu lấy nhiêu" (không x1000, không chứa chữ đ)
function formatInputPrice(rawVal) {
  if (!rawVal) return 0;
  const cleanDigits = String(rawVal).replace(/\D/g, "");
  const num = parseInt(cleanDigits, 10);
  if (isNaN(num) || num < 0) return 0;
  return num;
}

// Trích xuất số nguyên an toàn
function parseNumber(val, defaultVal = 0) {
  if (val === undefined || val === null) return defaultVal;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(num) ? defaultVal : num;
}

// Kiểm tra tính hợp lệ của số điện thoại Việt Nam
function isValidPhoneNumber(phone) {
  const p = String(phone || "").trim();
  if (!p) return true; // Cho phép rỗng khi đang gõ
  if (p.startsWith("+")) {
    return /^\+\d{9,13}$/.test(p);
  }
  return /^0\d{9}$/.test(p);
}

// Chuyển đổi dung lượng byte sang KB/MB/GB
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Chuẩn hóa giá trị dung tích (VD: 100 -> 100ml)
function formatDungTichValue(val) {
  let s = cleanString(val);
  if (!s || s === "-") return "";
  s = s.replace(/ml$/i, "").trim();
  return s ? s + "ml" : "";
}

// Trì hoãn xử lý cho input/search/drag (Debounce)
function debounce(fn, delay = 200) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

if (typeof window !== "undefined") {
  window.cleanString = cleanString;
  window.removeAccents = removeAccents;
  window.escHtml = escHtml;
  window.escAttr = escAttr;
  window.formatMoneyVND = formatMoneyVND;
  window.formatVND = formatVND;
  window.formatInputPrice = formatInputPrice;
  window.parseNumber = parseNumber;
  window.isValidPhoneNumber = isValidPhoneNumber;
  window.formatBytes = formatBytes;
  window.formatDungTichValue = formatDungTichValue;
  window.debounce = debounce;

  // Tự động ẩn ảnh bị lỗi trên toàn bộ ứng dụng mà không vi phạm CSP (thay thế inline onerror)
  window.addEventListener("error", (e) => {
    if (e.target && e.target.tagName === "IMG") {
      e.target.style.display = "none";
    }
  }, true);
}
