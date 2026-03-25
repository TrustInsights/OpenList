// Performance and error monitoring state
const metrics = {
    tabsOpened: 0,
    tabsFailed: 0,
    urlsProcessed: 0,
    lastError: null,
    startTime: Date.now(),
    lastOperation: null
};

const serviceWorkerState = {
    installTime: null,
    activationTime: null,
    restarts: 0,
    lastContextMenuCreation: null
};

// Configuration constants
const CONFIG = {
    MAX_TABS: 20,
    DELAY_BETWEEN_TABS: 100,
    METRICS_RETENTION_HOURS: 24,
    CONTEXT_MENU_ID: 'OpenList-ContextMenuOpen'
};

// Structured logging with timestamp and metadata
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        message,
        ...data,
        metrics: { ...metrics },
        serviceWorkerState: { ...serviceWorkerState }
    };
    console[level](JSON.stringify(logData));
}

// Enhanced URL validation
function isProbablyUrl(string) {
    try {
        if (!string || typeof string !== 'string') {
            return false;
        }

        const cleanedString = string.trim();
        const lowerString = cleanedString.toLowerCase();

        // Block dangerous protocols
        const blockedProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];
        if (blockedProtocols.some(protocol => lowerString.startsWith(protocol))) {
            log('warn', 'Blocked dangerous protocol', { url: string });
            return false;
        }

        // Check for common URL patterns
        if (lowerString.startsWith('https:')) return true;
        if (lowerString.startsWith('http:')) return true;
        if (lowerString.startsWith('ftp:')) return true;
        if (lowerString.startsWith('chrome:')) return true;
        if (lowerString.startsWith('www.')) return true;

        // Check for domain pattern
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (domainPattern.test(lowerString)) return true;

        return false;
    } catch (error) {
        log('error', 'URL validation error', { error: error.message, input: string });
        return false;
    }
}

// URL sanitization and normalization
function sanitizeUrl(url) {
    try {
        const trimmedUrl = url.trim();
        let urlObject;

        try {
            if (trimmedUrl.startsWith('www.')) {
                urlObject = new URL('https://' + trimmedUrl);
            } else {
                urlObject = new URL(trimmedUrl);
            }
        } catch (error) {
            log('warn', 'Invalid URL format', { url: trimmedUrl });
            return null;
        }

        // Force HTTPS upgrade
        if (urlObject.protocol === 'http:') {
            urlObject.protocol = 'https:';
        }

        // Block dangerous protocols
        if (['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'].includes(urlObject.protocol)) {
            log('warn', 'Blocked dangerous protocol', { url: trimmedUrl });
            return null;
        }

        return urlObject.href;
    } catch (error) {
        log('error', 'URL sanitization error', { error: error.message, url });
        return null;
    }
}

// Single tab creation with retries
async function createTab(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const tab = await chrome.tabs.create({
                url: url,
                active: false
            });
            return tab;
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
    }
}

// Process and open URLs with comprehensive error handling
async function openList(list) {
    const startTime = performance.now();
    const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        totalTime: 0,
        errors: []
    };

    try {
        if (!list || typeof list !== 'string') {
            throw new Error('Invalid input: URL list must be a string');
        }

        const strings = list.split(/\r\n|\r|\n/);
        log('info', 'Processing URL list', { count: strings.length });

        let processedUrls = 0;

        for (const str of strings) {
            const trimmedStr = str.trim();
            if (!trimmedStr) {
                results.skipped++;
                continue;
            }

            if (processedUrls >= CONFIG.MAX_TABS) {
                log('warn', 'Maximum tab limit reached', { limit: CONFIG.MAX_TABS });
                break;
            }

            try {
                let url;
                if (isProbablyUrl(trimmedStr)) {
                    url = sanitizeUrl(trimmedStr);
                    if (!url) {
                        results.failed++;
                        results.errors.push(`Invalid URL: ${trimmedStr}`);
                        continue;
                    }
                } else {
                    url = `https://www.google.com/search?q=${encodeURIComponent(trimmedStr)}`;
                }

                await createTab(url);
                results.successful++;
                processedUrls++;
                metrics.tabsOpened++;

                if (processedUrls < strings.length) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_TABS));
                }
            } catch (error) {
                results.failed++;
                metrics.tabsFailed++;
                results.errors.push(`Failed to open ${trimmedStr}: ${error.message}`);
                log('error', 'Tab creation failed', { url: trimmedStr, error: error.message });
            }
        }

        metrics.urlsProcessed += strings.length;
        results.totalTime = performance.now() - startTime;

        log('info', 'URL processing complete', { results });
        return results;

    } catch (error) {
        log('error', 'Critical error in openList', { error: error.message });
        metrics.lastError = error.message;
        throw error;
    }
}

// Initialization function for context menu with retry logic
async function initializeContextMenu() {
    try {
        // First, remove any existing context menu items
        await chrome.contextMenus.removeAll();

        // Create the context menu
        await chrome.contextMenus.create({
            id: CONFIG.CONTEXT_MENU_ID,
            title: 'Open selected URLs in new tabs',
            contexts: ['selection']
        });

        serviceWorkerState.lastContextMenuCreation = Date.now();
        log('info', 'Context menu created successfully');
    } catch (error) {
        log('error', 'Context menu initialization failed', { error: error.message });
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
            await chrome.contextMenus.create({
                id: CONFIG.CONTEXT_MENU_ID,
                title: 'Open selected URLs in new tabs',
                contexts: ['selection']
            });
            log('info', 'Context menu created successfully on retry');
        } catch (retryError) {
            log('error', 'Context menu retry failed', { error: retryError.message });
        }
    }
}

// Event Listeners
chrome.runtime.onInstalled.addListener(async (details) => {
    serviceWorkerState.installTime = Date.now();
    log('info', 'Extension installed/updated', { details });

    try {
        await initializeContextMenu();
    } catch (error) {
        log('error', 'Installation error', { error: error.message });
    }
});

chrome.runtime.onStartup.addListener(async () => {
    serviceWorkerState.activationTime = Date.now();
    serviceWorkerState.restarts++;
    log('info', 'Service worker started', { serviceWorkerState });

    try {
        await initializeContextMenu();
    } catch (error) {
        log('error', 'Startup error', { error: error.message });
    }
});

// Handle context menu clicks with improved error handling
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONFIG.CONTEXT_MENU_ID && info.selectionText) {
        try {
            const results = await openList(info.selectionText);
            log('info', 'Context menu selection processed', { results });
        } catch (error) {
            log('error', 'Context menu click handler error', { error: error.message });
        }
    }
});

// Message handling with error boundaries
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openList' && request.urls) {
        openList(request.urls)
            .then(results => {
                sendResponse({
                    status: 'complete',
                    results
                });
            })
            .catch(error => {
                log('error', 'Error processing URL list', { error: error.message });
                sendResponse({
                    status: 'error',
                    message: error.message,
                    details: 'Failed to process URLs'
                });
            });
        return true;
    }

    if (request.action === 'getMetrics') {
        sendResponse({
            status: 'success',
            metrics: {
                ...metrics,
                serviceWorkerState,
                uptime: Date.now() - metrics.startTime
            }
        });
        return false;
    }

    if (request.action === 'getCurrentTabUrls') {
        chrome.tabs.query({ currentWindow: true })
            .then(tabs => {
                const urls = tabs.map(tab => tab.url);
                sendResponse(urls);
            })
            .catch(error => {
                log('error', 'Error fetching current tab URLs', { error: error.message });
                sendResponse([]); // Send an empty array in case of error
            });
        return true;
    }
});