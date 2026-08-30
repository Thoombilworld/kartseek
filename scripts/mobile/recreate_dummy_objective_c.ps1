# KARTSEEK - Recreate dummy_objective_c from the real pub cache package
# This copies the REAL package and only removes the native build hook.
# Run from monorepo root.

$ErrorActionPreference = "Stop"
$root = "c:\KARTSEEKAPP"
$pubCache = "$env:LOCALAPPDATA\Pub\Cache\hosted\pub.dev"
$pkgName = "objective_c-9.4.1"
$source = "$pubCache\$pkgName"
$dest = "$root\dummy_objective_c"

if (!(Test-Path $source)) {
    Write-Host "ERROR: Package not found at $source" -ForegroundColor Red
    Write-Host "Run 'flutter pub get' in apps\mobile first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Copying $pkgName from pub cache..." -ForegroundColor Cyan
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Copy-Item -Path $source -Destination $dest -Recurse -Force

Write-Host "Disabling native build hook in pubspec.yaml..." -ForegroundColor Cyan
$pubspec = "$dest\pubspec.yaml"
$content = Get-Content $pubspec -Raw
$content = $content -replace "(?m)^hooks:.*$", "# hooks: (disabled for Windows space-in-path bug)"
$content = $content -replace "(?m)^\s+build:.*build\.dart.*$", "# build: hook/build.dart (disabled)"
Set-Content $pubspec $content -NoNewline

Write-Host "Done! dummy_objective_c is ready." -ForegroundColor Green
