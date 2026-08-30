/**
 * KARTSEEK — Fix Undeclared Variable Errors in Dart
 * ────────────────────────────────────────────────────────────────────────
 * Repairs variables that lost their `final` keyword when the const-removal
 * scripts accidentally stripped variable declarations.
 *
 * Location: scripts/mobile/fix_undeclared_variables.js
 * Run from: apps/mobile/
 *   node ../../scripts/mobile/fix_undeclared_variables.js
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

    // Match lines like: `    otc = [` -> `    final otc = [`
    content = content.replace(/^(\s*)([a-zA-Z0-9_]+)\s*=\s*\[/gm, (match, spaces, name) => {
        // Only fix known variable names that were broken by const-removal
        if (name === "otc" || name === "rxMeds" || name === "banners" || name === "categories" || name === "stores" || name === "items" || name === "products") {
            return `${spaces}final ${name} = [`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Fixed undeclared variables in: " + file);
    }
});
console.log("Done fixing variables.");
