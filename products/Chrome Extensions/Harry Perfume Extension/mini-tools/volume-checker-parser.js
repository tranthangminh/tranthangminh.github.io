/**
 * VOLUME-CHECKER-PARSER.JS - Bóc tách + đối chiếu cho "(M) Kiểm Tra Dung Tích"
 * - Mỗi dòng dán vào: "Thương hiệu - Tên - Dung tích" (vd "LONGTIEN - Kẹo Bông Gòn EDP - Full 50ml")
 *   -> Tên "LONGTIEN - Kẹo Bông Gòn EDP", Dung tích "50" (bỏ chữ loại, chỉ lấy số)
 *   Dán từ Excel nhiều cột (Tên <Tab> 75 <Tab> 125) cũng nhận: ô đầu là Tên, các ô sau là dung tích
 * - Chỉ lấy 1 dung tích mỗi dòng (ưu tiên số có ml); phần trong ngoặc là mô tả phụ (vd "(Mẫu 2024)"): bỏ,
 *   không lấy số và không đưa vào tên
 * - Dòng có Set / Gift Set / Giftset: giữ tên thuần, không lấy dung tích
 * - Bỏ qua dòng Chiết (chữ Chiết, hoặc 5 / 10 / 20ml không ghi loại) và dòng Gốc (chữ Gốc hoặc phân số 35/50)
 * - Gộp các dòng cùng tên, so với tên chuẩn tab Nước Hoa phải trùng 100% (chỉ bỏ qua khoảng trắng thừa
 *   và cách gõ dấu dựng sẵn / tổ hợp). Trùng khi bỏ qua dấu + hoa thường -> "gần giống" (đề xuất tên chuẩn)
 * - Xếp dung tích nhập vào đúng cột có cùng số bên gốc (dungtich1..5); số gốc không có -> lần lượt vào cột gốc
 *   còn trống; hết cột trống -> dư ra (overflow)
 */
const VolumeCheckerParser = (function () {
  const SLOT_COUNT = 5;
  const CHIET_VOLUMES = new Set([5, 10, 20]);
  // Chữ loại đứng trước số dung tích (bị bỏ, chỉ lấy số)
  const TYPE_WORDS_REGEX = /\b(full\s*box|fullbox|fullseal|full|no\s*box|nobox|tester\s*box|testerbox|tester|test|refill|re-fill|mini|seal|nguyên\s*seal|không\s*hộp|ko\s*box|k\s*box|gift\s*set|giftset|set)\b/gi;
  const SET_REGEX = /\b(?:gift)?set\b/i;
  const CHIET_REGEX = /\b(chiết|chiet|decant)\b/i;
  const GOC_REGEX = /\b(gốc|goc)\b|\d\s*\/\s*\d/i;
  const PAREN_REGEX = /[([][^)\]]*[)\]]/g;
  const TRAILING_PARENS_REGEX = /(?:\s*[([][^)\]]*[)\]])+\s*$/;
  const SEPARATOR_REGEX = /\s+[-–—]\s+/g;

  // Tên so khớp: NFC, gộp khoảng trắng
  function exactKey(text) {
    return String(text || "").normalize("NFC").replace(/\s+/g, " ").trim();
  }

  // Tên so "gần giống": bỏ dấu, chữ thường, bỏ hết khoảng trắng
  function looseKey(text) {
    return exactKey(text).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, "");
  }

  function formatNumber(raw) {
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? String(n) : "";
  }

  // Phần trong ngoặc (...) / [...] là mô tả hoặc tên phụ (vd "(Mẫu 2024)"), không liên quan dung tích
  function stripParens(text) {
    return String(text || "").replace(PAREN_REGEX, " ").replace(/\s+/g, " ").trim();
  }

  // 1 dung tích trong 1 đoạn chữ: ưu tiên số có "ml", không có thì lấy số đầu tiên ("Full 50ml" -> "50")
  function firstVolume(text) {
    const t = stripParens(text);
    const withMl = t.match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
    const bare = withMl ? null : t.match(/(\d+(?:[.,]\d+)?)/);
    const v = formatNumber((withMl || bare || [])[1] || "");
    return v && parseFloat(v) > 0 ? v : "";
  }

  // Đoạn cuối có phải phần dung tích không: có "ml", hoặc chỉ gồm chữ loại (+ số). Bỏ phần trong ngoặc trước khi xét
  function looksLikeVolume(text) {
    const t = stripParens(text);
    if (!t) return false;
    if (/\d\s*ml\b/i.test(t) || /\d\s*\/\s*\d/.test(t)) return true;
    if (CHIET_REGEX.test(t) || /\b(gốc|goc)\b/i.test(t)) return true;
    return t.replace(TYPE_WORDS_REGEX, " ").replace(/\d+(?:[.,]\d+)?|[x×]/gi, " ").trim() === "";
  }

  // 1 dòng dán vào -> { name, volumes, skip } (skip: "chiet" / "goc" / "")
  function parseLine(line) {
    let raw = String(line || "").replace(/\r/g, "");
    // Dòng trống và dòng phân loại (chứa "___") bỏ qua luôn, không đếm
    if (!raw.trim() || raw.includes("___")) return null;
    const isSet = SET_REGEX.test(raw);
    // Ngoặc ở cuối dòng (sau dung tích hoặc sau tên) là mô tả phụ: bỏ, không đưa vào tên
    raw = raw.replace(TRAILING_PARENS_REGEX, "");

    let name = raw;
    let volumeCells = [];
    if (raw.includes("\t")) {
      const cells = raw.split("\t");
      name = cells[0];
      volumeCells = cells.slice(1).filter(c => c.trim());
    } else {
      let lastSep = null;
      let m;
      SEPARATOR_REGEX.lastIndex = 0;
      while ((m = SEPARATOR_REGEX.exec(raw)) !== null) lastSep = m;
      if (lastSep && looksLikeVolume(raw.slice(lastSep.index + lastSep[0].length))) {
        name = raw.slice(0, lastSep.index);
        volumeCells = [raw.slice(lastSep.index + lastSep[0].length)];
      }
    }

    name = exactKey(name);
    if (!name) return null;
    // Set / Gift Set / Giftset: không lấy dung tích, chỉ giữ tên thuần
    if (isSet) return { name, volumes: [], skip: "" };

    const volumeText = stripParens(volumeCells.join(" | "));
    if (GOC_REGEX.test(volumeText)) return { name, volumes: [], skip: "goc" };
    if (CHIET_REGEX.test(volumeText)) return { name, volumes: [], skip: "chiet" };

    // Mỗi ô dung tích (mỗi dòng " - ", hoặc mỗi cột Excel) chỉ lấy 1 số
    const volumes = volumeCells.map(firstVolume).filter(Boolean);
    // 5 / 10 / 20ml không ghi loại = Chiết (Kiểm Tra Giá Vốn xuất Chiết đúng dạng này)
    const hasTypeWord = new RegExp(TYPE_WORDS_REGEX.source, "i").test(volumeText);
    if (!hasTypeWord && volumes.length === 1 && CHIET_VOLUMES.has(parseFloat(volumes[0]))) {
      return { name, volumes: [], skip: "chiet" };
    }
    return { name, volumes, skip: "" };
  }

  // Danh mục tên chuẩn tab Nước Hoa -> tra cứu trùng 100% và gần giống
  function prepareMaster(products) {
    const exact = new Map();
    const loose = new Map();
    (products || []).forEach(p => {
      const name = exactKey(p && p.name);
      if (!name || name === "-") return;
      const vols = [];
      for (let i = 1; i <= SLOT_COUNT; i++) {
        vols.push(firstVolume(p["dungtich" + i]));
      }
      const img = String((p && p.img) || "").trim();
      const item = { name, vols, img: img.startsWith("http") ? img : "" };
      if (!exact.has(name)) exact.set(name, item);
      const lk = looseKey(name);
      if (!loose.has(lk)) loose.set(lk, item);
    });
    return { exact, loose };
  }

  // Xếp dung tích nhập vào 5 cột theo hàng gốc
  function alignVolumes(masterVols, importVols) {
    const top = masterVols ? masterVols.slice(0, SLOT_COUNT) : Array(SLOT_COUNT).fill("");
    while (top.length < SLOT_COUNT) top.push("");
    const bottom = Array(SLOT_COUNT).fill(null);
    const pending = [];
    importVols.forEach(v => {
      const idx = top.findIndex((t, i) => t && !bottom[i] && parseFloat(t) === parseFloat(v));
      if (idx >= 0) bottom[idx] = { value: v, inMaster: true };
      else pending.push(v);
    });
    const overflow = [];
    pending.forEach(v => {
      const idx = top.findIndex((t, i) => !t && !bottom[i]);
      if (idx >= 0) bottom[idx] = { value: v, inMaster: false };
      else overflow.push(v);
    });
    return { top, bottom, overflow };
  }

  // Cả khối dán vào -> { rows, skipped: { chiet, goc } }
  // row: { importName, masterName, match: "exact" | "near" | "none", img, top, bottom, overflow }
  function buildRows(text, master) {
    const groups = new Map();
    const skipped = { chiet: 0, goc: 0 };
    String(text || "").split(/\n/).forEach(line => {
      const parsed = parseLine(line);
      if (!parsed) return;
      if (parsed.skip) {
        skipped[parsed.skip]++;
        return;
      }
      if (!groups.has(parsed.name)) groups.set(parsed.name, []);
      const vols = groups.get(parsed.name);
      parsed.volumes.forEach(v => {
        if (!vols.some(x => parseFloat(x) === parseFloat(v))) vols.push(v);
      });
    });

    const rows = [];
    groups.forEach((vols, importName) => {
      let item = master.exact.get(importName);
      let match = item ? "exact" : "none";
      if (!item) {
        item = master.loose.get(looseKey(importName));
        if (item) match = "near";
      }
      const { top, bottom, overflow } = alignVolumes(item ? item.vols : null, vols);
      rows.push({ importName, masterName: item ? item.name : "", match, img: item ? item.img : "", top, bottom, overflow });
    });
    return { rows, skipped };
  }

  return { SLOT_COUNT, exactKey, looseKey, parseLine, prepareMaster, alignVolumes, buildRows };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = VolumeCheckerParser;
}
