import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractLinks, resolveTarget, checkTree } from './check-links.mjs';

test('extractLinks finds inline links and skips URLs, anchors and mailto', () => {
  const md = [
    'See [setup](guides/local-setup.md) and [arch](../ARCHITECTURE.md#data).',
    'Not these: [web](https://example.com), [anchor](#here), [mail](mailto:a@b.c).',
    'Image: ![diagram](img/flow.png)',
    'Code: `[not](a-link.md)`',
  ].join('\n');
  assert.deepEqual(extractLinks(md), [
    { line: 1, target: 'guides/local-setup.md' },
    { line: 1, target: '../ARCHITECTURE.md' },
    { line: 3, target: 'img/flow.png' },
  ]);
});

test('resolveTarget returns the path when it exists and null when it does not', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.mkdirSync(path.join(root, 'docs/guides'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/guides/a.md'), '');
  const from = path.join(root, 'docs/README.md');
  assert.equal(resolveTarget(from, 'guides/a.md', root), path.join(root, 'docs/guides/a.md'));
  assert.equal(resolveTarget(from, 'guides/missing.md', root), null);
  assert.equal(resolveTarget(from, 'guides/', root), path.join(root, 'docs/guides'));
});

test('checkTree reports every broken link with file and line', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.writeFileSync(path.join(root, 'ok.md'), '');
  fs.writeFileSync(path.join(root, 'index.md'), '[a](ok.md)\n\n[b](nope.md)\n');
  const broken = checkTree(root, ['index.md', 'ok.md']);
  assert.deepEqual(broken, [{ file: 'index.md', line: 3, target: 'nope.md' }]);
});
