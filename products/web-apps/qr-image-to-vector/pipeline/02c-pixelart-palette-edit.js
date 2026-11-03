/**
 * 02c-pixelart-palette-edit.js - Palette presets and manual palette edits (merge colors, recolor)
 * Runs after quantization: edits are keyed by the quantized color (#RRGGBB) so they survive re-quantizing.
 * 100% Vanilla JS
 */

class PixelArtPaletteEdit {
    static PRESETS = Object.freeze({
        bw1: { name: '1-bit B/W', colors: ['#000000', '#FFFFFF'] },
        gameboy: { name: 'Game Boy', colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'] },
        c64: { name: 'Commodore 64', colors: ['#000000', '#FFFFFF', '#68372B', '#70A4B2', '#6F3D86', '#588D43', '#352879', '#B8C76F', '#6F4F25', '#433900', '#9A6759', '#444444', '#6C6C6C', '#9AD284', '#6C5EB5', '#959595'] },
        pico8: { name: 'PICO-8', colors: ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'] },
        sweetie16: { name: 'Sweetie 16', colors: ['#1A1C2C', '#5D275D', '#B13E53', '#EF7D57', '#FFCD75', '#A7F070', '#38B764', '#257179', '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7', '#F4F4F4', '#94B0C2', '#566C86', '#333C57'] }
    });

    static EMPTY_EDITS = Object.freeze({ merges: [], colors: {} });

    /**
     * @param {Array<{hex: string, r: number, g: number, b: number, count: number, isTransparent: boolean}>} palette - Quantized palette
     * @param {Int16Array} matrix - Palette indices (-1 = transparent)
     * @param {{merges: Array<[string, string]>, colors: Object<string, string>}} edits - merges are [fromHex, intoHex]; colors maps quantized hex to its replacement
     * @returns {{palette: Array<Object>, matrix: Int16Array}} palette entries gain `baseHex` (the quantized color they came from)
     */
    static apply(palette, matrix, edits = PixelArtPaletteEdit.EMPTY_EDITS) {
        const root = palette.map((_, i) => i);
        const find = (i) => { while (root[i] !== i) i = root[i]; return i; };
        const indexOf = new Map(palette.map((p, i) => [p.hex, i]));

        for (const [from, into] of edits.merges) {
            const a = indexOf.get(from), b = indexOf.get(into);
            if (a !== undefined && b !== undefined && find(a) !== find(b)) root[find(a)] = find(b);
        }

        const newIndex = new Int16Array(palette.length).fill(-1);
        const merged = [];
        palette.forEach((p, i) => {
            if (find(i) !== i) return;
            newIndex[i] = merged.length;
            merged.push({ ...p, baseHex: p.hex, count: 0 });
        });
        palette.forEach((p, i) => { merged[newIndex[find(i)]].count += p.count; });

        for (const entry of merged) {
            const replacement = edits.colors[entry.baseHex];
            if (!/^#[0-9A-F]{6}$/i.test(replacement || '')) continue;
            const n = parseInt(replacement.slice(1), 16);
            Object.assign(entry, { hex: replacement.toUpperCase(), r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 });
        }

        const remapped = new Int16Array(matrix.length);
        for (let i = 0; i < matrix.length; i++) remapped[i] = matrix[i] < 0 ? -1 : newIndex[find(matrix[i])];
        return { palette: merged, matrix: remapped };
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtPaletteEdit = PixelArtPaletteEdit;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtPaletteEdit };
}
