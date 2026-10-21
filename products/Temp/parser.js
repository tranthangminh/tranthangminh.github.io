/**
 * PARSER.JS - Bộ phân loại và bóc tách Dung tích / Loại nước hoa
 * Tuân thủ nghiêm ngặt 5 tầng ưu tiên: Gốc -> Mini -> Dung tích -> Loại -> Làm sạch tên
 */
window.AppParser = (function () {
    /**
     * Bóc tách thông tin Loại và Dung tích từ tên nhập hàng
     */
    function extractTypeAndVolume(text) {
        if (!text) return { type: '', volume: '', combo: '', cleanName: '' };

        let cleanText = text.normalize('NFC').trim();
        let detectedType = '';
        let detectedVolume = '';

        // 1. ƯU TIÊN 1: Bắt GỐC (Dạng phân số X/Y ví dụ 30/75, hoặc có từ khóa gốc/goc)
        const gocFractionRegex = /(?:gốc|goc)?\s*(\d+)\s*\/\s*(\d+)\s*(?:ml)?/i;
        const gocFractionMatch = cleanText.match(gocFractionRegex);
        const hasGocKeyword = /\b(gốc|goc)\b/i.test(cleanText);

        if (gocFractionMatch || hasGocKeyword) {
            if (gocFractionMatch) {
                detectedVolume = `${gocFractionMatch[1]}/${gocFractionMatch[2]}ml`;
                cleanText = cleanText.replace(gocFractionMatch[0], ' ');
            }

            // Nhận diện phân loại phụ: Tester, Nobox, Full (mặc định không có là Gốc Full)
            if (/\b(tester|test)\b/i.test(cleanText)) {
                detectedType = 'Gốc Tester';
                cleanText = cleanText.replace(/\b(tester|test)\b/i, ' ');
            } else if (/\b(no\s*box|nobox|không\s*hộp|ko\s*box|k\s*box)\b/i.test(cleanText)) {
                detectedType = 'Gốc Nobox';
                cleanText = cleanText.replace(/\b(no\s*box|nobox|không\s*hộp|ko\s*box|k\s*box)\b/i, ' ');
            } else if (/\b(full\s*box|fullbox|full|nguyên\s*seal|seal)\b/i.test(cleanText)) {
                detectedType = 'Gốc Full';
                cleanText = cleanText.replace(/\b(full\s*box|fullbox|full|nguyên\s*seal|seal)\b/i, ' ');
            } else {
                detectedType = 'Gốc Full';
            }

            cleanText = cleanText.replace(/\b(gốc|goc)\b/gi, ' ');
        }

        // 2. ƯU TIÊN 2: Bắt MINI (Kèm số 5, 10... để không bị nhầm thành Chiết)
        if (!detectedType) {
            const miniRegex = /\bmini\b/i;
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

        // 3. ƯU TIÊN 3: Quét Dung tích thường (Số chia hết cho 5 từ 5-500, hoặc 88)
        if (!detectedVolume) {
            const volMatch = findValidVolume(cleanText);
            if (volMatch) {
                detectedVolume = `${volMatch.value}ml`;
                cleanText = cleanText.replace(volMatch.rawMatch, ' ');
            }
        }

        // 4. ƯU TIÊN 4: Xác định Loại (Refill, Tester, Nobox, Chiết, Full, Gốc)
        if (!detectedType) {
            const keywords = [
                { type: 'Refill', regex: /\b(refill|re-fill)\b/i },
                { type: 'Tester', regex: /\b(tester|test)\b/i },
                { type: 'Nobox', regex: /\b(no\s*box|nobox|không\s*hộp|ko\s*box|k\s*box)\b/i },
                { type: 'Chiết', regex: /\b(chiết|chiet|decant)\b/i },
                { type: 'Full', regex: /\b(full\s*box|fullbox|full|nguyên\s*seal|seal)\b/i },
                { type: 'Gốc', regex: /\b(gốc|goc)\b/i }
            ];

            let earliestIndex = Infinity;
            let earliestMatch = null;

            for (const kw of keywords) {
                const match = cleanText.match(kw.regex);
                if (match && match.index < earliestIndex) {
                    earliestIndex = match.index;
                    earliestMatch = { type: kw.type, text: match[0], regex: kw.regex };
                }
            }

            if (earliestMatch) {
                detectedType = earliestMatch.type;
                cleanText = cleanText.replace(earliestMatch.regex, ' ');
                // Nếu là Chiết mà không có số dung tích -> mặc định là 10ml
                if (detectedType === 'Chiết' && !detectedVolume) {
                    detectedVolume = '10ml';
                }
            } else if (detectedVolume) {
                const num = parseInt(detectedVolume.replace(/\D/g, ''), 10);
                if (num === 5 || num === 10 || num === 20) {
                    detectedType = 'Chiết';
                } else if (num >= 30) {
                    detectedType = 'Full';
                }
            }
        }

        // 5. LÀM SẠCH TÊN CỐT LÕI
        cleanText = cleanText
            .replace(/\b(refill|re-fill|tester|test|nobox|no\s*box|chiết|chiet|decant|fullbox|full|mini|gốc|goc|seal)\b/gi, ' ')
            .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const combo = [detectedType, detectedVolume].filter(Boolean).join(' ');

        return {
            type: detectedType,
            volume: detectedVolume,
            combo: combo,
            cleanName: cleanText
        };
    }

    /**
     * Tìm số dung tích hợp lệ:
     * - Chia hết cho 5, từ 5 tới 500
     * - Hoặc cá biệt là 88
     */
    function findValidVolume(str) {
        const mlRegex = /\b(\d+)\s*ml\b/gi;
        let match;
        while ((match = mlRegex.exec(str)) !== null) {
            const val = parseInt(match[1], 10);
            if ((val >= 5 && val <= 500 && val % 5 === 0) || val === 88) {
                return { value: val, rawMatch: match[0] };
            }
        }

        const numRegex = /\b(\d+)\b/g;
        while ((match = numRegex.exec(str)) !== null) {
            const val = parseInt(match[1], 10);
            if ((val >= 5 && val <= 500 && val % 5 === 0) || val === 88) {
                return { value: val, rawMatch: match[0] };
            }
        }

        return null;
    }

    return {
        extractTypeAndVolume,
        findValidVolume
    };
})();
