/**
 * KARTSEEK — Replace Hardcoded Currency Symbols in Dart
 * ────────────────────────────────────────────────────────────────────────
 * Replaces hardcoded ₹ (Rupee) symbols with dynamic currency symbols
 * from RegionService, enabling multi-country currency support.
 *
 * Location: scripts/mobile/replace_hardcoded_currency.js
 * Run from: apps/mobile/
 *   node ../../scripts/mobile/replace_hardcoded_currency.js
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const libDir = path.resolve(__dirname, '..', '..', 'apps', 'mobile', 'lib');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.dart')) results.push(file);
        }
    });
    return results;
}

const files = walk(libDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove const keyword from Text widgets that contain the Rupee symbol
    content = content.replace(/const\s+Text\(([^)]*?['"]([^'"]*)₹([^'"]*)['""][^)]*)\)/g, "Text($1)");

    // Replace the Rupee symbol with the dynamic currency interpolation
    content = content.replace(/['"](.*?)₹(.*?)['"]/g, (match, p1, p2) => {
        if (match.startsWith("'") && match.endsWith("'")) {
            return `'${p1}\${RegionService.instance.currentCountry.currencySymbol} ${p2}'`;
        } else if (match.startsWith('"') && match.endsWith('"')) {
            return `"${p1}\${RegionService.instance.currentCountry.currencySymbol} ${p2}"`;
        }
        return match;
    });

    // Auto-add import for RegionService if we made changes
    if (content !== original) {
        if (!content.includes('region_service.dart')) {
            const importMatch = content.match(/^import\s+.*?;/gm);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, `${lastImport}\nimport 'package:kartseek_mobile/core/services/region_service.dart';`);
            } else {
                content = `import 'package:kartseek_mobile/core/services/region_service.dart';\n${content}`;
            }
        }
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated: " + file);
    }
});
