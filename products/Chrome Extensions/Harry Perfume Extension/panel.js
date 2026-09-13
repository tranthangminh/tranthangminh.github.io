// DÁN LINK URL WEB APP BẠN NHẬN ĐƯỢC Ở BƯỚC 1 VÀO ĐÂY
const API_URL = "https://script.google.com/macros/s/AKfycbz5_hZe3O6FrrF21tPhZX0oB9Hm9oelGcwUHXGcDfnraNQTjnr-cYEqnZMwe-4VnLJC/exec";

let allProducts = [];
let currentProduct = null;

// Khai báo các phần tử DOM dùng chung
const searchBox = document.getElementById("searchBox");
const btnClear = document.getElementById("btnClear");
const btnRefresh = document.getElementById("btnRefresh");
const btnRetry = document.getElementById("btnRetry");
const btnBack = document.getElementById("btnBack");

const loadingView = document.getElementById("loadingView");
const errorView = document.getElementById("errorView");
const errorText = document.getElementById("errorText");
const searchResult = document.getElementById("searchResult");
const detailView = document.getElementById("detailView");

const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// Hàm chuẩn hóa chuỗi an toàn chống lỗi kiểu dữ liệu
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
let toastTimer = null;
let smoothProgressInterval = null;
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

// Dừng timer làm mịn tiến trình
function stopSmoothProgress() {
  if (smoothProgressInterval) {
    clearInterval(smoothProgressInterval);
    smoothProgressInterval = null;
  }
}

// Xử lý sự kiện click nút Refresh (Thực hiện làm mới hoặc Hủy làm mới dở dang)
function handleRefreshButtonClick() {
  if (refreshAbortController) {
    // Nếu đang trong quá trình Refresh -> Hủy làm mới dở dang
    refreshAbortController.abort();
    refreshAbortController = null;
    stopSmoothProgress();
    resetRefreshButtonUI(false);
    updateHeaderProgress("Đã hủy", "Cập nhật", "normal", 3000);
    showToast("🚫 Đã hủy cập nhật dữ liệu!");
    return;
  }
  fetchSheetData();
}

// Hàm tải dữ liệu từ Google Sheet Web App (Hỗ trợ Tiến trình thật 100% theo KB & số dòng)
async function fetchSheetData() {
  const isSilent = allProducts.length > 0;
  
  refreshAbortController = new AbortController();
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
    const signal = refreshAbortController ? refreshAbortController.signal : undefined;
    const response = await fetch(`${API_URL}?t=${Date.now()}`, { signal });
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
      refreshAbortController = null;
      resetRefreshButtonUI(true); // Thất bại -> Nút chuyển sang màu đỏ
      updateHeaderProgress("Cột 5ml rỗng", "Giữ data cũ ⚠️", "error", 5000);
      showToast("⚠️ Cột Price 5ml bị rỗng. Đã giữ dữ liệu hiện tại.", true, 4000);
      return;
    }

    // Tải thành công 100% & Dữ liệu hợp lệ -> Tiến hành ghi đè dữ liệu
    allProducts = data;
    await StorageHelper.set("cachedProducts", data);

    if (isSilent) {
      refreshAbortController = null;
      resetRefreshButtonUI(false); // Thành công -> Nút bình thường
      updateHeaderProgress("Đã cập nhật", `${totalRows} sản phẩm ✨`, "success", 4000);
      showToast(`✨ Đã cập nhật thành công ${totalRows} sản phẩm!`);

      // Cập nhật lại UI hiện tại
      if (detailView.style.display !== "none" && currentProduct) {
        const updated = allProducts.find(p => p.name === currentProduct.name);
        if (updated) {
          currentProduct = updated;
          if (typeof showDetail === "function") showDetail(currentProduct);
        }
      }
      if (typeof refreshStockDisplay === "function") {
        refreshStockDisplay();
      }
      if (searchResult.style.display !== "none") {
        performSearch(searchBox.value);
      }
      if (typeof renderNewsTab === "function") {
        renderNewsTab();
      }
    } else {
      loadingView.style.display = "none";
      searchResult.style.display = "block";
      performSearch(searchBox.value);
      if (typeof renderNewsTab === "function") {
        renderNewsTab();
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      refreshAbortController = null;
      resetRefreshButtonUI(false);
      updateHeaderProgress("Đã hủy", "Cập nhật", "normal", 3000);
      return;
    }

    if (isSilent) {
      refreshAbortController = null;
      resetRefreshButtonUI(true); // Thất bại -> Nút chuyển sang màu đỏ
      updateHeaderProgress("Cập nhật lỗi", "Giữ data cũ ⚠️", "error", 5000);
      showToast("⚠️ Không thể làm mới. Đang giữ dữ liệu hiện tại.");
    } else {
      loadingView.style.display = "none";
      errorText.innerText = "Không thể kết nối tới Google Sheet. Vui lòng kiểm tra cấu hình Web App hoặc kết nối mạng.";
      errorView.style.display = "flex";
    }
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
  try {
    showToast("⏳ Đang xử lý copy ảnh...");
    const response = await fetch(imgUrl);
    const blob = await response.blob();
    
    const img = new Image();
    const objectURL = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (pngBlob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": pngBlob
            })
          ]);
          showToast("✨ Đã copy ảnh sản phẩm!");
          URL.revokeObjectURL(objectURL);
        } catch (err) {
          showToast("❌ Trình duyệt không hỗ trợ copy ảnh.");
        }
      }, "image/png");
    };
    
    img.onerror = () => {
      showToast("❌ Lỗi xử lý định dạng ảnh.");
      URL.revokeObjectURL(objectURL);
    };
    
    img.src = objectURL;
  } catch (error) {
    showToast("❌ Không thể copy ảnh (CORS hoặc kết nối lỗi).");
  }
}

// Hàm hiển thị Toast thông báo (Hỗ trợ tự động ẩn hoặc duy trì tiến trình)
function showToast(message, autoHide = true, duration = 2000) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastMsg.innerText = message;
  toast.classList.add("show");
  
  if (autoHide) {
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      toastTimer = null;
    }, duration);
  }
}

function hideToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toast.classList.remove("show");
}

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
const tabPerfume = document.getElementById("tabPerfume");
const tabNews = document.getElementById("tabNews");
const tabOrder = document.getElementById("tabOrder");

const paneImport = document.getElementById("paneImport");
const panePerfume = document.getElementById("panePerfume");
const paneNews = document.getElementById("paneNews");
const paneOrder = document.getElementById("paneOrder");

// Kiểm tra trạng thái Đăng nhập Admin
async function checkAdminLoginStatus() {
  try {
    const isLoggedIn = await StorageHelper.get("isAdminLoggedIn", false);
    if (isLoggedIn && tabImport) {
      tabImport.style.display = "block";
    }
  } catch (e) {}
}

// Bấm nút bí mật góc trên trái
if (btnSecretAdmin) {
  btnSecretAdmin.addEventListener("click", async (e) => {
    if (e) e.preventDefault();
    const isLoggedIn = await StorageHelper.get("isAdminLoggedIn", false);
    if (isLoggedIn) {
      if (logoutModal) logoutModal.style.display = "flex";
    } else if (loginModal) {
      if (loginUsername) loginUsername.value = "";
      if (loginPassword) loginPassword.value = "";
      if (loginErrorMsg) loginErrorMsg.style.display = "none";
      loginModal.style.display = "flex";
      if (loginUsername) loginUsername.focus();
    }
  });
}

// Đóng modal đăng nhập
if (btnCloseLoginModal && loginModal) {
  btnCloseLoginModal.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
}

// Đăng nhập Form submit
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = loginUsername ? loginUsername.value.trim() : "";
    const pass = loginPassword ? loginPassword.value.trim() : "";

    if (user === "harryparfym" && pass === "Skilllioned88@") {
      await StorageHelper.set("isAdminLoggedIn", true);
      if (loginModal) loginModal.style.display = "none";
      if (tabImport) {
        tabImport.style.display = "block";
        tabImport.click();
      }
      showToast("✨ Đăng nhập Quản trị thành công!");
    } else {
      if (loginErrorMsg) loginErrorMsg.style.display = "block";
    }
  });
}

// Đóng / Hủy modal đăng xuất
if (logoutModal) {
  if (btnCloseLogoutModal) {
    btnCloseLogoutModal.addEventListener("click", () => {
      logoutModal.style.display = "none";
    });
  }
  if (btnCancelLogout) {
    btnCancelLogout.addEventListener("click", () => {
      logoutModal.style.display = "none";
    });
  }
}

// Xác nhận Đăng xuất
if (btnConfirmLogout) {
  btnConfirmLogout.addEventListener("click", async () => {
    await StorageHelper.set("isAdminLoggedIn", false);
    if (logoutModal) logoutModal.style.display = "none";
    if (tabImport) tabImport.style.display = "none";
    if (tabPerfume && tabImport && tabImport.classList.contains("active")) {
      tabPerfume.click();
    }
    showToast("✨ Đã đăng xuất khỏi quyền Quản trị!");
  });
}

// Điều hướng Tab
function switchTab(activeTab, activePane) {
  [tabImport, tabPerfume, tabNews, tabOrder].forEach(t => {
    if (t) t.classList.remove("active");
  });
  [paneImport, panePerfume, paneNews, paneOrder].forEach(p => {
    if (p) p.style.display = "none";
  });
  if (activeTab) activeTab.classList.add("active");
  if (activePane) activePane.style.display = "flex";
}

if (tabImport) {
  tabImport.addEventListener("click", () => {
    switchTab(tabImport, paneImport);
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
    if (typeof renderNewsTab === "function") renderNewsTab();
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
      return true;
    }
  } catch (e) {}
  return false;
}

// Hàm tự động cập nhật tồn kho định kỳ — không ảnh hưởng nút Refresh thủ công
async function fetchStockOnly() {
  if (allProducts.length === 0) return; // Chưa có dữ liệu thì bỏ qua
  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!response.ok) return;
    const freshData = await response.json();
    if (!Array.isArray(freshData)) return;
    
    // Cập nhật tồn kho cho từng sản phẩm
    let changed = false;
    freshData.forEach(item => {
      const prod = allProducts.find(p => p.name === item.name);
      if (prod) {
        for (let i = 1; i <= 5; i++) {
          const key = 'tonkhofull' + i;
          if (prod[key] !== item[key]) {
            prod[key] = item[key];
            changed = true;
          }
        }
      }
    });
    
    if (changed) {
      // Lưu lại cache với tonkho mới
      await StorageHelper.set("cachedProducts", allProducts);
      // Cập nhật UI hiện tại mà không reload toàn bộ
      if (typeof refreshStockDisplay === "function") refreshStockDisplay();
    }
  } catch(e) {}
}

// Kích hoạt đồng bộ dữ liệu
window.addEventListener("DOMContentLoaded", async () => {
  await checkAdminLoginStatus();
  const hasCache = await loadCachedProducts();
  if (hasCache && allProducts.length > 0) {
    // Có cache thì hiển thị ngay lập tức dữ liệu cũ để xem trước
    loadingView.style.display = "none";
    searchResult.style.display = "block";
    performSearch(searchBox.value);
  }

  // Mở app lên là thực hiện cập nhật dữ liệu từ Google Sheet ngay lập tức
  fetchSheetData();

  // Tự động làm mới dữ liệu ngầm mỗi 10 phút/lần
  setInterval(fetchSheetData, 10 * 60 * 1000);
});