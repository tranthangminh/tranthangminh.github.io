/**
 * Shared Date Helpers for Harry Perfume Extension
 * Single Source of Truth cho: Tab Nước hoa, Tab Đơn hàng, Tab Nhập hàng, Tab Bảng tin
 */

// Lấy chuỗi ngày hôm nay theo định dạng DD/MM/YYYY
function getTodayDateStr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

// Chuyển chuỗi ngày đa định dạng thành timestamp miligiây để so sánh chính xác
function parseDateValue(dateStr) {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  // 1. Dạng chuẩn DD/MM/YYYY hoặc DD-MM-YYYY kèm giờ:phút:giây
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    return new Date(
      parseInt(m[3], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[1], 10),
      m[4] ? parseInt(m[4], 10) : 0,
      m[5] ? parseInt(m[5], 10) : 0,
      m[6] ? parseInt(m[6], 10) : 0
    ).getTime();
  }
  // 2. Dạng ISO YYYY-MM-DD
  const mIso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (mIso) {
    return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
  }
  // 3. Dạng rút gọn DD/MM (tự động lấy năm hiện tại)
  const mShort = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (mShort) {
    return new Date(new Date().getFullYear(), parseInt(mShort[2], 10) - 1, parseInt(mShort[1], 10)).getTime();
  }
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

// So sánh 2 chuỗi ngày (Dùng để sort giảm dần: ngày mới hơn lên trước)
function compareDateStringsDesc(a, b) {
  return parseDateValue(b) - parseDateValue(a);
}

// Sắp xếp mảng đối tượng theo trường ngày giảm dần
function sortItemsByDateDesc(items, dateField = "ngay") {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const valA = a ? a[dateField] : "";
    const valB = b ? b[dateField] : "";
    return compareDateStringsDesc(valA, valB);
  });
}

// Kiểm tra xem chuỗi ngày có phải là hôm nay không
function isTodayDate(dateStr) {
  return String(dateStr).trim() === getTodayDateStr();
}

if (typeof window !== "undefined") {
  window.getTodayDateStr = getTodayDateStr;
  window.parseDateValue = parseDateValue;
  window.compareDateStringsDesc = compareDateStringsDesc;
  window.sortItemsByDateDesc = sortItemsByDateDesc;
  window.isTodayDate = isTodayDate;
}
