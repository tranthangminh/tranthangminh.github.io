// Cấu hình DOM bộ lọc
const btnFilterToggle = document.getElementById("btnFilterToggle");
const filterPanel = document.getElementById("filterPanel");
const filterMinPrice = document.getElementById("filterMinPrice");
const filterMaxPrice = document.getElementById("filterMaxPrice");
const btnClearFilter = document.getElementById("btnClearFilter");
const filterSizeButtons = document.querySelectorAll(".filter-size-btn");
const filterGenderButtons = document.querySelectorAll(".filter-gender-btn");
const filterTagButtons = document.querySelectorAll(".filter-tag-btn");

// DOM thanh tóm tắt bộ lọc
const filterSummaryBar = document.getElementById("filterSummaryBar");
const filterSummaryBadges = document.getElementById("filterSummaryBadges");
const btnResetSummary = document.getElementById("btnResetSummary");

// Trạng thái bộ lọc
let activeFilterSizes = []; // Danh sách dung tích đang chọn
let activeFilterGenders = []; // Danh sách giới tính đang chọn (Nam, Nữ, Unisex)
let activeFilterSeasons = []; // Danh sách mùa đang chọn (xuan, ha, thu, dong)
let activeFilterTimes = []; // Danh sách thời điểm đang chọn (ngay, dem)

// Toggle hiển thị panel bộ lọc
if (btnFilterToggle && filterPanel) {
  btnFilterToggle.addEventListener("click", (e) => {
    const isHidden = filterPanel.style.display === "none";
    filterPanel.style.display = isHidden ? "flex" : "none";
    btnFilterToggle.classList.toggle("active", isHidden);
    updateFilterSummary(); // Cập nhật thanh tóm tắt khi đóng/mở panel
  });

  // Tự động đóng filterPanel khi bấm ra bất kỳ vị trí nào bên ngoài
  document.addEventListener("click", (e) => {
    if (filterPanel.style.display === "none") return;

    const isClickInsidePanel = filterPanel.contains(e.target);
    const isClickOnToggleBtn = btnFilterToggle.contains(e.target);

    if (!isClickInsidePanel && !isClickOnToggleBtn) {
      filterPanel.style.display = "none";
      btnFilterToggle.classList.remove("active");
      updateFilterSummary();
    }
  });
}

// Xử lý sự kiện click trên các nút chọn dung tích
filterSizeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const size = btn.getAttribute("data-size");
    btn.classList.toggle("active");
    
    if (btn.classList.contains("active")) {
      if (!activeFilterSizes.includes(size)) {
        activeFilterSizes.push(size);
      }
    } else {
      activeFilterSizes = activeFilterSizes.filter(s => s !== size);
    }
    
    // Áp dụng bộ lọc
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
});

// Xử lý sự kiện click trên các nút chọn giới tính
filterGenderButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const gender = btn.getAttribute("data-gender");
    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");
    
    if (isActive) {
      if (!activeFilterGenders.includes(gender)) activeFilterGenders.push(gender);
    } else {
      activeFilterGenders = activeFilterGenders.filter(g => g !== gender);
    }
    
    // Áp dụng bộ lọc
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
});

// Xử lý sự kiện click trên các nút chọn mùa/thời điểm
filterTagButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tag = btn.getAttribute("data-tag");
    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");
    
    if (["xuan", "ha", "thu", "dong"].includes(tag)) {
      if (isActive) {
        if (!activeFilterSeasons.includes(tag)) activeFilterSeasons.push(tag);
      } else {
        activeFilterSeasons = activeFilterSeasons.filter(t => t !== tag);
      }
    } else if (["ngay", "dem"].includes(tag)) {
      if (isActive) {
        if (!activeFilterTimes.includes(tag)) activeFilterTimes.push(tag);
      } else {
        activeFilterTimes = activeFilterTimes.filter(t => t !== tag);
      }
    }
    
    // Áp dụng bộ lọc
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
});

// Hàm tự động định dạng và thêm hậu tố .000 vào ô nhập giá, giữ nguyên vị trí con trỏ thông minh
function formatInputWithSuffix(inputEl) {
  let originalVal = inputEl.value;
  let originalCursor = inputEl.selectionStart;
  
  // Đếm số lượng chữ số thực tế đứng trước con trỏ trước khi format
  let digitsBeforeCursor = 0;
  for (let i = 0; i < originalCursor; i++) {
    if (/\d/.test(originalVal[i])) {
      digitsBeforeCursor++;
    }
  }

  let digits = originalVal.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) {
    inputEl.value = "";
    return;
  }
  
  // Lấy phần nghìn gốc (loại bỏ 3 chữ số 0 ở cuối nếu có)
  let base = digits;
  if (digits.length > 3 && digits.endsWith("000")) {
    base = digits.slice(0, -3);
  }
  
  // Luôn tự động thêm lại 3 chữ số 0 ở cuối
  const finalValue = base + "000";
  const formatted = finalValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  inputEl.value = formatted;
  
  // Tìm vị trí con trỏ mới khớp với số lượng chữ số ban đầu
  let newCursor = 0;
  let digitsFound = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (digitsFound === digitsBeforeCursor) {
      newCursor = i;
      break;
    }
    if (/\d/.test(formatted[i])) {
      digitsFound++;
    }
  }
  
  // Giới hạn con trỏ không được vượt quá vị trí trước cụm ".000" ở cuối
  const maxPos = formatted.length - 4;
  if (newCursor > maxPos) {
    newCursor = maxPos;
  }
  
  inputEl.setSelectionRange(newCursor, newCursor);
}

// Ràng buộc con trỏ và định dạng cho ô nhập khoảng giá
function setupPriceInputFormatting(inputEl) {
  if (!inputEl) return;
  
  inputEl.addEventListener("input", () => {
    formatInputWithSuffix(inputEl);
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
  
  // Ngăn con trỏ nhảy vào phần hậu tố .000
  const enforceCursor = () => {
    let val = inputEl.value;
    if (!val) return;
    const maxPos = val.length - 4;
    if (inputEl.selectionStart === inputEl.selectionEnd && inputEl.selectionStart > maxPos) {
      inputEl.setSelectionRange(maxPos, maxPos);
    }
  };
  
  inputEl.addEventListener("keyup", enforceCursor);
  inputEl.addEventListener("click", enforceCursor);
  inputEl.addEventListener("focus", enforceCursor);
}

// Áp dụng định dạng cho cả 2 ô nhập khoảng giá
setupPriceInputFormatting(filterMinPrice);
setupPriceInputFormatting(filterMaxPrice);

// Nút xóa bộ lọc
if (btnClearFilter) {
  btnClearFilter.addEventListener("click", () => {
    if (filterMinPrice) filterMinPrice.value = "";
    if (filterMaxPrice) filterMaxPrice.value = "";
    activeFilterSizes = [];
    activeFilterGenders = [];
    activeFilterSeasons = [];
    activeFilterTimes = [];
    filterSizeButtons.forEach(btn => btn.classList.remove("active"));
    filterGenderButtons.forEach(btn => btn.classList.remove("active"));
    filterTagButtons.forEach(btn => btn.classList.remove("active"));
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
}

// Nút xóa tất cả trên thanh tóm tắt
if (btnResetSummary) {
  btnResetSummary.addEventListener("click", () => {
    if (filterMinPrice) filterMinPrice.value = "";
    if (filterMaxPrice) filterMaxPrice.value = "";
    activeFilterSizes = [];
    activeFilterGenders = [];
    activeFilterSeasons = [];
    activeFilterTimes = [];
    filterSizeButtons.forEach(btn => btn.classList.remove("active"));
    filterGenderButtons.forEach(btn => btn.classList.remove("active"));
    filterTagButtons.forEach(btn => btn.classList.remove("active"));
    if (typeof performSearch === "function") {
      performSearch(searchBox.value);
    }
  });
}

// Kiểm tra một thuộc tính tag (mùa/thời điểm) của sản phẩm có kích hoạt không
function isProductTagActive(prod, tag) {
  const val = cleanString(prod[tag]);
  return val && val !== "-" && val.toLowerCase() !== "0" && val !== "";
}

// Hàm hiển thị các tag bộ lọc đang hoạt động bên dưới khung search (khi đóng panel lọc)
function updateFilterSummary() {
  if (!filterSummaryBar || !filterSummaryBadges) return;
  
  const hasMinPrice = filterMinPrice && filterMinPrice.value.trim() !== "";
  const hasMaxPrice = filterMaxPrice && filterMaxPrice.value.trim() !== "";
  const hasSizes = activeFilterSizes.length > 0;
  const hasGenders = activeFilterGenders.length > 0;
  const hasSeasons = activeFilterSeasons.length > 0;
  const hasTimes = activeFilterTimes.length > 0;
  
  const hasActiveFilters = hasMinPrice || hasMaxPrice || hasSizes || hasGenders || hasSeasons || hasTimes;
  const isPanelHidden = filterPanel && filterPanel.style.display === "none";
  
  // Chỉ hiển thị thanh tóm tắt khi panel bộ lọc đang ĐÓNG VÀ có bộ lọc đang hoạt động
  if (isPanelHidden && hasActiveFilters) {
    filterSummaryBar.style.display = "flex";
  } else {
    filterSummaryBar.style.display = "none";
    return;
  }
  
  filterSummaryBadges.innerHTML = "";
  
  // 1. Tạo badge cho khoảng giá
  if (hasMinPrice || hasMaxPrice) {
    const badge = document.createElement("span");
    badge.className = "summary-badge";
    badge.title = "Click để xóa lọc giá";
    
    let label = "";
    const minValNum = hasMinPrice ? parseInt(filterMinPrice.value.replace(/\D/g, ""), 10) : null;
    const maxValNum = hasMaxPrice ? parseInt(filterMaxPrice.value.replace(/\D/g, ""), 10) : null;
    
    const minValStr = minValNum ? minValNum.toLocaleString('vi-VN') + "đ" : "";
    const maxValStr = maxValNum ? maxValNum.toLocaleString('vi-VN') + "đ" : "";
    
    if (hasMinPrice && hasMaxPrice) {
      label = `💰 ${minValStr} - ${maxValStr}`;
    } else if (hasMinPrice) {
      label = `💰 ≥ ${minValStr}`;
    } else {
      label = `💰 ≤ ${maxValStr}`;
    }
    
    badge.innerHTML = `${label} <span class="badge-remove">✕</span>`;
    badge.addEventListener("click", () => {
      if (filterMinPrice) filterMinPrice.value = "";
      if (filterMaxPrice) filterMaxPrice.value = "";
      performSearch(searchBox.value);
    });
    filterSummaryBadges.appendChild(badge);
  }
  
  // 2. Tạo badge cho dung tích
  activeFilterSizes.forEach(size => {
    const badge = document.createElement("span");
    badge.className = "summary-badge";
    badge.title = `Click để bỏ lọc ${size}`;
    badge.innerHTML = `📦 ${size} <span class="badge-remove">✕</span>`;
    badge.addEventListener("click", () => {
      activeFilterSizes = activeFilterSizes.filter(s => s !== size);
      const btn = document.querySelector(`.filter-size-btn[data-size="${size}"]`);
      if (btn) btn.classList.remove("active");
      performSearch(searchBox.value);
    });
    filterSummaryBadges.appendChild(badge);
  });

  // 3. Tạo badge cho Giới tính
  activeFilterGenders.forEach(gender => {
    const badge = document.createElement("span");
    badge.className = "summary-badge";
    const iconHTML = typeof getGenderIconHTML === "function" ? getGenderIconHTML(gender) : "";
    badge.title = `Click để bỏ lọc giới tính ${gender}`;
    badge.innerHTML = `${iconHTML} ${gender} <span class="badge-remove">✕</span>`;
    badge.addEventListener("click", () => {
      activeFilterGenders = activeFilterGenders.filter(g => g !== gender);
      const btn = document.querySelector(`.filter-gender-btn[data-gender="${gender}"]`);
      if (btn) btn.classList.remove("active");
      performSearch(searchBox.value);
    });
    filterSummaryBadges.appendChild(badge);
  });
  
  // 3. Tạo badge cho Mùa
  activeFilterSeasons.forEach(season => {
    const badge = document.createElement("span");
    badge.className = "summary-badge";
    
    let icon = "";
    let name = "";
    if (season === "xuan") { icon = "🌸"; name = "Xuân"; }
    else if (season === "ha") { icon = "☀️"; name = "Hạ"; }
    else if (season === "thu") { icon = "🍂"; name = "Thu"; }
    else if (season === "dong") { icon = "❄️"; name = "Đông"; }
    
    badge.title = `Click để bỏ lọc mùa ${name}`;
    badge.innerHTML = `${icon} ${name} <span class="badge-remove">✕</span>`;
    badge.addEventListener("click", () => {
      activeFilterSeasons = activeFilterSeasons.filter(t => t !== season);
      const btn = document.querySelector(`.filter-tag-btn[data-tag="${season}"]`);
      if (btn) btn.classList.remove("active");
      performSearch(searchBox.value);
    });
    filterSummaryBadges.appendChild(badge);
  });
  
  // 4. Tạo badge cho thời điểm dùng
  activeFilterTimes.forEach(time => {
    const badge = document.createElement("span");
    badge.className = "summary-badge";
    
    let icon = "";
    let name = "";
    if (time === "ngay") { icon = "🌤"; name = "Ngày"; }
    else if (time === "dem") { icon = "🌙"; name = "Đêm"; }
    
    badge.title = `Click để bỏ lọc thời điểm ${name}`;
    badge.innerHTML = `${icon} ${name} <span class="badge-remove">✕</span>`;
    badge.addEventListener("click", () => {
      activeFilterTimes = activeFilterTimes.filter(t => t !== time);
      const btn = document.querySelector(`.filter-tag-btn[data-tag="${time}"]`);
      if (btn) btn.classList.remove("active");
      performSearch(searchBox.value);
    });
    filterSummaryBadges.appendChild(badge);
  });
}

// Ghi đè hàm performSearch trong perfume.js để tích hợp bộ lọc khoảng giá, dung tích và mùa/thời điểm
if (typeof performSearch === "function") {
  performSearch = function(keyword) {
    const normalizedKeyword = removeAccents(keyword).trim();
    const tokens = normalizedKeyword.split(/\s+/).filter(t => t.length > 0);
    
    const hasMinPrice = filterMinPrice && filterMinPrice.value.trim() !== "";
    const hasMaxPrice = filterMaxPrice && filterMaxPrice.value.trim() !== "";
    
    const minVal = hasMinPrice ? parsePriceToNumber(filterMinPrice.value) : null;
    const maxVal = hasMaxPrice ? parsePriceToNumber(filterMaxPrice.value) : null;
    
    const filtered = allProducts.filter(prod => {
      // 1. Lọc theo từ khóa tìm kiếm (kết hợp cả tên đầy đủ và tên rút gọn)
      if (tokens.length > 0) {
        const displayName = getProductDisplayName(prod);
        const normalizedDisplay = removeAccents(displayName);
        const normalizedName = removeAccents(prod.name);
        const normalizedShort = removeAccents(prod.tenrutgon);
        const combinedStr = `${normalizedDisplay} ${normalizedName} ${normalizedShort}`;
        const matchKeyword = tokens.every(token => combinedStr.includes(token));
        if (!matchKeyword) return false;
      }
      
      // 2. Lọc theo dung tích & khoảng giá (Full, Tester, 5ml, 10ml, 20ml, Gốc)
      const hasSizeFilter = activeFilterSizes.length > 0;
      const hasPriceRange = (minVal !== null || maxVal !== null);

      if (hasSizeFilter || hasPriceRange) {
        const sizesToCheck = hasSizeFilter ? activeFilterSizes : ["Full", "Tester", "5ml", "10ml", "20ml", "Gốc"];
        
        const hasMatchingPrice = sizesToCheck.some(size => {
          let priceStrs = [];
          if (size === "Full") {
            priceStrs = [prod.giafull1, prod.giafull2, prod.giafull3, prod.giafull4, prod.giafull5];
          } else if (size === "Tester") {
            priceStrs = [prod.giatester1, prod.giatester2, prod.giatester3, prod.giatester4, prod.giatester5];
          } else if (size === "Gốc") {
            priceStrs = [prod.giagoc1, prod.giagoc2, prod.giagoc3, prod.giagoc4, prod.giagoc5];
          } else if (size === "5ml") {
            priceStrs = [prod.gia5ml];
          } else if (size === "10ml") {
            priceStrs = [prod.gia10ml];
          } else if (size === "20ml") {
            priceStrs = [prod.gia20ml];
          }
          
          return priceStrs.some(priceStr => {
            const cleanP = cleanString(priceStr);
            if (!cleanP || cleanP === "-") return false;
            
            if (hasPriceRange) {
              const priceNum = parsePriceToNumber(priceStr);
              if (minVal !== null && priceNum < minVal) return false;
              if (maxVal !== null && priceNum > maxVal) return false;
            }
            
            return true;
          });
        });
        
        if (!hasMatchingPrice) return false;
      }
      
      // 3. Lọc theo nhóm mùa (Xuân, Hạ, Thu, Đông) - logic AND trong nhóm
      if (activeFilterSeasons.length > 0) {
        const matchSeason = activeFilterSeasons.every(tag => isProductTagActive(prod, tag));
        if (!matchSeason) return false;
      }
      
      // 4. Lọc theo nhóm thời điểm (Ngày, Đêm) - logic AND trong nhóm
      if (activeFilterTimes.length > 0) {
        const matchTime = activeFilterTimes.every(tag => isProductTagActive(prod, tag));
        if (!matchTime) return false;
      }
      
      // 5. Lọc theo Giới tính (Nam, Nữ, Unisex) - Khớp một trong các giới tính chọn (OR logic)
      if (activeFilterGenders.length > 0) {
        const prodSex = cleanString(prod.sex).trim().toLowerCase();
        const matchGender = activeFilterGenders.some(g => {
          const targetG = g.toLowerCase();
          if (targetG === "nam") return prodSex === "nam";
          if (targetG === "nữ" || targetG === "nu") return prodSex === "nữ" || prodSex === "nu";
          if (targetG === "unisex") return prodSex === "unisex";
          return false;
        });
        if (!matchGender) return false;
      }
      
      return true;
    });
    
    // Gọi hàm renderList có sẵn từ perfume.js
    if (typeof renderList === "function") {
      renderList(filtered);
    }
    
    // Cập nhật lại thanh hiển thị tóm tắt bộ lọc đang hoạt động
    updateFilterSummary();
  };
}
