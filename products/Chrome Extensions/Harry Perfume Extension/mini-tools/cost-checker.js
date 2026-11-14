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
  const { showToast } = ToolShell;

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

  const rowSummary = document.getElementById("rowSummary");
  const btnTogglePreview = document.getElementById("btnTogglePreview");
  const btnClearAll = document.getElementById("btnClearAll");
  const filterSelect = document.getElementById("filterSelect");

  const excelTableBody = document.getElementById("excelTableBody");
  // Lọc dòng theo màu kết quả (Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa), dùng chung ToolShell
  const applyFilterToRow = ToolShell.initRowFilter(filterSelect, excelTableBody);
  const spreadsheetContainer = document.getElementById("spreadsheetContainer");

  const btnCopyCol1 = document.getElementById("btnCopyCol1");
  const btnPasteCol2 = document.getElementById("btnPasteCol2");
  const btnClearCol2 = document.getElementById("btnClearCol2");
  const btnPasteCol3 = document.getElementById("btnPasteCol3");
  const btnClearCol3 = document.getElementById("btnClearCol3");
  const btnCopyCol4 = document.getElementById("btnCopyCol4");
  const btnCopyMerge = document.getElementById("btnCopyMerge");

  // State
  let allProducts = [];
  let saveStateTimer = null;

  let rowNames = [];    // Cột Input Tên sản phẩm
  let rowCosts = [];    // Cột Giá Recheck
  let rowOutputs = [];  // Cột Output Tên chuẩn + Phân loại
  let rowSysCosts = []; // Cột Giá Vốn hệ thống
  let rowImages = [];   // Cột Hình: Ảnh thumbnail chai nước hoa
  let rowMatches = [];  // Đánh dấu khớp 100%

  // Khởi tạo
  document.addEventListener("DOMContentLoaded", initCostChecker);

  async function initCostChecker() {
    ToolShell.initThemeToggle(btnToggleTheme, themeIcon);
    ToolShell.initImagePreview(spreadsheetContainer, btnTogglePreview, STORAGE_KEY_LARGE_IMG_PREVIEW);
    bindEvents();

    // 1. Phục hồi NGAY LẬP TỨC (0ms) dữ liệu đã lưu để hiển thị không cần chờ tải mạng
    restoreSavedInputsSync();
    renderTable();

    // 2. Nạp kho dữ liệu allProducts trong background, xong thì chỉ điền lại các ô kết quả
    //    (không vẽ lại cả bảng để người dùng đang gõ dở không bị mất con trỏ)
    loadProductsDatabase().then(() => {
      processAllRows();
      rowOutputs.forEach((_, i) => paintResultRow(i));
      updateToolbarSummary();
    });
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
      await StorageHelper.set(STORAGE_KEY_INPUT_NAMES, namesText);
      await StorageHelper.set(STORAGE_KEY_INPUT_COSTS, costsText);
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

  // 3. Nạp cơ sở dữ liệu allProducts từ cache của panel hoặc Google Apps Script
  async function loadProductsDatabase() {
    dbCountText.innerText = "Đang nạp kho...";
    try {
      allProducts = await ToolShell.loadProducts();
    } catch (err) {
      allProducts = [];
    }
    const isReady = allProducts.length > 0;
    ToolShell.setDbStatus(dbStatusBadge, dbCountText, isReady,
      isReady ? `${allProducts.length.toLocaleString("vi-VN")} chai trong kho` : "Lỗi kết nối kho");
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
    const parsed = CostCheckerParser.extractTypeAndVolume(rawInput);
    const cleanQ = parsed.cleanName || rawInput;
    const normalize = (str) => {
      return removeAccents(str).replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, " ").replace(/\s+/g, " ").trim();
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

    // Full Nobox / Tester Nobox (không hộp): không có cột giá vốn trên Sheet -> để trống
    if (t === "full nobox" || t === "tester nobox") return "";

    // Nhóm Tester (có hộp): cột giavontest1..5 (quét slot 1..5)
    if (t === "tester") {
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

    // Nhóm Full (có hộp), Refill, Mini hoặc mặc định: cột giavonfull1..5 (quét slot 1..5)
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

    const parsed = CostCheckerParser.extractTypeAndVolume(line);

    const searchQuery = parsed.cleanName.length > 0 ? parsed.cleanName : line;
    let matchedProd = null;

    if (allProducts.length > 0) {
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
      const matchResult = isCostMatched(costVal, sysCostVal);
      const costStatusClass = matchResult === null ? "" : (matchResult ? "cell-match" : "cell-mismatch");

      // Xác định giá trị và màu sắc Cột Merge (khớp hoàn toàn với màu của Giá Vốn output; recheck thì màu trắng)
      const mergeData = getMergedCostData(sysCostVal, costVal);
      let mergeStatusClass = "";
      if (mergeData.source === "recheck") {
        mergeStatusClass = "merge-recheck";
      } else if (mergeData.source === "output") {
        mergeStatusClass = costStatusClass; // "cell-match" (xanh lá) hoặc "cell-mismatch" (đỏ) hoặc "" (vàng gold)
      }

      html += `
        <tr class="excel-row${matchResult === false ? " row-alert" : ""}" data-row="${i}" data-img="${escAttr(imgVal)}">
          <td class="td-num">${i + 1}</td>
          <td class="td-thumb" id="thumbCell_${i}">
            ${ToolShell.thumbHtml(imgVal)}
          </td>
          ${ToolShell.stackedCellHtml(i, "name", nameVal, {
            textareaClass: "input-name",
            placeholder: "...",
            resultId: `outputCell_${i}`,
            resultClass: isMatch ? "is-same" : "",
            resultText: outputVal
          })}
          ${ToolShell.stackedCellHtml(i, "cost", costVal, {
            tdClass: costVal.trim() || sysCostVal ? "td-cost is-filled" : "td-cost",
            textareaClass: "input-cost",
            resultId: `costCell_${i}`,
            resultClass: costResultClass(matchResult),
            resultText: sysCostVal
          })}
          <td class="td-merge ${mergeStatusClass}" id="mergeCell_${i}">${escHtml(mergeData.value)}</td>
        </tr>
      `;
    }

    excelTableBody.innerHTML = html;
    Array.from(excelTableBody.rows).forEach(applyFilterToRow);
    updateToolbarSummary();
  }

  // Điền lại các ô kết quả của 1 dòng (Output Name, Hình, Output Vốn, Merge Vốn), không đụng tới ô đang gõ
  function paintResultRow(i) {
    const outCell = document.getElementById(`outputCell_${i}`);
    if (!outCell) return;
    const outputVal = rowOutputs[i] || "";
    const imgVal = rowImages[i] || "";
    outCell.innerText = outputVal;
    outCell.title = outputVal;
    // Tên khớp 100% với Input Name -> xanh lá (.is-same trong tool-base.css)
    outCell.classList.toggle("is-same", Boolean(rowMatches[i]));

    document.getElementById(`thumbCell_${i}`).innerHTML = ToolShell.thumbHtml(imgVal);
    const row = outCell.closest("tr");
    row.dataset.img = imgVal;
    // Output Vốn lệch giá (chữ đỏ) -> viền đỏ cả dòng
    row.classList.toggle("row-alert", isCostMatched(rowCosts[i] || "", rowSysCosts[i] || "") === false);

    const costCell = document.getElementById(`costCell_${i}`);
    costCell.innerText = rowSysCosts[i] || "";
    costCell.title = rowSysCosts[i] || "";
    // Có Input Vốn hoặc Output Vốn -> giữ đủ 2 hàng (cost-checker.css)
    costCell.closest("td").classList.toggle("is-filled", Boolean((rowCosts[i] || "").trim() || rowSysCosts[i]));
    updateCostCellStatus(costCell, rowCosts[i] || "", rowSysCosts[i] || "");
    updateMergeCellStatus(document.getElementById(`mergeCell_${i}`), getMergedCostData(rowSysCosts[i] || "", rowCosts[i] || ""), rowCosts[i] || "", rowSysCosts[i] || "");
    applyFilterToRow(row);
  }

  // 9. Đếm Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa trên toolbar (dùng chung ToolShell, khớp bộ lọc)
  function updateToolbarSummary() {
    ToolShell.renderRowSummary(rowSummary, excelTableBody);
  }

  // 10. Gắn sự kiện (Event Delegation)
  function bindEvents() {
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
      // Ở dòng cuối bấm Enter / ↓: thêm 5 dòng trống rồi đi xuống
      ToolShell.bindColumnNavigation(excelTableBody, (rowIdx) => {
        const newTotal = rowIdx + 6;
        while (rowNames.length < newTotal) rowNames.push("");
        while (rowCosts.length < newTotal) rowCosts.push("");
        processAllRows();
        renderTable();
      });
    }
  }

  function onCellInput(e) {
    const target = e.target;
    const rowIdx = parseInt(target.getAttribute("data-row"), 10);
    if (isNaN(rowIdx)) return;

    if (target.classList.contains("input-name")) {
      rowNames[rowIdx] = target.value;
      const res = computeRowResult(target.value);
      rowOutputs[rowIdx] = res.outputName;
      rowSysCosts[rowIdx] = res.outputCost;
      rowImages[rowIdx] = res.imgUrl;
      rowMatches[rowIdx] = res.isMatch100;
    } else if (target.classList.contains("input-cost")) {
      rowCosts[rowIdx] = target.value;
    } else {
      return;
    }

    paintResultRow(rowIdx);
    updateToolbarSummary();
    scheduleSaveState();
  }

  // Hàng dưới Output Vốn (.cell-result, tool-base.css): khớp Input Vốn -> xanh (.is-same), lệch -> đỏ (.is-alert),
  // chưa nhập Input Vốn -> vàng mặc định
  function costResultClass(matchResult) {
    if (matchResult === null) return "";
    return matchResult ? "is-same" : "is-alert";
  }

  function updateCostCellStatus(cellEl, costVal, sysCostVal) {
    cellEl.classList.remove("is-same", "is-alert");
    const cls = costResultClass(isCostMatched(costVal, sysCostVal));
    if (cls) cellEl.classList.add(cls);
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
    const lines = ToolShell.readMultilinePaste(e);
    if (!lines) return;
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

  // 11. Copy / Paste từ Header
  async function copyCol1() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Output Name chưa có dữ liệu!");
      return;
    }
    const lines = rowOutputs.slice(0, lastIdx + 1);
    await ToolShell.copyText(lines.join("\n"));
    showToast(`📋 Đã copy cột Output Name (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
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
      showToast(`📋 Đã dán ${lines.length} dòng vào cột Input Name!`);
    } catch (e) {
      showToast("⚠️ Hãy bấm Ctrl + V vào ô Input Name!");
    }
  }

  async function clearCol2() {
    rowNames = [];
    processAllRows();
    renderTable();
    scheduleSaveState();
    showToast("🗑️ Đã xóa sạch cột Input Name!");
  }

  async function pasteCol3() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const lines = text.split(/\r?\n/);
      rowCosts = lines;
      renderTable();
      scheduleSaveState();
      showToast(`📋 Đã dán ${lines.length} dòng vào cột Input Vốn!`);
    } catch (e) {
      showToast("⚠️ Hãy bấm Ctrl + V vào ô Input Vốn!");
    }
  }

  async function clearCol3() {
    rowCosts = [];
    renderTable();
    scheduleSaveState();
    showToast("🗑️ Đã xóa sạch cột Input Vốn!");
  }

  async function copyCol4() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Output Vốn chưa có dữ liệu!");
      return;
    }
    const lines = rowSysCosts.slice(0, lastIdx + 1);
    await ToolShell.copyText(lines.join("\n"));
    showToast(`📋 Đã copy cột Output Vốn (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
  }

  async function copyColMerge() {
    const lastIdx = getLastFilledIndex();
    if (lastIdx < 0) {
      showToast("⚠️ Cột Merge Vốn chưa có dữ liệu!");
      return;
    }
    const lines = [];
    for (let i = 0; i <= lastIdx; i++) {
      lines.push(computeMergedCost(rowSysCosts[i], rowCosts[i]));
    }
    await ToolShell.copyText(lines.join("\n"));
    showToast(`📋 Đã copy cột Merge Vốn (${lines.length} dòng)! Dán trực tiếp vào Google Sheet.`);
  }

  // 12. Xóa trắng toàn bộ
  async function clearAllData() {
    rowNames = [];
    rowCosts = [];
    rowOutputs = [];
    rowSysCosts = [];
    rowImages = [];
    rowMatches = [];
    renderTable();

    try {
      await StorageHelper.remove(STORAGE_KEY_INPUT_NAMES);
      await StorageHelper.remove(STORAGE_KEY_INPUT_COSTS);
      localStorage.removeItem(STORAGE_KEY_INPUT_NAMES);
      localStorage.removeItem(STORAGE_KEY_INPUT_COSTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_OUTPUTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_SYS_COSTS);
      localStorage.removeItem(STORAGE_KEY_SAVED_IMAGES);
    } catch (e) {}

    showToast("🗑️ Đã xóa trắng toàn bộ dữ liệu & bộ nhớ tạm!");
  }
})();
