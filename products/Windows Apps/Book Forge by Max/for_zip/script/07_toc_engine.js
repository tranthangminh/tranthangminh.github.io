/**
 * Module 07 Helper: Table of Contents (TOC / Menu) Engine
 * Location: script/07_toc_engine.js
 * 
 * Responsibilities:
 * 1. Inject unique navigation IDs and invisible tokens (§CHP_X§) for H1 / H2 tags
 * 2. Generate clean Table of Contents HTML block with dot leaders and page links
 * 3. Provide Table of Contents CSS styling
 * 4. Perform 2-pass page measurement via pdf-parse to compute exact TOC page numbers and offsets
 */

/**
 * Returns CSS rules for Table of Contents
 */
function getTocCssRules() {
    return `
    /* ── Table of Contents (Menu) Styles ── */
    .toc-container, .toc-list, .toc-item {
      box-sizing: border-box;
    }
    .toc-container {
      page-break-before: always;
      page-break-after: always;
      margin-bottom: 2rem;
      width: 100%;
    }
    .toc-heading {
      text-align: center;
      margin-bottom: 2rem;
      font-size: var(--h1-size);
      font-weight: 700;
    }
    .toc-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    .toc-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      font-size: var(--body-size);
      line-height: 1.4;
      width: 100%;
      max-width: 100%;
    }
    .toc-item.level-1 {
      font-weight: 600;
      margin-top: 0.35rem;
      padding-left: 0;
    }
    .toc-item.level-2 {
      padding-left: 1.25rem;
      font-size: 0.92em;
      font-weight: normal;
      margin-top: 0.15rem;
    }
    .toc-item.level-3 {
      padding-left: 2.25rem;
      font-size: 0.85em;
      font-style: italic;
      color: #555;
      margin-top: 0.1rem;
    }
    .toc-link {
      color: var(--text-color);
      text-decoration: none;
      font-weight: inherit;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .toc-dots {
      flex: 1 1 auto;
      border-bottom: 1px dotted #888;
      margin: 0 0.5rem;
      min-width: 15px;
    }
    .toc-page-num {
      font-weight: 600;
      color: #333;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
      white-space: nowrap;
      text-align: right;
      min-width: 2rem;
    }
  `;
}

/**
 * Injects unique ID attributes and invisible chapter token markers into H1, H2, and H3 tags
 */
function injectHeadingMarkers(bodyHtml) {
    let h1Counter = 0;
    bodyHtml = bodyHtml.replace(/<h1([^>]*)>(.*?)<\/h1>/gi, (match, attrs, text) => {
        h1Counter++;
        const idAttr = attrs.includes('id=') ? '' : ` id="chap-${h1Counter}"`;
        const marker = `<span class="chp-marker" style="font-size:0.1pt;color:#ffffff;line-height:0;">[[CHP_${h1Counter}]]</span>`;
        return `<h1${attrs}${idAttr}>${marker}${text}</h1>`;
    });

    let h2Counter = 0;
    bodyHtml = bodyHtml.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, text) => {
        h2Counter++;
        const idAttr = attrs.includes('id=') ? '' : ` id="sec-${h2Counter}"`;
        const marker = `<span class="sec-marker" style="font-size:0.1pt;color:#ffffff;line-height:0;">[[SEC_${h2Counter}]]</span>`;
        return `<h2${attrs}${idAttr}>${marker}${text}</h2>`;
    });

    let h3Counter = 0;
    bodyHtml = bodyHtml.replace(/<h3([^>]*)>(.*?)<\/h3>/gi, (match, attrs, text) => {
        h3Counter++;
        const idAttr = attrs.includes('id=') ? '' : ` id="sub-${h3Counter}"`;
        const marker = `<span class="sub-marker" style="font-size:0.1pt;color:#ffffff;line-height:0;">[[SUB_${h3Counter}]]</span>`;
        return `<h3${attrs}${idAttr}>${marker}${text}</h3>`;
    });

    return bodyHtml;
}

/**
 * Builds the Table of Contents HTML block
 */
function generateTocHtml(tocItems, isVietnamese = false) {
    if (!tocItems || tocItems.length === 0) return '';

    const tocTitle = isVietnamese ? 'MỤC LỤC' : 'TABLE OF CONTENTS';
    const tocRows = tocItems.map(item => {
        const cleanTitle = item.title.replace(/(\[\[(CHP|SEC|SUB)_\d+\]\]|§(CHP|SEC|SUB)_\d+§)/g, '').trim();
        const levelClass = item.level ? ` level-${item.level}` : ' level-1';
        return `
        <div class="toc-item${levelClass}">
          <a href="#${item.id}" class="toc-link">${cleanTitle}</a>
          <span class="toc-dots"></span>
          <span class="toc-page-num">${item.pageNum}</span>
        </div>
        `;
    }).join('\n');

    return `
      <div class="toc-container" id="table-of-contents">
        <h1 class="toc-heading">${tocTitle}</h1>
        <div class="toc-list">
          ${tocRows}
        </div>
      </div>
    `;
}

/**
 * Scans draft PDF using pdf-parse and calculates accurate page numbers for all TOC items
 */
async function measureChapterPages(draftPdfBytes, pdfParseMod, tocCandidates, hasDraftToc = true) {
    const parser = new pdfParseMod.PDFParse(new Uint8Array(draftPdfBytes));
    await parser.load();
    const totalDraftPages = parser.doc.numPages;
    const pageTexts = new Array(totalDraftPages);
    const chunkSize = 50;

    for (let i = 1; i <= totalDraftPages; i += chunkSize) {
        const chunkPromises = [];
        const end = Math.min(i + chunkSize - 1, totalDraftPages);
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

    // TOC offset is 0 if draft PDF already has the TOC rendered in place
    const tocPages = hasDraftToc ? 0 : Math.max(1, Math.ceil(tocCandidates.length / 22));

    // Match each TOC candidate to its page using exact [[CHP_X]], [[SEC_X]], or [[SUB_X]] markers
    return tocCandidates.map(item => {
        const cleanMarker = item.marker ? item.marker.replace(/\s+/g, '') : '';
        const foundPageObj = cleanMarker ? pageTexts.find(p => p && p.text.includes(cleanMarker)) : null;
        const page = foundPageObj ? foundPageObj.page : 1;
        return {
            ...item,
            draftPage: page,
            pageNum: page + tocPages
        };
    });
}

module.exports = {
    getTocCssRules,
    injectHeadingMarkers,
    generateTocHtml,
    measureChapterPages
};
