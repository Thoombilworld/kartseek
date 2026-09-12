import * as fs from 'fs';
import * as path from 'path';
import {
  HTTP,
  stripComments,
  classBlocks,
  controllerFiles,
} from './spec-helpers/controller-source';

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
 *
 * The comment-stripper and the controller-locator are shared with
 * `admin-market-scope.regression.spec.ts` (`./spec-helpers/controller-source`)
 * — this spec used to carry its own, older copies of both, and each had the
 * exact fault that spec's own history records: a naive
 * `.replace(/\/\*[\s\S]*?\*\//g, '')`-then-line-comment stripper a regex
 * literal or a `//` inside a string can corrupt (used below in `codeOf()` and
 * for the GDPR file), and a "first `export class` in the file" locator that
 * takes the wrong class when an exported DTO sits above the real controller,
 * or only the first of two controllers sharing one file
 * (`static-pages.controller.ts`'s shape) — silently, the same way a lost
 * `@Controller`/`@Roles` block always fails here: not a parse error, just
 * routes the scan never saw.
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
  [
    // Two routes, not the whole prefix. `/^\/geo\//` allowlisted
    // `GeoSecurityController`'s six `/geo/admin/*` routes as well — the event
    // log, the rule set, the IP whitelist and its two writes — so this spec
    // would not have failed even if their per-route `JwtAuthGuard` were
    // deleted, and it never noticed that none of them declared a role
    // (whole-branch review, finding A-2). The admin six are now
    // SUPER_ADMIN + `security.manage`, and the pre-login surface is named.
    /^\/geo\/(check|verify)/,
    'pre-login geo/VPN check and the GPS-vs-IP location check',
  ],
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
  [
    /^\/pages\//,
    // `PublicPagesController` — the second controller in
    // `static-pages.controller.ts`, after `AdminStaticPagesController`. The
    // old "first `export class` in the file" locator never reached it, so
    // this route sat unauthenticated AND unreported — it happens to be
    // genuinely public (`GET /pages/:slug` serves only published CMS pages),
    // but the gap in the spec, not just the route, was the finding.
    'published CMS pages, customer-facing — the same content /static-pages serves the admin console',
  ],
  [/^\/users\/health/, 'liveness probe'],
  [/^\/users\/partner\/register/, 'partner sign-up'],
];

interface Route {
  file: string;
  verb: string;
  path: string;
  guarded: boolean;
  declaredPublic: boolean;
  /** True when the class block or the route block carries @Roles(...) with an admin role. */
  adminRole: boolean;
}

/**
 * Source with comments removed.
 *
 * The assertions below search for the *old* insecure code, and the fixes
 * deliberately quote that code in their explanatory comments — so a naive
 * `toContain` matches the very prose describing the fix. Strip comments first so
 * these test what executes, not what is documented. `stripComments` is the
 * shared, regex-literal-aware scanner — see the module docstring.
 */
function codeOf(file: string): string {
  return stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8'));
}

const ADMIN_ROLE = /@Roles\([^)]*(UserRole\.(SUPER_ADMIN|ADMIN)|'(SUPER_ADMIN|ADMIN)')/;
/**
 * An `admin` path SEGMENT — the same expression `ADMIN_SEGMENT` holds in
 * `admin-market-scope.regression.spec.ts`, deliberately. The two specs measure
 * different things about the same set of routes, and a route that one of them
 * counts as administrative and the other does not is how thirteen unrolled
 * admin routes stayed green in both.
 */
const ADMIN_SEGMENT = /(^|\/)admin(\/|$)/;
/** The base path: `@Controller('x')` and the doubled-mount `@Controller(['x', …])`. */
const BASE = /@Controller\(\s*\[?\s*['"`]([^'"`]*)['"`]/;
const CONTROLLER_DECORATOR = /@Controller\(/;

function collectRoutes(): Route[] {
  const routes: Route[] = [];

  for (const full of [...controllerFiles(CONTROLLERS), ...controllerFiles(LIBS)]) {
    const file = path.relative(path.join(LIBS, '..'), full).split(path.sep).join('/');
    // Stripped first, same as the market-scope scan: an unstripped file reads a
    // commented-out `@UseGuards`/`@Roles` as live code (a false negative for
    // this spec — a hole it would never report) and a class-locating regex can
    // be fooled by a decorator or a route path that only appears in prose.
    const src = stripComments(fs.readFileSync(full, 'utf8')).split('\n');

    // One region per class — not "everything above the first `export class`",
    // which took the wrong class when a DTO was exported above the controller
    // and missed the second controller in a two-controller file entirely.
    for (const cls of classBlocks(src)) {
      if (!CONTROLLER_DECORATOR.test(cls.head)) continue;

      // A controller may declare several prefixes (`@Controller(['loyalty', 'api/loyalty'])`);
      // the first one is canonical and is the path checked here.
      const base = (cls.head.match(BASE) || [])[1] ?? '';
      const classGuarded = /@UseGuards\([^)]*JwtAuth/.test(cls.head);
      const classPublic = /@Public\(\)/.test(cls.head);
      const classAdminRole = ADMIN_ROLE.test(cls.head);

      for (let i = cls.from; i < cls.to; i++) {
        const m = src[i].match(HTTP);
        if (!m) continue;

        let a = i;
        while (a > cls.from && /^\s*(@|\))/.test(src[a - 1])) a--;
        let b = i;
        while (b < cls.to - 1 && !/\(.*\)\s*[:{]/.test(src[b]) && b - i < 15) b++;
        const block = src.slice(a, b + 1).join('\n');

        const sub = m[2] ?? m[3] ?? m[4] ?? '';
        routes.push({
          file,
          verb: m[1].toUpperCase(),
          path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
          guarded: classGuarded || /@UseGuards\([^)]*JwtAuth/.test(block),
          declaredPublic: classPublic || /@Public\(\)/.test(block),
          adminRole: classAdminRole || ADMIN_ROLE.test(block),
        });
      }
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

  /**
   * This spec and `admin-market-scope.regression.spec.ts` now share one
   * comment-stripper and one controller-locator (`./spec-helpers/controller-
   * source`) — a route either scan drops is a route BOTH would drop, silently.
   * This is that spec's own tripwire (`it('sees every route decorator it
   * counts…')`), ported: every `@Get/@Post/@Put/@Patch/@Delete/@All(` in the
   * raw source sits inside some `@Controller`-decorated class's scanned range,
   * or this count and `routes.length` disagree — which is exactly the shape of
   * the old fault (a `@Controller` swallowed by a phantom comment, or a second
   * controller in a file the locator never reached) making itself visible
   * again, here, instead of only in the other spec.
   */
  it('agrees with the market-scope regression on how many routes the raw source declares', () => {
    const DECLARED = /^[ \t]*@(?:Get|Post|Put|Patch|Delete|All)\(/gm;
    let declared = 0;
    for (const full of [...controllerFiles(CONTROLLERS), ...controllerFiles(LIBS)]) {
      declared += (fs.readFileSync(full, 'utf8').match(DECLARED) ?? []).length;
    }
    expect(routes.length).toBe(declared);
  });

  it('exposes no route that is neither authenticated nor intentionally public', () => {
    const exposed = routes
      .filter((r) => !r.guarded && !r.declaredPublic)
      .filter((r) => !PUBLIC_PREFIXES.some(([re]) => re.test(r.path)));

    const report = exposed.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('requires an admin role on every route with an admin path segment', () => {
    // A JwtAuthGuard alone admits any signed-in customer. /admin/security was
    // exactly that: authenticated, unrolled, and able to ban IPs.
    //
    // `startsWith('/admin')` was too narrow, and the same width as the market-
    // scope collector's old role-only filter: it saw nothing under
    // `/hotels/admin/*` (seven routes, including approve and suspend) or
    // `/geo/admin/*` (six, including a rule rewrite and an IP whitelist), all
    // of them reachable by any authenticated customer. The two specs now agree
    // on one rule — an `admin` SEGMENT anywhere in the path — which is why
    // `ADMIN_SEGMENT` here and in `admin-market-scope.regression.spec.ts` are
    // the same expression. If one of them is widened again, widen both.
    const unrolled = routes.filter((r) => ADMIN_SEGMENT.test(r.path) && !r.adminRole);
    const report = unrolled.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
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
      // SUPER_ADMIN only, not a global ADMIN, as of R12 leftover (b): personal
      // data processing is a platform-wide act with no market column anywhere
      // in libs/gdpr.
      expect(src.slice(at, at + 120)).toContain(
        "@Roles(UserRole.SUPER_ADMIN, 'perm:system.settings')",
      );
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
