/**
 * COST-CHECKER-PARSER.JS
 * Bộ bóc tách thông tin Loại và Dung tích nước hoa
 * Tuân thủ nghiêm ngặt quy tắc người dùng:
 * - Tầng 1: Gốc (dạng phân số X/Y hoặc từ khóa 'gốc'/'goc')
 * - Tầng 2: Mini (từ khóa 'mini', quét số đi kèm gần nhất)
 * - Tầng 3: Quét dung tích thường ((V >= 5 && V <= 500 && V % 5 == 0) || V == 88)
 * - Tầng 4: Nhận diện Loại đúng các từ có tiền tố "- ": - Refill, - Tester / - Test / - Testerbox / - Tester box,
 *   - Full / - Fullbox / - Full box, - Nobox / - No box. Chữ nobox đứng sau Tester / Full -> Tester Nobox / Full Nobox
 *   (KHÔNG tìm chữ chiết; dung tích 5, 10, 20ml tự động gán là Chiết; không có từ khóa và >= 30ml tự gán là Full)
 * Cách gọi loại xuất ra: Full (có hộp) · Full Nobox (không hộp) · Tester (có hộp) · Tester Nobox (không hộp).
 * - Tầng 5: Làm sạch tên cốt lõi (cleanName)
 */

const CostCheckerParser = (function () {
  const NOBOX_REGEX = /\b(no\s*box|nobox)\b/i;

  function findValidVolume(str) {
    if (!str) return null;
    // 1. Ưu tiên bắt số có đuôi ml
    const mlRegex = /\b(\d+)\s*ml\b/gi;
    let match;
    while ((match = mlRegex.exec(str)) !== null) {
      const val = parseInt(match[1], 10);
      if ((val >= 5 && val <= 500 && val % 5 === 0) || val === 88) {
        return { value: val, rawMatch: match[0] };
      }
    }

    // 2. Bắt số đứng độc lập
    const numRegex = /\b(\d+)\b/g;
    while ((match = numRegex.exec(str)) !== null) {
      const val = parseInt(match[1], 10);
      if ((val >= 5 && val <= 500 && val % 5 === 0) || val === 88) {
        return { value: val, rawMatch: match[0] };
      }
    }

    return null;
  }

  function extractTypeAndVolume(text) {
    if (!text) return { type: '', volume: '', combo: '', cleanName: '', isGoc: false };

    let cleanText = String(text).normalize('NFC').trim();
    let detectedType = '';
    let detectedVolume = '';
    let isGoc = false;

    // TẦNG 1: Bắt GỐC (Dạng phân số X/Y ví dụ 30/75, hoặc có từ khóa gốc/goc)
    const gocFractionRegex = /(?:gốc|goc)?\s*(\d+)\s*\/\s*(\d+)\s*(?:ml)?/i;
    const gocFractionMatch = cleanText.match(gocFractionRegex);
    const hasGocKeyword = /\b(gốc|goc)\b/i.test(cleanText);

    if (gocFractionMatch || hasGocKeyword) {
      isGoc = true;
      if (gocFractionMatch) {
        detectedVolume = `${gocFractionMatch[1]}/${gocFractionMatch[2]}ml`;
        cleanText = cleanText.replace(gocFractionMatch[0], ' ');
      }

      // Gốc Tester Nobox -> Gốc Tester -> Gốc Full Nobox -> Gốc Full (mặc định)
      const isTester = /\b(tester\s*box|testerbox|tester|test)\b/i.test(cleanText);
      const isNobox = NOBOX_REGEX.test(cleanText);
      detectedType = `Gốc ${isTester ? 'Tester' : 'Full'}${isNobox ? ' Nobox' : ''}`;
      cleanText = cleanText.replace(/(?:[-–—]\s*)?\b(tester\s*box|testerbox|tester|test|full\s*box|fullbox|full|no\s*box|nobox)\b/gi, ' ');

      cleanText = cleanText.replace(/\b(gốc|goc)\b/gi, ' ');
    }

    // TẦNG 2: Bắt MINI (Có từ khóa mini, quét số đi kèm gần nhất)
    if (!detectedType) {
      const miniRegex = /(?:[-–—]\s*)?mini\b/i;
      if (miniRegex.test(cleanText)) {
        detectedType = 'Mini';
        cleanText = cleanText.replace(miniRegex, ' ');

        const volMatch = findValidVolume(cleanText);
        if (volMatch) {
          detectedVolume = `${volMatch.value}ml`;
          cleanText = cleanText.replace(volMatch.rawMatch, ' ');
        }
      }
    }

    // TẦNG 3: Quét Dung tích thường ((V >= 5 && V <= 500 && V % 5 == 0) || V == 88)
    if (!detectedVolume) {
      const volMatch = findValidVolume(cleanText);
      if (volMatch) {
        detectedVolume = `${volMatch.value}ml`;
        cleanText = cleanText.replace(volMatch.rawMatch, ' ');
      }
    }

    // TẦNG 4: Nhận diện Loại đúng các từ chỉ định có tiền tố "- "
    // Chỉ các từ có "- " phía trước (tuyệt đối không thêm biến thể khác). Thứ tự: Refill -> Tester -> Nobox -> Full
    // Chữ nobox đứng sau "- Tester" / "- Full" (vd "- Tester Nobox", "- Full No box") -> loại Nobox tương ứng
    if (!detectedType) {
      const TYPE_RULES = [
        { type: 'Refill', regex: /[-–—]\s*refill\b/gi },
        { type: 'Tester', regex: /[-–—]\s*(?:tester\s*box|testerbox|tester|test)\b/gi },
        { type: 'Full Nobox', regex: /[-–—]\s*(?:no\s*box|nobox)\b/gi },
        { type: 'Full', regex: /[-–—]\s*(?:full\s*box|fullbox|full)\b/gi }
      ];
      const rule = TYPE_RULES.find(r => r.regex.test(cleanText));
      if (rule) {
        detectedType = rule.type;
        rule.regex.lastIndex = 0;
        cleanText = cleanText.replace(rule.regex, ' ');
        if ((detectedType === 'Tester' || detectedType === 'Full') && NOBOX_REGEX.test(cleanText)) {
          detectedType += ' Nobox';
        }
        if (detectedType.endsWith('Nobox')) cleanText = cleanText.replace(new RegExp(NOBOX_REGEX.source, 'gi'), ' ');
      } else if (detectedVolume) {
        // Tự gán theo dung tích: 5, 10, 20ml -> Chiết (không tìm chữ chiết); >= 30ml -> Full
        const num = parseInt(detectedVolume.replace(/\D/g, ''), 10);
        if (num === 5 || num === 10 || num === 20) {
          detectedType = 'Chiết';
        } else if (num >= 30) {
          detectedType = 'Full';
        }
      }
    }

    // TẦNG 5: Làm sạch tên cốt lõi (Clean Name)
    cleanText = cleanText
      .replace(/[-–—]\s*(refill|tester\s*box|testerbox|tester|test|full\s*box|fullbox|no\s*box|nobox|full|mini|gốc|goc)\b/gi, ' ')
      .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const combo = [detectedType, detectedVolume].filter(Boolean).join(' ');

    return {
      type: detectedType,
      volume: detectedVolume,
      combo: combo,
      cleanName: cleanText,
      isGoc: isGoc
    };
  }

  return {
    findValidVolume: findValidVolume,
    extractTypeAndVolume: extractTypeAndVolume
  };
})();

if (typeof window !== "undefined") {
  window.CostCheckerParser = CostCheckerParser;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CostCheckerParser;
}
