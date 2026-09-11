import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;
const SCOPED = /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(/;
const GLOBAL = /@GlobalEntity\(/;

/**
 * Routes that are market-free by nature. Anything else under /admin must
 * resolve a market in its handler body. Add here only with a reason.
 */
const GLOBAL_ROUTES: Array<[RegExp, string]> = [
  [/^\/admin\/security\//, 'DDoS board is per gateway, not per market'],
  [/^\/admin\/platform\/health$/, 'service liveness'],
  [
    /^\/admin\/layouts\//,
    'page layouts are per module page, not per market (Plan E may scope them)',
  ],
  [
    /^\/admin\/seo/,
    'SEO overrides are per path; market-specific paths carry their market in the path',
  ],
  [/^\/admin\/marketplace\/system-health$/, 'service liveness'],
];

interface AdminRoute {
  file: string;
  verb: string;
  path: string;
  scoped: boolean;
  global: boolean;
}

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function collect(): AdminRoute[] {
  const out: AdminRoute[] = [];
  for (const file of fs
    .readdirSync(CONTROLLERS)
    .filter((f) => /^(admin-.*|ddos-admin)\.controller\.ts$/.test(f))) {
    const src = stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8')).split('\n');
    const base = (src.join('\n').match(/@Controller\(\s*['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
    const routeLines = src.map((l, i) => ({ l, i })).filter(({ l }) => HTTP.test(l));
    routeLines.forEach(({ l, i }, idx) => {
      const m = l.match(HTTP)!;
      const end = idx + 1 < routeLines.length ? routeLines[idx + 1].i : src.length;
      // decorator block above + handler body until the next route decorator
      let a = i;
      while (a > 0 && /^\s*(@|\)|\*|\/\/)/.test(src[a - 1])) a--;
      const block = src.slice(a, end).join('\n');
      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      out.push({
        file,
        verb: m[1].toUpperCase(),
        path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
        scoped: SCOPED.test(block),
        global: GLOBAL.test(block),
      });
    });
  }
  return out;
}

describe('admin market scope regression', () => {
  const routes = collect();

  it('parses every admin controller', () => {
    expect(routes.length).toBeGreaterThan(300);
  });

  it('resolves a market on every /admin route that is not declared global', () => {
    const offenders = routes.filter(
      (r) => !r.scoped && !r.global && !GLOBAL_ROUTES.some(([re]) => re.test(r.path)),
    );
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('allows @GlobalEntity on reads only — a write to a global entity must refuse locked admins itself', () => {
    // A locked admin may read taxonomy; a write must call marketScopeOf(req)
    // and refuse. Writes therefore may not carry the marker at all: the SCOPED
    // regex above is what proves they looked at the caller's scope.
    const offenders = routes.filter((r) => r.global && r.verb !== 'GET');
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });
});
