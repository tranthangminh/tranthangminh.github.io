/**
 * COST-CHECKER-PARSER.JS
 * Bộ bóc tách thông tin Loại và Dung tích nước hoa
 * Tuân thủ nghiêm ngặt quy tắc người dùng:
 * - Tầng 1: Gốc (dạng phân số X/Y hoặc từ khóa 'gốc'/'goc')
 * - Tầng 2: Mini (từ khóa 'mini', quét số đi kèm gần nhất)
 * - Tầng 3: Quét dung tích thường ((V >= 5 && V <= 500 && V % 5 == 0) || V == 88)
 * - Tầng 4: Nhận diện Loại đúng các từ có tiền tố "- ": - Refill, - Tester / - Test, - Nobox, - Full
 *   (KHÔNG tìm chữ chiết; dung tích 5, 10, 20ml tự động gán là Chiết; không có từ khóa và >= 30ml tự gán là Full)
 * - Tầng 5: Làm sạch tên cốt lõi (cleanName)
 */

const CostCheckerParser = (function () {
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

      if (/[-–—]\s*(?:tester|test)\b/i.test(cleanText) || /\b(tester|test)\b/i.test(cleanText)) {
        detectedType = 'Gốc Tester';
        cleanText = cleanText.replace(/[-–—]\s*(?:tester|test)\b|\b(tester|test)\b/gi, ' ');
      } else if (/[-–—]\s*nobox\b/i.test(cleanText) || /\bnobox\b/i.test(cleanText)) {
        detectedType = 'Gốc Nobox';
        cleanText = cleanText.replace(/[-–—]\s*nobox\b|\bnobox\b/gi, ' ');
      } else if (/[-–—]\s*full\b/i.test(cleanText) || /\bfull\b/i.test(cleanText)) {
        detectedType = 'Gốc Full';
        cleanText = cleanText.replace(/[-–—]\s*full\b|\bfull\b/gi, ' ');
      } else {
        detectedType = 'Gốc Full';
      }

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
    // Chỉ: - Refill, - Tester / - Test, - Nobox, - Full (tuyệt đối không thêm biến thể khác)
    if (!detectedType) {
      if (/[-–—]\s*refill\b/i.test(cleanText)) {
        detectedType = 'Refill';
        cleanText = cleanText.replace(/[-–—]\s*refill\b/gi, ' ');
      } else if (/[-–—]\s*(?:tester|test)\b/i.test(cleanText)) {
        detectedType = 'Tester';
        cleanText = cleanText.replace(/[-–—]\s*(?:tester|test)\b/gi, ' ');
      } else if (/[-–—]\s*nobox\b/i.test(cleanText)) {
        detectedType = 'Nobox';
        cleanText = cleanText.replace(/[-–—]\s*nobox\b/gi, ' ');
      } else if (/[-–—]\s*full\b/i.test(cleanText)) {
        detectedType = 'Full';
        cleanText = cleanText.replace(/[-–—]\s*full\b/gi, ' ');
      } else if (detectedVolume) {
        // Tự gán theo dung tích: 5, 10, 20ml -> Chiết (không tìm chữ chiết)
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
      .replace(/[-–—]\s*(refill|tester|test|nobox|full|mini|gốc|goc)\b/gi, ' ')
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
