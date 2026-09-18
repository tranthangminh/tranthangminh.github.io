/**
 * Lucky Wheel - Preset Definitions & Color Palettes
 * (Separated from app.js)
 */

const PRESETS = {
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

const PALETTE = [
    '#ef4444', '#f97316', '#eab308', '#10b981', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
    '#14b8a6', '#f43f5e'
];

window.LuckyWheelPresets = {
    PRESETS,
    PALETTE
};
