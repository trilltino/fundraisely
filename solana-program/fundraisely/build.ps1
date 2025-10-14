# Fundraisely Build Script
# Run this in PowerShell (as Administrator if needed)

Write-Host "🚀 Fundraisely Solana Build Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:HOME = "C:\Users\isich"
$env:USERPROFILE = "C:\Users\isich"
$env:SBF_SDK_PATH = "C:\Users\isich\.cargo\bin\sdk\sbf"

Write-Host "✅ Environment variables set:" -ForegroundColor Green
Write-Host "   HOME = $env:HOME"
Write-Host "   SBF_SDK_PATH = $env:SBF_SDK_PATH"
Write-Host ""

Write-Host "🔨 Building Anchor program..." -ForegroundColor Yellow
Write-Host ""

# Build
anchor build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Generated files:" -ForegroundColor Cyan
    Write-Host "   - target/deploy/fundraisely.so (compiled program)"
    Write-Host "   - target/idl/fundraisely.json (interface definition)"
    Write-Host "   - target/types/fundraisely.ts (TypeScript types)"
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Deploy to devnet: anchor deploy --provider.cluster devnet"
    Write-Host "   2. Sync program ID: anchor keys sync"
    Write-Host "   3. Test: anchor test --skip-build"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build failed. Check errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Common fixes:" -ForegroundColor Yellow
    Write-Host "   1. Make sure you're running as Administrator"
    Write-Host "   2. Check that Rust and Anchor are up to date"
    Write-Host "   3. Try: cargo clean && anchor build"
    Write-Host ""
}
