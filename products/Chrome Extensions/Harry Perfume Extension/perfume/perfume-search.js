// Tính năng Tìm kiếm Nước Hoa (Perfume Search Logic)

// Tìm kiếm nước hoa (fuzzy: tách từ khóa theo khoảng trắng)
function performSearch(keyword) {
  const normalizedKeyword = removeAccents(keyword).trim();
  
  if (!normalizedKeyword) {
    renderList(allProducts);
    return;
  }
  
  const tokens = normalizedKeyword.split(/\s+/).filter(t => t.length > 0);
  
  const filtered = allProducts.filter(prod => {
    const displayName = getProductDisplayName(prod);
    const normalizedDisplay = removeAccents(displayName);
    const normalizedName = removeAccents(prod.name);
    const normalizedShort = removeAccents(prod.tenrutgon);
    
    // Kết hợp mọi thông tin tên để tìm kiếm bao phủ toàn diện
    const combinedStr = `${normalizedDisplay} ${normalizedName} ${normalizedShort}`;
    return tokens.every(token => combinedStr.includes(token));
  });
  
  renderList(filtered);
}

const debouncedPerformSearch = typeof debounce === "function"
  ? debounce((kw) => {
      performSearch(kw);
      scrollToTop();
    }, 150)
  : (kw) => {
      performSearch(kw);
      scrollToTop();
    };

// Sự kiện Tìm kiếm
searchBox.addEventListener("input", (e) => {
  const keyword = e.target.value;
  
  if (keyword.length > 0) {
    btnClear.style.display = "block";
  } else {
    btnClear.style.display = "none";
  }
  
  detailView.style.display = "none";
  searchResult.style.display = "block";
  btnBack.style.display = "none";
  
  debouncedPerformSearch(keyword);
});

// Nút xóa tìm kiếm
btnClear.addEventListener("click", () => {
  searchBox.value = "";
  btnClear.style.display = "none";
  searchBox.focus();
  
  detailView.style.display = "none";
  searchResult.style.display = "block";
  btnBack.style.display = "none";
  performSearch("");
  scrollToTop();
});

// Nút quay lại danh sách
btnBack.addEventListener("click", () => {
  detailView.style.display = "none";
  searchResult.style.display = "block";
  btnBack.style.display = "none";
  
  if (typeof updateProductCount === "function") {
    const visibleCount = searchResult.querySelectorAll(".search-item").length;
    updateProductCount(visibleCount, allProducts.length);
  }
  
  scrollToTop();
});

// Xử lý ẩn/hiện giá (Single Source of Truth qua StorageHelper & DEFAULT_SETTINGS)
(async function initHidePrices() {
  const defaultVal = typeof DEFAULT_SETTINGS !== "undefined" ? DEFAULT_SETTINGS.hidePrices : false;
  const hidePrices = await StorageHelper.get("hidePrices", defaultVal);
  if (hidePrices) {
    searchResult.classList.add("prices-hidden");
    btnTogglePrice.classList.add("prices-off");
  }
})();

btnTogglePrice.addEventListener("click", async () => {
  const isHidden = searchResult.classList.toggle("prices-hidden");
  btnTogglePrice.classList.toggle("prices-off", isHidden);
  await StorageHelper.set("hidePrices", isHidden);
});

// Xử lý bật/tắt xem Giá Vốn (Chỉ dành cho Quản Trị Viên)
const btnToggleCostPrice = document.getElementById("btnToggleCostPrice");
if (btnToggleCostPrice) {
  btnToggleCostPrice.addEventListener("click", () => {
    window.isCostPriceMode = !window.isCostPriceMode;
    btnToggleCostPrice.classList.toggle("active", window.isCostPriceMode);

    if (window.isCostPriceMode) {
      // Khi bật xem giá vốn, nếu giá đang bị ẩn thì tự động gỡ ẩn để xem
      if (searchResult && searchResult.classList.contains("prices-hidden")) {
        searchResult.classList.remove("prices-hidden");
        if (btnTogglePrice) btnTogglePrice.classList.remove("prices-off");
        StorageHelper.set("hidePrices", false);
      }
      btnToggleCostPrice.setAttribute("title", "Đang xem Giá Vốn (Click để quay lại Giá Bán)");
      if (typeof showToast === "function") {
        showToast("💎 Chế độ Quản trị: Đang hiển thị GIÁ VỐN");
      }
    } else {
      btnToggleCostPrice.setAttribute("title", "Xem Giá Vốn (Quản trị)");
      if (typeof showToast === "function") {
        showToast("✨ Đã quay lại GIÁ BÁN niêm yết");
      }
    }

    if (typeof window.refreshPerfumeView === "function") {
      window.refreshPerfumeView();
    }
  });
}

