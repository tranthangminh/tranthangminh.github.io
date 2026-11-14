let allProducts = [];
let currentProduct = null;

// Khai báo các phần tử DOM dùng chung
const searchBox = document.getElementById("searchBox");
const btnClear = document.getElementById("btnClear");
const btnRefresh = document.getElementById("btnRefresh");
const btnThemeToggle = document.getElementById("btnThemeToggle");
const btnRetry = document.getElementById("btnRetry");
const btnBack = document.getElementById("btnBack");

const loadingView = document.getElementById("loadingView");
const errorView = document.getElementById("errorView");
const errorText = document.getElementById("errorText");
const searchResult = document.getElementById("searchResult");
const detailView = document.getElementById("detailView");

// (Các hàm cleanString, removeAccents, escHtml, formatters, toast được nạp từ common/ - Single Source of Truth)

// Hàm tính tổng số lượng tồn kho (Fullbox 1->5 & Gốc 1->5)
function getProductTotalStock(prod) {
  let totalStock = 0;
  let hasValidStock = false;
  for (let i = 1; i <= 5; i++) {
    const rawVal = cleanString(prod['tonkhofull' + i]);
    if (rawVal && rawVal !== "-") {
      const num = parseInt(rawVal, 10);
      if (!isNaN(num)) {
        totalStock += num;
        hasValidStock = true;
      }
    }
    const rawGoc = cleanString(prod['tonkhogoc' + i]);
    if (rawGoc && rawGoc !== "-") {
      const num = parseInt(rawGoc, 10);
      if (!isNaN(num)) {
        totalStock += num;
        hasValidStock = true;
      }
    }
  }
  return {
    total: totalStock,
    hasValid: hasValidStock
  };
}

let refreshAbortController = null;
let headerProgressTimer = null;

// Cập nhật thông báo tiến trình 2 dòng ở góc trên bên phải (bên trái nút Refresh)
function updateHeaderProgress(line1, line2, type = "normal", autoHideMs = 0) {
  const headerProgress = document.getElementById("headerProgress");
  const progressLine1 = document.getElementById("progressLine1");
  const progressLine2 = document.getElementById("progressLine2");
  
  if (!headerProgress || !progressLine1 || !progressLine2) return;
  
  if (headerProgressTimer) {
    clearTimeout(headerProgressTimer);
    headerProgressTimer = null;
  }

  if (!line1 && !line2) {
    headerProgress.style.display = "none";
    return;
  }

  progressLine1.innerText = line1 || "";
  progressLine2.innerText = line2 || "";
  
  headerProgress.classList.remove("is-error", "is-success");
  if (type === "error") {
    headerProgress.classList.add("is-error");
  } else if (type === "success") {
    headerProgress.classList.add("is-success");
  }
  
  headerProgress.style.display = "flex";

  if (autoHideMs > 0) {
    headerProgressTimer = setTimeout(() => {
      headerProgress.style.display = "none";
      headerProgressTimer = null;
    }, autoHideMs);
  }
}

// Reset nút Refresh về trạng thái ban đầu (giữ lại trạng thái lỗi nếu trước đó bị thất bại)
function resetRefreshButtonUI(isFailed = false) {
  if (btnRefresh) {
    btnRefresh.classList.remove("is-refreshing");
    if (isFailed) {
      btnRefresh.classList.add("refresh-failed");
      btnRefresh.title = "Lần làm mới gần nhất thất bại - Bấm để thử lại";
    } else {
      btnRefresh.classList.remove("refresh-failed");
      btnRefresh.title = "Làm mới dữ liệu";
    }
  }
}

// Xử lý sự kiện click nút Refresh (Thực hiện làm mới hoặc Hủy làm mới dở dang)
async function handleRefreshButtonClick() {
  if (refreshAbortController) {
    // Nếu đang trong quá trình Refresh -> Hủy làm mới dở dang
    refreshAbortController.abort();
    refreshAbortController = null;
    resetRefreshButtonUI(false);
    updateHeaderProgress("Đã hủy", "Cập nhật", "normal", 3000);
    showToast("🚫 Đã hủy cập nhật dữ liệu!");
    window.hideImportLoadingIndicator();
    return;
  }

  const isAdmin = await StorageHelper.get("isAdminLoggedIn", false);

  refreshAbortController = new AbortController();
  const controller = refreshAbortController;
  if (btnRefresh) {
    btnRefresh.classList.remove("refresh-failed");
    btnRefresh.classList.add("is-refreshing");
    btnRefresh.title = "Đang làm mới... (Bấm để Hủy)";
  }

  try {
    // 1. NẾU LÀ ADMIN: Tải danh sách Nhập ĐẦU TIÊN
    if (isAdmin) {
      updateHeaderProgress("Đang kết nối...", "Google Sheet Nhập", "normal");
      window.showImportLoadingIndicator();
      try {
        await window.fetchImportData(false);
        updateHeaderProgress("Đã tải xong", "Nhập Hàng", "normal", 1200);
      } catch (err) {
        console.warn("Lỗi tải Import trong refresh:", err);
      } finally {
        window.hideImportLoadingIndicator();
      }
    }

    // Người dùng bấm Hủy trong lúc tải Nhập -> không tải tiếp Nước Hoa
    if (refreshAbortController !== controller) return;

    // 2. TIẾP THEO: Tải danh sách Nước Hoa
    updateHeaderProgress("Đang kết nối...", "Google WebApp", "normal");
    await fetchSheetData();
  } catch (err) {
    console.error("Lỗi làm mới:", err);
    resetRefreshButtonUI(true);
  }
}

// Hàm tải dữ liệu từ Google Sheet Web App (Hỗ trợ Tiến trình thật 100% theo KB & số dòng)
async function fetchSheetData() {
  const isSilent = allProducts.length > 0;
  
  if (!refreshAbortController) {
    refreshAbortController = new AbortController();
  }
  const controller = refreshAbortController;
  if (btnRefresh) {
    btnRefresh.classList.remove("refresh-failed");
    btnRefresh.classList.add("is-refreshing");
    btnRefresh.title = "Đang làm mới... (Bấm để Hủy)";
  }
  updateHeaderProgress("Đang kết nối...", "Google WebApp", "normal");

  if (!isSilent) {
    searchResult.style.display = "none";
    detailView.style.display = "none";
    errorView.style.display = "none";
    loadingView.style.display = "flex";
    btnBack.style.display = "none";
  }
  
  try {
    const response = await fetch(`${PRODUCTS_API_URL}?t=${Date.now()}`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = null;
    let estimatedBytes = (await StorageHelper.get("lastPayloadSizeBytes", 0)) || 0;

    if (response.body && typeof response.body.getReader === "function") {
      // Đọc dạng Stream để cập nhật dung lượng KB nhận thực tế từng gói tin
      const reader = response.body.getReader();
      const contentLengthHeader = response.headers.get("Content-Length");
      let totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : estimatedBytes;
      let receivedBytes = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        const recKB = Math.round(receivedBytes / 1024);
        if (totalBytes > 0) {
          const totKB = Math.round(totalBytes / 1024);
          updateHeaderProgress("Đang tải dữ liệu", `${recKB} KB / ${totKB} KB`, "normal");
        } else {
          updateHeaderProgress("Đang tải dữ liệu", `${recKB} KB`, "normal");
        }
      }

      // Lưu lại kích thước nhận thực tế lần này để làm mốc ước tính chuẩn cho lần sau
      if (receivedBytes > 0) {
        await StorageHelper.set("lastPayloadSizeBytes", receivedBytes);
      }

      const chunksAll = new Uint8Array(receivedBytes);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      const jsonText = new TextDecoder("utf-8").decode(chunksAll);
      data = JSON.parse(jsonText);
    } else {
      data = await response.json();
    }

    if (data.error) {
      throw new Error(data.error);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Dữ liệu rỗng hoặc không hợp lệ");
    }

    // Tiến trình kiểm tra Data từng dòng sản phẩm thực tế (Real Row Validation Progress)
    const totalRows = data.length;
    let hasValidPrice5ml = false;

    updateHeaderProgress("Kiểm tra Data...", `0/${totalRows} dòng`, "normal");

    for (let i = 0; i < totalRows; i++) {
      const item = data[i];
      if (item && typeof item === "object") {
        const v5ml = cleanString(item.gia5ml);
        if (v5ml !== "" && v5ml !== "-") {
          hasValidPrice5ml = true;
        }
      }

      // Hiển thị tiến trình kiểm tra thực tế theo số dòng
      if (i % 25 === 0 || i === totalRows - 1) {
        updateHeaderProgress("Kiểm tra Data...", `${i + 1}/${totalRows} dòng`, "normal");
      }
    }

    if (!hasValidPrice5ml) {
      resetRefreshButtonUI(true); // Thất bại -> Nút chuyển sang màu đỏ
      updateHeaderProgress("Cột 5ml rỗng", "Giữ data cũ ⚠️", "error", 5000);
      showToast("⚠️ Cột Price 5ml bị rỗng. Đã giữ dữ liệu hiện tại.", true, 4000);
      return;
    }

    // Tải thành công 100% & Dữ liệu hợp lệ -> Tiến hành ghi đè dữ liệu
    allProducts = data;
    await StorageHelper.set("cachedProducts", data);
    syncPromotionsFromProducts(allProducts);

    resetRefreshButtonUI(false);
    updateHeaderProgress("Đã cập nhật", `${totalRows} sản phẩm ✨`, "success", 4000);

    if (isSilent) {
      const isAdminUser = await StorageHelper.get("isAdminLoggedIn", false);
      const toastMsgText = isAdminUser && window.hasImportData()
        ? `✨ Đã làm mới toàn bộ dữ liệu Nhập và ${totalRows} sản phẩm!`
        : `✨ Đã cập nhật thành công ${totalRows} sản phẩm!`;
      showToast(toastMsgText);

      // Cập nhật lại UI hiện tại
      if (detailView.style.display !== "none" && currentProduct) {
        const updated = allProducts.find(p => p.name === currentProduct.name);
        if (updated) {
          currentProduct = updated;
          showDetail(currentProduct);
        }
      }
      refreshStockDisplay();
      if (searchResult.style.display !== "none") {
        performSearch(searchBox.value);
      }
    } else {
      loadingView.style.display = "none";
      searchResult.style.display = "block";
      performSearch(searchBox.value);
    }
    renderNewsTab();
  } catch (error) {
    if (error.name === "AbortError") {
      resetRefreshButtonUI(false);
      updateHeaderProgress("Đã hủy", "Cập nhật", "normal", 3000);
      return;
    }

    resetRefreshButtonUI(true);
    if (isSilent) {
      updateHeaderProgress("Cập nhật lỗi", "Giữ data cũ ⚠️", "error", 5000);
      showToast("⚠️ Không thể làm mới. Đang giữ dữ liệu hiện tại.");
    } else {
      updateHeaderProgress("Tải lỗi", "Kiểm tra mạng ⚠️", "error", 5000);
      loadingView.style.display = "none";
      errorText.innerText = "Không thể kết nối tới Google Sheet. Vui lòng kiểm tra cấu hình Web App hoặc kết nối mạng.";
      errorView.style.display = "flex";
    }
  } finally {
    // Lần tải cũ (đã bị hủy) không được xóa controller của lần tải mới
    if (refreshAbortController === controller) refreshAbortController = null;
  }
}

// Logic copy text sử dụng Clipboard API
async function copyText(text, label) {
  const cleanedText = cleanString(text);
  if (!cleanedText || cleanedText.includes("Chưa có nội dung")) {
    showToast("⚠️ Không có nội dung để sao chép!");
    return;
  }
  
  try {
    await navigator.clipboard.writeText(cleanedText);
    showToast(`✨ Đã sao chép ${label}!`);
  } catch (err) {
    try {
      const el = document.createElement("textarea");
      el.value = cleanedText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast(`✨ Đã sao chép ${label}!`);
    } catch (fallbackErr) {
      showToast("❌ Lỗi sao chép, vui lòng copy thủ công.");
    }
  }
}

// Hàm copy hình ảnh từ URL vào clipboard bằng Canvas
async function copyImage(imgUrl) {
  let objectURL = null;
  try {
    showToast("⏳ Đang xử lý copy ảnh...");
    const response = await fetch(imgUrl);
    const blob = await response.blob();
    
    const img = new Image();
    objectURL = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (pngBlob) => {
        try {
          if (!pngBlob) throw new Error("toBlob failed");
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": pngBlob
            })
          ]);
          showToast("✨ Đã copy ảnh sản phẩm!");
        } catch (err) {
          showToast("❌ Trình duyệt không hỗ trợ copy ảnh.");
        } finally {
          if (objectURL) {
            URL.revokeObjectURL(objectURL);
            objectURL = null;
          }
        }
      }, "image/png");
    };
    
    img.onerror = () => {
      showToast("❌ Lỗi xử lý định dạng ảnh.");
      if (objectURL) {
        URL.revokeObjectURL(objectURL);
        objectURL = null;
      }
    };
    
    img.src = objectURL;
  } catch (error) {
    if (objectURL) {
      URL.revokeObjectURL(objectURL);
      objectURL = null;
    }
    showToast("❌ Không thể copy ảnh (CORS hoặc kết nối lỗi).");
  }
}

// (showToast và hideToast được nạp từ common/toast.js - Single Source of Truth)

// Secret Admin & Modal Đăng nhập / Đăng xuất
const btnSecretAdmin = document.getElementById("btnSecretAdmin");
const loginModal = document.getElementById("loginModal");
const btnCloseLoginModal = document.getElementById("btnCloseLoginModal");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginErrorMsg = document.getElementById("loginErrorMsg");

const logoutModal = document.getElementById("logoutModal");
const btnCloseLogoutModal = document.getElementById("btnCloseLogoutModal");
const btnCancelLogout = document.getElementById("btnCancelLogout");
const btnConfirmLogout = document.getElementById("btnConfirmLogout");

const tabImport = document.getElementById("tabImport");
const tabStats = document.getElementById("tabStats");
const tabMiniTools = document.getElementById("tabMiniTools");
const tabPerfume = document.getElementById("tabPerfume");
const tabNews = document.getElementById("tabNews");
const tabOrder = document.getElementById("tabOrder");
const tabRowSub = document.getElementById("tabRowSub");

const paneImport = document.getElementById("paneImport");
const paneStats = document.getElementById("paneStats");
const paneMiniTools = document.getElementById("paneMiniTools");
const panePerfume = document.getElementById("panePerfume");
const paneNews = document.getElementById("paneNews");
const paneOrder = document.getElementById("paneOrder");

// Kiểm tra trạng thái Đăng nhập Admin
async function checkAdminLoginStatus() {
  try {
    const isLoggedIn = await checkIsAdminLoggedIn();
    const btnToggleCostPrice = document.getElementById("btnToggleCostPrice");
    if (isLoggedIn) {
      if (tabRowSub) tabRowSub.style.display = "flex";
      if (tabImport) tabImport.style.display = "block";
      if (tabStats) tabStats.style.display = "block";
      if (tabMiniTools) tabMiniTools.style.display = "block";
      if (btnToggleCostPrice) btnToggleCostPrice.style.display = "flex";
    } else {
      if (tabRowSub) tabRowSub.style.display = "none";
      if (tabImport) tabImport.style.display = "none";
      if (tabStats) tabStats.style.display = "none";
      if (tabMiniTools) tabMiniTools.style.display = "none";
      if (btnToggleCostPrice) btnToggleCostPrice.style.display = "none";
    }
  } catch (e) {
    // Bỏ qua lỗi nạp quyền admin
  }
}

// Bấm nút bí mật góc trên trái
if (btnSecretAdmin) {
  btnSecretAdmin.addEventListener("click", async (e) => {
    if (e) e.preventDefault();
    const isLoggedIn = await checkIsAdminLoggedIn();
    if (isLoggedIn) {
      openModal(logoutModal);
    } else if (loginModal) {
      if (loginUsername) loginUsername.value = "";
      if (loginPassword) loginPassword.value = "";
      if (loginErrorMsg) loginErrorMsg.style.display = "none";
      openModal(loginModal);
      if (loginUsername) loginUsername.focus();
    }
  });
}

// Đóng modal đăng nhập
if (btnCloseLoginModal && loginModal) {
  btnCloseLoginModal.addEventListener("click", () => {
    closeModal(loginModal);
  });
}

// Đăng nhập Form submit
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = loginUsername ? loginUsername.value.trim() : "";
    const pass = loginPassword ? loginPassword.value.trim() : "";

    // Mật khẩu theo từng tài khoản (tên không phân biệt hoa/thường, có dấu hay không dấu đều được)
    const ADMIN_PASSWORDS = {
      duong: "Skilllioned88@",
      quan: "Skilllioned88@",
      minh: "9002M@xx6991"
    };
    const expectedPass = ADMIN_PASSWORDS[removeAccents(user)];

    if (expectedPass && pass === expectedPass) {
      await setAdminLoginSession(user);
      closeModal(loginModal);
      const btnToggleCostPrice = document.getElementById("btnToggleCostPrice");
      if (btnToggleCostPrice) btnToggleCostPrice.style.display = "flex";
      if (tabRowSub) tabRowSub.style.display = "flex";
      if (tabImport) {
        tabImport.style.display = "block";
        tabImport.click();
      }
      if (tabStats) {
        tabStats.style.display = "block";
      }
      if (tabMiniTools) {
        tabMiniTools.style.display = "block";
      }
      window.fetchImportData(false);
      showToast(`✨ Chào mừng ${user} đăng nhập Quản trị!`);
    } else {
      if (loginErrorMsg) loginErrorMsg.style.display = "block";
    }
  });
}

// Đóng / Hủy modal đăng xuất
if (logoutModal) {
  if (btnCloseLogoutModal) {
    btnCloseLogoutModal.addEventListener("click", () => {
      closeModal(logoutModal);
    });
  }
  if (btnCancelLogout) {
    btnCancelLogout.addEventListener("click", () => {
      closeModal(logoutModal);
    });
  }
}

// Xác nhận Đăng xuất
if (btnConfirmLogout) {
  btnConfirmLogout.addEventListener("click", async () => {
    await clearAdminLoginSession();
    closeModal(logoutModal);
    if (tabRowSub) tabRowSub.style.display = "none";
    if (tabImport) tabImport.style.display = "none";
    if (tabStats) tabStats.style.display = "none";
    if (tabMiniTools) tabMiniTools.style.display = "none";
    const btnToggleCostPrice = document.getElementById("btnToggleCostPrice");
    if (btnToggleCostPrice) {
      btnToggleCostPrice.style.display = "none";
      btnToggleCostPrice.classList.remove("active");
    }
    if (window.isCostPriceMode) {
      window.isCostPriceMode = false;
      window.refreshPerfumeView();
    }
    window.clearImportData(); // Đã gọi luôn clearStatsData()
    await StorageHelper.remove("cachedImportData");
    await StorageHelper.remove("cachedImportLists");
    const isSubTabActive = (tabImport && tabImport.classList.contains("active")) || (tabStats && tabStats.classList.contains("active")) || (tabMiniTools && tabMiniTools.classList.contains("active"));
    if (tabPerfume && isSubTabActive) {
      tabPerfume.click();
    }
    await StorageHelper.set("lastActiveTabId", "tabPerfume");
    showToast("✨ Đã đăng xuất khỏi quyền Quản trị!");
  });
}

// Điều hướng Tab
function switchTab(activeTab, activePane) {
  [tabImport, tabStats, tabMiniTools, tabPerfume, tabNews, tabOrder].forEach(t => {
    if (t) t.classList.remove("active");
  });
  [paneImport, paneStats, paneMiniTools, panePerfume, paneNews, paneOrder].forEach(p => {
    if (p) p.style.display = "none";
  });
  if (activeTab) activeTab.classList.add("active");
  if (activePane) activePane.style.display = "flex";
  if (activeTab && activeTab.id) {
    StorageHelper.set("lastActiveTabId", activeTab.id);
  }
}

if (tabImport) {
  tabImport.addEventListener("click", () => {
    switchTab(tabImport, paneImport);
    window.refreshImportView();
    if (window.hasImportData() === 0) {
      window.fetchImportData(false);
    }
  });
}

if (tabStats) {
  tabStats.addEventListener("click", () => {
    switchTab(tabStats, paneStats);
    window.refreshStatsView();
    if (window.hasImportData() === 0) {
      window.fetchImportData(false);
    }
  });
}

if (tabMiniTools) {
  tabMiniTools.addEventListener("click", () => {
    switchTab(tabMiniTools, paneMiniTools);
    window.refreshMiniToolsView();
  });
}

if (tabPerfume) {
  tabPerfume.addEventListener("click", () => {
    switchTab(tabPerfume, panePerfume);
    const el = document.querySelector(".perfume-scroll-wrapper");
    if (el) el.scrollTop = 0;
  });
}

if (tabNews) {
  tabNews.addEventListener("click", () => {
    switchTab(tabNews, paneNews);
    renderNewsTab();
    const el = document.querySelector(".news-tags-scroll-wrapper");
    if (el) el.scrollTop = 0;
  });
}

if (tabOrder) {
  tabOrder.addEventListener("click", () => {
    switchTab(tabOrder, paneOrder);
    const el = document.querySelector(".order-body-scroll");
    if (el) el.scrollTop = 0;
  });
}

btnRefresh.addEventListener("click", handleRefreshButtonClick);
btnRetry.addEventListener("click", () => fetchSheetData());

// Hàm đọc cache sản phẩm
async function loadCachedProducts() {
  try {
    const cached = await StorageHelper.get("cachedProducts");
    if (cached && Array.isArray(cached)) {
      allProducts = cached;
      syncPromotionsFromProducts(allProducts);
      return true;
    }
  } catch (e) {
    // Cache lỗi hoặc chưa có dữ liệu
  }
  return false;
}

// ============================================================================
// BỘ ĐIỀU KHIỂN GIAO DIỆN SÁNG / TỐI (THEME CONTROLLER)
// ============================================================================
let currentTheme = "dark";

function applyThemeUI(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  if (document.body) {
    document.body.setAttribute("data-theme", theme);
  }
  // Bản sao đồng bộ cho theme-init.js đọc trước khi trang vẽ (chrome.storage là bất đồng bộ)
  try {
    localStorage.setItem("theme", JSON.stringify(theme));
  } catch (e) {}

  const btnTheme = document.getElementById("btnThemeToggle");
  if (!btnTheme) return;

  const sunIcon = btnTheme.querySelector(".theme-icon-sun");
  const moonIcon = btnTheme.querySelector(".theme-icon-moon");

  if (theme === "light") {
    // Đang là giao diện Sáng -> Hiển thị biểu tượng Mặt Trăng để bấm chuyển sang Tối
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
    btnTheme.title = "Chuyển sang giao diện Tối (Dark Mode)";
  } else {
    // Đang là giao diện Tối -> Hiển thị biểu tượng Mặt Trời để bấm chuyển sang Sáng
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
    btnTheme.title = "Chuyển sang giao diện Sáng (Light Mode)";
  }
}

async function initTheme() {
  const btnTheme = document.getElementById("btnThemeToggle");
  if (!btnTheme) return;

  currentTheme = await StorageHelper.get("theme", "dark");
  applyThemeUI(currentTheme);

  btnTheme.addEventListener("click", async () => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyThemeUI(nextTheme);
    await StorageHelper.set("theme", nextTheme);
    showToast(nextTheme === "light" ? "☀️ Đã bật giao diện Sáng" : "🌙 Đã bật giao diện Tối");
  });
}

// Kích hoạt đồng bộ dữ liệu
window.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  await checkAdminLoginStatus();
  const hasCache = await loadCachedProducts();
  if (hasCache && allProducts.length > 0) {
    // Có cache thì hiển thị ngay lập tức dữ liệu cũ để xem trước
    loadingView.style.display = "none";
    searchResult.style.display = "block";
    performSearch(searchBox.value);
  }

  // Khôi phục tab mở cuối cùng (Remember Last Active Tab)
  try {
    const lastTabId = await StorageHelper.get("lastActiveTabId", "tabPerfume");
    const isAdmin = await StorageHelper.get("isAdminLoggedIn", false);
    let targetTabId = lastTabId;
    if ((targetTabId === "tabImport" || targetTabId === "tabStats" || targetTabId === "tabMiniTools") && !isAdmin) {
      targetTabId = "tabPerfume";
    }
    const tabEl = document.getElementById(targetTabId);
    if (tabEl) {
      tabEl.click();
    }
  } catch (e) {
    // Bỏ qua lỗi khôi phục tab
  }

  // Mở app lên là thực hiện cập nhật dữ liệu từ Google Sheet ngay lập tức
  fetchSheetData();

  // Tự động làm mới dữ liệu ngầm mỗi 10 phút/lần
  setInterval(() => {
    if (!refreshAbortController) fetchSheetData();
  }, 10 * 60 * 1000);
});