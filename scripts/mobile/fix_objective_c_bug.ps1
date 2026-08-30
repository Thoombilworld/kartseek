# ─────────────────────────────────────────────────────────────────────────────
# KARTSEEK — Dart Compiler Bug Workaround (objective_c package)
# ─────────────────────────────────────────────────────────────────────────────
# Creates a local dummy copy of the objective_c package with the native
# build hook disabled to prevent crashes on Windows development machines.
#
# Location: scripts/mobile/fix_objective_c_bug.ps1
# Run from monorepo root:
#   powershell -ExecutionPolicy Bypass -File scripts\mobile\fix_objective_c_bug.ps1
# ─────────────────────────────────────────────────────────────────────────────

$pubCachePath = "$env:LOCALAPPDATA\Pub\Cache\hosted\pub.dev\objective_c-9.4.1"
$dummyPath = Join-Path $PSScriptRoot "..\..\dummy_objective_c"
$appPubspec = Join-Path $PSScriptRoot "..\..\apps\mobile\pubspec.yaml"

Write-Host "Copying objective_c package to local dummy..."
if (Test-Path $dummyPath) { Remove-Item -Recurse -Force $dummyPath }
Copy-Item -Path $pubCachePath -Destination $dummyPath -Recurse -Force

Write-Host "Removing the native assets hook that crashes on Windows..."
$dummyPubspec = "$dummyPath\pubspec.yaml"
$content = Get-Content $dummyPubspec -Raw
$newContent = $content -replace "hook:", "#hook:"
Set-Content $dummyPubspec $newContent

Write-Host "Patching the main app pubspec.yaml to use the dummy package..."
$appContent = Get-Content $appPubspec -Raw
if ($appContent -notmatch "dependency_overrides:") {
    $appContent += "`ndependency_overrides:`n  objective_c:`n    path: ../../dummy_objective_c`n"
} elseif ($appContent -notmatch "objective_c:") {
    $appContent += "  objective_c:`n    path: ../../dummy_objective_c`n"
}
Set-Content $appPubspec $appContent

Write-Host "Done! You can now run the app."
