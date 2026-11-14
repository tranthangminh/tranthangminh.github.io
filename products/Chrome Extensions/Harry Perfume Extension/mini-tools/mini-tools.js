/**
 * Mini Tools Controller for Harry Perfume Extension
 * Thẻ công cụ (.mini-tool-card[data-tool-page]) mở cửa sổ popup riêng, mỗi tool chỉ 1 cửa sổ.
 * Thẻ liên kết (.mini-tool-card[data-url]) mở Google Sheet ở tab mới.
 */

const toolWindowIds = {}; // trang tool -> windowId đang mở

// Mở cửa sổ tool hình vuông (cao = ngang, chuẩn 900px, co theo màn hình); đã mở thì chỉ focus lại
async function openToolWindow(page) {
  const screenW = window.screen.availWidth || 1920;
  const screenH = window.screen.availHeight || 1080;
  const size = Math.max(760, Math.min(900, screenW - 60, screenH - 60));
  const left = Math.max(0, Math.round((screenW - size) / 2));
  const top = Math.max(0, Math.round((screenH - size) / 2));

  if (typeof chrome === "undefined" || !chrome.windows) {
    // Chạy ngoài extension: dùng tên cửa sổ cố định để không mở trùng
    const win = window.open(page, page, `width=${size},height=${size},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);
    if (win) win.focus();
    return;
  }

  if (toolWindowIds[page] !== undefined) {
    try {
      await chrome.windows.update(toolWindowIds[page], { focused: true });
      return;
    } catch (e) {
      delete toolWindowIds[page];
    }
  }

  // Cửa sổ có thể được mở từ một panel khác (side panel / mini window): tìm theo URL
  const fileName = page.split("/").pop();
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => t.url && t.url.includes(fileName));
  if (existing) {
    toolWindowIds[page] = existing.windowId;
    await chrome.windows.update(existing.windowId, { focused: true });
    await chrome.tabs.update(existing.id, { active: true });
    return;
  }

  const created = await chrome.windows.create({ url: chrome.runtime.getURL(page), type: "popup", width: size, height: size, left, top, focused: true });
  toolWindowIds[page] = created.id;
}

function initMiniToolsModule() {
  if (typeof chrome !== "undefined" && chrome.windows) {
    chrome.windows.onRemoved.addListener((removedId) => {
      Object.keys(toolWindowIds).forEach(page => {
        if (toolWindowIds[page] === removedId) delete toolWindowIds[page];
      });
    });
  }

  document.querySelectorAll(".mini-tool-card").forEach((card) => {
    const handleOpen = () => {
      const toolPage = card.getAttribute("data-tool-page");
      const url = card.getAttribute("data-url");
      if (toolPage) {
        openToolWindow(toolPage);
      } else if (url) {
        if (typeof chrome !== "undefined" && chrome.tabs) {
          chrome.tabs.create({ url });
        } else {
          window.open(url, "_blank");
        }
      }
    };

    card.addEventListener("click", handleOpen);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
    });
  });
}

// Thẻ có tên bắt đầu bằng "(M)" chỉ dành cho tài khoản Minh: tài khoản khác ẩn hẳn
// (display: none - không thấy, không bấm, không Tab tới được). Áp cho cả thẻ Tools lẫn thẻ Google Sheet.
const OWNER_ONLY_PREFIX = "(M)";

async function applyOwnerOnlyCards() {
  const isMinh = (await checkIsAdminLoggedIn()) && (await getCurrentAdminUser()) === "Minh";
  document.querySelectorAll(".mini-tool-card").forEach((card) => {
    const title = card.querySelector(".tool-card-title").textContent.trim();
    if (title.startsWith(OWNER_ONLY_PREFIX)) {
      card.style.display = isMinh ? "" : "none";
    }
  });
}

// Hook được kích hoạt mỗi lần chuyển sang tab Mini Tools: kiểm tra lại tài khoản đang đăng nhập
function refreshMiniToolsView() {
  return applyOwnerOnlyCards();
}

document.addEventListener("DOMContentLoaded", () => {
  initMiniToolsModule();
  applyOwnerOnlyCards();
});

if (typeof window !== "undefined") {
  window.refreshMiniToolsView = refreshMiniToolsView;
}
