/**
 * Measures the text margins of published PDFs against the paper profiles and the app's tooltips.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { SCRIPT_DIR, runScript, tempDir, loadPdf, measureBodyMargins, prose } = require('./helpers');

const { PROFILES } = require(path.join(SCRIPT_DIR, '07_gutter_engine.js'));
const TOLERANCE_MM = 0.5;
const workDir = tempDir('bf-margins-');
const paragraphs = prose(9000).replace(/<\/?p>/g, '\n\n');

test.after(() => fs.rmSync(workDir, { recursive: true, force: true }));

function publish(profile, binding) {
    const dir = path.join(workDir, `${profile}-${binding}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'book-original.md'), `# Chapter 1\n\n${paragraphs}\n\n# Chapter 2\n\n${paragraphs}\n`);
    runScript('07__pdf_publisher.js', ['--input=book-original.md', `--profile=${profile}`, `--binding=${binding}`, '--note=none'], dir);
    const suffix = binding === 'screen' ? '-screen' : '';
    return path.join(dir, `book-original (${profile}${suffix}).pdf`);
}

async function assertMargins(pdfPath, expectedFor) {
    const doc = await loadPdf(pdfPath);
    assert.ok(doc.numPages >= 3);
    for (let n = 1; n <= doc.numPages; n++) {
        const measured = await measureBodyMargins(doc, n);
        if (!measured) continue;
        const expected = expectedFor(n);
        assert.ok(Math.abs(measured.left - expected.left) <= TOLERANCE_MM, `page ${n} left ${measured.left.toFixed(1)} mm, expected ${expected.left}`);
        assert.ok(Math.abs(measured.right - expected.right) <= TOLERANCE_MM, `page ${n} right ${measured.right.toFixed(1)} mm, expected ${expected.right}`);
    }
}

for (const profile of ['A5', 'A4']) {
    test(`${profile} print margins alternate at the profile values`, async () => {
        const inside = parseFloat(PROFILES[profile].gutterMargin.inside);
        const outside = parseFloat(PROFILES[profile].gutterMargin.outside);
        await assertMargins(publish(profile, 'print'), n => (n % 2 === 1 ? { left: inside, right: outside } : { left: outside, right: inside }));
    });

    test(`${profile} digital margins are even at the profile value`, async () => {
        const margin = parseFloat(PROFILES[profile].margin.left);
        await assertMargins(publish(profile, 'screen'), () => ({ left: margin, right: margin }));
    });
}

test('tooltips state the A5 profile values', () => {
    const designer = fs.readFileSync(path.join(__dirname, '..', 'src_Book Forge by Max', 'MainForm.Designer.cs'), 'utf8');
    const line = name => designer.split('\n').find(l => l.includes(`SetToolTip(this.${name},`));
    const a5 = PROFILES.A5;
    assert.ok(line('rbGutterPrint').includes(`A5: ${parseFloat(a5.gutterMargin.inside)} mm inside, ${parseFloat(a5.gutterMargin.outside)} mm outside`));
    assert.ok(line('rbGutterDigital').includes(`A5: ${parseFloat(a5.margin.left)} mm on each side`));
});
