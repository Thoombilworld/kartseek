# ─────────────────────────────────────────────────────────────────────────────
# KARTSEEK Partner App — Build & Run Script
# ─────────────────────────────────────────────────────────────────────────────
# Application ID:   com.kartseek.partner (Android) / com.kartseek.partner (iOS)
# Entry Point:      lib/main_partner.dart
# App Name:         KARTSEEK Partner
# Primary Color:    Burnt Orange (#E65100)
# Roles:            Taxi Driver + Delivery Partner (unified)
# ─────────────────────────────────────────────────────────────────────────────
# Location: scripts/mobile/run_partner_app.ps1
# Run from monorepo root:
#   .\scripts\mobile\run_partner_app.ps1           → Run on connected device
#   .\scripts\mobile\run_partner_app.ps1 -build    → Build release APK
#   .\scripts\mobile\run_partner_app.ps1 -ios      → Build release IPA (macOS only)
# ─────────────────────────────────────────────────────────────────────────────

param(
    [switch]$build,
    [switch]$ios
)

$ErrorActionPreference = "Stop"
$projectDir = Join-Path $PSScriptRoot "..\..\apps\mobile"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor DarkYellow
Write-Host "║    KARTSEEK — Partner App (Taxi + Delivery) Android/iOS    ║" -ForegroundColor DarkYellow
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor DarkYellow
Write-Host "║  App ID:   com.kartseek.partner                           ║" -ForegroundColor DarkYellow
Write-Host "║  Entry:    lib/main_partner.dart                           ║" -ForegroundColor DarkYellow
Write-Host "║  Roles:    Taxi Driver + Delivery Partner                  ║" -ForegroundColor DarkYellow
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor DarkYellow
Write-Host ""

Push-Location $projectDir

try {
    Write-Host "[1/3] Resolving dependencies..." -ForegroundColor Cyan
    flutter pub get

    if ($build) {
        Write-Host ""
        Write-Host "[2/3] Building Partner APK (Release)..." -ForegroundColor Cyan
        flutter build apk --flavor partner -t lib/main_partner.dart --release
        Write-Host ""
        Write-Host "[3/3] APK built successfully!" -ForegroundColor Green
        Write-Host "  → build/app/outputs/flutter-apk/app-partner-release.apk" -ForegroundColor Yellow
    } elseif ($ios) {
        Write-Host ""
        Write-Host "[2/3] Building Partner IPA (Release)..." -ForegroundColor Cyan
        flutter build ios --flavor partner -t lib/main_partner.dart --release
        Write-Host ""
        Write-Host "[3/3] iOS build completed!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[2/3] Launching Partner App on device..." -ForegroundColor Cyan
        flutter run --flavor partner -t lib/main_partner.dart
    }
} finally {
    Pop-Location
}
