/**
 * KARTSEEK — Fix Static Declaration Errors in Dart
 * ────────────────────────────────────────────────────────────────────────
 * Converts static const/final arrays containing RegionService runtime
 * values to instance getters so the Dart compiler can handle them.
 *
 * Location: scripts/mobile/fix_static_declarations.js
 * Run from: apps/mobile/
 *   node ../../scripts/mobile/fix_static_declarations.js
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

// Use current working directory or resolve relative to script location
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

    // Convert static const/final arrays with RegionService to instance getters
    content = content.replace(/static\s+const\s+(\w+)\s*=\s*\[/g, (match, name) => {
        const startIdx = content.indexOf(match);
        let endIdx = content.indexOf('];', startIdx);
        if (endIdx === -1) endIdx = content.indexOf(']', startIdx);

        if (endIdx !== -1) {
            const block = content.substring(startIdx, endIdx);
            if (block.includes('RegionService')) {
                return `get ${name} => [`;
            }
        }
        return match;
    });

    // Fix `static _sizes = [` that lost const
    content = content.replace(/static\s+(\w+)\s*=\s*\[/g, (match, name) => {
        const startIdx = content.indexOf(match);
        let endIdx = content.indexOf('];', startIdx);
        if (endIdx === -1) endIdx = content.indexOf(']', startIdx);

        if (endIdx !== -1) {
            const block = content.substring(startIdx, endIdx);
            if (block.includes('RegionService')) {
                return `get ${name} => [`;
            }
        }
        return match;
    });

    // Remove const from widgets that contain RegionService in their subtree
    content = content.replace(/const\s+(Row|Column|Container|Padding|Text|Expanded|Center|SizedBox|Stack|Positioned)\(/g, (match, widget) => {
        const startIdx = content.indexOf(match);
        const lookahead = content.substring(startIdx, startIdx + 1000);
        if (lookahead.includes('RegionService') && !lookahead.includes(';')) {
            return `${widget}(`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Fixed statics in: " + file);
    }
});
console.log("Done fixing statics.");
