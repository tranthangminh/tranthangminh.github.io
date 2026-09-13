// Lịch sử xem gần đây Nước Hoa (Perfume Recent History Logic)

// DOM cho dải lịch sử
const recentBar  = document.getElementById("recentBar");
const recentList = document.getElementById("recentList");

const RECENT_KEY = "recentProducts";
const RECENT_MAX = 5;

async function saveToRecent(prod) {
  let history = (await StorageHelper.get(RECENT_KEY, [])) || [];
  history = history.filter(p => p.name !== prod.name);
  history.unshift({ name: prod.name, img: prod.img });
  if (history.length > RECENT_MAX) history = history.slice(0, RECENT_MAX);
  await StorageHelper.set(RECENT_KEY, history);
}

async function deleteFromRecent(productName) {
  let history = (await StorageHelper.get(RECENT_KEY, [])) || [];
  history = history.filter(p => p.name !== productName);
  await StorageHelper.set(RECENT_KEY, history);
  await renderRecentBar();
}

async function renderRecentBar() {
  let history = (await StorageHelper.get(RECENT_KEY, [])) || [];
  if (!Array.isArray(history) || history.length === 0) { recentBar.style.display = "none"; return; }
  recentBar.style.display = "grid";
  recentList.innerHTML = "";
  history.forEach(item => {
    const el = document.createElement("div");
    el.className = "recent-item";
    const imgUrl = cleanString(item.img);
    let imgHTML = "";
    if (imgUrl && imgUrl !== "-" && imgUrl.startsWith("http")) {
      imgHTML = `<img src="${imgUrl}" class="recent-thumb" alt="${cleanString(item.name)}" loading="lazy">`;
    } else {
      imgHTML = `<img src="svg/logo.svg" class="recent-thumb recent-thumb-placeholder" alt="${cleanString(item.name)}">`;
    }
    el.innerHTML = `
      <button class="recent-delete-btn" title="Xóa khỏi lịch sử">✕</button>
      ${imgHTML}
      <span class="recent-name">${cleanString(item.name)}</span>
    `;
    el.querySelector(".recent-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteFromRecent(item.name);
    });
    el.addEventListener("click", () => {
      const full = allProducts.find(p => p.name === item.name);
      if (full) showDetail(full);
    });
    recentList.appendChild(el);
  });
}

// Khởi chạy hiển thị lịch sử xem gần đây ngay sau khi nạp script
renderRecentBar();
