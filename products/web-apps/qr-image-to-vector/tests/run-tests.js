/**
 * run-tests.js - Fast logic tests for the QR/Image to Vector pipeline (Node, zero dependencies)
 * Run: node products/web-apps/qr-image-to-vector/tests/run-tests.js
 * Browser-level scenarios live in tests/smoke.html.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const app = (file) => require(path.join(__dirname, '..', file));

const { QrMatrixGenerator } = app('pipeline/02-qr-matrix.js');
const jsQR = app('pipeline/lib-jsqr.js');
const { QrContourExtractor } = app('pipeline/03-vectorizer-contours.js');
const { QrFilletRenderer } = app('pipeline/04-vectorizer-fillet.js');
const { QrPaint } = app('pipeline/05b-vectorizer-paint.js');
// The QR vectorizer reads these as globals in the browser
Object.assign(global, { QrContourExtractor, QrFilletRenderer, QrPaint });
const { QrVectorizer } = app('pipeline/05-vectorizer.js');
const { PixelArtQuantizer } = app('pipeline/02-pixelart-quantizer.js');
const { PixelArtColorAdjust } = app('pipeline/02b-pixelart-color-adjust.js');
const { PixelArtPaletteEdit } = app('pipeline/02c-pixelart-palette-edit.js');
const { ZipWriter } = app('common/zip-writer.js');
const { QrColorControls } = app('qr-color-controls.js');

let failed = 0;
const running = [];
const test = (name, fn) => {
    running.push((async () => {
        try { await fn(); console.log(`PASS  ${name}`); }
        catch (err) { failed++; console.log(`FAIL  ${name}\n      ${err.message}`); }
    })());
};

/** Draws a module matrix the way a camera would see it (quiet zone + scale) and decodes it with jsQR */
function decodeMatrix({ matrix, cols }, scale = 6, quiet = 4) {
    const size = (cols + quiet * 2) * scale;
    const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const mx = Math.floor(x / scale) - quiet, my = Math.floor(y / scale) - quiet;
            if (mx >= 0 && my >= 0 && mx < cols && my < cols && matrix[my * cols + mx]) {
                const i = (y * size + x) * 4;
                rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
            }
        }
    }
    const code = jsQR(rgba, size, size);
    return code ? code.data : null;
}

// ---------- QR matrix ----------
const payloads = {
    short: 'https://tranthangminh.github.io/',
    vietnamese: 'Xin chào Việt Nam, Trần Thắng Minh',
    long: Array.from({ length: 90 }, (_, i) => `Line${i}-abcdef`).join(' ')
};

for (const [label, fullText] of Object.entries(payloads)) {
    for (const ecc of ['L', 'M', 'Q', 'H']) {
        test(`QR round trip: ${label} text at level ${ecc}`, () => {
            const text = (label === 'long' && ecc === 'H') ? fullText.slice(0, 700) : fullText; // level H caps the capacity
            assert.strictEqual(decodeMatrix(QrMatrixGenerator.generate(text, { eccLevel: ecc })), text);
        });
    }
}

test('higher error correction never shrinks the code and level H is denser than L', () => {
    const size = (ecc) => QrMatrixGenerator.generate(payloads.short, { eccLevel: ecc }).cols;
    assert.ok(size('L') <= size('M') && size('M') <= size('Q') && size('Q') <= size('H'), 'module count should not shrink from L to H');
    assert.ok(size('L') < size('H'));
});

test('a center logo forces level H and the code still decodes', () => {
    const result = QrMatrixGenerator.generate(payloads.short, { eccLevel: 'L', hasLogo: true, logoBlocks: 5 });
    assert.strictEqual(result.eccLevel, 'H');
    assert.ok(result.logoBox && result.logoBox.k >= 2);
    assert.strictEqual(decodeMatrix(result), payloads.short);
});

test('empty payload is rejected', () => {
    assert.throws(() => QrMatrixGenerator.generate(''), /required/);
});

// ---------- QR vectorizer ----------
for (const mode of ['unified-connected', 'unified-separated', 'blocks']) {
    for (const colorMode of ['solid', 'duo', 'gradient']) {
        test(`vectorizer output: ${mode} / ${colorMode}`, () => {
            const matrix = QrMatrixGenerator.generate(payloads.short, {});
            const result = QrVectorizer.vectorizeMatrix(matrix, {
                mode, style: mode, radius: 40, blockSize: 10, moduleResolution: 10, fgColor: '#000000', bgColor: '#FFFFFF',
                outerPadding: 3, blockGap: 0, colorMode, eyeColor: '#112233', gradColor: '#2563EB', gradType: 'linear', gradAngle: 45, gradPerShape: false, gradEyes: false
            });
            assert.match(result.svgString, /^<svg[^>]+viewBox="0 0 \d+ \d+"/);
            assert.ok(result.shapeCount > 0);
            assert.strictEqual(result.width, (matrix.cols + 6) * 10);
        });
    }
}

// ---------- Contrast helper ----------
test('contrast warning: black on white is fine, light grey on white is flagged', () => {
    const controls = new QrColorControls();
    assert.strictEqual(controls.hasLowContrast('#000000', '#FFFFFF'), false);
    assert.strictEqual(controls.hasLowContrast('#E5E5E5', '#FFFFFF'), true);
});

// ---------- Pixel Art palette ----------
const entry = (hex, count) => { const n = parseInt(hex.slice(1), 16); return { hex, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, count, isTransparent: false }; };

test('palette edit: merge folds one color into another and remaps the matrix', () => {
    const palette = [entry('#FF0000', 4), entry('#00FF00', 2), entry('#0000FF', 1)];
    const matrix = Int16Array.from([0, 1, 2, -1, 1, 0]);
    const result = PixelArtPaletteEdit.apply(palette, matrix, { merges: [['#00FF00', '#FF0000']], colors: {} });
    assert.strictEqual(result.palette.length, 2);
    assert.strictEqual(result.palette[0].count, 6);
    assert.deepStrictEqual([...result.matrix], [0, 0, 1, -1, 0, 0]);
});

test('palette edit: recolor changes the entry but remembers the quantized color', () => {
    const result = PixelArtPaletteEdit.apply([entry('#112233', 3)], Int16Array.from([0, 0, 0]), { merges: [], colors: { '#112233': '#ff00ff' } });
    assert.strictEqual(result.palette[0].hex, '#FF00FF');
    assert.strictEqual(result.palette[0].baseHex, '#112233');
    assert.deepStrictEqual([result.palette[0].r, result.palette[0].g, result.palette[0].b], [255, 0, 255]);
});

test('palette edit: merges that point at colors no longer present are ignored', () => {
    const palette = [entry('#FF0000', 1), entry('#00FF00', 1)];
    const result = PixelArtPaletteEdit.apply(palette, Int16Array.from([0, 1]), { merges: [['#123456', '#FF0000']], colors: {} });
    assert.strictEqual(result.palette.length, 2);
});

test('palette presets: every preset color is a valid #RRGGBB', () => {
    for (const [id, preset] of Object.entries(PixelArtPaletteEdit.PRESETS)) {
        assert.ok(preset.colors.length >= 2, `${id} needs at least 2 colors`);
        preset.colors.forEach((hex) => assert.match(hex, /^#[0-9A-F]{6}$/, `${id}: ${hex}`));
    }
});

test('quantizeToPalette: keeps only used colors, transparent cells stay -1', () => {
    const cells = [{ r: 250, g: 5, b: 5, a: 255 }, { r: 5, g: 5, b: 250, a: 255 }, { r: 0, g: 0, b: 0, a: 0 }, { r: 240, g: 20, b: 10, a: 255 }];
    const result = PixelArtQuantizer.quantizeToPalette(cells, ['#FF0000', '#00FF00', '#0000FF']);
    assert.deepStrictEqual(result.palette.map((p) => p.hex), ['#FF0000', '#0000FF']);
    assert.deepStrictEqual([...result.matrix], [0, 1, -1, 0]);
    assert.strictEqual(result.palette[0].count, 2);
});

test('color adjust: greyscale uses luma, zero adjustments change nothing', () => {
    const base = [entry('#FF0000', 1), entry('#336699', 1)];
    assert.deepStrictEqual(PixelArtColorAdjust.apply(base, { greyscale: false, hue: 0, saturation: 0, lightness: 0 }).map((p) => p.hex), ['#FF0000', '#336699']);
    const grey = PixelArtColorAdjust.apply(base, { greyscale: true, hue: 0, saturation: 0, lightness: 0 });
    grey.forEach((p) => assert.ok(p.r === p.g && p.g === p.b, `${p.hex} should be grey`));
});

// ---------- ZIP ----------
test('zip writer: valid structure, names, sizes and CRC for text and binary entries', async () => {
    const entries = [{ name: 'a.svg', data: '<svg>Tiếng Việt</svg>' }, { name: 'folder/b.bin', data: new Uint8Array([1, 2, 3, 4, 5]) }];
    const bytes = Buffer.from(await ZipWriter.build(entries).arrayBuffer());
    const crc32 = (buf) => { let c, crc = 0xFFFFFFFF; for (const byte of buf) { c = (crc ^ byte) & 0xFF; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; };
    const eocd = bytes.length - 22;
    assert.strictEqual(bytes.readUInt32LE(eocd), 0x06054B50);
    assert.strictEqual(bytes.readUInt16LE(eocd + 10), entries.length);
    let central = bytes.readUInt32LE(eocd + 16);
    entries.forEach((entry) => {
        assert.strictEqual(bytes.readUInt32LE(central), 0x02014B50);
        const expected = Buffer.from(entry.data);
        const nameLen = bytes.readUInt16LE(central + 28), local = bytes.readUInt32LE(central + 42);
        assert.strictEqual(bytes.toString('utf8', central + 46, central + 46 + nameLen), entry.name);
        assert.strictEqual(bytes.readUInt32LE(central + 16), crc32(expected));
        assert.strictEqual(bytes.readUInt32LE(central + 24), expected.length);
        const dataStart = local + 30 + bytes.readUInt16LE(local + 26);
        assert.ok(bytes.subarray(dataStart, dataStart + expected.length).equals(expected));
        central += 46 + nameLen;
    });
});

Promise.all(running).then(() => {
    console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
    process.exitCode = failed ? 1 : 0;
});
