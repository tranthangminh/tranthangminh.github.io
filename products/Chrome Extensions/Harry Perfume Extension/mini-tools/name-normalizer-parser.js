/**
 * NAME-NORMALIZER-PARSER.JS - Bóc tách Loại & Dung tích + khớp Tên chuẩn (chuyển từ products/Temp)
 * Bóc tách theo tầng: Set -> Gốc -> Mini -> Dung tích -> Loại -> Làm sạch tên
 * Cách gọi loại: Full (có hộp) · Full Nobox (không hộp) · Tester (có hộp) · Tester Nobox (không hộp),
 * Gốc Full / Gốc Full Nobox / Gốc Tester / Gốc Tester Nobox
 * Khớp tên: đếm số từ trùng với danh mục chuẩn, hòa thì lấy Jaccard cao hơn, dưới ngưỡng tối thiểu -> để trống
 */
const NameNormalizerParser = (function () {
  // Nhóm loại: lấy nhóm có từ khóa xuất hiện sớm nhất. "tester box" / "full box" thuộc nhóm Tester / Full (có hộp)
  const TESTER_REGEX = /\b(tester\s*box|testerbox|tester|test)\b/i;
  const FULL_REGEX = /\b(full\s*box|fullbox|fullseal|nguyên\s*seal|seal|full)\b/i;
  // Chữ "không hộp" là từ bổ sung: đứng trước hay sau đều được. Tester + nobox -> Tester Nobox, Full + nobox -> Full Nobox
  const NOBOX_REGEX = /\b(no\s*box|nobox|không\s*hộp|ko\s*box|k\s*box)\b/i;
  const TYPE_FAMILIES = [
    { family: "Refill", regex: /\b(refill|re-fill)\b/i },
    { family: "Tester", regex: TESTER_REGEX },
    { family: "Full", regex: FULL_REGEX },
    { family: "Chiết", regex: /\b(chiết|chiet|decant)\b/i }
  ];

  function familyWithBox(family, hasNobox) {
    if (family === "Tester" || family === "Full") return hasNobox ? `${family} Nobox` : family;
    return family;
  }

  // "Set" là một từ riêng (Set, Gift Set, Giftset). Không nhận "set" nằm trong từ khác (Settle, Caset, Sunset)
  const SET_REGEX = /\b(?:gift)?set\b/i;

  const CLEANUP_REGEX = /\b(refill|re-fill|tester\s*box|testerbox|tester|test|full\s*box|fullbox|fullseal|nguyên\s*seal|seal|no\s*box|nobox|không\s*hộp|ko\s*box|k\s*box|full|chiết|chiet|decant|mini|gốc|goc)\b/gi;

  // Số dung tích hợp lệ: chia hết cho 5 từ 5 tới 500, hoặc 88. Ưu tiên số có đuôi ml.
  // Số thập phân có đuôi ml (Mini 7.5ml) giữ nguyên như đã nhập. Không cắt lẻ một phần số ("7.5ml" không bị đọc thành "5ml").
  function findValidVolume(str) {
    const isValidInteger = (v) => (v >= 5 && v <= 500 && v % 5 === 0) || v === 88;
    const withMl = /(?<![\d.,])(\d+(?:[.,]\d+)?)\s*ml\b/gi;
    const bare = /(?<![\d.,])(\d+)(?![\d.,]\d)\b/g;
    let match;
    while ((match = withMl.exec(str)) !== null) {
      const text = match[1].replace(",", ".");
      const isDecimal = text.includes(".");
      if (isDecimal || isValidInteger(parseInt(text, 10))) return { value: text, rawMatch: match[0] };
    }
    while ((match = bare.exec(str)) !== null) {
      const val = parseInt(match[1], 10);
      if (isValidInteger(val)) return { value: String(val), rawMatch: match[0] };
    }
    return null;
  }

  // keepNumbers = true: không bóc số khỏi chuỗi (dùng cho cột Sản phẩm khi cột Dung tích đã có số,
  // tránh làm mất số trong tên như "Santal 33", "212 VIP")
  // Trả về typeFromKeyword = false khi Loại chỉ là suy ra theo dung tích (Full / Chiết mặc định)
  function extractTypeAndVolume(text, keepNumbers = false) {
    if (!text) return { type: "", volume: "", cleanName: "", typeFromKeyword: false };

    let cleanText = String(text).normalize("NFC").trim();
    let type = "";
    let volume = "";
    let typeFromKeyword = false;

    // TẦNG 1: Gốc (phân số X/Y như 30/75, hoặc có chữ gốc/goc)
    const gocFraction = keepNumbers ? null : cleanText.match(/(?:gốc|goc)?\s*(\d+)\s*\/\s*(\d+)\s*(?:ml)?/i);
    if (gocFraction || /\b(gốc|goc)\b/i.test(cleanText)) {
      if (gocFraction) {
        volume = `${gocFraction[1]}/${gocFraction[2]}ml`;
        cleanText = cleanText.replace(gocFraction[0], " ");
      }
      // Gốc Tester Nobox -> Gốc Tester -> Gốc Full Nobox -> Gốc Full (mặc định)
      const gocFamily = TESTER_REGEX.test(cleanText) ? "Tester" : "Full";
      type = `Gốc ${familyWithBox(gocFamily, NOBOX_REGEX.test(cleanText))}`;
      typeFromKeyword = true;
      cleanText = cleanText.replace(/\b(gốc|goc)\b/gi, " ");
    }

    // TẦNG 2: Mini (lấy số đi kèm để không bị hiểu nhầm thành Chiết)
    if (!type && /\bmini\b/i.test(cleanText)) {
      type = "Mini";
      typeFromKeyword = true;
      cleanText = cleanText.replace(/\bmini\b/i, " ");
      const vol = keepNumbers ? null : findValidVolume(cleanText);
      if (vol) {
        volume = `${vol.value}ml`;
        cleanText = cleanText.replace(vol.rawMatch, " ");
      }
    }

    // TẦNG 3: Dung tích thường
    if (!volume && !keepNumbers) {
      const vol = findValidVolume(cleanText);
      if (vol) {
        volume = `${vol.value}ml`;
        cleanText = cleanText.replace(vol.rawMatch, " ");
      }
    }

    // TẦNG 4: Nhóm loại theo từ khóa xuất hiện sớm nhất, rồi xét chữ nobox; không có từ khóa thì suy theo dung tích
    if (!type) {
      let earliest = null;
      TYPE_FAMILIES.forEach(kw => {
        const m = cleanText.match(kw.regex);
        if (m && (!earliest || m.index < earliest.index)) earliest = { family: kw.family, index: m.index };
      });
      const hasNobox = NOBOX_REGEX.test(cleanText);

      if (earliest) {
        type = familyWithBox(earliest.family, hasNobox);
        typeFromKeyword = true;
        if (type === "Chiết" && !volume && !keepNumbers) volume = "10ml";
      } else if (hasNobox) {
        type = "Full Nobox";
        typeFromKeyword = true;
      } else if (volume) {
        type = defaultTypeForVolume(parseInt(volume, 10));
      }
    }

    // TẦNG 5: Làm sạch tên cốt lõi
    cleanText = cleanText
      .replace(CLEANUP_REGEX, " ")
      .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { type, volume, cleanName: cleanText, typeFromKeyword };
  }

  function defaultTypeForVolume(num) {
    if (num === 5 || num === 10 || num === 20) return "Chiết";
    if (num >= 30) return "Full";
    return "";
  }

  // Một dòng của tab Nhập: tách riêng cột Sản phẩm và cột Dung tích rồi gộp kết quả.
  // Loại có từ khóa rõ ràng luôn thắng Loại suy theo dung tích.
  function parseImportRow(productText, capacityText) {
    // Set thắng mọi loại khác: Loại & Dung tích chỉ ghi "Set", không kèm ml
    if (SET_REGEX.test(productText || "") || SET_REGEX.test(capacityText || "")) {
      const fromName = extractTypeAndVolume(productText, Boolean(extractTypeAndVolume(capacityText).volume));
      return { type: "Set", volume: "", cleanName: fromName.cleanName, isSet: true };
    }
    const fromCap = extractTypeAndVolume(capacityText);
    const fromName = extractTypeAndVolume(productText, Boolean(fromCap.volume));
    const explicitType = (fromCap.typeFromKeyword && fromCap.type) || (fromName.typeFromKeyword && fromName.type);
    return {
      type: explicitType || fromCap.type || fromName.type,
      volume: fromCap.volume || fromName.volume,
      cleanName: fromName.cleanName || fromCap.cleanName
    };
  }

  // So khớp không phân biệt dấu: "Wulong Cha" khớp "Wūlóng Chá", "Ambree" khớp "Ambrée" (removeAccents: common/formatters.js)
  function tokenize(text) {
    if (!text) return [];
    return removeAccents(text)
      .replace(/\bgiftset\b/gi, "gift set")
      .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  // Danh mục chuẩn: [{ name, volume }] -> kèm tập từ khóa để so khớp
  function prepareMaster(entries) {
    return entries
      .filter(e => e.name && e.name.trim())
      .map(e => {
        const vol = parseInt(String(e.volume || "").replace(/\D/g, ""), 10);
        return { name: e.name.trim(), standardVolume: Number.isNaN(vol) ? null : vol, tokensSet: new Set(tokenize(e.name)) };
      });
  }

  function findBestMatch(searchTokens, masterItems, minWords) {
    const searchSet = new Set(searchTokens);
    if (searchSet.size === 0 || masterItems.length === 0) {
      return { matchedName: "", standardVolume: null, commonWords: [], matchCount: 0, isSuccess: false };
    }

    let maxMatch = 0;
    let bestJaccard = 0;
    let bestItem = null;
    let bestWords = [];

    masterItems.forEach(item => {
      const words = [];
      searchSet.forEach(w => {
        if (item.tokensSet.has(w)) words.push(w);
      });
      const count = words.length;
      if (count === 0 || count < maxMatch) return;
      const jaccard = count / (searchSet.size + item.tokensSet.size - count);
      if (count > maxMatch || jaccard > bestJaccard) {
        maxMatch = count;
        bestJaccard = jaccard;
        bestItem = item;
        bestWords = words;
      }
    });

    // Ngưỡng cố định: phải trùng đủ minWords từ, KHÔNG tự hạ ngưỡng khi ô chỉ có ít từ
    // (trước đây ô 1 chữ "s" hạ ngưỡng còn 1 và khớp nhầm "Penhaligon's" vì dấu ' tách ra chữ "s")
    const isSuccess = Boolean(bestItem && maxMatch >= minWords);
    return {
      matchedName: isSuccess ? bestItem.name : "",
      standardVolume: isSuccess ? bestItem.standardVolume : null,
      commonWords: bestWords,
      matchCount: maxMatch,
      isSuccess
    };
  }

  // Loại được lấy dung tích chuẩn của danh mục khi dòng chưa có số ml.
  // Chiết đã mặc định 10ml ở tầng 4; Mini và Gốc có dung tích riêng (không phải chai full) nên không lấy -> để trống, báo đỏ.
  const FILL_VOLUME_FROM_CATALOG = new Set(["", "Full", "Full Nobox", "Tester", "Tester Nobox", "Refill"]);

  // Kết quả cuối của 1 dòng: Tên chuẩn + "Loại Dung tích"
  // - Chưa khớp tên: outputName trả y nguyên tên ở cột Sản phẩm (copy dán lên Sheet không làm mất tên)
  // - missingVolume: Loại & Dung tích chưa có số ml (để tô đỏ)
  function normalizeRow(productText, capacityText, masterItems, minWords) {
    const raw = `${productText || ""} ${capacityText || ""}`.trim();
    if (!raw) return null;

    const parsed = parseImportRow(productText, capacityText);
    const match = findBestMatch(tokenize(parsed.cleanName || raw), masterItems, minWords);

    if (!parsed.isSet && match.isSuccess && match.standardVolume) {
      if (!parsed.volume && FILL_VOLUME_FROM_CATALOG.has(parsed.type)) parsed.volume = `${match.standardVolume}ml`;
      if (!parsed.type) parsed.type = defaultTypeForVolume(match.standardVolume);
    }

    return {
      matchedName: match.matchedName,
      outputName: match.isSuccess ? match.matchedName : String(productText || "").trim(),
      combo: [parsed.type, parsed.volume].filter(Boolean).join(" "),
      missingVolume: !parsed.isSet && !parsed.volume,
      commonWords: match.commonWords,
      matchCount: match.matchCount,
      isSuccess: match.isSuccess
    };
  }

  return { extractTypeAndVolume, parseImportRow, tokenize, prepareMaster, findBestMatch, normalizeRow };
})();
