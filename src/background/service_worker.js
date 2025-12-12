/**
 * Service Worker for Screenshotify
 * Handles screenshot capture, context menu, and message routing
 */

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-annotate',
    title: 'Capture & Annotate with Screenshotify',
    contexts: ['page', 'selection', 'image', 'link']
  });

  console.log('Screenshotify installed successfully');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-annotate') {
    captureAndAnnotate(tab.id);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        captureAndAnnotate(tabs[0].id);
      }
    });
  }
});

// Handle messages from popup and other components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          const dataUrl = await captureVisibleTab(tabs[0].id);
          sendResponse({ success: true, dataUrl });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'openAnnotate') {
    openAnnotateWindow(request.dataUrl);
    sendResponse({ success: true });
  }
});

/**
 * Capture visible tab and open annotate window
 * @param {number} tabId - ID of the tab to capture
 */
async function captureAndAnnotate(tabId) {
  try {
    const dataUrl = await captureVisibleTab(tabId);
    await saveToHistory(dataUrl);
    openAnnotateWindow(dataUrl);
  } catch (error) {
    console.error('Capture failed:', error);
    // Show error notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/icons/icon48.svg'),
      title: 'Screenshotify Error',
      message: 'Failed to capture screenshot: ' + error.message
    });
  }
}

/**
 * Capture the visible area of a tab
 * @param {number} tabId - ID of the tab to capture
 * @returns {Promise<string>} Data URL of the captured image
 */
async function captureVisibleTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!dataUrl) {
        reject(new Error('No image data received'));
      } else {
        resolve(dataUrl);
      }
    });
  });
}

/**
 * Open annotate window with captured image
 * @param {string} dataUrl - Data URL of the image
 */
async function openAnnotateWindow(dataUrl) {
  // Store image data temporarily
  await chrome.storage.session.set({ currentImage: dataUrl });

  // Create popup window for annotation
  chrome.windows.create({
    url: chrome.runtime.getURL('src/annotate/annotate.html'),
    type: 'popup',
    width: 1200,
    height: 900,
    focused: true
  });
}

/**
 * Save captured image to history
 * @param {string} dataUrl - Data URL of the image
 */
async function saveToHistory(dataUrl) {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    const newEntry = {
      id: Date.now(),
      dataUrl,
      timestamp: new Date().toISOString(),
      thumbnail: await createThumbnail(dataUrl, 200, 150)
    };

    // Keep only last 5 entries
    const updatedHistory = [newEntry, ...history].slice(0, 5);

    await chrome.storage.local.set({ history: updatedHistory });
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

/**
 * Create thumbnail from image data URL
 * @param {string} dataUrl - Original image data URL
 * @param {number} maxWidth - Maximum thumbnail width
 * @param {number} maxHeight - Maximum thumbnail height
 * @returns {Promise<string>} Thumbnail data URL
 */
async function createThumbnail(dataUrl, maxWidth, maxHeight) {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create image bitmap (works in service worker)
    const imageBitmap = await createImageBitmap(blob);

    // Calculate scaling
    const scale = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height);
    const width = imageBitmap.width * scale;
    const height = imageBitmap.height * scale;
    const x = (maxWidth - width) / 2;
    const y = (maxHeight - height) / 2;

    // Create canvas and draw scaled image
    const canvas = new OffscreenCanvas(maxWidth, maxHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, maxWidth, maxHeight);

    // Draw scaled image
    ctx.drawImage(imageBitmap, x, y, width, height);

    // Convert to blob and then to data URL
    const thumbnailBlob = await canvas.convertToBlob({ type: 'image/png', quality: 0.8 });

    // Convert blob to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(thumbnailBlob);
    });
  } catch (error) {
    console.error('Failed to create thumbnail:', error);
    // Return original data URL if thumbnail creation fails
    return dataUrl;
  }
}
