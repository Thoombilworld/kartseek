import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { HTTP, stripComments } from '../guards/spec-helpers/controller-source';

const FILE = path.join(__dirname, 'admin-marketplace.controller.ts');

/**
 * No admin route may answer with a literal.
 *
 * `{ data: [], total: 0, message: 'Zone configuration' }` is indistinguishable
 * from "this market has no zones", and thirteen screens read exactly that for
 * as long as these handlers existed — an administrator opening Delivery Zones,
 * Gift Cards or IP Violations was told their market had none of those, forever,
 * by a handler that had never asked anything. A route that cannot answer is
 * worse than a missing route: the console cannot tell "none" from "never
 * built", and a 404 it can.
 *
 * So: a handler either reaches something that knows, or it is not a route.
 *
 * Source-parsing rather than a Nest fixture, in the style of
 * `route-exposure.regression.spec.ts`, so it keeps working as the file changes
 * and needs no application context. The comment stripper is that spec's — a
 * naive `/\/\*[\s\S]*?\*\//` pair corrupts a file holding a regex literal or a
 * `//` inside a string, silently, by dropping the routes that follow it.
 */

/**
 * `this.<name>(` calls that fetch nothing.
 *
 * The distinction this spec turns on: `this.scopeOf(req, country, …)` reads the
 * caller's own token and refuses a market they may not name — necessary, and
 * not an answer about that market. Every removed handler called exactly it and
 * nothing else, which is why "the body mentions `this.`" is not the test.
 */
const NON_FETCHING_HELPERS = new Set([
  'scopeOf',
  'actor',
  'actorId',
  'refuseUnattributableBalance',
  'logger',
]);

/**
 * The one literal-returning admin route left, by handler name, with its reason.
 *
 * `getSystemHealth` reports `process.uptime()` for the gateway and the word
 * `healthy` for four services it does not ask — so it is a stub in every sense
 * this spec means, and it is listed here rather than exempted quietly. Removing
 * it needs the console's Health screen to have somewhere else to read, which is
 * not M2's to build. The list is asserted exactly, below: it can shrink without
 * ceremony and cannot grow without a reviewer seeing it.
 */
const WAIVED = new Map<string, string>([
  [
    'getSystemHealth',
    'reports a hardcoded "healthy" for four services — needs a real fleet read, tracked separately',
  ],
]);

type Handler = { name: string; route: string; body: string };

/** A class member's signature and its closing brace, at the two-space indent. */
const SIGNATURE = /^ {2}(?:async\s+)?([A-Za-z0-9_$]+)\s*[(<]/;
const MEMBER_CLOSE = /^ {2}\}/;

/** Every `@Get/@Post/...`-decorated method in the controller, with its body. */
function handlers(): Handler[] {
  const source = stripComments(fs.readFileSync(FILE, 'utf8'));
  const lines = source.split('\n');
  const out: Handler[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!HTTP.test(lines[i])) continue;
    const route = lines[i].trim();
    // Down to the signature, then to the member's own closing brace. Not
    // "while the line starts with @": a prettier-wrapped `@ApiBody({` puts its
    // second line at a deeper indent with no `@`, and stopping there reads the
    // decorator's object as the signature and the handler as nameless. Not
    // "up to the next route decorator" either, because a private helper sitting
    // between two routes would be read as part of the one above it — and a
    // helper that calls a service would make a stub above it look answered.
    let j = i + 1;
    while (j < lines.length && !SIGNATURE.test(lines[j])) j++;
    const name = SIGNATURE.exec(lines[j] ?? '')?.[1] ?? `?line ${j + 1}`;
    let k = j + 1;
    while (k < lines.length && !MEMBER_CLOSE.test(lines[k])) k++;
    out.push({ name, route, body: lines.slice(j, k + 1).join('\n') });
  }
  return out;
}

/** Does this body reach anything that could know the answer? */
function reachesAService(body: string): boolean {
  if (/\bawait\b/.test(body)) return true;
  // `this.redis.getJson(`, `this.userRepo.findOne(` — a property call is always
  // a real read or write.
  if (/this\.[\w$]+\.[\w$]+\s*\(/.test(body)) return true;
  return [...body.matchAll(/this\.([\w$]+)\s*\(/g)].some((m) => !NON_FETCHING_HELPERS.has(m[1]));
}

describe('admin-marketplace has no literal-returning routes', () => {
  const parsed = handlers();

  it('parses the controller it is meant to be checking', () => {
    // A scanner that silently stops seeing the file passes every assertion
    // below by having nothing to check — the failure mode this whole plan is
    // about. The count is a floor, not a census: this spec is not where route
    // arithmetic lives (`admin-market-scope.regression.spec.ts` is).
    expect(parsed.length).toBeGreaterThan(100);
    expect(parsed.map((h) => h.name)).toContain('getOrders');
    expect(parsed.every((h) => !h.name.startsWith('?'))).toBe(true);
  });

  it('every route handler reaches a service', () => {
    const offenders = parsed
      .filter((h) => !reachesAService(h.body) && /return\s*[[{]/.test(h.body))
      .filter((h) => !WAIVED.has(h.name))
      .map((h) => `${h.route} → ${h.name}`);
    expect(offenders).toEqual([]);
  });

  it('waives exactly the literals it names, and no others', () => {
    // The waiver list may not outlive what it waives: an entry whose handler is
    // gone fails here rather than sitting as a permanent exemption for a route
    // that no longer exists.
    const names = new Set(parsed.map((h) => h.name));
    expect([...WAIVED.keys()].filter((n) => !names.has(n))).toEqual([]);
    const stillLiteral = parsed
      .filter((h) => !reachesAService(h.body) && /return\s*[[{]/.test(h.body))
      .map((h) => h.name);
    expect(stillLiteral.sort()).toEqual([...WAIVED.keys()].sort());
  });

  it('the thirteen removed routes are gone, by path', () => {
    // By path, not by handler name: a route re-added under a new method name is
    // the same lie on the same screen.
    const source = stripComments(fs.readFileSync(FILE, 'utf8'));
    const gone = [
      'brand-center',
      'campaigns',
      'reports',
      'loyalty/analytics',
      'gift-cards',
      'banners',
      'logistics',
      'delivery-partners',
      'delivery-zones',
      'shipping-rates',
      'gst-invoicing',
      'abandoned-carts',
      'ip-violations',
    ];
    // `@Get('campaigns')` exactly — `@Put('campaigns/:id')` and the four
    // campaign decisions call `admin_update_campaign` and stay, as do the
    // banner writes, which marketplace-service has always implemented.
    const present = gone.filter((p) => source.includes(`@Get('${p}')`));
    expect(present).toEqual([]);
  });
});
