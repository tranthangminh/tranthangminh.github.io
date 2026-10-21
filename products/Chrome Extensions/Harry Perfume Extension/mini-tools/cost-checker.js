/**
 * COST-CHECKER.JS - Bộ điều phối cửa sổ Kiểm Tra Giá Vốn (Giao diện Bảng tính Excel)
 * - Giao diện bảng tính Excel thống nhất, thanh cuộn chung duy nhất
 * - Hỗ trợ Word Wrap và text luôn căn giữa dọc (middle) hoàn hảo
 * - Cột Hình thumbnail chai nước hoa nằm giữa cột 1 (Output) và cột 2 (Input)
 * - Tùy chọn nút 'Hiện ảnh lớn': Hiển thị ảnh 128x128 cố định phía trên/dưới dòng khi hover
 * - Cho phép giá vốn và giá Recheck lệch +-1 vẫn hiển thị xanh (khớp)
 * - Hiển thị tức thì (0ms) Cột Input & Giá Recheck (đã lưu sẵn)
 * - Tên Output không bold, đổi màu xanh lá khi khớp 100% với input
 * - Riêng phân loại Chiết: chỉ ghi dung tích, không ghi chữ 'Chiết' (vd: - 10ml)
 * - Giá Vốn (output) chuẩn hóa chia 1000: 570000 -> 570, 64100 -> 64,1, 1515300 -> 1.515,3
 * - Lưu trữ tự động (StorageHelper / localStorage)
 */

(function () {
  const API_URL = "https://script.google.com/macros/s/AKfycbz5_hZe3O6FrrF21tPhZX0oB9Hm9oelGcwUHXGcDfnraNQTjnr-cYEqnZMwe-4VnLJC/exec";

  // Khóa lưu trữ dữ liệu
  const STORAGE_KEY_INPUT_NAMES = "costCheckerInputNames";
  const STORAGE_KEY_INPUT_COSTS = "costCheckerInputCosts";
  const STORAGE_KEY_SAVED_OUTPUTS = "costCheckerSavedOutputs";
  const STORAGE_KEY_SAVED_SYS_COSTS = "costCheckerSavedSysCosts";
  const STORAGE_KEY_SAVED_IMAGES = "costCheckerSavedImages";
  const STORAGE_KEY_LARGE_IMG_PREVIEW = "costCheckerShowLargeImage";
  const MIN_ROWS = 25;

  // DOM Elements
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const dbCountText = document.getElementById("dbCountText");
  const btnToggleTheme = document.getElementById("btnToggleTheme");
  const themeIcon = document.getElementById("themeIcon");

  const rowCountLabel = document.getElementById("rowCountLabel");
  const matchedCountLabel = document.getElementById("matchedCountLabel");
  const costSeparator = document.getElementById("costSeparator");
  const costCountLabel = document.getElementById("costCountLabel");
  const btnTogglePreview = document.getElementById("btnTogglePreview");
  const btnClearAll = document.getElementById("btnClearAll");

  const excelTableBody = document.getElementById("excelTableBody");
  const spreadsheetContainer = document.getElementById("spreadsheetContainer");
  const cursorImagePreview = document.getElementById("cursorImagePreview");
  const cursorImageTag = document.getElementById("cursorImageTag");

  const btnCopyCol1 = document.getElementById("btnCopyCol1");
  const btnPasteCol2 = document.getElementById("btnPasteCol2");
  const btnClearCol2 = document.getElementById("btnClearCol2");
  const btnPasteCol3 = document.getElementById("btnPasteCol3");
  const btnClearCol3 = document.getElementById("btnClearCol3");
  const btnCopyCol4 = document.getElementById("btnCopyCol4");
  const btnCopyMerge = document.getElementById("btnCopyMerge");

  const toastEl = document.getElementById("costCheckerToast");
  const toastMsg = document.getElementById("costCheckerToastMsg");

  // State
  let allProducts = [];
  let isDbLoading = false;
  let saveStateTimer = null;
  let toastTimer = null;
  let showLargeImage = false;

  let rowNames = [];    // Cột Input Tên sản phẩm
  let rowCosts = [];    // Cột Giá Recheck
  let rowOutputs = [];  // Cột Output Tên chuẩn + Phân loại
  let rowSysCosts = []; // Cột Giá Vốn hệ thống
  let rowImages = [];   // Cột Hình: Ảnh thumbnail chai nước hoa
  let rowMatches = [];  // Đánh dấu khớp 100%

  // Khởi tạo
  document.addEventListener("DOMContentLoaded", initCostChecker);

  async function initCostChecker() {
    restoreTheme();
    initPreviewToggle();
    bindEvents();
    setupCursorImagePreview();

    // 1. Phục hồi NGAY LẬP TỨC (0ms) dữ liệu đã lưu để hiển thị không cần chờ tải mạng
    restoreSavedInputsSync();
    renderTable();

    // 2. Nạp kho dữ liệu allProducts trong background và tính toán hoàn thiện các cột
    loadProductsDatabase().then(() => {
      processAllRows();
      renderTable();
    });
  }

  // 1. Quản lý Theme Sáng / Tối
  function restoreTheme() {
    try {
      const saved = localStorage.getItem("theme");
      const theme = saved ? JSON.parse(saved) : "dark";
      document.documentElement.setAttribute("data-theme", theme);
      if (themeIcon) {
        themeIcon.innerText = (theme === "light") ? "🌙" : "☀️";
      }
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = (current === "light") ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", JSON.stringify(next));
    } catch (e) {}
    if (themeIcon) {
      themeIcon.innerText = (next === "light") ? "🌙" : "☀️";
    }
  }

  // Quản lý nút bật/tắt Hiện ảnh lớn
  function initPreviewToggle() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LARGE_IMG_PREVIEW);
      showLargeImage = saved === "true";
    } catch (e) {
      showLargeImage = false;
    }
    if (btnTogglePreview) {
      btnTogglePreview.classList.toggle("active", showLargeImage);
      btnTogglePreview.addEventListener("click", () => {
        showLargeImage = !showLargeImage;
        btnTogglePreview.classList.toggle("active", showLargeImage);
        try {
          localStorage.setItem(STORAGE_KEY_LARGE_IMG_PREVIEW, showLargeImage);
        } catch (e) {}
        if (!showLargeImage && cursorImagePreview) {
          cursorImagePreview.style.display = "none";
        }
        showToast(showLargeImage ? "🖼️ Đã BẬT xem ảnh lớn 128x128 khi rê chuột vào dòng!" : "🖼️ Đã TẮT xem ảnh lớn!");
      });
    }
  }

  // 2. State Persistence (Phục hồi tức thì 0ms từ localStorage)
  function restoreSavedInputsSync() {
    try {
      const savedNames = JSON.parse(localStorage.getItem(STORAGE_KEY_INPUT_NAMES) || '""');
      const savedCosts = JSON.parse(localStorage.getItem(STORAGE_KEY_INPUT_COSTS) || '""');
      const savedOutputs = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_OUTPUTS) || '""');
      const savedSysCosts = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_SYS_COSTS) || '""');
      const savedImages = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_IMAGES) || '""');

      if (savedNames && typeof savedNames === "string") {
        rowNames = savedNames.split("\n");
      }
      if (savedCosts && typeof savedCosts === "string") {
        rowCosts = savedCosts.split("\n");
      }
      if (savedOutputs && typeof savedOutputs === "string") {
        rowOutputs = savedOutputs.split("\n");
      }
      if (savedSysCosts && typeof savedSysCosts === "string") {
        rowSysCosts = savedSysCosts.split("\n");
      }
      if (savedImages && typeof savedImages === "string") {
        rowImages = savedImages.split("\n");
      }
    } catch (e) {
      console.warn("Lỗi khôi phục dữ liệu đã lưu:", e);
    }
  }

  function scheduleSaveState() {
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(saveInputsState, 300);
  }

  async function saveInputsState() {
    const lastIdx = getLastFilledIndex();
    const namesText = lastIdx >= 0 ? rowNames.slice(0, lastIdx + 1).join("\n") : "";
    const costsText = lastIdx >= 0 ? rowCosts.slice(0, lastIdx + 1).join("\n") : "";
    const outputsText = lastIdx >= 0 ? rowOutputs.slice(0, lastIdx + 1).join("\n") : "";
    const sysCostsText = lastIdx >= 0 ? rowSysCosts.slice(0, lastIdx + 1).join("\n") : "";
    const imagesText = lastIdx >= 0 ? rowImages.slice(0, lastIdx + 1).join("\n") : "";

    try {
      if (typeof StorageHelper !== "undefined") {
        await StorageHelper.set(STORAGE_KEY_INPUT_NAMES, namesText);
        await StorageHelper.set(STORAGE_KEY_INPUT_COSTS, costsText);
      }
      localStorage.setItem(STORAGE_KEY_INPUT_NAMES, JSON.stringify(namesText));
      localStorage.setItem(STORAGE_KEY_INPUT_COSTS, JSON.stringify(costsText));
      localStorage.setItem(STORAGE_KEY_SAVED_OUTPUTS, JSON.stringify(outputsText));
      localStorage.setItem(STORAGE_KEY_SAVED_SYS_COSTS, JSON.stringify(sysCostsText));
      localStorage.setItem(STORAGE_KEY_SAVED_IMAGES, JSON.stringify(imagesText));
    } catch (e) {}
  }

  function getLastFilledIndex() {
    let last = -1;
    const maxLen = Math.max(rowNames.length, rowCosts.length);
    for (let i = maxLen - 1; i >= 0; i--) {
      if ((rowNames[i] && rowNames[i].trim()) || (rowCosts[i] && rowCosts[i].trim())) {
        last = i;
        break;
      }
    }
    return last;
  }

  // 3. Nạp cơ sở dữ liệu allProducts từ Cache hoặc Google Apps Script
  async function loadProductsDatabase() {
    if (isDbLoading) return;
    isDbLoading = true;

    if (dbCountText) dbCountText.innerText = "Đang nạp kho...";

    try {
      if (typeof StorageHelper !== "undefined") {
        const cached = await StorageHelper.get("cachedProducts", []);
        if (Array.isArray(cached) && cached.length > 0) {
          allProducts = cached;
          updateDbStatus(true);
          return;
        }
      }

      const res = await fetch(API_URL);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.products || data.data || []);

      if (list.length > 0) {
        allProducts = list;
        if (typeof StorageHelper !== "undefined") {
          await StorageHelper.set("cachedProducts", allProducts);
        }
        updateDbStatus(true);
      } else {
        updateDbStatus(false);
      }
    } catch (err) {
      updateDbStatus(false);
    } finally {
      isDbLoading = false;
    }
  }

  function updateDbStatus(isSuccess) {
    const dot = dbStatusBadge ? dbStatusBadge.querySelector(".status-dot") : null;
    if (isSuccess && allProducts.length > 0) {
      if (dot) dot.classList.add("ready");
      if (dbCountText) dbCountText.innerText = `${allProducts.length.toLocaleString("vi-VN")} chai trong kho`;
    } else {
      if (dot) dot.classList.remove("ready");
      if (dbCountText) dbCountText.innerText = "Lỗi kết nối kho";
    }
  }

  // 4. Định dạng Giá Vốn Output theo yêu cầu:
  // Rút gọn chia 1.000, số sau dấu phẩy lấy đúng 1 chữ số (làm tròn):
  // 570000 -> 570 | 64100 -> 64,1 | 196588 -> 196,6 | 1515300 -> 1.515,3
  function formatOutputCost(rawVal) {
    if (rawVal === undefined || rawVal === null || rawVal === "" || rawVal === "-") return "";
    const cleanDigits = String(rawVal).replace(/\D/g, "");
    const numVND = parseInt(cleanDigits, 10);
    if (isNaN(numVND) || numVND <= 0) return "";

    const valueInK = numVND / 1000;
    const roundedK = Math.round(valueInK * 10) / 10;
    const parts = roundedK.toFixed(1).split(".");
    const integerPart = parseInt(parts[0], 10).toLocaleString("vi-VN");
    const decimalPart = parts[1];

    if (decimalPart && decimalPart !== "0") {
      return `${integerPart},${decimalPart}`;
    }
    return integerPart;
  }

  // Chuẩn hóa giá Recheck để so sánh chính xác với Giá Vốn
  function parseRecheckToK(val) {
    if (val === undefined || val === null || val === "") return null;
    let s = String(val).trim().toLowerCase();
    if (!s || s === "-") return null;

    s = s.replace(/[đk\s]/g, "");

    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    } else if (s.includes(".")) {
      const dotParts = s.split(".");
      if (dotParts.length > 2 || dotParts[1].length === 3) {
        s = s.replace(/\./g, "");
      }
    }

    let num = parseFloat(s);
    if (isNaN(num) || num <= 0) return null;

    if (num >= 10000) {
      num = num / 1000;
    }

    return Math.round(num * 10) / 10;
  }

  // Kiểm tra so khớp giá cho phép dung sai lệch +-1 (VD: 472,7 và 472,667 vẫn xanh)
  function isCostMatched(costVal, sysCostVal) {
    const rK = parseRecheckToK(costVal);
    const sK = parseRecheckToK(sysCostVal);
    if (rK === null || sK === null) return null;

    // Cho phép chênh lệch tối đa +-1
    return Math.abs(rK - sK) <= 1.001;
  }

  // Hợp nhất dữ liệu giá (Cột Merge): ưu tiên Giá Vốn (output), nếu không có thì lấy Giá Recheck
  function getMergedCostData(sysCostVal, costVal) {
    const s = (sysCostVal !== undefined && sysCostVal !== null) ? String(sysCostVal).trim() : "";
    if (s) return { value: s, source: "output" };

    const c = (costVal !== undefined && costVal !== null) ? String(costVal).trim() : "";
    if (!c) return { value: "", source: "none" };

    const k = parseRecheckToK(c);
    if (k !== null) {
      const parts = Number(k).toFixed(1).split(".");
      const intPart = parseInt(parts[0], 10).toLocaleString("vi-VN");
      const decPart = parts[1];
      const formatted = (decPart && decPart !== "0") ? `${intPart},${decPart}` : intPart;
      return { value: formatted, source: "recheck" };
    }
    return { value: c, source: "recheck" };
  }

  function computeMergedCost(sysCostVal, costVal) {
    return getMergedCostData(sysCostVal, costVal).value;
  }

  // 5. Kiểm tra nếu tên nhập khớp 100% với tên sản phẩm
  function isExact100Match(rawInput, matchedProd) {
    if (!rawInput || !matchedProd) return false;
    let parsed = { cleanName: "" };
    if (typeof CostCheckerParser !== "undefined") {
      parsed = CostCheckerParser.extractTypeAndVolume(rawInput);
    }
    const cleanQ = parsed.cleanName || rawInput;
    const normalize = (str) => {
      const s = typeof removeAccents === "function" ? removeAccents(str) : String(str).toLowerCase();
      return s.replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, " ").replace(/\s+/g, " ").trim();
    };

    const qNorm = normalize(cleanQ);
    const pNorm = normalize(matchedProd.name || "");
    const sNorm = normalize(matchedProd.tenrutgon || "");

    return qNorm.length > 0 && (qNorm === pNorm || (sNorm.length > 0 && qNorm === sNorm));
  }

  // 6. Tra cứu Giá Vốn từ sản phẩm
  function lookupCostPrice(product, type, volume, isGoc) {
    if (!product || isGoc) return "";

    const volNum = volume ? parseInt(String(volume).replace(/\D/g, ""), 10) : 0;
    const t = (type || "").trim().toLowerCase();

    // Nhóm Chiết (5ml, 10ml, 20ml)
    if (t === "chiết" || t === "chiet" || volNum === 5 || volNum === 10 || volNum === 20) {
      if (volNum === 5) return formatOutputCost(product.giavon5ml);
      if (volNum === 10) return formatOutputCost(product.giavon10ml);
      if (volNum === 20) return formatOutputCost(product.giavon20ml);
    }

    // Nhóm Tester (quét slot 1..5)
    if (t === "tester" || t === "test") {
      for (let i = 1; i <= 5; i++) {
        const slotVol = parseInt(String(product["dungtich" + i] || "").replace(/\D/g, ""), 10);
        if (slotVol && slotVol === volNum) {
          return formatOutputCost(product["giavontest" + i]);
        }
      }
      if (product.giavontest1 && (!volNum || volNum === parseInt(String(product.dungtich1 || "").replace(/\D/g, ""), 10))) {
        return formatOutputCost(product.giavontest1);
      }
      return "";
    }

    // Nhóm Full, Nobox, Refill, Mini hoặc mặc định (quét slot 1..5)
    for (let i = 1; i <= 5; i++) {
      const slotVol = parseInt(String(product["dungtich" + i] || "").replace(/\D/g, ""), 10);
      if (slotVol && slotVol === volNum) {
        return formatOutputCost(product["giavonfull" + i]);
      }
    }

    // Fallback slot 1
    if (product.giavonfull1 && (!volNum || volNum === parseInt(String(product.dungtich1 || "").replace(/\D/g, ""), 10))) {
      return formatOutputCost(product.giavonfull1);
    }

    return "";
  }

  // 7. Tính toán kết quả cho một dòng
  function computeRowResult(rawName) {
    const line = (rawName || "").trim();
    if (!line) {
      return { outputName: "", outputCost: "", imgUrl: "", isMatch100: false };
    }

    let parsed = { type: "", volume: "", combo: "", cleanName: "", isGoc: false };
    if (typeof CostCheckerParser !== "undefined") {
      parsed = CostCheckerParser.extractTypeAndVolume(line);
    }

    const searchQuery = parsed.cleanName.length > 0 ? parsed.cleanName : line;
    let matchedProd = null;

    if (allProducts.length > 0 && typeof searchProducts === "function") {
      const results = searchProducts(searchQuery, allProducts, { limit: 1 });
      if (results && results.length > 0) {
        matchedProd = results[0];
      }
    }

    if (matchedProd && matchedProd.name) {
      let finalVolume = parsed.volume;
      if (!finalVolume && matchedProd.dungtich1) {
        const rawVolNum = parseInt(String(matchedProd.dungtich1).replace(/\D/g, ""), 10);
        if (!isNaN(rawVolNum) && rawVolNum > 0) {
          finalVolume = `${rawVolNum}ml`;
        }
      }

      let finalType = parsed.type;
      if (!finalType && finalVolume) {
        const num = parseInt(String(finalVolume).replace(/\D/g, ""), 10);
        if (num === 5 || num === 10 || num === 20) {
          finalType = "Chiết";
        } else if (num >= 30) {
          finalType = "Full";
        }
      }

      // QUY TẮC ĐẶC BIỆT: Riêng Chiết không cần ghi chữ 'Chiết', chỉ cần ghi dung tích (vd: - 10ml)
      let typeVolCombo = "";
      if (finalType === "Chiết") {
        typeVolCombo = finalVolume || "";
      } else {
        typeVolCombo = [finalType, finalVolume].filter(Boolean).join(" ");
      }

      const formattedName = typeVolCombo
        ? `${matchedProd.name} - ${typeVolCombo}`
        : matchedProd.name;

      const formattedCost = lookupCostPrice(matchedProd, finalType, finalVolume, parsed.isGoc);

      // Lấy ảnh chai nước hoa
      let imgUrl = "";
      if (matchedProd.img && matchedProd.img !== "-" && String(matchedProd.img).startsWith("http")) {
        imgUrl = matchedProd.img;
      } else if (typeof getProductImageByName === "function") {
        imgUrl = getProductImageByName(matchedProd.name);
      }

      const isMatch = isExact100Match(rawName, matchedProd);

      return {
        outputName: formattedName,
        outputCost: formattedCost,
        imgUrl: imgUrl,
        isMatch100: isMatch
      };
    }

    return { outputName: "", outputCost: "", imgUrl: "", isMatch100: false };
  }

  // Xử lý toàn bộ các dòng hiện tại
  function processAllRows() {
    const total = Math.max(rowNames.length, rowCosts.length);
    rowOutputs = [];
    rowSysCosts = [];
    rowImages = [];
    rowMatches = [];

    for (let i = 0; i < total; i++) {
      const name = rowNames[i] || "";
      const res = computeRowResult(name);
      rowOutputs[i] = res.outputName;
      rowSysCosts[i] = res.outputCost;
      rowImages[i] = res.imgUrl;
      rowMatches[i] = res.isMatch100;
    }
  }

  // 8. Render giao diện Bảng tính Excel
  function renderTable() {
    if (!excelTableBody) return;

    const lastIdx = getLastFilledIndex();
    const totalRows = Math.max(lastIdx + 1, MIN_ROWS);

    let html = "";
    for (let i = 0; i < totalRows; i++) {
      const nameVal = rowNames[i] || "";
      const costVal = rowCosts[i] || "";
      const outputVal = rowOutputs[i] || "";
      const sysCostVal = rowSysCosts[i] || "";
      const imgVal = rowImages[i] || "";
      const isMatch = rowMatches[i] || false;

      // Xác định trạng thái đối chiếu giá với dung sai +-1
      let costStatusClass = "";
      const matchResult = isCostMatched(costVal, sysCostVal);
      if (matchResult !== null) {
        costStatusClass = matchResult ? "cell-match" : "cell-mismatch";
      }

      const match100Class = isMatch ? "match-100" : "";

      // Xác định giá trị và màu sắc Cột Merge (khớp hoàn toàn với màu của Giá Vốn output; recheck thì màu trắng)
      const mergeData = getMergedCostData(sysCostVal, costVal);
      let mergeStatusClass = "";
      if (mergeData.source === "recheck") {
        mergeStatusClass = "merge-recheck";
      } else if (mergeData.source === "output") {
        mergeStatusClass = costStatusClass; // "cell-match" (xanh lá) hoặc "cell-mismatch" (đỏ) hoặc "" (vàng gold)
      }

      html += `
        <tr class="excel-row" data-row="${i}">
          <td class="td-num">${i + 1}</td>
          <td class="td-output ${match100Class}" id="outputCell_${i}" title="${escAttr(outputVal)}">${escHtml(outputVal)}</td>
          <td class="td-thumb" id="thumbCell_${i}">
            ${imgVal ? `<img src="${escAttr(imgVal)}" class="excel-thumb-img" alt="" loading="lazy">` : ""}
          </td>
          <td class="td-input">
            <div class="cell-flex-wrap">
              <textarea class="excel-cell-textarea input-name" data-row="${i}" rows="1" spellcheck="false" placeholder="...">${escHtml(nameVal)}</textarea>
            </div>
          </td>
          <td class="td-recheck">
            <div class="cell-flex-wrap">
              <textarea class="excel-cell-textarea input-cost" data-row="${i}" rows="1" spellcheck="false" placeholder="...">${escHtml(costVal)}</textarea>
            </div>
          </td>
          <td class="td-cost ${costStatusClass}" id="costCell_${i}">${escHtml(sysCostVal)}</td>
          <td class="td-merge ${mergeStatusClass}" id="mergeCell_${i}">${escHtml(mergeData.value)}</td>
        </tr>
      `;
    }

    excelTableBody.innerHTML = html;
    adjustAllTextareas();
    updateToolbarSummary();
  }

  function adjustTextareaHeight(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(28, ta.scrollHeight) + "px";
  }

  function adjustAllTextareas() {
    if (!excelTableBody) return;
    const tas = excelTableBody.querySelectorAll(".excel-cell-textarea");
    tas.forEach(adjustTextareaHeight);
  }

  // 9. Cập nhật thanh Toolbar Thống Kê
  function updateToolbarSummary() {
    let rowCount = 0;
    let matchedCount = 0;
    let checkedCosts = 0;
    let matchedCosts = 0;
    let mismatchedCosts = 0;

    const maxLen = Math.max(rowNames.length, rowCosts.length);
    for (let i = 0; i < maxLen; i++) {
      const n = (rowNames[i] || "").trim();
      const out = (rowOutputs[i] || "").trim();
      const cIn = rowCosts[i] || "";
      const cSys = rowSysCosts[i] || "";

      if (n) rowCount++;
      if (out) matchedCount++;

      const matchResult = isCostMatched(cIn, cSys);
      if (matchResult !== null) {
        checkedCosts++;
        if (matchResult) {
          matchedCosts++;
        } else {
          mismatchedCosts++;
        }
      }
    }

    if (rowCountLabel) {
      rowCountLabel.innerText = `${rowCount} dòng`;
    }
    if (matchedCountLabel) {
      matchedCountLabel.innerText = `${matchedCount} khớp tên`;
    }

    if (!costSeparator || !costCountLabel) return;

    if (checkedCosts === 0) {
      costSeparator.style.display = "none";
      costCountLabel.style.display = "none";
      return;
    }

    costSeparator.style.display = "inline";
    costCountLabel.style.display = "inline";
    costCountLabel.className = "counter-label cost-count";

    if (mismatchedCosts > 0) {
      costCountLabel.classList.add("mismatch");
      costCountLabel.innerText = `⚠️ ${mismatchedCosts} lệch giá (${matchedCosts}/${checkedCosts} khớp)`;
      costCountLabel.title = "Có dòng giá vốn đối chiếu khác với giá vốn trong kho hệ thống";
    } else if (matchedCosts === checkedCosts) {
      costCountLabel.classList.add("all-matched");
      costCountLabel.innerText = `✓ ${matchedCosts}/${checkedCosts} khớp giá`;
      costCountLabel.title = "Toàn bộ giá vốn đối chiếu trùng khớp 100% với hệ thống";
    } else {
      costCountLabel.innerText = `${matchedCosts}/${checkedCosts} khớp giá`;
      costCountLabel.title = `${checkedCosts - matchedCosts} dòng chưa có giá hệ thống để so khớp`;
    }
  }

  // 10. Gắn sự kiện (Event Delegation)
  function bindEvents() {
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener("click", toggleTheme);
    }

    if (btnClearAll) {
      btnClearAll.addEventListener("click", clearAllData);
    }

    if (btnCopyCol1) {
      btnCopyCol1.addEventListener("click", copyCol1);
    }

    if (btnPasteCol2) {
      btnPasteCol2.addEventListener("click", pasteCol2);
    }

    if (btnClearCol2) {
      btnClearCol2.addEventListener("click", clearCol2);
    }

    if (btnPasteCol3) {
      btnPasteCol3.addEventListener("click", pasteCol3);
    }

    if (btnClearCol3) {
      btnClearCol3.addEventListener("click", clearCol3);
    }

    if (btnCopyCol4) {
      btnCopyCol4.addEventListener("click", copyCol4);
    }

    if (btnCopyMerge) {
      btnCopyMerge.addEventListener("click", copyColMerge);
    }

    if (excelTableBody) {
      excelTableBody.addEventListener("input", onCellInput);
      excelTableBody.addEventListener("paste", onCellPaste);
      excelTableBody.addEventListener("keydown", onCellKeydown);
    }
  }

  function onCellInput(e) {
    const target = e.target;
    const rowIdx = parseInt(target.getAttribute("data-row"), 10);
    if (isNaN(rowIdx)) return;

    adjustTextareaHeight(target);

    if (target.classList.contains("input-name")) {
      rowNames[rowIdx] = target.value;
      const res = computeRowResult(target.value);
      rowOutputs[rowIdx] = res.outputName;
      rowSysCosts[rowIdx] = res.outputCost;
      rowImages[rowIdx] = res.imgUrl;
      rowMatches[rowIdx] = res.isMatch100;

      const outCell = document.getElementById(`outputCell_${rowIdx}`);
      if (outCell) {
        outCell.innerText = res.outputName;
        outCell.title = res.outputName;
        if (res.isMatch100) {
          outCell.classList.add("match-100");
        } else {
          outCell.classList.remove("match-100");
        }
      }

      const thumbCell = document.getElementById(`thumbCell_${rowIdx}`);
      if (thumbCell) {
        thumbCell.innerHTML = res.imgUrl
          ? `<img src="${escAttr(res.imgUrl)}" class="excel-thumb-img" alt="" loading="lazy">`
          : "";
      }

      const costCell = document.getElementById(`costCell_${rowIdx}`);
      if (costCell) {
        costCell.innerText = res.outputCost;
        updateCostCellStatus(costCell, rowCosts[rowIdx], res.outputCost);
      }

      const mergeCell = document.getElementById(`mergeCell_${rowIdx}`);
      if (mergeCell) {
        const mData = getMergedCostData(res.outputCost, rowCosts[rowIdx]);
        updateMergeCellStatus(mergeCell, mData, rowCosts[rowIdx], res.outputCost);
      }

      updateToolbarSummary();
      scheduleSaveState();

    } else if (target.classList.contains("input-cost")) {
      rowCosts[rowIdx] = target.value;
      const costCell = document.getElementById(`costCell_${rowIdx}`);
      if (costCell) {
        updateCostCellStatus(costCell, target.value, rowSysCosts[rowIdx] || "");
      }
      const mergeCell = document.getElementById(`mergeCell_${rowIdx}`);
      if (mergeCell) {
        const mData = getMergedCostData(rowSysCosts[rowIdx] || "", target.value);
        updateMergeCellStatus(mergeCell, mData, target.value, rowSysCosts[rowIdx] || "");
      }
      updateToolbarSummary();
      scheduleSaveState();
    }
  }

  function updateCostCellStatus(cellEl, costVal, sysCostVal) {
    cellEl.classList.remove("cell-match", "cell-mismatch");
    const matchResult = isCostMatched(costVal, sysCostVal);
    if (matchResult !== null) {
      cellEl.classList.add(matchResult ? "cell-match" : "cell-mismatch");
    }
  }

  function updateMergeCellStatus(mergeCell, mData, costVal, sysCostVal) {
    if (!mergeCell) return;
    mergeCell.innerText = mData.value;
    mergeCell.classList.remove("cell-match", "cell-mismatch", "merge-recheck");
    if (mData.source === "recheck") {
      mergeCell.classList.add("merge-recheck");
    } else if (mData.source === "output") {
      const matchResult = isCostMatched(costVal, sysCostVal);
      if (matchResult !== null) {
        mergeCell.classList.add(matchResult ? "cell-match" : "cell-mismatch");
      }
    }
  }

  // Dán nhiều dòng trực tiếp vào ô bất kỳ
  function onCellPaste(e) {
    const text = (e.clipboardData || window.clipboardData)?.getData("text");
    if (!text || !text.includes("\n")) return;

    e.preventDefault();
    const lines = text.split(/\r?\n/);
    const target = e.target;
    const startRow = parseInt(target.getAttribute("data-row"), 10) || 0;
    const isNameCol = target.classList.contains("input-name");

    const targetArr = isNameCol ? rowNames : rowCosts;
    for (let j = 0; j < lines.length; j++) {
      targetArr[startRow + j] = lines[j];
    }

    processAllRows();
    renderTable();
    scheduleSaveState();
    showToast(`📋 Đã dán ${lines.length} dòng vào bảng!`);
  }

  // Điều hướng phím mũi tên / Enter như Excel
  function onCellKeydown(e) {
    const target = e.target;
    if (!target.classList.contains("excel-cell-textarea")) return;

    const rowIdx = parseInt(target.getAttribute("data-row"), 10);
    const isName = target.classList.contains("input-name");
    const colClass = isName ? ".input-name" : ".input-cost";

    if ((e.key === "Enter" && !e.shiftKey) || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = excelTableBody.querySelector(`tr[data-row="${rowIdx + 1}"] ${colClass}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      } else {
        const newTotal = rowIdx + 6;
        while (rowNames.length < newTotal) rowNames.push("");
        while (rowCosts.length < newTotal) rowCosts.push("");
        processAllRows();
        renderTable();
        const createdInput = excelTableBody.querySelector(`tr[data-row="${rowIdx + 1}"] ${colClass}`);
        if (createdInput) {
          createdInput.focus();
          createdInput.select();
        }
      }
    } else if (e.key === "ArrowUp") {
      if (rowIdx > 0) {
        e.preventDefault();
        const prevInput = excelTableBody.querySelector(`tr[data-row="${rowIdx - 1}"] ${colClass}`);
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    }
  }

  // 11. Ảnh Lớn 128x128 Cố Định Phía Trên/Dưới Dòng khi Hover
  function setupCursorImagePreview() {
    if (!spreadsheetContainer || !cursorImagePreview || !cursorImageTag) return;

    spreadsheetContainer.addEventListener("mousemove", (e) => {
      // Chỉ hiển thị khi người dùng đã BẬT nút 'Hiện ảnh lớn'
      if (!showLargeImage) {
        cursorImagePreview.style.display = "none";
        return;
      }

      const row = e.target.closest("tr.excel-row");
      if (!row) {
        cursorImagePreview.style.display = "none";
        return;
      }

      const rowIdx = parseInt(row.getAttribute("data-row"), 10);
      const imgUrl = rowImages[rowIdx];

      if (!imgUrl) {
        cursorImagePreview.style.display = "none";
        return;
      }

      if (cursorImageTag.src !== imgUrl) {
        cursorImageTag.src = imgUrl;
      }

      const PREVIEW_SIZE = 128;
      const GAP = 8;
      const rowRect = row.getBoundingClientRect();
      const thumbCell = row.querySelector(".td-thumb");
      const thumbRect = thumbCell ? thumbCell.getBoundingClientRect() : rowRect;

      // Ưu tiên hiển thị ở TRÊN dòng
      let top = rowRect.top - PREVIEW_SIZE - GAP;
      if (top < 10) {
        // Nếu sát mép trên màn hình không đủ khoảng trống -> hiển thị ở DƯỚI dòng
        top = rowRect.bottom + GAP;
      }

      // Căn chỉnh ngang theo cột Hình
      let left = thumbRect.left + (thumbRect.width / 2) - (PREVIEW_SIZE / 2);
      left = Math.max(10, Math.min(window.innerWidth - PREVIEW_SIZE - 10, left));

      cursorImagePreview.style.top = top + "px";
      cursorImagePreview.style.left = left + "px";
      cursorImagePreview.style.display = "flex";
    });

    spreadsheetContainer.addEventListener("mouseleave", () => {
      if (cursorImagePreview) cursorImagePreview.style.display = "none";
    });
  }

  // 12. Copy / Paste từ Header
  async function copyCol1() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Output chưa có dữ liệu!");
      return;
    }
    const lines = rowOutputs.slice(0, lastIdx + 1);
    await copyTextToClipboard(lines.join("\n"));
    showToast(`📋 Đã copy cột Output (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
  }

  async function pasteCol2() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const lines = text.split(/\r?\n/);
      rowNames = lines;
      processAllRows();
      renderTable();
      scheduleSaveState();
      showToast(`📋 Đã dán ${lines.length} dòng vào cột Input!`);
    } catch (e) {
      showToast("⚠️ Hãy bấm Ctrl + V vào ô Input!");
    }
  }

  async function clearCol2() {
    rowNames = [];
    processAllRows();
    renderTable();
    scheduleSaveState();
    showToast("🗑️ Đã xóa sạch cột Input!");
  }

  async function pasteCol3() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const lines = text.split(/\r?\n/);
      rowCosts = lines;
      renderTable();
      scheduleSaveState();
      showToast(`📋 Đã dán ${lines.length} dòng vào cột Giá Recheck!`);
    } catch (e) {
      showToast("⚠️ Hãy bấm Ctrl + V vào ô Giá Recheck!");
    }
  }

  async function clearCol3() {
    rowCosts = [];
    renderTable();
    scheduleSaveState();
    showToast("🗑️ Đã xóa sạch cột Giá Recheck!");
  }

  async function copyCol4() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Giá Vốn chưa có dữ liệu!");
      return;
    }
    const lines = rowSysCosts.slice(0, lastIdx + 1);
    await copyTextToClipboard(lines.join("\n"));
    showToast(`📋 Đã copy cột Giá Vốn (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
  }

  async function copyColMerge() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Merge chưa có dữ liệu!");
      return;
    }
    const lines = [];
    for (let i = 0; i <= lastIdx; i++) {
      lines.push(computeMergedCost(rowSysCosts[i], rowCosts[i]));
    }
    await copyTextToClipboard(lines.join("\n"));
    showToast(`📋 Đã copy cột Merge (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
  }

  // 13. Xóa trắng toàn bộ
  async function clearAllData() {
    rowNames = [];
    rowCosts = [];
    rowOutputs = [];
    rowSysCosts = [];
    rowImages = [];
    rowMatches = [];
    renderTable();

    try {
      if (typeof StorageHelper !== "undefined") {
        await StorageHelper.remove(STORAGE_KEY_INPUT_NAMES);
        await StorageHelper.remove(STORAGE_KEY_INPUT_COSTS);
      }
      localStorage.removeItem(STORAGE_KEY_INPUT_NAMES);
      localStorage.removeItem(STORAGE_KEY_INPUT_COSTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_OUTPUTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_SYS_COSTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_IMAGES);
    } catch (e) {}

    showToast("🗑️ Đã xóa trắng toàn bộ dữ liệu & bộ nhớ tạm!");
  }

  // 14. Helpers
  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function showToast(msg) {
    if (!toastEl || !toastMsg) return;
    toastMsg.innerText = msg;
    toastEl.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.display = "none";
    }, 2200);
  }
})();
