// ==========================================================================
// ORDER CONFIRMATION MODULE (SAPO POS STYLE ORDER MANAGEMENT)
// ==========================================================================

let orderItems = [];
let orderCustomer = {
  name: "",
  phone: "",
  address: ""
};
let orderMemberDiscountPercent = 0; // 0, 2, 3, 4, 5, 6%
let orderDiscountValue = 0;
let orderDiscountType = "percent"; // "percent" | "amount"
let orderAppliedPromoIds = []; // Danh sách ID khuyến mãi đang áp dụng
let orderShippingFee = 0; // 0 = Freeship

// Chương trình khuyến mãi mặc định của shop (luôn bảo lưu)
const DEFAULT_PROMOTIONS = [
  {
    id: "promo_birthday",
    name: "Chúc mừng sinh nhật",
    type: "percent",
    value: 5,
    saleType: 3,
    desc: "Giảm 5% đơn hàng",
    productNames: new Set()
  }
];

// Danh sách chương trình khuyến mãi (mặc định Chúc mừng sinh nhật + nạp động từ Google Sheet)
let orderAvailablePromotions = [...DEFAULT_PROMOTIONS];

if (typeof window !== "undefined") {
  window.orderAvailablePromotions = orderAvailablePromotions;
}

// Phân loại đơn vị sản phẩm cho khuyến mãi (Fullbox, Chiết, Tester, Gốc)
function getItemPromoCategory(item) {
  const u = (item?.unit || "").toLowerCase();
  if (u.includes("tester")) return "tester";
  if (u.includes("gốc")) return "goc";
  if (u.includes("chiết") || /5ml|10ml|20ml/.test(u)) return "chiet";
  if (u.includes("full")) return "full";
  return "other";
}

// Kiểm tra món hàng có đủ điều kiện hưởng khuyến mãi promo không
function isItemEligibleForPromo(item, promo) {
  if (!item || !promo) return false;
  if (promo.productNames?.size > 0 && !promo.productNames.has((item.name || "").trim().toLowerCase())) {
    return false;
  }
  const cat = getItemPromoCategory(item);
  if (promo.saleType === 1) return cat === "full";
  if (promo.saleType === 2) return cat === "chiet";
  return cat === "full" || cat === "chiet";
}

// Trích xuất & gom nhóm các chương trình khuyến mãi từ dữ liệu allProducts của Sheet
function syncPromotionsFromProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return;
  const promoMap = new Map();

  products.forEach((prod) => {
    const pName = String(prod?.sales_promotion || "").trim();
    if (!pName || pName === "-" || pName === "0") return;

    const numRate = parseInt(String(prod.discount_rate || "").replace(/\D/g, ""), 10) || 0;
    if (numRate <= 0) return;

    let saleType = parseInt(prod.sale_type, 10);
    if (isNaN(saleType) || saleType < 1 || saleType > 3) saleType = 3;

    const prodName = (prod.name || "").trim().toLowerCase();
    const promoKey = `${pName.toLowerCase()}__${numRate}__${saleType}`;

    if (!promoMap.has(promoKey)) {
      promoMap.set(promoKey, {
        id: "promo_" + promoKey.replace(/[^a-z0-9]/g, "_"),
        name: pName,
        rate: numRate,
        type: numRate <= 100 ? "percent" : "amount",
        value: numRate,
        saleType: saleType,
        productNames: new Set(prodName ? [prodName] : [])
      });
    } else if (prodName) {
      promoMap.get(promoKey).productNames.add(prodName);
    }
  });

  orderAvailablePromotions = [...DEFAULT_PROMOTIONS, ...promoMap.values()];
  window.orderAvailablePromotions = orderAvailablePromotions;

  if (typeof renderOrderTotals === "function") {
    renderOrderTotals();
  }
}

if (typeof window !== "undefined") {
  window.syncPromotionsFromProducts = syncPromotionsFromProducts;
  window.getItemPromoCategory = getItemPromoCategory;
  window.isItemEligibleForPromo = isItemEligibleForPromo;
}

let currentEditingItemId = null;
let itemDiscountModalType = "percent"; // "percent" | "amount"
let currentPickerItemId = null;

// (formatVND, isValidPhoneNumber được nạp từ common/formatters.js - Single Source of Truth)

// Khởi tạo tab Đơn Hàng
async function initOrderModule() {
  if (typeof allProducts !== "undefined" && Array.isArray(allProducts) && allProducts.length > 0) {
    syncPromotionsFromProducts(allProducts);
  }
  await loadOrderDraft();
  setupOrderEventListeners();
  renderOrderCart();
}

// Lưu bản nháp đơn hàng vào StorageHelper
async function saveOrderDraft() {
  const draft = {
    items: orderItems,
    customer: orderCustomer,
    memberDiscountPercent: orderMemberDiscountPercent,
    discountValue: orderDiscountValue,
    discountType: orderDiscountType,
    appliedPromoIds: orderAppliedPromoIds,
    shippingFee: orderShippingFee
  };
  try {
    if (typeof StorageHelper !== "undefined") {
      await StorageHelper.set("activeOrderDraft", draft);
    }
  } catch (e) {
    // Bỏ qua lỗi ghi storage bản nháp
  }
}

// Tải bản nháp đơn hàng
async function loadOrderDraft() {
  try {
    if (typeof StorageHelper !== "undefined") {
      const draft = await StorageHelper.get("activeOrderDraft", null);
      if (draft && typeof draft === "object") {
        if (Array.isArray(draft.items)) orderItems = draft.items;
        if (draft.customer && typeof draft.customer === "object") {
          orderCustomer = { ...orderCustomer, ...draft.customer };
        }
        if (typeof draft.memberDiscountPercent === "number") orderMemberDiscountPercent = draft.memberDiscountPercent;
        if (typeof draft.discountValue === "number") orderDiscountValue = draft.discountValue;
        if (draft.discountType) orderDiscountType = draft.discountType;
        if (Array.isArray(draft.appliedPromoIds)) orderAppliedPromoIds = draft.appliedPromoIds;
        if (typeof draft.shippingFee === "number") orderShippingFee = draft.shippingFee;
      }
    }
  } catch (e) {
    // Bản nháp lỗi hoặc rỗng
  }
  
  // Đồng bộ lên các ô nhập thông tin khách hàng
  const inputName = document.getElementById("orderCustomerName");
  const inputPhone = document.getElementById("orderCustomerPhone");
  const inputAddress = document.getElementById("orderCustomerAddress");
  const selectMemberDiscount = document.getElementById("orderMemberDiscountSelect");
  const inputDiscount = document.getElementById("orderDiscountInput");
  const btnDiscountPct = document.getElementById("btnOrderDiscountPct");
  const btnDiscountVnd = document.getElementById("btnOrderDiscountVnd");
  const inputShipping = document.getElementById("orderShippingInput");
  const badgeShipping = document.getElementById("orderShippingBadge");

  if (inputName && orderCustomer.name) inputName.value = orderCustomer.name;
  if (inputPhone && orderCustomer.phone) {
    inputPhone.value = orderCustomer.phone;
    validatePhoneUI(inputPhone);
  }
  if (inputAddress && orderCustomer.address) inputAddress.value = orderCustomer.address;

  if (selectMemberDiscount) {
    selectMemberDiscount.value = String(orderMemberDiscountPercent || 0);
  }

  if (btnDiscountPct && btnDiscountVnd) {
    btnDiscountPct.classList.toggle("active", orderDiscountType === "percent");
    btnDiscountVnd.classList.toggle("active", orderDiscountType === "amount");
  }

  if (inputDiscount && orderDiscountValue > 0) {
    inputDiscount.value = orderDiscountType === "percent" 
      ? orderDiscountValue 
      : orderDiscountValue.toLocaleString("vi-VN");
  }

  if (inputShipping && badgeShipping) {
    if (orderShippingFee === 0) {
      inputShipping.value = "0";
      badgeShipping.style.display = "inline-block";
    } else {
      inputShipping.value = orderShippingFee.toLocaleString("vi-VN");
      badgeShipping.style.display = "none";
    }
  }
}

// Cập nhật giao diện cảnh báo số điện thoại
function validatePhoneUI(inputEl) {
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (!val) {
    inputEl.classList.remove("is-invalid");
    inputEl.title = "";
    return;
  }
  const valid = isValidPhoneNumber(val);
  inputEl.classList.toggle("is-invalid", !valid);
  inputEl.title = valid ? "" : "Số ĐT cần đúng 10 số (VD: 0569997878) hoặc mã vùng quốc tế (VD: +84569997878)";
}

// Cấu hình các bộ lắng nghe sự kiện
function setupOrderEventListeners() {
  const searchInput = document.getElementById("orderSearchInput");
  const searchClear = document.getElementById("orderSearchClear");
  const searchDropdown = document.getElementById("orderSearchDropdown");
  const btnAddManual = document.getElementById("btnOrderAddManual");
  const btnReset = document.getElementById("btnOrderReset");
  const btnCreateInvoice = document.getElementById("btnOrderCreateInvoice");

  const debouncedOrderSearch = debounce(handleOrderSearch, 150);
  const debouncedSaveDraft = debounce(saveOrderDraft, 300);

  // 1. Tìm kiếm sản phẩm từ kho allProducts (Có Debounce)
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim();
      if (searchClear) searchClear.style.display = q ? "block" : "none";
      debouncedOrderSearch(q);
    });

    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim()) {
        handleOrderSearch(searchInput.value.trim());
      }
    });
  }

  if (searchClear && searchInput) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.style.display = "none";
      if (searchDropdown) searchDropdown.style.display = "none";
      searchInput.focus();
    });
  }

  // Tự động đóng dropdown khi click bên ngoài
  document.addEventListener("click", (e) => {
    if (searchDropdown && searchInput) {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = "none";
      }
    }
  });

  // 2. Nút thêm sản phẩm ngoài (Thủ công, không cần ảnh, dùng 1 lần)
  if (btnAddManual) {
    btnAddManual.addEventListener("click", () => {
      openManualItemModal();
    });
  }

  // 3. Thông tin khách hàng thay đổi (Có Debounce)
  const inputName = document.getElementById("orderCustomerName");
  const inputPhone = document.getElementById("orderCustomerPhone");
  const inputAddress = document.getElementById("orderCustomerAddress");

  if (inputName) {
    inputName.addEventListener("input", () => {
      orderCustomer.name = inputName.value.trim();
      debouncedSaveDraft();
    });
    inputName.addEventListener("blur", saveOrderDraft);
  }

  if (inputPhone) {
    // Chỉ cho phép gõ ký tự số và dấu + ở đầu
    inputPhone.addEventListener("input", (e) => {
      let v = e.target.value;
      v = v.replace(/[^\d+]/g, "");
      if (v.includes("+")) {
        v = (v.startsWith("+") ? "+" : "") + v.replace(/\+/g, "");
      }
      inputPhone.value = v;
      orderCustomer.phone = v;
      validatePhoneUI(inputPhone);
      debouncedSaveDraft();
    });
    inputPhone.addEventListener("blur", saveOrderDraft);
  }

  if (inputAddress) {
    inputAddress.addEventListener("input", () => {
      orderCustomer.address = inputAddress.value.trim();
      debouncedSaveDraft();
    });
    inputAddress.addEventListener("blur", saveOrderDraft);
  }

  // 3.1. Ủy quyền sự kiện giỏ hàng (Event Delegation) tránh rò rỉ và gắn lặp listener khi render
  const listContainer = document.getElementById("orderItemList");
  if (listContainer) {
    listContainer.addEventListener("click", (e) => {
      // Nút Xóa
      const btnDel = e.target.closest(".btn-order-item-del");
      if (btnDel) {
        const id = btnDel.dataset.id;
        orderItems = orderItems.filter((it) => it.id !== id);
        saveOrderDraft();
        renderOrderCart();
        return;
      }

      // Click vào Thẻ Đơn Vị -> Mở Modal Chọn Đổi Đơn Vị Nhanh
      const unitBadge = e.target.closest(".order-item-unit");
      if (unitBadge) {
        const item = orderItems.find((it) => it.id === unitBadge.dataset.id);
        if (item) openUnitPickerModal(item);
        return;
      }

      // Nút Giảm SL
      const btnMinus = e.target.closest(".btn-qty-minus");
      if (btnMinus) {
        const item = orderItems.find((it) => it.id === btnMinus.dataset.id);
        if (item) {
          if (item.qty > 1) {
            item.qty -= 1;
            item.subtotal = item.qty * item.finalPrice;
            saveOrderDraft();
            renderOrderCart();
          } else {
            if (confirm(`Xóa "${item.name}" khỏi đơn hàng?`)) {
              orderItems = orderItems.filter((it) => it.id !== item.id);
              saveOrderDraft();
              renderOrderCart();
            }
          }
        }
        return;
      }

      // Nút Tăng SL
      const btnPlus = e.target.closest(".btn-qty-plus");
      if (btnPlus) {
        const item = orderItems.find((it) => it.id === btnPlus.dataset.id);
        if (item) {
          item.qty += 1;
          item.subtotal = item.qty * item.finalPrice;
          saveOrderDraft();
          renderOrderCart();
        }
        return;
      }

      // Click vào Đơn giá -> Mở Modal Chỉnh Sửa Giá & Chiết Khấu
      const priceBox = e.target.closest(".order-price-clickable");
      if (priceBox) {
        const item = orderItems.find((it) => it.id === priceBox.dataset.id);
        if (item) openItemPriceModal(item);
        return;
      }
    });

    // Event delegation: Đổi số lượng trực tiếp
    listContainer.addEventListener("change", (e) => {
      const inputQty = e.target.closest(".order-qty-input");
      if (inputQty) {
        const item = orderItems.find((it) => it.id === inputQty.dataset.id);
        if (item) {
          let val = parseInt(inputQty.value.replace(/\D/g, ""), 10);
          if (isNaN(val) || val < 1) val = 1;
          item.qty = val;
          item.subtotal = item.qty * item.finalPrice;
          saveOrderDraft();
          renderOrderCart();
        }
      }
    });

    // Event delegation: Sửa tên trực tiếp cho sản phẩm thủ công
    listContainer.addEventListener("input", (e) => {
      const nameInput = e.target.closest(".order-item-name-manual");
      if (nameInput) {
        const item = orderItems.find((it) => it.id === nameInput.dataset.id);
        if (item) {
          item.name = nameInput.value;
          debouncedSaveDraft();
        }
      }
    });

    listContainer.addEventListener("focusout", (e) => {
      const nameInput = e.target.closest(".order-item-name-manual");
      if (nameInput) {
        const item = orderItems.find((it) => it.id === nameInput.dataset.id);
        if (item) {
          const val = nameInput.value.trim();
          item.name = val || "Sản phẩm ngoài kho";
          nameInput.value = item.name;
          saveOrderDraft();
        }
      }
    });

    listContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.classList.contains("order-item-name-manual")) {
        e.preventDefault();
        e.target.blur();
      }
    });
  }

  // 3.5. Chiết khấu thành viên cũ (0%, 2%, 3%, 4%, 5%, 6%)
  const selectMemberDiscount = document.getElementById("orderMemberDiscountSelect");
  if (selectMemberDiscount) {
    selectMemberDiscount.addEventListener("change", () => {
      const val = parseInt(selectMemberDiscount.value, 10);
      orderMemberDiscountPercent = isNaN(val) ? 0 : val;
      renderOrderTotals();
      saveOrderDraft();
    });
  }

  // 4. Chiết khấu tổng đơn: 2 nút toggle % / VNĐ + Cơ chế tự chuyển VNĐ khi > 100
  const inputDiscount = document.getElementById("orderDiscountInput");
  const btnDiscountPct = document.getElementById("btnOrderDiscountPct");
  const btnDiscountVnd = document.getElementById("btnOrderDiscountVnd");

  function updateOrderDiscountMode(mode) {
    orderDiscountType = mode;
    if (btnDiscountPct) btnDiscountPct.classList.toggle("active", mode === "percent");
    if (btnDiscountVnd) btnDiscountVnd.classList.toggle("active", mode === "amount");
    
    // Format lại ô nhập theo mode mới
    if (inputDiscount && orderDiscountValue > 0) {
      inputDiscount.value = mode === "percent"
        ? Math.min(100, orderDiscountValue)
        : orderDiscountValue.toLocaleString("vi-VN");
    }
    renderOrderTotals();
    saveOrderDraft();
  }

  if (btnDiscountPct) {
    btnDiscountPct.addEventListener("click", () => {
      if (orderDiscountValue > 100) orderDiscountValue = 100;
      updateOrderDiscountMode("percent");
    });
  }

  if (btnDiscountVnd) {
    btnDiscountVnd.addEventListener("click", () => {
      updateOrderDiscountMode("amount");
    });
  }

  if (inputDiscount) {
    inputDiscount.addEventListener("input", () => {
      const raw = inputDiscount.value.replace(/\D/g, "");
      let num = raw ? parseInt(raw, 10) : 0;

      // Cơ chế thông minh: > 100 thì thành VNĐ, <= 100 thì thành %
      if (num > 100) {
        orderDiscountType = "amount";
        if (btnDiscountPct) btnDiscountPct.classList.remove("active");
        if (btnDiscountVnd) btnDiscountVnd.classList.add("active");
        inputDiscount.value = num > 0 ? num.toLocaleString("vi-VN") : "";
      } else {
        orderDiscountType = "percent";
        if (btnDiscountPct) btnDiscountPct.classList.add("active");
        if (btnDiscountVnd) btnDiscountVnd.classList.remove("active");
        inputDiscount.value = num > 0 ? num : (raw === "0" ? "0" : "");
      }

      orderDiscountValue = num;
      renderOrderTotals();
      saveOrderDraft();
    });
  }

  // 5. Phí vận chuyển (Phí ship - 0 = Freeship)
  const inputShipping = document.getElementById("orderShippingInput");
  const badgeShipping = document.getElementById("orderShippingBadge");

  if (inputShipping) {
    inputShipping.addEventListener("input", () => {
      const raw = inputShipping.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;
      orderShippingFee = num;

      if (num === 0) {
        inputShipping.value = "0";
        if (badgeShipping) badgeShipping.style.display = "inline-block";
      } else {
        inputShipping.value = num.toLocaleString("vi-VN");
        if (badgeShipping) badgeShipping.style.display = "none";
      }

      renderOrderTotals();
      saveOrderDraft();
    });

    inputShipping.addEventListener("focus", () => {
      if (inputShipping.value === "0") inputShipping.value = "";
    });

    inputShipping.addEventListener("blur", () => {
      if (!inputShipping.value.trim()) {
        inputShipping.value = "0";
        orderShippingFee = 0;
        if (badgeShipping) badgeShipping.style.display = "inline-block";
        renderOrderTotals();
        saveOrderDraft();
      }
    });
  }

  // 6. Nút Làm mới đơn hàng (Reset Cart)
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (orderItems.length === 0 && !orderCustomer.name && !orderCustomer.phone) {
        return;
      }
      if (confirm("Bạn có chắc chắn muốn làm mới toàn bộ đơn hàng này?")) {
        orderItems = [];
        orderCustomer = { name: "", phone: "", address: "" };
        orderMemberDiscountPercent = 0;
        orderDiscountValue = 0;
        orderDiscountType = "percent";
        orderAppliedPromoIds = [];
        orderShippingFee = 0;

        if (selectMemberDiscount) selectMemberDiscount.value = "0";
        if (inputName) inputName.value = "";
        if (inputPhone) {
          inputPhone.value = "";
          inputPhone.classList.remove("is-invalid");
        }
        if (inputAddress) inputAddress.value = "";
        if (inputDiscount) inputDiscount.value = "";
        if (inputShipping) inputShipping.value = "0";
        if (badgeShipping) badgeShipping.style.display = "inline-block";

        if (btnDiscountPct) btnDiscountPct.classList.add("active");
        if (btnDiscountVnd) btnDiscountVnd.classList.remove("active");

        saveOrderDraft();
        renderOrderCart();
        showToast("✨ Đã làm mới đơn hàng!");
      }
    });
  }

  // 7. Nút Tạo Đơn Xác Nhận (Render Canvas & Copy Image)
  if (btnCreateInvoice) {
    btnCreateInvoice.addEventListener("click", handleCreateInvoice);
  }

  // 8. Các Modals
  setupItemPriceModal();
  setupUnitPickerModal();
  setupManualItemModal();
  setupInvoicePreviewModal();
  setupPromoModal();
}

// Xử lý tìm kiếm sản phẩm cho đơn hàng
function handleOrderSearch(query) {
  const searchDropdown = document.getElementById("orderSearchDropdown");
  if (!searchDropdown) return;

  if (!query || typeof allProducts === "undefined" || !Array.isArray(allProducts) || allProducts.length === 0) {
    searchDropdown.style.display = "none";
    return;
  }

  const matchedProducts = searchProducts(query, allProducts, { limit: 20 });

  if (matchedProducts.length === 0) {
    searchDropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 12px;">Không tìm thấy sản phẩm khớp</div>`;
    searchDropdown.style.display = "block";
    return;
  }

  searchDropdown.innerHTML = "";

  matchedProducts.forEach((prod) => {
    const variants = extractProductVariants(prod);
    if (variants.length === 0) return;

    const groupEl = document.createElement("div");
    groupEl.className = "order-search-result-group";

    const imgUrl = cleanString(prod.img) || "";
    const hasImg = imgUrl && imgUrl !== "-" && imgUrl.startsWith("http");
    const imgHTML = hasImg 
      ? `<img src="${imgUrl}" class="order-search-thumb" alt="${prod.name}">` 
      : `<img src="svg/logo.svg" class="order-search-thumb" alt="Logo">`;

    const dispName = (typeof getProductDisplayName === "function") ? getProductDisplayName(prod) : prod.name;

    groupEl.innerHTML = `
      <div class="order-search-result-header">
        ${imgHTML}
        <span class="order-search-name" title="${dispName}">${dispName}</span>
      </div>
      <div class="order-search-variants"></div>
    `;

    const variantContainer = groupEl.querySelector(".order-search-variants");

    variants.forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "order-search-variant-btn";
      btn.innerHTML = `
        <span>${v.unit}</span>
        <span class="order-search-variant-price">${formatVND(v.price)}</span>
      `;
      btn.addEventListener("click", () => {
        addProductToOrder({
          name: prod.name,
          unit: v.unit,
          price: v.price,
          costPrice: v.costPrice || 0,
          img: hasImg ? imgUrl : "",
          isManual: false
        });
        const searchInput = document.getElementById("orderSearchInput");
        if (searchInput) searchInput.value = "";
        const searchClear = document.getElementById("orderSearchClear");
        if (searchClear) searchClear.style.display = "none";
        searchDropdown.style.display = "none";
      });
      variantContainer.appendChild(btn);
    });

    searchDropdown.appendChild(groupEl);
  });

  searchDropdown.style.display = "block";
}

// Trích xuất tất cả các biến thể dung tích & giá khả dụng của sản phẩm
function extractProductVariants(prod) {
  const variants = [];

  const getPriceNum = (pStr) => {
    if (typeof parsePriceToNumber === "function") return parsePriceToNumber(pStr);
    const s = String(pStr || "").replace(/\D/g, "");
    return s ? parseInt(s, 10) : 0;
  };

  // 1. Fullbox 1..5
  for (let i = 1; i <= 5; i++) {
    const p = prod['giafull' + i];
    const dt = prod['dungtich' + i];
    const pNum = getPriceNum(p);
    if (pNum > 0) {
      const unit = typeof getDungTichText === "function" ? getDungTichText("Full", dt) : (dt ? `Fullbox ${dt}` : "Fullbox");
      const cost = getPriceNum(prod['giavonfull' + i]);
      variants.push({ unit, price: pNum, costPrice: cost });
    }
  }

  // 2. Tester 1..5
  for (let i = 1; i <= 5; i++) {
    const p = prod['giatester' + i];
    const dt = prod['dungtich' + i];
    const pNum = getPriceNum(p);
    if (pNum > 0) {
      const unit = typeof getDungTichText === "function" ? getDungTichText("Tester", dt) : (dt ? `Tester ${dt}` : "Tester");
      const cost = getPriceNum(prod['giavontest' + i]);
      variants.push({ unit, price: pNum, costPrice: cost });
    }
  }

  // 3. Chiết 5ml, 10ml, 20ml
  ["5ml", "10ml", "20ml"].forEach((k) => {
    const p = prod['gia' + k];
    const pNum = getPriceNum(p);
    if (pNum > 0) {
      const cost = getPriceNum(prod['giavon' + k]);
      variants.push({ unit: `Chiết ${k}`, price: pNum, costPrice: cost });
    }
  });

  // 4. Gốc 1..5
  for (let i = 1; i <= 5; i++) {
    const p = prod['giagoc' + i];
    const dt = prod['dungtichgoc' + i];
    const pNum = getPriceNum(p);
    if (pNum > 0) {
      const unit = typeof getDungTichText === "function" ? getDungTichText("Gốc", dt) : (dt ? `Gốc ${dt}` : "Gốc");
      variants.push({ unit, price: pNum, costPrice: 0 });
    }
  }

  return variants;
}

// Thêm sản phẩm vào đơn hàng
function addProductToOrder({ name, unit, price, costPrice = 0, img = "", isManual = false }) {
  const itemUnit = unit || (isManual ? "Full 30ml" : "Món");
  const existing = orderItems.find((item) => item.name === name && item.unit === itemUnit);

  if (existing) {
    existing.qty += 1;
    existing.subtotal = existing.qty * existing.finalPrice;
    if (costPrice && !existing.costPrice) {
      existing.costPrice = costPrice;
    }
  } else {
    orderItems.push({
      id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: name,
      unit: itemUnit,
      img: img || "",
      qty: 1,
      costPrice: costPrice || 0,
      originalPrice: price,
      finalPrice: price,
      discountVal: 0,
      discountType: "percent",
      subtotal: price,
      isManual: !!isManual
    });
  }

  saveOrderDraft();
  renderOrderCart();
  showToast(`✨ Đã thêm "${name} (${unit})" vào đơn!`);
}

// Render giỏ hàng & tính toán tổng
function renderOrderCart() {
  const listContainer = document.getElementById("orderItemList");
  const emptyState = document.getElementById("orderEmptyCart");
  const btnCreateInvoice = document.getElementById("btnOrderCreateInvoice");

  if (!listContainer) return;

  if (orderItems.length === 0) {
    listContainer.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (btnCreateInvoice) btnCreateInvoice.disabled = true;
    renderOrderTotals();
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (btnCreateInvoice) btnCreateInvoice.disabled = false;

  listContainer.innerHTML = "";

  orderItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "order-item-card";

    // Ảnh sản phẩm: Nếu tự nhập (isManual) hoặc không có ảnh -> KHÔNG hiển thị ảnh (theo yêu cầu của user)
    const hasImg = !item.isManual && item.img && item.img.startsWith("http");
    const imgHTML = hasImg 
      ? `<img src="${item.img}" class="order-item-thumb" alt="${item.name}">` 
      : "";

    // Giá gốc gạch ngang nếu có chiết khấu
    const hasDiscount = item.originalPrice && item.originalPrice > item.finalPrice;
    const originalPriceHTML = hasDiscount 
      ? `<span class="order-price-original">(${formatVND(item.originalPrice)})</span>` 
      : "";

    const safeName = escAttr(item.name || "");
    const safeUnit = escAttr(item.unit || (item.isManual ? "Full 30ml" : "Món"));

    const nameHTML = item.isManual
      ? `<input type="text" class="order-item-name-manual" data-id="${item.id}" value="${safeName}" placeholder="Nhập tên sản phẩm..." title="Click để sửa tên sản phẩm">`
      : `<span class="order-item-name" title="${safeName}">${safeName}</span>`;

    card.innerHTML = `
      <!-- HÀNG 1: Ảnh SP, Tên SP, Đơn vị -->
      <div class="order-item-row-1">
        ${imgHTML}
        ${nameHTML}
        <span class="order-item-unit" data-id="${item.id}" title="Click để đổi dung tích / đơn vị">${safeUnit}</span>
      </div>

      <!-- HÀNG 2: Số lượng, Đơn giá, Thành tiền, Nút xóa ✕ -->
      <div class="order-item-row-2">
        <div class="order-qty-control">
          <button type="button" class="btn-qty btn-qty-minus" data-id="${item.id}">-</button>
          <input type="text" class="order-qty-input" data-id="${item.id}" value="${item.qty}" maxlength="3">
          <button type="button" class="btn-qty btn-qty-plus" data-id="${item.id}">+</button>
        </div>

        <div class="order-price-clickable" data-id="${item.id}" title="Click để sửa đơn giá / chiết khấu">
          <span class="order-price-val">${formatVND(item.finalPrice)}</span>
          ${originalPriceHTML}
        </div>

        <div class="order-item-right-wrap">
          <div class="order-item-subtotal">
            ${formatVND(item.subtotal)}
          </div>
          <button type="button" class="btn-order-item-del" data-id="${item.id}" title="Xóa sản phẩm">✕</button>
        </div>
      </div>
    `;

    listContainer.appendChild(card);
  });

  renderOrderTotals();
}

// Tính toán chi tiết các khoản chiết khấu và tổng tiền (Ưu tiên trừ tiền mặt trước, tính % sau)
function calculateOrderTotals() {
  let rawItemsTotal = 0;
  let itemsTotal = 0;

  orderItems.forEach((it) => {
    const qty = it.qty || 1;
    const origPrice = (it.originalPrice && it.originalPrice > 0) ? it.originalPrice : (it.finalPrice || 0);
    const fnPrice = (it.finalPrice !== undefined && it.finalPrice !== null) ? it.finalPrice : origPrice;
    rawItemsTotal += origPrice * qty;
    itemsTotal += fnPrice * qty;
  });

  // Chiết khấu sản phẩm = Tổng chưa giảm giá - Tiền hàng sau giảm món
  const productDiscount = Math.max(0, rawItemsTotal - itemsTotal);

  // 1. Chiết khấu khác của đơn hàng
  let otherDiscountMoney = 0;
  if (orderDiscountType === "amount") {
    otherDiscountMoney = Math.min(itemsTotal, Math.max(0, orderDiscountValue || 0));
  } else {
    const pct = Math.max(0, Math.min(100, orderDiscountValue || 0));
    otherDiscountMoney = Math.round(itemsTotal * (pct / 100));
  }

  // 2. Chiết khấu hạng thẻ thành viên (%)
  const memberPct = Math.max(0, Math.min(100, orderMemberDiscountPercent || 0));
  const memberDiscountMoney = Math.round(itemsTotal * (memberPct / 100));

  // 3. Các chương trình khuyến mãi tick chọn (Xét theo từng chai & loại Full/Chiết)
  const appliedPromosList = [];
  let promosDiscountMoney = 0;

  orderAppliedPromoIds.forEach((promoId) => {
    const p = orderAvailablePromotions.find((item) => item.id === promoId);
    if (p) {
      // Tính tổng tiền các món trong giỏ hàng thỏa mãn điều kiện chai & loại của khuyến mãi này
      let eligibleSubtotal = 0;
      orderItems.forEach((it) => {
        if (isItemEligibleForPromo(it, p)) {
          eligibleSubtotal += (it.finalPrice || 0) * (it.qty || 1);
        }
      });

      let promoAmount = 0;
      if (eligibleSubtotal > 0) {
        if (p.type === "percent") {
          promoAmount = Math.round(eligibleSubtotal * ((p.value || 0) / 100));
        } else {
          promoAmount = Math.min(eligibleSubtotal, p.value || 0);
        }
      }

      appliedPromosList.push({
        id: p.id,
        name: p.name,
        type: p.type,
        value: p.value,
        saleType: p.saleType,
        amount: promoAmount,
        eligibleSubtotal: eligibleSubtotal
      });
      promosDiscountMoney += promoAmount;
    }
  });

  // Tổng chiết khấu đơn (không vượt quá itemsTotal)
  const totalOrderDiscountMoney = Math.min(itemsTotal, memberDiscountMoney + otherDiscountMoney + promosDiscountMoney);
  const grandTotal = Math.max(0, itemsTotal - totalOrderDiscountMoney) + (orderShippingFee || 0);

  return {
    rawItemsTotal,
    itemsTotal,
    productDiscount,
    memberDiscountMoney,
    otherDiscountMoney,
    appliedPromosList,
    promosDiscountMoney,
    totalOrderDiscountMoney,
    grandTotal
  };
}

// Hiển thị tổng tiền và các tag khuyến mãi
function renderOrderTotals() {
  const elRawTotal = document.getElementById("orderSummaryRawTotal");
  const elItemsTotal = document.getElementById("orderSummaryItemsTotal");
  const elProductDiscountRow = document.getElementById("orderSummaryProductDiscountRow");
  const elProductDiscount = document.getElementById("orderSummaryProductDiscount");
  const elMemberDiscountMoney = document.getElementById("orderMemberDiscountMoney");
  const elPromoAppliedSummary = document.getElementById("orderPromoAppliedSummary");
  const tagsContainer = document.getElementById("orderPromoTagsContainer");
  const elGrandTotal = document.getElementById("orderSummaryGrandTotal");

  const totals = calculateOrderTotals();

  if (elRawTotal) elRawTotal.innerText = formatVND(totals.rawItemsTotal);
  if (elItemsTotal) elItemsTotal.innerText = formatVND(totals.itemsTotal);

  if (elProductDiscountRow && elProductDiscount) {
    if (totals.productDiscount > 0) {
      elProductDiscountRow.style.display = "flex";
      elProductDiscount.innerText = `- ${formatVND(totals.productDiscount)}`;
    } else {
      elProductDiscountRow.style.display = "none";
      elProductDiscount.innerText = "- 0đ";
    }
  }

  if (elMemberDiscountMoney) {
    elMemberDiscountMoney.innerText = totals.memberDiscountMoney > 0
      ? `- ${formatVND(totals.memberDiscountMoney)}`
      : "- 0đ";
  }

  if (elPromoAppliedSummary) {
    elPromoAppliedSummary.innerText = totals.promosDiscountMoney > 0
      ? `- ${formatVND(totals.promosDiscountMoney)}`
      : "- 0đ";
  }

  if (elGrandTotal) {
    elGrandTotal.innerText = formatVND(totals.grandTotal);
  }

  // Hiển thị các tag khuyến mãi đang chọn
  if (tagsContainer) {
    if (orderAppliedPromoIds.length > 0) {
      tagsContainer.style.display = "flex";
      tagsContainer.innerHTML = "";
      orderAppliedPromoIds.forEach((id) => {
        const p = orderAvailablePromotions.find((it) => it.id === id);
        if (p) {
          let typeLabel = "Full & Chiết";
          if (p.saleType === 1) typeLabel = "Full";
          else if (p.saleType === 2) typeLabel = "Chiết";

          const tag = document.createElement("span");
          tag.className = "order-promo-tag";
          tag.innerHTML = `🎁 ${escAttr(p.name)} (${p.type === "percent" ? `-${p.value}%` : `-${formatVND(p.value)}`}) [${typeLabel}] <span class="order-promo-tag-del" title="Bỏ chọn">✕</span>`;
          tag.querySelector(".order-promo-tag-del").addEventListener("click", () => {
            orderAppliedPromoIds = orderAppliedPromoIds.filter((x) => x !== id);
            renderOrderTotals();
            saveOrderDraft();
          });
          tagsContainer.appendChild(tag);
        }
      });
    } else {
      tagsContainer.style.display = "none";
      tagsContainer.innerHTML = "";
    }
  }
}

// --------------------------------------------------------------------------
// MODAL: CHỌN ĐỔI ĐƠN VỊ / DUNG TÍCH NHANH
// --------------------------------------------------------------------------
function setupUnitPickerModal() {
  const modal = document.getElementById("orderUnitPickerModal");
  const btnClose = document.getElementById("btnCloseUnitPickerModal");
  const btnCancel = document.getElementById("btnCancelUnitPickerModal");
  const btnApplyCustom = document.getElementById("btnApplyCustomUnit");
  const inputCustomName = document.getElementById("unitCustomName");
  const inputCustomPrice = document.getElementById("unitCustomPrice");

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    currentPickerItemId = null;
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (inputCustomPrice) {
    inputCustomPrice.addEventListener("input", () => {
      const raw = inputCustomPrice.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;
      inputCustomPrice.value = num > 0 ? num.toLocaleString("vi-VN") : "";
    });
  }

  const applyCustomUnit = () => {
    if (!currentPickerItemId) return;
    const item = orderItems.find((i) => i.id === currentPickerItemId);
    if (!item) return;

    const customName = inputCustomName ? inputCustomName.value.trim() : "";
    const rawPrice = inputCustomPrice ? inputCustomPrice.value.replace(/\D/g, "") : "";
    const customPrice = rawPrice ? parseInt(rawPrice, 10) : 0;

    if (!customName) {
      showToast("⚠️ Vui lòng nhập tên dung tích tùy chỉnh!");
      if (inputCustomName) inputCustomName.focus();
      return;
    }

    if (customPrice <= 0) {
      showToast("⚠️ Vui lòng nhập đơn giá hợp lệ!");
      if (inputCustomPrice) inputCustomPrice.focus();
      return;
    }

    item.unit = customName;
    item.originalPrice = customPrice;

    // Giữ nguyên tỷ lệ chiết khấu nếu có
    if (item.discountType === "percent" && item.discountVal > 0) {
      const pct = Math.min(100, Math.max(0, item.discountVal));
      item.finalPrice = Math.round(item.originalPrice * (1 - pct / 100));
    } else if (item.discountType === "amount" && item.discountVal > 0) {
      item.finalPrice = Math.max(0, item.originalPrice - item.discountVal);
    } else {
      item.finalPrice = item.originalPrice;
    }

    item.subtotal = item.qty * item.finalPrice;

    saveOrderDraft();
    renderOrderCart();
    closeModal();
    showToast(`✨ Đã đổi sang "${item.unit}" (${formatVND(item.finalPrice)})!`);
  };

  if (btnApplyCustom) {
    btnApplyCustom.addEventListener("click", applyCustomUnit);
  }

  if (inputCustomName) {
    inputCustomName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomUnit();
      }
    });
  }

  if (inputCustomPrice) {
    inputCustomPrice.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomUnit();
      }
    });
  }
}

function openUnitPickerModal(item) {
  currentPickerItemId = item.id;
  const modal = document.getElementById("orderUnitPickerModal");
  const titleName = document.getElementById("unitPickerProdName");
  const listEl = document.getElementById("unitPickerList");
  const inputCustomName = document.getElementById("unitCustomName");
  const inputCustomPrice = document.getElementById("unitCustomPrice");

  if (titleName) titleName.innerText = item.name;
  if (!modal || !listEl) return;

  listEl.innerHTML = "";

  // Thiết lập sẵn giá trị cho ô tùy chỉnh
  if (inputCustomName) inputCustomName.value = item.isManual ? (item.unit || "") : "";
  if (inputCustomPrice) {
    inputCustomPrice.value = (item.isManual && item.originalPrice) ? item.originalPrice.toLocaleString("vi-VN") : "";
  }

  // Nếu là sản phẩm thủ công ngoài kho -> chỉ hiển thị thông báo nhẹ và cho dùng ô tùy chỉnh bên dưới
  if (item.isManual) {
    listEl.innerHTML = `<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 11.5px;">Sản phẩm tự nhập (dùng các ô bên dưới để đổi dung tích & giá)</div>`;
    modal.style.display = "flex";
    return;
  }

  // Tìm sản phẩm trong kho allProducts
  if (typeof allProducts === "undefined" || !Array.isArray(allProducts)) {
    showToast("⚠️ Chưa có dữ liệu kho sản phẩm!");
    return;
  }

  const prod = allProducts.find((p) => p.name === item.name);
  if (!prod) {
    listEl.innerHTML = `<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 11.5px;">Không tìm thấy biến thể sẵn có trong kho</div>`;
    modal.style.display = "flex";
    return;
  }

  const variants = extractProductVariants(prod);
  if (variants.length === 0) {
    listEl.innerHTML = `<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 11.5px;">Không có biến thể khác khả dụng</div>`;
  } else {
    variants.forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-picker-btn" + (v.unit === item.unit ? " current" : "");
      btn.innerHTML = `
        <span>${v.unit} ${v.unit === item.unit ? "(Đang chọn)" : ""}</span>
        <span style="color: var(--gold-primary); font-weight: 700;">${formatVND(v.price)}</span>
      `;

      btn.addEventListener("click", () => {
        // Cập nhật đơn vị và tính lại giá
        item.unit = v.unit;
        item.originalPrice = v.price;
        item.costPrice = v.costPrice || 0;

        // Giữ nguyên tỷ lệ chiết khấu nếu có
        if (item.discountType === "percent" && item.discountVal > 0) {
          const pct = Math.min(100, Math.max(0, item.discountVal));
          item.finalPrice = Math.round(item.originalPrice * (1 - pct / 100));
        } else if (item.discountType === "amount" && item.discountVal > 0) {
          item.finalPrice = Math.max(0, item.originalPrice - item.discountVal);
        } else {
          item.finalPrice = item.originalPrice;
        }

        item.subtotal = item.qty * item.finalPrice;

        saveOrderDraft();
        renderOrderCart();
        modal.style.display = "none";
        showToast(`✨ Đã đổi sang "${v.unit}" (${formatVND(item.finalPrice)})!`);
      });

      listEl.appendChild(btn);
    });
  }

  modal.style.display = "flex";
}

// --------------------------------------------------------------------------
// MODAL: SỬA ĐƠN GIÁ & CHIẾT KHẤU SẢN PHẨM (NÚT RADIO % / VNĐ THÔNG MINH)
// --------------------------------------------------------------------------
function setupItemPriceModal() {
  const modal = document.getElementById("orderItemPriceModal");
  const btnClose = document.getElementById("btnCloseItemPriceModal");
  const btnCancel = document.getElementById("btnCancelItemPriceModal");
  const btnSave = document.getElementById("btnSaveItemPriceModal");

  const inputPrice = document.getElementById("itemPriceInput");
  const inputDiscount = document.getElementById("itemDiscountInput");
  const btnDiscountPct = document.getElementById("btnItemDiscountPct");
  const btnDiscountVnd = document.getElementById("btnItemDiscountVnd");

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    currentEditingItemId = null;
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  // Toggle % / VNĐ
  function setModalDiscountMode(mode) {
    itemDiscountModalType = mode;
    if (btnDiscountPct) btnDiscountPct.classList.toggle("active", mode === "percent");
    if (btnDiscountVnd) btnDiscountVnd.classList.toggle("active", mode === "amount");

    if (inputDiscount && inputDiscount.value.trim()) {
      const raw = inputDiscount.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;
      if (mode === "percent") {
        inputDiscount.value = Math.min(100, num);
      } else {
        inputDiscount.value = num > 0 ? num.toLocaleString("vi-VN") : "";
      }
    }
  }

  if (btnDiscountPct) {
    btnDiscountPct.addEventListener("click", () => {
      setModalDiscountMode("percent");
    });
  }

  if (btnDiscountVnd) {
    btnDiscountVnd.addEventListener("click", () => {
      setModalDiscountMode("amount");
    });
  }

  // Cơ chế thông minh: Tự chuyển sang VNĐ nếu gõ số > 100
  if (inputDiscount) {
    inputDiscount.addEventListener("input", () => {
      const raw = inputDiscount.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;

      // Cơ chế thông minh: > 100 thì thành VNĐ, <= 100 thì thành %
      if (num > 100) {
        itemDiscountModalType = "amount";
        if (btnDiscountPct) btnDiscountPct.classList.remove("active");
        if (btnDiscountVnd) btnDiscountVnd.classList.add("active");
        inputDiscount.value = num > 0 ? num.toLocaleString("vi-VN") : "";
      } else {
        itemDiscountModalType = "percent";
        if (btnDiscountPct) btnDiscountPct.classList.add("active");
        if (btnDiscountVnd) btnDiscountVnd.classList.remove("active");
        inputDiscount.value = num > 0 ? num : (raw === "0" ? "0" : "");
      }
    });
  }

  // Format đơn giá gốc khi nhập
  if (inputPrice) {
    inputPrice.addEventListener("input", () => {
      const raw = inputPrice.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;
      inputPrice.value = num > 0 ? num.toLocaleString("vi-VN") : "";
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", () => {
      if (!currentEditingItemId) return;
      const item = orderItems.find((it) => it.id === currentEditingItemId);
      if (!item) return;

      const rawPrice = inputPrice.value.replace(/\D/g, "");
      const newOriginalPrice = rawPrice ? parseInt(rawPrice, 10) : item.originalPrice;

      const rawDiscount = inputDiscount.value.replace(/\D/g, "");
      const discountVal = rawDiscount ? parseInt(rawDiscount, 10) : 0;
      const discountType = itemDiscountModalType || "percent";

      item.originalPrice = newOriginalPrice;
      item.discountVal = discountVal;
      item.discountType = discountType;

      // Tính giá sau chiết khấu
      if (discountType === "percent") {
        const pct = Math.min(100, Math.max(0, discountVal));
        item.finalPrice = Math.round(item.originalPrice * (1 - pct / 100));
      } else {
        item.finalPrice = Math.max(0, item.originalPrice - discountVal);
      }

      item.subtotal = item.qty * item.finalPrice;

      saveOrderDraft();
      renderOrderCart();
      closeModal();
    });
  }
}

function openItemPriceModal(item) {
  currentEditingItemId = item.id;
  itemDiscountModalType = item.discountType || "percent";

  const modal = document.getElementById("orderItemPriceModal");
  const titleName = document.getElementById("itemPriceModalProdName");
  const inputPrice = document.getElementById("itemPriceInput");
  const inputDiscount = document.getElementById("itemDiscountInput");
  const btnDiscountPct = document.getElementById("btnItemDiscountPct");
  const btnDiscountVnd = document.getElementById("btnItemDiscountVnd");

  if (titleName) titleName.innerText = `${item.name} (${item.unit || 'Món'})`;
  if (inputPrice) inputPrice.value = (item.originalPrice || 0).toLocaleString("vi-VN");

  if (btnDiscountPct) btnDiscountPct.classList.toggle("active", itemDiscountModalType === "percent");
  if (btnDiscountVnd) btnDiscountVnd.classList.toggle("active", itemDiscountModalType === "amount");

  if (inputDiscount) {
    if (item.discountVal > 0) {
      inputDiscount.value = itemDiscountModalType === "amount" 
        ? item.discountVal.toLocaleString("vi-VN") 
        : item.discountVal;
    } else {
      inputDiscount.value = "";
    }
  }

  if (modal) modal.style.display = "flex";
  if (inputDiscount) inputDiscount.focus();
}

// --------------------------------------------------------------------------
// MODAL: THÊM SẢN PHẨM NGOÀI THỦ CÔNG (DÙNG 1 LẦN, KHÔNG ẢNH)
// --------------------------------------------------------------------------
function setupManualItemModal() {
  const modal = document.getElementById("orderManualModal");
  const btnClose = document.getElementById("btnCloseManualModal");
  const btnCancel = document.getElementById("btnCancelManualModal");
  const form = document.getElementById("orderManualForm");
  const priceInput = document.getElementById("manualItemPrice");

  const closeModal = () => {
    if (modal) modal.style.display = "none";
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (priceInput) {
    priceInput.addEventListener("input", () => {
      const raw = priceInput.value.replace(/\D/g, "");
      const num = raw ? parseInt(raw, 10) : 0;
      priceInput.value = num > 0 ? num.toLocaleString("vi-VN") : "";
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("manualItemName");
      const unitInput = document.getElementById("manualItemUnit");
      const qtyInput = document.getElementById("manualItemQty");

      const name = nameInput ? nameInput.value.trim() : "";
      const unit = unitInput ? (unitInput.value.trim() || "Full 30ml") : "Full 30ml";
      const rawPrice = priceInput ? priceInput.value.replace(/\D/g, "") : "0";
      const price = rawPrice ? parseInt(rawPrice, 10) : 0;
      const rawQty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      const qty = isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;

      if (!name) {
        showToast("⚠️ Vui lòng nhập tên sản phẩm!");
        return;
      }

      addProductToOrder({
        name: name,
        unit: unit,
        price: price,
        img: "",
        isManual: true
      });

      if (qty > 1) {
        const added = orderItems.find((it) => it.name === name && it.unit === unit);
        if (added) {
          added.qty = qty;
          added.subtotal = added.qty * added.finalPrice;
          saveOrderDraft();
          renderOrderCart();
        }
      }

      form.reset();
      if (unitInput) unitInput.value = "Full 30ml";
      closeModal();
    });
  }
}

function openManualItemModal() {
  const modal = document.getElementById("orderManualModal");
  const form = document.getElementById("orderManualForm");
  const nameInput = document.getElementById("manualItemName");
  const unitInput = document.getElementById("manualItemUnit");
  if (form) form.reset();
  if (unitInput) unitInput.value = "Full 30ml";
  if (modal) modal.style.display = "flex";
  if (nameInput) nameInput.focus();
}

// --------------------------------------------------------------------------
// TẠO HÓA ĐƠN XÁC NHẬN VÀ XUẤT ẢNH CANVAS
// --------------------------------------------------------------------------
async function handleCreateInvoice() {
  if (orderItems.length === 0) {
    showToast("⚠️ Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng!");
    return;
  }

  // Kiểm tra tính hợp lệ của số điện thoại nếu đã nhập
  const phone = (orderCustomer.phone || "").trim();
  if (phone && !isValidPhoneNumber(phone)) {
    showToast("⚠️ Số điện thoại không đúng định dạng (cần đúng 10 số hoặc mã quốc tế +...)!");
    const inputPhone = document.getElementById("orderCustomerPhone");
    if (inputPhone) {
      inputPhone.focus();
      validatePhoneUI(inputPhone);
    }
    return;
  }

  if (typeof OrderCanvasEngine === "undefined" || !OrderCanvasEngine.generateInvoiceImage) {
    showToast("❌ Lỗi: Chưa tải được engine tạo ảnh!");
    return;
  }

  showToast("⏳ Đang tạo ảnh xác nhận đơn hàng...");

  const totalsRes = calculateOrderTotals();

  const orderData = {
    items: orderItems,
    customer: orderCustomer,
    totals: {
      rawItemsTotal: totalsRes.rawItemsTotal,
      itemsTotal: totalsRes.itemsTotal,
      productDiscount: totalsRes.productDiscount,
      memberDiscount: totalsRes.memberDiscountMoney,
      appliedPromos: totalsRes.appliedPromosList,
      otherDiscount: totalsRes.otherDiscountMoney,
      orderDiscount: totalsRes.totalOrderDiscountMoney,
      shippingFee: orderShippingFee,
      grandTotal: totalsRes.grandTotal
    }
  };

  try {
    const result = await OrderCanvasEngine.generateInvoiceImage(orderData);

    // 1. Tự động Copy vào Clipboard
    let copySuccess = false;
    try {
      if (navigator.clipboard && navigator.clipboard.write && result.blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": result.blob })
        ]);
        copySuccess = true;
      }
    } catch (clipErr) {
      copySuccess = false;
    }

    if (copySuccess) {
      showToast("✨ Đã tạo & copy ảnh xác nhận đơn vào bộ nhớ tạm!");
    } else {
      showToast("✨ Đã tạo ảnh xác nhận đơn hàng!");
    }

    // 2. Mở Modal Xem Trước Ảnh
    openInvoicePreviewModal(result);

  } catch (err) {
    showToast("❌ Lỗi khi xuất ảnh: " + err.message);
  }
}

// Modal Xem Trước Ảnh Hóa Đơn
let currentInvoiceResult = null;

function setupInvoicePreviewModal() {
  const modal = document.getElementById("invoicePreviewModal");
  const btnClose = document.getElementById("btnCloseInvoicePreviewModal");
  const btnCopy = document.getElementById("btnCopyInvoiceAgain");
  const btnView = document.getElementById("btnViewInvoiceTab");
  const btnDownload = document.getElementById("btnDownloadInvoice");

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      if (currentInvoiceResult && currentInvoiceResult.blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": currentInvoiceResult.blob })
          ]);
          showToast("✨ Đã copy lại ảnh xác nhận đơn!");
        } catch (e) {
          showToast("❌ Trình duyệt chặn copy ảnh, vui lòng tải ảnh về.");
        }
      }
    });
  }

  if (btnView) {
    btnView.addEventListener("click", () => {
      if (currentInvoiceResult && currentInvoiceResult.blob) {
        const blobUrl = URL.createObjectURL(currentInvoiceResult.blob);
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: blobUrl });
        } else {
          window.open(blobUrl, "_blank");
        }
        // Thu hồi blob URL sau 10 giây tránh rò rỉ bộ nhớ (Memory Leak Prevention)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else if (currentInvoiceResult && currentInvoiceResult.dataUrl) {
        window.open(currentInvoiceResult.dataUrl, "_blank");
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      if (currentInvoiceResult && currentInvoiceResult.dataUrl) {
        const a = document.createElement("a");
        const custNameClean = orderCustomer.name ? orderCustomer.name.replace(/[^\w\s]/gi, "").trim() : "Khach";
        a.download = `DonHang_${custNameClean}_${Date.now()}.png`;
        a.href = currentInvoiceResult.dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }
}

function openInvoicePreviewModal(result) {
  currentInvoiceResult = result;
  const modal = document.getElementById("invoicePreviewModal");
  const imgEl = document.getElementById("invoicePreviewImg");

  if (imgEl && result.dataUrl) {
    imgEl.src = result.dataUrl;
  }
  if (modal) modal.style.display = "flex";
}

// --------------------------------------------------------------------------
// MODAL: CHỌN CHƯƠNG TRÌNH KHUYẾN MÃI (HỖ TRỢ MỞ RỘNG TỪ GOOGLE SHEET)
// --------------------------------------------------------------------------
function setupPromoModal() {
  const modal = document.getElementById("orderPromoModal");
  const btnOpen = document.getElementById("btnOrderAddPromo");
  const btnClose = document.getElementById("btnClosePromoModal");
  const btnCancel = document.getElementById("btnCancelPromoModal");
  const btnApply = document.getElementById("btnApplyPromoModal");
  const listEl = document.getElementById("orderPromoList");

  const closeModal = () => {
    if (modal) modal.style.display = "none";
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      renderPromoChecklist();
      if (modal) modal.style.display = "flex";
    });
  }

  function renderPromoChecklist() {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!orderAvailablePromotions || orderAvailablePromotions.length === 0) {
      listEl.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 11.5px;">Chưa có chương trình khuyến mãi nào</div>`;
      return;
    }
    orderAvailablePromotions.forEach((promo) => {
      const isChecked = orderAppliedPromoIds.includes(promo.id);
      const itemEl = document.createElement("label");
      itemEl.className = "order-promo-item";

      let typeBadge = '<span class="order-promo-type promo-type-both">Full & Chiết</span>';
      if (promo.saleType === 1) typeBadge = '<span class="order-promo-type promo-type-full">Full</span>';
      else if (promo.saleType === 2) typeBadge = '<span class="order-promo-type promo-type-chiet">Chiết</span>';

      const countText = promo.productNames?.size
        ? `<span class="order-promo-count">(${promo.productNames.size} chai)</span>`
        : "";

      const safeId = escAttr(promo.id);
      const safeName = escAttr(promo.name);

      itemEl.innerHTML = `
        <input type="checkbox" value="${safeId}" ${isChecked ? "checked" : ""}>
        <div class="order-promo-info">
          <div class="order-promo-top">
            <span class="order-promo-name">${safeName}</span>
            ${countText}
          </div>
          <div class="order-promo-badges">
            ${typeBadge}
            <span class="order-promo-badge">${promo.type === "percent" ? `-${promo.value}%` : `-${formatVND(promo.value)}`}</span>
          </div>
        </div>
      `;
      listEl.appendChild(itemEl);
    });
  }

  if (btnApply) {
    btnApply.addEventListener("click", () => {
      if (!listEl) return;
      const checkedBoxes = listEl.querySelectorAll("input[type='checkbox']:checked");
      orderAppliedPromoIds = Array.from(checkedBoxes).map((cb) => cb.value);
      closeModal();
      renderOrderTotals();
      saveOrderDraft();
    });
  }
}

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOrderModule);
} else {
  initOrderModule();
}
