/**
 * Module: Gutter & Page Geometry Engine (Alternating Odd/Even Book Binding Margins)
 * Location: script/07_gutter_engine.js
 * 
 * Responsibilities:
 * 1. Defines Paper Geometry Profiles (A4, A5, B5, A6, US-Trade, US-Letter, Mass-Market, Kindle, Crown).
 * 2. Manages Gutter Margins (Inside Spine vs Outside Edge) for professional book binding.
 * 3. Generates CSS Paged Media rules (@page, @page :left, @page :right) based on Binding Mode:
 *    - 'print' (Default): Alternating Odd/Even gutter margins for physical book binding.
 *      • Odd Pages (:right / Recto): Left Margin = Inside Gutter (Spine), Right Margin = Outside Edge.
 *      • Even Pages (:left / Verso): Left Margin = Outside Edge, Right Margin = Inside Gutter (Spine).
 *    - 'screen': Symmetric standard margins for digital screens / e-readers.
 * 4. Generates dynamic Header & Footer templates matched to odd/even margins.
 * 5. Performs alternating two-range rendering and page interweaving via pdf-lib for 100% margin parity.
 */

const fs = require('fs');
const path = require('path');

function requireGlobal(moduleName) {
    const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
    const localPath = path.join(appDataNpm, moduleName);
    try {
        if (fs.existsSync(localPath)) return require(localPath);
    } catch (e) {}
    try {
        return require(moduleName);
    } catch (e) {
        return null;
    }
}

const PROFILES = {
    'A6': {
        name: 'A6 Pocket Book / Mini Print (105mm x 148mm)',
        width: '105mm',
        height: '148mm',
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
        gutterMargin: { inside: '15mm', outside: '10mm' },
        fontSize: '9pt'
    },
    'A5': {
        name: 'A5 Standard Ebook / Compact Print (148mm x 210mm)',
        width: '148mm',
        height: '210mm',
        margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
        gutterMargin: { inside: '22mm', outside: '14mm' },
        fontSize: '10pt'
    },
    'B5': {
        name: 'B5 Academic / Monograph Print (176mm x 250mm)',
        width: '176mm',
        height: '250mm',
        margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' },
        gutterMargin: { inside: '26mm', outside: '18mm' },
        fontSize: '10.5pt'
    },
    'A4': {
        name: 'A4 Large Document / Reference (210mm x 297mm)',
        width: '210mm',
        height: '297mm',
        margin: { top: '25mm', bottom: '25mm', left: '25mm', right: '25mm' },
        gutterMargin: { inside: '30mm', outside: '20mm' },
        fontSize: '11pt'
    },
    'US-Letter': {
        name: 'US Letter / Standard North America (8.5in x 11in / 215.9mm x 279.4mm)',
        width: '215.9mm',
        height: '279.4mm',
        margin: { top: '25mm', bottom: '25mm', left: '25mm', right: '25mm' },
        gutterMargin: { inside: '30mm', outside: '20mm' },
        fontSize: '11pt'
    },
    'US-Trade': {
        name: 'US Trade Paper (6in x 9in / 152.4mm x 228.6mm)',
        width: '152.4mm',
        height: '228.6mm',
        margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
        gutterMargin: { inside: '24mm', outside: '16mm' },
        fontSize: '10.5pt'
    },
    'Mass-Market': {
        name: 'Mass Market Paperback / Pocket Book (4.25in x 6.87in / 108mm x 175mm)',
        width: '108mm',
        height: '175mm',
        margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
        gutterMargin: { inside: '18mm', outside: '12mm' },
        fontSize: '9.5pt'
    },
    'Kindle': {
        name: 'Kindle / E-Reader Format (120mm x 160mm)',
        width: '120mm',
        height: '160mm',
        margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
        gutterMargin: { inside: '16mm', outside: '12mm' },
        fontSize: '9.5pt'
    },
    'Crown': {
        name: 'Crown Quarto / Illustrated (189mm x 246mm)',
        width: '189mm',
        height: '246mm',
        margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' },
        gutterMargin: { inside: '26mm', outside: '18mm' },
        fontSize: '11pt'
    }
};

/**
 * Generates CSS @page rules for paper size and alternating odd/even gutter margins.
 */
function getGutterCssRules(profile, bindingMode = 'print') {
    if (bindingMode === 'print') {
        return `
    /* ── Print Page Settings & Alternating Gutter Margins ── */
    @page {
      size: ${profile.width} ${profile.height};
      margin-top: ${profile.margin.top};
      margin-bottom: ${profile.margin.bottom};
    }

    /* Alternating Gutter Margins for Book Binding */
    /* Trang chẵn (Verso / Left Page): Gáy sách bên phải -> Lề phải (Inside) rộng hơn */
    @page :left {
      margin-left: ${profile.gutterMargin.outside};
      margin-right: ${profile.gutterMargin.inside};
    }

    /* Trang lẻ (Recto / Right Page): Gáy sách bên trái -> Lề trái (Inside) rộng hơn */
    @page :right {
      margin-left: ${profile.gutterMargin.inside};
      margin-right: ${profile.gutterMargin.outside};
    }
    `;
    } else {
        return `
    /* ── Symmetric Page Margins (Digital Screen) ── */
    @page {
      size: ${profile.width} ${profile.height};
      margin-top: ${profile.margin.top};
      margin-bottom: ${profile.margin.bottom};
      margin-left: ${profile.margin.left};
      margin-right: ${profile.margin.right};
    }
    `;
    }
}

/**
 * Builds HTML templates for Headers and Footers with exact odd/even padding.
 */
function getHeaderFooterTemplates(profile, font, headerContentHtml, bindingMode = 'print') {
    const styleReset = `<style>* { box-sizing: border-box !important; } html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: ${font.fontFamily}; -webkit-print-color-adjust: exact; }</style>`;
    if (bindingMode === 'print') {
        // Trang lẻ (Right / Recto): Gáy bên trái -> padding-left: inside, padding-right: outside
        const oddHeader = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.gutterMargin.inside}; padding-right: ${profile.gutterMargin.outside}; -webkit-print-color-adjust: exact;">${headerContentHtml}</div>`;
        const oddFooter = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.gutterMargin.inside}; padding-right: ${profile.gutterMargin.outside}; text-align: center;"><span class="pageNumber"></span></div>`;

        // Trang chẵn (Left / Verso): Gáy bên phải -> padding-left: outside, padding-right: inside
        const evenHeader = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.gutterMargin.outside}; padding-right: ${profile.gutterMargin.inside}; -webkit-print-color-adjust: exact;">${headerContentHtml}</div>`;
        const evenFooter = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.gutterMargin.outside}; padding-right: ${profile.gutterMargin.inside}; text-align: center;"><span class="pageNumber"></span></div>`;

        return { oddHeader, oddFooter, evenHeader, evenFooter };
    } else {
        const headerHtml = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.margin.left}; padding-right: ${profile.margin.right}; -webkit-print-color-adjust: exact;">${headerContentHtml}</div>`;
        const footerHtml = `${styleReset}<div style="font-size: 8pt; color: #333333; width: 100%; box-sizing: border-box; padding-left: ${profile.margin.left}; padding-right: ${profile.margin.right}; text-align: center;"><span class="pageNumber"></span></div>`;
        return { headerHtml, footerHtml };
    }
}

/**
 * Renders PDF with alternating odd/even header/footer geometry and interweaves pages via pdf-lib.
 * Supports both single static header and dynamic H1 sections per page.
 */
async function renderAlternatingPdf(page, pdfLibMod, profile, font, headerConfig, sections = null, bindingMode = 'print') {
    const headerEngine = require('./07_header_engine');

    // Step 1: Draft render to measure total pages
    const draftBytes = await page.pdf({
        width: profile.width,
        height: profile.height,
        margin: { top: profile.margin.top, bottom: profile.margin.bottom },
        preferCSSPageSize: true,
        printBackground: true,
        displayHeaderFooter: false
    });

    const draftDoc = await pdfLibMod.PDFDocument.load(draftBytes, { ignoreEncryption: true });
    const totalPages = draftDoc.getPageCount();
    const splitLeft = headerConfig.splitLeft || 70;

    if (totalPages <= 1) {
        const singleHeaderHtml = headerEngine.buildHeaderContentHtml(headerConfig.left || (sections && sections[0] ? sections[0].title : ''), headerConfig.right, splitLeft);
        const templates = getHeaderFooterTemplates(profile, font, singleHeaderHtml, bindingMode);
        return await page.pdf({
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: bindingMode === 'print' ? templates.oddHeader : templates.headerHtml,
            footerTemplate: bindingMode === 'print' ? templates.oddFooter : templates.footerHtml
        });
    }

    const finalDoc = await pdfLibMod.PDFDocument.create();

    // Mode A: Static Left Header (or no sections) -> Global batch renders (Odd / Even)
    if (!headerConfig.isDynamicH1 || !sections || sections.length === 0) {
        const headerHtml = headerEngine.buildHeaderContentHtml(headerConfig.left, headerConfig.right, splitLeft);
        const templates = getHeaderFooterTemplates(profile, font, headerHtml, bindingMode);

        if (bindingMode !== 'print') {
            return await page.pdf({
                width: profile.width,
                height: profile.height,
                margin: { top: profile.margin.top, bottom: profile.margin.bottom },
                preferCSSPageSize: true,
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: templates.headerHtml,
                footerTemplate: templates.footerHtml
            });
        }

        const oddPagesList = [];
        const evenPagesList = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i % 2 === 1) oddPagesList.push(i);
            else evenPagesList.push(i);
        }

        const oddBytes = await page.pdf({
            pageRanges: oddPagesList.join(','),
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: templates.oddHeader,
            footerTemplate: templates.oddFooter
        });

        const evenBytes = await page.pdf({
            pageRanges: evenPagesList.join(','),
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: templates.evenHeader,
            footerTemplate: templates.evenFooter
        });

        const oddDoc = await pdfLibMod.PDFDocument.load(oddBytes, { ignoreEncryption: true });
        const evenDoc = await pdfLibMod.PDFDocument.load(evenBytes, { ignoreEncryption: true });

        const copiedOddPages = await finalDoc.copyPages(oddDoc, Array.from({ length: oddDoc.getPageCount() }, (_, i) => i));
        const copiedEvenPages = await finalDoc.copyPages(evenDoc, Array.from({ length: evenDoc.getPageCount() }, (_, i) => i));

        let oddIdx = 0;
        let evenIdx = 0;
        for (let i = 1; i <= totalPages; i++) {
            if (i % 2 === 1) {
                finalDoc.addPage(copiedOddPages[oddIdx++]);
            } else {
                finalDoc.addPage(copiedEvenPages[evenIdx++]);
            }
        }

        return await finalDoc.save();
    }

    // Mode B: Dynamic H1 Header (Solution 2: 2 Global Passes + pdf-lib H1 Stamp)
    const blankLeftHeaderHtml = headerEngine.buildHeaderContentHtml('', headerConfig.right, splitLeft);
    const templates = getHeaderFooterTemplates(profile, font, blankLeftHeaderHtml, bindingMode);

    if (bindingMode !== 'print') {
        const fullBytes = await page.pdf({
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: templates.headerHtml,
            footerTemplate: templates.footerHtml
        });
        const fullDoc = await pdfLibMod.PDFDocument.load(fullBytes, { ignoreEncryption: true });
        const copiedAll = await finalDoc.copyPages(fullDoc, Array.from({ length: fullDoc.getPageCount() }, (_, i) => i));
        copiedAll.forEach(p => finalDoc.addPage(p));
    } else {
        const oddPagesList = [];
        const evenPagesList = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i % 2 === 1) oddPagesList.push(i);
            else evenPagesList.push(i);
        }

        const oddBytes = await page.pdf({
            pageRanges: oddPagesList.join(','),
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: templates.oddHeader,
            footerTemplate: templates.oddFooter
        });

        const evenBytes = await page.pdf({
            pageRanges: evenPagesList.join(','),
            width: profile.width,
            height: profile.height,
            margin: { top: profile.margin.top, bottom: profile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: templates.evenHeader,
            footerTemplate: templates.evenFooter
        });

        const oddDoc = await pdfLibMod.PDFDocument.load(oddBytes, { ignoreEncryption: true });
        const evenDoc = await pdfLibMod.PDFDocument.load(evenBytes, { ignoreEncryption: true });

        const copiedOddPages = await finalDoc.copyPages(oddDoc, Array.from({ length: oddDoc.getPageCount() }, (_, i) => i));
        const copiedEvenPages = await finalDoc.copyPages(evenDoc, Array.from({ length: evenDoc.getPageCount() }, (_, i) => i));

        let oddIdx = 0;
        let evenIdx = 0;
        for (let i = 1; i <= totalPages; i++) {
            if (i % 2 === 1) {
                finalDoc.addPage(copiedOddPages[oddIdx++]);
            } else {
                finalDoc.addPage(copiedEvenPages[evenIdx++]);
            }
        }
    }

    // Stamp dynamic H1 on each page with pdf-lib & fontkit
    const fontkit = requireGlobal('@pdf-lib/fontkit') || requireGlobal('fontkit');
    if (fontkit) {
        finalDoc.registerFontkit(fontkit);
        const fontPath = path.join(__dirname, 'Lora-VariableFont_wght.ttf');
        if (fs.existsSync(fontPath)) {
            const fontBytes = fs.readFileSync(fontPath);
            const customFont = await finalDoc.embedFont(fontBytes);
            const mmToPt = 72 / 25.4;
            const insideMarginPt = bindingMode === 'print' ? parseFloat(profile.gutterMargin.inside) * mmToPt : parseFloat(profile.margin.left) * mmToPt;
            const outsideMarginPt = bindingMode === 'print' ? parseFloat(profile.gutterMargin.outside) * mmToPt : parseFloat(profile.margin.right) * mmToPt;
            const totalWidthPt = parseFloat(profile.width) * mmToPt;
            const maxHeaderWidthPt = ((totalWidthPt - insideMarginPt - outsideMarginPt) * (splitLeft / 100.0)) - 4;

            function wrapText(text, fontObj, size, maxWidth) {
                const words = text.split(/\s+/);
                const lines = [];
                let cur = '';
                for (const w of words) {
                    const test = cur ? `${cur} ${w}` : w;
                    if (fontObj.widthOfTextAtSize(test, size) <= maxWidth) {
                        cur = test;
                    } else {
                        if (cur) lines.push(cur);
                        cur = w;
                    }
                }
                if (cur) lines.push(cur);
                return lines.slice(0, 2);
            }

            for (let i = 0; i < totalPages; i++) {
                const pageNum = i + 1;
                const isOdd = pageNum % 2 === 1;
                const x = (bindingMode === 'print' && !isOdd) ? outsideMarginPt : insideMarginPt;
                const p = finalDoc.getPage(i);
                const { height } = p.getSize();

                const sec = sections.find(s => pageNum >= s.startPage && pageNum <= s.endPage);
                const title = sec ? sec.title : '';
                if (!title) continue;

                const lines = wrapText(title, customFont, 8, maxHeaderWidthPt);
                if (lines.length === 1) {
                    p.drawText(lines[0], {
                        x: x,
                        y: height - 27.5,
                        size: 8,
                        font: customFont,
                        color: pdfLibMod.rgb(0.2, 0.2, 0.2)
                    });
                } else if (lines.length >= 2) {
                    p.drawText(lines[0], {
                        x: x,
                        y: height - 22.8,
                        size: 8,
                        font: customFont,
                        color: pdfLibMod.rgb(0.2, 0.2, 0.2)
                    });
                    p.drawText(lines[1], {
                        x: x,
                        y: height - 32.5,
                        size: 8,
                        font: customFont,
                        color: pdfLibMod.rgb(0.2, 0.2, 0.2)
                    });
                }
            }
        }
    }

    return await finalDoc.save();
}

module.exports = {
    PROFILES,
    getGutterCssRules,
    getHeaderFooterTemplates,
    renderAlternatingPdf
};
