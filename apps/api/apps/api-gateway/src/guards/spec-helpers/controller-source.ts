import * as fs from 'fs';
import * as path from 'path';

/**
 * Shared source-scanning primitives for the two regression specs that walk
 * the gateway's controller tree: `admin-market-scope.regression.spec.ts` and
 * `route-exposure.regression.spec.ts`.
 *
 * Both specs used to carry their own copy of "strip the comments, find the
 * controller classes" — and `route-exposure`'s copy still had the fault R8
 * fixed here: a naive `.replace(/\/\*[\s\S]*?\*\//g, '')` that a regex
 * literal or a `//` inside a string can corrupt, and a "first `export class`
 * in the file" locator that takes the wrong class when an exported DTO sits
 * above the real controller, or only the first of two controllers in one
 * file (`static-pages.controller.ts`'s shape). Both faults are silent: a
 * swallowed `@Controller`/`@Roles` block drops routes from the scan rather
 * than failing it. One implementation, used by both specs, is what keeps a
 * fix in one from drifting out of the other.
 */

/** Every route decorator that sits at the start of a line in the **raw** source. */
export const HTTP =
  /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;

/** A top-level class declaration and a class's closing brace, both at column 0. */
const CLASS_LINE = /^(?:export\s+)?(?:abstract\s+)?class\s/;
const CLASS_CLOSE = /^}/;

/** Punctuators after which a `/` opens a regex literal rather than dividing. */
const REGEX_PRECEDERS = new Set('(,=:[!&|?{};+-*%~<>^'.split(''));
/** Keywords after which the same is true. */
const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'throw',
]);

/**
 * Is the `/` about to be read the start of a regex literal?
 *
 * Decided from the last significant token already emitted, the standard way:
 * after an operator, an opening bracket or one of the keywords above, a `/`
 * begins a regex; after an identifier, a number, `)` or `]` it divides. Getting
 * this wrong in the safe direction (reading a regex as division) is what the
 * first version of this scanner did, and `/\/\//` — a regex matching a literal
 * `//`, the shape at `health.controller.ts:120` — then looked like a line
 * comment and swallowed the rest of its line, while a character class such as
 * `/[/*]/` looked like a *block* comment and would have swallowed the
 * `@Controller` and `@Roles` lines that followed it.
 */
function regexStartsHere(emitted: string): boolean {
  let k = emitted.length - 1;
  while (k >= 0 && /\s/.test(emitted[k])) k--;
  if (k < 0) return true;
  const p = emitted[k];
  if (REGEX_PRECEDERS.has(p)) return true;
  if (!/[A-Za-z0-9_$]/.test(p)) return false;
  let word = '';
  while (k >= 0 && /[A-Za-z0-9_$]/.test(emitted[k])) word = emitted[k--] + word;
  return REGEX_KEYWORDS.has(word);
}

/**
 * Remove comments without removing code.
 *
 * A scanner, not two regexes: it tracks strings and template literals so a
 * quoted `//` stays, and — the reason it exists — it never lets a `/*` inside a
 * line comment open a block comment. `.replace(/\/\*[\s\S]*?\*\//g, '')`
 * followed by a line-comment pass does exactly that, and it cost the
 * market-scope spec five of `admin-seo.controller.ts`'s six routes plus every
 * route in `loyalty`, `partner` and `seller` (64 in all), silently, for as long
 * as the file existed — and it is the same naive pair `route-exposure`'s
 * `codeOf()` carried, corruptible by any regex literal or `//` inside a string
 * in the three files it string-matches against (`partner.controller.ts`,
 * `libs/gdpr/src/gdpr.controller.ts`). Newlines inside block comments are kept
 * so line numbers survive.
 */
export function stripComments(s: string): string {
  let out = '';
  let state: 'code' | 'line' | 'block' | 'regex' | "'" | '"' | '`' = 'code';
  /** Inside a regex's `[...]`, where an unescaped `/` does not end the literal. */
  let charClass = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const d = s[i + 1];
    if (state === 'code') {
      // A comment wins over a regex at the same `/`: `//` is never an empty
      // regex and a regex cannot begin with `*`.
      if (c === '/' && d === '/') {
        state = 'line';
        i++;
      } else if (c === '/' && d === '*') {
        state = 'block';
        i++;
      } else if (c === '/' && regexStartsHere(out)) {
        state = 'regex';
        charClass = false;
        out += c;
      } else {
        if (c === "'" || c === '"' || c === '`') state = c;
        out += c;
      }
    } else if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
    } else if (state === 'block') {
      if (c === '*' && d === '/') {
        state = 'code';
        i++;
      } else if (c === '\n') {
        out += c;
      }
    } else if (state === 'regex') {
      // A regex literal is code: emit it, and read to its real end so its
      // contents cannot open a comment.
      out += c;
      if (c === '\\') {
        out += d ?? '';
        i++;
      } else if (c === '[') {
        charClass = true;
      } else if (c === ']') {
        charClass = false;
      } else if (c === '/' && !charClass) {
        state = 'code';
      } else if (c === '\n') {
        // An unterminated regex cannot span a line; bail out rather than eat
        // the rest of the file.
        state = 'code';
      }
    } else if (c === '\\') {
      out += c + (d ?? '');
      i++;
    } else {
      if (c === state) state = 'code';
      out += c;
    }
  }
  return out;
}

/**
 * One region per top-level class: the decorator block above it, and its body.
 *
 * Not "everything above the first `export class`" and not "the first class in
 * the file". `static-pages.controller.ts` holds two controllers with
 * different base paths (`admin/static-pages` and `pages`), and a file may
 * open with an exported DTO class above the controller — the shape that made
 * `route-exposure.regression.spec.ts`'s old `classLine = src.findIndex(l =>
 * /^export class \w+/.test(l))` take the wrong class (R5's finding on that
 * spec, ported here). Taking the first class would give every route in such a
 * file the wrong base path and the wrong class-level decorators, and taking
 * only the first controller would silently drop the second one's routes from
 * the scan. Walking up from the class to the previous class's closing brace
 * also picks up a prettier-wrapped `@Roles(` or `@UseGuards(`, which a "while
 * the line above starts with @" walk stops at.
 *
 * Callers pass already-`stripComments`'d source, split into lines.
 */
export function classBlocks(src: string[]): Array<{ head: string; from: number; to: number }> {
  const closes: number[] = [];
  const decls: number[] = [];
  src.forEach((line, i) => {
    if (CLASS_CLOSE.test(line)) closes.push(i);
    if (CLASS_LINE.test(line)) decls.push(i);
  });
  return decls.map((at) => {
    const before = closes.filter((c) => c < at);
    const prevClose = before.length ? before[before.length - 1] : -1;
    const nextClose = closes.find((c) => c > at) ?? src.length;
    return { head: src.slice(prevClose + 1, at + 1).join('\n'), from: at + 1, to: nextClose };
  });
}

/** Every `*.controller.ts` under `dir`, recursively, skipping build output. */
export function controllerFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist')
        found.push(...controllerFiles(full));
    } else if (entry.name.endsWith('.controller.ts')) {
      found.push(full);
    }
  }
  return found;
}
