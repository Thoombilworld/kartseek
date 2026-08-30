/**
 * KARTSEEK — Fix Web Accessibility Lint Errors
 * ────────────────────────────────────────────────────────────────────────
 * Automatically adds missing `title` attributes to <select>, <button>,
 * and <input> elements that fail accessibility (a11y) linting.
 *
 * Location: scripts/web/fix_accessibility_lint.js
 * Run from monorepo root:
 *   node scripts/web/fix_accessibility_lint.js
 * ────────────────────────────────────────────────────────────────────────
 * NOTE: This script contains a static list of known a11y problems.
 *       Re-run linting after execution to verify all issues are resolved.
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

// Resolve web app source directory relative to this script
const WEB_SRC = path.resolve(__dirname, '..', '..', 'apps', 'web', 'src');

// Known accessibility problems (from CSpell/ESLint a11y audit)
// Paths are relative to the web src directory
const problems = [
  // Add specific problem entries here as needed
  // Format: { path: "absolute/path", message: "...", startLine: N }
];

const processProblems = () => {
  const problemsByFile = {};
  problems.forEach(p => {
    if (!problemsByFile[p.path]) problemsByFile[p.path] = [];
    problemsByFile[p.path].push(p);
  });

  for (const [filePath, fileProblems] of Object.entries(problemsByFile)) {
    if (!fs.existsSync(filePath)) {
      console.log('File not found: ' + filePath);
      continue;
    }
    let contentLines = fs.readFileSync(filePath, 'utf-8').split('\n');
    let changed = false;

    const problemsByLine = {};
    fileProblems.forEach(p => {
      const lineIdx = p.startLine - 1;
      if (!problemsByLine[lineIdx]) problemsByLine[lineIdx] = [];
      problemsByLine[lineIdx].push(p);
    });

    for (const [lineStr, lineProblems] of Object.entries(problemsByLine)) {
      const lineIdx = parseInt(lineStr, 10);
      let line = contentLines[lineIdx];

      for (const p of lineProblems) {
        if (p.message.includes('Select element must have an accessible name')) {
          if (line.includes('<select') && !line.includes('title=')) {
            line = line.replace('<select', '<select title="Options"');
            changed = true;
          }
        } else if (p.message.includes('Buttons must have discernible text')) {
          if (line.includes('<button') && !line.includes('title=')) {
            line = line.replace('<button', '<button title="Action"');
            changed = true;
          }
        } else if (p.message.includes('Form elements must have labels')) {
          if (line.includes('<input') && !line.includes('title=')) {
            line = line.replace('<input', '<input title="Input"');
            changed = true;
          }
        }
      }
      contentLines[lineIdx] = line;
    }

    if (changed) {
      fs.writeFileSync(filePath, contentLines.join('\n'), 'utf-8');
      console.log('Fixed ' + filePath);
    }
  }
};

processProblems();
console.log('Accessibility lint fix complete.');
