/**
 * 02b-pixelart-color-adjust.js - Greyscale & HSL Palette Adjuster for Pixel Art
 * Applies pure color math to a quantized palette (indices and topology stay untouched).
 * 100% Vanilla JS
 */

class PixelArtColorAdjust {
    /**
     * Returns a new palette with greyscale / hue / saturation / lightness applied.
     * @param {Array<{hex: string, r: number, g: number, b: number, count: number, isTransparent: boolean}>} palette
     * @param {{greyscale?: boolean, hue?: number, saturation?: number, lightness?: number}} [adjust]
     * @returns {Array} New palette array (same order, same length)
     */
    static apply(palette, adjust = {}) {
        const { greyscale = false, hue = 0, saturation = 0, lightness = 0 } = adjust;
        if (!greyscale && !hue && !saturation && !lightness) return palette;

        return palette.map((item) => {
            if (item.isTransparent) return item;
            let r = item.r, g = item.g, b = item.b;

            if (greyscale) {
                const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                r = g = b = luma;
            }

            if ((!greyscale && (hue || saturation)) || lightness) {
                let [h, s, l] = this._rgbToHsl(r, g, b);
                if (!greyscale) {
                    h = (((h + hue) % 360) + 360) % 360;
                    s = this._shift(s, saturation / 100);
                }
                l = this._shift(l, lightness / 100);
                [r, g, b] = this._hslToRgb(h, s, l);
            }

            return { ...item, r, g, b, hex: this._rgbToHex(r, g, b) };
        });
    }

    /** Positive amount pulls toward 1, negative scales toward 0 (never overshoots). */
    static _shift(value, amount) {
        return amount >= 0 ? value + (1 - value) * amount : value * (1 + amount);
    }

    static _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        const l = (max + min) / 2;
        if (d === 0) return [0, 0, l];
        const s = d / (1 - Math.abs(2 * l - 1));
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return [(h * 60 + 360) % 360, s, l];
    }

    static _hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let rgb;
        if (h < 60) rgb = [c, x, 0];
        else if (h < 120) rgb = [x, c, 0];
        else if (h < 180) rgb = [0, c, x];
        else if (h < 240) rgb = [0, x, c];
        else if (h < 300) rgb = [x, 0, c];
        else rgb = [c, 0, x];
        return rgb.map((v) => Math.max(0, Math.min(255, Math.round((v + m) * 255))));
    }

    static _rgbToHex(r, g, b) {
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtColorAdjust = PixelArtColorAdjust;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtColorAdjust };
}
