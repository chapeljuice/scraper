const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
    // In render.com, we need to install the browser ourselves
    downloadBrowsersOnStartup: true,
    // Always install the latest stable Chrome version
    browserRevision: 'latest'
};