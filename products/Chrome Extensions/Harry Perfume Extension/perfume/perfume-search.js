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
  
  performSearch(keyword);
  scrollToTop();
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

// Xử lý ẩn/hiện giá
const hidePrices = localStorage.getItem("hidePrices") === "true";
if (hidePrices) {
  searchResult.classList.add("prices-hidden");
  btnTogglePrice.classList.add("prices-off");
}

btnTogglePrice.addEventListener("click", () => {
  const isHidden = searchResult.classList.toggle("prices-hidden");
  btnTogglePrice.classList.toggle("prices-off", isHidden);
  localStorage.setItem("hidePrices", isHidden ? "true" : "false");
});
