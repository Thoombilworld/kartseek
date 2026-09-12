#!/usr/bin/env node
/* global process, console */
/**
 * admin-console-census.mjs — static inventory of the KARTSEEK admin console.
 *
 * Usage (from the repo root):
 *   node apps/api/scripts/verification/admin-console-census.mjs [--json out.json] [--md out.md]
 *
 * Joins, without running or calling anything:
 *   admin page (apps/web/src/app/admin/ ** /page.tsx)
 *     -> client method (packages/shared-core/src/{api,modules}/*.ts)
 *       -> gateway route (apps/api/apps/api-gateway/src/ ** / *.controller.ts)
 *         -> RPC command (MARKETPLACE_PATTERNS.* and friends resolved)
 *           -> backend @MessagePattern (apps/api/apps/ **, modules/* /backend/src/ **)
 * plus fixture / not-connected heuristics and nav coverage from admin/layout.tsx.
 * Tooling, not a test: it reports signals; the reviewer rules on them.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const P = (...s) => path.join(ROOT, ...s);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (f) => fs.readFileSync(f, 'utf8');

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.next', 'coverage'].includes(e.name)) continue;
      walk(f, test, out);
    } else if (test(f)) out.push(f);
  }
  return out;
}

// ── tiny TS scanners ─────────────────────────────────────────────────────────
/** Index just past the matching close of the bracket at `i` (skips strings/comments). */
function matchBracket(src, i) {
  const open = src[i],
    close = { '(': ')', '{': '}', '[': ']' }[open];
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '/' && src[j + 1] === '/') {
      const n = src.indexOf('\n', j);
      if (n < 0) return src.length;
      j = n;
      continue;
    }
    if (c === '/' && src[j + 1] === '*') {
      j = src.indexOf('*/', j) + 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      for (j++; j < src.length; j++) {
        if (src[j] === '\\') j++;
        else if (src[j] === c) break;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return j + 1;
  }
  return src.length;
}
/** Balanced `{...}` body starting at the first `{` at or after `from`. */
function braceBody(src, from) {
  const i = src.indexOf('{', from);
  if (i < 0) return '';
  return src.slice(i, matchBracket(src, i));
}
/** Method body: skip the parameter list (which may itself contain `{`), then take `{...}`. */
function methodBody(src, sigStart) {
  const p = src.indexOf('(', sigStart);
  if (p < 0) return '';
  return braceBody(src, matchBracket(src, p));
}
/** Top-level arguments of the call whose `(` is at `i`. */
function argsAt(src, i) {
  const end = matchBracket(src, i) - 1;
  const inner = src.slice(i + 1, end);
  const args = [];
  let depth = 0,
    start = 0;
  for (let j = 0; j < inner.length; j++) {
    const c = inner[j];
    if (c === "'" || c === '"' || c === '`') {
      for (j++; j < inner.length; j++) {
        if (inner[j] === '\\') j++;
        else if (inner[j] === c) break;
      }
      continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      args.push(inner.slice(start, j).trim());
      start = j + 1;
    }
  }
  if (inner.slice(start).trim()) args.push(inner.slice(start).trim());
  return args;
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
/**
 * Blank out comment bodies, preserving every index and newline.
 * Prose in this repo quotes decorators and helper names (`@Roles(`, `this.scopeOf(`),
 * so a census that reads raw text credits a route with a guard it does not have.
 */
function maskComments(src) {
  const out = src.split('');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') i++;
        else if (src[i] === c) break;
      }
    } else if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
      const block = src[i + 1] === '*';
      const n = block ? src.indexOf('*/', i) : src.indexOf('\n', i);
      const end = n < 0 ? src.length : block ? n + 2 : n;
      for (let j = i; j < end; j++) if (out[j] !== '\n') out[j] = ' ';
      i = block ? end - 1 : end;
    }
  }
  return out.join('');
}

/** `${…}` → ':p', dropping base-url and query-builder interpolations. */
function interp(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && s[i + 1] === '{') {
      let d = 1,
        j = i + 2;
      for (; j < s.length && d > 0; j++) {
        if (s[j] === '{') d++;
        else if (s[j] === '}') d--;
      }
      const expr = s.slice(i + 2, j - 1);
      out += /BASE_URL|BASE\b|API_BASE/.test(expr)
        ? ''
        : /buildQuery|toQuery|qs\b|queryString/i.test(expr)
          ? ''
          : ':p';
      i = j - 1;
    } else out += s[i];
  }
  return out;
}
/** A URL path out of a first-argument expression (literal, template, or `'a/' + id`). */
function pathFromArg(arg) {
  if (!arg || !/^[`'"]/.test(arg.trim())) return null;
  const a = arg.trim();
  let p = '',
    i = 0;
  while (i < a.length) {
    const c = a[i];
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < a.length && a[j] !== c) {
        if (a[j] === '\\') j++;
        j++;
      }
      p += c === '`' ? interp(a.slice(i + 1, j)) : a.slice(i + 1, j);
      i = j + 1;
    } else if (c === '+' || /\s/.test(c)) i++;
    else {
      let j = i,
        d = 0;
      while (j < a.length && !(d === 0 && a[j] === '+')) {
        if ('([{'.includes(a[j])) d++;
        if (')]}'.includes(a[j])) d--;
        j++;
      }
      p += ':p';
      i = j;
    }
  }
  p = p.split('?')[0].split('#')[0];
  return p.startsWith('/') ? p.replace(/\/+$/, '') || '/' : null;
}

// ── 1. RPC pattern constants (MARKETPLACE_PATTERNS.X and friends) ────────────
const CONSTS = new Map();
for (const f of [
  ...walk(P('apps/api/apps/api-gateway/src/contracts'), (f) => f.endsWith('.ts')),
  ...walk(P('apps/api/libs'), (f) => /patterns?\.ts$/.test(f)),
]) {
  const src = read(f);
  for (const m of src.matchAll(/export const ([A-Z0-9_]+)\s*=\s*\{/g))
    for (const e of braceBody(src, m.index).matchAll(/^\s*([A-Z0-9_]+)\s*:\s*'([^']+)'/gm))
      CONSTS.set(`${m[1]}.${e[1]}`, e[2]);
}
/** `scope` lets a bare identifier be resolved against a `const x = '…' : '…'` in the same body. */
const resolveCmd = (raw, scope = '') => {
  const t = (raw || '').trim().replace(/[,;]$/, '');
  if (/^['"`]/.test(t)) return [t.slice(1, -1)];
  if (CONSTS.has(t)) return [CONSTS.get(t)];
  const short = t.split('.').slice(-2).join('.');
  if (CONSTS.has(short)) return [CONSTS.get(short)];
  if (/^[A-Za-z_$][\w$]*$/.test(t) && scope) {
    const decl = new RegExp(`(?:const|let)\\s+${t}\\s*(?::[^=]*)?=\\s*([^;]+);`).exec(scope);
    const lits = decl ? [...decl[1].matchAll(/'([a-z][a-z0-9_.]*)'/g)].map((m) => m[1]) : [];
    if (lits.length) return lits;
  }
  return [`?${t}`];
};

// ── 2. Backend @MessagePattern index ─────────────────────────────────────────
const BACKEND = new Map();
const backendFiles = [
  ...walk(
    P('apps/api/apps'),
    (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes(`api-gateway${path.sep}`),
  ),
  ...walk(
    P('modules'),
    (f) => /[\\/]backend[\\/]src[\\/].*\.ts$/.test(f) && !f.endsWith('.spec.ts'),
  ),
];
for (const f of backendFiles) {
  const src = read(f);
  for (const m of src.matchAll(
    /@(?:MessagePattern|EventPattern)\(\s*(?:\{\s*cmd:\s*)?([^,)\s}]+)/g,
  )) {
    for (const cmd of resolveCmd(m[1]))
      (BACKEND.get(cmd) ?? BACKEND.set(cmd, []).get(cmd)).push(`${rel(f)}:${lineOf(src, m.index)}`);
  }
  for (const m of src.matchAll(/@GrpcMethod\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    const cmd = `grpc:${m[1]}.${m[2]}`;
    (BACKEND.get(cmd) ?? BACKEND.set(cmd, []).get(cmd)).push(`${rel(f)}:${lineOf(src, m.index)}`);
  }
}

// ── 3. Gateway route index ───────────────────────────────────────────────────
const ROUTES = [];
const VERBS = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
for (const f of walk(P('apps/api/apps/api-gateway/src'), (x) => /\.controller\.ts$/.test(x))) {
  const src = maskComments(read(f));
  const lines = src.split('\n');
  const clsIdx = src.search(/export\s+(?:abstract\s+)?class\s/);
  const ctrl = /@Controller\(([^)]*)\)/.exec(src);
  const prefixes = ctrl ? [...ctrl[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : [''];
  // The window must run PAST `export class`: `@Roles` is usually the last class
  // decorator, and a window that stops at `export` can never see its terminator.
  const clsHead = clsIdx > 0 ? src.slice(Math.max(0, clsIdx - 1200), clsIdx + 30) : '';
  const classRoles = /@Roles\(([\s\S]*?)\)\s*(?:@|export)/.exec(clsHead)?.[1] ?? '';
  const classGuards = /@UseGuards\(([^)]*)\)/.exec(clsHead)?.[1] ?? '';
  // helper signatures: which argument carries `cmd`, and which (if any) is a fabricated fallback
  const HELPERS = new Map();
  for (const m of src.matchAll(/private\s+(?:async\s+)?(send[A-Za-z]*)\s*(?:<[^(]*?>)?\s*\(/g)) {
    const params = argsAt(src, src.indexOf('(', m.index + m[0].length - 1)).map((p) =>
      p
        .split(/[:?=]/)[0]
        .trim()
        .replace(/^\.\.\./, ''),
    );
    HELPERS.set(m[1], {
      cmdAt: params.indexOf('cmd'),
      fallbackAt: params.findIndex((p) => /^(fallback|config|defaultValue)$/.test(p)),
    });
  }

  let block = [],
    blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    if (t.startsWith('@')) {
      if (!block.length) blockStart = i;
      let open = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
      block.push(lines[i]);
      while (open > 0 && i + 1 < lines.length) {
        i++;
        block.push(lines[i]);
        open += (lines[i].match(/\(/g) || []).length - (lines[i].match(/\)/g) || []).length;
      }
      continue;
    }
    if (!block.length) continue;
    const dec = block.join('\n');
    const routeDec = new RegExp(`@(${VERBS.join('|')})\\(([^)]*)\\)`).exec(dec);
    const name =
      /^\s*(?:async\s+|private\s+|public\s+|protected\s+)*([A-Za-z_$][\w$]*)\s*[(<]/.exec(lines[i]);
    if (routeDec && name) {
      const sub = /'([^']*)'/.exec(routeDec[2])?.[1] ?? '';
      const sigStart = lines.slice(0, i).join('\n').length;
      const bodyText = methodBody(src, sigStart);
      const rolesM = /@Roles\(([\s\S]*?)\)\s*$/m.exec(dec) ?? /@Roles\(([\s\S]*?)\)/.exec(dec);
      const roleArgs = rolesM ? rolesM[1] : classRoles;
      const cmds = new Set();
      let fallback = false;
      for (const m of bodyText.matchAll(/\.send\w*\(\s*\{\s*cmd:\s*([^,}]+)/g))
        for (const c of resolveCmd(m[1], bodyText)) cmds.add(c);
      for (const m of bodyText.matchAll(/this\.(send[A-Za-z]*)\s*\(/g)) {
        const h = HELPERS.get(m[1]);
        if (!h || h.cmdAt < 0) continue;
        const args = argsAt(bodyText, bodyText.indexOf('(', m.index + m[0].length - 1));
        if (args[h.cmdAt]) for (const c of resolveCmd(args[h.cmdAt], bodyText)) cmds.add(c);
        if (h.fallbackAt >= 0 && args.length > h.fallbackAt) fallback = true;
      }
      for (const pre of prefixes) {
        const full = ('/' + [pre, sub].filter(Boolean).join('/'))
          .replace(/\/+/g, '/')
          .replace(/(.)\/$/, '$1');
        ROUTES.push({
          verb: routeDec[1].toUpperCase(),
          path: full,
          file: rel(f),
          line: blockStart + 1,
          controller: path.basename(f, '.ts'),
          handler: name[1],
          roles: [...new Set([...roleArgs.matchAll(/UserRole\.([A-Z_]+)/g)].map((m) => m[1]))],
          perms: [...new Set([...roleArgs.matchAll(/'perm:([^']+)'/g)].map((m) => m[1]))],
          rolesSpread: /\.\.\.[A-Z_]+/.test(roleArgs),
          rolesInherited: !rolesM,
          guards: (/@UseGuards\(([^)]*)\)/.exec(dec)?.[1] ?? classGuards)
            .replace(/\s+/g, ' ')
            .trim(),
          isPublic: /@Public\(\)/.test(dec),
          scopeOf: /this\.scopeOf\(/.test(bodyText),
          // Second, older scoping idiom in the same controllers: the market helpers
          // called directly instead of through `this.scopeOf(`. Tracked apart so the
          // inconsistency is visible without being mistaken for an unscoped route.
          rawScope: /(?:resolveMarket|marketScopeOf)\s*\(/.test(bodyText),
          globalEntity: /@GlobalEntity\(/.test(dec),
          refuseLocked: /refuseLockedAdmin\(/.test(bodyText),
          cmds: [...cmds].filter((c) => c && !c.startsWith('?')),
          unresolvedCmds: [...cmds].filter((c) => c && c.startsWith('?')),
          fallback,
          // No RPC, no in-gateway service call, no repository — just a literal.
          stub:
            !cmds.size &&
            !/this\.[\w$]+\.[\w$]+\(/.test(bodyText) &&
            !/\bawait\b/.test(bodyText) &&
            /return\s*[[{]/.test(bodyText),
        });
      }
    }
    block = [];
  }
}
const norm = (p) => p.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
const tplKey = (p) =>
  norm(p)
    .split('/')
    .map((s) => (s.startsWith(':') ? '*' : s))
    .join('/');
const ROUTE_INDEX = new Map();
for (const r of ROUTES) {
  const k = `${r.verb} ${tplKey(r.path)}`;
  (ROUTE_INDEX.get(k) ?? ROUTE_INDEX.set(k, []).get(k)).push(r);
}
function findRoute(verb, urlPath) {
  const p = norm(urlPath);
  const segs = p.split('/');
  const exact = ROUTE_INDEX.get(`${verb} ${p}`);
  if (exact) return exact[0];
  let best = null;
  for (const [k, list] of ROUTE_INDEX) {
    const [v, tpl] = k.split(' ');
    if (v !== verb) continue;
    const ts = tpl.split('/');
    if (ts.length !== segs.length) continue;
    if (!ts.every((s, i) => s === '*' || s === segs[i] || segs[i] === ':p')) continue;
    const literal = ts.filter((s) => s !== '*').length;
    if (!best || literal > best.literal) best = { literal, r: list[0] };
  }
  return best?.r ?? null;
}

// ── 4. Client method index ───────────────────────────────────────────────────
const CLIENTS = new Map();
const CLIENT_FILES = [
  ...walk(P('packages/shared-core/src/api'), (f) => f.endsWith('.ts')),
  ...walk(P('packages/shared-core/src/modules'), (f) => f.endsWith('.ts')),
];
const CALLEES =
  /\b(api\.(?:get|post|put|patch|delete|upload)|apiCall|apiRequest|apiFetch|request|fetch)\s*(?=[<(])/g;
function callsIn(text) {
  const out = [];
  for (const m of text.matchAll(CALLEES)) {
    const open = text.indexOf('(', m.index + m[0].length - 1);
    if (open < 0) continue;
    const args = argsAt(text, open);
    const p = pathFromArg(args[0]);
    if (!p) continue;
    const dotted = /^api\.(\w+)$/.exec(m[1]);
    const verb = dotted
      ? dotted[1] === 'upload'
        ? 'POST'
        : dotted[1].toUpperCase()
      : ((/method:\s*'([A-Z]+)'/.exec(args.slice(1).join(',')) ?? [])[1] ?? 'GET');
    out.push({ verb, path: p, bare: /^\/api\//.test(p) && !/^\/api\/v1\//.test(p) });
  }
  return out;
}
for (const f of CLIENT_FILES) {
  const src = maskComments(read(f));
  const mod = rel(f)
    .replace(/^packages\/shared-core\/src\//, '@/lib/')
    .replace(/\.ts$/, '');
  for (const m of src.matchAll(/export const ([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*\{/g)) {
    const obj = braceBody(src, m.index);
    const objLine = lineOf(src, m.index);
    const ls = obj.split('\n');
    let cur = null,
      buf = [],
      curLine = 0;
    const flush = () => {
      if (cur)
        CLIENTS.set(`${mod}#${m[1]}.${cur}`, {
          object: m[1],
          method: cur,
          file: rel(f),
          line: objLine + curLine,
          calls: callsIn(buf.join('\n')),
        });
    };
    for (let i = 0; i < ls.length; i++) {
      const e = /^ {2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*[:(<]/.exec(ls[i]);
      if (e) {
        flush();
        cur = e[1];
        buf = [];
        curLine = i;
      }
      if (cur) buf.push(ls[i]);
    }
    flush();
  }
  for (const m of src.matchAll(/export (?:async )?function ([A-Za-z_$][\w$]*)/g))
    CLIENTS.set(`${mod}#${m[1]}`, {
      object: null,
      method: m[1],
      file: rel(f),
      line: lineOf(src, m.index),
      calls: callsIn(methodBody(src, m.index)),
    });
}

// ── 5. Nav index (admin/layout.tsx) ──────────────────────────────────────────
const NAV = new Map();
for (const m of read(P('apps/web/src/app/admin/layout.tsx')).matchAll(
  /href:\s*'([^']+)'[\s\S]{0,240}?perm:\s*'([^']+)'/g,
))
  NAV.set(m[1], m[2]);

// ── 6. Pages ─────────────────────────────────────────────────────────────────
const FIXTURE_RE = [
  ['MOCK_*', /\b(?:const|let)\s+(?:MOCK_|mock[A-Z])\w*/],
  [
    'sample/demo/fallback const',
    /\b(?:const|let)\s+(?:SAMPLE_|DEMO_|FALLBACK_|DUMMY_|sample[A-Z]|demo[A-Z]|dummy[A-Z])\w*/,
  ],
  ['inline useState row array', /useState(?:<[^>]*\[\]>)?\(\s*\[\s*\{/],
  ['Math.random', /Math\.random\(/],
  ['hardcoded row array', /=\s*(?:\[\s*\{\s*id:|\[\s*\n\s*\{\s*id:)/],
];
const NOTCONN_RE =
  /not connected|Not Connected|no API|not available yet|FeatureUnavailable|feature-unavailable|ApiUnavailable|Coming soon|coming soon|no backend|awaiting backend|not wired|NotImplemented/;
const pageRoute = (file) =>
  '/' +
  rel(file)
    .replace('apps/web/src/app/', '')
    .replace(/\/page\.tsx$/, '')
    .split('/')
    .filter((s) => !/^\(.*\)$/.test(s))
    .join('/');
const COMPONENT_ROOTS = [P('apps/web/src/components'), P('packages/shared-ui/src')];
function resolveLocal(spec, fromFile) {
  let cand = [];
  if (spec.startsWith('.')) cand = [path.resolve(path.dirname(fromFile), spec)];
  else if (spec.startsWith('@/components/'))
    cand = COMPONENT_ROOTS.map((r) => path.join(r, spec.slice(13)));
  else if (spec.startsWith('@/')) cand = [path.join(P('apps/web/src'), spec.slice(2))];
  for (const c of cand)
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts'])
      if (fs.existsSync(c + ext)) return c + ext;
  return null;
}

const PAGES = walk(P('apps/web/src/app/admin'), (f) => f.endsWith('page.tsx'));
const rows = [];
for (const file of PAGES) {
  // Masked: these pages document dead URLs and removed fixtures in prose.
  const src = maskComments(read(file));
  const route = pageRoute(file);
  const seg = route.split('/')[2];
  const module = seg && !seg.startsWith('[') ? seg : 'core';
  const clientObjs = new Map();
  const localFiles = [];
  const collectImports = (text, from) => {
    for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
      const spec = m[2];
      const names = m[1]
        .split(',')
        .map((s) =>
          s
            .trim()
            .split(/\s+as\s+/)
            .pop(),
        )
        .filter(Boolean);
      if (/^@\/lib\/(api|modules)\//.test(spec))
        for (const n of names)
          if (!clientObjs.has(n)) clientObjs.set(n, spec);
          else if (from === file && /^(\.|@\/components\/)/.test(spec)) {
            const lf = resolveLocal(spec, from);
            if (lf) localFiles.push(lf);
          }
    }
  };
  collectImports(src, file);
  const texts = [{ src, via: null }];
  for (const lf of [...new Set(localFiles)].slice(0, 14)) {
    const lsrc = maskComments(read(lf));
    texts.push({ src: lsrc, via: rel(lf) });
    for (const m of lsrc.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g))
      if (/^@\/lib\/(api|modules)\//.test(m[2]))
        for (const n of m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean))
          if (!clientObjs.has(n)) clientObjs.set(n, m[2]);
  }

  const calls = [];
  const seen = new Set();
  for (const { src: text, via } of texts) {
    for (const [local, spec] of clientObjs) {
      for (const m of text.matchAll(new RegExp(`\\b${local}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, 'g'))) {
        const key = `${spec}#${local}.${m[1]}`;
        const c = CLIENTS.get(key) ?? CLIENTS.get(`${spec}#${m[1]}`);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!c) {
          calls.push({
            client: `${local}.${m[1]}`,
            clientFile: spec,
            via,
            resolved: false,
            note: 'client method not found',
          });
          continue;
        }
        if (!c.calls.length) {
          calls.push({
            client: `${local}.${m[1]}`,
            clientFile: `${c.file}:${c.line}`,
            via,
            resolved: false,
            note: 'no URL in client method',
          });
          continue;
        }
        for (const call of c.calls)
          calls.push({
            client: `${local}.${m[1]}`,
            clientFile: `${c.file}:${c.line}`,
            via,
            resolved: true,
            ...call,
          });
      }
      const cf = CLIENTS.get(`${spec}#${local}`);
      if (cf && new RegExp(`\\b${local}\\s*\\(`).test(text) && !seen.has(`${spec}#${local}`)) {
        seen.add(`${spec}#${local}`);
        for (const call of cf.calls)
          calls.push({
            client: local,
            clientFile: `${cf.file}:${cf.line}`,
            via,
            resolved: true,
            ...call,
          });
      }
    }
    for (const m of text.matchAll(/\bfetch\s*(?=\()/g)) {
      const args = argsAt(text, text.indexOf('(', m.index));
      const p = pathFromArg(args[0]);
      if (!p) continue;
      const opts = args.slice(1).join(',');
      const verb = (/method:\s*'([A-Z]+)'/.exec(opts) ?? [])[1] ?? 'GET';
      const id = `fetch|${verb} ${p}|${via ?? ''}`;
      if (seen.has(id)) continue;
      seen.add(id);
      calls.push({
        client: 'fetch()',
        clientFile: `${via ?? rel(file)}:${lineOf(text, m.index)}`,
        via,
        resolved: true,
        verb,
        path: p,
        direct: true,
        bare: /^\/api\//.test(p) && !/^\/api\/v1\//.test(p),
        noAuthHeader: !/Authorization|getAuthToken|getHeaders|authHeaders|credentials/i.test(opts),
      });
    }
  }

  for (const c of calls) {
    if (!c.resolved || !c.path) {
      c.gateway = null;
      continue;
    }
    const r = c.bare ? null : findRoute(c.verb, c.path);
    c.gateway = r
      ? {
          route: `${r.verb} ${r.path}`,
          file: `${r.file}:${r.line}`,
          controller: r.controller,
          handler: r.handler,
          roles: r.roles,
          perms: r.perms,
          rolesInherited: r.rolesInherited,
          rolesSpread: r.rolesSpread,
          isPublic: r.isPublic,
          scopeOf: r.scopeOf,
          rawScope: r.rawScope,
          globalEntity: r.globalEntity,
          refuseLocked: r.refuseLocked,
          fallback: r.fallback,
          stub: r.stub,
          guards: r.guards,
          cmds: r.cmds.map((cmd) => ({
            cmd,
            handled: BACKEND.has(cmd),
            at: (BACKEND.get(cmd) ?? [])[0] ?? null,
          })),
          unresolvedCmds: r.unresolvedCmds,
        }
      : null;
  }

  const fixtures = FIXTURE_RE.filter(([, re]) => re.test(src)).map(([l]) => l);
  const withRoute = calls.filter((c) => c.gateway);
  const noRoute = calls.filter((c) => c.resolved && c.path && !c.gateway);
  const unresolved = calls.filter((c) => !c.resolved);
  const used = new Set(calls.map((c) => c.client.split('.')[0]));
  const deadImports = [...clientObjs.keys()].filter((n) => !used.has(n) && /Api$|Client$/i.test(n));
  const flags = [];
  if (!calls.length) flags.push('NO-API');
  if (deadImports.length) flags.push('DEAD-CLIENT-IMPORT');
  if (noRoute.length) flags.push('NO-GATEWAY-ROUTE');
  if (calls.some((c) => c.bare)) flags.push('BARE-/api-NO-V1');
  if (calls.some((c) => c.noAuthHeader && c.gateway && !c.gateway.isPublic))
    flags.push('FETCH-NO-AUTH-HEADER');
  if (withRoute.some((c) => c.gateway.cmds.some((x) => !x.handled)))
    flags.push('NO-BACKEND-HANDLER');
  if (withRoute.some((c) => c.gateway.fallback)) flags.push('FALLBACK-FABRICATED');
  if (withRoute.some((c) => c.gateway.stub)) flags.push('STUB-HANDLER');
  if (
    withRoute.some(
      (c) =>
        !c.gateway.isPublic &&
        !c.gateway.perms.length &&
        !c.gateway.roles.length &&
        !c.gateway.rolesSpread,
    )
  )
    flags.push('NO-ROLE-OR-PERM');
  if (withRoute.length && !withRoute.some((c) => c.gateway.perms.length))
    flags.push('NO-PERM-GATE');
  if (
    withRoute.some(
      (c) =>
        !c.gateway.scopeOf &&
        !c.gateway.rawScope &&
        !c.gateway.globalEntity &&
        !c.gateway.refuseLocked,
    )
  )
    flags.push('NO-MARKET-SCOPE');
  if (withRoute.some((c) => !c.gateway.scopeOf && c.gateway.rawScope))
    flags.push('RAW-SCOPE-HELPER');
  if (fixtures.length) flags.push('FIXTURE');
  if (NOTCONN_RE.test(src)) flags.push('NOT-CONNECTED-STATE');
  if (/useAdminData\(/.test(src)) flags.push('USE-ADMIN-DATA');
  if (/\bredirect\(/.test(src) && src.split('\n').length < 30) flags.push('REDIRECT');
  if (!NAV.has(route)) flags.push('NOT-IN-NAV');

  rows.push({
    route,
    module,
    file: rel(file),
    lines: src.split('\n').length,
    nav: NAV.get(route) ?? null,
    calls,
    fixtures,
    deadImports,
    flags,
    counts: {
      calls: calls.length,
      routed: withRoute.length,
      noRoute: noRoute.length,
      unresolved: unresolved.length,
    },
  });
}

// ── 7. Duplicates & orphans ──────────────────────────────────────────────────
const byRoute = new Map();
for (const [key, c] of CLIENTS)
  for (const call of c.calls) {
    const k = `${call.verb} ${call.path}`;
    (byRoute.get(k) ?? byRoute.set(k, []).get(k)).push(key);
  }
const dupClients = [...byRoute.entries()]
  .filter(([, v]) => new Set(v.map((x) => x.split('#')[0])).size > 1)
  .map(([k, v]) => ({ route: k, methods: [...new Set(v)] }))
  .sort((a, b) => (a.route < b.route ? -1 : 1));
const pageRoutes = new Set(rows.map((r) => r.route));
const navOrphans = [...NAV.keys()].filter((h) => !pageRoutes.has(h));
const pageOrphans = rows.filter((r) => !NAV.has(r.route)).map((r) => r.route);

const summary = {
  note: 'static analysis only — nothing was started, installed or called',
  pages: rows.length,
  navItems: NAV.size,
  gatewayRoutes: ROUTES.length,
  gatewayAdminRoutes: ROUTES.filter((r) => r.path.startsWith('/admin')).length,
  adminRoutesWithPerm: ROUTES.filter((r) => r.path.startsWith('/admin') && r.perms.length).length,
  adminRoutesWithScope: ROUTES.filter(
    (r) =>
      r.path.startsWith('/admin') && (r.scopeOf || r.rawScope || r.globalEntity || r.refuseLocked),
  ).length,
  adminRoutesScopedViaScopeOf: ROUTES.filter((r) => r.path.startsWith('/admin') && r.scopeOf)
    .length,
  adminRoutesScopedViaRawHelper: ROUTES.filter(
    (r) => r.path.startsWith('/admin') && !r.scopeOf && r.rawScope,
  ).length,
  adminRoutesUnscoped: ROUTES.filter(
    (r) =>
      r.path.startsWith('/admin') &&
      !r.scopeOf &&
      !r.rawScope &&
      !r.globalEntity &&
      !r.refuseLocked,
  ).length,
  adminRoutesStubbed: ROUTES.filter((r) => r.path.startsWith('/admin') && r.stub).length,
  adminRoutesNoRoleNoPerm: ROUTES.filter(
    (r) =>
      r.path.startsWith('/admin') &&
      !r.isPublic &&
      !r.roles.length &&
      !r.perms.length &&
      !r.rolesSpread,
  ).length,
  backendPatterns: BACKEND.size,
  clientMethods: CLIENTS.size,
  patternConstants: CONSTS.size,
  pageCalls: rows.reduce((a, r) => a + r.counts.calls, 0),
  callsRouted: rows.reduce((a, r) => a + r.counts.routed, 0),
  callsNoGatewayRoute: rows.reduce((a, r) => a + r.counts.noRoute, 0),
  callsUnresolved: rows.reduce((a, r) => a + r.counts.unresolved, 0),
  duplicateClientRoutes: dupClients.length,
  navOrphans: navOrphans.length,
  pagesNotInNav: pageOrphans.length,
  flagCounts: {},
  perModule: {},
};
for (const r of rows) {
  for (const f of r.flags) summary.flagCounts[f] = (summary.flagCounts[f] ?? 0) + 1;
  summary.perModule[r.module] = (summary.perModule[r.module] ?? 0) + 1;
}

// ── 8. Emit ──────────────────────────────────────────────────────────────────
const argOf = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : d;
};
const outJson = path.resolve(argOf('--json', 'admin-console-census.json'));
const outMd = path.resolve(argOf('--md', 'admin-console-census.md'));
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.mkdirSync(path.dirname(outMd), { recursive: true });
fs.writeFileSync(
  outJson,
  JSON.stringify(
    { summary, rows, dupClients, navOrphans, pageOrphans, navItems: [...NAV] },
    null,
    2,
  ),
);

const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
let md = `# Admin console census\n\n_Static join: page → client → gateway route → RPC command → backend handler._\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\n`;
md += `| Route | Page file | Nav perm | Client method | Verb + path | Gateway handler | Roles / perms | Scope | RPC cmd → handler | Flags |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  if (!r.calls.length) {
    md += `| ${cell(r.route)} | ${cell(r.file)} | ${cell(r.nav ?? '—')} | — | — | — | — | — | — | ${cell(r.flags.join(', '))} |\n`;
    continue;
  }
  r.calls.forEach((c, i) => {
    const g = c.gateway;
    md += `| ${i ? '↳' : cell(r.route)} | ${i ? '' : cell(r.file)} | ${i ? '' : cell(r.nav ?? '—')} | ${cell(c.client)} @ ${cell(c.clientFile)} | ${cell(c.resolved ? `${c.verb} ${c.path}${c.bare ? ' ⚠bare /api' : ''}` : c.note)} | ${cell(g ? `${g.controller}.${g.handler} (${g.file})` : c.resolved && c.path ? 'NO ROUTE' : '—')} | ${cell(g ? `${g.roles.join('/') || (g.rolesSpread ? 'spread' : 'none')}${g.rolesInherited ? ' (class)' : ''}${g.perms.length ? ' +perm:' + g.perms.join(',') : ''}` : '')} | ${cell(g ? [g.scopeOf && 'scopeOf', g.rawScope && 'resolveMarket', g.globalEntity && 'GlobalEntity', g.refuseLocked && 'refuseLocked'].filter(Boolean).join('+') || 'NONE' : '')} | ${cell(g ? g.cmds.map((x) => `${x.cmd}${x.handled ? ' ✓' : ' ✗MISSING'}`).join('; ') || (g.stub ? 'STUB (returns a literal)' : '—') : '')} | ${i ? '' : cell(r.flags.join(', '))} |\n`;
  });
}
md += `\n## Duplicate client coverage (one route reached from two client modules)\n\n${dupClients.map((d) => `- \`${d.route}\` — ${d.methods.join(', ')}`).join('\n') || '- none'}\n`;
md += `\n## Nav items with no page\n\n${navOrphans.map((n) => `- ${n}`).join('\n') || '- none'}\n`;
md += `\n## Pages with no nav item (${pageOrphans.length})\n\n${pageOrphans.map((n) => `- ${n}`).join('\n') || '- none'}\n`;
fs.writeFileSync(outMd, md);

console.log(JSON.stringify(summary, null, 2));
console.log(`\nwrote ${rel(outJson)}\nwrote ${rel(outMd)}`);
