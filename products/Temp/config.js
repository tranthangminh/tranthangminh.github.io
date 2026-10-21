/**
 * CONFIG.JS - Cấu hình hệ thống & Dữ liệu mẫu
 */
window.AppConfig = (function () {
    const STORAGE_KEYS = {
        MASTER: 'matcher_master_input',
        MASTER_VOL: 'matcher_master_vol',
        RAW: 'matcher_raw_input',
        MIN_WORDS: 'matcher_min_words',
        AUTO_MATCH: 'matcher_auto_match'
    };

    const SAMPLE_MASTER = [
        "Prada Luna Rossa Carbon EDT",
        "Prada Luna Rossa Black EDP",
        "Dior Sauvage EDT",
        "Bleu De Chanel EDP",
        "Versace Eros EDT",
        "YSL Y EDP",
        "Narciso Rodriguez For Her EDT",
        "Armaf Club De Nuit Intense Man EDT"
    ].join('\n');

    const SAMPLE_MASTER_VOL = [
        "100",
        "100",
        "100",
        "100",
        "100",
        "100",
        "88",
        "105"
    ].join('\n');

    const SAMPLE_RAW = [
        "dior sauvage",
        "dior sauvage tester",
        "dior sauvage refill",
        "Prada Carbon Luna Rossa EDT 100ml Tester",
        "dior sauvage gốc 30/75ml",
        "ysl y edp gốc 30/75ml nobox",
        "Prada Luna Rossa Carbon gốc tester 20/50ml",
        "bleu chanel 10",
        "versace eros mini 5",
        "Narciso Rodriguez For Her",
        "dior sauvage chiết",
        "Dior Sauvage chiết 20ml",
        "Armaf Club De Nuit Intense 105ml",
        "Nước hoa lạ hoắc không khớp"
    ].join('\n');

    return {
        STORAGE_KEYS,
        SAMPLE_MASTER,
        SAMPLE_MASTER_VOL,
        SAMPLE_RAW,
        DEFAULT_MIN_WORDS: 2
    };
})();
