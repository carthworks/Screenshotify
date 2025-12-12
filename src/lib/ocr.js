/**
 * OCR Processor
 * 
 * NOTE: Chrome Manifest V3 doesn't allow loading external scripts from CDN.
 * OCR functionality is currently disabled due to this limitation.
 * 
 * To enable OCR in the future:
 * 1. Download Tesseract.js and bundle it with the extension
 * 2. Update this module to use local files
 * 3. See: https://github.com/naptha/tesseract.js
 */

export class OCRProcessor {
    static worker = null;
    static isInitialized = false;

    /**
     * Initialize Tesseract worker
     */
    static async initialize() {
        throw new Error(
            'OCR is currently unavailable due to Chrome Manifest V3 restrictions.\n\n' +
            'Chrome extensions cannot load external scripts from CDN.\n\n' +
            'Alternative solutions:\n' +
            '• Use online OCR: https://www.onlineocr.net/\n' +
            '• Use Google Lens (right-click image → Search with Google Lens)\n' +
            '• Copy text manually from the screenshot\n\n' +
            'To enable OCR:\n' +
            '• Bundle Tesseract.js locally with the extension\n' +
            '• This requires downloading ~2MB of files\n' +
            '• See documentation for instructions'
        );
    }

    /**
     * Recognize text from image
     * @param {string|HTMLImageElement|HTMLCanvasElement} image - Image source
     * @param {Function} progressCallback - Progress callback (0-1)
     * @returns {Promise<Object>} Recognition result
     */
    static async recognize(image, progressCallback) {
        await this.initialize();
        // Will throw error from initialize()
    }

    /**
     * Terminate worker
     */
    static async terminate() {
        // No-op
    }

    /**
     * Get supported languages
     * @returns {Array<Object>} Language list
     */
    static getSupportedLanguages() {
        return [
            { code: 'eng', name: 'English' },
            { code: 'spa', name: 'Spanish' },
            { code: 'fra', name: 'French' },
            { code: 'deu', name: 'German' },
            { code: 'ita', name: 'Italian' },
            { code: 'por', name: 'Portuguese' },
            { code: 'rus', name: 'Russian' },
            { code: 'jpn', name: 'Japanese' },
            { code: 'chi_sim', name: 'Chinese (Simplified)' },
            { code: 'chi_tra', name: 'Chinese (Traditional)' },
            { code: 'kor', name: 'Korean' },
            { code: 'ara', name: 'Arabic' },
            { code: 'hin', name: 'Hindi' }
        ];
    }

    /**
     * Preprocess image for better OCR results
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @returns {HTMLCanvasElement} Preprocessed canvas
     */
    static preprocessImage(canvas) {
        // Not used when OCR is disabled
        return canvas;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    OCRProcessor.terminate();
});
