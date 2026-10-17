/**
 * Product Name Matcher - Client-side Fuzzy Keyword Matcher
 * Thuật toán tách từ khóa đối chiếu tên sản phẩm
 */

(function () {
    // DOM Elements
    const masterInput = document.getElementById('masterInput');
    const rawInput = document.getElementById('rawInput');
    const minWordsInput = document.getElementById('minWordsInput');
    const autoMatchCheckbox = document.getElementById('autoMatchCheckbox');
    
    const masterCount = document.getElementById('masterCount');
    const rawCount = document.getElementById('rawCount');
    
    const btnRunMatch = document.getElementById('btnRunMatch');
    const btnLoadSample = document.getElementById('btnLoadSample');
    const btnClearAll = document.getElementById('btnClearAll');
    
    const btnPasteMaster = document.getElementById('btnPasteMaster');
    const btnClearMaster = document.getElementById('btnClearMaster');
    const btnPasteRaw = document.getElementById('btnPasteRaw');
    const btnClearRaw = document.getElementById('btnClearRaw');
    
    const btnCopyResultColumn = document.getElementById('btnCopyResultColumn');
    const btnCopyFullTable = document.getElementById('btnCopyFullTable');
    const filterSelect = document.getElementById('filterSelect');
    
    const resultTableBody = document.getElementById('resultTableBody');
    const statTotal = document.getElementById('statTotal');
    const statMatched = document.getElementById('statMatched');
    const statUnmatched = document.getElementById('statUnmatched');
    const toast = document.getElementById('toast');

    // State
    let currentResults = [];
    let debounceTimer = null;

    // Dữ liệu mẫu thực tế
    const SAMPLE_MASTER = [
        "Prada Luna Rossa Carbon EDT 100ml",
        "Prada Luna Rossa Black EDP 100ml",
        "Prada Luna Rossa Ocean EDT 100ml",
        "Dior Sauvage EDT 100ml",
        "Dior Sauvage EDP 100ml",
        "Bleu De Chanel EDP 100ml",
        "Bleu De Chanel Parfum 100ml",
        "Versace Eros EDT 100ml",
        "Armaf Club De Nuit Intense Man EDT 105ml",
        "YSL Y EDP 100ml"
    ].join('\n');

    const SAMPLE_RAW = [
        "Prada Carbon Luna Rossa EDT 100ml Tester",
        "dior sauvage edt 100ml tester chính hãng",
        "Bleu De Chanel EDP 100ml fullbox",
        "prada luna ocean 100ml edt",
        "ysl y edp",
        "Nước hoa Gucci Flora Gorgeous Gardenia 100ml",
        "100ml",
        "Versace Eros 100ml nam tính"
    ].join('\n');

    // Khởi tạo
    init();

    function init() {
        bindEvents();
        updateLineCounts();
    }

    function bindEvents() {
        btnRunMatch.addEventListener('click', runMatching);
        
        btnLoadSample.addEventListener('click', () => {
            masterInput.value = SAMPLE_MASTER;
            rawInput.value = SAMPLE_RAW;
            updateLineCounts();
            runMatching();
            showToast("Đã nạp dữ liệu mẫu thành công!");
        });

        btnClearAll.addEventListener('click', () => {
            masterInput.value = '';
            rawInput.value = '';
            updateLineCounts();
            runMatching();
            showToast("Đã xóa trắng dữ liệu!");
        });

        btnPasteMaster.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    masterInput.value = text;
                    updateLineCounts();
                    if (autoMatchCheckbox.checked) runMatching();
                    showToast("Đã dán dữ liệu Master Data!");
                }
            } catch (e) {
                alert("Vui lòng cho phép quyền truy cập Clipboard hoặc dùng phím Ctrl + V!");
            }
        });

        btnClearMaster.addEventListener('click', () => {
            masterInput.value = '';
            updateLineCounts();
            if (autoMatchCheckbox.checked) runMatching();
        });

        btnPasteRaw.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    rawInput.value = text;
                    updateLineCounts();
                    if (autoMatchCheckbox.checked) runMatching();
                    showToast("Đã dán dữ liệu Tên Chưa Chuẩn!");
                }
            } catch (e) {
                alert("Vui lòng cho phép quyền truy cập Clipboard hoặc dùng phím Ctrl + V!");
            }
        });

        btnClearRaw.addEventListener('click', () => {
            rawInput.value = '';
            updateLineCounts();
            if (autoMatchCheckbox.checked) runMatching();
        });

        masterInput.addEventListener('input', onInputChange);
        rawInput.addEventListener('input', onInputChange);
        minWordsInput.addEventListener('change', runMatching);
        filterSelect.addEventListener('change', renderTable);

        btnCopyResultColumn.addEventListener('click', copyResultColumn);
        btnCopyFullTable.addEventListener('click', copyFullTable);
    }

    function onInputChange() {
        updateLineCounts();
        if (autoMatchCheckbox.checked) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runMatching, 300);
        }
    }

    function updateLineCounts() {
        const masterLines = getNonEmptyLines(masterInput.value);
        const rawLines = getNonEmptyLines(rawInput.value);
        masterCount.textContent = `${masterLines.length} tên`;
        rawCount.textContent = `${rawLines.length} tên`;
    }

    function getNonEmptyLines(text) {
        if (!text) return [];
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    /**
     * Tách chuỗi thành mảng từ khóa sạch
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
     * Thuật toán khớp từ khóa
     */
    function runMatching() {
        const masterLines = getNonEmptyLines(masterInput.value);
        const rawLines = rawInput.value.split('\n'); // Giữ nguyên dòng kể cả dòng trống để tương ứng STT
        const minWords = parseInt(minWordsInput.value, 10) || 2;

        // Tiền xử lý Master Data thành Set các từ
        const masterItems = masterLines.map(original => {
            const tokens = tokenize(original);
            return {
                original,
                tokensSet: new Set(tokens),
                tokensList: tokens
            };
        });

        currentResults = [];
        let matchedCount = 0;
        let unmatchedCount = 0;

        for (let i = 0; i < rawLines.length; i++) {
            const rawOriginal = rawLines[i].trim();

            if (!rawOriginal) {
                // Dòng trống
                currentResults.push({
                    index: i + 1,
                    raw: "",
                    matched: "",
                    commonWords: [],
                    matchCount: 0,
                    status: 'empty'
                });
                continue;
            }

            const rawTokensList = tokenize(rawOriginal);
            const rawTokensSet = new Set(rawTokensList);

            if (rawTokensSet.size === 0 || masterItems.length === 0) {
                currentResults.push({
                    index: i + 1,
                    raw: rawOriginal,
                    matched: "",
                    commonWords: [],
                    matchCount: 0,
                    status: 'unmatched'
                });
                unmatchedCount++;
                continue;
            }

            let maxMatch = 0;
            let bestJaccard = 0;
            let bestItem = null;
            let bestMatchedWords = [];

            for (let j = 0; j < masterItems.length; j++) {
                const mItem = masterItems[j];
                const matchedWords = [];

                rawTokensSet.forEach(word => {
                    if (mItem.tokensSet.has(word)) {
                        matchedWords.push(word);
                    }
                });

                const count = matchedWords.length;
                if (count > maxMatch) {
                    maxMatch = count;
                    bestJaccard = count / (rawTokensSet.size + mItem.tokensSet.size - count);
                    bestItem = mItem;
                    bestMatchedWords = matchedWords;
                } else if (count === maxMatch && count > 0) {
                    // Tie-breaker: ưu tiên tên có độ bao phủ và ngắn gọn hơn
                    const jaccard = count / (rawTokensSet.size + mItem.tokensSet.size - count);
                    if (jaccard > bestJaccard) {
                        bestJaccard = jaccard;
                        bestItem = mItem;
                        bestMatchedWords = matchedWords;
                    }
                }
            }

            // Kiểm tra ngưỡng tối thiểu
            const requiredMin = Math.min(minWords, rawTokensSet.size);
            if (bestItem && maxMatch >= requiredMin) {
                currentResults.push({
                    index: i + 1,
                    raw: rawOriginal,
                    matched: bestItem.original,
                    commonWords: bestMatchedWords,
                    matchCount: maxMatch,
                    status: 'matched'
                });
                matchedCount++;
            } else {
                currentResults.push({
                    index: i + 1,
                    raw: rawOriginal,
                    matched: "",
                    commonWords: bestMatchedWords,
                    matchCount: maxMatch,
                    status: 'unmatched'
                });
                unmatchedCount++;
            }
        }

        // Cập nhật thống kê
        statTotal.textContent = currentResults.filter(r => r.raw !== "").length;
        statMatched.textContent = matchedCount;
        statUnmatched.textContent = unmatchedCount;

        renderTable();
    }

    /**
     * Render bảng kết quả
     */
    function renderTable() {
        const filter = filterSelect.value;
        const filtered = currentResults.filter(r => {
            if (filter === 'matched') return r.status === 'matched';
            if (filter === 'unmatched') return r.status === 'unmatched';
            return true;
        });

        if (filtered.length === 0) {
            resultTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        ${currentResults.length === 0 ? 'Chưa có dữ liệu.' : 'Không có dòng nào thỏa mãn bộ lọc hiện tại.'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(item => {
            if (item.status === 'empty') return;

            const isMatched = item.status === 'matched';
            const matchedClass = isMatched ? 'matched-text' : 'empty-text';
            const matchedDisplay = isMatched ? escapeHtml(item.matched) : '— Để trống —';

            const tokenTags = item.commonWords.length > 0
                ? item.commonWords.map(w => `<span class="token-tag">${escapeHtml(w)}</span>`).join('')
                : '<span style="color: var(--text-muted); font-size: 11px;">0 từ</span>';

            const badge = isMatched
                ? `<span class="badge badge-success">✓ Khớp (${item.matchCount} từ)</span>`
                : `<span class="badge badge-empty">✕ Không đạt</span>`;

            html += `
                <tr>
                    <td class="col-stt">${item.index}</td>
                    <td class="col-raw">${escapeHtml(item.raw)}</td>
                    <td class="col-matched ${matchedClass}">${matchedDisplay}</td>
                    <td class="col-tokens">${tokenTags}</td>
                    <td class="col-status">${badge}</td>
                </tr>
            `;
        });

        resultTableBody.innerHTML = html;
    }

    /**
     * Copy cột kết quả (để paste vào ô B2 trên Google Sheet)
     */
    function copyResultColumn() {
        if (currentResults.length === 0) {
            alert("Chưa có kết quả để copy!");
            return;
        }

        // Tạo mảng chỉ chứa các tên chuẩn (hoặc chuỗi rỗng nếu không khớp), tương ứng theo từng dòng
        const lines = currentResults.map(r => r.matched || "");
        const content = lines.join('\n');

        copyToClipboard(content, `Đã copy ${lines.length} dòng! Bây giờ hãy chọn ô B2 trên Google Sheet và bấm Ctrl + V.`);
    }

    /**
     * Copy toàn bộ bảng (TSV để paste vào Excel)
     */
    function copyFullTable() {
        if (currentResults.length === 0) {
            alert("Chưa có kết quả để copy!");
            return;
        }

        const lines = ["STT\tTên Đầu Vào\tTên Chuẩn Khớp Nhất\tSố Từ Khớp\tTrạng Thái"];
        currentResults.forEach(r => {
            if (r.status !== 'empty') {
                lines.push(`${r.index}\t${r.raw}\t${r.matched}\t${r.matchCount}\t${r.status === 'matched' ? 'Đã khớp' : 'Để trống'}`);
            }
        });

        copyToClipboard(lines.join('\n'), "Đã copy toàn bộ bảng (TSV) vào clipboard!");
    }

    function copyToClipboard(text, successMessage) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(successMessage);
            }).catch(() => fallbackCopy(text, successMessage));
        } else {
            fallbackCopy(text, successMessage);
        }
    }

    function fallbackCopy(text, successMessage) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast(successMessage);
        } catch (err) {
            alert("Không thể copy tự động, vui lòng copy thủ công!");
        }
        document.body.removeChild(ta);
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
