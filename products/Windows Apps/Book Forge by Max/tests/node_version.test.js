/**
 * Checks the Node.js version guard. Real old builds are used when BF_OLD_NODE lists their node.exe
 * paths, separated by ";". Example: BF_OLD_NODE=C:\node18\node.exe;C:\node22.11\node.exe
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SCRIPT_DIR, tempDir } = require('./helpers');

const { isSupportedNodeVersion } = require(path.join(SCRIPT_DIR, 'node_version_guard.js'));
const ENTRY_SCRIPTS = ['04__image_extractor.js', '05__chapter_extractor.js', '05_md_chapter_splitter.js', '06__book_compiler.js', '07__pdf_publisher.js', 'audit_pdf_vs_md.js'];
const oldNodes = (process.env.BF_OLD_NODE || '').split(';').filter(Boolean);

test('minimum version matches puppeteer-core', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'node_modules', 'puppeteer-core', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.engines.node, '>=22.12.0');
    for (const v of ['v18.20.8', 'v20.19.5', 'v22.0.0', 'v22.11.0']) assert.strictEqual(isSupportedNodeVersion(v), false, v);
    for (const v of ['v22.12.0', 'v22.22.0', 'v24.0.0', 'v26.4.0']) assert.strictEqual(isSupportedNodeVersion(v), true, v);
});

test('every entry script loads the guard before anything else', () => {
    for (const script of ENTRY_SCRIPTS) {
        const firstRequire = fs.readFileSync(path.join(SCRIPT_DIR, script), 'utf8').match(/require\([^)]*\)/)[0];
        assert.strictEqual(firstRequire, "require('./node_version_guard')", script);
    }
});

test('the README states the same minimum', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'for_zip', 'README.md'), 'utf8');
    assert.ok(readme.includes('Node.js 22.12 trở lên'));
    assert.ok(!/Node\.js \(v1?\d+\+/.test(readme));
});

test('old Node.js builds stop with a clear message', { skip: oldNodes.length === 0 && 'BF_OLD_NODE is not set' }, () => {
    const cwd = tempDir('bf-node-');
    for (const node of oldNodes) {
        for (const script of ENTRY_SCRIPTS) {
            const r = spawnSync(node, [path.join(SCRIPT_DIR, script)], { cwd, encoding: 'utf8' });
            assert.strictEqual(r.status, 1, `${node} ${script}`);
            assert.match(r.stderr, /Book Forge needs Node\.js 22\.12 or later/, `${node} ${script}`);
        }
    }
    fs.rmSync(cwd, { recursive: true, force: true });
});
