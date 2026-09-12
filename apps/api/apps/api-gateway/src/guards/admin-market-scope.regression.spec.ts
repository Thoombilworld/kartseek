import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  HTTP,
  stripComments,
  classBlocks,
  controllerFiles,
} from './spec-helpers/controller-source';

/**
 * Admin market-scope regression.
 *
 * Every route an admin can reach must resolve the caller's market before it
 * reads or writes a row. This spec walks the gateway's controllers and fails on
 * any admin-reachable route whose handler never asks the question.
 *
 * **A route is an ADMIN route when it says so, not when its file is called
 * `admin-something`.** The filter this replaced selected *filenames* —
 * `/^(admin-.*|ddos-admin)\.controller\.ts$/` — which admitted 13 files and 365
 * routes, all of them passing, and never looked at the 206 admin-reachable
 * routes in the other 12 controllers: `seller-marketplace` (111), `marketplace`
 * (22), `seller` (17), `grocery` (13), `taxi` (11), `pharmacy` (7), `payment`
 * (6), `upload` (5), `doctor` (4), `static-pages` (4), `region` (3) and `gdpr`
 * (3). Every P0 cross-region vector in the 2026-09-12 audit lived in that blind
 * spot, and this spec was green for the whole time they were open (AUD2-066).
 *
 * The contract for every later plan: a route is in scope here when its class
 * block or its own handler block carries `@Roles(...)` naming `UserRole.ADMIN`
 * or `UserRole.SUPER_ADMIN`, **or** when its full path carries an `admin`
 * segment (`/admin/…`, `/<module>/admin/…`), whatever the file is called. A new
 * admin route in a brand-new controller is covered the moment it is written —
 * no registration step, no filename convention.
 *
 * The path arm exists because the role arm has its own blind spot, and the
 * whole-branch review found eighteen routes sitting in it: a route that
 * declares NO `@Roles` was dropped before any assertion ran, so the gate was
 * green while `PUT /hotels/admin/hotels/:id/suspend`, `POST /geo/admin/rules`,
 * `POST /geo/admin/whitelist` and `POST /payments/refund` were reachable by any
 * authenticated customer. A route collected with no role at all is an offender
 * in its own right ("no role gate"), not an exemption.
 *
 * If this fails on a route you added, one of these is true:
 *   • it touches a row that has a market → resolve it (`this.scopeOf(req, …)`)
 *     and forward `scope` to the service, which asserts it;
 *   • its target genuinely has no market dimension → `@GlobalEntity(reason)`,
 *     reads only;
 *   • it is a global write → call `refuseLockedAdmin(req, …)` so a region-locked
 *     caller is refused rather than silently editing every market.
 */

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
/**
 * `api-gateway.module.ts:250` imports `GdprModule`, so `libs/gdpr`'s controller
 * is mounted on the same gateway under the same rule — and it holds three
 * `@Roles(ADMIN, SUPER_ADMIN)` routes (export processing, erasure processing and
 * the compliance dashboard) that no filename filter would ever have reached.
 * `route-exposure.regression.spec.ts` already scans this root for the same
 * reason; a scan of `controllers/` alone is not a scan of the gateway.
 */
const LIBS = path.join(__dirname, '..', '..', '..', '..', 'libs');

/**
 * Every route decorator that sits at the start of a line in the **raw** source.
 * Comment bodies start with `//` or `*`, so this counts declarations and not
 * prose — and, unlike a count taken after comment stripping, it stays honest
 * when the stripper itself loses code. That is not hypothetical: the previous
 * stripper removed block comments first, so the `//` line comment at
 * `admin-seo.controller.ts:64` (which mentions `/admin/seo/*`) opened a phantom
 * block comment that swallowed the `@Controller` and five of that file's six
 * routes. Declared and parsed both fell together, the counter stayed balanced,
 * and the scan quietly skipped them.
 */
const DECLARED = /^[ \t]*@(?:Get|Post|Put|Patch|Delete|All)\(/gm;
// `refuseLockedAdmin(` counts: it reads `marketScopeOf(req)` itself and refuses
// a region-locked caller outright, which is how a route whose target has no
// market dimension yet resolves the caller's scope. It is not an exemption —
// a global admin still passes, and the denial is logged like any other.
const SCOPED =
  /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(|refuseLockedAdmin\(/;
const GLOBAL = /@GlobalEntity\(/;
const ADMIN_ROLE =
  /@Roles\([^)]*(?:UserRole\.(?:SUPER_ADMIN|ADMIN)|'(?:SUPER_ADMIN|ADMIN)'|"(?:SUPER_ADMIN|ADMIN)")/;
/**
 * An `admin` PATH segment — `/admin/...` or `/<module>/admin/...`.
 *
 * The role filter alone could not see a route that declares no role at all,
 * and three clusters of exactly that shape were live on the gateway when the
 * whole-branch review found them: seven `/hotels/admin/*` (including approve
 * and suspend), six `/geo/admin/*` (including a rule rewrite and an IP
 * whitelist) and five on `payment.controller.ts` (including
 * `POST /payments/refund`). Every one was invisible here, because
 * `parseController` dropped a route with no `@Roles` naming ADMIN before any
 * assertion ran — the gate green-lit `PUT /hotels/admin/hotels/:id/suspend`.
 *
 * A path is the second way a route says it is administrative, and it is the
 * one a forgotten decorator cannot erase. Collecting on it too means the
 * missing decorator itself becomes the finding (see the "no role gate" test).
 */
const ADMIN_SEGMENT = /(^|\/)admin(\/|$)/;
/** Any `@Roles(...)` at all, whatever it names — the "no role gate" test's input. */
const ANY_ROLE = /@Roles\(/;
/**
 * THE THIRD SHAPE, AND WHY IT IS NOT A GATE HERE.
 *
 * `payment.controller.ts`'s five (refund, two invoice reads, invoice pdf,
 * invoice void) had no `admin` segment in their paths and no `@Roles` of their
 * own, inside a class that binds `RolesGuard` — so neither arm above sees them,
 * and the guard returned `true` for exactly those five while their six
 * settlement neighbours were gated (`roles.guard.ts:32-34`).
 *
 * "Every route in a `RolesGuard`-bound class declares a role" was measured as a
 * candidate rule and is not one: it reports 80 routes, almost all of them
 * legitimate — `restaurant.controller.ts`'s storefront and cart surface,
 * `payment.controller.ts`'s customer payment routes, `libs/gdpr`'s nine
 * subject-scoped routes (which authorise on `@ResourceOwner` rather than on a
 * role) and `POST /upload/review-image`. A gate whose waiver list is 80 entries
 * long is a filename filter with extra steps.
 *
 * So the five are pinned where their shape is legible instead:
 * `controllers/payment-admin-gate.spec.ts` reads this controller's source and
 * asserts each of the five carries an admin role, a `perm:` key and a scope
 * call; `route-exposure.regression.spec.ts` holds the `/admin`-path rule.
 */
/** Every `@Roles(...)` argument list, so a form this scan cannot read can fail. */
const ROLES_CALL = /@Roles\(([^)]*)\)/g;
const CONTROLLER = /@Controller\(/;
/** The base path: `@Controller('x')` and the doubled-mount `@Controller(['x', …])`. */
const BASE = /@Controller\(\s*\[?\s*['"`]([^'"`]*)['"`]/;

/**
 * Controllers whose class-level guard performs the market check itself, so the
 * handler bodies legitimately carry no scope call. One entry; an `it` below
 * reads that guard's source to prove the claim, and two more pin which routes
 * inside such a class the guard can really scope (see `guardCanScope`). An
 * entry here is a claim about code, not a way to be excused from the rule.
 */
const GUARD_SCOPED: Array<{ bound: RegExp; guard: string; file: string; why: string }> = [
  {
    bound: /@UseGuards\([^)]*SellerOwnershipGuard/,
    guard: 'SellerOwnershipGuard',
    file: 'seller-ownership.guard.ts',
    why: 'resolves the seller and calls assertRecordInScope for a locked admin (R1)',
  },
];

/**
 * The params `SellerOwnershipGuard` resolves as a seller id, in its own order
 * (`seller-ownership.guard.ts:19`: `const SELLER_PARAMS = ['sellerId', 'id']`).
 * An `it` below fails if that list changes.
 */
const SELLER_PARAMS = [':sellerId', ':id'] as const;

/** The path segments a route adds after its controller's base path. */
function segmentsAfterBase(base: string, routePath: string): string[] {
  const all = routePath
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean);
  const skip = base
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean).length;
  return all.slice(skip);
}

/**
 * Whether the guard named in GUARD_SCOPED can actually scope this route.
 *
 * `canActivate` returns `true` without checking anything when the request
 * carries none of its params (`seller-ownership.guard.ts:91` — "No seller in
 * the path — nothing object-level to authorise here"), and when it does find
 * one it looks that id up in the `sellers` table and asserts *that seller's*
 * market. So a class-level binding is not a blanket exemption; three shapes are
 * covered and no others:
 *
 *   • the path carries `:sellerId`, the guard's dedicated param — it resolves
 *     that seller and asserts its market;
 *   • the path carries a single `:id` directly after the base path
 *     (`GET /seller/:id/wallet`) — the class's own resource, so the `id` the
 *     guard reads really is a seller id;
 *   • the path names no row at all (`GET /seller/orders`) — the subject is the
 *     caller's own account from the JWT, so there is no other market's record to
 *     reach.
 *
 * Anything else is **not** guard-scoped, even inside a guard-bound class. Four
 * routes in `seller.controller.ts` are exactly that case — `PUT orders/:id/
 * status`, `PUT products/:id`, `PATCH products/:id/stock`, `PATCH listings/:id`
 * — where `:id` is an order, product or listing id. The guard still reads
 * `request.params.id`, looks it up as a seller, misses, and
 * `assertRecordInScope(req, null, …)` denies a region-locked admin
 * (`market-scope.ts:76-78`: a `null` owner never equals a locked scope). That
 * fails closed, which is why nothing leaks today — but it is a lookup miss, not
 * a market check on the row the route actually touches, so those four sit in
 * the exception list with that reason rather than being waved through here.
 *
 * 124 routes are exempt on 2026-09-12: 110 carry `:sellerId`, 13 carry no param
 * at all, and one is `GET /seller/:id/wallet`.
 */
function guardCanScope(base: string, routePath: string): boolean {
  const rest = segmentsAfterBase(base, routePath);
  const params = rest.filter((s) => s.startsWith(':'));
  if (params.includes(':sellerId')) return true;
  if (!params.length) return true;
  return params.length === 1 && rest[0] === ':id';
}

/**
 * Routes that are market-free by nature. Anything else an admin can reach must
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

/**
 * Admin routes that are still unscoped, each one named in full, with the reason
 * and the plan that owns the fix.
 *
 * This is not an allowlist. Every entry is an exact verb-and-path pair, it says
 * why the route is still open and who is fixing it, the `it` below fails the
 * moment an entry stops describing a real unscoped route, and a second `it`
 * holds the whole set against `EXCEPTION_CENSUS` — so a route that gets scoped,
 * renamed or deleted forces its entry out of this file, and a new hole cannot be
 * swapped in under cover of the old one's slot.
 *
 * 31 entries on 2026-09-12, after tasks R1–R7 and R10 of the regional-integrity
 * plan:
 *
 *   • **22 are `@Roles(UserRole.SUPER_ADMIN)` only** — no region-locked admin
 *     reaches them, because a super admin is global by definition. They are
 *     listed anyway because the rule is that a route proves it considered the
 *     market, and a locked super admin would otherwise leak silently.
 *   • **5 are reachable by a region-locked `ADMIN` with no check at all**,
 *     marked REACHABLE, and are the priority: `POST /upload/delivery-proof`,
 *     `PUT /marketplace/answers/:answerId/accept` and the three GDPR routes.
 *   • **4 are reachable but fail closed** — the `seller.controller.ts` routes
 *     whose `:id` SellerOwnershipGuard reads as a seller id and does not find,
 *     so a locked admin is refused rather than filtered. Nothing leaks; the
 *     capability is simply missing.
 */
const DEFERRED: Array<{ verb: string; path: string; owner: string; why: string }> = [
  // ── TAXI plan (D2) ────────────────────────────────────────────────────────
  // `/taxi/admin/*` is a second taxi admin surface beside the scoped
  // `/admin/taxi/*` (38 routes, all scoped). It cannot be deleted the way Task 5
  // deleted restaurant's dead admin surface: it has live callers —
  // `packages/shared-mobile/lib/core/api/api_client.dart:209-210` asks for
  // `/taxi/admin/dashboard` and `/taxi/admin/vendors` — so D2 has to scope it,
  // and the mobile client keeps working while it does. SUPER_ADMIN-only today.
  {
    verb: 'GET',
    path: '/taxi/admin/dashboard',
    owner: 'TAXI plan (D2)',
    why: 'second taxi admin surface; live Dart caller (api_client.dart:209)',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/vendors',
    owner: 'TAXI plan (D2)',
    why: 'second taxi admin surface; live Dart caller (api_client.dart:210)',
  },
  {
    verb: 'POST',
    path: '/taxi/admin/vendors/:id/approve',
    owner: 'TAXI plan (D2)',
    why: 'vendor approval on the unscoped taxi admin surface',
  },
  {
    verb: 'POST',
    path: '/taxi/admin/vendors/:id/reject',
    owner: 'TAXI plan (D2)',
    why: 'vendor rejection on the unscoped taxi admin surface',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/drivers',
    owner: 'TAXI plan (D2)',
    why: 'driver list on the unscoped taxi admin surface',
  },
  {
    verb: 'POST',
    path: '/taxi/admin/drivers/:id/approve',
    owner: 'TAXI plan (D2)',
    why: 'driver approval on the unscoped taxi admin surface',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/fare-rules',
    owner: 'TAXI plan (D2)',
    why: 'fare rules are per market; AUD2-018/019 is the same root cause',
  },
  {
    verb: 'POST',
    path: '/taxi/admin/fare-rules',
    owner: 'TAXI plan (D2)',
    why: 'fare-rule write with no market — prices every market off one card',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/sos',
    owner: 'TAXI plan (D2)',
    why: 'SOS alerts carry a rider location; unscoped on this surface',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/disputes',
    owner: 'TAXI plan (D2)',
    why: 'disputes list on the unscoped taxi admin surface',
  },
  {
    verb: 'GET',
    path: '/taxi/admin/audit-logs',
    owner: 'TAXI plan (D2)',
    why: 'audit trail on the unscoped taxi admin surface',
  },

  // ── REGIONAL follow-up (this plan, R8 Step 3 — descoped) ──────────────────
  // Task 8's brief assigned the doctor, upload and region fixes to this task.
  // The coordinator then narrowed R8 to the spec file alone (ledger: "Task 8
  // (R8): … regression collector widening; only the spec file"), so they needed
  // a follow-up dispatch. R12 closed all eleven: the three doctor status writes
  // (`this.scopeOf` + `assertInMarket`/`refuseUnattributable` resolved through
  // the clinic, since `hospitals` carries no market column at all), the three
  // region registry reads (`@GlobalEntity`), and the five uploads (the resolved
  // market stamped on the storage path). Only the MODULES-owned appointments
  // route below is left from R8 Step 3's original list.

  // ── MODULES plan ──────────────────────────────────────────────────────────
  {
    verb: 'GET',
    path: '/doctor/admin/appointments',
    owner: 'MODULES plan',
    why: 'no handler exists in doctor-service (plan §2(a) row 37) — the route 503s; it must still send scope when the handler lands',
  },

  // ── MODULES M1 / CONSOLE ──────────────────────────────────────────────────
  // The four `seller.controller.ts` routes where `:id` is an order, product or
  // listing rather than a seller. SellerOwnershipGuard reads `params.id`
  // regardless, looks it up in `sellers`, misses, and assertRecordInScope(req,
  // null, …) denies a region-locked admin — so they fail closed and nothing
  // leaks. They are listed rather than exempted because a lookup miss is not a
  // market check on the row the route touches: a locked admin (and, on the same
  // path, a seller whose own order id is read as a seller id) is refused instead
  // of filtered. See guardCanScope() above.
  {
    verb: 'PUT',
    path: '/seller/orders/:id/status',
    owner: 'MODULES M1/CONSOLE',
    why: 'guard fails closed (denies locked admins) — real filter owned by MODULES M1/CONSOLE',
  },
  {
    verb: 'PUT',
    path: '/seller/products/:id',
    owner: 'MODULES M1/CONSOLE',
    why: 'guard fails closed (denies locked admins) — real filter owned by MODULES M1/CONSOLE',
  },
  {
    verb: 'PATCH',
    path: '/seller/products/:id/stock',
    owner: 'MODULES M1/CONSOLE',
    why: 'guard fails closed (denies locked admins) — real filter owned by MODULES M1/CONSOLE',
  },
  {
    verb: 'PATCH',
    path: '/seller/listings/:id',
    owner: 'MODULES M1/CONSOLE',
    why: 'guard fails closed (denies locked admins) — real filter owned by MODULES M1/CONSOLE',
  },
];

/**
 * The exception list as a census: every entry, by verb and path, sorted.
 *
 * A length cap alone lets one entry be swapped for another — delete a fixed
 * route, add a freshly-introduced unscoped one, and the count still matches.
 * Asserting the exact set means any change to `DEFERRED`, in either direction,
 * has to be made here too and shows up in review as what it is: 31 known holes
 * on 2026-09-12, and the only legitimate edit is a deletion from both places.
 */
const EXCEPTION_CENSUS: readonly string[] = [
  'GET /doctor/admin/appointments',
  'GET /taxi/admin/audit-logs',
  'GET /taxi/admin/dashboard',
  'GET /taxi/admin/disputes',
  'GET /taxi/admin/drivers',
  'GET /taxi/admin/fare-rules',
  'GET /taxi/admin/sos',
  'GET /taxi/admin/vendors',
  'PATCH /seller/listings/:id',
  'PATCH /seller/products/:id/stock',
  'POST /taxi/admin/drivers/:id/approve',
  'POST /taxi/admin/fare-rules',
  'POST /taxi/admin/vendors/:id/approve',
  'POST /taxi/admin/vendors/:id/reject',
  'PUT /seller/orders/:id/status',
  'PUT /seller/products/:id',
];

/**
 * Admin paths that declare NO role at all, each one named in full.
 *
 * Separate from `DEFERRED` on purpose: that list holds routes an admin reaches
 * *legitimately* and which do not yet resolve a market. This one holds routes
 * with no authorisation at all — any signed-in customer reaches them — which is
 * a different and worse fault, and it is the one the role-only collector could
 * not see. An entry needs an `owner`, because unlike a missing market predicate
 * there is no honest reason to leave one open: the only defensible entry is a
 * route somebody is deleting this week.
 *
 * **Empty on 2026-09-12**, after the final fix wave closed all eighteen:
 * `hotel.controller.ts` (four deleted in favour of their scoped
 * `/admin/hotel/*` twins, three role-gated and scoped),
 * `geo-security.controller.ts` (six `SUPER_ADMIN` + `security.manage`) and
 * `payment.controller.ts` (five `ADMIN`/`SUPER_ADMIN` with a finance or refund
 * key). It is pinned empty by `NO_ROLE_GATE_CENSUS`, so the next one has to be
 * argued for in review rather than added quietly.
 */
const NO_ROLE_GATE: Array<{ verb: string; path: string; owner: string; why: string }> = [];

/** The same census discipline as `EXCEPTION_CENSUS`: an exact set, so a swap shows. */
const NO_ROLE_GATE_CENSUS: readonly string[] = [];

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

interface AdminRoute {
  /** Basename; asserted unique across the scanned roots. */
  file: string;
  verb: string;
  path: string;
  scoped: boolean;
  global: boolean;
  /** The route or its class declares an ADMIN / SUPER_ADMIN role. */
  adminRole: boolean;
  /**
   * The route or its class declares **some** `@Roles(...)`, whatever it names.
   * `false` is the "no role gate" offence: an admin path behind
   * `JwtAuthGuard` alone, reachable by any signed-in customer.
   */
  anyRole: boolean;
  /** Collected because its path carries an `admin` segment, not because of a role. */
  byPath: boolean;
  /** Its class binds a guard that does the market check, and can do it here. */
  guardScoped: boolean;
}

// `stripComments` and `classBlocks` now live in `./spec-helpers/controller-source`
// (imported above), shared with `route-exposure.regression.spec.ts` — see that
// module's docstring for why the two specs used to drift on exactly this code.

interface Parsed {
  routes: AdminRoute[];
  /** Route decorators in the raw file against route lines the scan reached. */
  declared: number;
  parsed: number;
  /** `@Roles(...)` argument lists this scan cannot decide (spread, bare const). */
  undecidable: string[];
}

/** Parse one controller file. Takes text, so the fixtures below can use it too. */
function parseController(file: string, text: string): Parsed {
  const joined = stripComments(text);
  const src = joined.split('\n');
  const routes: AdminRoute[] = [];
  let parsed = 0;
  for (const cls of classBlocks(src)) {
    if (!CONTROLLER.test(cls.head)) continue;
    const classAdminRole = ADMIN_ROLE.test(cls.head);
    const classAnyRole = ANY_ROLE.test(cls.head);
    const guardBound = GUARD_SCOPED.some((g) => g.bound.test(cls.head));
    const base = (cls.head.match(BASE) || [])[1] ?? '';
    const routeLines: number[] = [];
    for (let i = cls.from; i < cls.to; i++) if (HTTP.test(src[i])) routeLines.push(i);
    routeLines.forEach((line, idx) => {
      const m = src[line].match(HTTP)!;
      const nextRoute = idx + 1 < routeLines.length ? routeLines[idx + 1] : cls.to;
      const { start, end } = handlerBlock(src, line, nextRoute);
      const block = src.slice(start, end).join('\n');
      parsed++;
      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      const routePath = ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/');
      // Admin-reachable by EITHER declaration: a role that names ADMIN /
      // SUPER_ADMIN, or an `admin` segment in the full path. The second arm is
      // what makes a missing `@Roles` visible instead of exempting the route
      // from the whole spec — see ADMIN_SEGMENT above.
      const adminRole = classAdminRole || ADMIN_ROLE.test(block);
      const anyRole = classAnyRole || ANY_ROLE.test(block);
      if (!(adminRole || ADMIN_SEGMENT.test(routePath))) return;
      routes.push({
        file,
        verb: m[1].toUpperCase(),
        path: routePath,
        scoped: SCOPED.test(block),
        global: GLOBAL.test(block),
        adminRole,
        anyRole,
        byPath: !adminRole,
        guardScoped: guardBound && guardCanScope(base, routePath),
      });
    });
  }
  // A `@Roles(...)` that names no role this scan recognises and spreads or
  // references something instead could be hiding ADMIN inside a const. One
  // exists today and is decidable — `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN,
  // ...AUDIT_STAFF, 'perm:audit.logs')` — because ADMIN is named inline.
  const undecidable: string[] = [];
  for (const call of joined.matchAll(ROLES_CALL)) {
    const args = call[1];
    if (ADMIN_ROLE.test(`@Roles(${args})`)) continue;
    const opaque = args
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a && !/^['"`]/.test(a) && !/^UserRole\./.test(a));
    if (opaque.length) undecidable.push(`${file}: @Roles(${args.trim()})`);
  }
  return {
    routes,
    declared: (text.match(DECLARED) ?? []).length,
    parsed,
    undecidable,
  };
}

// `controllerFiles` now lives in `./spec-helpers/controller-source` too.

const parserGaps: string[] = [];
const undecidableRoles: string[] = [];
const duplicateNames: string[] = [];

function collect(): AdminRoute[] {
  const out: AdminRoute[] = [];
  const seen = new Map<string, string>();
  for (const full of [...controllerFiles(CONTROLLERS), ...controllerFiles(LIBS)]) {
    const file = path.basename(full);
    const previous = seen.get(file);
    if (previous) duplicateNames.push(`${file}: both ${previous} and ${full}`);
    seen.set(file, full);
    const result = parseController(file, fs.readFileSync(full, 'utf8'));
    out.push(...result.routes);
    undecidableRoles.push(...result.undecidable);
    if (result.declared !== result.parsed) {
      parserGaps.push(
        `${file}: ${result.declared} route decorators declared, ${result.parsed} parsed (multi-line decorator? a route outside any @Controller class?)`,
      );
    }
  }
  return out;
}

// ── Fixtures: the file shapes that have broken this kind of scan before ──────

/** An exported class above the controller — the shape R5 found misparsed. */
const FIXTURE_DTO_ABOVE = `import { Controller, Get } from '@nestjs/common';

export class UploadedFileDto {
  url!: string;
}

@ApiTags('fixture')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('fixture/admin')
export class FixtureAdminController {
  @Get('rows')
  async listRows() {
    return this.svc.rows();
  }
}
`;

/** Two controllers in one file with different bases — `static-pages` today. */
const FIXTURE_TWO_CONTROLLERS = `@Controller('fixture/admin/pages')
@Roles(UserRole.ADMIN)
export class FixtureAdminPagesController {
  @Get('list')
  async list() {
    const { scope } = this.scopeOf(req, undefined, 'pages');
    return scope;
  }
}

@Controller('fixture/pages')
export class FixturePublicPagesController {
  @Get(':slug')
  async read() {
    return 1;
  }

  @Patch(':slug')
  @Roles(UserRole.SUPER_ADMIN)
  async write() {
    return 2;
  }
}
`;

/** A `//` comment mentioning a glob — the phantom block comment. */
const FIXTURE_GLOB_IN_LINE_COMMENT = `// the console asks for /fixture/admin/* here, and that is fine
@Roles(UserRole.ADMIN)
@Controller('fixture/glob')
export class FixtureGlobController {
  @Get('a')
  async a() {
    return this.scopeOf(req, undefined, 'a');
  }
}
`;

/** A class bound to the guard, with all three shapes of route path. */
const FIXTURE_GUARD_SCOPED = `@UseGuards(JwtAuthGuard, RolesGuard, SellerOwnershipGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('fixture/sellers')
export class FixtureSellerController {
  @Get(':sellerId/orders')
  async scopedByGuard() {
    return 1;
  }

  @Get('settings')
  async ownAccount() {
    return 2;
  }

  @Get('campaigns/:campaignId')
  async someoneElsesRow() {
    return 3;
  }
}
`;

/**
 * `seller.controller.ts`'s real shape: a guard-bound class in which `:id` is the
 * seller on one route and an order, product or listing on four others.
 */
const FIXTURE_SELLER_ID_SHAPES = `@UseGuards(JwtAuthGuard, RolesGuard, SellerOwnershipGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('fixture/seller')
export class FixtureSellerIdController {
  @Get(':id/wallet')
  async wallet() {
    return 1;
  }

  @Put('orders/:id/status')
  async orderStatus() {
    return 2;
  }

  @Put('products/:id')
  async updateProduct() {
    return 3;
  }

  @Patch('products/:id/stock')
  async updateStock() {
    return 4;
  }

  @Patch('listings/:id')
  async updateListing() {
    return 5;
  }
}
`;

/**
 * An admin path behind `JwtAuthGuard` alone — the shape the role-only collector
 * dropped. Both routes must be COLLECTED (so the market rule applies to them)
 * and both must be reported as "no role gate".
 */
const FIXTURE_NO_ROLE_GATE = `@UseGuards(JwtAuthGuard)
@Controller('fixture/hotels')
export class FixtureNoRoleGateController {
  @Get('admin/rows')
  async listRows() {
    return 1;
  }

  @Put('admin/rows/:id/suspend')
  async suspendRow() {
    return 2;
  }

  @Get('rooms')
  async publicRooms() {
    return 3;
  }
}
`;

/**
 * Regex literals whose contents look like comments: one ending in `\\/\\/` and
 * one whose character class holds `/*`. Both sit immediately above the class's
 * own `@Roles` and `@Controller`, which the first scanner would have swallowed
 * — silently, because no route decorator is inside the swallowed span.
 */
const FIXTURE_REGEX_LITERAL = `const SCHEME = /^https?:\\/\\//;
const SLASH_OR_STAR = /[/*]/;
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('fixture/regex')
export class FixtureRegexController {
  @Get('rows')
  async rows(@Req() req: any) {
    // No this.send( here on purpose: test/gateway-service-contract.spec.ts
    // greps the repo for gateway commands and would read a fixture's fake one
    // as a real command with no handler.
    const { scope } = this.scopeOf(req, undefined, 'those rows');
    return { scope };
  }

  @Patch('rows/:rowId')
  async write(@Req() req: any) {
    const parts = String(req.body.path).split(/\\/\\//);
    return parts.length / 2;
  }
}
`;

describe('admin market scope regression', () => {
  const routes = collect();
  const files = new Set(routes.map((r) => r.file));

  it('scans every controller and finds the admin routes in all of them', () => {
    // 571 admin-role routes across 25 files on 2026-09-12: 365 in the 13 files
    // the old filename filter admitted, 206 in the 12 it did not, one of which
    // is libs/gdpr's. The floor is deliberately close to the real number: a
    // collector that silently stops seeing a controller drops ~100 routes at a
    // time and must fail here rather than pass with fewer things to check.
    expect(routes.length).toBeGreaterThan(500);
    expect(files.size).toBeGreaterThanOrEqual(22);
    // The blind spot by name, so it cannot come back unnoticed. The four files
    // whose routes this plan's successors may delete outright — taxi, doctor,
    // upload, region — are held instead by the DEFERRED entries below, which
    // fail if their routes disappear.
    for (const f of [
      'seller-marketplace.controller.ts',
      'seller.controller.ts',
      'marketplace.controller.ts',
      'grocery.controller.ts',
      'pharmacy.controller.ts',
      'payment.controller.ts',
      'static-pages.controller.ts',
      'gdpr.controller.ts',
    ]) {
      expect(files.has(f)).toBe(true);
    }
    expect(duplicateNames.join('\n')).toBe('');
  });

  it('resolves a market on every admin route that is not global, guard-scoped or deferred', () => {
    const deferred = new Set(DEFERRED.map((d) => `${d.verb} ${d.path}`));
    const offenders = routes.filter(
      (r) =>
        !r.scoped &&
        !r.global &&
        !r.guardScoped &&
        !GLOBAL_ROUTES.some(([re]) => re.test(r.path)) &&
        !deferred.has(`${r.verb} ${r.path}`),
    );
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('an admin path must declare an admin role — no route ships behind JwtAuthGuard alone', () => {
    // The gap the role-only filter left. `@UseGuards(JwtAuthGuard)` makes a
    // route authenticated, not authorised: the gateway's RolesGuard returns
    // `true` when there is no `@Roles` metadata, so a route with none is open
    // to every signed-in account of every role in every market. Eighteen were
    // live when the whole-branch review found them, four of them writes
    // (approve and suspend a hotel, rewrite a geo rule, whitelist an IP,
    // refund a payment, void an invoice).
    const waived = new Set(NO_ROLE_GATE.map((d) => `${d.verb} ${d.path}`));
    const offenders = routes.filter((r) => !r.anyRole && !waived.has(`${r.verb} ${r.path}`));
    const report = offenders
      .map((r) => `  ${r.verb} ${r.path}   (${r.file}) — no role gate`)
      .join('\n');
    expect(report).toBe('');
  });

  it('holds exactly the no-role-gate waivers the census names, each with an owner', () => {
    const listed = NO_ROLE_GATE.map((d) => `${d.verb} ${d.path}`);
    expect([...new Set(listed)]).toHaveLength(listed.length);
    expect([...listed].sort()).toEqual([...NO_ROLE_GATE_CENSUS].sort());
    // An unowned waiver is an unowned hole. And it must still describe a real
    // route with no role gate, or it outlives the thing it excuses.
    const stale: string[] = [];
    for (const d of NO_ROLE_GATE) {
      if (!d.owner.trim()) stale.push(`  ${d.verb} ${d.path} — a waiver needs an owner`);
      const matches = routes.filter((r) => r.verb === d.verb && r.path === d.path);
      if (matches.length !== 1) {
        stale.push(
          `  ${d.verb} ${d.path} — matches ${matches.length} routes; delete or make exact`,
        );
        continue;
      }
      if (matches[0].anyRole) {
        stale.push(`  ${d.verb} ${d.path} — now role-gated; delete this waiver`);
      }
    }
    expect(stale.join('\n')).toBe('');
  });

  it('collects an admin path with no role at all, and reports it', () => {
    const parsed = parseController('fixture.controller.ts', FIXTURE_NO_ROLE_GATE);
    expect(parsed.declared).toBe(3);
    expect(parsed.parsed).toBe(3);
    // The two admin paths are collected (by path), the storefront route is not.
    expect(
      parsed.routes.map((r) => `${r.verb} ${r.path} admin=${r.adminRole} role=${r.anyRole}`),
    ).toEqual([
      'GET /fixture/hotels/admin/rows admin=false role=false',
      'PUT /fixture/hotels/admin/rows/:id/suspend admin=false role=false',
    ]);
    // And being collected by path means the market rule reaches them too.
    expect(parsed.routes.every((r) => r.byPath && !r.scoped && !r.global)).toBe(true);
  });

  it('every deferred exception still names a real, still-unscoped route', () => {
    // The list may only shrink. An entry whose route has been scoped, renamed or
    // deleted has to leave this file — otherwise the exceptions outlive the holes
    // they describe and the next reader cannot tell which is which.
    const stale: string[] = [];
    for (const d of DEFERRED) {
      const matches = routes.filter((r) => r.verb === d.verb && r.path === d.path);
      if (!matches.length) {
        stale.push(`  ${d.verb} ${d.path} — no such admin route any more; delete this entry`);
        continue;
      }
      if (matches.length > 1) {
        stale.push(
          `  ${d.verb} ${d.path} — matches ${matches.length} routes; make the entry exact`,
        );
        continue;
      }
      const r = matches[0];
      if (r.scoped || r.global || r.guardScoped) {
        stale.push(`  ${d.verb} ${d.path} — now scoped (${r.file}); delete this entry`);
      }
      if (!d.owner.trim() || !d.why.trim()) {
        stale.push(`  ${d.verb} ${d.path} — an exception needs both an owner and a reason`);
      }
    }
    expect(stale.join('\n')).toBe('');
  });

  it('holds exactly the exceptions the census names — no additions, no swaps', () => {
    // Stricter than a length cap, which a swap slips through: the two lists must
    // agree entry for entry, so adding a hole is as visible in review as
    // removing one, and neither can happen by accident.
    const listed = DEFERRED.map((d) => `${d.verb} ${d.path}`);
    expect([...new Set(listed)]).toHaveLength(listed.length);
    expect([...listed].sort()).toEqual([...EXCEPTION_CENSUS].sort());
  });

  it('allows @GlobalEntity on reads only — a write to a global entity must refuse locked admins itself', () => {
    // A locked admin may read taxonomy; a write must call marketScopeOf(req)
    // and refuse. Writes therefore may not carry the marker at all: the SCOPED
    // regex above is what proves they looked at the caller's scope.
    const offenders = routes.filter((r) => r.global && r.verb !== 'GET');
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('every guard named in GUARD_SCOPED really performs the market check', () => {
    // The exemption is a claim about a guard's source. Reading it here is what
    // stops GUARD_SCOPED becoming the new filename filter: a guard that stops
    // calling assertRecordInScope fails this spec, not silently 124 routes.
    const failures: string[] = [];
    for (const g of GUARD_SCOPED) {
      const file = path.join(__dirname, g.file);
      if (!fs.existsSync(file)) {
        failures.push(`${g.guard}: ${g.file} does not exist — was the guard renamed?`);
        continue;
      }
      const src = fs.readFileSync(file, 'utf8');
      if (!/assertRecordInScope\(/.test(src))
        failures.push(`${g.guard}: ${g.why} — but it does not`);
      // guardCanScope() depends on these two lines being what they are: the
      // params it reads as a seller id, and the no-check early return.
      const params = `SELLER_PARAMS = [${SELLER_PARAMS.map((p) => `'${p.slice(1)}'`).join(', ')}]`;
      if (!src.includes(params))
        failures.push(
          `${g.guard}: ${params} is no longer its param list — re-check guardCanScope()`,
        );
      if (!/if \(!sellerId\) return true;/.test(src))
        failures.push(`${g.guard}: the no-param early return changed — re-check guardCanScope()`);
    }
    expect(failures.join('\n')).toBe('');
  });

  it('only exempts a guard-scoped route whose id the guard resolves as a seller', () => {
    const parsed = parseController('fixture.controller.ts', FIXTURE_GUARD_SCOPED);
    expect(parsed.routes.map((r) => `${r.path} ${r.guardScoped}`)).toEqual([
      '/fixture/sellers/:sellerId/orders true',
      '/fixture/sellers/settings true',
      '/fixture/sellers/campaigns/:campaignId false',
    ]);
  });

  it('does not treat an order, product or listing id as a seller id', () => {
    // The real shape of `seller.controller.ts`: one route where `:id` is the
    // seller, four where it is some other row. The guard reads `params.id`
    // either way, looks it up in `sellers`, misses, and denies a locked admin —
    // fail-closed, but not a check on the row the route touches, so the four are
    // offenders here and carry their reason in DEFERRED.
    const parsed = parseController('fixture.controller.ts', FIXTURE_SELLER_ID_SHAPES);
    expect(parsed.routes.map((r) => `${r.verb} ${r.path} ${r.guardScoped}`)).toEqual([
      'GET /fixture/seller/:id/wallet true',
      'PUT /fixture/seller/orders/:id/status false',
      'PUT /fixture/seller/products/:id false',
      'PATCH /fixture/seller/products/:id/stock false',
      'PATCH /fixture/seller/listings/:id false',
    ]);
    // And on the real tree the same four, and only those four, are the
    // guard-bound routes this spec refuses to exempt.
    const bound = routes.filter((r) => r.file === 'seller.controller.ts' && !r.scoped && !r.global);
    expect(bound.filter((r) => !r.guardScoped).map((r) => `${r.verb} ${r.path}`)).toEqual([
      'PUT /seller/orders/:id/status',
      'PUT /seller/products/:id',
      'PATCH /seller/products/:id/stock',
      'PATCH /seller/listings/:id',
    ]);
  });

  it('sees every route decorator it counts — a multi-line decorator must fail here, not vanish', () => {
    expect(parserGaps.join('\n')).toBe('');
  });

  it('can decide, for every @Roles it reads, whether ADMIN is in it', () => {
    // A `@Roles(...ADMIN_ROLES)` would name no role this scan recognises and
    // would drop its route from the whole spec. Name the roles inline instead.
    expect(undecidableRoles.join('\n')).toBe('');
  });

  it('reads the @Controller class, not the first class in the file', () => {
    // An exported DTO above the controller used to take the class block with it,
    // which loses the base path and every class-level decorator (R5's finding on
    // route-exposure.regression.spec.ts).
    const parsed = parseController('fixture.controller.ts', FIXTURE_DTO_ABOVE);
    expect(parsed.declared).toBe(1);
    expect(parsed.parsed).toBe(1);
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.routes[0].path).toBe('/fixture/admin/rows');
    expect(parsed.routes[0].adminRole).toBe(true);
    // And it bites: an admin route with no scope call is reported, not waived.
    expect(parsed.routes[0].scoped).toBe(false);
  });

  it('gives each controller in a two-controller file its own base and roles', () => {
    const parsed = parseController('fixture.controller.ts', FIXTURE_TWO_CONTROLLERS);
    expect(parsed.declared).toBe(3);
    expect(parsed.parsed).toBe(3);
    // The public GET is not an admin route; the second class's own @Roles is.
    expect(parsed.routes.map((r) => `${r.verb} ${r.path} scoped=${r.scoped}`)).toEqual([
      'GET /fixture/admin/pages/list scoped=true',
      'PATCH /fixture/pages/:slug scoped=false',
    ]);
  });

  it('does not let a // comment containing a glob swallow the rest of the file', () => {
    const parsed = parseController('fixture.controller.ts', FIXTURE_GLOB_IN_LINE_COMMENT);
    expect(parsed.routes.map((r) => r.path)).toEqual(['/fixture/glob/a']);
    expect(parsed.declared).toBe(parsed.parsed);
  });

  it('does not read a regex literal as a comment', () => {
    // The class-level @Roles and @Controller sit on the lines after the regexes,
    // so a scanner without regex-literal state loses the whole controller and
    // says nothing: neither route decorator is inside the swallowed span.
    const parsed = parseController('fixture.controller.ts', FIXTURE_REGEX_LITERAL);
    expect(parsed.declared).toBe(2);
    expect(parsed.parsed).toBe(2);
    expect(parsed.routes.map((r) => `${r.verb} ${r.path} scoped=${r.scoped}`)).toEqual([
      'GET /fixture/regex/rows scoped=true',
      'PATCH /fixture/regex/rows/:rowId scoped=false',
    ]);
    // And the literals themselves survive stripping, division included.
    const stripped = stripComments(FIXTURE_REGEX_LITERAL);
    expect(stripped).toContain('/^https?:\\/\\//');
    expect(stripped).toContain('/[/*]/');
    expect(stripped).toContain('parts.length / 2');
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
