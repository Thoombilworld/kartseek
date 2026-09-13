import * as fs from 'fs';
import * as path from 'path';

/**
 * Architectural contract between the API gateway and the microservices.
 *
 * Three failures cost this codebase a great deal and were all invisible at
 * runtime, because the gateway's `send(cmd, payload, fallback)` helpers turned
 * every one of them into a 200 with an empty body:
 *
 *  1. The gateway sent a TCP command no service implemented. 95 of
 *     restaurant.controller.ts's 115 commands were in this state; the storefront
 *     rendered "no restaurants in your area" rather than an error.
 *  2. A literal route was declared after a parameterised sibling, so Nest
 *     captured the literal as a param — `/restaurants/favorites` reached
 *     Postgres as `invalid input syntax for type uuid: "favorites"`.
 *  3. A handler read a payload key the gateway never sends, yielding a
 *     confident empty result — `admin.pharmacy.stores` filtered on an undefined
 *     franchiseId while six stores sat in the table.
 *
 * These are static properties of the source, so they are cheap to assert and
 * there is no reason for them ever to regress. The suite parses the source
 * rather than booting anything: it is a lint with domain knowledge, and runs in
 * about a second.
 *
 * On the baselines below: unimplemented commands are real outstanding work, not
 * a reason to skip the check. Each list is a snapshot that may only shrink —
 * implementing a command and forgetting to remove it from the list is also a
 * failure, so the baseline cannot rot.
 */

const API_ROOT = path.resolve(__dirname, '..', 'apps');
const GATEWAY_CONTROLLERS = path.join(API_ROOT, 'api-gateway', 'src', 'controllers');

/**
 * The extracted vertical backends. Each owns the commands for its module and
 * lives outside `apps/api`, so it has to be listed explicitly — a directory
 * added here is picked up automatically, one added to `modules/` is not.
 */
const MODULES_DIR = path.resolve(__dirname, '..', '..', '..', 'modules');
const MODULE_BACKEND_ROOTS: string[] = fs.existsSync(MODULES_DIR)
  ? fs
      .readdirSync(MODULES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(MODULES_DIR, d.name, 'backend', 'src'))
      .filter((p) => fs.existsSync(p))
  : [];

/** Commands the gateway sends that no service implements yet. May only shrink. */
const UNIMPLEMENTED_COMMANDS: ReadonlySet<string> = new Set([
  // Restaurant — customer surface not yet built service-side
  'add_address',
  'delete_address',
  'list_addresses',
  'update_address',
  'add_favorite',
  'remove_favorite',
  'list_favorites',
  'list_gift_cards',
  'purchase_gift_card',
  'subscribe',
  'list_subscriptions',
  'apply_coupon',
  'remove_coupon',
  'call_waiter',
  'update_customization',
  'get_order_receipt',
  'request_rider',
  // Restaurant — operator surface
  'approve_menu_change',
  'reject_menu_change',
  'get_menu_approvals',
  'get_menu_audit',
  'update_prep_time',
  'update_services',
  'upload_banner',
  'get_quality_score',
  'get_current_payout',
  // Restaurant — admin analytics
  'admin_analytics_cuisines',
  'admin_analytics_orders',
  'admin_analytics_overview',
  'admin_analytics_revenue',
  'admin_bottom_restaurants',
  'admin_top_restaurants',
  'admin_compliance_report',
  'admin_list_restaurants',
  'admin_payout_report',
  // Complaints — implementations exist in taxi-service/marketplace-service but
  // are not reachable from the restaurant client that sends these.
  'escalate_complaint',
  'resolve_complaint',
  'get_complaint',
  'list_complaints',
  // Delivery dispatch — no delivery domain in restaurant-service
  'delivery_accept_task',
  'delivery_arrived',
  'delivery_arrived_customer',
  'delivery_available_tasks',
  'delivery_complete',
  'delivery_earnings',
  'delivery_pickup',
  'delivery_update_location',

  // Admin console, dot-notation. The six admin-* controllers send 65 of these;
  // 23 were wired to methods that already existed. The rest have no
  // implementation — several were deliberately left unwired rather than pointed
  // at a franchise- or geo-scoped method, which would have returned a confident
  // empty list instead of admitting the command is not built.
  //
  // These are the entries this list has always held. It may only SHRINK:
  // commands that become implemented leave, and nothing is ever added here. The
  // 31 orphans that M3's widened extractor made visible are NOT here — they are
  // in `NEWLY_VISIBLE_ORPHANS` below, which is a different list with a different
  // rule and a named owner per group (M3 review, Important 3).
  //
  // The eleven `admin.pharmacy.*` entries that stood here are gone: M3 gave all
  // nineteen of that module's commands a `@MessagePattern`. The seven
  // `admin.restaurant.*` entries are gone for the same reason: M4 gave all
  // seventeen of this one's a handler in
  // `modules/restaurant/backend/src/admin/admin.controller.ts`.
  // `keeps the unimplemented baseline honest` below is what would have failed
  // had either set been left.
  'admin.doctor.appointments',
  'admin.doctor.dashboard',
  'admin.doctor.prescriptions',
  'admin.doctor.reports',
  'admin.doctor.settings',
  'admin.hotel.amenities',
  'admin.hotel.bookings',
  'admin.hotel.dashboard',
  'admin.hotel.get',
  'admin.hotel.list',
  'admin.hotel.pricing',
  'admin.hotel.reports',
  'admin.hotel.reviews',
  'admin.hotel.rooms',
  'admin.hotel.settings',
  'admin.taxi.complaints',
  'admin.taxi.compliance',
  'admin.taxi.dashboard',
  'admin.taxi.fleet',
  'admin.taxi.pricing',
  'admin.taxi.rides',
  'admin.taxi.routes',
  'admin.taxi.settings',
]);

/**
 * Orphans that were ALWAYS orphans and had simply never been visible.
 *
 * ── Why they are not in `UNIMPLEMENTED_COMMANDS` ────────────────────────────
 *
 * That list is a shrink-only snapshot with no owner: nothing may be added to it,
 * ever, because an addition is indistinguishable from someone quietly excusing a
 * newly broken route. M3 added 31 entries to it anyway — legitimately, because
 * they were old orphans the gate had been blind to — and in doing so made the
 * one rule that list has unenforceable by inspection. Separating them restores
 * it: `UNIMPLEMENTED_COMMANDS` above is once again a list that only ever
 * shrinks, and this one is a finite, owned backlog that empties.
 *
 * ── What made them invisible ────────────────────────────────────────────────
 *
 * `readSentCommands`'s pattern for the `this.send('<cmd>', …)` form matched
 * `[a-z0-9_.]+` — no capital letters — so every camelCase command in the six
 * admin controllers was outside this gate entirely: `storeDetail`,
 * `approveProduct`, `verifyLicense`, `updateSettings`, `createCategory`,
 * `approveDriver` and 41 others were neither checked for a handler nor listed
 * anywhere. The gate read as coverage over 47 calls it could not see, which its
 * own docstring calls worse than no gate at all. The class is `[A-Za-z0-9_.]+`
 * as of M3, so the extractor sees all 611 sent commands rather than 564.
 *
 * ── The rule for this list ──────────────────────────────────────────────────
 *
 * Every entry has a named owner and a task that removes it. It may only shrink,
 * like the list above, and — unlike that one — it is finished when it is empty.
 * Nothing may EVER be added here either: a new orphan is a new broken route.
 */
const NEWLY_VISIBLE_ORPHANS: ReadonlySet<string> = new Set([
  // ── doctor → M6 ───────────────────────────────────────────────────────────
  'admin.doctor.approveClinic',
  'admin.doctor.clinicDetail',
  'admin.doctor.createSpecialty',
  'admin.doctor.doctorDetail',
  'admin.doctor.suspendDoctor',
  'admin.doctor.updateSettings',
  'admin.doctor.verifyDoctor',

  // ── hotel → M5 ────────────────────────────────────────────────────────────
  'admin.hotel.bookingDetail',
  'admin.hotel.createAmenity',
  'admin.hotel.moderateReview',
  'admin.hotel.updatePricing',
  'admin.hotel.updateSettings',

  // ── restaurant → M4: EMPTY, and an `it` below keeps it that way ───────────
  //
  // All six of this module's newly visible commands — `approveMenu`,
  // `createCuisine`, `createZone`, `menuApprovals`, `resolveComplaint`,
  // `updateCommissions` — now have a `@MessagePattern` in
  // `modules/restaurant/backend/src/admin/admin.controller.ts`, together with
  // the seven that were visible all along. Seventeen commands, seventeen
  // handlers, nothing deliberately left unhandled.

  // ── taxi → M7 ─────────────────────────────────────────────────────────────
  'admin.taxi.approveDriver',
  'admin.taxi.approvePayout',
  'admin.taxi.approveVendor',
  'admin.taxi.createRoute',
  'admin.taxi.driverDetail',
  'admin.taxi.pendingApprovals',
  'admin.taxi.resolveComplaint',
  'admin.taxi.rideDetail',
  'admin.taxi.suspendVendor',
  'admin.taxi.updatePricing',
  'admin.taxi.updateSettings',
  'admin.taxi.updateSurge',
  'admin.taxi.vendorDetail',
]);

/**
 * The two baselines together — what the orphan check forgives.
 *
 * Unioned at the point of use rather than merged into one constant, so each list
 * keeps its own rule and its own `it`.
 */
const KNOWN_ORPHANS: ReadonlySet<string> = new Set([
  ...UNIMPLEMENTED_COMMANDS,
  ...NEWLY_VISIBLE_ORPHANS,
]);

// Removed 2026-09-01: implemented in the extracted module backends, and only
// still listed because this suite could not see `modules/*/backend`. The
// restaurant home-feed commands live in restaurant-service, the two taxi admin
// commands in taxi-service.

// ── source helpers ──────────────────────────────────────────────────────────

/** Strip comments so a command named in prose is never mistaken for a live call. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full, predicate));
    else if (predicate(entry.name)) found.push(full);
  }
  return found;
}

/** Every `PATTERNS = { KEY: 'cmd' }` entry, so constant references resolve. */
function readPatternConstants(): Map<string, string> {
  const constants = new Map<string, string>();
  for (const file of walk(API_ROOT, (f) => f.endsWith('.ts'))) {
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    if (!/PATTERNS\s*=/.test(source)) continue;
    for (const [, key, cmd] of source.matchAll(/(\w+)\s*:\s*['"`]([\w.\-:]+)['"`]/g)) {
      constants.set(key, cmd);
    }
  }
  return constants;
}

/** Every command any service answers, via @MessagePattern. */
function readHandledCommands(): Set<string> {
  const handled = new Set<string>();

  /**
   * Both homes for a service.
   *
   * Eight verticals were extracted to `modules/<name>/backend` and this scan
   * still only looked in `apps/api/apps`, so their `@MessagePattern` handlers
   * were invisible: it found 94 commands where the gateway sends over 400, and
   * every command owned by a module read as unimplemented. The check that is
   * supposed to catch a gateway calling a pattern nobody serves had, in effect,
   * stopped covering two thirds of the platform.
   */
  const roots = [API_ROOT, ...MODULE_BACKEND_ROOTS];

  for (const root of roots) {
    for (const file of walk(root, (f) => f.endsWith('.ts'))) {
      if (file.includes(`${path.sep}api-gateway${path.sep}`)) continue;
      const source = stripComments(fs.readFileSync(file, 'utf8'));
      for (const [, cmd] of source.matchAll(
        /@MessagePattern\(\s*\{\s*cmd\s*:\s*['"`]([^'"`]+)['"`]/g,
      )) {
        handled.add(cmd);
      }
      for (const [, cmd] of source.matchAll(/@MessagePattern\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
        handled.add(cmd);
      }
    }
  }
  return handled;
}

/** Every command the gateway sends, with the controller that sends it. */
function readSentCommands(constants: Map<string, string>): Map<string, string> {
  const sent = new Map<string, string>();
  const record = (cmd: string, file: string) => {
    if (!sent.has(cmd)) sent.set(cmd, path.basename(file));
  };

  for (const file of walk(path.join(API_ROOT, 'api-gateway'), (f) => f.endsWith('.ts'))) {
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    for (const [, cmd] of source.matchAll(/\{\s*cmd\s*:\s*['"`]([^'"`]+)['"`]\s*\}/g))
      record(cmd, file);
    // The optional quoted argument before the command is the SERVICE LABEL that
    // `sendTo(client, 'Order service', 'admin_list_orders', …)` carries for its
    // 503 message. Without it this regex stopped at the label and captured
    // nothing, so every command sent through the four-argument form —
    // `admin_list_orders`, `admin_get_order`, `admin_list_payments`,
    // `get_pending_refunds` — was invisible to this gate, which stayed green
    // while proving nothing about those routes. A gate that cannot see a call
    // is worse than no gate: it reads as coverage.
    //
    // `[A-Za-z0-9_.]+`, not `[a-z0-9_.]+`. The lower-case-only class could not
    // see a single camelCase command — `admin.pharmacy.storeDetail`,
    // `admin.taxi.approveDriver`, `admin.grocery.updateSettings` and 45 others
    // — so 47 of the 611 commands the gateway sends were absent from `sent`
    // entirely and "no orphans" said nothing whatever about them. Same class of
    // blind spot as the service label above, found the same way: by counting
    // what the extractor saw against what the controllers actually send (M3).
    for (const [, cmd] of source.matchAll(
      /this\.send(?:To\w*)?(?:<[^>]*>)?\(\s*(?:this\.\w+\s*,\s*)?(?:['"`][^'"`]*['"`]\s*,\s*)?['"`]([A-Za-z0-9_.]+)['"`]/g,
    ))
      record(cmd, file);
    for (const [, key] of source.matchAll(/[A-Z_]*PATTERNS\.([A-Z0-9_]+)/g)) {
      const cmd = constants.get(key);
      if (cmd) record(cmd, file);
    }
  }
  return sent;
}

interface DeclaredRoute {
  readonly verb: string;
  readonly routePath: string;
  readonly order: number;
}

interface ControllerBlock {
  readonly basePath: string;
  readonly routes: DeclaredRoute[];
}

/**
 * Split a file into its `@Controller(...)` classes.
 *
 * Route collisions are per-controller, not per-file: `static-pages.controller.ts`
 * legitimately declares `@Get(':slug')` twice, once in `StaticPagesController`
 * and once in `PublicPagesController` under a different base path. Comparing
 * across the whole file reports that as a duplicate when it is not one.
 */
function readControllers(source: string): ControllerBlock[] {
  const decorator = /@Controller\(\s*(?:['"`]([^'"`]*)['"`])?[^)]*\)/g;
  const starts: Array<{ index: number; basePath: string }> = [];
  for (const match of source.matchAll(decorator)) {
    starts.push({ index: match.index ?? 0, basePath: match[1] ?? '' });
  }

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
    return { basePath: start.basePath, routes: readRoutes(source.slice(start.index, end)) };
  });
}

/** Routes in declaration order — the order Nest matches them in. */
function readRoutes(source: string): DeclaredRoute[] {
  const routes: DeclaredRoute[] = [];
  const pattern = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let order = 0;
  for (const match of source.matchAll(pattern)) {
    routes.push({ verb: match[1].toUpperCase(), routePath: match[2] ?? '', order: order++ });
  }
  return routes;
}

/** True when `earlier` captures `later` as a parameter instead of matching it. */
function shadows(earlier: string, later: string): boolean {
  const a = earlier.split('/').filter(Boolean);
  const b = later.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  let sawParamOverLiteral = false;
  for (let i = 0; i < a.length; i++) {
    const isParam = a[i].startsWith(':');
    if (isParam) {
      if (b[i].startsWith(':')) continue; // both params — not shadowing
      sawParamOverLiteral = true; // param swallows a literal
      continue;
    }
    if (a[i] !== b[i]) return false; // different literal — no overlap
  }
  return sawParamOverLiteral;
}

// ── the contract ────────────────────────────────────────────────────────────

describe('gateway ↔ service contract', () => {
  const constants = readPatternConstants();
  const handled = readHandledCommands();
  const sent = readSentCommands(constants);

  it('parses a plausible amount of source', () => {
    // Guards the suite itself: a regex that silently stops matching would make
    // every assertion below pass vacuously, which is how the admin controllers'
    // dot-notation commands went unnoticed for so long.
    expect(sent.size).toBeGreaterThan(400);
    expect(handled.size).toBeGreaterThan(400);
  });

  /**
   * The gate can only fail on a call it can see, and it could not see these.
   *
   * `sendTo(client, 'Order service', 'admin_list_orders', …)` puts a quoted
   * service label between the client and the command, and the extractor above
   * used to stop there — so the four commands the admin money routes depend on
   * were absent from `sent` entirely and "no orphans" said nothing about them.
   * Named here so that if the extractor narrows again, this fails immediately
   * rather than going quietly green; the assertion below then makes a deleted
   * `@MessagePattern` a failure.
   */
  it('sees the commands sent through the labelled four-argument form', () => {
    for (const cmd of [
      'admin_list_orders',
      'admin_get_order',
      'admin_list_payments',
      'get_pending_refunds',
    ]) {
      expect(sent.has(cmd), `${cmd} is sent by the gateway but the extractor missed it`).toBe(true);
      expect(handled.has(cmd), `${cmd} has no @MessagePattern`).toBe(true);
    }
  });

  it('sends no command that a service does not implement', () => {
    const orphans = [...sent.entries()]
      .filter(([cmd]) => !handled.has(cmd))
      .filter(([cmd]) => !KNOWN_ORPHANS.has(cmd))
      .map(([cmd, file]) => `${cmd}  (sent by ${file})`);

    expect(orphans).toEqual([]);
  });

  it('keeps the unimplemented baseline honest', () => {
    // A command that has since been implemented must leave the list, otherwise
    // the baseline slowly stops describing reality. Both lists, one rule: each
    // may only shrink, and an entry that is now handled is the failure.
    const staleEntries = [...KNOWN_ORPHANS].filter((cmd) => handled.has(cmd));

    expect(staleEntries).toEqual([]);
  });

  it('has no restaurant command left in either baseline', () => {
    // M4 gave all seventeen `admin.restaurant.*` commands a `@MessagePattern`.
    // This is the assertion that keeps that true: a restaurant command
    // reappearing in either list would mean a handler was removed and excused
    // rather than replaced. M5-M7 add the same line for their own module as
    // they empty their group of `NEWLY_VISIBLE_ORPHANS`.
    const restaurantEntries = [...KNOWN_ORPHANS].filter((cmd) =>
      cmd.startsWith('admin.restaurant.'),
    );

    expect(restaurantEntries).toEqual([]);
  });

  it('declares literal routes before parameterised siblings', () => {
    const violations: string[] = [];

    for (const file of fs
      .readdirSync(GATEWAY_CONTROLLERS)
      .filter((f) => f.endsWith('.controller.ts'))) {
      const source = stripComments(fs.readFileSync(path.join(GATEWAY_CONTROLLERS, file), 'utf8'));

      for (const controller of readControllers(source)) {
        for (const later of controller.routes) {
          if (later.routePath.split('/').some((segment) => segment.startsWith(':'))) continue;
          const shadowedBy = controller.routes.find(
            (earlier) =>
              earlier.order < later.order &&
              earlier.verb === later.verb &&
              shadows(earlier.routePath, later.routePath),
          );
          if (shadowedBy) {
            violations.push(
              `${file} [${controller.basePath}]: @${later.verb}('${later.routePath}') is unreachable — ` +
                `@${shadowedBy.verb}('${shadowedBy.routePath}') is declared first and captures it`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('registers each gateway route exactly once per verb', () => {
    // Two handlers for one route is silent dead code: Nest keeps the first. A
    // duplicate `@Get(':sellerId/orders')` hid a handler calling an
    // unimplemented command for as long as the registration order held.
    const duplicates: string[] = [];

    for (const file of fs
      .readdirSync(GATEWAY_CONTROLLERS)
      .filter((f) => f.endsWith('.controller.ts'))) {
      const source = stripComments(fs.readFileSync(path.join(GATEWAY_CONTROLLERS, file), 'utf8'));

      for (const controller of readControllers(source)) {
        const seen = new Set<string>();
        for (const route of controller.routes) {
          const key = `${route.verb} ${route.routePath}`;
          if (seen.has(key)) {
            duplicates.push(`${file} [${controller.basePath}]: ${key} declared more than once`);
          }
          seen.add(key);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });
});
