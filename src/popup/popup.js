/**
 * Popup UI Controller
 * Handles quick capture and history display
 */

document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('Popup initializing...');
    try {
        setupEventListeners();
        await loadHistory();
        console.log('Popup initialized successfully');
    } catch (error) {
        console.error('Popup initialization error:', error);
    }
}

function setupEventListeners() {
    // Capture button
    document.getElementById('captureBtn').addEventListener('click', handleCapture);

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', handleClearHistory);

    // Help and about
    document.getElementById('helpBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showHelp();
    });

    document.getElementById('aboutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showAbout();
    });
}

/**
 * Handle screenshot capture
 */
async function handleCapture() {
    const btn = document.getElementById('captureBtn');
    btn.disabled = true;
    btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    <span>Capturing...</span>
  `;

    try {
        // Send capture request to background script
        const response = await chrome.runtime.sendMessage({ action: 'capture' });

        if (response.success) {
            // Open annotate window
            await chrome.runtime.sendMessage({
                action: 'openAnnotate',
                dataUrl: response.dataUrl
            });

            // Close popup
            window.close();
        } else {
            throw new Error(response.error || 'Capture failed');
        }
    } catch (error) {
        console.error('Capture error:', error);
        alert('Failed to capture screenshot: ' + error.message);

        // Reset button
        btn.disabled = false;
        btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span>Quick Capture</span>
      <kbd>Ctrl+Shift+S</kbd>
    `;
    }
}

/**
 * Load and display history
 */
async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get('history');
    const container = document.getElementById('historyContainer');
    const clearBtn = document.getElementById('clearHistoryBtn');

    if (history.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <p>No captures yet</p>
        <small>Click "Quick Capture" to get started</small>
      </div>
    `;
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'block';

    container.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = formatTime(date);
        const dateStr = formatDate(date);

        return `
      <div class="history-item" data-id="${item.id}">
        <img src="${item.thumbnail}" alt="Screenshot thumbnail">
        <div class="history-item-info">
          <div class="history-item-time">${timeStr}</div>
          <div class="history-item-date">${dateStr}</div>
        </div>
        <svg class="history-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            openHistoryItem(id, history);
        });
    });
}

/**
 * Open a history item in annotate window
 */
async function openHistoryItem(id, history) {
    const item = history.find(h => h.id === id);
    if (!item) return;

    await chrome.storage.session.set({ currentImage: item.dataUrl });

    chrome.windows.create({
        url: chrome.runtime.getURL('src/annotate/annotate.html'),
        type: 'popup',
        width: 1200,
        height: 900,
        focused: true
    });

    window.close();
}

/**
 * Clear all history
 */
async function handleClearHistory() {
    if (!confirm('Are you sure you want to clear all capture history?')) {
        return;
    }

    await chrome.storage.local.set({ history: [] });
    await loadHistory();
}

/**
 * Format time (e.g., "2:30 PM")
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format date (e.g., "Today", "Yesterday", "Dec 11")
 */
function formatDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (itemDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Show help information
 */
function showHelp() {
    alert(`Screenshotify Help

Keyboard Shortcuts:
• Ctrl+Shift+S - Capture screenshot
• P - Toggle pen tool (in annotate mode)
• Ctrl+Z - Undo
• Ctrl+Y - Redo

How to Use:
1. Click "Quick Capture" or use Ctrl+Shift+S
2. Use annotation tools to mark up your screenshot
3. Apply blur to sensitive areas
4. Crop, zoom, and adjust as needed
5. Save, download, or share your annotated image

Privacy:
All processing happens locally in your browser. Nothing is uploaded unless you explicitly configure and use Imgur upload in Settings.`);
}

/**
 * Show about information
 */
function showAbout() {
    alert(`Screenshotify v1.0.0

A lightweight, privacy-focused screenshot tool with powerful annotation capabilities.

Features:
• Offline screenshot capture
• Rich annotation tools (pen, shapes, text, highlight, blur)
• Crop and zoom functionality
• Number markers for step-by-step guides
• Privacy-first design

Created with ❤️ for productivity and privacy.`);
}
