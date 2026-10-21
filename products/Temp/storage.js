/**
 * STORAGE.JS - Quản lý lưu trữ & Khôi phục trạng thái từ LocalStorage
 */
window.AppStorage = (function () {
    function saveState(data) {
        try {
            const keys = window.AppConfig.STORAGE_KEYS;
            localStorage.setItem(keys.MASTER, data.master || '');
            localStorage.setItem(keys.MASTER_VOL, data.masterVol || '');
            localStorage.setItem(keys.RAW, data.raw || '');
            localStorage.setItem(keys.MIN_WORDS, String(data.minWords || 2));
            localStorage.setItem(keys.AUTO_MATCH, data.autoMatch ? '1' : '0');
        } catch (e) {
            console.warn('Không thể lưu vào localStorage:', e);
        }
    }

    function loadSavedState() {
        try {
            const keys = window.AppConfig.STORAGE_KEYS;
            const savedMaster = localStorage.getItem(keys.MASTER);
            const savedMasterVol = localStorage.getItem(keys.MASTER_VOL);
            const savedRaw = localStorage.getItem(keys.RAW);
            const savedMinWords = localStorage.getItem(keys.MIN_WORDS);
            const savedAutoMatch = localStorage.getItem(keys.AUTO_MATCH);

            return {
                master: savedMaster !== null ? savedMaster : null,
                masterVol: savedMasterVol !== null ? savedMasterVol : null,
                raw: savedRaw !== null ? savedRaw : null,
                minWords: savedMinWords !== null ? parseInt(savedMinWords, 10) : null,
                autoMatch: savedAutoMatch !== null ? savedAutoMatch === '1' : null,
                hasData: Boolean((savedMaster && savedMaster.trim()) || (savedRaw && savedRaw.trim()))
            };
        } catch (e) {
            console.warn('Không thể tải từ localStorage:', e);
            return { master: null, masterVol: null, raw: null, minWords: null, autoMatch: null, hasData: false };
        }
    }

    function clearState() {
        try {
            const keys = window.AppConfig.STORAGE_KEYS;
            localStorage.removeItem(keys.MASTER);
            localStorage.removeItem(keys.MASTER_VOL);
            localStorage.removeItem(keys.RAW);
        } catch (e) {
            console.warn('Không thể xóa localStorage:', e);
        }
    }

    return {
        saveState,
        loadSavedState,
        clearState
    };
})();
