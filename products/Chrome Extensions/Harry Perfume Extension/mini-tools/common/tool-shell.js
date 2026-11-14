/**
 * Khung JS dùng chung cho các cửa sổ Mini Tools (Kiểm Tra Giá Vốn, Chuẩn hóa Tên Nhập)
 * Theme Sáng/Tối, toast, clipboard, điều hướng ô kiểu Excel (ô tự giãn bằng CSS field-sizing trong tool-base.css),
 * nút xác nhận 2 lần bấm, nạp kho Nước Hoa / Nhập từ cache của panel.
 * Cần nạp trước: common/formatters.js, storage-helper.js, common/api-config.js
 */
const ToolShell = (function () {
  let toastTimer = null;

  // Icon SVG dạng mask (.icon-mask trong theme.css, RULE §1.8): tô theo màu chữ của nút.
  // Trang tool nằm trong mini-tools/ nên file icon ở ../svg/<tên>.svg
  function iconUrl(name) {
    return `url('../svg/${name}.svg')`;
  }

  function iconHtml(name) {
    return `<span class="icon-mask tool-icon" style="mask-image:${iconUrl(name)};-webkit-mask-image:${iconUrl(name)}"></span>`;
  }

  function setIcon(iconEl, name) {
    iconEl.style.maskImage = iconUrl(name);
    iconEl.style.webkitMaskImage = iconUrl(name);
  }

  // theme-init.js đã áp data-theme trong <head>. Ghi cả localStorage (đọc trước khi vẽ) lẫn StorageHelper (panel đọc).
  // Icon giống panel: đang Tối hiện light-mode.svg (bấm để sang Sáng), đang Sáng hiện dark-mode.svg.
  function initThemeToggle(btn, iconEl) {
    const paintIcon = (theme) => {
      setIcon(iconEl, theme === "light" ? "dark-mode" : "light-mode");
      btn.title = theme === "light" ? "Chuyển sang giao diện Tối" : "Chuyển sang giao diện Sáng";
    };
    paintIcon(document.documentElement.getAttribute("data-theme") || "dark");
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", JSON.stringify(next));
      } catch (e) {}
      StorageHelper.set("theme", next);
      paintIcon(next);
    });
  }

  // Toast: cần #toolToast và #toolToastMsg trong trang
  function showToast(msg, duration = 2200) {
    const el = document.getElementById("toolToast");
    const msgEl = document.getElementById("toolToastMsg");
    msgEl.innerText = msg;
    el.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.display = "none";
    }, duration);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  // Điều hướng kiểu Excel: Enter / ↓ xuống ô cùng cột, ↑ lên ô trên.
  // Textarea cần data-row và data-col. Ở dòng cuối, onNeedMoreRows(rowIdx) cho tool tự thêm dòng.
  function bindColumnNavigation(tbody, onNeedMoreRows) {
    tbody.addEventListener("keydown", (e) => {
      const ta = e.target;
      if (!ta.classList.contains("excel-cell-textarea")) return;
      const rowIdx = parseInt(ta.getAttribute("data-row"), 10);
      const col = ta.getAttribute("data-col");
      const focusRow = (r) => {
        const cell = tbody.querySelector(`.excel-cell-textarea[data-row="${r}"][data-col="${col}"]`);
        if (cell) {
          cell.focus();
          cell.select();
        }
        return Boolean(cell);
      };

      if ((e.key === "Enter" && !e.shiftKey) || e.key === "ArrowDown") {
        e.preventDefault();
        if (!focusRow(rowIdx + 1) && onNeedMoreRows) {
          onNeedMoreRows(rowIdx);
          focusRow(rowIdx + 1);
        }
      } else if (e.key === "ArrowUp" && rowIdx > 0) {
        e.preventDefault();
        focusRow(rowIdx - 1);
      }
    });
  }

  // Dán nhiều dòng vào 1 ô: trả về mảng dòng (đã chặn dán mặc định), dán 1 dòng thì trả null để trình duyệt tự xử lý
  function readMultilinePaste(e) {
    const text = e.clipboardData ? e.clipboardData.getData("text") : "";
    if (!text || !text.includes("\n")) return null;
    e.preventDefault();
    return text.replace(/\r?\n$/, "").split(/\r?\n/);
  }

  // Nút cần xác nhận (ghi đè / xóa), nút chỉ có icon: bấm lần 1 nút chuyển đỏ (.armed) + toast cảnh báo,
  // bấm lần 2 trong 3 giây mới trả về true; quá 3 giây thì nút trở lại bình thường.
  function confirmByDoubleClick(btn, armedText) {
    const reset = () => {
      clearTimeout(btn._armTimer);
      btn.dataset.armed = "";
      btn.classList.remove("armed");
    };
    if (btn.dataset.armed === "1") {
      reset();
      return true;
    }
    btn.dataset.armed = "1";
    btn.classList.add("armed");
    showToast(`⚠️ ${armedText}`, 3000);
    btn._armTimer = setTimeout(reset, 3000);
    return false;
  }

  // Nút bật/tắt "Ảnh lớn" (chỉ icon images.svg, mặc định BẬT; Bật = viền + icon vàng .active, chú thích ghi trạng thái)
  // + khung ảnh 128x128 neo phía trên dòng đang rê chuột
  // (sát mép trên thì phía dưới), thẳng cột Hình.
  // Cần trong trang: #cursorImagePreview > img#cursorImageTag (KHÔNG đặt src="": src rỗng bắn lỗi ảnh và
  // bộ bắt lỗi ảnh toàn cục trong formatters.js sẽ ẩn thẻ img). Mỗi tr.excel-row có data-img (URL ảnh) và ô .td-thumb.
  function initImagePreview(container, toggleBtn, storageKey) {
    const preview = document.getElementById("cursorImagePreview");
    const previewImg = document.getElementById("cursorImageTag");
    const PREVIEW_SIZE = 128;
    const GAP = 8;
    let enabled = true;
    try {
      enabled = localStorage.getItem(storageKey) !== "false";
    } catch (e) {}

    const paintButton = () => {
      toggleBtn.classList.toggle("active", enabled);
      toggleBtn.innerHTML = iconHtml("images");
      toggleBtn.title = enabled ? "Ảnh lớn: Bật (bấm để tắt)" : "Ảnh lớn: Tắt (bấm để bật)";
      toggleBtn.setAttribute("aria-pressed", String(enabled));
    };
    paintButton();

    toggleBtn.addEventListener("click", () => {
      enabled = !enabled;
      paintButton();
      try {
        localStorage.setItem(storageKey, enabled);
      } catch (e) {}
      if (!enabled) preview.style.display = "none";
      showToast(enabled ? "🖼️ Đã BẬT xem ảnh lớn 128x128 khi rê chuột vào dòng!" : "🖼️ Đã TẮT xem ảnh lớn!");
    });

    container.addEventListener("mousemove", (e) => {
      const row = enabled ? e.target.closest("tr.excel-row") : null;
      const url = row ? row.dataset.img : "";
      if (!url) {
        preview.style.display = "none";
        return;
      }
      if (previewImg.getAttribute("src") !== url) {
        // Ảnh trước bị lỗi thì bộ bắt lỗi toàn cục đã ẩn thẻ img: hiện lại khi đổi sang ảnh mới
        previewImg.style.display = "";
        previewImg.src = url;
      }

      const rowRect = row.getBoundingClientRect();
      const thumbCell = row.querySelector(".td-thumb");
      const thumbRect = thumbCell ? thumbCell.getBoundingClientRect() : rowRect;
      let top = rowRect.top - PREVIEW_SIZE - GAP;
      if (top < 10) top = rowRect.bottom + GAP;
      let left = thumbRect.left + thumbRect.width / 2 - PREVIEW_SIZE / 2;
      left = Math.max(10, Math.min(window.innerWidth - PREVIEW_SIZE - 10, left));

      preview.style.top = top + "px";
      preview.style.left = left + "px";
      preview.style.display = "flex";
    });

    container.addEventListener("mouseleave", () => {
      preview.style.display = "none";
    });
  }

  // HTML ô 2 hàng (CSS .td-stack / .cell-stack / .cell-result trong tool-base.css):
  // trên là textarea nhập (sửa được, data-row + data-col cho điều hướng Excel), dưới là kết quả chỉ xem.
  // tdClass: class riêng của cột (vd căn phải cột số)
  function stackedCellHtml(row, col, value, opts = {}) {
    const { tdClass = "", textareaClass = "", placeholder = "", resultId = "", resultClass = "", resultText = "" } = opts;
    return `<td class="td-edit td-stack${tdClass ? ` ${tdClass}` : ""}"><div class="cell-stack">` +
      `<textarea class="excel-cell-textarea ${textareaClass}" data-row="${row}" data-col="${col}" rows="1" spellcheck="false"${placeholder ? ` placeholder="${escAttr(placeholder)}"` : ""}>${escHtml(value)}</textarea>` +
      `<div class="cell-result ${resultClass}"${resultId ? ` id="${resultId}"` : ""} title="${escAttr(resultText)}">${escHtml(resultText)}</div>` +
      `</div></td>`;
  }

  // Bộ lọc dòng dùng chung, đọc màu các ô kết quả .cell-result đang hiện trên dòng:
  // đỏ = .is-alert, xanh = .is-same, vàng = có giá trị nhưng không xanh không đỏ. Ô rỗng không tính.
  //   all    Tất Cả       mọi dòng (kể cả dòng trống)
  //   ok     Đã Đúng      có kết quả và toàn bộ đều xanh
  //   review Cần Xem Xét  có ít nhất 1 ô vàng
  //   fix    Cần Sửa      có ít nhất 1 ô đỏ
  // (dòng vừa vàng vừa đỏ nằm ở cả Cần Xem Xét lẫn Cần Sửa)
  function rowMatchesFilter(tr, filter) {
    if (filter === "all") return true;
    const results = Array.from(tr.querySelectorAll(".cell-result")).filter(r => r.textContent.trim());
    const hasRed = results.some(r => r.classList.contains("is-alert"));
    const hasGold = results.some(r => !r.classList.contains("is-alert") && !r.classList.contains("is-same"));
    if (filter === "fix") return hasRed;
    if (filter === "review") return hasGold;
    if (filter === "ok") return results.length > 0 && !hasRed && !hasGold;
    return true;
  }

  // Gắn select lọc (value all / ok / review / fix) vào bảng; trả về hàm lọc lại 1 dòng để tool gọi sau khi vẽ lại kết quả
  function initRowFilter(select, tbody) {
    const applyToRow = (tr) => {
      tr.style.display = rowMatchesFilter(tr, select.value) ? "" : "none";
    };
    select.addEventListener("change", () => Array.from(tbody.rows).forEach(applyToRow));
    return applyToRow;
  }

  // Đếm dòng theo đúng 4 mục của bộ lọc, hiện dạng chữ lưới 2×2 trong #rowSummary (.row-summary, tool-base.css):
  // xx Tất Cả | xx Đã Đúng / xx Cần Xem Xét | xx Cần Sửa. Tất Cả = dòng có dữ liệu (ô nhập hoặc ô kết quả có giá trị).
  // Dòng vừa vàng vừa đỏ được đếm ở cả Cần Xem Xét và Cần Sửa, giống bộ lọc.
  function renderRowSummary(el, tbody) {
    const counts = { all: 0, ok: 0, review: 0, fix: 0 };
    Array.from(tbody.rows).forEach(tr => {
      const hasInput = Array.from(tr.querySelectorAll("textarea")).some(t => t.value.trim());
      const hasResult = Array.from(tr.querySelectorAll(".cell-result")).some(r => r.textContent.trim());
      if (!hasInput && !hasResult) return;
      counts.all++;
      ["ok", "review", "fix"].forEach(f => { if (rowMatchesFilter(tr, f)) counts[f]++; });
    });
    const item = (key, label) => `<span class="row-summary-item is-${key}">${counts[key].toLocaleString("vi-VN")} ${label}</span>`;
    el.innerHTML = item("all", "Tất Cả") + item("ok", "Đã Đúng") + item("review", "Cần Xem Xét") + item("fix", "Cần Sửa");
  }

  // HTML ô ảnh thumbnail (rỗng nếu không có ảnh)
  function thumbHtml(url) {
    return url ? `<img src="${escAttr(url)}" class="excel-thumb-img" alt="" loading="lazy">` : "";
  }

  // Kho Nước Hoa: dùng cache panel đang giữ (cachedProducts), chưa có cache thì tải từ Apps Script
  async function loadProducts() {
    const cached = await StorageHelper.get("cachedProducts", []);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    const res = await fetch(`${PRODUCTS_API_URL}?t=${Date.now()}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) await StorageHelper.set("cachedProducts", list);
    return list;
  }

  // Dữ liệu tab Nhập (chỉ khi Admin đang đăng nhập): dùng cache cachedImportData, chưa có thì tải từ Apps Script
  async function loadImportRows() {
    const isAdmin = await StorageHelper.get("isAdminLoggedIn", false);
    if (!isAdmin) return [];
    const cached = await StorageHelper.get("cachedImportData", []);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    const res = await fetch(`${IMPORT_API_URL}?t=${Date.now()}`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length > 0) await StorageHelper.set("cachedImportData", items);
    if (data.lists) await StorageHelper.set("cachedImportLists", data.lists);
    return items;
  }

  // Badge trạng thái kho trên header (.db-status-badge > .status-dot + text)
  function setDbStatus(badgeEl, textEl, isReady, text) {
    badgeEl.querySelector(".status-dot").classList.toggle("ready", isReady);
    textEl.innerText = text;
  }

  return {
    initThemeToggle,
    showToast,
    copyText,
    bindColumnNavigation,
    readMultilinePaste,
    confirmByDoubleClick,
    initImagePreview,
    initRowFilter,
    renderRowSummary,
    thumbHtml,
    stackedCellHtml,
    iconHtml,
    loadProducts,
    loadImportRows,
    setDbStatus
  };
})();
