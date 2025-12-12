/**
 * Build script for packaging the extension
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const OUTPUT_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'screenshotify.zip');

// Files and directories to include
const INCLUDE = [
    'manifest.json',
    'src/',
    'README.md'
];

// Files and directories to exclude
const EXCLUDE = [
    '.git',
    '.gitignore',
    'node_modules',
    'scripts',
    'package.json',
    'package-lock.json',
    'dist',
    '.DS_Store',
    'Thumbs.db'
];

async function build() {
    console.log('🔨 Building Screenshotify extension...\n');

    // Create dist directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Remove old zip if exists
    if (fs.existsSync(OUTPUT_FILE)) {
        fs.unlinkSync(OUTPUT_FILE);
        console.log('🗑️  Removed old build');
    }

    // Create zip archive
    const output = fs.createWriteStream(OUTPUT_FILE);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
        const size = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`\n✅ Build complete!`);
        console.log(`📦 Package: ${OUTPUT_FILE}`);
        console.log(`📊 Size: ${size} MB`);
        console.log(`\n🚀 Ready for Chrome Web Store submission!`);
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn('⚠️  Warning:', err);
        } else {
            throw err;
        }
    });

    archive.pipe(output);

    // Add files
    console.log('📁 Adding files...');

    INCLUDE.forEach(item => {
        const itemPath = path.join(__dirname, '..', item);

        if (fs.existsSync(itemPath)) {
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                archive.directory(itemPath, item.replace(/\/$/, ''));
                console.log(`   ✓ ${item}`);
            } else {
                archive.file(itemPath, { name: item });
                console.log(`   ✓ ${item}`);
            }
        }
    });

    await archive.finalize();
}

// Run build
build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
