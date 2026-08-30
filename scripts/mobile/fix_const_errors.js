/**
 * KARTSEEK — Fix Dart const Compilation Errors
 * ────────────────────────────────────────────────────────────────────────
 * Runs `flutter analyze` and automatically removes invalid `const` keywords
 * that cause compilation failures (e.g., when a RegionService runtime value
 * is used inside a const context).
 *
 * Location: scripts/mobile/fix_const_errors.js
 * Run from: apps/mobile/
 *   node ../../scripts/mobile/fix_const_errors.js
 * ────────────────────────────────────────────────────────────────────────
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log("Running flutter analyze...");
let output = "";
try {
    output = execSync('flutter analyze', { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
    output = error.stdout || error.stderr || "";
}

const lines = output.split('\n');
const filesToModify = {}; // filePath -> set of line numbers

// Regex to extract file and line number from analyzer output
const locationRegex = /([a-zA-Z0-9_\\\\/\.]+)\:(\d+)\:(\d+)/;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
        line.includes('invalid_constant') ||
        line.includes('non_constant_list_element') ||
        line.includes('non_constant_map_value') ||
        line.includes('const_initialized_with_non_constant_value')
    ) {
        const prevLine = lines[i-1] ? lines[i-1].trim() : '';
        const match = prevLine.match(locationRegex) || line.match(locationRegex);
        if (match) {
            let file = match[1];
            let lineNumber = parseInt(match[2], 10);
            if (!filesToModify[file]) filesToModify[file] = new Set();
            filesToModify[file].add(lineNumber);

            // Also add nearby lines in case the const is on a preceding line
            for (let offset = 1; offset <= 5; offset++) {
                filesToModify[file].add(lineNumber - offset);
            }
        }
    }
}

for (const [file, lineNumbers] of Object.entries(filesToModify)) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let contentLines = content.split('\n');
    let modified = false;

    for (const lineNum of lineNumbers) {
        const idx = lineNum - 1;
        if (idx >= 0 && idx < contentLines.length) {
            if (contentLines[idx].includes('const ')) {
                contentLines[idx] = contentLines[idx].replace(/\bconst\b\s+/g, '');
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(file, contentLines.join('\n'), 'utf8');
        console.log(`Removed const in: ${file}`);
    }
}
console.log("Done fixing const errors. Please run flutter analyze again to verify.");
