// DOM Elements
const listTextArea = document.getElementById('list');
const openButton = document.getElementById('openButton');
const statusElement = document.getElementById('status');
const metricsElement = document.getElementById('metrics');

// Configuration
const CONFIG = {
    STATUS_TIMEOUT: 2000,
    METRICS_REFRESH_INTERVAL: 5000,
    MAX_ERROR_DETAILS: 3
};

// Utility Functions
function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : '';
}

function clearStatus() {
    statusElement.textContent = '';
    statusElement.className = '';
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function showError(message, details = []) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';

    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    errorContainer.appendChild(errorMessage);

    if (details && details.length > 0) {
        const errorDetails = document.createElement('ul');
        errorDetails.className = 'error-details';

        details.slice(0, CONFIG.MAX_ERROR_DETAILS).forEach(detail => {
            const li = document.createElement('li');
            li.textContent = detail;
            errorDetails.appendChild(li);
        });

        if (details.length > CONFIG.MAX_ERROR_DETAILS) {
            const li = document.createElement('li');
            li.textContent = `...and ${details.length - CONFIG.MAX_ERROR_DETAILS} more errors`;
            errorDetails.appendChild(li);
        }

        errorContainer.appendChild(errorDetails);
    }

    statusElement.innerHTML = '';
    statusElement.appendChild(errorContainer);
}

async function getCurrentWindowTabs() {
    try {
        const tabs = await chrome.tabs.query({
            currentWindow: true,
            url: ['http://*/*', 'https://*/*', 'ftp://*/*']
        });

        return tabs
            .filter(tab => tab.url && tab.url.trim())
            .map(tab => tab.url)
            .join('\n');
    } catch (error) {
        console.error('Error getting tabs:', error);
        showError('Error getting current tabs', [error.message]);
        return '';
    }
}

async function updateMetrics() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getMetrics'
        });

        if (response.status === 'success' && metricsElement) {
            const { metrics } = response;
            const successRate = metrics.urlsProcessed ?
                ((metrics.tabsOpened / metrics.urlsProcessed) * 100).toFixed(1) :
                '100';

            const uptime = formatDuration(metrics.uptime);

            metricsElement.innerHTML = `
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value">${successRate}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Tabs Opened</span>
                        <span class="metric-value">${metrics.tabsOpened}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Errors</span>
                        <span class="metric-value">${metrics.tabsFailed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value">${uptime}</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching metrics:', error);
        metricsElement.innerHTML = '<div class="metrics-error">Unable to load metrics</div>';
    }
}

async function openUrls(urlText) {
    if (!urlText.trim()) {
        showError('Please enter some URLs or text to search');
        return;
    }

    openButton.disabled = true;
    setStatus('Opening tabs...');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'openList',
            urls: urlText
        });

        if (response.status === 'error') {
            throw new Error(response.message);
        }

        const { results } = response;
        const statusText = `Opened ${results.successful} tab${results.successful !== 1 ? 's' : ''} ` +
                         `(${results.failed} failed, ${results.skipped} skipped) ` +
                         `in ${(results.totalTime / 1000).toFixed(1)}s`;

        setStatus(statusText);

        if (results.errors && results.errors.length > 0) {
            setTimeout(() => showError('Some URLs failed to open', results.errors), CONFIG.STATUS_TIMEOUT);
        } else {
            setTimeout(clearStatus, CONFIG.STATUS_TIMEOUT);
        }

        setTimeout(updateMetrics, 1000);
    } catch (error) {
        console.error('Error opening tabs:', error);
        showError('Failed to open tabs', [error.message]);
    } finally {
        openButton.disabled = false;
    }
}

// Event handler references
const boundOpenUrls = () => openUrls(listTextArea.value);
const boundKeyHandler = (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        openUrls(listTextArea.value);
    }
};

// Initialization
async function initPopup() {
    try {
        // Initialize metrics display
        await updateMetrics();
        const metricsInterval = setInterval(updateMetrics, CONFIG.METRICS_REFRESH_INTERVAL);

        // Pre-populate with current tab URLs
        try {
            const tabs = await chrome.runtime.sendMessage({ action: 'getCurrentTabUrls' });
            if (tabs && tabs.length > 0) {
                listTextArea.value = tabs.join('\n');
            }
        } catch (error) {
            console.error('Error fetching current tabs for popup:', error);
        }

        // Add event listeners
        openButton.addEventListener('click', boundOpenUrls);
        listTextArea.addEventListener('keydown', boundKeyHandler);

        // Cleanup on unload
        window.addEventListener('unload', () => {
            clearInterval(metricsInterval);
            openButton.removeEventListener('click', boundOpenUrls);
            listTextArea.removeEventListener('keydown', boundKeyHandler);
            document.removeEventListener('DOMContentLoaded', initPopup);
        });
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Error initializing popup', [error.message]);
    }
}

// Start initialization when popup loads
document.addEventListener('DOMContentLoaded', initPopup);