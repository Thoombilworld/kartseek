import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Per-module command coverage: does each module's admin backend answer every
 * command its own gateway controller sends?
 *
 * ── Why this exists beside `gateway-service-contract.spec.ts` ───────────────
 *
 * That spec asks one platform-wide question — "is any command sent that nobody
 * implements?" — against two baselines that between them forgive about sixty
 * commands. That is the right shape for a platform gate and the wrong shape for
 * a module one: a module whose console is finished is indistinguishable there
 * from a module with ten excused orphans, because both read as "no NEW orphans".
 *
 * This spec asks the question per module, and a module listed here has NO
 * baseline of its own beyond the commands another plan explicitly owns, each
 * named with that plan. So "grocery is complete" stops being a claim in a report
 * and becomes a thing that fails when it stops being true.
 *
 * ── A real census, not a list of strings ────────────────────────────────────
 *
 * Both halves are read from disk every run. The gateway half is the commands
 * `admin-<module>.controller.ts` actually sends; the backend half is every
 * `@MessagePattern` under `modules/<module>/backend/src`. Nothing here asserts
 * "there are 22 grocery commands": if the console grows a screen tomorrow, this
 * spec grows a command to check rather than going quietly green against a
 * hard-coded number that no longer describes anything.
 *
 * The two `parses a plausible amount of source` guards below are what stop that
 * from being a claim too — a regex that silently stopped matching would make
 * every assertion here pass vacuously, which is exactly how the admin
 * controllers' camelCase commands went unnoticed until M3 widened the
 * extractor's character class.
 *
 * ── Extending it (M10) ──────────────────────────────────────────────────────
 *
 * Add a row to `MODULES`. `deferred` is for commands a DIFFERENT plan owns, and
 * every entry needs the plan named in the comment beside it; it may only shrink,
 * and `no deferred command already has a handler` fails when one of them is
 * implemented and the row is left behind. A module with an empty `deferred` is a
 * module whose admin console is completely served, which is the state every row
 * here is meant to reach.
 */

const API_ROOT = path.resolve(__dirname, '..', 'apps');
const GATEWAY_CONTROLLERS = path.join(API_ROOT, 'api-gateway', 'src', 'controllers');
const MODULES_DIR = path.resolve(__dirname, '..', '..', '..', 'modules');

/** One module's two halves, and whatever another plan owns between them. */
interface ModuleCensus {
  /** `modules/<name>/backend` — the backend half. */
  readonly module: string;
  /** The controller in `apps/api-gateway/src/controllers` — the gateway half. */
  readonly controller: string;
  /** Commands another plan owns. Every entry names that plan; may only shrink. */
  readonly deferred: readonly string[];
}

const MODULES: readonly ModuleCensus[] = [
  {
    // The audit's best-implemented module (E row 26, "canonical"): every command
    // its console sends has had a handler since before this plan started. M7
    // pins that state so a later change cannot quietly regress it — grocery's
    // open rows are REGIONAL's and INFRA's, not MODULES'.
    module: 'grocery',
    controller: 'admin-grocery.controller.ts',
    deferred: [],
  },
  {
    // M7 implemented the seven onboarding and approval commands whose service
    // methods already existed. The fourteen below are the TAXI plan's operations
    // console: each needs an entity this module does not have (`vehicles`, surge
    // zones — AUD2-126) or the fare/zone rework (AUD2-018/019), and pointing one
    // at a near-enough method would answer with another market's fleet.
    module: 'taxi',
    controller: 'admin-taxi.controller.ts',
    deferred: [
      'admin.taxi.complaints', // TAXI plan: rider complaints console
      'admin.taxi.compliance', // TAXI plan: compliance view
      'admin.taxi.createRoute', // TAXI plan: fixed routes (AUD2-018/019)
      'admin.taxi.dashboard', // TAXI plan: operations dashboard
      'admin.taxi.fleet', // TAXI plan: needs the `vehicles` entity (AUD2-126)
      'admin.taxi.pricing', // TAXI plan: fare/zone rework (AUD2-018/019)
      'admin.taxi.resolveComplaint', // TAXI plan: rider complaints console
      'admin.taxi.rideDetail', // TAXI plan: rides console
      'admin.taxi.rides', // TAXI plan: rides console
      'admin.taxi.routes', // TAXI plan: fixed routes
      'admin.taxi.settings', // TAXI plan: module settings
      'admin.taxi.updatePricing', // TAXI plan: fare/zone rework (AUD2-018/019)
      'admin.taxi.updateSettings', // TAXI plan: module settings
      'admin.taxi.updateSurge', // TAXI plan: needs surge zones (AUD2-060/126)
    ],
  },
];

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

/**
 * Every command ONE gateway controller sends.
 *
 * Both forms the admin controllers use: the `this.send('<cmd>', …)` helper the
 * six module controllers share, and the `{ cmd: '<cmd>' }` object literal that
 * reaches `ClientProxy.send` directly. The character class is `[^'"`]+` — never
 * `[a-z0-9_.]+`, which is the narrowing that hid every camelCase command on this
 * surface and made the platform gate read as coverage over calls it could not
 * see.
 */
function sentFrom(controller: string): Set<string> {
  const file = path.join(GATEWAY_CONTROLLERS, controller);
  if (!fs.existsSync(file)) return new Set();
  const source = stripComments(fs.readFileSync(file, 'utf8'));
  const sent = new Set<string>();
  for (const [, cmd] of source.matchAll(/this\.send(?:<[^>]*>)?\(\s*['"`]([^'"`]+)['"`]/g)) {
    sent.add(cmd);
  }
  for (const [, cmd] of source.matchAll(/\{\s*cmd\s*:\s*['"`]([^'"`]+)['"`]\s*\}/g)) {
    sent.add(cmd);
  }
  return sent;
}

/**
 * Every command ONE module backend answers.
 *
 * The whole of `modules/<name>/backend/src`, not just `src/admin/`: five of the
 * verticals still answer some admin commands from their storefront controller,
 * and a census that only looked in `src/admin/` would report those as missing
 * and push somebody to write a second handler for a command that already has
 * one — two answers to the same question, which is the failure mode this plan
 * has spent two tasks removing.
 */
function handledBy(module: string): Set<string> {
  const root = path.join(MODULES_DIR, module, 'backend', 'src');
  const handled = new Set<string>();
  for (const file of walk(root, (f) => f.endsWith('.ts'))) {
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
  return handled;
}

describe('module ↔ admin console command coverage', () => {
  it('parses a plausible amount of source', () => {
    // Guards the suite itself. Without this, a regex that stopped matching would
    // turn every assertion below into "no orphans among the zero commands I
    // found", which is the shape of a gate that reads as coverage.
    for (const { module, controller } of MODULES) {
      expect(sentFrom(controller).size, `${controller} sends no command at all`).toBeGreaterThan(5);
      expect(handledBy(module).size, `${module} declares no @MessagePattern`).toBeGreaterThan(5);
    }
  });

  it('finds every module backend this census names', () => {
    for (const { module, controller } of MODULES) {
      expect(
        fs.existsSync(path.join(MODULES_DIR, module, 'backend', 'src')),
        `modules/${module}/backend/src is missing — this row is checking nothing`,
      ).toBe(true);
      expect(
        fs.existsSync(path.join(GATEWAY_CONTROLLERS, controller)),
        `${controller} is missing — this row is checking nothing`,
      ).toBe(true);
    }
  });

  it('grocery sends no admin command without a handler', () => {
    // The brief's own line, kept verbatim in spirit: grocery is the module this
    // plan touches least and the one most likely to be regressed by a change
    // aimed at another. `deferred` is empty for grocery, deliberately — there is
    // nothing about this console another plan owns.
    const handled = handledBy('grocery');
    const orphans = [...sentFrom('admin-grocery.controller.ts')].filter((c) => !handled.has(c));

    expect(orphans).toEqual([]);
  });

  for (const { module, controller, deferred } of MODULES) {
    it(`${module} sends no admin command that is neither handled nor owned by a named plan`, () => {
      const handled = handledBy(module);
      const excused = new Set(deferred);
      const orphans = [...sentFrom(controller)]
        .filter((cmd) => !handled.has(cmd))
        .filter((cmd) => !excused.has(cmd))
        .sort();

      expect(orphans).toEqual([]);
    });

    it(`${module} has no deferred command that already has a handler`, () => {
      // `deferred` may only shrink. A command that has since been implemented
      // must leave the list, otherwise the row slowly stops describing reality
      // and the next reader cannot tell what is still missing from what was
      // merely never tidied.
      const handled = handledBy(module);
      const stale = deferred.filter((cmd) => handled.has(cmd));

      expect(stale).toEqual([]);
    });
  }

  it('taxi: the seven MODULES owns are handled, and the fourteen deferred are not', () => {
    // The split this task exists to make, asserted from both sides. The seven
    // are `modules/taxi/backend/src/admin/admin.controller.ts`'s; the fourteen
    // are the TAXI plan's and are deliberately still unhandled — a near-enough
    // handler for one of them would answer with another market's fleet.
    const handled = handledBy('taxi');
    const MODULES_OWNED = [
      'admin.taxi.approveDriver',
      'admin.taxi.approvePayout',
      'admin.taxi.approveVendor',
      'admin.taxi.driverDetail',
      'admin.taxi.pendingApprovals',
      'admin.taxi.suspendVendor',
      'admin.taxi.vendorDetail',
    ];

    for (const cmd of MODULES_OWNED) {
      expect(handled.has(cmd), `${cmd} has no @MessagePattern in modules/taxi/backend`).toBe(true);
    }

    const taxiRow = MODULES.find((m) => m.module === 'taxi');
    expect(taxiRow?.deferred).toHaveLength(14);
  });
});
