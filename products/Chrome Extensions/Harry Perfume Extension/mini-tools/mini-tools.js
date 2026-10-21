/**
 * Mini Tools Controller for Harry Perfume Extension
 * Module quản lý các công cụ tiện ích quản trị
 */

let costCheckerWindowId = null;

function initMiniToolsModule() {
  const card = document.getElementById("cardToolCostChecker");
  const btn = document.getElementById("btnLaunchCostChecker");

  // Đăng ký lắng nghe khi cửa sổ bị đóng để reset ID
  if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.onRemoved) {
    chrome.windows.onRemoved.addListener((removedId) => {
      if (removedId === costCheckerWindowId) {
        costCheckerWindowId = null;
      }
    });
  }

  const openCostChecker = async () => {
    const url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL("mini-tools/cost-checker.html")
      : "mini-tools/cost-checker.html";

    // Kích thước cửa sổ hình vuông: cao = ngang (chuẩn 900x900px, tự co giãn theo màn hình)
    const targetSquareSize = 900;
    const screenAvailW = (window.screen && window.screen.availWidth) ? window.screen.availWidth : 1920;
    const screenAvailH = (window.screen && window.screen.availHeight) ? window.screen.availHeight : 1080;
    const squareSize = Math.max(760, Math.min(targetSquareSize, screenAvailW - 60, screenAvailH - 60));

    const width = squareSize;
    const height = squareSize;
    const left = Math.max(0, Math.round((screenAvailW - width) / 2));
    const top = Math.max(0, Math.round((screenAvailH - height) / 2));

    // Đảm bảo CHỈ DUY NHẤT 1 CỬA SỔ tồn tại cùng lúc
    if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.create) {
      // 1. Kiểm tra windowId đã lưu
      if (costCheckerWindowId !== null) {
        try {
          const existingWin = await chrome.windows.get(costCheckerWindowId);
          if (existingWin) {
            await chrome.windows.update(costCheckerWindowId, { focused: true });
            return;
          }
        } catch (e) {
          costCheckerWindowId = null;
        }
      }

      // 2. Tìm kiếm trong tất cả tabs xem có tab cost-checker nào đang mở không
      try {
        if (chrome.tabs && chrome.tabs.query) {
          const tabs = await chrome.tabs.query({});
          const targetTab = tabs.find(t => t.url && t.url.includes("cost-checker.html"));
          if (targetTab && targetTab.windowId) {
            costCheckerWindowId = targetTab.windowId;
            await chrome.windows.update(targetTab.windowId, { focused: true });
            await chrome.tabs.update(targetTab.id, { active: true });
            return;
          }
        }
      } catch (e) {}

      // 3. Nếu chưa mở, tạo mới và lưu lại ID
      chrome.windows.create({
        url: url,
        type: "popup",
        width: width,
        height: height,
        left: left,
        top: top,
        focused: true
      }, (createdWin) => {
        if (createdWin) {
          costCheckerWindowId = createdWin.id;
        }
      });
    } else {
      // Web fallback: sử dụng cùng window name 'CostCheckerWindow' để không mở trùng lặp
      const win = window.open(url, "CostCheckerWindow", `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);
      if (win) {
        win.focus();
      }
    }
  };

  if (card) {
    card.addEventListener("click", openCostChecker);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCostChecker();
      }
    });
  }

  // Khởi tạo các thẻ liên kết trang web bên ngoài
  const linkCards = document.querySelectorAll(".mini-tool-card[data-url]");
  linkCards.forEach((lCard) => {
    const handleOpenLink = () => {
      const url = lCard.getAttribute("data-url");
      if (!url) return;
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
      } else {
        window.open(url, "_blank");
      }
    };

    lCard.addEventListener("click", handleOpenLink);
    lCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpenLink();
      }
    });
  });
}

function refreshMiniToolsView() {
  // Hook được kích hoạt khi chuyển sang tab Mini Tools
}

document.addEventListener("DOMContentLoaded", initMiniToolsModule);

if (typeof window !== "undefined") {
  window.refreshMiniToolsView = refreshMiniToolsView;
}
