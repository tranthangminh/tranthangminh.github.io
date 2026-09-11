const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Robust Puppeteer Browser Launcher for Windows
 * - Creates an isolated temporary user-data-dir per session to avoid profile locking
 * - Disables Microsoft Edge Startup Boost (msEdgeStartupBoost) which causes immediate exit code 0
 * - Adds anti-sandbox, disable-extensions, and headless flags
 * - Automatically falls back to default bundled Chrome if a specified executablePath fails
 * - Automatically purges temporary user-data-dir on browser close
 */
async function launchRobustBrowser(puppeteerMod, options = {}) {
    const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-pup-'));

    const defaultArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=msEdgeStartupBoost,Translate,BackForwardCache',
        '--disable-extensions',
        '--disable-component-update',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + tempProfile
    ];

    const launchOpts = {
        headless: 'new',
        args: defaultArgs,
        ...options
    };

    if (options.args) {
        const mergedArgs = [...defaultArgs];
        for (const arg of options.args) {
            if (!mergedArgs.includes(arg) && !arg.startsWith('--user-data-dir=')) {
                mergedArgs.push(arg);
            }
        }
        launchOpts.args = mergedArgs;
    }

    if (!launchOpts.executablePath) {
        const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
        if (envPath && fs.existsSync(envPath)) {
            launchOpts.executablePath = envPath;
        }
    }

    let browser = null;
    try {
        browser = await puppeteerMod.launch(launchOpts);
    } catch (err) {
        if (launchOpts.executablePath) {
            console.warn('[BrowserLauncher] Warning: Launching with ' + launchOpts.executablePath + ' failed: ' + err.message + '. Retrying with default browser...');
            const savedPupPath = process.env.PUPPETEER_EXECUTABLE_PATH;
            const savedChromePath = process.env.CHROME_PATH;
            delete process.env.PUPPETEER_EXECUTABLE_PATH;
            delete process.env.CHROME_PATH;
            const fallbackOpts = { ...launchOpts };
            delete fallbackOpts.executablePath;
            try {
                browser = await puppeteerMod.launch(fallbackOpts);
            } catch (fallbackErr) {
                try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (e) {}
                throw fallbackErr;
            } finally {
                if (savedPupPath) process.env.PUPPETEER_EXECUTABLE_PATH = savedPupPath;
                if (savedChromePath) process.env.CHROME_PATH = savedChromePath;
            }
        } else {
            try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (e) {}
            throw err;
        }
    }

    const originalClose = browser.close.bind(browser);
    browser.close = async () => {
        try {
            await originalClose();
        } finally {
            try {
                fs.rmSync(tempProfile, { recursive: true, force: true });
            } catch (e) {}
        }
    };

    return browser;
}

module.exports = { launchRobustBrowser };
