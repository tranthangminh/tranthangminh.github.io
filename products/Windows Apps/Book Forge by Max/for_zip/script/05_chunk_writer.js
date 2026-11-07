/**
 * Module 05 Helper: Chapter Chunk Writer
 * Location: script/05_chunk_writer.js
 *
 * Writes one chapter into chapters_original/, splitting it by H2 then H3 once it
 * reaches the character threshold. Shared by the PDF and Markdown extraction paths.
 */

const fs = require('fs');
const path = require('path');

function cleanTitle(raw) {
    return raw
        .replace(/<[^>]+>/g, '')         // strip HTML tags
        .replace(/\*\*|\*|__|_/g, '')     // strip bold/italic
        .replace(/^[#\s]+/, '')           // strip leading #
        .trim();
}

function makeSlug(title) {
    const clean = title.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().toLowerCase();
    const slug = clean.replace(/\s+/g, '-').slice(0, 50);
    return slug || 'chapter';
}

function parseSubSections(linesList, headingRegex, htmlRegex) {
    const sections = [];
    let curSec = null;
    let preamble = [];
    let inCode = false;

    for (let i = 0; i < linesList.length; i++) {
        const line = linesList[i];
        if (line.trim().startsWith('```')) inCode = !inCode;

        let isMatch = false;
        let title = '';

        if (!inCode) {
            const mdM = line.match(headingRegex);
            if (mdM) {
                isMatch = true;
                title = cleanTitle(mdM[1]);
            } else if (htmlRegex) {
                const htmlM = line.match(htmlRegex);
                if (htmlM) {
                    isMatch = true;
                    title = cleanTitle(htmlM[1]);
                }
            }
        }

        if (isMatch) {
            if (curSec) sections.push(curSec);
            curSec = { title, lines: [line] };
        } else {
            if (curSec) curSec.lines.push(line);
            else preamble.push(line);
        }
    }
    if (curSec) sections.push(curSec);
    if (sections.length > 0) {
        sections[0].lines = [...preamble, ...sections[0].lines];
    }
    return { sections, preamble };
}

/**
 * Returns the number of files written for this chapter.
 * splitMode: 'none' keeps the chapter whole, 'h2' splits by H2, 'h2-h3' also splits long H2 sections by H3.
 */
function writeChapterFiles(chaptersDir, padSeq, title, lines, threshold, splitMode) {
    const allowH2 = splitMode !== 'none';
    const allowH3 = splitMode.includes('h3');
    const chpFullText = lines.join('\n').trim() + '\n';
    const totalChars = chpFullText.length;
    const slugH1 = makeSlug(title);
    let savedFiles = 0;

    const h2Data = (allowH2 && totalChars >= threshold) ? parseSubSections(lines, /^##\s+(.+)$/, /<h2\b[^>]*>(.*?)<\/h2>/i) : { sections: [] };

    if (h2Data.sections.length >= 2) {
        console.log(`  ⚡ Chapter [${padSeq}] "${title}" (${totalChars} chars) -> Smart-splitting into ${h2Data.sections.length} H2 sections (${padSeq}_01, ${padSeq}_02...)`);

        for (let sIdx = 0; sIdx < h2Data.sections.length; sIdx++) {
            const secH2 = h2Data.sections[sIdx];
            const subPad = String(sIdx + 1).padStart(2, '0');
            const slugH2 = makeSlug(secH2.title);
            const secH2Text = secH2.lines.join('\n').trim() + '\n';
            const secH2Chars = secH2Text.length;

            const h3Data = (allowH3 && secH2Chars >= threshold) ? parseSubSections(secH2.lines, /^###\s+(.+)$/, /<h3\b[^>]*>(.*?)<\/h3>/i) : { sections: [] };

            if (h3Data.sections.length >= 2) {
                console.log(`     ↳ ⚡ Section [${padSeq}_${subPad}] "${secH2.title}" (${secH2Chars} chars) -> Smart-splitting into ${h3Data.sections.length} H3 sections (${padSeq}_${subPad}_01, ${padSeq}_${subPad}_02...)`);

                for (let h3Idx = 0; h3Idx < h3Data.sections.length; h3Idx++) {
                    const secH3 = h3Data.sections[h3Idx];
                    const h3Pad = String(h3Idx + 1).padStart(2, '0');
                    const slugH3 = makeSlug(secH3.title);
                    const secH3Text = secH3.lines.join('\n').trim() + '\n';
                    const subFileName = `${padSeq}_${subPad}_${h3Pad}-${h3Idx === 0 ? (sIdx === 0 ? slugH1 : slugH2) : slugH3}.md`;

                    fs.writeFileSync(path.join(chaptersDir, subFileName), secH3Text, 'utf8');
                    savedFiles++;

                    console.log(`        ↳ [${padSeq}_${subPad}_${h3Pad}] Saved: chapters_original/${subFileName} (${secH3Text.length} chars)`);
                }
            } else {
                const subFileName = `${padSeq}_${subPad}-${sIdx === 0 ? slugH1 : slugH2}.md`;

                fs.writeFileSync(path.join(chaptersDir, subFileName), secH2Text, 'utf8');
                savedFiles++;

                console.log(`     ↳ [${padSeq}_${subPad}] Saved: chapters_original/${subFileName} (${secH2Text.length} chars)`);
            }
        }
    } else {
        const fileName = `${padSeq}-${slugH1}.md`;

        fs.writeFileSync(path.join(chaptersDir, fileName), chpFullText, 'utf8');
        savedFiles++;

        console.log(`  [${padSeq}] Saved: chapters_original/${fileName} (${totalChars} chars)`);
    }

    return savedFiles;
}

module.exports = { cleanTitle, writeChapterFiles };
