# ─────────────────────────────────────────────────────────────────────────────
# KARTSEEK Customer App — Build & Run Script
# ─────────────────────────────────────────────────────────────────────────────
# Entry Point: lib/main_customer.dart
# ─────────────────────────────────────────────────────────────────────────────
# Location: scripts/mobile/run_customer_app.ps1
# Run from monorepo root:
#   powershell -ExecutionPolicy Bypass -File scripts\mobile\run_customer_app.ps1
# ─────────────────────────────────────────────────────────────────────────────

$projectDir = Join-Path $PSScriptRoot "..\..\apps\mobile"
Push-Location $projectDir

Write-Output "Cleaning Flutter build cache to remove corrupted files..."
flutter clean
flutter pub get
Write-Output "Starting KARTSEEK Customer App..."
flutter run -t lib/main_customer.dart

Pop-Location
