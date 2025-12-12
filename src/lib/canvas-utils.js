/**
 * Canvas Utilities
 * Helper functions for canvas operations including blur
 */

export class CanvasUtils {
    /**
     * Apply box blur to image data
     * @param {ImageData} imageData - Image data to blur
     * @param {number} radius - Blur radius
     * @returns {ImageData} Blurred image data
     */
    static boxBlur(imageData, radius) {
        const { width, height, data } = imageData;
        const output = new ImageData(width, height);
        const outputData = output.data;

        // Copy original data
        for (let i = 0; i < data.length; i++) {
            outputData[i] = data[i];
        }

        // Horizontal pass
        this.boxBlurHorizontal(data, outputData, width, height, radius);

        // Vertical pass
        this.boxBlurVertical(outputData, data, width, height, radius);

        // Copy back to output
        for (let i = 0; i < data.length; i++) {
            outputData[i] = data[i];
        }

        return output;
    }

    /**
     * Horizontal box blur pass
     */
    static boxBlurHorizontal(input, output, width, height, radius) {
        const diameter = radius * 2 + 1;

        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;

            // Initialize with leftmost pixels
            for (let x = -radius; x <= radius; x++) {
                const px = Math.max(0, Math.min(width - 1, x));
                const idx = (y * width + px) * 4;
                r += input[idx];
                g += input[idx + 1];
                b += input[idx + 2];
                a += input[idx + 3];
            }

            // Process row
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                output[idx] = r / diameter;
                output[idx + 1] = g / diameter;
                output[idx + 2] = b / diameter;
                output[idx + 3] = a / diameter;

                // Update sliding window
                const leftX = Math.max(0, x - radius);
                const rightX = Math.min(width - 1, x + radius + 1);

                const leftIdx = (y * width + leftX) * 4;
                const rightIdx = (y * width + rightX) * 4;

                r = r - input[leftIdx] + input[rightIdx];
                g = g - input[leftIdx + 1] + input[rightIdx + 1];
                b = b - input[leftIdx + 2] + input[rightIdx + 2];
                a = a - input[leftIdx + 3] + input[rightIdx + 3];
            }
        }
    }

    /**
     * Vertical box blur pass
     */
    static boxBlurVertical(input, output, width, height, radius) {
        const diameter = radius * 2 + 1;

        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            // Initialize with topmost pixels
            for (let y = -radius; y <= radius; y++) {
                const py = Math.max(0, Math.min(height - 1, y));
                const idx = (py * width + x) * 4;
                r += input[idx];
                g += input[idx + 1];
                b += input[idx + 2];
                a += input[idx + 3];
            }

            // Process column
            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                output[idx] = r / diameter;
                output[idx + 1] = g / diameter;
                output[idx + 2] = b / diameter;
                output[idx + 3] = a / diameter;

                // Update sliding window
                const topY = Math.max(0, y - radius);
                const bottomY = Math.min(height - 1, y + radius + 1);

                const topIdx = (topY * width + x) * 4;
                const bottomIdx = (bottomY * width + x) * 4;

                r = r - input[topIdx] + input[bottomIdx];
                g = g - input[topIdx + 1] + input[bottomIdx + 1];
                b = b - input[topIdx + 2] + input[bottomIdx + 2];
                a = a - input[topIdx + 3] + input[bottomIdx + 3];
            }
        }
    }

    /**
     * Fast pixelation blur (much faster than box blur)
     * @param {ImageData} imageData - Image data to blur
     * @param {number} pixelSize - Size of pixels (higher = more blur)
     * @returns {ImageData} Pixelated image data
     */
    static pixelateBlur(imageData, pixelSize = 10) {
        const { width, height, data } = imageData;
        const output = new ImageData(width, height);
        const outputData = output.data;

        // Process in blocks
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                // Calculate average color for this block
                let r = 0, g = 0, b = 0, a = 0, count = 0;

                for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        a += data[idx + 3];
                        count++;
                    }
                }

                // Average color
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                a = Math.floor(a / count);

                // Fill block with average color
                for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        outputData[idx] = r;
                        outputData[idx + 1] = g;
                        outputData[idx + 2] = b;
                        outputData[idx + 3] = a;
                    }
                }
            }
        }

        return output;
    }

    /**
     * Resize image to max dimensions
     * @param {HTMLImageElement} img - Source image
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {HTMLCanvasElement} Resized canvas
     */
    static resizeImage(img, maxWidth, maxHeight) {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        return canvas;
    }

    /**
     * Convert canvas to blob
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} type - MIME type (default: image/png)
     * @param {number} quality - Quality for lossy formats (0-1)
     * @returns {Promise<Blob>} Image blob
     */
    static canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, type, quality);
        });
    }

    /**
     * Load image from URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    static loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Crop canvas to specified region
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @param {number} x - Crop X
     * @param {number} y - Crop Y
     * @param {number} width - Crop width
     * @param {number} height - Crop height
     * @returns {HTMLCanvasElement} Cropped canvas
     */
    static cropCanvas(canvas, x, y, width, height) {
        const cropped = document.createElement('canvas');
        cropped.width = width;
        cropped.height = height;

        const ctx = cropped.getContext('2d');
        ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

        return cropped;
    }
}
