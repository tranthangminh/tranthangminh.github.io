/**
 * qr-batch.js - Batch QR export: many payloads or QR images in, one ZIP of SVG files out
 * Reuses the single-QR pipeline (scanner, matrix, vectorizer) with the current style settings.
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const MAX_ITEMS = 200;
    const tr = (key, fallback) => (window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key, fallback) : fallback);
    const yieldToUi = () => new Promise((resolve) => setTimeout(resolve));

    /** Matrix -> SVG string; the logo block count is nudged to the module-count parity so the logo stays centered */
    function buildSvg(text, options) {
        const { logoBlocks = 5, hasLogo = false } = options;
        let matrix = QrMatrixGenerator.generate(text, { eccLevel: options.eccLevel, hasLogo, logoBlocks });
        if (hasLogo && matrix.logoBox && (matrix.cols - matrix.logoBox.k) % 2 !== 0) {
            matrix = QrMatrixGenerator.generate(text, { eccLevel: options.eccLevel, hasLogo, logoBlocks: logoBlocks + 1 });
        }
        return QrVectorizer.vectorizeMatrix(matrix, options).svgString;
    }

    const slug = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
            img.src = url;
        });
    }

    function uniqueName(base, used) {
        let name = `${base}.svg`, n = 2;
        while (used.has(name)) name = `${base}-${n++}.svg`;
        used.add(name);
        return name;
    }

    const QrBatch = {
        dom: {},
        getOptions: null,
        busy: false,

        init(elements, getOptions) {
            this.dom = elements;
            this.getOptions = getOptions;
            elements.btnText?.addEventListener('click', () => this.run('text'));
            elements.btnImages?.addEventListener('click', () => elements.fileInput?.click());
            elements.fileInput?.addEventListener('change', () => this.run('images'));
        },

        setStatus(text) {
            if (this.dom.status) this.dom.status.textContent = text;
        },

        async run(source) {
            if (this.busy) return;
            const { options, printMm } = this.getOptions();
            const used = new Set(), entries = [];
            let skipped = 0, total = 0, done = 0;
            this.busy = true;
            [this.dom.btnText, this.dom.btnImages].forEach((b) => { if (b) b.disabled = true; });

            try {
                const progress = () => this.setStatus(tr('batch.progress', 'Processing {done}/{total}...').replace('{done}', done).replace('{total}', total));
                if (source === 'text') {
                    const lines = (this.dom.textarea?.value || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_ITEMS);
                    total = lines.length;
                    for (const [i, line] of lines.entries()) {
                        try {
                            const base = `qr-${String(i + 1).padStart(3, '0')}${slug(line) ? '-' + slug(line) : ''}`;
                            entries.push({ name: uniqueName(base, used), data: StageExporter.withPrintSize(buildSvg(line, options), printMm) });
                        } catch (err) { console.warn('Batch item skipped:', err); skipped++; }
                        done++; progress(); await yieldToUi();
                    }
                } else {
                    const files = [...(this.dom.fileInput?.files || [])].filter((f) => f.type.startsWith('image/')).slice(0, MAX_ITEMS);
                    total = files.length;
                    for (const file of files) {
                        try {
                            const scan = await QrScanner.scan(await loadImage(file));
                            if (!scan.success) { skipped++; }
                            else entries.push({ name: uniqueName(file.name.replace(/\.[^/.]+$/, '') || 'qr', used), data: StageExporter.withPrintSize(buildSvg(scan.text, options), printMm) });
                        } catch (err) { console.warn('Batch image skipped:', err); skipped++; }
                        done++; progress(); await yieldToUi();
                    }
                    if (this.dom.fileInput) this.dom.fileInput.value = '';
                }

                if (!entries.length) {
                    this.setStatus(tr(total ? 'batch.noneConverted' : 'batch.nothingToDo', total ? 'No QR could be converted.' : 'Nothing to convert yet.'));
                    return;
                }
                const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
                StageExporter.downloadBlob(ZipWriter.build(entries), `qr-batch-${stamp}.zip`);
                const message = tr('batch.done', '{ok} SVG files in ZIP').replace('{ok}', entries.length);
                this.setStatus(skipped ? `${message}, ${tr('batch.skipped', '{n} skipped').replace('{n}', skipped)}` : message);
            } finally {
                this.busy = false;
                [this.dom.btnText, this.dom.btnImages].forEach((b) => { if (b) b.disabled = false; });
            }
        }
    };

    window.QrBatch = QrBatch;
})();
