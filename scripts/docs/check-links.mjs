#!/usr/bin/env node
/**
 * Relative-link checker for every tracked Markdown file.
 *
 *   node scripts/docs/check-links.mjs          # whole repository
 *   node scripts/docs/check-links.mjs docs/    # one subtree
 *
 * Exit 1 and print `file:line → target` for every relative link whose target
 * does not exist. Absolute URLs, `#anchors` and `mailto:` are skipped; anchors
 * on relative links (`file.md#section`) are stripped before resolving.
 * Historical folders are checked too: a broken link is broken wherever it is.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function extractLinks(markdown) {
  const out = [];
  let inFence = false;
  markdown.split('\n').forEach((raw, i) => {
    if (/^\s*```/.test(raw)) { inFence = !inFence; return; }
    if (inFence) return;
    const line = raw.replace(/`[^`]*`/g, '');   // drop inline code
    for (const m of line.matchAll(LINK)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      out.push({ line: i + 1, target: target.replace(/#.*$/, '') });
    }
  });
  return out;
}

export function resolveTarget(fromFile, target, root) {
  const abs = target.startsWith('/')
    ? path.join(root, target)
    : path.resolve(path.dirname(fromFile), decodeURIComponent(target));
  return fs.existsSync(abs) ? path.normalize(abs).replace(/[\\/]+$/, '') : null;
}

export function checkTree(root, files) {
  const broken = [];
  for (const rel of files) {
    const file = path.join(root, rel);
    for (const { line, target } of extractLinks(fs.readFileSync(file, 'utf8'))) {
      if (!target) continue;
      if (resolveTarget(file, target, root) === null) broken.push({ file: rel, line, target });
    }
  }
  return broken;
}

function trackedMarkdown(root, subtree) {
  const args = ['ls-files', '--', ...(subtree ? [subtree] : []), '*.md', '**/*.md'];
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.includes('node_modules/'));
}

const thisFile = path.resolve(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked && invoked.toLowerCase() === thisFile.toLowerCase()) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const files = trackedMarkdown(root, process.argv[2]);
  const broken = checkTree(root, files);
  for (const b of broken) console.error(`${b.file}:${b.line} → ${b.target}`);
  console.log(`${files.length} files, ${broken.length} broken link(s)`);
  process.exit(broken.length ? 1 : 0);
}
