/**
 * Lucky Wheel - Preset Definitions & Color Palettes
 * Bilingual Presets (EN & VI)
 */

const PRESETS_EN = {
    'prizes': {
        name: 'Prize Draw',
        slices: [
            { text: '💎 Grand Prize', color: '#f59e0b', weight: 1 },
            { text: '🥇 1st Prize', color: '#ec4899', weight: 2 },
            { text: '🥈 2nd Prize', color: '#8b5cf6', weight: 5 },
            { text: '🥉 3rd Prize', color: '#3b82f6', weight: 10 },
            { text: '🎁 Consolation Prize', color: '#10b981', weight: 25 },
            { text: '🍀 Better Luck Next Time', color: '#64748b', weight: 57 }
        ]
    },
    'food': {
        name: 'Food Picker',
        slices: [
            { text: 'Pizza', color: '#ef4444', weight: 1 },
            { text: 'Sushi', color: '#f97316', weight: 1 },
            { text: 'Burger', color: '#eab308', weight: 1 },
            { text: 'BBQ', color: '#10b981', weight: 1 },
            { text: 'Salad', color: '#06b6d4', weight: 1 },
            { text: 'Ramen', color: '#3b82f6', weight: 1 },
            { text: 'Taco', color: '#8b5cf6', weight: 1 },
            { text: 'Fried Chicken', color: '#ec4899', weight: 1 }
        ]
    },
    'decision': {
        name: 'Decision Maker',
        slices: [
            { text: 'Yes', color: '#10b981', weight: 1 },
            { text: 'No', color: '#ef4444', weight: 1 },
            { text: 'Definitely', color: '#06b6d4', weight: 1 },
            { text: 'Maybe', color: '#f97316', weight: 1 },
            { text: 'Try Again', color: '#eab308', weight: 1 },
            { text: 'Never', color: '#8b5cf6', weight: 1 }
        ]
    },
    'numbers': {
        name: 'Lucky Numbers 1-10',
        slices: [
            { text: '1', color: '#ef4444', weight: 1 },
            { text: '2', color: '#f97316', weight: 1 },
            { text: '3', color: '#eab308', weight: 1 },
            { text: '4', color: '#10b981', weight: 1 },
            { text: '5', color: '#06b6d4', weight: 1 },
            { text: '6', color: '#3b82f6', weight: 1 },
            { text: '7', color: '#8b5cf6', weight: 1 },
            { text: '8', color: '#ec4899', weight: 1 },
            { text: '9', color: '#14b8a6', weight: 1 },
            { text: '10', color: '#f43f5e', weight: 1 }
        ]
    },
    'standup': {
        name: 'Team Standup',
        slices: [
            { text: 'Alex', color: '#ef4444', weight: 1 },
            { text: 'Bob', color: '#f97316', weight: 1 },
            { text: 'Charlie', color: '#eab308', weight: 1 },
            { text: 'Diana', color: '#10b981', weight: 1 },
            { text: 'Edward', color: '#06b6d4', weight: 1 },
            { text: 'Fiona', color: '#3b82f6', weight: 1 }
        ]
    },
    'dice': {
        name: 'Dice Roll (1-6)',
        slices: [
            { text: '1', color: '#ef4444', weight: 1 },
            { text: '2', color: '#f97316', weight: 1 },
            { text: '3', color: '#eab308', weight: 1 },
            { text: '4', color: '#10b981', weight: 1 },
            { text: '5', color: '#06b6d4', weight: 1 },
            { text: '6', color: '#3b82f6', weight: 1 }
        ]
    }
};

const PRESETS_VI = {
    'prizes': {
        name: 'Vòng Quay Trúng Thưởng',
        slices: [
            { text: '💎 Giải Đặc Biệt', color: '#f59e0b', weight: 1 },
            { text: '🥇 Giải Nhất', color: '#ec4899', weight: 2 },
            { text: '🥈 Giải Nhì', color: '#8b5cf6', weight: 5 },
            { text: '🥉 Giải Ba', color: '#3b82f6', weight: 10 },
            { text: '🎁 Giải Khuyến Khích', color: '#10b981', weight: 25 },
            { text: '🍀 May Mắn Lần Sau', color: '#64748b', weight: 57 }
        ]
    },
    'food': {
        name: 'Hôm Nay Ăn Gì',
        slices: [
            { text: 'Cơm Tấm', color: '#ef4444', weight: 1 },
            { text: 'Phở Bò', color: '#f97316', weight: 1 },
            { text: 'Bún Bò Huế', color: '#eab308', weight: 1 },
            { text: 'Bánh Mì', color: '#10b981', weight: 1 },
            { text: 'Gà Rán', color: '#06b6d4', weight: 1 },
            { text: 'Lẩu', color: '#3b82f6', weight: 1 },
            { text: 'Bún Chả', color: '#8b5cf6', weight: 1 },
            { text: 'Trà Sữa', color: '#ec4899', weight: 1 }
        ]
    },
    'decision': {
        name: 'Chọn Lựa (Có / Không)',
        slices: [
            { text: 'Có', color: '#10b981', weight: 1 },
            { text: 'Không', color: '#ef4444', weight: 1 },
            { text: 'Chắc chắn rồi', color: '#06b6d4', weight: 1 },
            { text: 'Có thể', color: '#f97316', weight: 1 },
            { text: 'Thử lại lần nữa', color: '#eab308', weight: 1 },
            { text: 'Không bao giờ', color: '#8b5cf6', weight: 1 }
        ]
    },
    'numbers': {
        name: 'Số May Mắn 1-10',
        slices: [
            { text: '1', color: '#ef4444', weight: 1 },
            { text: '2', color: '#f97316', weight: 1 },
            { text: '3', color: '#eab308', weight: 1 },
            { text: '4', color: '#10b981', weight: 1 },
            { text: '5', color: '#06b6d4', weight: 1 },
            { text: '6', color: '#3b82f6', weight: 1 },
            { text: '7', color: '#8b5cf6', weight: 1 },
            { text: '8', color: '#ec4899', weight: 1 },
            { text: '9', color: '#14b8a6', weight: 1 },
            { text: '10', color: '#f43f5e', weight: 1 }
        ]
    },
    'standup': {
        name: 'Chọn Người Báo Cáo',
        slices: [
            { text: 'Minh', color: '#ef4444', weight: 1 },
            { text: 'Linh', color: '#f97316', weight: 1 },
            { text: 'Hải', color: '#eab308', weight: 1 },
            { text: 'Nam', color: '#10b981', weight: 1 },
            { text: 'Trang', color: '#06b6d4', weight: 1 },
            { text: 'Hương', color: '#3b82f6', weight: 1 }
        ]
    },
    'dice': {
        name: 'Xúc Xắc (1-6)',
        slices: [
            { text: '1', color: '#ef4444', weight: 1 },
            { text: '2', color: '#f97316', weight: 1 },
            { text: '3', color: '#eab308', weight: 1 },
            { text: '4', color: '#10b981', weight: 1 },
            { text: '5', color: '#06b6d4', weight: 1 },
            { text: '6', color: '#3b82f6', weight: 1 }
        ]
    }
};

const TRANSLATION_MAP_EN_TO_VI = {};
const TRANSLATION_MAP_VI_TO_EN = {};

Object.keys(PRESETS_EN).forEach(key => {
    const enSlices = PRESETS_EN[key].slices;
    const viSlices = PRESETS_VI[key].slices;
    enSlices.forEach((enS, idx) => {
        if (viSlices[idx]) {
            TRANSLATION_MAP_EN_TO_VI[enS.text] = viSlices[idx].text;
            TRANSLATION_MAP_VI_TO_EN[viSlices[idx].text] = enS.text;
        }
    });
});

function getCurrentLang() {
    return (window.LuckyWheelI18n && window.LuckyWheelI18n.lang) || localStorage.getItem('portfolio-lang') || 'vi';
}

function getPresets(lang) {
    const l = lang || getCurrentLang();
    return l === 'en' ? PRESETS_EN : PRESETS_VI;
}

const PRESETS = new Proxy({}, {
    get(target, prop) {
        const dict = getPresets();
        return dict[prop] || PRESETS_VI[prop] || PRESETS_EN[prop];
    },
    has(target, prop) {
        return prop in PRESETS_VI || prop in PRESETS_EN;
    },
    ownKeys(target) {
        return Object.keys(PRESETS_VI);
    },
    getOwnPropertyDescriptor(target, prop) {
        return { enumerable: true, configurable: true };
    }
});

const PALETTE = [
    '#ef4444', '#f97316', '#eab308', '#10b981', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
    '#14b8a6', '#f43f5e'
];

window.LuckyWheelPresets = {
    PRESETS,
    PRESETS_EN,
    PRESETS_VI,
    getPresets,
    TRANSLATION_MAP_EN_TO_VI,
    TRANSLATION_MAP_VI_TO_EN,
    PALETTE
};
