/**
 * APP.JS - Controller chính điều phối ứng dụng
 */
(function () {
    // DOM Elements
    const masterInput = document.getElementById('masterInput');
    const masterVolInput = document.getElementById('masterVolInput');
    const rawInput = document.getElementById('rawInput');
    const minWordsInput = document.getElementById('minWordsInput');
    const autoMatchCheckbox = document.getElementById('autoMatchCheckbox');

    const btnRunMatch = document.getElementById('btnRunMatch');
    const btnLoadSample = document.getElementById('btnLoadSample');
    const btnClearAll = document.getElementById('btnClearAll');

    const btnPasteMaster = document.getElementById('btnPasteMaster');
    const btnClearMaster = document.getElementById('btnClearMaster');
    const btnPasteRaw = document.getElementById('btnPasteRaw');
    const btnClearRaw = document.getElementById('btnClearRaw');

    const btnCopyResultColumn = document.getElementById('btnCopyResultColumn');
    const btnCopyClassifyColumn = document.getElementById('btnCopyClassifyColumn');
    const btnCopyFullTable = document.getElementById('btnCopyFullTable');
    const filterSelect = document.getElementById('filterSelect');

    // State
    let currentResults = [];
    let debounceTimer = null;

    init();

    function init() {
        bindEvents();
        restoreState();
    }

    function restoreState() {
        const saved = window.AppStorage.loadSavedState();
        if (saved.master !== null) masterInput.value = saved.master;
        if (saved.masterVol !== null) masterVolInput.value = saved.masterVol;
        if (saved.raw !== null) rawInput.value = saved.raw;
        if (saved.minWords !== null) minWordsInput.value = saved.minWords;
        if (saved.autoMatch !== null) autoMatchCheckbox.checked = saved.autoMatch;

        window.AppUI.updateLineCounts(masterInput.value, rawInput.value);

        if (saved.hasData) {
            runMatching();
        }
    }

    function persistState() {
        window.AppStorage.saveState({
            master: masterInput.value,
            masterVol: masterVolInput.value,
            raw: rawInput.value,
            minWords: minWordsInput.value,
            autoMatch: autoMatchCheckbox.checked
        });
    }

    function handleMasterPasteText(text) {
        if (text.includes('\t')) {
            const lines = text.split('\n');
            const names = [];
            const vols = [];
            lines.forEach(l => {
                const parts = l.split('\t');
                names.push(parts[0] ? parts[0].trim() : '');
                vols.push(parts[1] ? parts[1].trim() : '');
            });
            masterInput.value = names.join('\n');
            masterVolInput.value = vols.join('\n');
        } else {
            masterInput.value = text;
        }
    }

    function bindEvents() {
        btnRunMatch.addEventListener('click', runMatching);

        btnLoadSample.addEventListener('click', () => {
            masterInput.value = window.AppConfig.SAMPLE_MASTER;
            masterVolInput.value = window.AppConfig.SAMPLE_MASTER_VOL;
            rawInput.value = window.AppConfig.SAMPLE_RAW;
            persistState();
            window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
            runMatching();
            window.AppUI.showToast("Đã nạp dữ liệu mẫu và tự động lưu!");
        });

        btnClearAll.addEventListener('click', () => {
            masterInput.value = '';
            masterVolInput.value = '';
            rawInput.value = '';
            window.AppStorage.clearState();
            window.AppUI.updateLineCounts('', '');
            runMatching();
            window.AppUI.showToast("Đã xóa trắng toàn bộ dữ liệu!");
        });

        btnPasteMaster.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    handleMasterPasteText(text);
                    persistState();
                    window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
                    if (autoMatchCheckbox.checked) runMatching();
                    window.AppUI.showToast("Đã dán và tự động lưu Master Data!");
                }
            } catch (e) {
                alert("Vui lòng cho phép quyền truy cập Clipboard hoặc dùng phím Ctrl + V!");
            }
        });

        masterInput.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const text = clipboardData ? clipboardData.getData('text') : '';
            if (text && text.includes('\t')) {
                e.preventDefault();
                handleMasterPasteText(text);
                onInputChange();
            }
        });

        btnClearMaster.addEventListener('click', () => {
            masterInput.value = '';
            masterVolInput.value = '';
            persistState();
            window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
            if (autoMatchCheckbox.checked) runMatching();
        });

        btnPasteRaw.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    rawInput.value = text;
                    persistState();
                    window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
                    if (autoMatchCheckbox.checked) runMatching();
                    window.AppUI.showToast("Đã dán và tự động lưu Tên Chưa Chuẩn!");
                }
            } catch (e) {
                alert("Vui lòng cho phép quyền truy cập Clipboard hoặc dùng phím Ctrl + V!");
            }
        });

        btnClearRaw.addEventListener('click', () => {
            rawInput.value = '';
            persistState();
            window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
            if (autoMatchCheckbox.checked) runMatching();
        });

        masterInput.addEventListener('input', onInputChange);
        masterVolInput.addEventListener('input', onInputChange);
        rawInput.addEventListener('input', onInputChange);

        minWordsInput.addEventListener('change', () => {
            persistState();
            runMatching();
        });

        autoMatchCheckbox.addEventListener('change', persistState);
        filterSelect.addEventListener('change', () => {
            window.AppUI.renderResults(currentResults, filterSelect.value);
        });

        btnCopyResultColumn.addEventListener('click', copyResultColumn);
        btnCopyClassifyColumn.addEventListener('click', copyClassifyColumn);
        btnCopyFullTable.addEventListener('click', copyFullTable);
    }

    function onInputChange() {
        persistState();
        window.AppUI.updateLineCounts(masterInput.value, rawInput.value);
        if (autoMatchCheckbox.checked) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runMatching, 300);
        }
    }

    function runMatching() {
        const masterLines = window.AppMatcher.getNonEmptyLines(masterInput.value);
        const masterVolLines = masterVolInput.value.split('\n').map(l => l.trim());
        const rawLines = rawInput.value.split('\n');
        const minWords = parseInt(minWordsInput.value, 10) || window.AppConfig.DEFAULT_MIN_WORDS;

        const masterItems = window.AppMatcher.processMasterList(masterLines, masterVolLines);
        currentResults = [];

        for (let i = 0; i < rawLines.length; i++) {
            const rawOriginal = rawLines[i].trim();

            if (!rawOriginal) {
                currentResults.push({
                    index: i + 1,
                    raw: "",
                    matched: "",
                    parsed: { type: '', volume: '', combo: '' },
                    commonWords: [],
                    matchCount: 0,
                    status: 'empty'
                });
                continue;
            }

            // 1. Bóc tách loại & dung tích từ chuỗi nhập hàng
            const parsed = window.AppParser.extractTypeAndVolume(rawOriginal);

            // 2. Tìm kiếm đối chiếu với Master Data
            const searchTokens = window.AppMatcher.tokenize(parsed.cleanName.length > 0 ? parsed.cleanName : rawOriginal);
            const matchRes = window.AppMatcher.findBestMatch(searchTokens, masterItems, minWords);

            // 3. FALLBACK DUNG TÍCH VÀ LOẠI KHI KHỚP THÀNH CÔNG VỚI MASTER DATA
            if (matchRes.isSuccess && matchRes.standardVolume) {
                // Nếu bên nhập hàng CHƯA CÓ số dung tích -> tự động bốc số chuẩn từ Master
                if (!parsed.volume) {
                    parsed.volume = `${matchRes.standardVolume}ml`;
                }
                // Nếu bên nhập hàng CHƯA CÓ loại -> tự gán mặc định theo dung tích chuẩn
                if (!parsed.type) {
                    if (matchRes.standardVolume >= 30) {
                        parsed.type = 'Full';
                    } else if ([5, 10, 20].includes(matchRes.standardVolume)) {
                        parsed.type = 'Chiết';
                    }
                }
                // Ghép lại chuỗi combo hoàn chỉnh
                parsed.combo = [parsed.type, parsed.volume].filter(Boolean).join(' ');
            }

            currentResults.push({
                index: i + 1,
                raw: rawOriginal,
                matched: matchRes.matchedName,
                parsed: parsed,
                commonWords: matchRes.commonWords,
                matchCount: matchRes.matchCount,
                status: matchRes.isSuccess ? 'matched' : 'unmatched'
            });
        }

        window.AppUI.renderResults(currentResults, filterSelect.value);
    }

    function copyResultColumn() {
        if (currentResults.length === 0) {
            alert("Chưa có kết quả để copy!");
            return;
        }
        const lines = currentResults.map(r => r.matched || "");
        window.AppUI.copyToClipboard(lines.join('\n'), `Đã copy ${lines.length} dòng Tên Chuẩn! Chọn ô B2 trên Google Sheet và bấm Ctrl + V.`);
    }

    function copyClassifyColumn() {
        if (currentResults.length === 0) {
            alert("Chưa có kết quả để copy!");
            return;
        }
        const lines = currentResults.map(r => (r.parsed ? r.parsed.combo : '') || "");
        window.AppUI.copyToClipboard(lines.join('\n'), `Đã copy ${lines.length} dòng Phân Loại & Dung Tích! Chọn cột tương ứng trên Google Sheet và bấm Ctrl + V.`);
    }

    function copyFullTable() {
        if (currentResults.length === 0) {
            alert("Chưa có kết quả để copy!");
            return;
        }
        const lines = ["STT\tTên Đầu Vào\tTên Chuẩn Khớp Nhất\tPhân Loại & Dung Tích\tSố Từ Khớp\tTrạng Thái"];
        currentResults.forEach(r => {
            if (r.status !== 'empty') {
                lines.push(`${r.index}\t${r.raw}\t${r.matched}\t${r.parsed ? r.parsed.combo : ''}\t${r.matchCount}\t${r.status === 'matched' ? 'Đã khớp' : 'Để trống'}`);
            }
        });
        window.AppUI.copyToClipboard(lines.join('\n'), "Đã copy toàn bộ bảng (TSV) vào clipboard!");
    }
})();
