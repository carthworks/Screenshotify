/**
 * Options Page Controller
 * Handles settings management
 */

// Default settings
const DEFAULT_SETTINGS = {
    imageFormat: 'png',
    jpegQuality: 92,
    defaultBlurStrength: 10,
    autoDownscale: true,
    imgurClientId: '',
    githubToken: ''
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    setupEventListeners();
}

/**
 * Load settings from storage
 */
async function loadSettings() {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

    // Populate form fields
    document.getElementById('imageFormat').value = settings.imageFormat;
    document.getElementById('jpegQuality').value = settings.jpegQuality;
    document.getElementById('jpegQualityValue').textContent = settings.jpegQuality;
    document.getElementById('defaultBlurStrength').value = settings.defaultBlurStrength;
    document.getElementById('defaultBlurStrengthValue').textContent = settings.defaultBlurStrength;
    document.getElementById('autoDownscale').checked = settings.autoDownscale;
    document.getElementById('imgurClientId').value = settings.imgurClientId;
    document.getElementById('githubToken').value = settings.githubToken;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Range sliders
    document.getElementById('jpegQuality').addEventListener('input', (e) => {
        document.getElementById('jpegQualityValue').textContent = e.target.value;
    });

    document.getElementById('defaultBlurStrength').addEventListener('input', (e) => {
        document.getElementById('defaultBlurStrengthValue').textContent = e.target.value;
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    // Reset settings button
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

    // Auto-save on change (debounced)
    let saveTimeout;
    document.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('change', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveSettings, 1000);
        });
    });
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    const settings = {
        imageFormat: document.getElementById('imageFormat').value,
        jpegQuality: parseInt(document.getElementById('jpegQuality').value),
        defaultBlurStrength: parseInt(document.getElementById('defaultBlurStrength').value),
        autoDownscale: document.getElementById('autoDownscale').checked,
        imgurClientId: document.getElementById('imgurClientId').value.trim(),
        githubToken: document.getElementById('githubToken').value.trim()
    };

    try {
        await chrome.storage.local.set(settings);
        showSaveStatus('Settings saved successfully!');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showSaveStatus('Failed to save settings', true);
    }
}

/**
 * Show save status message
 */
function showSaveStatus(message, isError = false) {
    const status = document.getElementById('saveStatus');
    status.textContent = message;
    status.style.color = isError ? '#ef4444' : '#10b981';

    setTimeout(() => {
        status.textContent = '';
    }, 3000);
}

/**
 * Clear capture history
 */
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all capture history? This cannot be undone.')) {
        return;
    }

    try {
        await chrome.storage.local.set({ history: [] });
        alert('Capture history cleared successfully!');
    } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear history: ' + error.message);
    }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
        return;
    }

    try {
        await chrome.storage.local.set(DEFAULT_SETTINGS);
        await loadSettings();
        showSaveStatus('Settings reset to defaults');
    } catch (error) {
        console.error('Failed to reset settings:', error);
        showSaveStatus('Failed to reset settings', true);
    }
}
