import * as fs from 'fs';
import * as path from 'path';

/**
 * Keyboard access regression.
 *
 * Two defects were swept out of this app and both are easy to reintroduce,
 * because the broken form is shorter than the correct one:
 *
 *  1. `<div onClick={…}>` / `<tr onClick={…}>` with no `tabIndex` and no key
 *     handler. 114 of these existed — selectable cards in the admin console,
 *     expandable rows in the seller tables — and none of them could be reached
 *     or fired without a mouse.
 *
 *  2. A modal backdrop that closes on click and on nothing else. 118 of these
 *     existed; only 8 files handled Escape, so a keyboard user who opened a
 *     dialog was stuck in it.
 *
 * This walks the JSX and fails on either. It parses opening tags brace-aware
 * rather than by line, because `<div className="…">{xs.map(x => <button
 * onClick={…}>)}` otherwise reads as a div with a click handler — an earlier
 * pass over this codebase reported 196 sites when the real number was 114.
 */

const SRC = path.join(__dirname, '..');
const NON_INTERACTIVE = /^(div|span|li|td|tr|img|section|article|header|footer|figure|p|h[1-6]|ul|ol|nav|label)$/;

/** The opening tag starting at `i`, or null. Quote- and brace-aware. */
function readOpenTag(src: string, i: number): string | null {
  let depth = 0;
  let inStr: string | null = null;
  for (let k = i + 1; k < src.length; k++) {
    const c = src[k];
    if (inStr) {
      if (c === inStr && src[k - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth === 0) {
      if (c === '>') return src.slice(i, k + 1);
      if (c === '<') return null;
    }
  }
  return null;
}

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tsxFiles(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

interface Site { file: string; line: number; tag: string; snippet: string }

function scan() {
  const unreachable: Site[] = [];
  const pointerOnlyModals: Site[] = [];

  for (const file of tsxFiles(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    if (rel === 'components/shared/dismiss-on-escape.tsx') continue;

    const re = /<([a-z][a-z0-9]*)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const tagName = m[1];
      if (!NON_INTERACTIVE.test(tagName)) continue;
      const tag = readOpenTag(src, m.index);
      if (!tag || !/\bonClick=/.test(tag)) continue;

      const line = src.slice(0, m.index).split('\n').length;
      const site: Site = { file: rel, line, tag: tagName, snippet: tag.replace(/\s+/g, ' ').slice(0, 110) };

      const isBackdrop = /(fixed|absolute)\s+inset-0/.test(tag);
      // A panel guarding against its backdrop's handler is not a control.
      const isStopProp = /onClick=\{\s*\(?\s*e\s*\)?\s*=>\s*e\.stopPropagation\(\)\s*\}/.test(tag);

      if (isBackdrop) {
        // Must offer a keyboard exit: either a DismissOnEscape child, or the
        // owning component binds the hook itself.
        const after = src.slice(m.index, m.index + 900);
        if (!/<DismissOnEscape\b/.test(after) && !/useDismissOnEscape\(/.test(src)) {
          pointerOnlyModals.push(site);
        }
        continue;
      }
      if (isStopProp) continue;
      if (/\btabIndex=/.test(tag)) continue;
      // The props may arrive via a spread — `{...(onClick ? buttonActivationProps(onClick) : {})}`
      // on a card that is only sometimes clickable — which no amount of tag
      // reading will resolve. Naming one of the helpers is the contract.
      if (/\b(buttonActivationProps|rowActivationProps|activateOnKey)\b/.test(tag)) continue;

      unreachable.push(site);
    }
  }
  return { unreachable, pointerOnlyModals };
}

describe('keyboard access', () => {
  const { unreachable, pointerOnlyModals } = scan();

  it('scans the component tree', () => {
    // A parser that silently matches nothing would make both assertions vacuous.
    expect(tsxFiles(SRC).length).toBeGreaterThan(300);
  });

  it('has no click handler on a non-interactive element without keyboard access', () => {
    const report = unreachable
      .map((s) => `  ${s.file}:${s.line}  <${s.tag}>  ${s.snippet}`)
      .join('\n');
    expect(report).toBe('');
  });

  it('has no modal that can only be dismissed with a pointer', () => {
    const report = pointerOnlyModals
      .map((s) => `  ${s.file}:${s.line}  ${s.snippet}`)
      .join('\n');
    expect(report).toBe('');
  });
});
