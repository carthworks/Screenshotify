# Screenshotify - Chrome Extension Packaging Script
# This script creates a clean ZIP file for Chrome Web Store submission

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Screenshotify - Extension Packager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set paths
$projectRoot = "C:\Users\tkart\Dev\products\Screenshotify"
$outputZip = "$projectRoot\Screenshotify-v1.0.0.zip"

# Check if we're in the right directory
if (-not (Test-Path "$projectRoot\manifest.json")) {
    Write-Host "❌ Error: manifest.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Screenshotify directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Project Directory: $projectRoot" -ForegroundColor Green
Write-Host ""

# Remove old ZIP if exists
if (Test-Path $outputZip) {
    Write-Host "🗑️  Removing old ZIP file..." -ForegroundColor Yellow
    Remove-Item $outputZip -Force
}

# Create list of files to include
Write-Host "📦 Packaging extension..." -ForegroundColor Cyan
Write-Host ""

# Files and folders to include
$itemsToInclude = @(
    "manifest.json",
    "src"
)

# Create ZIP file
try {
    Compress-Archive -Path $itemsToInclude -DestinationPath $outputZip -Force
    
    Write-Host "✅ Success! Extension packaged successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Output: $outputZip" -ForegroundColor Cyan
    
    # Get file size
    $fileSize = (Get-Item $outputZip).Length / 1KB
    Write-Host "📊 Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
    Write-Host ""
    
    # Show what's included
    Write-Host "📋 Package Contents:" -ForegroundColor Yellow
    Write-Host "  ✓ manifest.json" -ForegroundColor Green
    Write-Host "  ✓ src/annotate/" -ForegroundColor Green
    Write-Host "  ✓ src/background/" -ForegroundColor Green
    Write-Host "  ✓ src/popup/" -ForegroundColor Green
    Write-Host "  ✓ src/options/" -ForegroundColor Green
    Write-Host "  ✓ src/icons/" -ForegroundColor Green
    Write-Host "  ✓ src/lib/" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🎉 Ready for Chrome Web Store submission!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://chrome.google.com/webstore/devconsole" -ForegroundColor White
    Write-Host "  2. Click 'New Item'" -ForegroundColor White
    Write-Host "  3. Upload: $outputZip" -ForegroundColor White
    Write-Host "  4. Fill in store listing details" -ForegroundColor White
    Write-Host "  5. Submit for review" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Error creating ZIP file: $_" -ForegroundColor Red
    exit 1
}

# Optional: Open the folder containing the ZIP
$openFolder = Read-Host "Open folder containing ZIP? (Y/N)"
if ($openFolder -eq "Y" -or $openFolder -eq "y") {
    explorer.exe "/select,$outputZip"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Packaging Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
