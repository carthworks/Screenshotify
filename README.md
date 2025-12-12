# Screenshotify

> Lightweight Screenshot + Annotate + OCR Chrome Extension

A fast, private, offline-first Chrome extension that captures screenshots, lets you annotate and blur sensitive areas, and runs OCR locally to extract text.

## ✨ Features

- 📸 **Quick Screenshot Capture** - Capture visible tab with one click or keyboard shortcut
- 🎨 **Rich Annotation Tools** - Pen, rectangle, ellipse, arrow, text, blur, and crop
- 🔒 **Privacy-First Blur** - Pixelate sensitive information before sharing
- 📝 **Local OCR** - Extract text from images using Tesseract.js (runs in browser)
- 💾 **History Management** - Keep track of your last 5 captures
- 🌓 **Dark Mode** - Automatic theme matching
- ⌨️ **Keyboard Shortcuts** - Fast workflow with customizable shortcuts
- 🔐 **100% Private** - All processing happens locally (no uploads unless you configure them)

## 🚀 Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `Screenshotify` directory

### From Chrome Web Store

*Coming soon...*

## 📖 Usage

### Quick Capture

1. Click the Screenshotify icon in your toolbar
2. Click "Quick Capture" or press `Ctrl+Shift+S`
3. The screenshot will open in the annotation window

### Annotation Tools

- **Pen** (P) - Freehand drawing
- **Rectangle** - Draw rectangular shapes
- **Ellipse** - Draw circular/oval shapes
- **Arrow** - Point to important areas
- **Text** - Add text labels
- **Blur** - Pixelate sensitive information
- **Crop** - Trim the image

### OCR (Text Extraction)

1. After capturing a screenshot, click the "OCR" button
2. Wait for processing (progress shown)
3. Extracted text appears in the right panel
4. Click "Copy Text" to copy to clipboard

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Capture Screenshot | `Ctrl+Shift+S` |
| Toggle Pen Tool | `P` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Y` |
| Copy OCR Text | `Ctrl+Shift+C` |

*Customize shortcuts at `chrome://extensions/shortcuts`*

## ⚙️ Settings

Access settings by clicking the gear icon in the popup or right-clicking the extension icon.

### General Settings

- **Image Format** - PNG (lossless) or JPEG (smaller)
- **JPEG Quality** - Compression level for JPEG
- **Blur Strength** - Default blur intensity
- **Auto-downscale** - Resize large images for performance

### OCR Settings

- **Language** - Select OCR language (English, Spanish, French, etc.)
- **Preprocessing** - Enhance images for better text recognition

### Upload Services (Optional)

By default, everything is local. Optionally configure:

- **Imgur** - Get a Client ID from [Imgur API](https://api.imgur.com/oauth2/addclient)
- **GitHub Gist** - Create a token at [GitHub Settings](https://github.com/settings/tokens) with `gist` scope

## 🔒 Privacy & Security

- ✅ **All processing happens locally** in your browser
- ✅ **No data sent to external servers** by default
- ✅ **No tracking or analytics**
- ✅ **Uploads only when you explicitly configure API keys** and use upload features
- ✅ **Open source** - inspect the code yourself

## 🛠️ Development

### Project Structure

```
Screenshotify/
├── manifest.json           # Extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── service_worker.js   # Background service worker
│   ├── popup/
│   │   ├── popup.html          # Extension popup
│   │   ├── popup.css
│   │   └── popup.js
│   ├── annotate/
│   │   ├── annotate.html       # Annotation interface
│   │   ├── annotate.css
│   │   └── annotate.js
│   ├── options/
│   │   ├── options.html        # Settings page
│   │   ├── options.css
│   │   └── options.js
│   ├── lib/
│   │   ├── canvas-utils.js     # Canvas operations & blur
│   │   ├── ocr.js              # Tesseract wrapper
│   │   └── share.js            # Share/upload utilities
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── package.json
└── README.md
```

### Building for Production

```bash
npm install
npm run build
```

This creates a `screenshotify.zip` file ready for Chrome Web Store submission.

### Testing

Load the extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory

## 📋 Chrome Web Store Submission

### Requirements

- ✅ Manifest V3
- ✅ Privacy policy (included in options page)
- ✅ Detailed description
- ✅ Screenshots (5 required, 1280x800px)
- ✅ Icon (128x128px)

### Checklist

1. Update version in `manifest.json`
2. Run `npm run build` to create zip
3. Create promotional images (1280x800px screenshots)
4. Write store description
5. Submit to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR engine
- Chrome Extension APIs
- All contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/screenshotify/issues)
- **Email**: your.email@example.com

## 🗺️ Roadmap

- [ ] Full-page screenshot capture
- [ ] Video recording
- [ ] Cloud sync (optional)
- [ ] More annotation shapes
- [ ] Batch OCR processing
- [ ] Export to PDF

---

Made with ❤️ for productivity and privacy
