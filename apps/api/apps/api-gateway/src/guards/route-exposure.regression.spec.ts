import * as fs from 'fs';
import * as path from 'path';

/**
 * Route exposure regression.
 *
 * api-gateway registers no APP_GUARD (see `main.ts`), so JwtAuthGuard applies
 * only where it is written. A new route therefore ships **open by default** —
 * which is how `user.controller.ts` came to expose every profile and saved
 * address on the platform to anonymous callers, and how the admin-only
 * `/regions/stats` and `/doctor/admin/appointments` ended up public.
 *
 * This test walks the controllers the same way and fails on any route that is
 * neither authenticated nor explicitly declared public. The allowlist below is
 * the *intentionally* public surface: adding to it is a deliberate act that
 * shows up in review, which is exactly the property that was missing.
 *
 * If this fails on a route you added:
 *   • it should be authenticated → add `@UseGuards(JwtAuthGuard)`
 *   • it is genuinely public     → add `@Public()` and, if it is a new prefix,
 *                                   an entry here explaining why
 */

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
/**
 * Shared libraries whose controllers the gateway mounts as well: GdprModule is
 * imported by `api-gateway.module.ts`, so its routes ship under the same
 * open-by-default rule. That is how this scan came to include them. The GDPR
 * controller answered anonymous requests for another person's consents, data
 * export and erasure until 2026-09-06, and this file never looked at it.
 */
const LIBS = path.join(__dirname, '..', '..', '..', '..', 'libs');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;

/** Every `*.controller.ts` under `dir`, recursively, skipping build output. */
function controllerFiles(dir: string): string[] {
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

/**
 * Prefixes that may serve anonymous traffic, with the reason. Anything matching
 * one of these is allowed to be unguarded; everything else must opt in.
 */
const PUBLIC_PREFIXES: Array<[RegExp, string]> = [
  [/^\/$|^\/health/, 'liveness and readiness probes'],
  [/^\/auth\//, 'the sign-in surface itself — cannot require a token to get one'],
  [/^\/api\/partner\/auth\//, 'partner OTP sign-in (legacy doubled mount)'],
  [/^\/partner\/auth\//, 'partner OTP sign-in'],
  [/^\/localization\//, 'currency, language and tax config — same for every visitor'],
  [
    /^\/regions(?!\/stats|\/india\/stats)/,
    'region detection and PIN lookup; the stats routes are admin and excluded here',
  ],
  [/^\/geo\//, 'pre-login geo/VPN check'],
  [/^\/marketplace\//, 'storefront catalogue browsing'],
  [/^\/pharmacy\/(home|stores|search|scan|categories)/, 'pharmacy storefront browsing'],
  [/^\/doctor\/(specialties|hospitals|clinics|doctors|reviews)/, 'doctor directory browsing'],
  [/^\/grocery\//, 'grocery storefront browsing — this controller declares @Public() per route'],
  [/^\/restaurant\//, 'restaurant storefront browsing'],
  [/^\/hotel\//, 'hotel storefront browsing'],
  [
    /^\/taxi\/(health|config|vehicle-categories|estimate)/,
    'fare config and estimates, pre-booking',
  ],
  [/^\/franchise\/(health|register)/, 'franchise enquiry form'],
  [/^\/sellers?\//, 'public seller storefronts'],
  [/^\/static-pages/, 'CMS marketing pages'],
  [/^\/users\/health/, 'liveness probe'],
  [/^\/users\/partner\/register/, 'partner sign-up'],
];

interface Route {
  file: string;
  verb: string;
  path: string;
  guarded: boolean;
  declaredPublic: boolean;
}

/**
 * Source with comments removed.
 *
 * The assertions below search for the *old* insecure code, and the fixes
 * deliberately quote that code in their explanatory comments — so a naive
 * `toContain` matches the very prose describing the fix. Strip comments first so
 * these test what executes, not what is documented.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function codeOf(file: string): string {
  return stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8'));
}

function collectRoutes(): Route[] {
  const routes: Route[] = [];

  for (const full of [...controllerFiles(CONTROLLERS), ...controllerFiles(LIBS)]) {
    const file = path.relative(path.join(LIBS, '..'), full).split(path.sep).join('/');
    const src = fs.readFileSync(full, 'utf8').split('\n');

    const classLine = src.findIndex((l) => /^export class \w+/.test(l));
    if (classLine === -1) continue;

    const head = src.slice(0, classLine).join('\n');
    // A controller may declare several prefixes (`@Controller(['loyalty', 'api/loyalty'])`);
    // the first one is canonical and is the path checked here.
    const base = (head.match(/@Controller\(\s*(?:\[\s*)?['"`]([^'"`]*)['"`]/) || [])[1] ?? '';

    // Only the contiguous decorator block directly above `export class`.
    let top = classLine;
    while (top > 0 && /^\s*(@|\)|\*|\/\*|\/\/|$)/.test(src[top - 1])) top--;
    const classBlock = src.slice(top, classLine).join('\n');
    const classGuarded = /@UseGuards\([^)]*JwtAuth/.test(classBlock);
    const classPublic = /@Public\(\)/.test(classBlock);

    for (let i = classLine; i < src.length; i++) {
      const m = src[i].match(HTTP);
      if (!m) continue;

      let a = i;
      while (a > classLine && /^\s*(@|\)|\*|\/\/)/.test(src[a - 1])) a--;
      let b = i;
      while (b < src.length - 1 && !/\(.*\)\s*[:{]/.test(src[b]) && b - i < 15) b++;
      const block = src.slice(a, b + 1).join('\n');

      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      routes.push({
        file,
        verb: m[1].toUpperCase(),
        path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
        guarded: classGuarded || /@UseGuards\([^)]*JwtAuth/.test(block),
        declaredPublic: classPublic || /@Public\(\)/.test(block),
      });
    }
  }
  return routes;
}

describe('gateway route exposure', () => {
  const routes = collectRoutes();

  it('parses the controller tree', () => {
    // Guards the parser itself: a refactor that breaks the regex would otherwise
    // make every assertion below pass vacuously.
    expect(routes.length).toBeGreaterThan(500);
  });

  it('exposes no route that is neither authenticated nor intentionally public', () => {
    const exposed = routes
      .filter((r) => !r.guarded && !r.declaredPublic)
      .filter((r) => !PUBLIC_PREFIXES.some(([re]) => re.test(r.path)));

    const report = exposed.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('keeps user profile and address routes owner-scoped', () => {
    // The specific regression: these were readable and writable by anyone.
    const src = codeOf('user.controller.ts');
    expect(src).toMatch(
      /@UseGuards\(JwtAuthGuard, ResourceOwnershipGuard\)\s*\n@Controller\('users'\)/,
    );
    for (const route of [
      "@Get(':userId/profile')",
      "@Put(':userId/profile')",
      "@Get(':userId/addresses')",
      "@Post(':userId/addresses')",
      "@Put(':userId/addresses/:addressId')",
      "@Delete(':userId/addresses/:addressId')",
    ]) {
      const at = src.indexOf(route);
      expect(at).toBeGreaterThan(-1);
      // The ownership decorator must sit on the handler, not merely in the file.
      expect(src.slice(at, at + 200)).toContain("@ResourceOwner({ paramKey: 'userId' })");
    }
  });

  it('keeps the GDPR routes subject-scoped, with processing admin-only', () => {
    // The specific regression: twelve routes over another person's consents,
    // data export and erasure, reachable by anyone.
    const src = stripComments(
      fs.readFileSync(path.join(LIBS, 'gdpr', 'src', 'gdpr.controller.ts'), 'utf8'),
    );
    expect(src).toMatch(
      /@UseGuards\(JwtAuthGuard, RolesGuard, ResourceOwnershipGuard\)\s*\n@Controller\('gdpr'\)/,
    );
    for (const route of [
      "@Get('consent/:userId')",
      "@Post('consent/:userId/grant')",
      "@Post('consent/:userId/revoke')",
      "@Get('consent/:userId/check/:consentType')",
      "@Post('export/:userId')",
      "@Post('erasure/:userId')",
    ]) {
      const at = src.indexOf(route);
      expect(at).toBeGreaterThan(-1);
      // On the handler itself, directly below the verb.
      expect(src.slice(at, at + 120)).toContain('@ResourceOwner(SUBJECT_ONLY)');
    }
    for (const route of [
      "@Post('export/:requestId/process')",
      "@Post('erasure/:requestId/process')",
      "@Get('compliance/dashboard')",
    ]) {
      const at = src.indexOf(route);
      expect(at).toBeGreaterThan(-1);
      expect(src.slice(at, at + 120)).toContain('@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)');
    }
    // The request-scoped routes carry no user id in the URL; each must ask.
    for (const route of [
      "@Get('export/:requestId/status')",
      "@Get('export/:requestId/download')",
      "@Get('erasure/:requestId/status')",
    ]) {
      const at = src.indexOf(route);
      expect(at).toBeGreaterThan(-1);
      expect(src.slice(at, at + 700)).toContain('this.assertMayAccess(');
    }
  });

  it('does not accept a hard-coded partner OTP outside an explicit dev opt-in', () => {
    const src = codeOf('partner.controller.ts');
    // The bypass may exist, but only behind the flag — never as a bare compare.
    expect(src).not.toMatch(/if\s*\(\s*body\.otp\s*!==\s*'5566'\s*&&/);
    expect(src).toContain("process.env.PARTNER_DEV_OTP === 'true'");
    expect(src).toContain("process.env.NODE_ENV !== 'production'");
  });

  it('issues a signed partner token rather than a placeholder string', () => {
    const src = codeOf('partner.controller.ts');
    expect(src).not.toContain('mock-jwt-token-for-partner-auth');
    expect(src).not.toContain('mock-refresh-token-placeholder');
    expect(src).toMatch(/this\.jwtService\.sign\(/);
  });
});
