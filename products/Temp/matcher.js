/**
 * MATCHER.JS - Thuật toán so khớp từ khóa mờ (Fuzzy Keyword Matcher)
 */
window.AppMatcher = (function () {
    /**
     * Tách chuỗi thành mảng các từ khóa sạch
     */
    function tokenize(text) {
        if (!text) return [];
        const cleaned = text
            .normalize('NFC')
            .toLowerCase()
            .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, ' ')
            .trim();
        return cleaned.split(/\s+/).filter(w => w.length > 0);
    }

    /**
     * Tách văn bản thành mảng các dòng không rỗng
     */
    function getNonEmptyLines(text) {
        if (!text) return [];
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    /**
     * Chuẩn bị danh sách Master Data thành tập hợp Tokens kèm Dung tích chuẩn
     */
    function processMasterList(masterLines, masterVolLines = []) {
        return masterLines.map((original, idx) => {
            const parts = original.split('\t');
            const namePart = parts[0].trim();

            let volNumber = null;
            if (masterVolLines && masterVolLines[idx] !== undefined && masterVolLines[idx].trim() !== '') {
                const parsedNum = parseInt(masterVolLines[idx].replace(/\D/g, ''), 10);
                if (!Number.isNaN(parsedNum)) volNumber = parsedNum;
            } else if (parts.length > 1 && parts[1].trim() !== '') {
                const parsedNum = parseInt(parts[1].replace(/\D/g, ''), 10);
                if (!Number.isNaN(parsedNum)) volNumber = parsedNum;
            }

            const tokens = tokenize(namePart);
            return {
                original: namePart,
                standardVolume: volNumber,
                tokensSet: new Set(tokens)
            };
        });
    }

    /**
     * Tìm tên chuẩn khớp nhất từ tập từ khóa
     */
    function findBestMatch(searchTokensList, masterItems, minWords) {
        const searchTokensSet = new Set(searchTokensList);
        if (searchTokensSet.size === 0 || masterItems.length === 0) {
            return { matchedName: '', commonWords: [], matchCount: 0, isSuccess: false };
        }

        let maxMatch = 0;
        let bestJaccard = 0;
        let bestItem = null;
        let bestMatchedWords = [];

        for (let j = 0; j < masterItems.length; j++) {
            const mItem = masterItems[j];
            const matchedWords = [];

            searchTokensSet.forEach(word => {
                if (mItem.tokensSet.has(word)) {
                    matchedWords.push(word);
                }
            });

            const count = matchedWords.length;
            if (count > maxMatch) {
                maxMatch = count;
                bestJaccard = count / (searchTokensSet.size + mItem.tokensSet.size - count);
                bestItem = mItem;
                bestMatchedWords = matchedWords;
            } else if (count === maxMatch && count > 0) {
                const jaccard = count / (searchTokensSet.size + mItem.tokensSet.size - count);
                if (jaccard > bestJaccard) {
                    bestJaccard = jaccard;
                    bestItem = mItem;
                    bestMatchedWords = matchedWords;
                }
            }
        }

        const requiredMin = Math.min(minWords, searchTokensSet.size);
        const isSuccess = Boolean(bestItem && maxMatch >= requiredMin);

        return {
            matchedName: isSuccess ? bestItem.original : '',
            standardVolume: isSuccess ? bestItem.standardVolume : null,
            commonWords: bestMatchedWords,
            matchCount: maxMatch,
            isSuccess: isSuccess
        };
    }

    return {
        tokenize,
        getNonEmptyLines,
        processMasterList,
        findBestMatch
    };
})();
