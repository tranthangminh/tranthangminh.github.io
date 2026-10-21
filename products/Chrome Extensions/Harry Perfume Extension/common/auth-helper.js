/**
 * Shared Admin Auth Helper for Harry Perfume Extension
 * Quản lý phiên đăng nhập Quản Trị Viên & Tên tài khoản Admin
 */

// Kiểm tra quyền Quản trị viên
async function checkIsAdminLoggedIn() {
  if (typeof StorageHelper !== "undefined") {
    try {
      return await StorageHelper.get("isAdminLoggedIn", false);
    } catch (e) {
      return false;
    }
  }
  return false;
}

// Lấy tên tài khoản Admin đang đăng nhập (Quân / Minh / Dương)
async function getCurrentAdminUser() {
  if (typeof StorageHelper !== "undefined") {
    try {
      const stored = await StorageHelper.get("currentAdminUser", "Dương");
      if (stored) {
        const norm = String(stored).toLowerCase();
        if (norm.includes("quan")) return "Quân";
        if (norm.includes("minh")) return "Minh";
        return "Dương";
      }
    } catch (e) {}
  }
  return "Dương";
}

// Thiết lập phiên Admin đăng nhập thành công
async function setAdminLoginSession(username) {
  if (typeof StorageHelper !== "undefined") {
    await StorageHelper.set("isAdminLoggedIn", true);
    await StorageHelper.set("currentAdminUser", username);
  }
}

// Đăng xuất Admin
async function clearAdminLoginSession() {
  if (typeof StorageHelper !== "undefined") {
    await StorageHelper.set("isAdminLoggedIn", false);
    await StorageHelper.remove("currentAdminUser");
  }
}

if (typeof window !== "undefined") {
  window.checkIsAdminLoggedIn = checkIsAdminLoggedIn;
  window.getCurrentAdminUser = getCurrentAdminUser;
  window.setAdminLoginSession = setAdminLoginSession;
  window.clearAdminLoginSession = clearAdminLoginSession;
}
