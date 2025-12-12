/**
 * Share Manager
 * Handles image sharing via Imgur, GitHub Gist, and native share
 */

export class ShareManager {
    /**
     * Upload image to Imgur
     * @param {Blob} blob - Image blob
     * @returns {Promise<string>} Public image URL
     */
    static async uploadToImgur(blob) {
        try {
            // Get Imgur client ID from storage
            const { imgurClientId } = await chrome.storage.local.get('imgurClientId');

            if (!imgurClientId) {
                throw new Error('Imgur client ID not configured. Please add it in Settings.');
            }

            // Convert blob to base64
            const base64 = await this.blobToBase64(blob);
            const imageData = base64.split(',')[1]; // Remove data:image/png;base64, prefix

            // Upload to Imgur
            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Client-ID ${imgurClientId}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData,
                    type: 'base64'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.data?.error || 'Upload failed');
            }

            const data = await response.json();
            return data.data.link;
        } catch (error) {
            console.error('Imgur upload error:', error);
            throw error;
        }
    }

    /**
     * Upload image to GitHub Gist
     * @param {Blob} blob - Image blob
     * @param {string} filename - Filename for the gist
     * @returns {Promise<string>} Gist URL
     */
    static async uploadToGist(blob, filename = 'screenshot.png') {
        try {
            // Get GitHub token from storage
            const { githubToken } = await chrome.storage.local.get('githubToken');

            if (!githubToken) {
                throw new Error('GitHub token not configured. Please add it in Settings.');
            }

            // Convert blob to base64
            const base64 = await this.blobToBase64(blob);

            // Create gist
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: 'Screenshot from Screenshotify',
                    public: false,
                    files: {
                        [filename]: {
                            content: base64
                        }
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const data = await response.json();
            return data.html_url;
        } catch (error) {
            console.error('Gist upload error:', error);
            throw error;
        }
    }

    /**
     * Share via Web Share API
     * @param {Blob} blob - Image blob
     * @param {string} title - Share title
     * @param {string} text - Share text
     * @returns {Promise<void>}
     */
    static async nativeShare(blob, title = 'Screenshot', text = 'Check out this screenshot') {
        if (!navigator.share) {
            throw new Error('Web Share API not supported');
        }

        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        try {
            await navigator.share({
                title,
                text,
                files: [file]
            });
        } catch (error) {
            // User cancelled or share failed
            if (error.name !== 'AbortError') {
                throw error;
            }
        }
    }

    /**
     * Copy image to clipboard
     * @param {Blob} blob - Image blob
     * @returns {Promise<void>}
     */
    static async copyToClipboard(blob) {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
        } catch (error) {
            console.error('Clipboard write failed:', error);
            throw new Error('Failed to copy to clipboard. Your browser may not support this feature.');
        }
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<void>}
     */
    static async copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Clipboard write failed:', error);
            throw new Error('Failed to copy to clipboard');
        }
    }

    /**
     * Convert blob to base64
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} Base64 string
     */
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Download blob as file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    static downloadBlob(blob, filename = 'screenshot.png') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Check if Web Share API is available
     * @returns {boolean}
     */
    static isWebShareAvailable() {
        return !!navigator.share;
    }

    /**
     * Check if Clipboard API is available
     * @returns {boolean}
     */
    static isClipboardAvailable() {
        return !!navigator.clipboard?.write;
    }
}
