/**
 * DSKH-SYNC-PARSER.JS - Chi nhánh, đọc dữ liệu dán và danh sách tab Đồng bộ cho "(M) Đồng bộ DSKH"
 * Cần nạp trước: common/formatters.js (removeAccents)
 * - MASTER: tab 🛑DSKH (danh sách tổng), luôn có
 * - Chi nhánh: tab "DSKH-<Tên>", danh sách do người dùng thêm / xóa. Mọi thông tin suy ra từ <Tên> (branchFromName):
 *     key          tên bỏ dấu, viết thường, chỉ giữ chữ + số   Quân -> quan
 *     prefix       chữ cái đầu viết hoa + "-" (mã ở 🛑DSKH)      Quân -> Q-
 *     crossPrefix  tên bỏ dấu viết hoa + "-" (mã ở chi nhánh khác, thay CUZN / CUSFV)   Quân -> QUAN-
 * - Dữ liệu dán copy từ Google Sheet / Excel (cột cách nhau bằng Tab, ô nhiều dòng nằm trong ngoặc kép),
 *   phải có dòng tiêu đề chứa "Mã khách hàng". Các dòng phía trên tiêu đề bị bỏ qua
 * - Cột được nhận theo TÊN tiêu đề (không theo vị trí), xếp lại đúng thứ tự COLUMNS.
 *   Cột thừa (vd Ngày hết hạn thẻ) bỏ qua, cột thiếu để trống và được báo lại
 * - buildSyncList: danh sách dòng, thứ tự, mã tương ứng ở từng tab và 41 ô đã gộp (mergeText, rankFromPoints) của tab Đồng bộ
 */
const DskhParser = (function () {
  const COLUMNS = [
    "Mã khách hàng", "Tên khách hàng *", "Mã nhóm khách hàng", "Điện thoại", "Email", "Giới tính", "Ngày sinh",
    "Áp dụng ưu đãi", "Chiết khấu mặc định (%)", "Phương thức thanh toán mặc định", "Chính sách giá mặc định",
    "Fax", "Website", "Mã số thuế", "Tags", "Ghi chú", "Mô tả", "Địa chỉ - Họ tên", "Địa chỉ - SĐT",
    "Địa chỉ - Email", "Địa chỉ", "Tỉnh thành", "Quận huyện", "Phường xã", "Mã bưu điện", "Người liên hệ",
    "Người liên hệ - SĐT", "Người liên hệ - Email", "Người liên hệ - Chức vụ", "Người liên hệ - Bộ phận",
    "Nhân viên phụ trách", "SĐT nhân viên phụ trách", "Ngày tạo", "Trạng thái", "Nợ hiện tại", "Điểm hiện tại",
    "SL đơn hàng", "Tổng chi tiêu", "Tổng SL sản phẩm đã mua", "Tổng SL sản phẩm hoàn trả", "Ngày mua cuối cùng",
    "Hạng thẻ hiện tại"
  ];

  const MASTER = { key: "master", label: "🛑DSKH" };
  const BRANCH_LABEL_PREFIX = "DSKH-";
  const DEFAULT_BRANCH_NAMES = ["Quân", "Hà"];
  const SYNC_CODE_PATTERN = /CUZN|CUSFV/;
  const SYNC_CODE_PATTERN_GLOBAL = /CUZN|CUSFV/g;

  // ---------- Chi nhánh ----------
  function cleanName(name) {
    return String(name || "").normalize("NFC").replace(/\s+/g, " ").trim();
  }

  function branchFromName(name) {
    const clean = cleanName(name);
    const key = removeAccents(clean).replace(/[^a-z0-9]/g, "");
    return {
      key,
      name: clean,
      label: BRANCH_LABEL_PREFIX + clean,
      prefix: key.charAt(0).toUpperCase() + "-",
      crossPrefix: key.toUpperCase() + "-"
    };
  }

  // Lý do không thêm được chi nhánh mới (rỗng = thêm được). branches: các chi nhánh đang có
  function validateBranchName(name, branches) {
    const b = branchFromName(name);
    if (!b.key) return "Tên chi nhánh phải có chữ hoặc số";
    if (b.key === MASTER.key) return `Tên "${b.name}" đã dùng cho tab ${MASTER.label}`;
    const sameKey = branches.find(x => x.key === b.key);
    if (sameKey) return `Đã có tab ${sameKey.label}`;
    const samePrefix = branches.find(x => x.prefix === b.prefix);
    if (samePrefix) return `Tiền tố ${b.prefix} trùng với ${samePrefix.label}`;
    return "";
  }

  // ---------- Đọc dữ liệu dán ----------
  // So tên cột: bỏ khoảng trắng thừa, không phân biệt hoa thường, gom 2 cách gõ dấu (dựng sẵn / tổ hợp)
  function headerKey(text) {
    return String(text || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  }

  // Tách văn bản dán thành lưới ô: Tab = sang ô, xuống dòng = sang dòng.
  // Ô bắt đầu bằng " là ô trong ngoặc kép (có thể chứa Tab / xuống dòng, "" = 1 dấu ")
  function parseTsv(text) {
    const s = String(text || "").replace(/\r\n?/g, "\n");
    const grid = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    let atCellStart = true;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQuotes) {
        if (ch !== '"') {
          cell += ch;
        } else if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === '"' && atCellStart) {
        inQuotes = true;
        atCellStart = false;
      } else if (ch === "\t") {
        row.push(cell);
        cell = "";
        atCellStart = true;
      } else if (ch === "\n") {
        row.push(cell);
        grid.push(row);
        row = [];
        cell = "";
        atCellStart = true;
      } else {
        cell += ch;
        atCellStart = false;
      }
    }
    if (cell !== "" || row.length > 0) {
      row.push(cell);
      grid.push(row);
    }
    return grid;
  }

  // Trả về { error, rows, missing }:
  //   error   "" | "empty" (không có chữ) | "no-header" (không thấy cột Mã khách hàng)
  //   rows    mảng dòng, mỗi dòng đủ COLUMNS.length ô theo đúng thứ tự COLUMNS; bỏ dòng trống hoàn toàn
  //   missing tên các cột trong COLUMNS không có trong dữ liệu dán
  function parseTable(text) {
    if (!String(text || "").trim()) return { error: "empty", rows: [], missing: [] };
    const grid = parseTsv(text);
    const codeKey = headerKey(COLUMNS[0]);
    const headerIdx = grid.findIndex(r => r.some(c => headerKey(c) === codeKey));
    if (headerIdx < 0) return { error: "no-header", rows: [], missing: [] };

    const header = grid[headerIdx].map(headerKey);
    const colIndex = COLUMNS.map(name => header.indexOf(headerKey(name)));
    const missing = COLUMNS.filter((_, i) => colIndex[i] < 0);
    const rows = [];
    for (let r = headerIdx + 1; r < grid.length; r++) {
      const src = grid[r];
      const values = colIndex.map(ci => (ci < 0 || src[ci] === undefined ? "" : src[ci].trim()));
      if (values.some(v => v)) rows.push(values);
    }
    return { error: "", rows, missing };
  }

  // ---------- Tab Đồng bộ ----------
  // Như DATEVALUE của Sheet (định dạng Việt): "dd/MM/yyyy[ HH:mm]" -> số ngày, bỏ phần giờ.
  // Sai định dạng hoặc ngày không có thật (31/02/2026) -> 0
  function dateValue(text) {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(text || ""));
    if (!m) return 0;
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const t = Date.UTC(y, mo - 1, d);
    const dt = new Date(t);
    if (dt.getUTCDate() !== d || dt.getUTCMonth() !== mo - 1) return 0;
    return t / 86400000;
  }

  // Ngày giờ "dd/MM/yyyy[ HH:mm[:ss]]" -> số mili giây để so trước / sau; sai định dạng / ngày không có thật -> 0
  function dateTimeValue(text) {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(text || ""));
    if (!m || !dateValue(text)) return 0;
    return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
  }

  // SĐT để so trùng: chỉ giữ chữ số, đầu 84 (11 số, vd +84 937 019 503) -> 0; không có số -> ""
  function normalizePhone(text) {
    const digits = String(text || "").replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("84") ? "0" + digits.slice(2) : digits;
  }

  // Ghi bảng ra dạng dán được (Tab giữa ô, ô có Tab / xuống dòng / dấu " thì bọc ngoặc kép) - đọc lại bằng parseTable.
  // rows: mảng dòng theo đúng thứ tự COLUMNS
  function toTsv(rows) {
    const cell = v => (/[\t\n\r"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    return [COLUMNS, ...rows].map(r => r.map(v => cell(String(v))).join("\t")).join("\n");
  }

  // Bảng tra mã -> vị trí dòng (0 = dòng dữ liệu đầu tiên). Như MATCH(...; 0) của Sheet:
  // không phân biệt hoa thường, mã trùng lấy dòng đầu tiên
  function indexByCode(rows) {
    const map = new Map();
    rows.forEach((row, i) => {
      const k = row[0].toUpperCase();
      if (k && !map.has(k)) map.set(k, i);
    });
    return map;
  }

  function findRow(index, code) {
    const i = index.get(code.toUpperCase());
    return i === undefined ? -1 : i;
  }

  // ---------- Gộp 41 cột (công thức cột L:AZ của sheet DSKH-Đồng bộ) ----------
  // Vị trí trong COLUMNS: 35 cột gộp kiểu chữ (Tên khách hàng * … Nợ hiện tại, Ngày mua cuối cùng),
  // 5 cột số (Điểm hiện tại … Tổng SL sản phẩm hoàn trả, mergeNumber), Hạng thẻ tính từ Điểm.
  // Thứ tự tính: Tổng chi tiêu -> Điểm (điểm sàn theo chi tiêu) -> Hạng thẻ
  const POINTS_COL = COLUMNS.indexOf("Điểm hiện tại");
  const TOTAL_SPENT_COL = COLUMNS.indexOf("Tổng chi tiêu");
  const CREATED_COL = COLUMNS.indexOf("Ngày tạo");
  const LAST_BUY_COL = COLUMNS.indexOf("Ngày mua cuối cùng");
  const PHONE_COL = COLUMNS.indexOf("Điện thoại");
  const RANK_COL = COLUMNS.indexOf("Hạng thẻ hiện tại");
  const NUMBER_COLS = COLUMNS.slice(POINTS_COL, POINTS_COL + 5).map(name => COLUMNS.indexOf(name));
  const TEXT_MERGE_COLS = COLUMNS.map((_, i) => i).filter(i => i > 0 && i !== RANK_COL && !NUMBER_COLS.includes(i));

  // So 2 giá trị như phép = / <> của Google Sheet: không phân biệt hoa thường
  function sameText(a, b) {
    return a.normalize("NFC").toLowerCase() === b.normalize("NFC").toLowerCase();
  }

  // Các giá trị khác nhau của 1 ô (không phân biệt hoa thường), thứ tự 🛑DSKH rồi chi nhánh; giá trị trùng gộp nguồn
  // values: [{ key, value }] -> [{ value, sources: [key] }] (bỏ giá trị rỗng)
  function distinctOptions(values) {
    const options = [];
    values.forEach(({ key, value }) => {
      if (!value) return;
      const found = options.find(o => sameText(o.value, value));
      if (found) found.sources.push(key);
      else options.push({ value, sources: [key] });
    });
    return options;
  }

  // Gộp 1 ô kiểu chữ. master: giá trị ở 🛑DSKH; branchValues: [{ key, value }] theo thứ tự chi nhánh.
  // Như công thức sheet (Quân trước Hà = chi nhánh đứng trước thắng):
  //   🛑 có + ít nhất 1 chi nhánh có -> chi nhánh đầu tiên khác 🛑 (⁉️); không chi nhánh nào khác -> giữ 🛑
  //   🛑 trống + từ 2 chi nhánh có, giá trị khác nhau -> chi nhánh đầu tiên (⁉️)
  //   🛑 trống + chỉ 1 giá trị (1 chi nhánh có, hoặc các chi nhánh giống nhau) -> giá trị đó (💎)
  //   chi nhánh đều trống -> "" (kể cả khi 🛑 có - giữ đúng sheet)
  // Trả về { value, flag: "" | "changed" | "new", options, pick } - options / pick (vị trí option được công thức chọn)
  // chỉ có khi flag = "changed"
  function mergeText(master, branchValues) {
    const filled = branchValues.filter(b => b.value);
    if (filled.length === 0) return { value: "", flag: "" };
    let value;
    if (master) {
      const diff = filled.find(b => !sameText(b.value, master));
      if (!diff) return { value: master, flag: "" };
      value = diff.value;
    } else {
      value = filled[0].value;
    }
    const options = distinctOptions([{ key: MASTER.key, value: master }, ...branchValues]);
    if (!master && options.length === 1) return { value, flag: "new" };
    return { value, flag: "changed", options, pick: options.findIndex(o => sameText(o.value, value)) };
  }

  // ✓ mặc định của ô ⁉️ (thay lựa chọn "Quân trước Hà" của sheet), trả về vị trí option hoặc -1 (giữ lựa chọn sheet):
  // - Cột Ngày tạo: giá trị là ngày CŨ nhất
  // - Cột khác: giá trị của nguồn có Ngày mua cuối cùng MỚI nhất (kể cả 🛑DSKH; nguồn thiếu ngày coi như cũ nhất)
  // Không nguồn / giá trị nào có ngày đọc được -> -1. Trùng ngày: giữ lựa chọn sheet nếu nằm trong nhóm trùng, không thì option đầu
  // sourceDates: { key: mili giây Ngày mua cuối cùng của nguồn đó, 0 = không có }
  function datePick(col, merged, sourceDates) {
    const optionDate = col === CREATED_COL
      ? o => dateTimeValue(o.value)
      : o => Math.max(...o.sources.map(k => sourceDates[k] || 0));
    const dates = merged.options.map(optionDate);
    const valid = dates.filter(d => d > 0);
    if (valid.length === 0) return -1;
    const best = col === CREATED_COL ? Math.min(...valid) : Math.max(...valid);
    if (dates[merged.pick] === best) return merged.pick;
    return dates.indexOf(best);
  }

  // Hạng thẻ từ Điểm hiện tại: bỏ mọi ký tự không phải số (icon, dấu chấm, dấu trừ...), không có số -> 0
  function rankFromPoints(points) {
    const digits = String(points || "").replace(/[^0-9]/g, "");
    const p = digits ? Number(digits) : 0;
    if (p >= 800) return "Thơm Đỉnh Cao";
    if (p >= 500) return "Thơm Sang Chảnh";
    if (p >= 200) return "Thơm Quyến Rũ";
    if (p >= 100) return "Thơm Thanh Lịch";
    if (p >= 1) return "Người Yêu Hương";
    return "Chập chững";
  }

  // ---------- Gộp kiểu số (công thức cột AT:AX) ----------
  // Đọc số đang hiển thị kiểu Việt (copy từ Sheet): "35.500.000" -> 35500000, "1,5" -> 1.5.
  // Ô trống -> null (= không có giá trị); có chữ không đọc được -> 0 (như N() của Sheet)
  function parseNumber(text) {
    const s = String(text || "").replace(/\s/g, "");
    if (!s) return null;
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  // Gộp 1 ô số. master: số ở 🛑DSKH (null = trống); branchNums: số ở từng chi nhánh theo thứ tự (null = trống).
  // Như công thức sheet (🛑 là mốc, mỗi chi nhánh tăng thêm từ mốc):
  //   không chi nhánh nào có                -> 0 (kể cả khi 🛑 có - giữ đúng sheet)
  //   🛑 trống                              -> tổng các chi nhánh có giá trị
  //   🛑 có + 1 chi nhánh có                -> số lớn nhất (🛑, chi nhánh, 0)
  //   🛑 có + từ 2 chi nhánh có             -> S = 🛑 + Σ(chi nhánh - 🛑); S > 🛑 ? S : 🛑   (2 chi nhánh: Quân + Hà - 🛑)
  function mergeNumber(master, branchNums) {
    const present = branchNums.filter(n => n !== null);
    if (present.length === 0) return 0;
    if (master === null) return present.reduce((a, b) => a + b, 0);
    if (present.length === 1) return Math.max(master, present[0], 0);
    const s = present.reduce((acc, n) => acc + (n - master), master);
    return s > master ? s : master;
  }

  // Điểm sàn theo chi tiêu: INT(Tổng chi tiêu / 100000 * 0,9) - giữ đúng thứ tự phép tính của sheet
  function pointsFloor(totalSpent) {
    return Math.floor(totalSpent / 100000 * 0.9);
  }

  function formatNumber(n) {
    return n.toLocaleString("vi-VN");
  }

  // 41 ô (COLUMNS[1..41]) của 1 dòng tab Đồng bộ. refs: { key: { row } }
  // Ô chữ: dạng mergeText. Ô số: { kind: "number", value (đã định dạng), num, flag, sources: [{ key, num }] };
  // riêng Điểm: flag "raised" (⚠️ nâng theo chi tiêu, kèm merged + total) / "plus" (➕ khác 🛑) / ""
  function buildCells(tables, branches, refs) {
    const rowOf = key => (refs[key].row < 0 ? null : tables[key].rows[refs[key].row]);
    const masterRow = rowOf(MASTER.key);
    const branchRows = branches.map(b => ({ key: b.key, row: rowOf(b.key) }));
    const sourceDates = { [MASTER.key]: masterRow ? dateTimeValue(masterRow[LAST_BUY_COL]) : 0 };
    branchRows.forEach(b => { sourceDates[b.key] = b.row ? dateTimeValue(b.row[LAST_BUY_COL]) : 0; });
    const cells = COLUMNS.map((_, col) => {
      if (NUMBER_COLS.includes(col)) {
        const sources = [{ key: MASTER.key, num: masterRow ? parseNumber(masterRow[col]) : null },
          ...branchRows.map(b => ({ key: b.key, num: b.row ? parseNumber(b.row[col]) : null }))];
        const num = mergeNumber(sources[0].num, sources.slice(1).map(s => s.num));
        return { kind: "number", num, flag: "", sources };
      }
      if (!TEXT_MERGE_COLS.includes(col)) return { value: "", flag: "" };
      const merged = mergeText(masterRow ? masterRow[col] : "",
        branchRows.map(b => ({ key: b.key, value: b.row ? b.row[col] : "" })));
      if (merged.flag === "changed") {
        const pick = datePick(col, merged, sourceDates);
        if (pick >= 0) {
          merged.pick = pick;
          merged.value = merged.options[pick].value;
        }
      }
      return merged;
    });

    const points = cells[POINTS_COL];
    const total = cells[TOTAL_SPENT_COL].num;
    const floor = pointsFloor(total);
    if (floor > points.num) {
      Object.assign(points, { flag: "raised", merged: points.num, total, num: floor });
    } else if (points.num !== (points.sources[0].num || 0)) {
      points.flag = "plus";
    }
    NUMBER_COLS.forEach(col => { cells[col].value = formatNumber(cells[col].num); });
    cells[RANK_COL] = { value: rankFromPoints(points.num), flag: "" };
    return cells.slice(1);
  }

  // Danh sách dòng tab Đồng bộ (công thức cột Mã khách hàng + Nguồn của sheet DSKH-Đồng bộ):
  // - Lấy khách hàng ở mọi tab chi nhánh, theo thứ tự branches rồi thứ tự dòng
  // - Bỏ dòng không có mã hoặc mã không chứa CUZN / CUSFV (phân biệt hoa thường; mã QUAN-… bên Hà bị loại)
  // - Xếp theo Ngày tạo mới nhất lên đầu (chỉ tính ngày); trùng ngày giữ thứ tự cũ; ngày đọc không được (0) xuống cuối
  // Mỗi dòng còn có mã tương ứng ở từng tab (công thức cột 🛑DSKH, DSKH-<chi nhánh>) + vị trí dòng tìm được (-1 = không thấy):
  // - 🛑DSKH: prefix của chi nhánh nguồn + mã (Q-CUZN03098)
  // - Tab chi nhánh nguồn: giữ nguyên mã; chi nhánh khác: CUZN / CUSFV -> crossPrefix của chi nhánh NGUỒN (QUAN-03098)
  //   và tìm trong chính tab chi nhánh đó
  // 41 cột còn lại: buildCells (mergeText / rankFromPoints)
  // tables: key -> { rows }. Trả về [{ code, sourceKey, source, masterCode, refs: { key: { code, row } }, cells }]
  function buildSyncList(tables, branches) {
    const createdIdx = COLUMNS.indexOf("Ngày tạo");
    const indexes = { [MASTER.key]: indexByCode(tables[MASTER.key].rows) };
    branches.forEach(b => { indexes[b.key] = indexByCode(tables[b.key].rows); });

    const list = [];
    branches.forEach(source => {
      tables[source.key].rows.forEach(row => {
        const code = row[0];
        if (!code || !SYNC_CODE_PATTERN.test(code)) return;
        list.push({ code, branch: source, created: dateValue(row[createdIdx]) });
      });
    });
    list.sort((a, b) => b.created - a.created);

    return list.map(({ code, branch }) => {
      const masterCode = branch.prefix + code;
      const refs = { [MASTER.key]: { code: masterCode, row: findRow(indexes[MASTER.key], masterCode) } };
      branches.forEach(b => {
        const refCode = b.key === branch.key ? code : code.replace(SYNC_CODE_PATTERN_GLOBAL, branch.crossPrefix);
        refs[b.key] = { code: refCode, row: findRow(indexes[b.key], refCode) };
      });
      return { code, sourceKey: branch.key, source: branch.label, masterCode, refs, cells: buildCells(tables, branches, refs) };
    });
  }

  return {
    COLUMNS, MASTER, BRANCH_LABEL_PREFIX, DEFAULT_BRANCH_NAMES, PHONE_COL,
    branchFromName, validateBranchName, parseTsv, parseTable, toTsv, dateValue, dateTimeValue, normalizePhone,
    sameText, mergeText, rankFromPoints, parseNumber, mergeNumber, pointsFloor, buildSyncList
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DskhParser;
}
