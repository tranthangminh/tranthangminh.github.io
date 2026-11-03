/**
 * zip-writer.js - Minimal ZIP builder (stored entries, no compression)
 * Enough for bundling SVG/PNG exports into one download without a library.
 * 100% Vanilla JS
 */

class ZipWriter {
    static _crcTable = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        return table;
    })();

    static _crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = ZipWriter._crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    /**
     * @param {{name: string, data: string|Uint8Array}[]} entries
     * @returns {Blob} application/zip
     */
    static build(entries) {
        const encoder = new TextEncoder();
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const parts = [], central = [];
        let offset = 0;

        for (const { name, data } of entries) {
            const nameBytes = encoder.encode(name);
            const bytes = typeof data === 'string' ? encoder.encode(data) : data;
            const crc = ZipWriter._crc32(bytes);

            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034B50, true);
            local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true); // UTF-8 file names
            local.setUint16(10, dosTime, true);
            local.setUint16(12, dosDate, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, bytes.length, true);
            local.setUint32(22, bytes.length, true);
            local.setUint16(26, nameBytes.length, true);
            parts.push(local.buffer, nameBytes, bytes);

            const entry = new DataView(new ArrayBuffer(46));
            entry.setUint32(0, 0x02014B50, true);
            entry.setUint16(4, 20, true);
            entry.setUint16(6, 20, true);
            entry.setUint16(8, 0x0800, true);
            entry.setUint16(12, dosTime, true);
            entry.setUint16(14, dosDate, true);
            entry.setUint32(16, crc, true);
            entry.setUint32(20, bytes.length, true);
            entry.setUint32(24, bytes.length, true);
            entry.setUint16(28, nameBytes.length, true);
            entry.setUint32(42, offset, true);
            central.push(entry.buffer, nameBytes);

            offset += 30 + nameBytes.length + bytes.length;
        }

        const centralSize = central.reduce((sum, part) => sum + (part.byteLength ?? part.length), 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054B50, true);
        end.setUint16(8, entries.length, true);
        end.setUint16(10, entries.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);

        return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
    }
}

if (typeof window !== 'undefined') {
    window.ZipWriter = ZipWriter;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZipWriter };
}
