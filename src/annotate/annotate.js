/**
 * Annotate Page Controller
 * Handles canvas drawing and annotation tools
 */

import { CanvasUtils } from '../lib/canvas-utils.js';
import { ShareManager } from '../lib/share.js';

// State
let canvas, ctx;
let currentTool = 'pen';
let isDrawing = false;
let startX, startY;
let currentColor = '#ff0000';
let lineWidth = 3;
let blurStrength = 10;
let fontSize = 20;

// Zoom state
let zoomLevel = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;

// Crop state
let cropMode = false;
let cropRect = null;

// History for undo/redo
let history = [];
let historyStep = -1;

// Current drawing data
let currentPath = [];
let annotations = [];

// Numbered annotations counter
let numberCounter = 1;

// Temporary canvas for smooth previews
let tempCanvas, tempCtx;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadImage();
    setupCanvas();
    setupEventListeners();
    setupKeyboardShortcuts();

    // Check for Web Share API
    if (navigator.share) {
        document.getElementById('nativeShareBtn').style.display = 'flex';
    }

    // Check for Imgur API key
    const { imgurClientId } = await chrome.storage.local.get('imgurClientId');
    if (imgurClientId) {
        document.getElementById('uploadImgurBtn').style.display = 'flex';
    }

    // Show welcome modal on first use
    const { hideWelcome } = await chrome.storage.local.get('hideWelcome');
    if (!hideWelcome) {
        setTimeout(() => {
            const modal = document.getElementById('welcomeModal');
            if (modal) modal.style.display = 'flex';
        }, 500);
    }
}

/**
 * Load image from storage
 */
async function loadImage() {
    console.log('Loading image from storage...');
    const { currentImage } = await chrome.storage.session.get('currentImage');
    console.log('Image data received:', currentImage ? 'Yes' : 'No');

    if (!currentImage) {
        console.error('No image data found in storage');
        alert('No image data found. Please capture a screenshot first.');
        window.close();
        return;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            console.log('Image loaded successfully:', img.width, 'x', img.height);
            window.baseImage = img;
            resolve();
        };
        img.onerror = (error) => {
            console.error('Failed to load image:', error);
            alert('Failed to load image. Please try capturing again.');
            reject(error);
        };
        img.src = currentImage;
    });
}

/**
 * Setup canvas
 */
function setupCanvas() {
    canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    const img = window.baseImage;

    // Set canvas size to image size (max 2K for performance)
    const maxDim = 2000;
    let width = img.width;
    let height = img.height;

    if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
    }

    canvas.width = width;
    canvas.height = height;

    // Create temporary canvas for smooth previews
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx = tempCanvas.getContext('2d');

    // Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply initial zoom
    applyZoom();

    // Save initial state
    saveHistory();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Tool buttons
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            setTool(btn.dataset.tool);
        });
    });

    // Canvas events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Mouse wheel zoom
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    // Tool options
    document.getElementById('colorPicker').addEventListener('input', (e) => {
        currentColor = e.target.value;
    });

    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            document.getElementById('colorPicker').value = currentColor;
        });
    });

    document.getElementById('lineWidth').addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
        document.getElementById('lineWidthValue').textContent = lineWidth;
    });

    document.getElementById('blurStrength').addEventListener('input', (e) => {
        blurStrength = parseInt(e.target.value);
        document.getElementById('blurStrengthValue').textContent = blurStrength;
    });

    document.getElementById('fontSize').addEventListener('input', (e) => {
        fontSize = parseInt(e.target.value);
        document.getElementById('fontSizeValue').textContent = fontSize;
    });

    // Action buttons
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', clearAnnotations);
    document.getElementById('downloadBtn').addEventListener('click', downloadImage);
    document.getElementById('shareBtn').addEventListener('click', showShareModal);
    document.getElementById('closeBtn').addEventListener('click', () => window.close());

    // Zoom buttons
    document.getElementById('zoomInBtn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn')?.addEventListener('click', zoomOut);
    document.getElementById('zoomResetBtn')?.addEventListener('click', zoomReset);

    // Crop button
    document.getElementById('cropBtn')?.addEventListener('click', toggleCropMode);

    // Share modal
    document.getElementById('closeShareModal').addEventListener('click', hideShareModal);
    document.getElementById('shareModal').addEventListener('click', (e) => {
        if (e.target.id === 'shareModal') hideShareModal();
    });

    document.getElementById('copyImageBtn').addEventListener('click', copyImageToClipboard);
    document.getElementById('copyDataUrlBtn').addEventListener('click', copyDataUrl);
    document.getElementById('nativeShareBtn').addEventListener('click', nativeShare);
    document.getElementById('uploadImgurBtn').addEventListener('click', uploadToImgur);

    // Welcome modal
    document.getElementById('closeWelcomeModal')?.addEventListener('click', closeWelcomeModal);
    document.getElementById('helpBtn')?.addEventListener('click', showWelcomeModal);
    document.getElementById('welcomeModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'welcomeModal') closeWelcomeModal();
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Undo: Ctrl+Z
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            redo();
        }

        // Toggle pen: P
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            setTool('pen');
        }
    });
}

/**
 * Set active tool
 */
function setTool(tool) {
    // Exit crop mode if switching tools
    if (cropMode && tool !== 'crop') {
        exitCropMode();
    }

    currentTool = tool;

    // Update UI
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // Show/hide tool options
    document.getElementById('blurOptions').style.display = tool === 'blur' ? 'block' : 'none';
    document.getElementById('textOptions').style.display = tool === 'text' ? 'block' : 'none';

    // Update cursor
    if (tool === 'text') {
        canvas.style.cursor = 'text';
    } else if (tool === 'crop') {
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'eyedropper') {
        canvas.style.cursor = 'crosshair';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

/**
 * Mouse event handlers
 */
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;

    // Handle eyedropper tool first (immediate action)
    if (currentTool === 'eyedropper') {
        // Pick color from image
        const pixel = ctx.getImageData(Math.floor(startX), Math.floor(startY), 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]]
            .map(x => x.toString(16).padStart(2, '0')).join('');
        currentColor = hex;
        document.getElementById('colorPicker').value = hex;

        // Show feedback
        const colorPreview = document.querySelector('.color-preview');
        if (colorPreview) {
            colorPreview.style.background = hex;
        }

        // Don't start drawing
        return;
    }

    isDrawing = true;

    if (currentTool === 'pen' || currentTool === 'highlight') {
        currentPath = [{ x: startX, y: startY }];
    } else if (currentTool === 'text') {
        createTextInput(startX, startY);
        isDrawing = false;
    } else if (currentTool === 'number') {
        // Add numbered marker
        annotations.push({
            type: 'number',
            x: startX,
            y: startY,
            number: numberCounter++,
            color: currentColor
        });
        redrawCanvas();
        saveHistory();
        isDrawing = false;
    }
}

function handleMouseMove(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'pen' || currentTool === 'highlight') {
        currentPath.push({ x, y });
        redrawCanvas();
        if (currentTool === 'pen') {
            drawPath(currentPath, currentColor, lineWidth);
        } else {
            // Draw highlight path with transparency - smooth continuous stroke
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = lineWidth * 3; // Make highlight wider than pen
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    } else if (currentTool === 'crop') {
        // Show crop preview with improved visuals
        redrawCanvas();

        const cropWidth = Math.abs(x - startX);
        const cropHeight = Math.abs(y - startY);
        const cropLeft = Math.min(startX, x);
        const cropTop = Math.min(startY, y);

        // Draw semi-transparent overlay outside crop area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, cropTop); // Top
        ctx.fillRect(0, cropTop, cropLeft, cropHeight); // Left
        ctx.fillRect(cropLeft + cropWidth, cropTop, canvas.width - (cropLeft + cropWidth), cropHeight); // Right
        ctx.fillRect(0, cropTop + cropHeight, canvas.width, canvas.height - (cropTop + cropHeight)); // Bottom

        // Draw bright green border for crop area
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(cropLeft, cropTop, cropWidth, cropHeight);
        ctx.setLineDash([]);

        // Draw corner handles
        const handleSize = 8;
        ctx.fillStyle = '#00ff00';
        // Top-left
        ctx.fillRect(cropLeft - handleSize / 2, cropTop - handleSize / 2, handleSize, handleSize);
        // Top-right
        ctx.fillRect(cropLeft + cropWidth - handleSize / 2, cropTop - handleSize / 2, handleSize, handleSize);
        // Bottom-left
        ctx.fillRect(cropLeft - handleSize / 2, cropTop + cropHeight - handleSize / 2, handleSize, handleSize);
        // Bottom-right
        ctx.fillRect(cropLeft + cropWidth - handleSize / 2, cropTop + cropHeight - handleSize / 2, handleSize, handleSize);

        // Display crop dimensions
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const dimensionText = `${Math.round(cropWidth)} × ${Math.round(cropHeight)}`;
        const textX = cropLeft + cropWidth / 2;
        const textY = cropTop - 25;

        // Draw text background
        const textMetrics = ctx.measureText(dimensionText);
        const textPadding = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
            textX - textMetrics.width / 2 - textPadding,
            textY - textPadding,
            textMetrics.width + textPadding * 2,
            20
        );

        // Draw text
        ctx.fillStyle = '#00ff00';
        ctx.fillText(dimensionText, textX, textY);
    } else {
        // For shapes, show smooth preview using temporary canvas
        redrawCanvas();
        drawShape(startX, startY, x, y);
    }
}

function handleMouseUp(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'pen' && currentPath.length > 0) {
        annotations.push({
            type: 'pen',
            path: currentPath,
            color: currentColor,
            lineWidth: lineWidth
        });
        currentPath = [];
    } else if (currentTool === 'highlight' && currentPath.length > 0) {
        annotations.push({
            type: 'highlight',
            path: currentPath,
            color: currentColor,
            lineWidth: lineWidth
        });
        currentPath = [];
    } else if (currentTool === 'crop') {
        // Show crop confirmation
        const cropWidth = Math.abs(endX - startX);
        const cropHeight = Math.abs(endY - startY);

        if (cropWidth < 10 || cropHeight < 10) {
            alert('Crop area too small. Please select a larger area.');
            isDrawing = false;
            redrawCanvas();
            return;
        }

        const confirmMsg = `Crop to ${Math.round(cropWidth)} × ${Math.round(cropHeight)} pixels?\n\nThis will permanently crop the image and adjust all annotations.`;
        if (confirm(confirmMsg)) {
            applyCrop(startX, startY, endX, endY);
        } else {
            redrawCanvas();
        }
        isDrawing = false;
        return;
    } else if (currentTool !== 'text') {
        annotations.push({
            type: currentTool,
            startX, startY, endX, endY,
            color: currentColor,
            lineWidth: lineWidth,
            blurStrength: blurStrength
        });
    }

    isDrawing = false;
    saveHistory();
}

/**
 * Touch event handlers
 */
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
}

/**
 * Draw path (for pen tool)
 */
function drawPath(path, color, width) {
    if (path.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }

    ctx.stroke();
}

/**
 * Draw shape
 */
function drawShape(x1, y1, x2, y2) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    switch (currentTool) {
        case 'rectangle':
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            break;

        case 'ellipse':
            const radiusX = Math.abs(x2 - x1) / 2;
            const radiusY = Math.abs(y2 - y1) / 2;
            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
            break;

        case 'arrow':
            drawArrow(x1, y1, x2, y2);
            break;

        case 'blur':
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            break;

        case 'highlight':
            // Semi-transparent fill
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = currentColor;
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            ctx.globalAlpha = 1.0;
            break;
    }
}

/**
 * Draw arrow
 */
function drawArrow(x1, y1, x2, y2) {
    const headLength = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
}

/**
 * Create text input
 */
function createTextInput(x, y) {
    const textInput = document.getElementById('textInput');
    if (!textInput) {
        console.error('Text input element not found!');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    // Calculate display position (canvas coordinates to screen coordinates)
    const displayX = rect.left + (x * scaleX);
    const displayY = rect.top + (y * scaleY);

    // Position text input at the correct screen position
    textInput.style.display = 'block';
    textInput.style.position = 'fixed';
    textInput.style.left = displayX + 'px';
    textInput.style.top = displayY + 'px';
    textInput.style.color = currentColor;
    textInput.style.fontSize = Math.max(fontSize, 16) + 'px'; // Minimum 16px for visibility
    textInput.style.minWidth = '100px';
    textInput.style.minHeight = '30px';
    textInput.textContent = '';
    textInput.style.zIndex = '10000';

    // Force focus with a small delay
    setTimeout(() => {
        textInput.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        if (textInput.childNodes.length > 0) {
            range.setStart(textInput.childNodes[0], textInput.textContent.length);
        } else {
            range.setStart(textInput, 0);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        console.log('Text input focused at:', displayX, displayY);
    }, 50);

    // Remove old event listeners by cloning
    const newTextInput = textInput.cloneNode(true);
    textInput.parentNode.replaceChild(newTextInput, textInput);

    // Define finishText AFTER cloning so it uses the new element
    const finishText = () => {
        const text = newTextInput.textContent.trim();
        if (text) {
            annotations.push({
                type: 'text',
                x, y,
                text,
                color: currentColor,
                fontSize
            });
            redrawCanvas();
            saveHistory();
        }
        newTextInput.style.display = 'none';
        newTextInput.textContent = '';
    };

    // Add new event listeners
    newTextInput.onblur = finishText;
    newTextInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishText();
        } else if (e.key === 'Escape') {
            newTextInput.style.display = 'none';
            newTextInput.textContent = '';
        }
    };

    // Focus the new element
    setTimeout(() => {
        newTextInput.focus();
    }, 50);
}

/**
 * Redraw entire canvas
 */
function redrawCanvas() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base image
    ctx.drawImage(window.baseImage, 0, 0, canvas.width, canvas.height);

    // Draw all annotations
    annotations.forEach(annotation => {
        if (annotation.type === 'pen') {
            drawPath(annotation.path, annotation.color, annotation.lineWidth);
        } else if (annotation.type === 'highlight') {
            // Draw highlight as smooth path with transparency
            if (annotation.path && annotation.path.length > 1) {
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = annotation.color;
                ctx.lineWidth = annotation.lineWidth * 3; // Make highlight wider
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(annotation.path[0].x, annotation.path[0].y);
                for (let i = 1; i < annotation.path.length; i++) {
                    ctx.lineTo(annotation.path[i].x, annotation.path[i].y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        } else if (annotation.type === 'text') {
            ctx.fillStyle = annotation.color;
            ctx.font = `${annotation.fontSize}px Arial`;
            ctx.fillText(annotation.text, annotation.x, annotation.y);
        } else if (annotation.type === 'blur') {
            applyBlur(annotation);
        } else if (annotation.type === 'number') {
            // Draw numbered marker
            ctx.fillStyle = annotation.color;
            ctx.beginPath();
            ctx.arc(annotation.x, annotation.y, 20, 0, 2 * Math.PI);
            ctx.fill();

            // Draw number
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(annotation.number, annotation.x, annotation.y);
        } else if (annotation.type === 'rectangle') {
            // Draw rectangle
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.lineWidth;
            ctx.lineCap = 'round';
            ctx.strokeRect(annotation.startX, annotation.startY,
                annotation.endX - annotation.startX,
                annotation.endY - annotation.startY);
        } else if (annotation.type === 'ellipse') {
            // Draw ellipse
            const radiusX = Math.abs(annotation.endX - annotation.startX) / 2;
            const radiusY = Math.abs(annotation.endY - annotation.startY) / 2;
            const centerX = (annotation.startX + annotation.endX) / 2;
            const centerY = (annotation.startY + annotation.endY) / 2;
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.lineWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (annotation.type === 'arrow') {
            // Draw arrow
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.lineWidth;
            ctx.lineCap = 'round';
            drawArrow(annotation.startX, annotation.startY, annotation.endX, annotation.endY);
        }
    });
}

/**
 * Apply blur to region
 */
function applyBlur(annotation) {
    const x = Math.floor(Math.min(annotation.startX, annotation.endX));
    const y = Math.floor(Math.min(annotation.startY, annotation.endY));
    const width = Math.floor(Math.abs(annotation.endX - annotation.startX));
    const height = Math.floor(Math.abs(annotation.endY - annotation.startY));

    if (width <= 0 || height <= 0) return;

    const imageData = ctx.getImageData(x, y, width, height);

    // Use fast pixelation blur instead of box blur for better performance
    // Convert blur strength (5-30) to pixel size (5-15)
    const pixelSize = Math.max(5, Math.floor((annotation.blurStrength || blurStrength) / 2));
    const blurred = CanvasUtils.pixelateBlur(imageData, pixelSize);

    ctx.putImageData(blurred, x, y);
}

/**
 * Save to history
 */
function saveHistory() {
    // Remove any history after current step
    history = history.slice(0, historyStep + 1);

    // Save current state including canvas dimensions and base image
    history.push({
        annotations: JSON.parse(JSON.stringify(annotations)),
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        baseImageSrc: window.baseImage.src
    });

    historyStep++;

    // Limit history to 50 steps
    if (history.length > 50) {
        history.shift();
        historyStep--;
    }

    updateUndoRedoButtons();
}

/**
 * Undo
 */
function undo() {
    if (historyStep > 0) {
        historyStep--;
        const state = history[historyStep];

        // Restore annotations
        annotations = JSON.parse(JSON.stringify(state.annotations));

        // Restore canvas dimensions if they changed (e.g., after crop)
        if (state.canvasWidth && state.canvasHeight) {
            if (canvas.width !== state.canvasWidth || canvas.height !== state.canvasHeight) {
                canvas.width = state.canvasWidth;
                canvas.height = state.canvasHeight;
                tempCanvas.width = state.canvasWidth;
                tempCanvas.height = state.canvasHeight;
            }
        }

        // Restore canvas image data
        ctx.putImageData(state.imageData, 0, 0);

        // Restore base image if it changed (e.g., after crop)
        if (state.baseImageSrc && state.baseImageSrc !== window.baseImage.src) {
            const img = new Image();
            img.onload = () => {
                window.baseImage = img;
                redrawCanvas();
            };
            img.src = state.baseImageSrc;
        }

        updateUndoRedoButtons();
    }
}

/**
 * Redo
 */
function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        const state = history[historyStep];

        // Restore annotations
        annotations = JSON.parse(JSON.stringify(state.annotations));

        // Restore canvas dimensions if they changed (e.g., after crop)
        if (state.canvasWidth && state.canvasHeight) {
            if (canvas.width !== state.canvasWidth || canvas.height !== state.canvasHeight) {
                canvas.width = state.canvasWidth;
                canvas.height = state.canvasHeight;
                tempCanvas.width = state.canvasWidth;
                tempCanvas.height = state.canvasHeight;
            }
        }

        // Restore canvas image data
        ctx.putImageData(state.imageData, 0, 0);

        // Restore base image if it changed (e.g., after crop)
        if (state.baseImageSrc && state.baseImageSrc !== window.baseImage.src) {
            const img = new Image();
            img.onload = () => {
                window.baseImage = img;
                redrawCanvas();
            };
            img.src = state.baseImageSrc;
        }

        updateUndoRedoButtons();
    }
}

/**
 * Update undo/redo button states
 */
function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyStep <= 0;
    document.getElementById('redoBtn').disabled = historyStep >= history.length - 1;
}

/**
 * Clear all annotations
 */
function clearAnnotations() {
    if (!confirm('Clear all annotations?')) return;

    annotations = [];
    redrawCanvas();
    saveHistory();
}

/**
 * Download image
 */
async function downloadImage() {
    const blob = await getCanvasBlob();
    const url = URL.createObjectURL(blob);

    const filename = `screenshotify-${Date.now()}.png`;

    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    });
}

/**
 * Get canvas as blob
 */
function getCanvasBlob() {
    return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
    });
}

/**
 * Show share modal
 */
function showShareModal() {
    document.getElementById('shareModal').style.display = 'flex';
}

/**
 * Hide share modal
 */
function hideShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

/**
 * Copy image to clipboard
 */
async function copyImageToClipboard() {
    try {
        const blob = await getCanvasBlob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        alert('Image copied to clipboard!');
        hideShareModal();
    } catch (error) {
        console.error('Failed to copy image:', error);
        alert('Failed to copy image. Try downloading instead.');
    }
}

/**
 * Copy data URL
 */
async function copyDataUrl() {
    const dataUrl = canvas.toDataURL('image/png');
    await navigator.clipboard.writeText(dataUrl);
    alert('Data URL copied to clipboard!');
    hideShareModal();
}

/**
 * Native share
 */
async function nativeShare() {
    try {
        const blob = await getCanvasBlob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        await navigator.share({
            title: 'Screenshotify',
            text: 'Check out this screenshot',
            files: [file]
        });

        hideShareModal();
    } catch (error) {
        console.error('Share failed:', error);
    }
}

/**
 * Upload to Imgur
 */
async function uploadToImgur() {
    try {
        const blob = await getCanvasBlob();
        const url = await ShareManager.uploadToImgur(blob);

        await navigator.clipboard.writeText(url);
        alert('Uploaded to Imgur! Link copied to clipboard:\n' + url);
        hideShareModal();
    } catch (error) {
        console.error('Imgur upload failed:', error);
        alert('Failed to upload to Imgur: ' + error.message);
    }
}

/**
 * Show welcome modal
 */
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.style.display = 'flex';
}

/**
 * Close welcome modal
 */
async function closeWelcomeModal() {
    const dontShow = document.getElementById('dontShowAgain')?.checked;
    if (dontShow) {
        await chrome.storage.local.set({ hideWelcome: true });
    }
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Zoom In
 */
function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.25, 5.0);
    applyZoom();
}

/**
 * Zoom Out
 */
function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.25, 0.25);
    applyZoom();
}

/**
 * Reset Zoom
 */
function zoomReset() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    applyZoom();
}

/**
 * Apply Zoom
 */
function applyZoom() {
    const container = canvas.parentElement;
    canvas.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;

    // Update zoom level display if it exists
    const zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
    }
}

/**
 * Handle Mouse Wheel for Zoom
 */
function handleWheel(e) {
    if (e.ctrlKey) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.25, Math.min(5.0, zoomLevel + delta));
        applyZoom();
    }
}

/**
 * Toggle Crop Mode
 */
function toggleCropMode() {
    if (cropMode) {
        exitCropMode();
    } else {
        cropMode = true;
        setTool('crop');
        canvas.style.cursor = 'crosshair';
    }
}

/**
 * Apply Crop
 */
function applyCrop(x1, y1, x2, y2) {
    // Normalize coordinates
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Create new cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');

    // Draw cropped portion
    croppedCtx.drawImage(canvas, left, top, width, height, 0, 0, width, height);

    // Update canvas size
    canvas.width = width;
    canvas.height = height;

    // Update temp canvas size
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw cropped image
    ctx.drawImage(croppedCanvas, 0, 0);

    // Create new base image from cropped canvas
    const croppedImage = new Image();
    croppedImage.onload = () => {
        window.baseImage = croppedImage;

        // Clear annotations that are outside the crop area
        annotations = annotations.filter(annotation => {
            if (annotation.type === 'pen' || annotation.type === 'highlight') {
                // Adjust path coordinates
                annotation.path = annotation.path.map(p => ({
                    x: p.x - left,
                    y: p.y - top
                })).filter(p => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);
                return annotation.path.length > 0;
            } else if (annotation.type === 'text' || annotation.type === 'number') {
                // Adjust point coordinates
                annotation.x -= left;
                annotation.y -= top;
                return annotation.x >= 0 && annotation.x < width && annotation.y >= 0 && annotation.y < height;
            } else {
                // Adjust rectangle coordinates
                annotation.startX -= left;
                annotation.startY -= top;
                annotation.endX -= left;
                annotation.endY -= top;
                return annotation.startX < width && annotation.endX > 0 &&
                    annotation.startY < height && annotation.endY > 0;
            }
        });

        redrawCanvas();
        saveHistory();
        exitCropMode();
    };
    croppedImage.src = croppedCanvas.toDataURL();
}

/**
 * Exit Crop Mode
 */
function exitCropMode() {
    cropMode = false;
    cropRect = null;
    if (currentTool === 'crop') {
        setTool('pen');
    }
}
