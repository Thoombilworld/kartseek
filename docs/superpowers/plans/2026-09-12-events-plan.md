# Events Workstream — WebSocket & Kafka Implementation Plan (Plan E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every admin-relevant real-time and event path is authorised, connected end to end, and observable. Concretely: every admin WebSocket room requires a staff role, a console permission and a market-scoped room name (`admin:<CC>:orders`, `admin:<CC>:sellers`, `admin:<CC>:activity`); the console's dashboard activity panel updates from real events with a deliberate polling fallback and no dead hooks left behind; every topic the platform publishes is declared and provisioned and every `@EventPattern` has a producer; the escrow/payment-release chain either works or is gone (no payment can sit in `ESCROW_HOLD` forever and no seller ledger is credited twice); and readiness reports Kafka producer state and per-namespace WebSocket state.

**Architecture:** Room membership is the authority. A socket is admitted to an admin room by `handleConnection` / a gated `@SubscribeMessage` after three checks — staff role (`isStaffRole`), console permission (`adminPermissions`, `'*'` for SUPER_ADMIN), and market (`regionCode` + `regionLocked` from the same signed claims `guards/market-scope.ts` reads on the HTTP side). Every emit addresses **two** rooms, `admin:ALL:<topic>` (global admins) and `admin:<CC>:<topic>` (that market's admins), through one helper, so an event with no market reaches global admins only — the socket equivalent of `assertInMarket`'s "a record with no market is nobody's to touch". On the Kafka side `KAFKA_TOPICS` is the single source of truth (`create-kafka-topics.js` parses it, and the broker runs `KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'`), so a topic string that is not in that file is a topic that can never exist; two regression specs make that a build failure instead of a silent drop.

**Tech Stack:** NestJS 11 on rspack (`apps/api`), socket.io 4 (server) / socket.io-client 4.8.3 (already at the repo root), kafkajs 2, vitest (`npx vitest run <file>` from `apps/api`), jest (`npx jest <file>` from `apps/web`), Node 26, the dev fleet (`npm run dev:all` from `apps/api`), `docker exec kartseek-kafka` for live broker checks.

---

## Global Constraints

Verbatim, from the programme mandate:

> Do not use mock data. Do not leave fake buttons. Do not leave placeholder APIs. Do not rely on frontend-only permissions. Do not allow regional data leakage. Do not break existing modules while upgrading Admin. Do not mark functionality complete without testing the real workflow.

And for this workstream specifically:

- **WS auth rejects non-access tokens.** `verifyWsToken` already refuses any JWT whose `type` is set and is not `'access'` (`ws-auth.util.ts:48-52`) — MFA challenge tokens and refresh tokens included. Widening `WsUser` must not weaken that, and `ws-auth.util.spec.ts` must still pass with the same five assertions plus the new ones.
- **Room membership is the authority.** Grants come from an HTTP route or a role/permission check at join time; `client.rooms` is what a send is addressed to. No handler may take a room name from the message body and join it unchecked (`SellerGateway.handleJoinGenericRoom` does exactly that today and is fixed in Task 1).
- **The tokenless dev path stays pinned to CUSTOMER.** `ALLOW_WS_DEV_AUTH` sessions must never carry `regionCode`, `regionLocked` or `adminPermissions`.
- **One consumer group per service.** `serviceIdentity()` (`kafka.module.ts:40-102`) derives it; the four hand-written group ids (`audit-log-consumers`, `search-indexer`, `notification-service.events`, `notification-password-reset`) must stay distinct from each other and from the derived prefix. A spec asserts it.
- **`nest build --all` is the build gate** (tsc alone is not) — run it at the end of every task touching `apps/api`.
- **Suites stay green:** `apps/api` vitest 677 passing, `apps/web` jest 610 passing. Each task states the new total.
- **Commits:** one per task, lower-case, ≤ 100 characters, repo style (`fix(gateway): …`), with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Commit `apps/api` changes separately from `apps/web` / `packages/shared-core` changes.
- **Live checks:** topics and groups with `docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list'` (and `kafka-consumer-groups.sh`); sockets against a throwaway gateway on `API_GATEWAY_PORT=3099` driven by a small Node `socket.io-client` script carrying a **real staff token** (`DEV_AUTH_BYPASS` does not apply to sockets, but never rely on that — always present a token).
- **Branch:** `feat/admin-platform-upgrade`.

---

## File structure

| File                                                                                                   | Responsibility                                                                                      |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `apps/api/apps/api-gateway/src/gateways/admin-rooms.ts` (new)                                          | `adminRoom`, `adminTargets`, `adminRoomsFor`, `emitToAdmins` — the one place a room name is spelled |
| `apps/api/apps/api-gateway/src/gateways/admin-rooms.spec.ts` (new)                                     | unit tests for the helper                                                                           |
| `apps/api/apps/api-gateway/src/gateways/admin-room-authz.spec.ts` (new)                                | drives the three gateways with fake sockets: role, permission and market                            |
| `apps/api/apps/api-gateway/src/gateways/ws-auth.util.ts`                                               | `WsUser` gains `regionCode` / `regionLocked` / `adminPermissions`                                   |
| `apps/api/apps/api-gateway/src/gateways/ws-auth.util.spec.ts`                                          | updated for the widened shape                                                                       |
| `apps/api/apps/api-gateway/src/socket.gateway.ts`                                                      | `subscribe_admin` gated; `pushAdmin*` emit through `emitToAdmins`; `pushAdminSystemAlert` deleted   |
| `apps/api/apps/api-gateway/src/gateways/order.gateway.ts`                                              | `admin:orders` → `admin:<CC>:orders`; both emit sites via the helper                                |
| `apps/api/apps/api-gateway/src/gateways/seller.gateway.ts`                                             | `admin:sellers` → `admin:<CC>:sellers`; `join_room` allow-list                                      |
| `apps/api/apps/api-gateway/src/gateways/taxi-tracking.gateway.ts`                                      | driver-identity check; locked admins need a ride grant                                              |
| `apps/api/libs/kafka/src/kafka-topics.constants.ts`                                                    | the 159 undeclared produced topics, declared                                                        |
| `apps/api/libs/kafka/src/kafka-topics.spec.ts` (new)                                                   | every produced topic is declared; every consumed topic has a producer; group ids unique             |
| `apps/api/libs/kafka/src/kafka-producer.service.ts`                                                    | `isConnected()` / `state()` for readiness                                                           |
| `apps/api/apps/api-gateway/src/services/kafka-ws-bridge.service.ts`                                    | `registerAdminBridges()`; restaurant bridges repointed off `/tracking`                              |
| `apps/api/apps/api-gateway/src/services/kafka-ws-bridge.admin.spec.ts` (new)                           | the admin fan-out, market routing included                                                          |
| `apps/api/apps/admin-service/src/admin.service.ts`                                                     | ban/unban/KYC events carry `regionCode`                                                             |
| `apps/api/apps/payment-service/src/payment.controller.ts`                                              | `order.delivered` → `marketplace.order.delivered`                                                   |
| `apps/api/apps/payment-service/src/escrow-release.spec.ts` (new)                                       | the delivered → release contract                                                                    |
| `apps/api/apps/payout-service/src/payout.controller.ts`, `payout.service.ts`, `payout.service.spec.ts` | the dead escrow ledger removed                                                                      |
| `apps/api/apps/api-gateway/src/controllers/health.controller.ts` + `health.events.spec.ts` (new)       | Kafka producer + WS namespace state in readiness                                                    |
| `apps/api/scripts/verification/ws-admin-rooms.mjs` (new)                                               | live socket proof, three accounts                                                                   |
| `apps/api/package.json`                                                                                | `verify:ws-admin` script                                                                            |
| `packages/shared-core/src/socket/socket.ts`                                                            | `'tracking'` restored to `NamespaceKey`; stale comment corrected                                    |
| `packages/shared-core/src/hooks/use-admin-socket.ts`                                                   | rewritten against `/tracking` + `subscribe_admin`, reconnect, no invented kinds                     |
| `packages/shared-core/src/hooks/use-restaurant-socket.ts`                                              | stale comment corrected                                                                             |
| `apps/web/src/app/admin/page.tsx`                                                                      | live activity + deliberate polling fallback                                                         |
| `apps/web/src/__tests__/admin-live-events.spec.ts` (new)                                               | the hook is imported, the empty state is honest, the fallback is stated                             |

---

### Task 1 (E1): Every admin WebSocket room needs a staff role, a console permission and the caller's market

**Closes:** AUD2-063 (P1, `/tracking` `subscribe_admin` unguarded). Also closes an unlisted sibling found in the same sweep: `SellerGateway.handleJoinGenericRoom` (`seller.gateway.ts:162-176`) joins **any** room named in the message body, so any authenticated seller socket can `join_room` with `admin:sellers` and receive every seller's live orders — the exact room `handleConnection:126` is careful to gate.

**Files:**

- Create: `apps/api/apps/api-gateway/src/gateways/admin-rooms.ts`
- Create: `apps/api/apps/api-gateway/src/gateways/admin-rooms.spec.ts`
- Create: `apps/api/apps/api-gateway/src/gateways/admin-room-authz.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/gateways/ws-auth.util.ts` (`WsUser`, the JWT branch, the dev branch)
- Modify: `apps/api/apps/api-gateway/src/gateways/ws-auth.util.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/socket.gateway.ts:731-791`
- Modify: `apps/api/apps/api-gateway/src/gateways/order.gateway.ts:96-120, 313-346`
- Modify: `apps/api/apps/api-gateway/src/gateways/seller.gateway.ts:120-130, 162-176, 370-430`
- Create: `apps/api/scripts/verification/ws-admin-rooms.mjs`; add `verify:ws-admin` to `apps/api/package.json`

**Interfaces (what CONSOLE and TAXI consume):**

- Room names, produced here and consumed by nothing else by hand:
  - `admin:ALL:<topic>` — every global admin (SUPER_ADMIN, or a staff role without `regionLocked`)
  - `admin:<CC>:<topic>` — that market's locked admins, `<CC>` upper-case ISO-2
  - topics: `orders` (`/orders`), `sellers` · `grocery` · `pharmacy` (`/seller`), `activity` (`/tracking`)
- Permission required per topic: `orders` → `orders.view`; `sellers` → `sellers.view`; `activity` → `dashboard.view`; `grocery` → `modules.grocery`; `pharmacy` → `modules.pharmacy`.
- `WsUser` (consumed by every gateway): `{ id, email?, role, regionCode?, regionLocked?, adminPermissions? }`.
- Client contract: `/tracking` `subscribe_admin` now answers either `admin_subscribed { rooms: string[], market: 'ALL' | '<CC>' }` or `error { code: 'FORBIDDEN', message }`. It no longer reads `adminId` from the body — identity comes from the token.

- [ ] **Step 1: Write the failing spec for the room helper**

`apps/api/apps/api-gateway/src/gateways/admin-rooms.ts` does not exist yet. Create `admin-rooms.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { adminRoom, adminTargets, adminRoomsFor, ALL_MARKETS } from './admin-rooms';

const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN', adminPermissions: ['*'] };
const globalAdmin = {
  id: 'u-g',
  role: 'ADMIN',
  adminPermissions: ['dashboard.view', 'orders.view'],
};
const qaAdmin = {
  id: 'u-qa',
  role: 'ADMIN',
  regionCode: 'qa',
  regionLocked: true,
  adminPermissions: ['dashboard.view', 'orders.view'],
};
const support = { id: 'u-sup', role: 'SUPPORT_AGENT', adminPermissions: ['dashboard.view'] };
const customer = { id: 'u-c', role: 'CUSTOMER' };

describe('adminRoom / adminTargets', () => {
  it('names a market room in upper case and falls back to ALL', () => {
    expect(adminRoom('orders', 'qa')).toBe('admin:QA:orders');
    expect(adminRoom('orders', null)).toBe(`admin:${ALL_MARKETS}:orders`);
  });

  it('addresses both the global room and the market room', () => {
    expect(adminTargets('orders', 'QA')).toEqual(['admin:ALL:orders', 'admin:QA:orders']);
  });

  it('addresses only the global room when the event carries no market', () => {
    // The socket half of assertInMarket: an event nobody can attribute to a
    // market is not a locked admin's to receive.
    expect(adminTargets('orders', undefined)).toEqual(['admin:ALL:orders']);
  });
});

describe('adminRoomsFor', () => {
  it('gives SUPER_ADMIN every requested topic in the global room', () => {
    expect(adminRoomsFor(superAdmin, ['orders', 'sellers', 'activity'])).toEqual([
      'admin:ALL:orders',
      'admin:ALL:sellers',
      'admin:ALL:activity',
    ]);
  });

  it('confines a locked admin to their own market', () => {
    expect(adminRoomsFor(qaAdmin, ['orders', 'activity'])).toEqual([
      'admin:QA:orders',
      'admin:QA:activity',
    ]);
  });

  it('drops a topic the caller holds no permission for', () => {
    // A support agent may watch the activity feed and not the seller mirror.
    expect(adminRoomsFor(support, ['activity', 'sellers'])).toEqual(['admin:ALL:activity']);
  });

  it('gives a non-staff role nothing, whatever it asks for', () => {
    expect(adminRoomsFor(customer, ['orders', 'sellers', 'activity'])).toEqual([]);
    expect(adminRoomsFor({ ...customer, adminPermissions: ['*'] }, ['orders'])).toEqual([]);
  });

  it('treats a regionCode without the lock flag as global', () => {
    expect(adminRoomsFor({ ...globalAdmin, regionCode: 'QA' }, ['orders'])).toEqual([
      'admin:ALL:orders',
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

From `apps/api`: `npx vitest run apps/api-gateway/src/gateways/admin-rooms.spec.ts`
Expected: FAIL — `Cannot find module './admin-rooms'`.

- [ ] **Step 3: Write the helper**

`apps/api/apps/api-gateway/src/gateways/admin-rooms.ts`:

```ts
import type { Server } from 'socket.io';
import { isStaffRole } from '@app/common';

/**
 * Admin WebSocket rooms, named in exactly one place.
 *
 * Three gateways carried three different spellings of "the admins are
 * watching" — `admin:orders` on /orders, `admin:sellers` on /seller,
 * `admin_dashboard` on /tracking — none of which had a market in the name. A
 * regional admin who reached any of them saw every market's traffic, which is
 * the leak the HTTP side spent Plan A closing.
 *
 * A room name now carries the market, and an emit addresses two rooms: the
 * global one and the event's own market. An event that cannot be attributed to
 * a market reaches global admins only — the same rule `assertInMarket` applies
 * to a row with no `region_code`.
 */
export const ALL_MARKETS = 'ALL';

export const ADMIN_TOPICS = ['orders', 'sellers', 'activity', 'grocery', 'pharmacy'] as const;
export type AdminTopic = (typeof ADMIN_TOPICS)[number];

/** The console permission a socket must hold to listen to each topic. */
const TOPIC_PERMISSION: Record<AdminTopic, string> = {
  orders: 'orders.view',
  sellers: 'sellers.view',
  activity: 'dashboard.view',
  grocery: 'modules.grocery',
  pharmacy: 'modules.pharmacy',
};

export interface AdminSocketUser {
  id?: string;
  role?: string;
  regionCode?: string;
  regionLocked?: boolean;
  adminPermissions?: string[];
}

export function normaliseMarket(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toUpperCase();
  return v.length > 0 ? v : undefined;
}

/** The market a socket listens in: their lock, or every market. */
export function socketMarket(user: AdminSocketUser | undefined): string {
  const role = String(user?.role ?? '').toUpperCase();
  const locked = role !== 'SUPER_ADMIN' && user?.regionLocked === true;
  return (locked && normaliseMarket(user?.regionCode)) || ALL_MARKETS;
}

export function adminRoom(topic: AdminTopic, market: string | null | undefined): string {
  return `admin:${normaliseMarket(market) ?? ALL_MARKETS}:${topic}`;
}

/** The rooms one event is delivered to. */
export function adminTargets(topic: AdminTopic, market: string | null | undefined): string[] {
  const cc = normaliseMarket(market);
  return cc && cc !== ALL_MARKETS
    ? [adminRoom(topic, ALL_MARKETS), adminRoom(topic, cc)]
    : [adminRoom(topic, ALL_MARKETS)];
}

function holds(user: AdminSocketUser | undefined, permission: string): boolean {
  const granted = Array.isArray(user?.adminPermissions) ? user!.adminPermissions! : [];
  return granted.includes('*') || granted.includes(permission);
}

/**
 * The admin rooms this socket may join — empty for anyone who is not staff.
 *
 * Role first, then permission, then market. The permission list is the same
 * `adminPermissions` claim `RolesGuard` reads for `perm:` requirements, so a
 * role narrowed in the console narrows the live feed too rather than only the
 * REST surface.
 */
export function adminRoomsFor(
  user: AdminSocketUser | undefined,
  topics: readonly AdminTopic[],
): string[] {
  if (!user?.id || !isStaffRole(user.role)) return [];
  const market = socketMarket(user);
  return topics.filter((t) => holds(user, TOPIC_PERMISSION[t])).map((t) => adminRoom(t, market));
}

/** Emit one admin event to the global room and the event's own market room. */
export function emitToAdmins(
  server: Server | undefined,
  topic: AdminTopic,
  market: string | null | undefined,
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!server) return;
  server.to(adminTargets(topic, market)).emit(event, payload);
}

/** The market an event payload belongs to, however the producer spelled it. */
export function marketOf(data: Record<string, unknown> | undefined): string | undefined {
  return (
    normaliseMarket(data?.['regionCode']) ??
    normaliseMarket(data?.['countryCode']) ??
    normaliseMarket(data?.['country'])
  );
}
```

Note `server.to([a, b])` delivers **once** per socket even when it is in both rooms — socket.io de-duplicates across a room array, which is why a global admin who is also in `admin:ALL:*` never sees a doubled event.

- [ ] **Step 4: Run the helper spec — PASS**

`npx vitest run apps/api-gateway/src/gateways/admin-rooms.spec.ts` → 8 passed.

- [ ] **Step 5: Write the failing authorisation spec for the three gateways**

`apps/api/apps/api-gateway/src/gateways/admin-room-authz.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingGateway } from '../socket.gateway';
import { OrderGateway } from '../gateways/order.gateway';
import { SellerGateway } from '../gateways/seller.gateway';

/** A socket that records what it joined and what it was told. */
function fakeSocket(user: unknown) {
  const joined: string[] = [];
  const emitted: Array<[string, unknown]> = [];
  return {
    id: 'sock-1',
    user,
    rooms: new Set<string>(),
    handshake: { auth: {}, query: {} },
    join: vi.fn((room: string) => {
      joined.push(room);
    }),
    leave: vi.fn(),
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push([event, payload]);
    }),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    joined,
    emitted,
  } as any;
}

const redis: any = {
  hset: vi.fn(async () => undefined),
  hdel: vi.fn(async () => undefined),
  hget: vi.fn(async () => null),
  sadd: vi.fn(async () => undefined),
  smembers: vi.fn(async () => []),
  getJSON: vi.fn(async () => null),
  setJSON: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  get: vi.fn(async () => null),
  set: vi.fn(async () => undefined),
};
const ddos: any = { validateConnection: vi.fn(async () => true), handleDisconnection: vi.fn() };
const grants: any = { has: vi.fn(async () => false), grant: vi.fn() };

const superAdmin = { id: 'u-s', role: 'super_admin', adminPermissions: ['*'] };
const qaAdmin = {
  id: 'u-qa',
  role: 'admin',
  regionCode: 'QA',
  regionLocked: true,
  adminPermissions: ['dashboard.view', 'orders.view', 'sellers.view'],
};
const customer = { id: 'u-c', role: 'customer' };
const financeNoDashboard = {
  id: 'u-f',
  role: 'finance_manager',
  adminPermissions: ['finance.view'],
};

describe('TrackingGateway subscribe_admin', () => {
  let gw: TrackingGateway;
  beforeEach(() => {
    gw = new TrackingGateway(redis, ddos, grants);
  });

  it('refuses a customer token and joins nothing', async () => {
    const c = fakeSocket(customer);
    await gw.handleSubscribeAdmin(c);
    expect(c.joined).toEqual([]);
    expect(c.emitted[0][0]).toBe('error');
  });

  it('refuses a staff role without dashboard.view', async () => {
    const c = fakeSocket(financeNoDashboard);
    await gw.handleSubscribeAdmin(c);
    expect(c.joined).toEqual([]);
  });

  it('puts a global admin in the ALL activity room', async () => {
    const c = fakeSocket(superAdmin);
    await gw.handleSubscribeAdmin(c);
    expect(c.joined).toEqual(['admin:ALL:activity']);
    expect(c.emitted[0]).toEqual(['admin_subscribed', expect.objectContaining({ market: 'ALL' })]);
  });

  it('puts a locked admin in their own market room and no other', async () => {
    const c = fakeSocket(qaAdmin);
    await gw.handleSubscribeAdmin(c);
    expect(c.joined).toEqual(['admin:QA:activity']);
  });
});

describe('OrderGateway admin auto-join', () => {
  it('joins the market order room for a locked admin', async () => {
    const gw = new OrderGateway(redis, ddos, grants);
    const c = fakeSocket(qaAdmin);
    (c as any).handshake.auth.token = undefined;
    // handleConnection authenticates from the token; drive the join directly.
    await gw.joinAdminRooms(c, qaAdmin);
    expect(c.joined).toEqual(['admin:QA:orders']);
  });

  it('joins nothing for a customer', async () => {
    const gw = new OrderGateway(redis, ddos, grants);
    const c = fakeSocket(customer);
    await gw.joinAdminRooms(c, customer);
    expect(c.joined).toEqual([]);
  });
});

describe('SellerGateway join_room', () => {
  it('refuses an admin room named in the message body', async () => {
    // The hole: this handler joined any room it was given, so a seller socket
    // could name `admin:sellers` and receive every seller's live orders.
    const gw = new SellerGateway(redis, ddos, { owns: vi.fn(async () => true) } as any, grants);
    const c = fakeSocket({ id: 'u-seller', role: 'seller' });
    await gw.handleJoinGenericRoom({ room: 'admin:ALL:sellers' }, c);
    expect(c.joined).toEqual([]);
    expect(c.emitted[0][0]).toBe('error');
  });

  it('still allows a module room the seller owns', async () => {
    const gw = new SellerGateway(redis, ddos, { owns: vi.fn(async () => true) } as any, grants);
    const c = fakeSocket({ id: 'u-seller', role: 'pharmacy_seller' });
    await gw.handleJoinGenericRoom({ room: 'pharmacy:store-1' }, c);
    expect(c.joined).toEqual(['pharmacy:store-1']);
  });
});
```

Re-check the four constructor argument lists before running — `TrackingGateway(redis, wsDdosGuard, trackingGrants)` (`socket.gateway.ts:138-142`), `OrderGateway(redis, wsDdosGuard, trackingGrants)` (`order.gateway.ts:69-73`), `SellerGateway(...)` at the top of `seller.gateway.ts`.

- [ ] **Step 6: Run it — FAIL**

`npx vitest run apps/api-gateway/src/gateways/admin-room-authz.spec.ts`
Expected: FAIL — `handleSubscribeAdmin` takes `(data, client)` and joins unconditionally; `OrderGateway.joinAdminRooms` does not exist; `handleJoinGenericRoom` joins `admin:ALL:sellers`.

- [ ] **Step 7: Widen `WsUser` so a gateway can see the market and the permissions**

In `ws-auth.util.ts`, replace the interface and the token branch's return:

```ts
export interface WsUser {
  id: string;
  email?: string;
  role: string;
  /**
   * Staff market lock, read from the same claims `guards/market-scope.ts`
   * reads on the HTTP side (`AuthController.issueTokens` signs them). Without
   * these the socket had no way to tell a Qatar admin from a global one, so
   * every admin room was global by construction.
   */
  regionCode?: string;
  regionLocked?: boolean;
  /** Console permission keys; `'*'` is the wildcard SUPER_ADMIN carries. */
  adminPermissions?: string[];
}
```

```ts
return {
  id: decoded.sub || decoded.id,
  email: decoded.email,
  role: decoded.role || 'CUSTOMER',
  ...(typeof decoded.regionCode === 'string'
    ? { regionCode: decoded.regionCode.toUpperCase() }
    : {}),
  ...(decoded.regionLocked === true ? { regionLocked: true } : {}),
  ...(Array.isArray(decoded.adminPermissions)
    ? { adminPermissions: decoded.adminPermissions.map(String) }
    : {}),
};
```

The dev branch is left exactly as it is — `{ id: userId, role: 'CUSTOMER' }`, no market, no permissions.

Update `ws-auth.util.spec.ts`: the first assertion's `toEqual({ id, email, role })` now fails because absent claims are omitted rather than undefined — keep it as is (omitted keys and `undefined` compare equal under `toEqual`, but `email: undefined` is still emitted, so it passes unchanged) and **add** two cases:

```ts
it('carries the staff market lock and permissions through to the socket', () => {
  const token = jwt.sign(
    {
      sub: 'u1',
      role: 'ADMIN',
      type: 'access',
      regionCode: 'qa',
      regionLocked: true,
      adminPermissions: ['dashboard.view'],
    },
    SECRET,
  );
  expect(verifyWsToken(clientWith(token))).toMatchObject({
    regionCode: 'QA',
    regionLocked: true,
    adminPermissions: ['dashboard.view'],
  });
});

it('never gives the tokenless dev session a market or a permission', () => {
  process.env.ALLOW_WS_DEV_AUTH = 'true';
  const client = { id: 's', handshake: { auth: {}, query: { userId: 'u9' } } } as any;
  expect(verifyWsToken(client)).toEqual({ id: 'u9', role: 'CUSTOMER' });
});
```

- [ ] **Step 8: Gate `/tracking`'s admin room**

In `socket.gateway.ts`, import the helper and replace the admin block (`:731-791`):

```ts
import { adminRoomsFor, emitToAdmins, socketMarket } from './gateways/admin-rooms';
```

```ts
  // ── Admin Real-Time Events ──────────────────────────────────────────────

  /**
   * Join the console's live feed.
   *
   * This used to `client.join('admin_dashboard')` for any authenticated socket
   * and log `data.adminId` as if that proved something — a customer token, or a
   * raw socket.io-client pointed at wss://<gateway>/tracking, received
   * `admin:new_order`, `admin:new_seller`, `admin:complaint` and
   * `admin:kyc_pending` for every market. The identity now comes from the token,
   * the role and permission are checked the way `RolesGuard` checks them, and
   * the room carries the caller's market.
   */
  @SubscribeMessage('subscribe_admin')
  async handleSubscribeAdmin(@ConnectedSocket() client: Socket) {
    const user = (client as unknown as { user?: any }).user;
    const rooms = adminRoomsFor(user, ['activity']);
    if (rooms.length === 0) {
      this.logger.warn(
        `[ws-admin-denied] socket ${client.id} user=${user?.id ?? 'anonymous'} ` +
          `role=${user?.role ?? '-'} asked for the admin feed`,
      );
      client.emit('error', {
        code: 'FORBIDDEN',
        message: 'The admin feed requires a staff account with the dashboard permission.',
      });
      return;
    }
    for (const room of rooms) client.join(room);
    const market = socketMarket(user);
    this.logger.log(`👑 ${user.id} (${user.role}) joined the ${market} admin feed`);
    client.emit('admin_subscribed', { rooms, market, timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('unsubscribe_admin')
  async handleUnsubscribeAdmin(@ConnectedSocket() client: Socket) {
    for (const room of client.rooms) {
      if (room.startsWith('admin:')) client.leave(room);
    }
  }

  /** A new order, to the admins of the market it was placed in. */
  pushAdminNewOrder(order: {
    id: string; module: string; amount: number; customer: string; regionCode?: string;
  }) {
    emitToAdmins(this.server, 'activity', order.regionCode, 'admin:new_order', {
      ...order, timestamp: new Date().toISOString(),
    });
  }

  pushAdminNewSeller(seller: {
    id: string; name: string; module: string; status: string; regionCode?: string;
  }) {
    emitToAdmins(this.server, 'activity', seller.regionCode, 'admin:new_seller', {
      ...seller, timestamp: new Date().toISOString(),
    });
  }

  pushAdminComplaint(complaint: {
    id: string; module: string; severity: string; subject: string; regionCode?: string;
  }) {
    emitToAdmins(this.server, 'activity', complaint.regionCode, 'admin:complaint', {
      ...complaint, timestamp: new Date().toISOString(),
    });
  }

  pushAdminKycPending(kyc: {
    userId: string; name: string; type: string; module: string; regionCode?: string;
  }) {
    emitToAdmins(this.server, 'activity', kyc.regionCode, 'admin:kyc_pending', {
      ...kyc, timestamp: new Date().toISOString(),
    });
  }

  /** One row of the audit trail, live. */
  pushAdminActivity(entry: Record<string, unknown> & { regionCode?: string }) {
    emitToAdmins(this.server, 'activity', entry.regionCode, 'admin:activity', {
      ...entry, timestamp: new Date().toISOString(),
    });
  }
```

`pushAdminSystemAlert` is **deleted**: nothing publishes a system alert anywhere in the repo, and a hook counter that can only ever read zero is a fake button. (If readiness later wants to raise one, Task 6 leaves the door open — it would call `pushAdminActivity` with `kind: 'system_alert'`.)

- [ ] **Step 9: Market-scope `/orders`' admin room**

In `order.gateway.ts`, replace the auto-join block (`:96-120`) and extract it so the spec can drive it:

```ts
import { adminRoomsFor, adminTargets, emitToAdmins, marketOf } from './admin-rooms';
```

```ts
// Auto-join role-based rooms.
//
// `admin:orders` was one flat room for every market: a Qatar-locked admin
// who connected saw India's orders scroll past, which is the leak Plan A
// closed on every REST route. The room now carries the market, and a staff
// account also has to hold `orders.view` — the same claim `RolesGuard`
// checks for `perm:orders.view` on the HTTP side.
const adminRooms = await this.joinAdminRooms(client, user);
if (adminRooms.length === 0 && SELLER_ROLES.has(role)) {
  client.join(`seller:${userId}`);
  this.logger.log(`🏪 Seller ${userId} (${role}) connected to order feed`);
}
```

and add, next to `handleConnection`:

```ts
  /** Join the admin order rooms this socket is entitled to. Returns them. */
  async joinAdminRooms(client: Socket, user: WsUser | undefined): Promise<string[]> {
    const rooms = adminRoomsFor(user as any, ['orders']);
    for (const room of rooms) client.join(room);
    if (rooms.length) {
      this.logger.log(`👑 ${user!.id} (${user!.role}) joined ${rooms.join(', ')}`);
    }
    return rooms;
  }
```

Replace both emit sites. `pushOrderUpdate` (`:318`) and `notifyNewOrder` (`:343`) gain a `regionCode` on their details/order argument and use the helper:

```ts
// Broadcast to the admin live dashboard — the market's admins and the
// global ones, never one flat room.
emitToAdmins(this.server, 'orders', details.regionCode, 'order_event', {
  event: 'status_change',
  ...payload,
});
```

```ts
emitToAdmins(this.server, 'orders', order.regionCode, 'order_event', payload);
```

(`OrderStatusPayload` gains `regionCode?: string`; `notifyNewOrder`'s `order` parameter gains `regionCode?: string`. `adminTargets` is imported for the spec's benefit only if unused — drop the import if lint flags it.)

- [ ] **Step 10: Market-scope `/seller`'s admin rooms and close `join_room`**

In `seller.gateway.ts`:

```ts
import { adminRoomsFor, emitToAdmins } from './admin-rooms';
```

Replace `if (isAdmin) await client.join('admin:sellers');` (`:126`) with:

```ts
// `admin:sellers` carried EVERY seller's order events for EVERY market.
// Now: the caller's market, and only if they hold `sellers.view`.
for (const room of adminRoomsFor(user as any, ['sellers'])) await client.join(room);
```

Replace `handleJoinGenericRoom` (`:162-176`) entirely:

```ts
  /**
   * Join a module room — `pharmacy:<storeId>`, `grocery:<storeId>`.
   *
   * This joined whatever room name arrived in the message body. The connection
   * is authenticated, so the caller had to be somebody — but `admin:sellers`
   * is just a string, and any signed-in seller could name it and start
   * receiving every other seller's live orders, customer names and totals
   * included, twenty lines after `handleConnection` took care to gate exactly
   * that room. Admin rooms are joined by the server from the token, never by
   * name; module rooms are checked against the same ownership source
   * `SellerOwnershipGuard` uses.
   */
  @SubscribeMessage('join_room')
  async handleJoinGenericRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = String(data?.room ?? '').trim();
    if (!room) return;
    const user = (client as unknown as { user?: any }).user;

    if (room.startsWith('admin:') || room.startsWith('admin_')) {
      this.logger.warn(
        `[ws-admin-denied] socket ${client.id} user=${user?.id ?? 'anonymous'} ` +
          `named admin room "${room}" on join_room`,
      );
      client.emit('error', { code: 'FORBIDDEN', message: 'Admin rooms are not joined by name.' });
      return;
    }

    const MODULE_ROOM = /^(pharmacy|grocery|restaurant|seller):([A-Za-z0-9_-]{1,64})$/;
    const match = MODULE_ROOM.exec(room);
    if (!match) {
      client.emit('error', { code: 'BAD_ROOM', message: `"${room}" is not a room you may join.` });
      return;
    }

    if (!user?.id || !(await this.sellerOwnership.owns(user.id, match[2]))) {
      client.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to that store.' });
      return;
    }

    await client.join(room);
    client.emit('room_joined', { room });
  }
```

The four `this.server.to('admin:sellers').emit('seller_event', …)` sites (`:375, 397, 411, 425`) become `emitToAdmins(this.server, 'sellers', <market>, 'seller_event', { … })`, where `<market>` is `order.regionCode` / `item.regionCode` / `booking.regionCode` / `complaint.regionCode` (add the optional field to each method's parameter type — the marketplace caller at `marketplace-order.service.ts:398` already resolves `regionCode` from `x-region-code` and passes `currency` from it, so pass `regionCode` alongside).

- [ ] **Step 11: Run the authorisation spec — PASS; run the whole gateway suite; build**

```bash
npx vitest run apps/api-gateway/src/gateways          # admin-rooms 8 + authz 8 + ws-auth 7 = 23 passed
npx vitest run                                        # 677 + 23 new = 700 passed
npx nest build --all                                  # exits 0
```

- [ ] **Step 12: Write the live socket proof**

`apps/api/scripts/verification/ws-admin-rooms.mjs` — reuse the `login()` helper from `admin-scope-authz.mjs` verbatim (it completes the staff second factor when `DEV_MFA_ECHO=true`):

```js
/* global process, console, fetch */
// Live proof that an admin WebSocket room needs a staff role, a permission and
// the caller's market. Run against a throwaway gateway:
//   API_GATEWAY_PORT=3099 npx nest start api-gateway    # in another shell
//   API_BASE=http://localhost:3099/api/v1 WS_BASE=http://localhost:3099 \
//     node scripts/verification/ws-admin-rooms.mjs
import { io } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';
const WS = process.env.WS_BASE ?? BASE.replace(/\/api\/v1$/, '');

async function login({ email, password }) {
  /* copied from admin-scope-authz.mjs */
}

/** Connect, emit `subscribe_admin`, resolve with the server's answer. */
function subscribeAdmin(token) {
  return new Promise((resolve) => {
    const socket = io(`${WS}/tracking`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: false,
      timeout: 8000,
    });
    const done = (r) => {
      socket.close();
      resolve(r);
    };
    socket.on('connect', () => socket.emit('subscribe_admin', {}));
    socket.on('admin_subscribed', (d) => done({ ok: true, ...d }));
    socket.on('error', (e) => done({ ok: false, ...e }));
    socket.on('connect_error', (e) => done({ ok: false, connectError: e.message }));
    setTimeout(() => done({ ok: false, timeout: true }), 9000);
  });
}

const qa = await login({ email: 'qa-admin@kartseek.com', password: 'AdminPass123!' });
const sup = await login({
  email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@kartseek.com',
  password: process.env.SUPER_ADMIN_PASSWORD ?? 'AdminPass123!',
});
const cust = await login({
  email: process.env.CUSTOMER_EMAIL ?? 'customer@kartseek.com',
  password: process.env.CUSTOMER_PASSWORD ?? 'Customer123!',
});

console.log('super admin  ', await subscribeAdmin(sup));
console.log('qa admin     ', await subscribeAdmin(qa));
console.log('customer     ', await subscribeAdmin(cust));
console.log('no token     ', await subscribeAdmin(undefined));
```

Add to `apps/api/package.json` scripts: `"verify:ws-admin": "node scripts/verification/ws-admin-rooms.mjs"`.

- [ ] **Step 13: Run it live**

```bash
# shell A, from apps/api
API_GATEWAY_PORT=3099 DEV_MFA_ECHO=true npx nest start api-gateway
# shell B, from apps/api
API_BASE=http://localhost:3099/api/v1 npm run verify:ws-admin
```

Expected:

```
super admin   { ok: true, rooms: [ 'admin:ALL:activity' ], market: 'ALL', timestamp: ... }
qa admin      { ok: true, rooms: [ 'admin:QA:activity' ],  market: 'QA',  timestamp: ... }
customer      { ok: false, code: 'FORBIDDEN', message: 'The admin feed requires a staff account with the dashboard permission.' }
no token      { ok: false, code: 'AUTH_REQUIRED', ... }     # disconnected at the handshake
```

and in the gateway log, one `[ws-admin-denied]` line for the customer.

- [ ] **Step 14: Commit**

```bash
git add apps/api/apps/api-gateway/src/gateways apps/api/apps/api-gateway/src/socket.gateway.ts \
        apps/api/scripts/verification/ws-admin-rooms.mjs apps/api/package.json
git commit -m "fix(gateway): admin websocket rooms need a staff role, a permission and the caller's market" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (E2): Every topic the platform publishes is declared, provisioned and consumable

**Closes:** AUD2-131 (P2, `admin.user.unbanned` / `admin.kyc.rejected` unprovisioned).

The audit names two topics. A full sweep of the repo finds the same defect **159 times**: 271 distinct topic strings are handed to `KafkaProducerService.publish()`, and only 112 of them are in `KAFKA_TOPICS`. Because `create-kafka-topics.js` provisions from that file and the broker runs `KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'` (`compose.infra.yml:298`), the other 159 — every marketplace catalogue event, every taxi driver/vendor event, every hotel booking event, `marketplace.order.delivered`, `payment.escrow.held`/`.released` — are dropped at the broker with "This server does not host this topic-partition". AUD2-131 is the visible corner of it.

**Files:**

- Create: `apps/api/libs/kafka/src/kafka-topics.spec.ts`
- Modify: `apps/api/libs/kafka/src/kafka-topics.constants.ts`
- Modify: `apps/api/libs/kafka/src/kafka-producer.service.ts` (`isConnected()`, used again in Task 6)
- Modify: `docs/superpowers/plans/` — none; documentation of the degradation contract lives in the spec's header comment and `kafka-producer.service.ts`

**Interfaces:**

- `KAFKA_TOPICS` gains (grouped into the existing sections): `ADMIN_USER_UNBANNED: 'admin.user.unbanned'`, `ADMIN_KYC_REJECTED: 'admin.kyc.rejected'`, `ADMIN_ROLE_CREATED/UPDATED/DELETED`, `ADMIN_STAFF_CREATED/UPDATED`, `MARKETPLACE_ORDER_DELIVERED: 'marketplace.order.delivered'`, `PAYMENT_ESCROW_HELD`, `PAYMENT_ESCROW_RELEASED`, `SUPPORT_TICKET_CREATED: 'support.ticket.created'`, and the remaining names the spec reports.
- `KafkaProducerService.isConnected(): boolean` and `state(): 'connected' | 'skipped' | 'disconnected'`.

- [ ] **Step 1: Write the failing hygiene spec**

`apps/api/libs/kafka/src/kafka-topics.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * `KAFKA_TOPICS` is not a convenience list — it is the provisioning manifest.
 *
 * `scripts/create-kafka-topics.js` parses this very file, and the broker runs
 * with `KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'`, so a topic string that never
 * reaches this file can never exist: the publish fails with "This server does
 * not host this topic-partition" and `KafkaProducerService.publish` swallows it
 * by design (it must not turn a successful mutation into a 500). The event is
 * gone and nothing anywhere says so. These three assertions are the only thing
 * standing between "we publish an event" and "we publish an event".
 */
const ROOT = path.resolve(__dirname, '../../../../..'); // repo root
const CONSTANTS = path.join(ROOT, 'apps/api/libs/kafka/src/kafka-topics.constants.ts');

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p);
    }
  };
  for (const r of ['apps/api/apps', 'apps/api/libs', 'modules']) walk(path.join(ROOT, r));
  return out;
}

function declared(): Record<string, string> {
  const src = fs.readFileSync(CONSTANTS, 'utf8');
  const byKey: Record<string, string> = {};
  for (const m of src.matchAll(/(\w+):\s*'([a-z0-9][a-z0-9._-]*)'/g)) byKey[m[1]] = m[2];
  return byKey;
}

const PUBLISH_LITERAL =
  /\b(?:kafka|kafkaProducer|producer|kafkaClient|eventBus)\??\.(?:publish|emit)\(\s*'([a-z0-9][a-z0-9._-]*)'/g;
const PUBLISH_CONST =
  /\b(?:kafka|kafkaProducer|producer|kafkaClient|eventBus)\??\.(?:publish|emit)\(\s*KAFKA_TOPICS\.(\w+)/g;
const EVENT_LITERAL = /@EventPattern\(\s*'([a-z0-9][a-z0-9._-]*)'/g;
const EVENT_CONST = /@EventPattern\(\s*KAFKA_TOPICS\.(\w+)/g;

function scan() {
  const byKey = declared();
  const produced = new Set<string>();
  const consumed = new Map<string, Set<string>>();
  const undeclaredProduced = new Map<string, Set<string>>();
  for (const f of sourceFiles()) {
    const s = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    for (const m of s.matchAll(PUBLISH_LITERAL)) {
      produced.add(m[1]);
      if (!Object.values(byKey).includes(m[1])) {
        if (!undeclaredProduced.has(m[1])) undeclaredProduced.set(m[1], new Set());
        undeclaredProduced.get(m[1])!.add(rel);
      }
    }
    for (const m of s.matchAll(PUBLISH_CONST)) if (byKey[m[1]]) produced.add(byKey[m[1]]);
    const note = (t: string) => {
      if (!consumed.has(t)) consumed.set(t, new Set());
      consumed.get(t)!.add(rel);
    };
    for (const m of s.matchAll(EVENT_LITERAL)) note(m[1]);
    for (const m of s.matchAll(EVENT_CONST)) if (byKey[m[1]]) note(byKey[m[1]]);
  }
  return { byKey, produced, consumed, undeclaredProduced };
}

describe('Kafka topic registry', () => {
  const { produced, consumed, undeclaredProduced } = scan();

  it('declares every topic the platform publishes to', () => {
    const report = [...undeclaredProduced.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, files]) => `  ${t}   <- ${[...files].join(', ')}`)
      .join('\n');
    expect(report).toBe('');
  });

  it('has a producer for every topic an @EventPattern consumes', () => {
    // A consumer for a topic nobody publishes is dead wiring that reads, from
    // the code, exactly like a working integration.
    const orphans = [...consumed.entries()]
      .filter(([t]) => !produced.has(t))
      .map(([t, files]) => `  ${t}   <- ${[...files].join(', ')}`)
      .join('\n');
    expect(orphans).toBe('');
  });

  it('gives every hand-written consumer its own group id', () => {
    // One `.env` once gave nineteen services one group: a rebalance storm plus
    // replies handed to the service that could not answer them. `kafka.module`
    // derives a per-service group; these four are written by hand and must not
    // collide with each other.
    const groups = new Map<string, string>();
    for (const f of sourceFiles()) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/groupId:\s*'([A-Za-z0-9._-]+)'/g)) {
        const rel = path.relative(ROOT, f).replace(/\\/g, '/');
        expect(groups.has(m[1]) ? `${m[1]} in ${groups.get(m[1])} and ${rel}` : '').toBe('');
        groups.set(m[1], rel);
      }
    }
    expect(groups.size).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run it and read the list it prints**

From `apps/api`: `npx vitest run libs/kafka/src/kafka-topics.spec.ts`

Expected: 2 of 3 FAIL.

- "declares every topic the platform publishes to" → 159 lines, beginning `admin.kyc.rejected <- apps/api/apps/admin-service/src/admin.service.ts`, `admin.role.created <- …/admin-access.controller.ts`, … ending `wallet.credit.seller <- apps/api/apps/commission-service/src/commission.service.ts`.
- "has a producer for every topic an @EventPattern consumes" → exactly 3 lines:
  `escrow.hold.wallet`, `escrow.release.wallet` (`apps/api/apps/payout-service/src/payout.controller.ts`) and `order.delivered` (`apps/api/apps/payment-service/src/payment.controller.ts`). **Leave this one failing** — it is Task 5's acceptance criterion.
- "gives every hand-written consumer its own group id" → PASS (4 distinct: `audit-log-consumers`, `notification-service.events`, `notification-password-reset`, `search-indexer`).

- [ ] **Step 3: Declare the 159, grouped**

Paste the spec's own report into `kafka-topics.constants.ts`, each name placed under the section it belongs to (the report is sorted by topic, which groups them by prefix already). Add the new sections the sweep implies:

```ts
  // ── Admin decisions ────────────────────────────────────────────────────────
  ADMIN_USER_BANNED:   'admin.user.banned',
  ADMIN_USER_UNBANNED: 'admin.user.unbanned',
  ADMIN_KYC_APPROVED:  'admin.kyc.approved',
  ADMIN_KYC_REJECTED:  'admin.kyc.rejected',
  ADMIN_KYC_SUBMITTED: 'admin.kyc.submitted',
  // Console access control (admin-access.controller.ts) — the audit trail's
  // companion events, which nothing could publish while they were undeclared.
  ADMIN_ROLE_CREATED:  'admin.role.created',
  ADMIN_ROLE_UPDATED:  'admin.role.updated',
  ADMIN_ROLE_DELETED:  'admin.role.deleted',
  ADMIN_STAFF_CREATED: 'admin.staff.created',
  ADMIN_STAFF_UPDATED: 'admin.staff.updated',

  // ── Per-module delivered signals ───────────────────────────────────────────
  // `marketplace.order.delivered` is the only one of the four in
  // `contracts/domain-events.ts` that any service actually publishes
  // (`seller.service.ts:2200`). The other three are declared there and produced
  // nowhere; they are deliberately NOT added here — a provisioned topic with no
  // producer is the same lie in the other direction.
  MARKETPLACE_ORDER_DELIVERED: 'marketplace.order.delivered',

  // ── Payment escrow ─────────────────────────────────────────────────────────
  PAYMENT_ESCROW_HELD:     'payment.escrow.held',
  PAYMENT_ESCROW_RELEASED: 'payment.escrow.released',

  // ── Support ────────────────────────────────────────────────────────────────
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
```

Then the remaining ~145 mechanical entries (marketplace catalogue, seller, return, delivery, brand, coupon, promotion, taxi driver/vendor/payout, hotel, grocery, restaurant, commission, wallet routing). Keep each in its prefix's section; keep the `SCREAMING_SNAKE: 'dotted.name'` shape the provisioning regex expects.

- [ ] **Step 4: Run the spec again**

`npx vitest run libs/kafka/src/kafka-topics.spec.ts` → the first and third `it` PASS; the second still fails with the same 3 lines (Task 5).

- [ ] **Step 5: Add the producer-state accessors**

In `kafka-producer.service.ts`, after `connectWithRetry`:

```ts
  /**
   * Whether a publish would actually reach the broker.
   *
   * `publish()` no-ops and logs when it would not, which is the right choice in
   * a request path and the wrong one for a health probe: readiness TCP-connects
   * to the broker port and calls that "kafka: up" even when this producer never
   * completed its handshake and every event since boot has been dropped.
   */
  isConnected(): boolean {
    return this.connected;
  }

  state(): 'connected' | 'skipped' | 'disconnected' {
    if (process.env.SKIP_KAFKA === 'true') return 'skipped';
    return this.connected ? 'connected' : 'disconnected';
  }
```

- [ ] **Step 6: Provision and verify against the live broker**

```bash
docker compose -f docker-compose.yml up -d kafka        # from the repo root, if not already up
npm run kafka:topics
```

Expected: `Created 159 topic(s); 163 already existed.` then `Verified 322 topics present on localhost:9092.`

```bash
docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list' | wc -l
docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list' \
  | grep -E '^(admin\.user\.unbanned|admin\.kyc\.rejected|marketplace\.order\.delivered|payment\.escrow\.(held|released)|support\.ticket\.created)$'
```

Expected: 323 lines (322 + `__consumer_offsets`), and all six named topics printed.

- [ ] **Step 7: Prove the durability fix still holds and the degradation path is honest**

```bash
docker compose -f infra/docker/compose.infra.yml stop kafka && docker compose -f infra/docker/compose.infra.yml rm -f kafka
docker compose -f infra/docker/compose.infra.yml up -d kafka
sleep 20 && docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list' | wc -l
```

Expected: 323 again — the `kafka_data` named volume (`compose.infra.yml:292-300`) survived the recreate. If it prints 1, the volume mount has regressed; stop and fix that before continuing.

Then the `SKIP_KAFKA` contract, recorded in the spec header and verified by hand:

```bash
# from apps/api, a gateway with no broker at all
SKIP_KAFKA=true API_GATEWAY_PORT=3099 npx nest start api-gateway
```

Expected in the log: `Kafka connection SKIPPED (SKIP_KAFKA=true). publish() will be a no-op.` and `Kafka-WS Bridge disabled (SKIP_KAFKA=true)` and `SKIP_KAFKA=true — email and SMS events will not be delivered.` The gateway still answers `GET /api/v1/health/ready` with `checks.kafka.status === 'skipped'`, and an admin mutation still returns its real status code — `AuditInterceptor.record()` fires `void this.sink.publish(...).catch(...)` (`audit.interceptor.ts:129`) and is never awaited into the response, so the audit sink degrades to the console line at `:118-121` and the request is unaffected. Confirm with one mutation:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"reason":"spec"}' \
  http://localhost:3099/api/v1/admin/users/00000000-0000-0000-0000-000000000000/ban
```

Expected: `404` (no such user) — a real answer, not a 500 and not a hang.

- [ ] **Step 8: Full suite and build**

```bash
npx vitest run        # 700 + 3 new (one still red — Task 5) → 702 passed, 1 failed
npx nest build --all  # exits 0
```

Record the red one in the commit body so the next task's author knows it is deliberate.

- [ ] **Step 9: Commit**

```bash
git add apps/api/libs/kafka
git commit -m "fix(api): every kafka topic the platform publishes is declared and provisioned" \
           -m "159 topic strings never reached kafka-topics.constants.ts, and with auto-create off the broker dropped every one. The orphan-consumer assertion stays red until the escrow task lands." \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (E3): The admin event feed — real producers reach the market-scoped admin rooms

**Closes:** AUD2-132 (P2, `admin.user.banned` / `admin.kyc.approved` / `admin.kyc.submitted` have zero consumers), AUD2-130 (P2, three restaurant bridges emit where no client listens).

This is what makes Task 4 honest. The console's feed must have a producer before the console is wired to it, or the "live" panel is a socket that connects and never speaks. Three sources are already real and already carry a market: `audit.log` (1332 messages on the broker, 0 lag, `country` on every row — `audit.interceptor.ts:147`), `seller.registered` (`seller.service.ts:1337`) and the three `admin.*` decisions (now provisioned by Task 2).

**Files:**

- Modify: `apps/api/apps/api-gateway/src/services/kafka-ws-bridge.service.ts` (new `registerAdminBridges()`; `:239, :509, :518` repointed)
- Create: `apps/api/apps/api-gateway/src/services/kafka-ws-bridge.admin.spec.ts`
- Modify: `apps/api/apps/admin-service/src/admin.service.ts` (`:367, :387, :455, :495` — events carry `regionCode`)
- Modify: `apps/api/apps/api-gateway/src/controllers/user.controller.ts:219` (`admin.kyc.submitted` carries `regionCode`)

**Interfaces (what CONSOLE consumes):**

On `/tracking`, in the room `admin:<CC>:activity` (Task 1):

| Event               | Payload                                                                                  | Source                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `admin:activity`    | `{ id, kind, actionType, actorEmail?, actorRole?, entityType?, entityId?, country, at }` | `audit.log`, `admin.user.banned/unbanned`, `admin.kyc.approved/rejected` |
| `admin:new_seller`  | `{ id, name, module, status, regionCode, timestamp }`                                    | `seller.registered`                                                      |
| `admin:kyc_pending` | `{ userId, name, type, module, regionCode, timestamp }`                                  | `admin.kyc.submitted`                                                    |
| `admin:complaint`   | `{ id, module, severity, subject, regionCode, timestamp }`                               | `support.ticket.created`                                                 |
| `admin:new_order`   | `{ id, module, amount, customer, regionCode, timestamp }`                                | `order.created`                                                          |

An event whose payload names no market reaches `admin:ALL:activity` only.

- [ ] **Step 1: Write the failing bridge spec**

`apps/api/apps/api-gateway/src/services/kafka-ws-bridge.admin.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KafkaWsBridgeService } from './kafka-ws-bridge.service';

/** A consumer double that records handlers so the spec can fire one. */
function fakeConsumer() {
  const handlers = new Map<string, (d: Record<string, unknown>) => Promise<void>>();
  return {
    subscribe: vi.fn((topic: string, h: any) => {
      handlers.set(topic, h);
    }),
    fire: (topic: string, data: Record<string, unknown>) => {
      const h = handlers.get(topic);
      if (!h) throw new Error(`nothing subscribed to ${topic}`);
      return h(data);
    },
    topics: () => [...handlers.keys()],
  };
}

function fakeGateway() {
  const sent: Array<{ rooms: string[] | string; event: string; payload: any }> = [];
  const server = {
    to: (rooms: string[] | string) => ({
      emit: (event: string, payload: any) => sent.push({ rooms, event, payload }),
    }),
  };
  return { server, sent, pushAdminActivity: vi.fn(), pushAdminNewSeller: vi.fn() } as any;
}

describe('KafkaWsBridgeService admin fan-out', () => {
  let consumer: ReturnType<typeof fakeConsumer>;
  let tracking: any, order: any, seller: any, bridge: KafkaWsBridgeService;

  beforeEach(() => {
    delete process.env.SKIP_KAFKA;
    consumer = fakeConsumer();
    tracking = fakeGateway();
    order = fakeGateway();
    seller = fakeGateway();
    bridge = new KafkaWsBridgeService(
      consumer as any,
      tracking,
      fakeGateway(),
      order,
      seller,
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
    );
    bridge.onModuleInit();
  });

  it('subscribes to the five admin sources', () => {
    for (const t of [
      'audit.log',
      'admin.user.banned',
      'admin.kyc.submitted',
      'seller.registered',
      'support.ticket.created',
    ]) {
      expect(consumer.topics()).toContain(t);
    }
  });

  it("routes an audit row to its own market's admins and the global room", async () => {
    await consumer.fire('audit.log', {
      actionType: 'http.put./admin/users/u-1/ban',
      actorEmail: 'qa@kartseek.com',
      entityType: 'users',
      entityId: 'u-1',
      country: 'QA',
    });
    expect(tracking.sent[0].rooms).toEqual(['admin:ALL:activity', 'admin:QA:activity']);
    expect(tracking.sent[0].event).toBe('admin:activity');
    expect(tracking.sent[0].payload).toMatchObject({ country: 'QA', entityId: 'u-1' });
  });

  it('routes an unattributable event to global admins only', async () => {
    await consumer.fire('audit.log', { actionType: 'http.post./admin/pages', country: 'UNKNOWN' });
    expect(tracking.sent[0].rooms).toEqual(['admin:ALL:activity']);
  });

  it('routes a new seller registration to the seller feed', async () => {
    await consumer.fire('seller.registered', {
      sellerId: 's-1',
      businessName: 'Acme',
      regionCode: 'IN',
      status: 'PENDING',
    });
    const evt = tracking.sent.find((s: any) => s.event === 'admin:new_seller');
    expect(evt.rooms).toEqual(['admin:ALL:activity', 'admin:IN:activity']);
  });

  it('sends the three restaurant events where the client listens, not to /tracking', async () => {
    // `useRestaurantSocket` listens on /orders; these three were emitted into a
    // `restaurant:<id>` room on /tracking that nothing ever joins.
    await consumer.fire('restaurant.status.changed', { restaurantId: 'r-1', isOpen: false });
    await consumer.fire('restaurant.menu_item.created', { restaurantId: 'r-1', itemId: 'i-1' });
    await consumer.fire('restaurant.table.booked', { restaurantId: 'r-1', bookingId: 'b-1' });
    expect(tracking.sent.filter((s: any) => String(s.rooms).includes('restaurant:'))).toEqual([]);
    expect(seller.sent.map((s: any) => s.event)).toEqual([
      'restaurant_status',
      'menu_item_created',
      'table_booked',
    ]);
  });

  it('registers nothing when Kafka is switched off', () => {
    process.env.SKIP_KAFKA = 'true';
    const c = fakeConsumer();
    new KafkaWsBridgeService(
      c as any,
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
      fakeGateway(),
    ).onModuleInit();
    expect(c.topics()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

`npx vitest run apps/api-gateway/src/services/kafka-ws-bridge.admin.spec.ts`
Expected: FAIL — `nothing subscribed to audit.log` (there is no admin bridge), and the restaurant case fails because all three land on `tracking`.

- [ ] **Step 3: Add the admin bridge**

In `kafka-ws-bridge.service.ts`, import the helper and register a new group:

```ts
import { emitToAdmins, marketOf } from '../gateways/admin-rooms';
```

```ts
this.registerAdminBridges();
```

(added to `onModuleInit`, after `registerAllBridges()`).

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // ██ ADMIN CONSOLE — the live feed the console had no source for
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Everything the admin console watches, fanned into `admin:<CC>:activity`.
   *
   * Three of these topics — `admin.user.banned`, `admin.kyc.approved`,
   * `admin.kyc.submitted` — existed on the broker with zero consumers anywhere:
   * an admin banned an account and nothing at all happened downstream. Two more
   * (`admin.user.unbanned`, `admin.kyc.rejected`) could not even exist until
   * they were declared. `audit.log` is the richest of the five and the one with
   * live traffic: every state-changing admin request already publishes one, with
   * its market on `country`.
   *
   * The gateway consumes in its own group (`kartseek-consumers-event-bridge`),
   * so audit-log-service's own `audit.log` consumer (group
   * `audit-log-consumers`) still receives every message — two groups, one topic,
   * no partition sharing.
   */
  private registerAdminBridges() {
    const activity = (kind: string, data: Record<string, unknown>, market?: string) =>
      emitToAdmins(
        this.trackingGateway.server, 'activity', market ?? marketOf(data),
        'admin:activity',
        {
          id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          kind,
          actionType: String(data['actionType'] ?? kind),
          actorEmail: data['actorEmail'] ?? data['adminId'] ?? null,
          actorRole: data['actorRole'] ?? null,
          entityType: data['entityType'] ?? data['entityType'] ?? null,
          entityId: data['entityId'] ?? data['userId'] ?? data['sellerId'] ?? null,
          country: marketOf(data) ?? 'UNKNOWN',
          at: new Date().toISOString(),
        },
      );

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.AUDIT_LOG, async (data) => {
      // `country: 'UNKNOWN'` is what the interceptor writes when it could not
      // attribute the request; marketOf() returns it as a market and the room
      // helper would mint `admin:UNKNOWN:activity`. Normalise it away first.
      const market = marketOf(data);
      activity('audit', data, market === 'UNKNOWN' ? undefined : market);
    });

    for (const [topic, kind] of [
      [KAFKA_TOPICS.ADMIN_USER_BANNED, 'user_banned'],
      [KAFKA_TOPICS.ADMIN_USER_UNBANNED, 'user_unbanned'],
      [KAFKA_TOPICS.ADMIN_KYC_APPROVED, 'kyc_approved'],
      [KAFKA_TOPICS.ADMIN_KYC_REJECTED, 'kyc_rejected'],
    ] as const) {
      this.kafkaConsumer.subscribe(topic, async (data) => activity(kind, data));
    }

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ADMIN_KYC_SUBMITTED, async (data) => {
      emitToAdmins(this.trackingGateway.server, 'activity', marketOf(data), 'admin:kyc_pending', {
        userId: String(data['partnerId'] ?? data['userId'] ?? ''),
        name: String(data['name'] ?? ''),
        type: String(data['documentType'] ?? data['entityType'] ?? 'kyc'),
        module: String(data['module'] ?? 'partner'),
        regionCode: marketOf(data) ?? null,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.SELLER_REGISTERED, async (data) => {
      emitToAdmins(this.trackingGateway.server, 'activity', marketOf(data), 'admin:new_seller', {
        id: String(data['sellerId'] ?? data['id'] ?? ''),
        name: String(data['businessName'] ?? data['name'] ?? ''),
        module: String(data['module'] ?? 'marketplace'),
        status: String(data['status'] ?? 'PENDING'),
        regionCode: marketOf(data) ?? null,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.SUPPORT_TICKET_CREATED, async (data) => {
      emitToAdmins(this.trackingGateway.server, 'activity', marketOf(data), 'admin:complaint', {
        id: String(data['ticketId'] ?? data['id'] ?? ''),
        module: String(data['module'] ?? 'marketplace'),
        severity: String(data['priority'] ?? data['severity'] ?? 'medium'),
        subject: String(data['subject'] ?? ''),
        regionCode: marketOf(data) ?? null,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ORDER_CREATED, async (data) => {
      emitToAdmins(this.trackingGateway.server, 'activity', marketOf(data), 'admin:new_order', {
        id: String(data['orderId'] ?? ''),
        module: String(data['module'] ?? 'marketplace'),
        amount: Number(data['total'] ?? data['amount'] ?? 0),
        customer: String(data['customerName'] ?? data['customerId'] ?? ''),
        regionCode: marketOf(data) ?? null,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('Registered 9 admin-console Kafka → WS bridges');
  }
```

- [ ] **Step 4: Repoint the three restaurant bridges**

`:239` (`RESTAURANT_STATUS_CHANGED`), `:509` (`RESTAURANT_MENU_ITEM_CREATED`) and `:518` (`RESTAURANT_TABLE_BOOKED`) swap `this.trackingGateway` for `this.sellerGateway` and keep the room name:

```ts
// `sellerGateway`, not `trackingGateway`. Socket.io rooms are namespace-
// scoped: a `restaurant:<id>` room on /tracking is a different room from the
// one on /seller, and `useRestaurantSocket` was repointed at /orders in the
// belief that /tracking did not exist at all. It does exist — the bridge was
// the wrong half to leave alone, so these three events were addressed to a
// room nothing has ever joined. Restaurant staff join `restaurant:<id>` on
// /seller through `join_room`, which Task 1 now ownership-checks.
this.kafkaConsumer.subscribe(KAFKA_TOPICS.RESTAURANT_STATUS_CHANGED, async (data) => {
  this.sellerGateway.server?.to(`restaurant:${data['restaurantId']}`).emit('restaurant_status', {
    ...data,
    timestamp: new Date().toISOString(),
  });
});
```

(and likewise for `menu_item_created` and `table_booked`.)

- [ ] **Step 5: Put the market on the admin decision events**

In `admin.service.ts`, the four publishes carry no market, so the bridge could only ever route them to `admin:ALL:activity`. `userMarket(userId)` already exists (Plan A, Task 3) and the KYC record already holds `country`:

```ts
const regionCode = await this.userMarket(userId);
await this.kafka.publish(KAFKA_TOPICS.ADMIN_USER_BANNED, {
  userId,
  reason,
  adminId,
  regionCode,
  bannedAt: new Date().toISOString(),
});
```

```ts
await this.kafka.publish(KAFKA_TOPICS.ADMIN_USER_UNBANNED, {
  userId,
  adminId,
  regionCode: await this.userMarket(userId),
  unbannedAt: new Date().toISOString(),
});
```

```ts
await this.kafka.publish(KAFKA_TOPICS.ADMIN_KYC_APPROVED, {
  entityId,
  entityType,
  adminId,
  regionCode: pending.country ?? pending.countryCode ?? pending.regionCode ?? null,
});
```

(and the same `regionCode` on `ADMIN_KYC_REJECTED`.) Replace the four bare string literals with the `KAFKA_TOPICS.*` constants while you are in the file — the spec from Task 2 accepts either, but the constant is what stops the next rename from silently unprovisioning the topic.

In `user.controller.ts:219`, add the market the partner belongs to:

```ts
await this.kafka.publish(KAFKA_TOPICS.ADMIN_KYC_SUBMITTED, {
  partnerId,
  documentType: body.documentType,
  regionCode: partner.regionCode ?? partner.countryCode ?? req.user?.regionCode ?? null,
});
```

(add `@Req() req: any` to the handler signature if it is not already there.)

- [ ] **Step 6: Run the bridge spec — PASS; run the suite; build**

```bash
npx vitest run apps/api-gateway/src/services/kafka-ws-bridge.admin.spec.ts   # 6 passed
npx vitest run          # 702 + 6 = 708 passed, 1 failed (the orphan-consumer assertion, Task 5)
npx nest build --all    # exits 0
```

- [ ] **Step 7: Live check — an admin action reaches the admin room**

With the fleet up and the throwaway gateway on 3099, in one shell run the Task 1 script in listen mode (add `--listen` handling that keeps the socket open and prints every `admin:*` event for 30 s), and in another perform a real admin mutation:

```bash
# shell B — listen as the QA admin
API_BASE=http://localhost:3099/api/v1 node scripts/verification/ws-admin-rooms.mjs --listen qa
# shell C — a real, scoped admin action
curl -s -X PUT -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' \
  -d '{"reason":"live check"}' \
  "http://localhost:3099/api/v1/admin/users/$SOME_QA_USER_ID/ban" | head -c 200
```

Expected in shell B, within a second or two, two lines: one `admin:activity { kind: 'audit', actionType: 'http.put./api/v1/admin/users/…/ban', country: 'QA' }` and one `admin:activity { kind: 'user_banned', entityId: '<id>', country: 'QA' }`. Repeat with the **global** admin listening and an **IN** user banned: the QA listener must receive nothing.

```bash
docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group kartseek-consumers-event-bridge' | grep -E 'audit.log|admin\.'
```

Expected: `audit.log` and the four `admin.*` topics listed with `LAG 0` and an active member.

- [ ] **Step 8: Commit**

```bash
git add apps/api/apps/api-gateway/src/services apps/api/apps/admin-service/src/admin.service.ts \
        apps/api/apps/api-gateway/src/controllers/user.controller.ts
git commit -m "feat(gateway): admin console events reach the market-scoped admin rooms" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (E4): The console listens — `useAdminSocket` wired, with a deliberate polling fallback

**Closes:** AUD2-129 (P2, the console has no live-update path), AUD2-152 (P3, three comments assert `/tracking` does not exist).

**The decision, from the audit's evidence, is to wire — not to delete.** The audit offers both ("Wire `useAdminSocket` into the dashboard, or delete the hook and the rooms if polling is the intended design"). Deleting was the right call while the rooms were silent: `admin:orders`'s only emitters, `OrderGateway.pushOrderUpdate` and `OrderGateway.notifyNewOrder`, are called from **nowhere** in the repo (checked: the Kafka bridge emits to `order:<id>` directly and `marketplace-order.service.ts:398` calls `SellerGateway.notifyNewOrder`, not OrderGateway's). Wiring the hook as it stands would have produced a socket that connects, reports `connected: true`, and receives nothing for the life of the session — a live indicator with no liveness behind it, which is the "fake button" the mandate forbids. After Task 3 that premise is gone: `admin:<CC>:activity` carries `audit.log` (1332 live messages, 0 lag today), every admin decision and every seller registration. So the hook is repointed at the namespace that now has a producer, and polling is **kept deliberately** as the fallback — the counters still come from `GET /admin/dashboard`, and the socket only tells the page when to ask again.

**Files:**

- Modify: `packages/shared-core/src/socket/socket.ts:31-44` (restore `'tracking'`, correct the comment)
- Modify: `packages/shared-core/src/hooks/use-admin-socket.ts` (rewritten)
- Modify: `packages/shared-core/src/hooks/use-restaurant-socket.ts:78-94` (correct the comment)
- Modify: `packages/shared-core/src/hooks/index.ts` (export the hook so a future unused-export check can see it)
- Modify: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/__tests__/admin-live-events.spec.ts`

**Interfaces:**

- Consumes the Task 1 / Task 3 contract: namespace `/tracking`, emit `subscribe_admin` (no body), receive `admin_subscribed { rooms, market }` or `error { code: 'FORBIDDEN' }`, then `admin:activity`, `admin:new_seller`, `admin:kyc_pending`, `admin:complaint`, `admin:new_order`.
- Produces `useAdminSocket(): { connected, denied, events, counts, lastEventAt, clearEvents }`. `denied` is true when the server refused the subscription — the page says so rather than showing a spinner forever.

- [ ] **Step 1: Write the failing web spec**

`apps/web/src/__tests__/admin-live-events.spec.ts` (jest, `testEnvironment: 'node'`, `.ts` only — render with `react-dom/server`, as `dashboard-page.spec.ts` does):

```ts
/**
 * The master dashboard has a live path, and says which one it is using.
 *
 * `useAdminSocket` was repointed at `/orders`, fixed, exported — and imported by
 * none of the 266 files under `apps/web/src/app/admin`. Every admin room the
 * gateway maintained was dead from the console's point of view, and the page
 * polled without ever saying so. A live indicator must be backed by a producer
 * (Task E3) and an absent one must be stated, not hidden.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as fs from 'node:fs';
import * as path from 'node:path';

const getDashboard = jest.fn();
const getAuditLogs = jest.fn();
jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getDashboard: (...a: unknown[]) => getDashboard(...a),
    getAuditLogs: (...a: unknown[]) => getAuditLogs(...a),
  },
}));
jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({ selectedRegion: 'QA', formatCurrencyValue: (n: number) => `QR ${n}` }),
  REGIONS: { QA: { code: 'QA', name: 'Qatar' } },
}));

let live = {
  connected: false,
  denied: false,
  events: [] as any[],
  counts: {},
  lastEventAt: null as string | null,
  clearEvents: jest.fn(),
};
jest.mock('@/hooks/use-admin-socket', () => ({ useAdminSocket: () => live }));

let hookResult: { data: unknown; loading: boolean; error: string | null };
jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    void Promise.resolve(fetcher()).catch(() => undefined);
    return { ...hookResult, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => null,
  AdminErrorBanner: () => null,
}));

const { default: Page } = require('../app/admin/page');

const STATS = {
  users: { total: 51, active: 26, newToday: 3 },
  orders: { total: 60, today: 12, pending: 24 },
  revenue: { total: 100, today: 10 },
  sellers: { value: null, unavailable: 'x' },
  drivers: { value: null, unavailable: 'x' },
  pendingKyc: { value: null, unavailable: 'x' },
  serviceSplit: null,
  generatedAt: '2026-09-12T10:00:00.000Z',
};

const render = () =>
  renderToStaticMarkup(React.createElement(Page) as any).replace(/<[^>]+>/g, ' ');

beforeEach(() => {
  hookResult = {
    data: { ok: true, data: { stats: STATS, activity: [], activityRefusal: null } },
    loading: false,
    error: null,
  };
});

it('imports the live hook — a hook nothing imports is the defect this closes', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'app', 'admin', 'page.tsx'), 'utf8');
  expect(page).toMatch(/useAdminSocket/);
});

it('says the feed is live and empty rather than inventing events', () => {
  live = { ...live, connected: true, denied: false, events: [] };
  const html = render();
  expect(html).toMatch(/Live/);
  expect(html).toMatch(/nothing has happened|no activity since/i);
});

it('says it is polling when the socket is not connected', () => {
  live = { ...live, connected: false, denied: false, events: [] };
  expect(render()).toMatch(/refreshes every|polling/i);
});

it('says so when the server refuses the feed, instead of showing a dead indicator', () => {
  live = { ...live, connected: false, denied: true, events: [] };
  expect(render()).toMatch(/permission|not permitted|refused/i);
});

it('renders a real event, and never a fabricated one', () => {
  live = {
    ...live,
    connected: true,
    denied: false,
    lastEventAt: '2026-09-12T10:01:00.000Z',
    events: [
      {
        id: 'e1',
        kind: 'user_banned',
        actionType: 'admin.user.banned',
        actorEmail: 'qa-admin@kartseek.com',
        entityId: 'u-1',
        country: 'QA',
        at: '2026-09-12T10:01:00.000Z',
      },
    ],
  };
  const html = render();
  expect(html).toContain('qa-admin@kartseek.com');
  // The deleted fixtures, one last time.
  for (const ghost of ['842 partners', '96.2%', '8,420 orders', '12 pending store approvals']) {
    expect(html).not.toContain(ghost);
  }
});
```

- [ ] **Step 2: Run it — FAIL**

From `apps/web`: `npx jest src/__tests__/admin-live-events.spec.ts`
Expected: FAIL on the first `it` — `page.tsx` does not mention `useAdminSocket`; and `Cannot find module '@/hooks/use-admin-socket'` is resolvable (the file exists) but the page renders none of the copy.

- [ ] **Step 3: Restore `'tracking'` to the namespace union and correct the comment**

`packages/shared-core/src/socket/socket.ts`:

```ts
/**
 * The namespaces the gateway actually registers, one entry per
 * `@WebSocketGateway({ namespace })` in `apps/api/apps/api-gateway/src`.
 *
 * `'tracking'` was removed from this union on the belief that no gateway had
 * ever declared it. That was wrong: `socket.gateway.ts` declares
 * `namespace: 'tracking'`, socket.io normalises a name without a leading slash
 * to `/tracking` (`socket.io/dist/index.js:461`), and `api-gateway.module.ts`
 * registers `TrackingGateway` as a provider. Removing it here sent two hooks to
 * `/orders` instead and left three Kafka→WS bridges emitting into rooms on a
 * namespace no client was on any more. `/tracking` carries the admin console's
 * feed (`admin:<CC>:activity`), so it belongs in this union.
 *
 * Keeping this union in step with the server is what makes a wrong namespace a
 * compile error rather than a silent dead socket.
 */
export type NamespaceKey =
  | 'notifications'
  | 'chat'
  | 'orders'
  | 'taxi'
  | 'tracking'
  | 'franchise'
  | 'seller'
  | 'recommendations'
  | 'hotel'
  | 'doctor-queue';
```

And in `use-restaurant-socket.ts:78-94`, replace the "no gateway registers `/tracking`" paragraph with the truth and the reason the client stays on `/orders`:

```ts
// `/orders`. `/tracking` does exist (see socket.ts) — this hook was moved
// here because OrderGateway is where the restaurant order feed lives, and
// the three restaurant Kafka→WS bridges were repointed at `/seller`'s
// `restaurant:<id>` room to match where staff actually join. Nothing here
// should be moved back without moving the bridge with it.
```

- [ ] **Step 4: Rewrite `useAdminSocket` against the real contract**

`packages/shared-core/src/hooks/use-admin-socket.ts`:

```ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket/socket';

/**
 * useAdminSocket — the admin console's live feed.
 *
 * Connects to `/tracking` and emits `subscribe_admin`. The server decides the
 * room from the token: a staff role, the `dashboard.view` permission and the
 * caller's market (`admin:<CC>:activity`). There is no room to name from here,
 * and naming one would not work — that is the point.
 *
 * Events are a feed, not a data source. The counters on the dashboard still
 * come from `GET /admin/dashboard`; an event means "ask again", and a
 * disconnected socket means "keep polling on the timer". The page must render
 * correctly with `connected: false` and zero events, because that is what a
 * developer running without Kafka sees.
 */
export type AdminEventKind =
  | 'audit'
  | 'user_banned'
  | 'user_unbanned'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'new_seller'
  | 'kyc_pending'
  | 'complaint'
  | 'new_order';

export interface AdminEvent {
  id: string;
  kind: AdminEventKind;
  actionType?: string;
  actorEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  country?: string | null;
  at: string;
  raw: Record<string, unknown>;
}

export interface UseAdminSocketResult {
  connected: boolean;
  /** The server refused the subscription — wrong role, or no dashboard.view. */
  denied: boolean;
  /** The market the server put this session in, once it has answered. */
  market: string | null;
  events: AdminEvent[];
  counts: Record<AdminEventKind, number>;
  lastEventAt: string | null;
  clearEvents: () => void;
}

const MAX_EVENTS = 50;

const EMPTY_COUNTS: Record<AdminEventKind, number> = {
  audit: 0,
  user_banned: 0,
  user_unbanned: 0,
  kyc_approved: 0,
  kyc_rejected: 0,
  new_seller: 0,
  kyc_pending: 0,
  complaint: 0,
  new_order: 0,
};

/** Server event name → the kind this hook reports. */
const WIRE: Record<string, AdminEventKind | undefined> = {
  'admin:new_seller': 'new_seller',
  'admin:kyc_pending': 'kyc_pending',
  'admin:complaint': 'complaint',
  'admin:new_order': 'new_order',
};

export function useAdminSocket(enabled = true): UseAdminSocketResult {
  const [connected, setConnected] = useState(false);
  const [denied, setDenied] = useState(false);
  const [market, setMarket] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [counts, setCounts] = useState<Record<AdminEventKind, number>>({ ...EMPTY_COUNTS });
  const lastRef = useRef<string | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setCounts({ ...EMPTY_COUNTS });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket('tracking');
    if (!socket) return;

    const push = (kind: AdminEventKind, payload: Record<string, unknown>) => {
      const at = String(payload['at'] ?? payload['timestamp'] ?? new Date().toISOString());
      lastRef.current = at;
      setEvents((prev) =>
        [
          {
            id: String(payload['id'] ?? `${kind}_${at}_${Math.random().toString(36).slice(2, 6)}`),
            kind,
            actionType: payload['actionType'] as string | undefined,
            actorEmail: (payload['actorEmail'] as string | null) ?? null,
            entityType: (payload['entityType'] as string | null) ?? null,
            entityId: (payload['entityId'] as string | null) ?? null,
            country: (payload['country'] ?? payload['regionCode'] ?? null) as string | null,
            at,
            raw: payload,
          },
          ...prev,
        ].slice(0, MAX_EVENTS),
      );
      setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }));
    };

    const subscribe = () => {
      setDenied(false);
      socket.emit('subscribe_admin', {});
    };
    const onSubscribed = (d: { market?: string }) => {
      setConnected(true);
      setDenied(false);
      setMarket(d?.market ?? null);
    };
    const onRefused = (e: { code?: string }) => {
      // `FORBIDDEN` is the server saying this account may not watch. Anything
      // else is a transport problem, which reconnection handles.
      if (e?.code === 'FORBIDDEN') {
        setDenied(true);
        setConnected(false);
      }
    };
    const onDisconnect = () => setConnected(false);
    const onActivity = (p: Record<string, unknown>) =>
      push((p?.['kind'] as AdminEventKind) ?? 'audit', p ?? {});

    socket.on('connect', subscribe);
    socket.on('admin_subscribed', onSubscribed);
    socket.on('error', onRefused);
    socket.on('disconnect', onDisconnect);
    socket.on('admin:activity', onActivity);
    for (const [wire, kind] of Object.entries(WIRE)) {
      if (kind) socket.on(wire, (p: Record<string, unknown>) => push(kind, p ?? {}));
    }
    // A socket.io singleton may already be connected when this effect runs, in
    // which case `connect` will not fire again and the subscription would never
    // be sent.
    if (socket.connected) subscribe();

    return () => {
      socket.emit('unsubscribe_admin');
      socket.off('connect', subscribe);
      socket.off('admin_subscribed', onSubscribed);
      socket.off('error', onRefused);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:activity', onActivity);
      for (const wire of Object.keys(WIRE)) socket.off(wire);
    };
  }, [enabled]);

  return { connected, denied, market, events, counts, lastEventAt: lastRef.current, clearEvents };
}
```

Export it: add `export * from './use-admin-socket';` to `packages/shared-core/src/hooks/index.ts`.

- [ ] **Step 5: Wire the dashboard, with the fallback stated on screen**

In `apps/web/src/app/admin/page.tsx`:

```tsx
import { useAdminSocket } from '@/hooks/use-admin-socket';
import { useBackgroundRefresh } from '@/hooks/use-background-refresh';
```

Inside the component, after `useAdminData`:

```tsx
const live = useAdminSocket();

/**
 * Polling is kept on purpose.
 *
 * The counters come from `GET /admin/dashboard`; the socket only says when to
 * ask again. So the page refreshes every 30 s while the feed is down and every
 * 5 minutes while it is up, and an event pulls the next refresh forward. A
 * console that showed live events but stale numbers would be worse than one
 * that polled, and a developer running without Kafka gets the second one with
 * nothing broken.
 */
useBackgroundRefresh({
  onRefresh: async () => {
    await refetch();
  },
  intervalMs: live.connected ? 300_000 : 30_000,
});

const lastEventAt = live.lastEventAt;
React.useEffect(() => {
  if (lastEventAt) void refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [lastEventAt]);
```

Add the indicator into the existing `header` block, next to the region pill:

```tsx
<span
  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold border text-xs ${
    live.connected
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200'
  }`}
  title={
    live.denied
      ? 'Your account does not hold the dashboard permission the live feed requires.'
      : live.connected
        ? `Live events for ${live.market ?? 'every market'}`
        : 'The live feed is unavailable; counters refresh every 30 seconds.'
  }
>
  <span
    className={`w-1.5 h-1.5 rounded-full ${live.connected ? 'bg-emerald-500' : 'bg-slate-400'}`}
  />
  {live.denied ? 'Live feed not permitted' : live.connected ? 'Live' : 'Polling'}
</span>
```

And replace the header of the "Recent activity" panel so it merges the live events above the fetched rows:

```tsx
<div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
  <div>
    <h2 className="font-bold text-slate-900">Recent activity</h2>
    <p className="text-xs text-slate-500 mt-0.5">
      {live.denied
        ? 'Live updates need the dashboard permission; this list is the trail as last read.'
        : live.connected
          ? live.events.length === 0
            ? `Live for ${live.market ?? 'every market'} — nothing has happened since you opened this page.`
            : `${live.events.length} live event${live.events.length === 1 ? '' : 's'} since you opened this page.`
          : 'The live feed is unavailable; this list refreshes every 30 seconds.'}
    </p>
  </div>
  <Link
    href="/admin/audit-logs"
    className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
  >
    View the full trail <ArrowRight className="w-3 h-3" />
  </Link>
</div>
```

then, immediately above the existing `activity.map(...)` list, render the live rows with the same row markup (`auditHeadline`-equivalent text from `actionType`, `actorEmail`, `country`, `formatAuditTime(at)`), each marked with an emerald dot and `title="Received live"`. Do **not** merge them into `activity` — the fetched list is the durable trail, and the refetch will absorb them on its next pass; showing both briefly is honest, inventing a merged identity is not.

- [ ] **Step 6: Run the web spec and the web suite**

```bash
cd apps/web
npx jest src/__tests__/admin-live-events.spec.ts     # 5 passed
npx jest                                              # 610 + 5 = 615 passed
npx tsc --noEmit -p tsconfig.json                     # clean
```

- [ ] **Step 7: Live check in a browser**

Fleet up (`npm run dev:all` from `apps/api`, `npm run dev` from `apps/web`), sign in at `/admin` as the QA admin, open the network/WS panel:

- the handshake is `ws://localhost:3001/tracking/?EIO=4…` and **succeeds** (no `Invalid namespace`);
- the first frame out is `subscribe_admin`, the first frame in is `admin_subscribed {"rooms":["admin:QA:activity"],"market":"QA"}`;
- the pill reads **Live**;
- in another tab, ban a QA user from `/admin/users` → within a second the activity panel gains an emerald row and the counters refresh;
- ban an **IN** user as the global admin → the QA session's panel does **not** move;
- sign in as a support agent whose role lacks `dashboard.view` → the pill reads **Live feed not permitted** and the panel still renders the trail.

Then stop the gateway: the pill falls back to **Polling** within ~10 s and the counters keep refreshing on the 30 s timer.

- [ ] **Step 8: Commit**

```bash
git add packages/shared-core/src/socket/socket.ts packages/shared-core/src/hooks \
        apps/web/src/app/admin/page.tsx apps/web/src/__tests__/admin-live-events.spec.ts
git commit -m "fix(web): the admin dashboard listens for live events and falls back to polling" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (E5): The escrow chain — payment-service releases on the event that is really published; payout-service's parallel ledger is removed

**Closes:** AUD2-064 (P1, `escrow.hold.wallet` / `escrow.release.wallet` consumed, never published), AUD2-065 (P1, `order.delivered` consumed, never published; `marketplace.order.delivered` published, never consumed). Also closes the §5 module-independence rows 6 and 7, which are the same two defects described as couplings.

**The decision, and what it rests on.** The two ends are not symmetrical, so they get opposite answers:

- **payout-service's escrow ledger is removed.** The real seller money path is the TCP chain in `seller-marketplace.controller.ts:430-480`: `deliver_order` → `calculate_commission` → `credit_seller_wallet` → `wallet_credit`. `creditSellerWallet` (`payout.service.ts:438-452`) adds `commission.sellerEarning` — the **net** figure — straight to `availableBalance`. `holdEscrowInSellerWallet`/`releaseEscrowToSellerWallet` (`:401-427`) move a **gross** `payment.amount` through `escrowBalance` into the same `availableBalance`. Publishing the two topics would therefore credit every settled order **twice**, once net and once gross, and `escrowBalance` would be clamped at zero on the way. There is no version of "make the escrow topics work" that is not a double-credit bug, so the two `@EventPattern` handlers and the two service methods go, and `escrowBalance` is documented as not the money path.
- **payment-service's escrow status is connected.** This one is a genuinely stuck ledger, not dead wiring: `verifyPayment` sets `PaymentStatus.ESCROW_HOLD` on **every** verified payment (`payment.service.ts:154-157`), and the only route out is `releaseEscrow`, reached only from `@EventPattern('order.delivered')` — a topic nothing publishes and that is not even provisioned. So every payment the platform has ever verified is still `ESCROW_HOLD`, `payment.escrow.released` never fires, `settlement.markSettled` never runs, and `getReconciliationReport` (`settlement-engine.service.ts:293-317`) counts the entire unreleased backlog as "today's payments" and reports a growing discrepancy to the admin finance console. The signal that _is_ published is `marketplace.order.delivered` (`seller.service.ts:2200`), which Task 2 has now declared and provisioned. Point the consumer at it.

Idempotency comes for free: `releaseEscrow` selects `where: { orderId, status: ESCROW_HOLD }` and returns `{ success: false }` with a log line when there is no such row, so a redelivered message or a retried webhook cannot release twice.

**Files:**

- Modify: `apps/api/apps/payment-service/src/payment.controller.ts:181-184`
- Create: `apps/api/apps/payment-service/src/escrow-release.spec.ts`
- Modify: `apps/api/apps/payout-service/src/payout.controller.ts:75-83` (delete), `payout.service.ts:401-427` (delete), `payout.service.spec.ts:180-195` (delete two cases, add one)
- Modify: `apps/api/apps/payout-service/src/entities/*seller-wallet*.ts` (comment only — `escrowBalance` stays as a column)

**Interfaces:**

- payment-service consumes `marketplace.order.delivered` with `{ sellerId, orderId, orderNumber, amount }` — `orderId` is the one field the handler needs, and it is the same id `deliver_order` was called with.
- payment-service continues to publish `payment.escrow.held` and `payment.escrow.released` (both now provisioned); `payment.escrow.released` continues to be consumed at `payment.controller.ts:192` → `settlement.markSettled`.
- payout-service no longer consumes any Kafka topic. `seller_wallets.escrow_balance` stays at 0 and is documented as unused.

- [ ] **Step 1: Write the failing contract spec**

`apps/api/apps/payment-service/src/escrow-release.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PaymentStatus } from './entities/payment.entity';

/**
 * A verified payment must be able to leave ESCROW_HOLD.
 *
 * `verifyPayment` puts every verified payment there and the only exit is
 * `releaseEscrow`, wired to `@EventPattern('order.delivered')` — a topic no
 * service publishes and that is absent from `KAFKA_TOPICS`, so it is absent
 * from the broker too. The result is not a missing feature: it is a ledger in
 * which every payment ever taken is still held, `payment.escrow.released` never
 * fires, settlements are never marked settled, and the reconciliation report
 * the finance console reads counts the whole backlog as today's takings.
 */
const CONTROLLER = path.join(__dirname, 'payment.controller.ts');

describe('escrow release wiring', () => {
  it('consumes the delivered topic that is actually published', () => {
    const src = fs.readFileSync(CONTROLLER, 'utf8');
    expect(src).not.toMatch(/@EventPattern\(\s*'order\.delivered'\s*\)/);
    expect(src).toMatch(/@EventPattern\(\s*KAFKA_TOPICS\.MARKETPLACE_ORDER_DELIVERED\s*\)/);
  });
});

describe('PaymentService.releaseEscrow', () => {
  function svc(payment: any) {
    const repo = {
      findOne: vi.fn(async (q: any) =>
        payment && payment.status === q.where.status && payment.orderId === q.where.orderId
          ? payment
          : null,
      ),
      save: vi.fn(async (p: any) => p),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    // Constructor order as of 2026-09-12 — re-check before running.
    const { PaymentService } = require('./payment.service');
    return {
      svc: new PaymentService(repo as any, {} as any, {} as any, kafka as any, {} as any),
      repo,
      kafka,
    };
  }

  it('moves a held payment to released and announces it', async () => {
    const p = {
      id: 'p1',
      orderId: 'o1',
      status: PaymentStatus.ESCROW_HOLD,
      amount: 100,
      sellerId: 's1',
      netSellerAmount: 90,
      platformCommission: 10,
      paymentNumber: 'PAY-1',
    };
    const { svc: s, kafka } = svc(p);
    await expect(s.releaseEscrow('o1')).resolves.toMatchObject({ success: true, paymentId: 'p1' });
    expect(p.status).toBe(PaymentStatus.ESCROW_RELEASED);
    expect(kafka.publish).toHaveBeenCalledWith(
      'payment.escrow.released',
      expect.objectContaining({ orderId: 'o1' }),
    );
  });

  it('is idempotent — a redelivered event releases nothing a second time', async () => {
    const p = { id: 'p1', orderId: 'o1', status: PaymentStatus.ESCROW_RELEASED };
    const { svc: s, kafka } = svc(p);
    await expect(s.releaseEscrow('o1')).resolves.toEqual({ success: false });
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});

describe('payout-service escrow ledger', () => {
  it('is gone — the TCP settlement path is the only one that credits a seller', () => {
    // Keeping both would credit every delivered order twice: once net through
    // `credit_seller_wallet` (the real path) and once gross through
    // `releaseEscrowToSellerWallet`.
    const root = path.resolve(__dirname, '../../payout-service/src');
    const controller = fs.readFileSync(path.join(root, 'payout.controller.ts'), 'utf8');
    const service = fs.readFileSync(path.join(root, 'payout.service.ts'), 'utf8');
    expect(controller).not.toMatch(/escrow\.(hold|release)\.wallet/);
    expect(service).not.toMatch(/holdEscrowInSellerWallet|releaseEscrowToSellerWallet/);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

`npx vitest run apps/payment-service/src/escrow-release.spec.ts`
Expected: FAIL on the first and last `it` (the literal `'order.delivered'` is still there; payout still carries the handlers). The two `releaseEscrow` cases should already pass — if they do not, the constructor argument list has moved; fix the double before changing behaviour.

- [ ] **Step 3: Point payment-service at the topic that is published**

`payment.controller.ts`:

```ts
import { KAFKA_TOPICS } from '@app/kafka';
```

```ts
  /**
   * Release escrow when a delivery is confirmed.
   *
   * This listened for a bare `order.delivered`, which no service in the repo
   * publishes and which is not in `KAFKA_TOPICS` — so with auto-creation off it
   * never existed on the broker either. Every payment therefore stayed in
   * `ESCROW_HOLD` for the life of the platform. The signal that *is* published
   * is namespaced per module; marketplace is the one that emits it today
   * (`modules/marketplace/backend/src/seller/seller.service.ts:2200`). The other
   * three names in `contracts/domain-events.ts` have no producer and are
   * deliberately not subscribed to — a listener for an event nobody sends is how
   * this defect started.
   *
   * `releaseEscrow` is idempotent: it selects on `status = ESCROW_HOLD`, so a
   * redelivered partition or a retried delivery webhook is a no-op.
   */
  @EventPattern(KAFKA_TOPICS.MARKETPLACE_ORDER_DELIVERED)
  async handleOrderDelivered(@Payload() data: { orderId: string }) {
    await this.orchestrator.releaseEscrow(data.orderId);
  }
```

Also replace the two remaining literals in the same file (`'payment.v2.completed'`, `'payment.escrow.released'`) with their constants, so Task 2's spec keeps them provisioned.

- [ ] **Step 4: Delete payout-service's escrow ledger**

In `payout.controller.ts`, delete both `@EventPattern` handlers (`:75-83`) and the now-unused `EventPattern` / `Payload` imports if nothing else in the file uses them (`@MessagePattern` handlers still use `@Payload`, so keep that one).

In `payout.service.ts`, delete `holdEscrowInSellerWallet` and `releaseEscrowToSellerWallet` (`:401-427`) and put the reason where the next reader will find it, on the entity's column:

```ts
  /**
   * Not the money path.
   *
   * Two Kafka handlers used to move money through this column on
   * `escrow.hold.wallet` / `escrow.release.wallet` — topics nothing published,
   * that were not in `KAFKA_TOPICS`, and so were not on the broker. Wiring them
   * up would have credited every delivered order twice: `credit_seller_wallet`
   * already adds the **net** `sellerEarning` that commission-service computed
   * (see `seller-marketplace.controller.ts:430-480`), while the escrow path
   * moved the **gross** payment amount into the same `availableBalance`.
   * Escrow, where it exists, is payment-service's (`payments.status =
   * ESCROW_HOLD`). This column stays at zero.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  escrowBalance: number;
```

In `payout.service.spec.ts`, delete the two cases at `:180-195` and add one in their place:

```ts
it('credits the seller once, net, through the settlement path', async () => {
  const result = await service.creditSellerWallet('S1', 250.5, 'Order settled', 'ORD-1');
  expect(result).toMatchObject({ success: true, credited: 250.5 });
  // The escrow column is not part of the money path any more.
  expect(walletRepo.save).toHaveBeenCalledWith(expect.objectContaining({ escrowBalance: 0 }));
});
```

- [ ] **Step 5: Run the specs; Task 2's orphan assertion should now be green**

```bash
npx vitest run apps/payment-service/src/escrow-release.spec.ts   # 4 passed
npx vitest run apps/payout-service                               # passed, two cases fewer
npx vitest run libs/kafka/src/kafka-topics.spec.ts               # 3 passed — the orphan list is empty
npx vitest run                                                   # 708 + 4 − 2 + 1 = 711 passed, 0 failed
npx nest build --all                                             # exits 0
```

- [ ] **Step 6: Live check — a delivery really releases the hold**

Fleet up, with Kafka up and topics provisioned. Take a marketplace order through to delivery through the real route, then read the ledger:

```bash
# 1. the payment is held
docker exec -i kartseek-postgres psql -U postgres -d kartseek_db -c \
  "select status, count(*) from payment.payments group by 1;"
# 2. confirm delivery through the seller route the console/app really uses
curl -s -X POST -H "Authorization: Bearer $SELLER" \
  "http://localhost:3001/api/v1/sellers/$SELLER_ID/orders/$ORDER_ID/deliver" | head -c 300
# 3. give the bridge a second, then read again
sleep 3
docker exec -i kartseek-postgres psql -U postgres -d kartseek_db -c \
  "select status, count(*) from payment.payments group by 1;"
docker exec kartseek-kafka sh -c '/opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group kartseek-consumers-payment' | grep -E 'marketplace.order.delivered|payment.escrow.released'
```

Expected: step 1 shows `ESCROW_HOLD | n`; step 3 shows `ESCROW_HOLD | n-1` and `ESCROW_RELEASED | 1` (or +1), the consumer group lists `marketplace.order.delivered` with LAG 0, and `settlement.settled` has one new message. Re-run step 2 on the same order: the seller route answers `400 This order is already marked delivered.` and the counts do not move again.

And the double-credit that is now impossible:

```bash
docker exec -i kartseek-postgres psql -U postgres -d kartseek_db -c \
  "select seller_id, available_balance, escrow_balance from payout.seller_wallets order by updated_at desc limit 3;"
```

Expected: `available_balance` increased by exactly `commission.sellerEarning` from step 2's response; `escrow_balance` is `0.00`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/apps/payment-service/src apps/api/apps/payout-service/src
git commit -m "fix(api): escrow releases on the delivered event; payout-service's dead escrow ledger is removed" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (E6): Readiness reports the Kafka producer and every WebSocket namespace

**Closes:** AUD2-153 (P3, `/health/ready` does not report WS state at all).

`/health/ready` TCP-connects to the first broker's host:port (`health.controller.ts:103-112`) and calls that "kafka: up". A TCP accept is not a producer handshake: with the broker listening but the producer's five retries exhausted (`kafka-producer.service.ts:40-42`), readiness says `ready` while every event since boot has been dropped. And WS appears nowhere in readiness — only `/health/metrics` carries yesterday's latency numbers out of Redis (`:157-176`), while the `getConnectionStats()` methods that exist on `TrackingGateway` (`:700`) and `HotelGateway` are called from no route at all.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/health.controller.ts` (constructor, `readiness()`)
- Create: `apps/api/apps/api-gateway/src/controllers/health.events.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/api-gateway.module.ts` (nothing new to register — the gateways and `KafkaProducerService` are already providers; confirm `HealthController` can inject them without a circular import, and use `forwardRef` only if `nest build` complains)

**Interfaces:**

`GET /api/v1/health/ready` gains two checks:

```jsonc
"kafka": {
  "status": "up",              // TCP reachable
  "producer": "connected",      // "connected" | "disconnected" | "skipped"
  "detail": "brokers=localhost:9092 group=kartseek-consumers"
},
"websocket": {
  "status": "up",              // "up" | "down" | "degraded"
  "namespaces": {
    "/tracking": { "sockets": 2, "rooms": 5 },
    "/orders":   { "sockets": 0, "rooms": 0 },
    "/seller":   { "sockets": 1, "rooms": 2 }
  },
  "adminRooms": ["admin:ALL:activity", "admin:QA:activity"]
}
```

`status: 'down'` means **no** gateway has attached a `server` — the socket.io layer failed to initialise, which is a real readiness failure. Zero connected sockets is not: an idle gateway is healthy.

- [ ] **Step 1: Write the failing spec**

`apps/api/apps/api-gateway/src/controllers/health.events.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthController } from './health.controller';

const redis: any = { ping: vi.fn(async () => 'PONG'), get: vi.fn(async () => null) };
const catalog: any = { stats: () => ({ status: 'up' }) };

function gatewayWith(sockets: number, rooms: number, name: string) {
  return {
    server: {
      name,
      fetchSockets: async () => Array.from({ length: sockets }, (_, i) => ({ id: `s${i}` })),
      sockets: {
        adapter: { rooms: new Map(Array.from({ length: rooms }, (_, i) => [`r${i}`, new Set()])) },
      },
      adapter: { rooms: new Map() },
    },
  } as any;
}

describe('GET /health/ready — events', () => {
  beforeEach(() => {
    process.env.SKIP_DB = 'true';
    process.env.SKIP_KAFKA = 'true';
  });
  afterEach(() => {
    delete process.env.SKIP_DB;
    delete process.env.SKIP_KAFKA;
  });

  it('reports the producer state, not just that the port answers', async () => {
    const producer: any = { state: () => 'disconnected', isConnected: () => false };
    delete process.env.SKIP_KAFKA;
    const c = new HealthController(
      redis,
      catalog,
      producer,
      gatewayWith(0, 0, '/tracking'),
      gatewayWith(0, 0, '/orders'),
      gatewayWith(0, 0, '/seller'),
    );
    const out: any = await c.readiness();
    // The broker port may well accept — the producer still never handshook, and
    // every event since boot has been dropped by a publish() that logs and
    // returns.
    expect(out.checks.kafka.producer).toBe('disconnected');
    expect(out.status).toBe('degraded');
  });

  it('counts sockets per namespace and lists the admin rooms in use', async () => {
    const producer: any = { state: () => 'skipped', isConnected: () => false };
    const tracking = gatewayWith(2, 3, '/tracking');
    tracking.server.sockets.adapter.rooms = new Map([
      ['admin:ALL:activity', new Set(['a'])],
      ['admin:QA:activity', new Set(['b'])],
      ['sock-1', new Set(['a'])],
    ]);
    const c = new HealthController(
      redis,
      catalog,
      producer,
      tracking,
      gatewayWith(0, 0, '/orders'),
      gatewayWith(1, 1, '/seller'),
    );
    const out: any = await c.readiness();
    expect(out.checks.websocket.status).toBe('up');
    expect(out.checks.websocket.namespaces['/tracking'].sockets).toBe(2);
    expect(out.checks.websocket.adminRooms).toEqual(['admin:ALL:activity', 'admin:QA:activity']);
  });

  it('is down when no gateway ever attached a server', async () => {
    const producer: any = { state: () => 'skipped', isConnected: () => false };
    const c = new HealthController(redis, catalog, producer, {} as any, {} as any, {} as any);
    const out: any = await c.readiness();
    expect(out.checks.websocket.status).toBe('down');
    expect(out.status).toBe('degraded');
  });

  it('does not fail readiness for an idle but initialised namespace', async () => {
    const producer: any = { state: () => 'skipped', isConnected: () => false };
    const c = new HealthController(
      redis,
      catalog,
      producer,
      gatewayWith(0, 0, '/tracking'),
      gatewayWith(0, 0, '/orders'),
      gatewayWith(0, 0, '/seller'),
    );
    const out: any = await c.readiness();
    expect(out.checks.websocket.status).toBe('up');
    expect(out.status).toBe('ready');
  });
});
```

- [ ] **Step 2: Run it — FAIL** (`HealthController` takes two constructor arguments and reports neither check).

`npx vitest run apps/api-gateway/src/controllers/health.events.spec.ts`

- [ ] **Step 3: Extend the controller**

```ts
import { KafkaProducerService } from '@app/kafka';
import { TrackingGateway } from '../socket.gateway';
import { OrderGateway } from '../gateways/order.gateway';
import { SellerGateway } from '../gateways/seller.gateway';
```

```ts
  constructor(
    private readonly redis: RedisService,
    private readonly marketplaceCatalog: MarketplaceCatalogService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly tracking: TrackingGateway,
    private readonly orders: OrderGateway,
    private readonly sellers: SellerGateway,
  ) {}
```

In `readiness()`, after the existing Kafka block:

```ts
// A TCP accept is not a producer. `publish()` no-ops and logs when the
// producer never completed its handshake, which is exactly the state this
// probe used to report as "up": the port answered, the events went nowhere.
checks['kafka'] = { ...checks['kafka'], producer: this.kafkaProducer.state() };
if (checks['kafka'].producer === 'disconnected') checks['kafka'].status = 'down';
```

and before the `hasDown` line:

```ts
// ── WebSocket ─────────────────────────────────────────────────────────
// `getConnectionStats()` existed on two gateways and was called from no
// route, so a socket.io layer that failed to initialise was invisible to
// every probe. Zero sockets is not a failure — an idle namespace is healthy;
// a namespace with no `server` at all is not.
const namespaces: Record<string, { sockets: number; rooms: number }> = {};
const adminRooms = new Set<string>();
let initialised = 0;
for (const [name, gw] of [
  ['/tracking', this.tracking],
  ['/orders', this.orders],
  ['/seller', this.sellers],
] as const) {
  const server = (gw as any)?.server;
  if (!server?.fetchSockets) continue;
  initialised++;
  try {
    const sockets = await server.fetchSockets();
    const rooms: Map<string, unknown> = server.sockets?.adapter?.rooms ?? new Map();
    namespaces[name] = { sockets: sockets.length, rooms: rooms.size };
    for (const room of rooms.keys())
      if (String(room).startsWith('admin:')) adminRooms.add(String(room));
  } catch (err: any) {
    namespaces[name] = { sockets: -1, rooms: -1 };
    checks['websocket'] = { status: 'degraded', error: err?.message };
  }
}
checks['websocket'] = {
  status: initialised === 0 ? 'down' : initialised < 3 ? 'degraded' : 'up',
  namespaces,
  adminRooms: [...adminRooms].sort(),
  ...(checks['websocket']?.error ? { error: checks['websocket'].error } : {}),
};
```

- [ ] **Step 4: Run the spec, the suite and the build**

```bash
npx vitest run apps/api-gateway/src/controllers/health.events.spec.ts   # 4 passed
npx vitest run        # 711 + 4 = 715 passed
npx nest build --all  # exits 0
```

If `nest build` reports a circular import between `HealthController` and the gateway providers, wrap the three injections in `forwardRef(() => …)` rather than moving the gateways.

- [ ] **Step 5: Live check, both ways**

```bash
# broker up, gateway up
curl -s localhost:3001/api/v1/health/ready | node -pe \
  'const j=JSON.parse(require("fs").readFileSync(0)); JSON.stringify({status:j.status,kafka:j.checks.kafka,ws:j.checks.websocket},null,2)'
```

Expected: `status: "ready"`, `kafka.producer: "connected"`, `websocket.status: "up"` with all three namespaces.

```bash
# then stop the broker and re-probe
docker compose -f infra/docker/compose.infra.yml stop kafka
curl -s localhost:3001/api/v1/health/ready | node -pe '...same...'
```

Expected: `status: "degraded"`, `kafka.status: "down"`, `kafka.producer: "disconnected"`. Open an admin socket while the broker is down and re-probe: `websocket.status` stays `"up"` and `adminRooms` lists the room — WS and Kafka degrade independently, which is the point.

- [ ] **Step 6: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers/health.controller.ts \
        apps/api/apps/api-gateway/src/controllers/health.events.spec.ts
git commit -m "feat(gateway): readiness reports the kafka producer and every websocket namespace" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (E7): Taxi sockets — a driver's pin needs the driver's own session, and a locked admin needs a grant

**Closes:** AUD2-062 (P1, `joinAsDriver` / `updateDriverLocation` take `driverId` from the body), AUD2-133 (P2, `joinRideTracking` admits lower-case `admin`/`super_admin` to any ride room with no market check).

**`/admin-fleet` is not in scope here.** The audit assigns it to the taxi ops platform, not to EVENTS: it appears only in the programme's Plan D row D3 (`docs/superpowers/plans/2026-09-11-admin-platform-program.md:72`) and the design spec (`docs/superpowers/specs/2026-09-11-admin-platform-design.md:104`), and no §12 row carries it. AUD2-133's parenthetical "and there is still no admin fleet namespace" is a pointer to that plan, not a requirement of this one. What this task owes the TAXI plan is a `updateDriverLocation` whose `driverId` is trustworthy — because D3's `fleet:<countryCode>` fan-out is specified to piggyback on exactly this handler.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/gateways/taxi-tracking.gateway.ts:96-116` (`joinAsDriver`), `:126-180` (`updateDriverLocation`), `:199-216` (`joinRideTracking`)
- Create: `apps/api/apps/api-gateway/src/gateways/taxi-tracking.authz.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts:443-453` (grant for staff, after a scope check)

**Interfaces (what TAXI consumes):**

- `joinAsDriver` and `updateDriverLocation` no longer read `driverId` as an identity — the socket's own `user.id` is the driver, and a body `driverId` that disagrees is refused with `error { code: 'FORBIDDEN' }`. A dispatcher acting for a driver uses a fulfiller role (`admin`, `super_admin`, `vendor`) and keeps the body field.
- `joinRideTracking` grants: a global staff account joins any ride room; a **locked** admin must hold a `WsTrackingGrantService` grant, which `GET /taxi/ride/:rideId` issues only after its own ownership/scope check.
- Plan D's `fleet:<CC>` fan-out attaches inside `updateDriverLocation`, after the identity check, using the same `emitToAdmins(server, 'orders'|'fleet', …)` shape Task 1 introduced.

- [ ] **Step 1: Write the failing spec**

`apps/api/apps/api-gateway/src/gateways/taxi-tracking.authz.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxiTrackingGateway } from './taxi-tracking.gateway';

function fakeSocket(user: unknown) {
  const joined: string[] = [],
    emitted: Array<[string, any]> = [];
  return {
    id: 'sock-1',
    user,
    rooms: new Set<string>(),
    handshake: { auth: {}, query: {} },
    join: vi.fn((r: string) => {
      joined.push(r);
    }),
    leave: vi.fn(),
    emit: vi.fn((e: string, p: any) => {
      emitted.push([e, p]);
    }),
    disconnect: vi.fn(),
    joined,
    emitted,
  } as any;
}

const redis: any = {
  hset: vi.fn(async () => undefined),
  hdel: vi.fn(async () => undefined),
  geoadd: vi.fn(async () => undefined),
  geodel: vi.fn(async () => undefined),
  georadius: vi.fn(async () => []),
};
const ddos: any = { validateConnection: vi.fn(async () => true), handleDisconnection: vi.fn() };

const driver = { id: 'drv-1', role: 'driver' };
const customer = { id: 'cus-1', role: 'customer' };
const globalAdmin = { id: 'adm-g', role: 'super_admin' };
const qaAdmin = { id: 'adm-qa', role: 'admin', regionCode: 'QA', regionLocked: true };

describe('TaxiTrackingGateway driver identity', () => {
  let gw: TaxiTrackingGateway, grants: any;
  beforeEach(() => {
    grants = { has: vi.fn(async () => false) };
    gw = new TaxiTrackingGateway(redis, ddos, grants);
    redis.geoadd.mockClear();
  });

  it('refuses a customer registering as a driver', async () => {
    const c = fakeSocket(customer);
    await gw.handleJoinAsDriver(c, { driverId: 'drv-1' });
    expect(c.joined).toEqual([]);
    expect(c.emitted[0][0]).toBe('error');
  });

  it("refuses a driver claiming another driver's id", async () => {
    const c = fakeSocket(driver);
    await gw.handleJoinAsDriver(c, { driverId: 'drv-999' });
    expect(c.joined).toEqual([]);
  });

  it('registers a driver under their own id', async () => {
    const c = fakeSocket(driver);
    await gw.handleJoinAsDriver(c, { driverId: 'drv-1' });
    expect(c.joined).toEqual(['driver_drv-1']);
  });

  it("refuses a customer moving a driver's pin", async () => {
    const c = fakeSocket(customer);
    await gw.handleDriverLocationUpdate(c, { driverId: 'drv-1', lat: 25.2, lng: 51.5, heading: 0 });
    expect(redis.geoadd).not.toHaveBeenCalled();
    expect(c.emitted[0][0]).toBe('error');
  });

  it('lets a dispatcher role move a named driver', async () => {
    const c = fakeSocket(globalAdmin);
    await gw.handleDriverLocationUpdate(c, { driverId: 'drv-1', lat: 25.2, lng: 51.5, heading: 0 });
    expect(redis.geoadd).toHaveBeenCalled();
  });
});

describe('TaxiTrackingGateway ride rooms', () => {
  it('lets a global admin watch any ride', async () => {
    const gw = new TaxiTrackingGateway(redis, ddos, { has: vi.fn(async () => false) } as any);
    const c = fakeSocket(globalAdmin);
    await gw.handleJoinRideTracking(c, 'ride-1');
    expect(c.joined).toEqual(['ride_ride-1']);
  });

  it('refuses a locked admin without a grant, market unknown to this gateway', async () => {
    // The gateway's own `TaxiRide` entity carries no country column, so the
    // ride's market cannot be established here. Fail closed: the grant, which
    // `GET /taxi/ride/:rideId` issues after its own scope check, is the market
    // evidence.
    const gw = new TaxiTrackingGateway(redis, ddos, { has: vi.fn(async () => false) } as any);
    const c = fakeSocket(qaAdmin);
    await gw.handleJoinRideTracking(c, 'ride-1');
    expect(c.joined).toEqual([]);
    expect(c.emitted[0][1].message).toMatch(/market/i);
  });

  it('lets a locked admin in once the scoped HTTP route has granted it', async () => {
    const gw = new TaxiTrackingGateway(redis, ddos, { has: vi.fn(async () => true) } as any);
    const c = fakeSocket(qaAdmin);
    await gw.handleJoinRideTracking(c, 'ride-1');
    expect(c.joined).toEqual(['ride_ride-1']);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

`npx vitest run apps/api-gateway/src/gateways/taxi-tracking.authz.spec.ts`
Expected: FAIL on five of eight — the customer registers as `drv-1`, moves the pin, and the locked admin walks into `ride_ride-1` through the `STAFF` short-circuit.

- [ ] **Step 3: Make the driver identity come from the session**

In `taxi-tracking.gateway.ts`:

```ts
/**
 * Who may announce a driver's position.
 *
 * Everything below took `driverId` out of the message body and wrote it to the
 * GEO index and the live map. The socket is JWT-authenticated, so the caller had
 * to be *somebody* — but any signed-in customer could name any driver and move
 * that driver's pin on the customer's tracking screen and the admin fleet view.
 * `OrderGateway.handleDeliveryLocation` already applies exactly this check for
 * the delivery equivalent (`order.gateway.ts:270-279`); this is the same list.
 */
const FULFILLERS = new Set([
  'admin',
  'super_admin',
  'vendor',
  'driver',
  'taxi_driver',
  'delivery',
  'delivery_driver',
  'delivery_boy',
]);

/**
 * The driver this socket may act for: their own id, unless they hold a
 * dispatcher role, in which case they may name one. Returns null when refused.
 */
function actingDriverId(client: Socket, requested: string | undefined): string | null {
  const user = (client as unknown as { user?: { id?: string; role?: string } }).user;
  const role = String(user?.role ?? '').toLowerCase();
  if (!user?.id || !FULFILLERS.has(role)) return null;
  const DISPATCHERS = new Set(['admin', 'super_admin', 'vendor']);
  if (DISPATCHERS.has(role)) return requested ?? user.id;
  return !requested || requested === user.id ? user.id : null;
}
```

```ts
  @SubscribeMessage('joinAsDriver')
  async handleJoinAsDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId?: string },
  ) {
    const driverId = actingDriverId(client, data?.driverId);
    if (!driverId) {
      this.logger.warn(`[ws-driver-denied] socket ${client.id} tried to register as ${data?.driverId}`);
      client.emit('error', { code: 'FORBIDDEN', message: 'Only a driver may register a driver session.' });
      return;
    }
    await this.redis.hset('socket:driver', client.id, driverId);
    if (!this.driverSockets.has(driverId)) this.driverSockets.set(driverId, new Set());
    this.driverSockets.get(driverId)!.add(client.id);
    client.join(`driver_${driverId}`);
    this.logger.log(`Driver ${driverId} registered with socket ${client.id}`);
  }
```

`handleDriverLocationUpdate` gets the same two lines first, then uses the resolved `driverId` everywhere `data.driverId` appears (six sites: `geoadd`, `hset` on `DRIVER_META_KEY`, `hset` on `socket:driver`, the in-memory map, and both `ride_` emits):

```ts
const driverId = actingDriverId(client, data?.driverId);
if (!driverId) {
  this.logger.warn(`[ws-driver-denied] socket ${client.id} sent a location for ${data?.driverId}`);
  client.emit('error', {
    code: 'FORBIDDEN',
    message: 'Only a delivery or taxi partner may report a location.',
  });
  return;
}
```

- [ ] **Step 4: Fail closed on the ride room for a locked admin**

```ts
  @SubscribeMessage('joinRideTracking')
  async handleJoinRideTracking(@ConnectedSocket() client: Socket, @MessageBody() rideId: string) {
    if (!rideId) return;
    const user = (client as unknown as { user?: any }).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const role = String(user.role ?? '').toLowerCase();
    const STAFF = ['admin', 'super_admin', 'driver', 'taxi_driver', 'delivery', 'vendor'];
    // A region-locked admin is not global staff. The ride room carries a live
    // GPS trace and the rider's trip; the gateway's own `TaxiRide` entity has no
    // country column (`entities/taxi.entity.ts:179-235`), so this handler cannot
    // establish the ride's market for itself. Fail closed: a locked admin needs
    // the grant, which `GET /taxi/ride/:rideId` issues only after checking the
    // ride against their scope. When the taxi ops entities land (Plan D /
    // AUD2-126) the ride's `countryCode` becomes readable here and this can
    // become a positive check.
    const locked = role !== 'super_admin' && user.regionLocked === true;
    const staffPass = STAFF.includes(role) && !locked;

    if (!staffPass && !(await this.trackingGrants.has(rideId, user.id))) {
      this.logger.warn(
        `[region-scope-denied] user=${user.id} role=${role} scope=${user.regionCode ?? '-'} ` +
          `what="that ride" room=ride_${rideId}`,
      );
      client.emit('error', {
        code: 'FORBIDDEN',
        message: locked
          ? `Open the ride first — a market-restricted account may only watch rides in its own market.`
          : 'You may only track your own rides',
      });
      return;
    }

    client.join(`ride_${rideId}`);
    this.logger.log(`Client ${client.id} joined tracking room: ride_${rideId}`);
  }
```

- [ ] **Step 5: Let the scoped HTTP route issue the grant to staff**

`taxi.controller.ts:443-453` currently short-circuits for `SUPER_ADMIN` only, so an `ADMIN` — locked or not — is refused by the ownership check and never gets a grant. Widen it to staff **with** the scope assertion that makes the grant meaningful:

```ts
const staff = isStaffRole(role);
if (!staff && ride.customerId !== userId && ride.driverId !== userId) {
  throw new ForbiddenException('You do not have permission to view this ride details.');
}
if (staff) {
  // A locked admin may only open a ride in their own market. The ride row
  // this connection can read carries no market yet (Plan D adds it), so a
  // locked admin is refused outright rather than shown a ride that might be
  // another market's — the same fail-closed rule `refuseLockedAdmin` applies
  // to platform-wide targets.
  refuseLockedAdmin(req, 'that ride');
}

await this.trackingGrants.grant(rideId, userId);
```

(`isStaffRole` from `@app/common`; `refuseLockedAdmin` from `../guards/market-scope`.)

- [ ] **Step 6: Run the spec, the suite and the build**

```bash
npx vitest run apps/api-gateway/src/gateways/taxi-tracking.authz.spec.ts   # 8 passed
npx vitest run        # 715 + 8 = 723 passed
npx nest build --all  # exits 0
```

- [ ] **Step 7: Live check**

Against the throwaway gateway on 3099, with a customer token and a driver token:

```bash
node -e "
const {io}=require('socket.io-client');
const s=io('http://localhost:3099/taxi',{transports:['websocket'],auth:{token:process.env.CUSTOMER_TOKEN},reconnection:false});
s.on('connect',()=>s.emit('updateDriverLocation',{driverId:process.env.DRIVER_ID,lat:25.2,lng:51.5,heading:0}));
s.on('error',e=>{console.log('refused:',e);s.close();});
setTimeout(()=>{console.log('no refusal — FAIL');s.close();},4000);
"
```

Expected: `refused: { code: 'FORBIDDEN', message: 'Only a delivery or taxi partner may report a location.' }`, and

```bash
docker exec kartseek-redis redis-cli ZSCORE drivers:locations "$DRIVER_ID"
```

unchanged (the pin did not move). Repeat with the driver's own token and the same body: the command succeeds and `ZSCORE` changes. Then `joinRideTracking` as the QA admin on a ride they have not opened → `FORBIDDEN` with the market wording; open `GET /taxi/ride/:rideId` first as the **global** admin and rejoin → admitted.

- [ ] **Step 8: Commit**

```bash
git add apps/api/apps/api-gateway/src/gateways/taxi-tracking.gateway.ts \
        apps/api/apps/api-gateway/src/gateways/taxi-tracking.authz.spec.ts \
        apps/api/apps/api-gateway/src/controllers/taxi.controller.ts
git commit -m "fix(gateway): a driver's location needs the driver's own session; locked admins need a ride grant" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Deferred (P3)

**Empty.** All eleven EVENTS rows in §12 are implemented by a task above, including the two P3 rows — AUD2-152 (stale `/tracking` comments) is corrected in Task 4 Step 3 as part of restoring the namespace, and AUD2-153 (WS readiness) is Task 6. Neither is large enough to be worth carrying, and leaving AUD2-152 would have left three comments actively arguing against Task 4's change.

One item is deliberately **out of scope and pointed elsewhere**: the `/admin-fleet` namespace with `fleet:<countryCode>` rooms. It belongs to the taxi ops platform (`docs/superpowers/plans/2026-09-11-admin-platform-program.md` row D3; design at `docs/superpowers/specs/2026-09-11-admin-platform-design.md:104`) and carries no AUD2 id. Task 7 leaves it the prerequisite it needs: a `driverId` that has been proved.

Two findings surfaced while reading the code and are **not** AUD2 rows; each is handled where it was found rather than filed:

1. `SellerGateway.handleJoinGenericRoom` joined any room named in the message body, including `admin:sellers` — closed in Task 1, Step 10.
2. 159 produced topic strings were never declared and so could never exist on the broker; AUD2-131 names two of them. Closed in Task 2 and pinned by a spec.

A third is **left open and named** rather than half-fixed: `POST /users/partner/:partnerId/kyc/submit` (`user.controller.ts:201-221`) publishes `admin.kyc.submitted` but writes no `admin:kyc:pending:*` Redis key, so the submission reaches the live feed (Task 3) and never reaches `GET /admin/kyc/pending`. That is a CONSOLE/REGIONAL defect in the KYC queue's write path, not an events defect — raise it against the KYC work rather than papering over it here.

---

## Self-review

**Every EVENTS row → exactly one task**

| AUD2 id  | P   | Finding                                                                    | Task                                    |
| -------- | --- | -------------------------------------------------------------------------- | --------------------------------------- |
| AUD2-062 | P1  | `joinAsDriver`/`updateDriverLocation` trust a body `driverId`              | E7                                      |
| AUD2-063 | P1  | `/tracking` `subscribe_admin` has no role check                            | E1                                      |
| AUD2-064 | P1  | `escrow.hold.wallet` / `escrow.release.wallet` consumed, never published   | E5 (removed — double-credit)            |
| AUD2-065 | P1  | `order.delivered` consumed, never published; namespaced variant unconsumed | E5 (connected — stuck ledger)           |
| AUD2-129 | P2  | Console has no live-update path; `useAdminSocket` unused                   | E4 (wired, after E3 gave it a producer) |
| AUD2-130 | P2  | Restaurant bridges emit where no client listens                            | E3                                      |
| AUD2-131 | P2  | `admin.user.unbanned` / `admin.kyc.rejected` unprovisioned                 | E2 (plus 157 more of the same)          |
| AUD2-132 | P2  | `admin.user.banned` / `.kyc.approved` / `.kyc.submitted` have no consumer  | E3                                      |
| AUD2-133 | P2  | `joinRideTracking` admits a locked admin to any ride room                  | E7                                      |
| AUD2-152 | P3  | Three comments claim `/tracking` does not exist                            | E4                                      |
| AUD2-153 | P3  | `/health/ready` reports no WS state                                        | E6                                      |

11 rows, 7 tasks, no row in two tasks, no row deferred.

**§5 module independence, event rows.** The three accidental couplings that are event-shaped are §5 #6 (payout-service consuming topics nothing publishes) → E5; #7 (payment-service consuming a bare `order.delivered` while the namespaced one goes unconsumed) → E5; #8 (restaurant bridges aimed at a namespace no client is on) → E3. The four **intended** couplings (#1-#4: wallet and loyalty consuming `refund.approved`, search consuming the product events, the WS bridge as the designated integration point) are left exactly as they are — each writes only its own store, which is the rule, and E2's orphan-consumer spec now protects them from becoming dead the way #6 and #7 did. §5's remaining accidental rows (#9-#14: the shared main database, the unprefixed Redis key space, duplicated admin surfaces on public controllers, the unguarded module HTTP surfaces, the gateway's duplicate taxi fare code) are database, cache, REGIONAL, MODULES and TAXI workstream rows with their own AUD2 ids and their own plans; none is an event handler mutating another module's records, and §5 #15 records that no such case exists.

**Placeholder scan.** No task adds a `TODO`, a `mock`, a hard-coded figure or a UI control without a server behind it. Three things are _removed_ on exactly those grounds: `pushAdminSystemAlert` and the hook's `system_alert` counter (no producer anywhere — E1 Step 8), payout-service's escrow ledger (E5), and the `admin.kyc.submitted` → console queue path is explicitly named as still broken rather than faked (Deferred section). Task 4 renders three distinct honest states (live-and-empty, polling, refused) instead of a permanently green indicator, and Task 2 refuses to declare the three `*.order.delivered` variants that have no producer — a provisioned topic nobody publishes is the same lie as an unprovisioned one nobody can.

**Consistency.**

- Room names are spelled in one file (`admin-rooms.ts`) and every gateway and the bridge import from it; the console never names a room at all.
- `ALL` / `<CC>` room pairing matches `assertInMarket`'s treatment of a market-less record (global only), and `socketMarket` matches `marketScopeOf`'s rule that SUPER_ADMIN is never locked and a `regionCode` without `regionLocked` is not a lock.
- Permission keys (`dashboard.view`, `orders.view`, `sellers.view`, `modules.grocery`, `modules.pharmacy`) all exist in `ADMIN_PERMISSIONS` (`libs/common/src/admin/permissions.ts:26-84`) and `'*'` is honoured the same way `RolesGuard` honours it.
- Task ordering is a real dependency chain: E1 creates the rooms E3 emits into and E4 subscribes to; E2 declares the topics E3 subscribes to and E5 consumes; E2's second assertion is deliberately left red until E5 and that is stated in E2's commit body. Running them out of order will fail visibly rather than silently.
- Test totals are cumulative and stated per task: 677 → 700 (E1) → 702+1 red (E2) → 708 (E3) → web 610 → 615 (E4) → 711 all green (E5) → 715 (E6) → 723 (E7).
- Every task ends with a live check that exercises the real workflow with a real token, and every commit message is lower-case, under 100 characters, and carries the required trailer.
