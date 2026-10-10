/**
 * Module 07 Helper: PDF Document Outline & Hierarchical Bookmarks Engine
 * Location: script/07_outline_engine.js
 * 
 * Responsibilities:
 * 1. Scans final rendered body PDF with pdf-parse to locate exact page numbers for H1 (§CHP_X§) and H2 (§SEC_X§).
 * 2. Structures H1 chapters and H2 sub-sections into a clean hierarchical Outline tree.
 * 3. Prepends Front Matter items (Cover, Translator's Note, Table of Contents).
 * 4. Injects native PDF /Outlines dictionary into pdf-lib PDFDocument using UTF-16BE encoded strings.
 * 5. Activates PageMode = UseOutlines so bookmarks open automatically in all PDF viewers.
 */

/**
 * Extracts raw H1, H2, and H3 elements from the Puppeteer DOM according to tocDepth
 */
async function extractHeadingsFromPage(page, tocDepth = 'h1') {
    let qSel = 'h1';
    if (tocDepth === 'h1-h2') qSel = 'h1, h2';
    else if (tocDepth === 'h1-h2-h3') qSel = 'h1, h2, h3';

    return await page.evaluate((selector) => {
        const list = Array.from(document.querySelectorAll(selector)).filter(el => {
            if (el.closest('.translator-note-page')) return false;
            if (el.hasAttribute('data-no-toc')) return false;
            if (el.id === 'table-of-contents' || el.classList.contains('toc-heading')) return false;
            return true;
        });

        return list.map(el => {
            const tag = el.tagName.toLowerCase();
            const level = tag === 'h1' ? 1 : (tag === 'h2' ? 2 : 3);
            const markerMatch = el.textContent.match(/\[\[(CHP|SEC|SUB)_\d+\]\]/);
            const marker = markerMatch ? markerMatch[0] : '';
            return {
                level,
                id: el.id || '',
                title: el.innerText.replace(/(\[\[(CHP|SEC|SUB)_\d+\]\]|§(CHP|SEC|SUB)_\d+§)/g, '').trim(),
                marker
            };
        }).filter(item => item.title.length > 0 && item.title.toLowerCase() !== 'front matter');
    }, qSel);
}

/**
 * Scans final body PDF bytes to resolve exact final page numbers for all headings and constructs the Outline tree
 */
async function buildOutlineTree({
    pdfParseMod,
    finalBodyPdfBytes,
    rawHeadings,
    hasCover,
    hasTranslatorNote,
    isVietnamese
}) {
    const parser = new pdfParseMod.PDFParse(new Uint8Array(finalBodyPdfBytes));
    await parser.load();
    const totalBodyPages = parser.doc.numPages;
    const pageTexts = new Array(totalBodyPages);
    const chunkSize = 50;

    for (let i = 1; i <= totalBodyPages; i += chunkSize) {
        const chunkPromises = [];
        const end = Math.min(i + chunkSize - 1, totalBodyPages);
        for (let p = i; p <= end; p++) {
            const pageNum = p;
            chunkPromises.push((async () => {
                const pObj = await parser.doc.getPage(pageNum);
                const tc = await pObj.getTextContent();
                const str = tc.items.map(x => x.str).join('');
                pageTexts[pageNum - 1] = { page: pageNum, text: str };
            })());
        }
        await Promise.all(chunkPromises);
    }

    const coverOffset = hasCover ? 1 : 0;
    const outlineTree = [];

    // ── 1. Front Matter Bookmarks ──

    if (hasTranslatorNote) {
        outlineTree.push({
            title: isVietnamese ? 'Lưu ý của người chuyển ngữ' : "Converter's Note",
            pageNum: 1 + coverOffset,
            children: []
        });
    }

    const tocPageObj = pageTexts.find(p => p.text.includes('MỤCLỤC') || p.text.includes('TABLEOFCONTENTS') || p.text.includes('MỤC LỤC'));
    if (tocPageObj) {
        outlineTree.push({
            title: isVietnamese ? 'Mục lục' : 'Table of Contents',
            pageNum: tocPageObj.page + coverOffset,
            children: []
        });
    }

    // ── 2. Match Headings to Pages ──
    const resolvedHeadings = rawHeadings.map(h => {
        const cleanMarker = h.marker ? h.marker.replace(/\s+/g, '') : '';
        const found = cleanMarker ? pageTexts.find(p => p && p.text.includes(cleanMarker)) : null;
        const bodyPage = found ? found.page : 1;
        return {
            ...h,
            pageNum: bodyPage + coverOffset
        };
    });

    // ── 3. Build Nested Tree (H1 -> H2 -> H3) ──
    let curH1 = null;
    let curH2 = null;
    for (const h of resolvedHeadings) {
        if (h.level === 1) {
            curH1 = {
                title: h.title,
                pageNum: h.pageNum,
                children: []
            };
            curH2 = null;
            outlineTree.push(curH1);
        } else if (h.level === 2) {
            curH2 = {
                title: h.title,
                pageNum: h.pageNum,
                children: []
            };
            if (curH1) {
                curH1.children.push(curH2);
            } else {
                outlineTree.push(curH2);
            }
        } else if (h.level === 3) {
            const h3Node = {
                title: h.title,
                pageNum: h.pageNum,
                children: []
            };
            if (curH2) {
                curH2.children.push(h3Node);
            } else if (curH1) {
                curH1.children.push(h3Node);
            } else {
                outlineTree.push(h3Node);
            }
        }
    }

    return outlineTree;
}

/**
 * Injects PDF /Outlines dictionary and sets PageMode = UseOutlines in pdf-lib PDFDocument
 */
function applyOutlinesToDocument(pdfLibMod, finalPdfDoc, outlineTree) {
    const { PDFName, PDFHexString, PDFNumber } = pdfLibMod;

    if (!outlineTree || outlineTree.length === 0) return;

    const pages = finalPdfDoc.getPages();
    if (!pages || pages.length === 0) return;

    const outlinesDict = finalPdfDoc.context.obj({
        Type: 'Outlines'
    });
    const outlinesDictRef = finalPdfDoc.context.register(outlinesDict);

    function createOutlineNode(item, parentRef) {
        const pageIndex = Math.max(0, Math.min(pages.length - 1, item.pageNum - 1));
        const targetPage = pages[pageIndex];
        const pageRef = targetPage.ref;

        const cleanTitle = item.title.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        const titleHex = PDFHexString.fromText(cleanTitle);

        const nodeDict = finalPdfDoc.context.obj({
            Title: titleHex,
            Parent: parentRef,
            Dest: [pageRef, PDFName.of('Fit')]
        });
        const nodeRef = finalPdfDoc.context.register(nodeDict);

        if (item.children && item.children.length > 0) {
            const childRefs = [];
            for (const child of item.children) {
                const cRef = createOutlineNode(child, nodeRef);
                childRefs.push({ ref: cRef, obj: finalPdfDoc.context.lookup(cRef) });
            }

            for (let i = 0; i < childRefs.length; i++) {
                if (i > 0) {
                    childRefs[i].obj.set(PDFName.of('Prev'), childRefs[i - 1].ref);
                }
                if (i < childRefs.length - 1) {
                    childRefs[i].obj.set(PDFName.of('Next'), childRefs[i + 1].ref);
                }
            }

            nodeDict.set(PDFName.of('First'), childRefs[0].ref);
            nodeDict.set(PDFName.of('Last'), childRefs[childRefs.length - 1].ref);
            nodeDict.set(PDFName.of('Count'), PDFNumber.of(item.children.length));
        }

        return nodeRef;
    }

    const topRefs = [];
    for (const item of outlineTree) {
        const ref = createOutlineNode(item, outlinesDictRef);
        topRefs.push({ ref, obj: finalPdfDoc.context.lookup(ref) });
    }

    for (let i = 0; i < topRefs.length; i++) {
        if (i > 0) {
            topRefs[i].obj.set(PDFName.of('Prev'), topRefs[i - 1].ref);
        }
        if (i < topRefs.length - 1) {
            topRefs[i].obj.set(PDFName.of('Next'), topRefs[i + 1].ref);
        }
    }

    outlinesDict.set(PDFName.of('First'), topRefs[0].ref);
    outlinesDict.set(PDFName.of('Last'), topRefs[topRefs.length - 1].ref);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(outlineTree.length));

    finalPdfDoc.catalog.set(PDFName.of('Outlines'), outlinesDictRef);
    finalPdfDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}

module.exports = {
    extractHeadingsFromPage,
    buildOutlineTree,
    applyOutlinesToDocument
};
