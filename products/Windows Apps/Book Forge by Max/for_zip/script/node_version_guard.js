/**
 * Stops an engine script with a clear message when Node.js is too old for the bundled libraries.
 * Must be the first require of every entry script. Without it an old Node fails later with a
 * misleading "module is required" error, because the libraries cannot load.
 * Keep this file free of modern syntax so that any Node.js version can parse it.
 */

var MIN_MAJOR = 22;
var MIN_MINOR = 12;

function isSupportedNodeVersion(version) {
    var parts = String(version).replace(/^v/, '').split('.');
    var major = parseInt(parts[0], 10);
    var minor = parseInt(parts[1], 10);
    return major > MIN_MAJOR || (major === MIN_MAJOR && minor >= MIN_MINOR);
}

if (!isSupportedNodeVersion(process.version)) {
    console.error('[ERROR] Book Forge needs Node.js ' + MIN_MAJOR + '.' + MIN_MINOR + ' or later. This computer has ' + process.version + '.');
    console.error('Install the LTS version from https://nodejs.org/ and reopen the app.');
    process.exit(1);
}

module.exports = { isSupportedNodeVersion: isSupportedNodeVersion };
