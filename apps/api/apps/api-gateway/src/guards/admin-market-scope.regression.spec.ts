import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;
// `refuseLockedAdmin(` counts: it reads `marketScopeOf(req)` itself and refuses
// a region-locked caller outright, which is how a route whose target has no
// market dimension yet resolves the caller's scope. It is not an exemption —
// a global admin still passes, and the denial is logged like any other.
const SCOPED =
  /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(|refuseLockedAdmin\(/;
const GLOBAL = /@GlobalEntity\(/;

/** The handler's own signature line: two-space indent, optional async, a name, an open paren. */
const SIGNATURE = /^ {2}(?:async\s+)?[A-Za-z_]\w*\s*\(/;
/**
 * Where a handler block ends: the next class member at two-space indent (its
 * first decorator, an access modifier or the constructor) or the class's
 * closing brace. Never end-of-file — that folded trailing helpers into the
 * last route and let a `scopeOf(` inside a helper stand in for a call the
 * handler never made. Parameter decorators sit at four-space indent and the
 * scan starts after the signature, so a handler's own decorators and
 * parameters never end its block.
 */
const MEMBER_START =
  /^ {2}(?:@|private\b|protected\b|public\b|static\b|readonly\b|constructor\b)|^}/;

/**
 * The lines of one route's handler: its decorator block above the route line,
 * down to the next class member (or the next route's decorator, whichever is
 * first). One function, used by the collector and by the negative control, so
 * the test cannot drift from what the collector actually does.
 */
function handlerBlock(
  src: string[],
  routeLine: number,
  nextRoute: number,
): { start: number; end: number } {
  let sig = routeLine;
  while (sig + 1 < nextRoute && !SIGNATURE.test(src[sig])) sig++;
  let end = nextRoute;
  for (let k = sig + 1; k < nextRoute; k++) {
    if (MEMBER_START.test(src[k])) {
      end = k;
      break;
    }
  }
  let start = routeLine;
  while (start > 0 && /^\s*(@|\)|\*|\/\/)/.test(src[start - 1])) start--;
  return { start, end };
}

/**
 * Routes that are market-free by nature. Anything else under /admin must
 * resolve a market in its handler body. Add here only with a reason.
 */
const GLOBAL_ROUTES: Array<[RegExp, string]> = [
  [
    /^\/admin\/security\//,
    'DDoS board is per gateway; every mutation calls refuseLockedAdmin (R7)',
  ],
  [/^\/admin\/platform\/health$/, 'service liveness'],
  [
    /^\/admin\/layouts\//,
    'page layouts are per module page, not per market; the write calls refuseLockedAdmin (R7)',
  ],
  [
    /^\/admin\/seo/,
    'SEO overrides are per path; a market-specific path carries its market in the path, and every write calls refuseLockedAdmin (R7)',
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

const parserGaps: string[] = [];

function collect(): AdminRoute[] {
  const out: AdminRoute[] = [];
  for (const file of fs
    .readdirSync(CONTROLLERS)
    .filter((f) => /^(admin-.*|ddos-admin)\.controller\.ts$/.test(f))) {
    const src = stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8')).split('\n');
    const declared = (src.join('\n').match(/@(?:Get|Post|Put|Patch|Delete|All)\(/g) ?? []).length;
    const base = (src.join('\n').match(/@Controller\(\s*['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
    const routeLines = src.map((l, i) => ({ l, i })).filter(({ l }) => HTTP.test(l));
    routeLines.forEach(({ l, i }, idx) => {
      const m = l.match(HTTP)!;
      const nextRoute = idx + 1 < routeLines.length ? routeLines[idx + 1].i : src.length;
      const { start, end } = handlerBlock(src, i, nextRoute);
      const block = src.slice(start, end).join('\n');
      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      out.push({
        file,
        verb: m[1].toUpperCase(),
        path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
        scoped: SCOPED.test(block),
        global: GLOBAL.test(block),
      });
    });
    if (declared !== routeLines.length) {
      parserGaps.push(
        `${file}: ${declared} route decorators declared, ${routeLines.length} parsed (multi-line decorator?)`,
      );
    }
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

  it('sees every route decorator it counts — a multi-line decorator must fail here, not vanish', () => {
    expect(parserGaps.join('\n')).toBe('');
  });

  it('does not let a helper declared after the last route stand in for that route', () => {
    // A trailing private helper that calls resolveMarket must not make the
    // preceding route count as scoped.
    const src = stripComments(
      "  @Get('x')\n  async lastRoute() {\n    return 1;\n  }\n\n  private scopeOf(req: any) {\n    return resolveMarket(req);\n  }\n}\n",
    ).split('\n');
    const routeLine = src.findIndex((l) => HTTP.test(l));
    const { start, end } = handlerBlock(src, routeLine, src.length);
    expect(SCOPED.test(src.slice(start, end).join('\n'))).toBe(false);
  });
});
