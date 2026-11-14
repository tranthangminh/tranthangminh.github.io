/**
 * Reproduces the chapter detection bugs on real Chromium PDFs, with and without a contents page.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { buildBookPdf, extractBook, tempDir, loadPdf } = require('./helpers');

const CHAPTER_TITLES = ['Chapter 1: The Harbor', 'Chapter 2: The Survey', 'Chapter 3: A Very Long Record'];
const SPLIT_THRESHOLD = 25000;
const workDir = tempDir('bf-chapters-');

test.after(() => fs.rmSync(workDir, { recursive: true, force: true }));

async function extract(variant, options = {}) {
    const dir = path.join(workDir, variant);
    fs.mkdirSync(dir, { recursive: true });
    const pdfPath = path.join(dir, `${variant}.pdf`);
    await buildBookPdf(variant, pdfPath, options);
    const { files, log } = extractBook(pdfPath, path.join(dir, 'book'), options);
    return { files, log, pdfPath, projectDir: path.join(dir, 'book') };
}

const h1Titles = files => Object.values(files).flatMap(t => t.split('\n').filter(l => l.startsWith('# ')).map(l => l.slice(2))).filter(t => t !== 'Front Matter');
const headings = (files, level) => Object.values(files).flatMap(t => t.split('\n').filter(l => l.startsWith(`${'#'.repeat(level)} `)).map(l => l.slice(level + 1)));
const allText = files => Object.values(files).join('\n');

function assertBookStructure(files) {
    assert.deepStrictEqual(h1Titles(files), CHAPTER_TITLES, 'exactly the three chapters, with full titles');

    const sections = headings(files, 2);
    for (const section of ['Morning Tide', 'An Unexpected Boat', 'Charts and Soundings', 'Deep Water', 'The First Ledger', 'The Second Ledger']) {
        assert.strictEqual(sections.filter(s => s === section).length, 1, `${section} is one H2`);
    }
    assert.ok(!sections.some(s => /Figure 1/.test(s)), 'figure text is not a heading');
    assert.ok(!sections.some(s => /Record|Chapter/.test(s)), 'no H2 repeats a chapter title');
    assert.ok(!/<p align="center" style/.test(allText(files)), 'no section was demoted to centered text');

    const chunks = Object.keys(files).filter(f => f.startsWith('03_'));
    assert.strictEqual(chunks.length, 2, 'the long chapter splits at both of its H2 sections');
    for (const chunk of chunks) {
        assert.ok(files[chunk].length < SPLIT_THRESHOLD * 1.1, `${chunk} is ${files[chunk].length} chars`);
    }
}

for (const variant of ['noToc', 'toc', 'tocWithSections', 'tocFlatSections']) {
    test(`book structure: ${variant}`, async () => {
        const { files } = await extract(variant);
        if (variant === 'tocFlatSections') {
            assert.deepStrictEqual(h1Titles(files), [
                'Chapter 1: The Harbor',
                'Chapter 2: The Survey',
                'Chapter 3: A Very Long Record of Everything That Passed In and Out of the Harbor'
            ]);
            assert.ok(headings(files, 2).includes('An Unexpected Boat'));
            return;
        }
        assertBookStructure(files);
        assert.ok(files['00-front-matter.md'].includes('The Quiet Harbor'), 'title page stays in the front matter');
        assert.ok(!files['00-front-matter.md'].includes('Morning Tide'), 'chapter 1 is not in the front matter');
    });
}

test('chapter 1 on the first page of the PDF is not front matter', async () => {
    const { files } = await extract('noFrontMatter');
    assert.ok(!('00-front-matter.md' in files));
    assert.ok(Object.keys(files).some(f => f.startsWith('01-chapter-1')));
    assertBookStructure(files);
});

test('chapters that start in the middle of a page split at their heading', async () => {
    const { files } = await extract('flowing');
    assert.deepStrictEqual(h1Titles(files), CHAPTER_TITLES);
    const chapter1 = files[Object.keys(files).find(f => f.startsWith('01-'))];
    assert.ok(!chapter1.includes('Deep Water'), 'chapter 2 content stays out of chapter 1');
});

test('no line of body text is lost, including the first line of each page', async () => {
    const { files, pdfPath } = await extract('noTocLines');
    const md = allText(files).replace(/[^\p{L}\p{N}]/gu, '');
    const doc = await loadPdf(pdfPath);
    const missing = [];
    for (let n = 2; n <= doc.numPages; n++) {
        const content = await (await doc.getPage(n)).getTextContent();
        const first = content.items.find(it => it.str.trim().length > 20);
        if (first && !md.includes(first.str.replace(/[^\p{L}\p{N}]/gu, ''))) missing.push(`p${n}: ${first.str}`);
    }
    assert.deepStrictEqual(missing, []);
});

test('real running headers and page numbers are still removed', async () => {
    const { files, log } = await extract('noTocMarks', { runningMarks: true });
    assert.match(log, /Header Cutoff: Y > \d/);
    assert.ok(!allText(files).includes('Running Book Title'));
    assert.deepStrictEqual(h1Titles(files), CHAPTER_TITLES);
    assert.ok(headings(files, 2).includes('An Unexpected Boat'));
});

test('figure text lives in the SVG only', async () => {
    const { files, projectDir } = await extract('noTocFigure');
    assert.ok(!allText(files).includes('Figure 1'));
    const svg = fs.readdirSync(path.join(projectDir, 'images_original')).find(f => f.endsWith('.svg'));
    assert.match(fs.readFileSync(path.join(projectDir, 'images_original', svg), 'utf8'), /Figure 1/);
});

test('sentences in a shaded box stay in the chapter text', async () => {
    const { files, projectDir } = await extract('callout');
    const metadata = JSON.parse(fs.readFileSync(path.join(projectDir, 'images_original', 'metadata.json'), 'utf8'));
    const box = metadata.items.find(item => item.type === 'vector');
    assert.ok(box, 'the box is drawn as a vector cluster, so this covers the suppression path');
    assert.ok(!box.suppressedTexts);
    const text = allText(files);
    assert.ok(text.includes('This boxed note explains how the harbor master recorded'));
    assert.ok(text.includes('every arrival during the long winter months.'));
});

test('English words are not split in a chapter that has an image', async () => {
    const { files } = await extract('noTocWords');
    const text = allText(files);
    assert.ok(text.includes('![') && text.includes('Charts and Soundings'));
    assert.ok(!text.includes('Soun dings'));
});

test('accented titles and apostrophes', async () => {
    const { files } = await extract('vietnamese');
    assert.deepStrictEqual(h1Titles(files), ['Chương 1: Mở đầu', "Chương 2: The Sailor's Log"]);
    assert.strictEqual(allText(files).split('Chương 1: Mở đầu').length - 1, 1, 'title is not repeated');
});

test('a PDF with no headings is kept as one chapter', async () => {
    const { files } = await extract('plainText');
    assert.strictEqual(Object.keys(files).length, 1);
    assert.ok(allText(files).includes('grey stones'));
});
