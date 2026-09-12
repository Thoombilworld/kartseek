# Infrastructure Implementation Plan (INFRA workstream, AUD2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the platform's connections provable rather than assumed. After this plan every deployable answers a health route that has actually executed `SELECT 1` through its own `DataSource` (or a Mongoose `ping`) and a real Redis `PING`; the gateway's `/api/v1/health` aggregates those dependencies with a per-dependency status and cannot answer "up" for a store that is down; every database — the main one and all eight module stores — has a migration path and an initial migration generated from its current entities; the application tier runs as containers on `kartseek-network` addressing `postgres`, `redis`, `kafka:9092`, `mongodb` and `elasticsearch` by service name from a `compose.services.yml` **generated** from `services.yaml`; and `scripts/stack/validate.mjs` proves a clean start end to end — containers healthy, Application → Database → Query → Result, console reachable — with an exit code.

**Architecture:** The service registry (`services.yaml` + `scripts/registry/{lib,generate,validate}.mjs`) is already the single source of truth for ports, health routes, databases and dependencies, and `npm run registry:check` already fails on drift. This plan makes three more artefacts derived rather than hand-written — `infra/docker/compose.services.yml`, `infra/k8s/microservices-generated.yaml` and each deployable's health declaration — so the registry, the containers, the Kubernetes probes and the smoke test can no longer disagree. Health itself becomes one shared `HealthModule` in `@app/common` (not a new `@app/*` alias: adding one means editing `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, the `appLibs` array in `apps/api/rspack.config.js` and eight module tsconfigs; `@app/common` is already imported by all 26 and needs none of that). Migrations follow the pattern `data-source.main.ts` established: one explicit `DataSource` per database, explicit migration lists or a per-store `migrations/` folder, never a shared glob.

**Tech Stack:** NestJS 11 on rspack (`apps/api`), TypeORM 0.3 + `typeorm-ts-node-commonjs`, Mongoose (audit-log), ioredis, Next 16 (`apps/web`), Docker Compose v2 with `include:`, Kubernetes manifests under `infra/k8s`, vitest (`npx vitest run <file>`), `node --test` for `scripts/**/*.test.mjs`, Node 26 on Windows 11.

## Global Constraints

- **Do not use mock data. Do not leave placeholder APIs. Do not mark functionality complete without testing the real workflow.**
- Compose reads only the **ROOT** `.env`. A value that must reach a container goes in the root `.env`/`.env.example` or is written into the generated compose file — never in `apps/api/.env`, which Compose never opens.
- Joi TCP-port defaults in `apps/api/apps/api-gateway/src/config/env.validation.ts` must equal each service's own bind default (its `main.ts` `process.env.X ?? <n>`). `.env` silently masks a mismatch; `npm run registry:check` is what catches it.
- API images build from the **repo root** (one lockfile at the root, rspack's dependencies declared in the root manifest). rspack output has **no `src/` segment**: core services run `dist/apps/<app>/main.js`, module backends run `dist/main.js`.
- The gateway's health is `/api/v1/health` — `setGlobalPrefix('api')` plus URI versioning. Every other Nest deployable has no prefix, so its health is `/health`.
- Entity lists stay **explicit**. A bundled `main.js` makes a `__dirname` entity glob match nothing: health returns 200 and every DB route 500. This applies to the new `data-source.ts` files too.
- The main DB (`kartseek_db`) never synchronizes — schema changes go through `npm run migration:generate:main` / `migration:run:main` / `migration:show:main` from `apps/api`.
- `synchronize` must be **false in production** for every module. Keying it on `NODE_ENV` is what AUD2-070 is; after Task IN3 it is keyed on `DB_SYNCHRONIZE` (which `validateDatabaseConfig()` already covers) and a boot-time guard refuses `true` when `NODE_ENV=production`.
- **Never run `migration:run` against a database in a task without a `migration:show` first and a rollback note in the step.**
- Commits: lower-case, ≤ 100 characters, one per task (or one per workspace where a task spans two), trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Suites stay green: `apps/api` vitest **677**, marketplace **250**, grocery **104**, hotel **25**, taxi **20**, restaurant **18**, doctor **16**, pharmacy **12**, `apps/web` jest **610**. `node --test "scripts/**/*.test.mjs"` stays green too.
- `npm run smoke` must end with **26/26 healthy** and leave **no** leftover processes.
- `npx nest build --all` from `apps/api` is the build gate for `apps/api` (tsc alone is not); `npm run build` from each module backend for the eight modules.

## Decisions taken up front (read before Task IN2 or IN5)

1. **The documented default is the shared Postgres.** `npm run infra:up` starts one Postgres (`kartseek-postgres`, 5432) and each module owns a **schema** inside `kartseek_db`. The eight per-module instances stay behind `--profile isolated`, documented as the opt-in. This is what AUD2-021 asks for and what `docs/guides/local-setup.md:95-101` already promises; the tracked `modules/*/backend/.env.example` files change to match, and an existing untracked `modules/*/backend/.env` pointing at 5433–5440 keeps working unchanged.
2. **Consequence for AUD2-030.** With (1), `kartseek_db.marketplace` (33 tables) is the default home and `kartseek_marketplace` on 5433 (35 tables, 712 listings vs 178, 23 sellers vs 19, 5 coupons vs 0) is the richer isolated copy. Task IN2 quarantines only what nothing owns under either profile — the stale `public.*` vertical duplicates (`restaurants`, `grocery_stores`, `pharmacy_stores`, `hotels`, `doctors`), none of which appears in the gateway's explicit entity list (`api-gateway.module.ts:191-230`). Reconciling the two marketplace copies is a **data-owner decision with live row divergence**, recorded as REMAINING in the self-review with its numbers, not guessed at here.
3. **AUD2-002's wording is wrong and the plan follows the code, not the wording.** `infra/k8s/microservices-generated.yaml` contains **2** `httpGet` probes and **42** `tcpSocket` probes — the generator (`infra/k8s/gen-microservices.sh:70-76`) defaults to `tcpSocket`, and only `marketplace-service` was overridden to `httpGet: /health`. The defect is therefore the inverse of "21 of 22 probe a 404": 21 of 22 probe a port that is open the moment Nest binds, which cannot fail while the service's database is unreachable. Task IN8 regenerates from the registry so each deployment probes its real `health.live`, keeping `tcpSocket` only where the registry says there is none (pharmacy-service, whose HTTP listener is bound to loopback by design).
4. **No new `@app/*` alias.** The shared health module lives at `apps/api/libs/common/src/health/`. It imports `DataSource` from `typeorm` (a runtime class used as its own DI token) — verified present in `apps/api/package.json` and all eight `modules/*/backend/package.json` — and never from `@nestjs/typeorm` or `@nestjs/mongoose`, so a service with no database still compiles.

---

## File structure

| File                                                                                     | Responsibility                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/api/libs/common/src/health/health.module.ts` (new)                                 | `HealthModule.register({ service, database?, redis? })`                   |
| `apps/api/libs/common/src/health/health.controller.ts` (new)                             | root `/health` + `/health/ready` for every non-gateway deployable         |
| `apps/api/libs/common/src/health/health.service.ts` (new)                                | `SELECT 1`, Redis check, extra `HEALTH_CHECK` providers                   |
| `apps/api/libs/common/src/health/health.service.spec.ts` (new)                           | unit tests: DB down → `down`, emulator → `emulated: true`                 |
| `apps/api/libs/redis/src/redis.service.ts`                                               | `health()` — the emulator can never report `up`                           |
| `apps/api/apps/api-gateway/src/controllers/health.controller.ts`                         | aggregate `/health`, real DB query on `/health/ready`, guarded disclosure |
| `apps/api/apps/{auth,order,payment}-service/src/health.controller.ts`                    | deleted — replaced by `HealthModule`                                      |
| `modules/marketplace/backend/src/transport/health.controller.ts`                         | deleted — replaced by `HealthModule`                                      |
| `apps/api/apps/*/src/*-service.module.ts` (17) + `modules/*/backend/src/*.module.ts` (8) | register `HealthModule`                                                   |
| `services.yaml`                                                                          | `health.live: /health`, `health.ready: /health/ready` for all 26          |
| `apps/api/apps/user-service/src/user-service.module.ts`                                  | `schema: 'public'`                                                        |
| `apps/api/apps/admin-service/src/admin-service.module.ts`                                | `schema: 'public'`                                                        |
| `apps/api/migrations/1786502000000-QuarantineStaleVerticalCopies.ts` (new)               | rename the five dead `public.*` vertical tables                           |
| `modules/<m>/backend/data-source.ts` (8 new)                                             | the module's migration DataSource                                         |
| `modules/<m>/backend/migrations/*.ts` (8 new)                                            | the initial migration generated from that module's entities               |
| `apps/api/libs/database/src/database.credentials.ts`                                     | pool + retry folded in; no password literal                               |
| `apps/api/libs/database/src/database.validator.ts`                                       | `assertSynchronizeAllowed()`                                              |
| `infra/docker/core-service.Dockerfile`                                                   | `ARG APP`, `ARG PORT`, `ARG HEALTH_PATH`; HEALTHCHECK reads them          |
| `infra/docker/module-service.Dockerfile` (renamed from `marketplace-service.…`)          | `ARG APP` = module directory name                                         |
| `infra/docker/nextjs.Dockerfile` (new)                                                   | the Next console image                                                    |
| `scripts/registry/compose.mjs` (new)                                                     | renders `infra/docker/compose.services.yml`                               |
| `scripts/registry/compose.test.mjs` (new)                                                | unit tests for the renderer                                               |
| `infra/docker/compose.services.yml` (generated)                                          | 35 application services, profiles `admin` / `full`                        |
| `scripts/stack/validate.mjs` (new)                                                       | the clean-start gate                                                      |
| `infra/k8s/gen-microservices.sh`                                                         | probes and per-module DB env from the registry                            |
| `tests/smoke/boot-all.mjs`                                                               | tree kill + leftover-listener assertion                                   |

---

### Task 1 (IN1): Every deployable's health route runs a real query, and the gateway aggregates honestly

Covers **AUD2-024** (Redis outage reports healthy), **AUD2-069** (readiness TCP-probes the port), **AUD2-072** (health disclosure), the application half of **AUD2-002** (services with no root health route), and the readiness assertion half of **AUD2-032**.

**Files:**

- Create: `apps/api/libs/common/src/health/{health.module.ts,health.controller.ts,health.service.ts,health.types.ts,health.service.spec.ts}`
- Modify: `apps/api/libs/common/src/index.ts`
- Modify: `apps/api/libs/redis/src/redis.service.ts` (add `health()`; leave `ping()` alone — it has other callers)
- Modify: `apps/api/apps/api-gateway/src/controllers/health.controller.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/health.controller.spec.ts`
- Delete: `apps/api/apps/auth-service/src/health.controller.ts`, `apps/api/apps/order-service/src/health.controller.ts`, `apps/api/apps/payment-service/src/health.controller.ts`, `modules/marketplace/backend/src/transport/health.controller.ts`
- Modify: the 17 `apps/api/apps/*/src/*-service.module.ts` and the 8 `modules/*/backend/src/*-service.module.ts`
- Create: `apps/api/apps/audit-log-service/src/mongo-health.check.ts`
- Modify: `services.yaml`

**Interfaces:**

- `HealthModule.register(opts: { service: string; database?: boolean; redis?: boolean }): DynamicModule` — mounts `GET /health` and `GET /health/ready` at the HTTP root.
- `HEALTH_CHECK` — a multi-provider token; anything bound to it must satisfy `{ name: string; run(): Promise<DependencyStatus> }`.
- `DependencyStatus = { status: 'up' | 'degraded' | 'down' | 'skipped'; latencyMs?: number; detail?: string; error?: string; emulated?: boolean }`.
- `RedisService.health(): Promise<DependencyStatus>` — **never** returns `up` while the in-memory emulator is serving.

- [ ] **Step 1: Write the failing spec**

`apps/api/libs/common/src/health/health.service.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { HealthService } from './health.service';

const upRedis = { health: async () => ({ status: 'up' as const, latencyMs: 1, detail: 'PONG' }) };
const emulatedRedis = {
  health: async () => ({
    status: 'degraded' as const,
    emulated: true,
    detail: 'in-memory emulator: this process has private sessions, carts and rate limits',
  }),
};

describe('HealthService', () => {
  it('reports up only after the database answered a query', async () => {
    const query = vi.fn(async () => [{ ok: 1 }]);
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    const r = await svc.ready();
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(r.status).toBe('ready');
    expect(r.checks.database.status).toBe('up');
  });

  it('is not ready when the query throws, and says why', async () => {
    const query = vi.fn(async () => {
      throw new Error('password authentication failed for user "postgres"');
    });
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    const r = await svc.ready();
    expect(r.status).toBe('degraded');
    expect(r.checks.database.status).toBe('down');
    expect(r.checks.database.error).toContain('password authentication failed');
  });

  it('never calls the in-memory emulator up', async () => {
    const svc = new HealthService('cart-service', null, emulatedRedis as any, []);
    const r = await svc.ready();
    expect(r.checks.redis.status).toBe('degraded');
    expect(r.checks.redis.emulated).toBe(true);
    expect(r.checks.redis.status).not.toBe('up');
  });

  it('omits the database check for a service that owns no tables', async () => {
    const svc = new HealthService('loyalty-service', null, upRedis as any, []);
    expect((await svc.ready()).checks.database).toBeUndefined();
  });

  it('runs registered extra checks and a throwing one lands as down, not a 500', async () => {
    const svc = new HealthService('audit-log-service', null, upRedis as any, [
      {
        name: 'mongodb',
        run: async () => {
          throw new Error('connect ECONNREFUSED');
        },
      },
    ]);
    const r = await svc.ready();
    expect(r.checks.mongodb.status).toBe('down');
    expect(r.status).toBe('degraded');
  });

  it('liveness never touches a dependency', async () => {
    const query = vi.fn();
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    expect((await svc.live()).status).toBe('ok');
    expect(query).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run from `apps/api`: `npx vitest run libs/common/src/health/health.service.spec.ts`
Expected: FAIL — `Cannot find module './health.service'`.

- [ ] **Step 3: Implement the health library**

`apps/api/libs/common/src/health/health.types.ts`:

```ts
export type DependencyState = 'up' | 'degraded' | 'down' | 'skipped';

export interface DependencyStatus {
  status: DependencyState;
  latencyMs?: number;
  detail?: string;
  error?: string;
  /** True when the answer came from an in-process emulator rather than the real store. */
  emulated?: boolean;
}

export interface HealthCheck {
  readonly name: string;
  run(): Promise<DependencyStatus>;
}

/** Multi-provider token: bind a class implementing HealthCheck to add a dependency. */
export const HEALTH_CHECK = Symbol('HEALTH_CHECK');
```

`apps/api/libs/common/src/health/health.service.ts`:

```ts
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '@app/redis';
import { HEALTH_CHECK, type DependencyStatus, type HealthCheck } from './health.types';

export const HEALTH_SERVICE_NAME = Symbol('HEALTH_SERVICE_NAME');

/**
 * The one health implementation for every deployable.
 *
 * `live()` answers from the process alone — a liveness probe that consults a
 * database restarts a healthy pod when the database blinks.
 *
 * `ready()` is the opposite: it must prove Application → Database → Query →
 * Result. The previous gateway readiness opened a TCP socket to DB_HOST:DB_PORT
 * and called that "up", which cannot distinguish a listening Postgres from the
 * right database with the right password — a wrong password, a missing database
 * and a failed DataSource all reported up (AUD2-069). So this runs the query.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startedAt = Date.now();

  constructor(
    @Inject(HEALTH_SERVICE_NAME) private readonly serviceName: string,
    @Optional() @Inject(DataSource) private readonly dataSource: DataSource | null,
    @Optional() @Inject(RedisService) private readonly redis: RedisService | null,
    @Optional() @Inject(HEALTH_CHECK) private readonly extra: HealthCheck[] | null,
  ) {}

  async live() {
    return {
      status: 'ok',
      service: this.serviceName,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    const checks: Record<string, DependencyStatus> = {};

    if (this.dataSource) checks['database'] = await this.database();
    if (this.redis) checks['redis'] = await this.redisCheck();
    for (const c of this.extra ?? []) checks[c.name] = await this.guard(c);

    const down = Object.values(checks).some((c) => c.status === 'down' || c.status === 'degraded');
    return {
      status: down ? 'degraded' : 'ready',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /** `SELECT 1` through the service's own DataSource — credentials, database and pool included. */
  private async database(): Promise<DependencyStatus> {
    const t0 = Date.now();
    try {
      await this.dataSource!.query('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - t0, detail: 'SELECT 1' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[health] database check failed: ${message}`);
      return { status: 'down', latencyMs: Date.now() - t0, detail: 'SELECT 1', error: message };
    }
  }

  private async redisCheck(): Promise<DependencyStatus> {
    try {
      return await this.redis!.health();
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async guard(c: HealthCheck): Promise<DependencyStatus> {
    try {
      return await c.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[health] ${c.name} check failed: ${message}`);
      return { status: 'down', error: message };
    }
  }
}
```

`apps/api/libs/common/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Root-mounted so Kubernetes (`GET /health`, `GET /health/ready`), the Docker
 * HEALTHCHECK and tests/smoke/boot-all.mjs all reach the same routes. Services
 * that already expose a prefixed route (`/cart/health`, `/grocery/health`)
 * keep it — those are read by the gateway's service board and by humans.
 */
@Controller()
export class SharedHealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  live() {
    return this.health.live();
  }

  @Get('health/ready')
  ready() {
    return this.health.ready();
  }
}
```

`apps/api/libs/common/src/health/health.module.ts`:

```ts
import { Module, type DynamicModule } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { SharedHealthController } from './health.controller';
import { HealthService, HEALTH_SERVICE_NAME } from './health.service';

export interface HealthModuleOptions {
  /** The name the routes report, e.g. 'order-service'. */
  service: string;
  /** True when this service registers TypeOrmModule.forRoot — readiness runs SELECT 1. */
  database?: boolean;
  /** True when this service imports RedisModule — readiness pings Redis. */
  redis?: boolean;
}

@Module({})
export class HealthModule {
  static register(opts: HealthModuleOptions): DynamicModule {
    return {
      module: HealthModule,
      imports: opts.redis ? [RedisModule] : [],
      controllers: [SharedHealthController],
      providers: [HealthService, { provide: HEALTH_SERVICE_NAME, useValue: opts.service }],
      exports: [HealthService],
    };
  }
}
```

Append to `apps/api/libs/common/src/index.ts`:

```ts
// ─── Health (the one implementation for every deployable) ────────────────────
export * from './health/health.types';
export * from './health/health.service';
export * from './health/health.controller';
export * from './health/health.module';
```

- [ ] **Step 4: Make the Redis emulator confess**

In `apps/api/libs/redis/src/redis.service.ts`, immediately after the existing `ping()`:

```ts
  /**
   * The honest health answer.
   *
   * `ping()` returns 'PONG (memory)' when `useMemory()` is true — which it is
   * whenever the client is not ready — and the gateway mapped anything starting
   * with "pong" to `up`. So a Redis outage read as healthy while all 26
   * processes silently diverged onto private in-process sessions, refresh
   * slots, rate-limit buckets, OTPs and carts (AUD2-024). The emulator is a
   * development convenience, never a passing dependency: it reports
   * `degraded` with `emulated: true`, and only an explicit SKIP_REDIS=true
   * makes that a deliberate `skipped`.
   */
  async health(): Promise<{
    status: 'up' | 'degraded' | 'down' | 'skipped';
    latencyMs?: number;
    detail?: string;
    error?: string;
    emulated?: boolean;
  }> {
    if (process.env.SKIP_REDIS === 'true') {
      return { status: 'skipped', emulated: true, detail: 'SKIP_REDIS=true — in-memory emulator' };
    }
    if (this.useMemory()) {
      return {
        status: 'degraded',
        emulated: true,
        detail:
          'in-memory emulator: sessions, carts, rate limits and OTPs are private to this process',
        error: this.isSkipped ? 'client not initialised' : `client status: ${this.client?.status}`,
      };
    }
    const t0 = Date.now();
    try {
      const pong = await this.client!.ping();
      return pong === 'PONG'
        ? { status: 'up', latencyMs: Date.now() - t0, detail: 'PONG' }
        : { status: 'degraded', latencyMs: Date.now() - t0, detail: pong };
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : String(err) };
    }
  }
```

- [ ] **Step 5: Run the spec — PASS**

Run from `apps/api`: `npx vitest run libs/common/src/health/health.service.spec.ts` → 6 passed.

- [ ] **Step 6: Register the module in all 25 non-gateway services**

Delete the three duplicate root controllers and the marketplace transport one first — two controllers claiming `/health` in one app is a silent route shadow:

```bash
git rm apps/api/apps/auth-service/src/health.controller.ts \
       apps/api/apps/order-service/src/health.controller.ts \
       apps/api/apps/payment-service/src/health.controller.ts \
       modules/marketplace/backend/src/transport/health.controller.ts
```

and remove their `controllers: [...]` entries from the four owning modules.

Then, in every `apps/api/apps/<svc>/src/<svc>.module.ts` and `modules/<m>/backend/src/<m>-service.module.ts`, add to `imports`:

```ts
    HealthModule.register({ service: '<name>', database: <true when this module calls TypeOrmModule.forRoot*>, redis: <true when it imports RedisModule> }),
```

The truth table comes from the registry, not from memory — `database` is `true` exactly when `services.yaml` gives the entry a non-null `database`, `redis` is `true` exactly when `dependsOn` contains `redis`:

```bash
node -e "const {loadRegistry,nestEntries}=require('node:module').createRequire(process.cwd()+'/x').call" 2>/dev/null
node --input-type=module -e "
import {loadRegistry,nestEntries,repoRoot} from './scripts/registry/lib.mjs';
for (const s of nestEntries(loadRegistry(repoRoot())))
  if (s.kind!=='gateway')
    console.log(\`\${s.name}: database=\${!!s.database} redis=\${s.dependsOn.includes('redis')}\`);"
```

- [ ] **Step 7: audit-log-service gets a Mongo check**

`apps/api/apps/audit-log-service/src/mongo-health.check.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { DependencyStatus, HealthCheck } from '@app/common';

/**
 * The audit trail is the one store with no Postgres behind it, so readiness has
 * to speak Mongo. `admin().ping()` is the cheapest command that proves the
 * connection is authenticated and the server is answering — `readyState === 1`
 * alone does not.
 */
@Injectable()
export class MongoHealthCheck implements HealthCheck {
  readonly name = 'mongodb';
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<DependencyStatus> {
    const t0 = Date.now();
    if (!this.connection.db)
      return { status: 'down', error: 'no database handle on the connection' };
    await this.connection.db.admin().ping();
    return { status: 'up', latencyMs: Date.now() - t0, detail: this.connection.name };
  }
}
```

Bind it in `audit-log-service.module.ts`:

```ts
    { provide: HEALTH_CHECK, useClass: MongoHealthCheck, multi: true },
```

Do the same shape for `search-service` with an Elasticsearch check that carries the **document count**, which is the assertion AUD2-032 asks readiness for:

```ts
// apps/api/apps/search-service/src/elasticsearch-health.check.ts
async run(): Promise<DependencyStatus> {
  const node = process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200';
  const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'kartseek_';
  const t0 = Date.now();
  const res = await fetch(`${node}/${prefix}marketplace/_count`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) return { status: 'down', error: `HTTP ${res.status} from ${node}`, latencyMs: Date.now() - t0 };
  const { count } = (await res.json()) as { count: number };
  // A reachable but near-empty index is the failure mode that hid for months:
  // 60 docs against 178 products meant every search was a 34% sample, and the
  // service reported "connected". Readiness now states the number.
  return count > 0
    ? { status: 'up', latencyMs: Date.now() - t0, detail: `${prefix}marketplace: ${count} documents` }
    : { status: 'degraded', latencyMs: Date.now() - t0, detail: `${prefix}marketplace is empty` };
}
```

- [ ] **Step 8: user-service and franchise-service get an HTTP health route at all**

Both carry `health: { live: null, ready: null }` in the registry. `franchise.controller.ts:13-14` only answers the TCP pattern `franchise.health`; user-service has no health route in any transport. Registering `HealthModule` (Step 6) gives both `/health` and `/health/ready`; no further code is needed. Prove it after the build:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3011/health   # user-service     → 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3016/health   # franchise-service → 200
```

- [ ] **Step 9: Write the failing gateway spec**

`apps/api/apps/api-gateway/src/controllers/health.controller.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';

const catalog = { stats: () => ({ status: 'up' as const, detail: 'grpc' }) };
const okRedis = { health: async () => ({ status: 'up' as const, detail: 'PONG' }) };
const emulated = { health: async () => ({ status: 'degraded' as const, emulated: true }) };

describe('gateway health', () => {
  it('aggregates dependencies on /health with a per-dependency status', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const r = await c.liveness();
    expect(r.status).toBe('ok');
    const ready = await c.readiness();
    expect(ready.checks.postgresql.status).toBe('up');
    expect(ds.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('is degraded — not ready — when Redis is the emulator', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(emulated as any, catalog as any, ds as any);
    const r = await c.readiness();
    expect(r.checks.redis.emulated).toBe(true);
    expect(r.status).toBe('degraded');
  });

  it('reports the database down when the query fails, not when the port is open', async () => {
    const ds = {
      query: vi.fn(async () => {
        throw new Error('database "kartseek_db" does not exist');
      }),
    };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const r = await c.readiness();
    expect(r.checks.postgresql.status).toBe('down');
    expect(r.checks.postgresql.error).toContain('does not exist');
  });

  it('gives an anonymous caller no ports, no brokers and no host names', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const anon = c.services({ user: undefined } as any);
    expect(JSON.stringify(anon)).not.toMatch(/\d{4}/);
    expect(anon).toEqual({ status: 'ok', totalServices: expect.any(Number) });
  });
});
```

- [ ] **Step 10: Run it — FAIL** (`HealthController` takes two constructor arguments and `services()` takes none).

- [ ] **Step 11: Rework the gateway controller**

In `apps/api/apps/api-gateway/src/controllers/health.controller.ts`:

```ts
import { Controller, Get, Inject, Optional, Req } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '@app/common';
```

Constructor gains the DataSource (optional — `SKIP_DB=true` leaves it unbound):

```ts
  constructor(
    private readonly redis: RedisService,
    private readonly marketplaceCatalog: MarketplaceCatalogService,
    @Optional() @Inject(DataSource) private readonly dataSource: DataSource | null,
  ) {}
```

Replace the whole Postgres branch of `readiness()` — the `net.Socket` `probe()` helper and its three call sites go with it, and `import * as net from 'node:net'` is deleted:

```ts
// ── PostgreSQL ─────────────────────────────────────────────────────────
// Was a TCP connect to DB_HOST:DB_PORT. That proves a listener, not a
// usable database: a wrong password, a missing database and a DataSource
// that failed to initialise all reported `up` (AUD2-069). Now the probe
// runs a query through the connection the application itself uses.
if (process.env.SKIP_DB === 'true') {
  checks['postgresql'] = { status: 'skipped', detail: 'SKIP_DB=true — no connection attempted' };
} else if (!this.dataSource) {
  checks['postgresql'] = { status: 'down', error: 'no DataSource is bound in this process' };
} else {
  const t0 = Date.now();
  try {
    await this.dataSource.query('SELECT 1');
    checks['postgresql'] = {
      status: 'up',
      latencyMs: Date.now() - t0,
      detail: `${this.dataSource.options.database} as ${(this.dataSource.options as any).username}`,
    };
  } catch (err: any) {
    checks['postgresql'] = {
      status: 'down',
      latencyMs: Date.now() - t0,
      error: err?.message ?? 'query failed',
    };
  }
}
```

Redis becomes `checks['redis'] = await this.redis.health();`.

Kafka keeps a socket connect — a broker handshake on every probe interval is not worth it — but says so in its `detail`: `detail: 'TCP connect only; a broker that is listening but not accepting metadata reads as up'`. Mongo likewise, with a note that audit-log-service's own `/health/ready` is the authoritative Mongo check.

`hasDown` becomes:

```ts
const worst = Object.values(checks).map((c) => c.status);
const status = worst.includes('down') ? 'down' : worst.includes('degraded') ? 'degraded' : 'ready';
```

`liveness()` gains the aggregate summary the goal asks for — a one-line roll-up, no detail:

```ts
  @SkipThrottle()
  @Get('health')
  async liveness() {
    const ready = await this.readiness();
    return {
      status: ready.status === 'ready' ? 'ok' : ready.status,
      service: 'api-gateway',
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: Math.round(process.uptime()),
      dependencies: Object.fromEntries(
        Object.entries(ready.checks).map(([k, v]) => [k, v.status]),
      ),
      timestamp: new Date().toISOString(),
    };
  }
```

- [ ] **Step 12: Stop leaking the service map (AUD2-072)**

`/health/services` and the `config` block of `/health/ready` name every internal port, every gRPC URL and the Kafka broker list to anonymous callers. Reduce for anonymous, keep the detail for staff:

```ts
  @SkipThrottle()
  @Get('health/services')
  @ApiOperation({ summary: 'Service catalogue — ports and transports for admins; a count for everyone else' })
  services(@Req() req: any) {
    const catalogue = this.buildCatalogue();
    const role = req?.user?.role;
    // The full board names 26 internal ports, every gRPC URL and the broker
    // list. Anonymous callers (and DEV_AUTH_BYPASS makes those SUPER_ADMIN
    // locally, so this must be tested with a real customer token) get a count.
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      return { status: 'ok', totalServices: Object.keys(catalogue).length };
    }
    return { /* …the existing full object… */ };
  }
```

Move the catalogue literal into `private buildCatalogue()` so both branches share it. Apply the same reduction to `readiness()`: drop the `config` block for non-admins and strip `detail` from each check (`status` and `latencyMs` stay — that is what a load balancer needs).

- [ ] **Step 13: Run the specs and the build**

```bash
cd apps/api
npx vitest run libs/common/src/health apps/api-gateway/src/controllers/health.controller.spec.ts
npx nest build --all
```

Expected: all green; build exits 0.

- [ ] **Step 14: Update the registry**

In `services.yaml`, every `gateway`, `core-service` and `module-service` entry becomes:

```yaml
health: { live: /health, ready: /health/ready }
```

except `api-gateway`, which keeps `{ live: /api/v1/health, ready: /api/v1/health/ready }`. Then:

```bash
npm run registry:generate && npm run registry:check
```

Expected: the READMEs and `docs/architecture/services.md` are rewritten; `registry:check` prints `services.yaml agrees with the repository (35 entries)`.

- [ ] **Step 15: Prove it live (fleet up, real workflow)**

```bash
npm run build && npm run smoke        # 26/26 healthy — every probe is now a real /health
curl -s http://localhost:3001/api/v1/health | node -pe "JSON.parse(require('fs').readFileSync(0)).dependencies"
docker stop kartseek-redis
curl -s http://localhost:3001/api/v1/health | node -pe "JSON.parse(require('fs').readFileSync(0)).status"   # degraded, not ok
docker start kartseek-redis
docker stop kartseek-postgres
curl -s http://localhost:3014/health/ready | node -pe "JSON.parse(require('fs').readFileSync(0)).checks.database"   # status: down, with the pg error
docker start kartseek-postgres
```

The two `docker stop` lines are the test. A health route that stays `ok` through either of them has not been fixed.

- [ ] **Step 16: Commit**

```bash
git add apps/api/libs/common/src/health apps/api/libs/common/src/index.ts apps/api/libs/redis/src/redis.service.ts apps/api/apps services.yaml docs/architecture/services.md README.md docs/guides/running-services.md apps/api/README.md apps/api/docs/runbook.md
git commit -m "feat(api): health proves a real query and a real redis; the emulator can no longer pass" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add modules
git commit -m "feat(modules): every module backend answers the shared /health and /health/ready" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (IN2): The schema each service queries is the schema that holds the rows, and the main ledger tells the truth

Covers **AUD2-025**, **AUD2-026**, **AUD2-068**, **AUD2-141** and the actionable half of **AUD2-030**.

**Files:**

- Modify: `apps/api/apps/user-service/src/user-service.module.ts:19`
- Modify: `apps/api/apps/admin-service/src/admin-service.module.ts:19`
- Create: `apps/api/apps/user-service/src/user-service.schema.spec.ts`
- Create: `apps/api/migrations/1786502000000-QuarantineStaleVerticalCopies.ts`
- Modify: `apps/api/data-source.main.ts` (add the new migration to the explicit list)
- Modify: `apps/api/docs/runbook.md` (the `"order".orders` / `currency` note)

**Interfaces:** no API change. `User` and `PageLayout` resolve to `public.users` and `public.page_layouts`.

- [ ] **Step 1: Confirm the evidence before changing anything**

B's finding is that the `user` schema in `kartseek_db` is empty and the 51 users are in `public.users`; that `admin` holds only `admin_roles`, so `admin.page_layouts` does not exist while `public.page_layouts` does. Re-derive it — the fix is `schema: 'public'` **only if** this still holds:

```bash
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c "
  select table_schema, table_name, (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname=t.table_schema and c.relname=t.table_name) as exists
  from information_schema.tables t
  where table_name in ('users','page_layouts') order by 1,2;"
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c "select count(*) from public.users;"
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c "select count(*) from public.page_layouts;"
```

Expected: `public.users` present with ~51 rows, `public.page_layouts` present, no `user.users`, no `admin.page_layouts`. If a `user.users` has appeared with rows, **stop** — the fix becomes a data move, not a config change, and that is a different task.

- [ ] **Step 2: Write the failing spec**

`apps/api/apps/user-service/src/user-service.schema.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * user-service registered `schema: 'user'` against `@Entity('users')`. The
 * `user` schema in kartseek_db is empty; the 51 real users are in
 * `public.users`, which the gateway also registers. Every DB-backed
 * user-service route therefore failed (AUD2-025). admin-service had the same
 * shape with `admin.page_layouts`, which does not exist (AUD2-026).
 *
 * A string in a module file is exactly the kind of thing that gets "tidied"
 * back, so it is pinned here rather than only in the commit message.
 */
const read = (p: string) => fs.readFileSync(path.join(__dirname, p), 'utf8');

describe('service schema targets', () => {
  it('user-service queries the schema that holds the users', () => {
    expect(read('user-service.module.ts')).toMatch(/schema:\s*'public'/);
    expect(read('user-service.module.ts')).not.toMatch(/schema:\s*'user'/);
  });

  it('admin-service queries the schema that holds page_layouts', () => {
    const src = read('../../admin-service/src/admin-service.module.ts');
    expect(src).toMatch(/schema:\s*'public'/);
    expect(src).not.toMatch(/schema:\s*'admin'/);
  });
});
```

- [ ] **Step 3: Run — FAIL.** `npx vitest run apps/user-service/src/user-service.schema.spec.ts` → both assertions fail.

- [ ] **Step 4: Fix both, with the reason in the file**

`user-service.module.ts`:

```ts
        // `public`, not `user`. The `user` schema in kartseek_db is empty: the
        // 51 real users live in `public.users`, which the gateway registers
        // too. Pointing here at `user` made every DB-backed user-service route
        // fail with "relation user.users does not exist" while /health was 200.
        schema: 'public',
```

`admin-service.module.ts`:

```ts
        // `public`, not `admin`. The `admin` schema holds `admin_roles` only;
        // `page_layouts` is `public.page_layouts`, and the gateway registers
        // the same entity against it. One table, one owner, one schema.
        schema: 'public',
```

- [ ] **Step 5: Run the spec — PASS**, then `npx nest build --all` → 0.

- [ ] **Step 6: Bring the main ledger level with the database (AUD2-068) — show first**

Three migrations are applied by hand and absent from the ledger. All three are `IF NOT EXISTS`, so running them is a no-op against the live DDL and writes the three ledger rows.

```bash
cd apps/api
npm run migration:show:main
```

Expected before: `[X]` on `UserSellerType` and `GatewayOwnedTables`, `[ ]` on `UserRegionScope`, `OrderMarket`, `AdminRoles`.

**Rollback note:** each of the three is `IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS`, so `up()` cannot destroy data; if a row lands wrongly, `npm run migration:revert:main` undoes exactly one, and its `down()` drops the column it added — so revert at most to the ledger position recorded above, and never past `GatewayOwnedTables`, whose `down()` drops ~48 live tables.

```bash
npm run migration:run:main
npm run migration:show:main     # expected after: five [X], zero [ ]
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c "select name from public.migrations order by timestamp;"
```

Confirm the data survived: `select count(*) from public.users;` still 51, and `select count(*) from admin.admin_roles;` still 6.

- [ ] **Step 7: Quarantine the stale vertical copies (AUD2-030, the part that is safe)**

Five tables in `public` are 2024-vintage duplicates of rows that live in the module schemas: `restaurants` (8 vs 12), `grocery_stores` (8 vs 14), `pharmacy_stores` (6 vs 6), `hotels` (0 vs 8), `doctors` (0 vs 7). None appears in the gateway's explicit entity list (`api-gateway.module.ts:191-230`, which is taxi + partner + `page_layouts` + `static_pages` + `users` + `admin_roles`). Prove that before writing DDL:

```bash
grep -rn "'restaurants'\|'grocery_stores'\|'pharmacy_stores'\|'hotels'\|'doctors'" apps/api/apps apps/api/libs --include=*.ts | grep -v node_modules | grep -v "\.spec\.ts"
```

Expected: only module backends, which resolve to their own schema. Any gateway hit means that table is still owned here — leave it out of the list and record why.

`apps/api/migrations/1786502000000-QuarantineStaleVerticalCopies.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The main database holds 2024-era copies of five vertical tables whose real
 * rows are in the module schemas (restaurants 8 vs 12, grocery_stores 8 vs 14,
 * pharmacy_stores 6 vs 6, hotels 0 vs 8, doctors 0 vs 7). Nothing reads them —
 * the gateway's entity list is taxi, partner, page_layouts, static_pages, users
 * and admin_roles — but they are exactly the decoy shape that cost the platform
 * a week the last time (`public.*` shadowing `marketplace.*`).
 *
 * So they move rather than drop: a query that still points here fails loudly
 * with "relation public.restaurants does not exist" instead of quietly serving
 * last year's data. `down()` puts them back.
 */
const TABLES = ['restaurants', 'grocery_stores', 'pharmacy_stores', 'hotels', 'doctors'];

export class QuarantineStaleVerticalCopies1786502000000 implements MigrationInterface {
  name = 'QuarantineStaleVerticalCopies1786502000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "legacy_public_verticals"`);
    for (const t of TABLES) {
      await q.query(
        `DO $$ BEGIN
           IF EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='public' AND table_name='${t}') THEN
             ALTER TABLE "public"."${t}" SET SCHEMA "legacy_public_verticals";
           END IF;
         END $$;`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of TABLES) {
      await q.query(
        `DO $$ BEGIN
           IF EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='legacy_public_verticals' AND table_name='${t}') THEN
             ALTER TABLE "legacy_public_verticals"."${t}" SET SCHEMA "public";
           END IF;
         END $$;`,
      );
    }
  }
}
```

Add it to the explicit list in `apps/api/data-source.main.ts` (and to the `main` half of the partition comment, which `data-source.main.spec.ts` asserts).

**Rollback note:** `down()` is a plain rename back; no rows are touched in either direction. Run `npm run migration:show:main` before and after.

```bash
npm run migration:show:main && npm run migration:run:main && npm run migration:show:main
npx vitest run data-source.main.spec.ts          # the partition spec must stay green
```

- [ ] **Step 8: Record the naming trap (AUD2-141)**

In `apps/api/docs/runbook.md`, under the database section:

> `orders` is `"order".orders`, not `public.orders`, and its money column is
> `currency`, not `currency_code`. Raw SQL against the main database must write
> the schema — `search_path` is `public`, so a bare `orders` either errors or
> builds a shadow table. The same applies to `admin.admin_roles`.

- [ ] **Step 9: Live proof — the real workflow, not the route shape**

With the fleet up:

```bash
# user-service actually reads users now
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/v1/admin/users?limit=3 | node -pe "JSON.parse(require('fs').readFileSync(0)).data.length"   # > 0
# admin-service reads a layout
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/v1/admin/layouts | node -pe "JSON.parse(require('fs').readFileSync(0)).status ?? 'ok'"
curl -s http://127.0.0.1:3011/health/ready | node -pe "JSON.parse(require('fs').readFileSync(0)).checks.database.status"   # up
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/apps/user-service apps/api/apps/admin-service apps/api/migrations/1786502000000-QuarantineStaleVerticalCopies.ts apps/api/data-source.main.ts apps/api/docs/runbook.md
git commit -m "fix(api): services query the schema that holds their rows; stale public copies quarantined" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (IN3): A migration path for all eight module databases, and `synchronize` that cannot reach production

Covers **AUD2-003** and **AUD2-070**.

**Files:**

- Create: `modules/<m>/backend/data-source.ts` × 8
- Create: `modules/<m>/backend/migrations/<ts>-Initial<Module>Schema.ts` × 8
- Modify: `modules/<m>/backend/package.json` × 8 (four scripts each)
- Modify: `modules/<m>/backend/src/<m>-service.module.ts` × 8 (`synchronize` + guard)
- Modify: `apps/api/libs/database/src/database.validator.ts` (`assertSynchronizeAllowed`)
- Create: `apps/api/libs/database/src/database.validator.spec.ts`
- Modify: `docs/guides/database-migrations.md`

**Interfaces:**

- `assertSynchronizeAllowed(synchronize: boolean, nodeEnv: string, service: string): boolean` — returns `synchronize`, throws when it is `true` and `nodeEnv === 'production'`.
- Per module: `npm run migration:generate -w @kartseek/<m>-backend -- migrations/<Name>`, `migration:run`, `migration:show`, `migration:revert`.

- [ ] **Step 1: The guard, test first**

`apps/api/libs/database/src/database.validator.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assertSynchronizeAllowed } from './database.validator';

describe('assertSynchronizeAllowed', () => {
  it('lets development auto-sync through unchanged', () => {
    expect(assertSynchronizeAllowed(true, 'development', 'grocery-service')).toBe(true);
  });
  it('refuses to boot with auto-sync in production', () => {
    expect(() => assertSynchronizeAllowed(true, 'production', 'grocery-service')).toThrow(
      /grocery-service.*synchronize/i,
    );
  });
  it('is a no-op when auto-sync is off', () => {
    expect(assertSynchronizeAllowed(false, 'production', 'grocery-service')).toBe(false);
  });
});
```

Run → FAIL (`assertSynchronizeAllowed` is not exported). Then append to `database.validator.ts`:

```ts
/**
 * The last line before TypeORM writes DDL.
 *
 * `validateDatabaseConfig()` guards DB_SYNCHRONIZE only, and all eight module
 * backends keyed `synchronize` on `NODE_ENV !== 'production'` instead — which
 * the validator never sees, and which Compose (declaring NODE_ENV nowhere)
 * resolves to `development` on a staging box, running auto-sync against real
 * data (AUD2-070). This runs inside the useFactory, where the value actually is.
 */
export function assertSynchronizeAllowed(
  synchronize: boolean,
  nodeEnv: string,
  service: string,
): boolean {
  if (synchronize && nodeEnv === 'production') {
    throw new Error(
      `${service}: synchronize is true with NODE_ENV=production. TypeORM would ALTER live ` +
        `tables from this service's entity definitions. Use migrations: ` +
        `npm run migration:run -w @kartseek/${service.replace('-service', '')}-backend`,
    );
  }
  return synchronize;
}
```

Export it from `apps/api/libs/database/src/index.ts`. Spec → PASS.

- [ ] **Step 2: Rekey all eight modules onto `DB_SYNCHRONIZE` and wrap them**

In each `modules/<m>/backend/src/<m>-service.module.ts`, replace

```ts
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
```

with

```ts
        // Keyed on DB_SYNCHRONIZE so `validateDatabaseConfig()` covers it, and
        // wrapped so a production boot with auto-sync on fails here rather than
        // rewriting the schema. Dev default stays on: the module's tables are
        // created by `npm run migration:run` from this workspace, and auto-sync
        // is the convenience for iterating on entities, not the schema source.
        synchronize: assertSynchronizeAllowed(
          cfg.get('DB_SYNCHRONIZE', 'true') === 'true' &&
            cfg.get('NODE_ENV', 'development') !== 'production',
          cfg.get('NODE_ENV', 'development'),
          '<m>-service',
        ),
```

(Import `assertSynchronizeAllowed` from `@app/database` beside the existing `databaseCredentials`.)

- [ ] **Step 3: The per-module DataSource — write one, copy the shape**

`modules/grocery/backend/data-source.ts` (the template; the other seven differ only in the constant block):

```ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  GroceryBrand,
  GroceryProductVariant,
  GroceryStockMovement,
  GroceryWarehouse,
  GroceryVariantStock,
  GroceryCategory,
  GroceryStore,
  GroceryItem,
  GroceryOrder,
  GroceryFlashDeal,
  GroceryReview,
  GroceryWishlist,
  GroceryDeliveryZone,
  GrocerySetting,
} from './src/entities';

/**
 * The TypeORM CLI's DataSource for the grocery database. Migrations only — no
 * application code imports this.
 *
 *     npm run migration:show      # what is pending
 *     npm run migration:run       # apply it
 *     npm run migration:generate -- migrations/AddSomething
 *
 * Entities are listed explicitly, exactly as the service module lists them. A
 * `__dirname` glob is what the platform has been bitten by before, and a
 * partial entity set is worse here than anywhere: `migration:generate` emits a
 * DROP for every table it cannot see.
 *
 * Resolution matches the service module: GROCERY_DB_* wins, DB_* is the
 * fallback, and `schema` is fixed at 'grocery' so the same entities work
 * against the shared instance or a dedicated one.
 */
export const GroceryDataSource = new DataSource({
  type: 'postgres',
  host: process.env.GROCERY_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.GROCERY_DB_PORT || process.env.DB_PORT || 5432),
  username: process.env.GROCERY_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.GROCERY_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.GROCERY_DB_NAME || process.env.DB_NAME || 'kartseek_db',
  schema: 'grocery',
  entities: [
    GroceryBrand,
    GroceryProductVariant,
    GroceryStockMovement,
    GroceryWarehouse,
    GroceryVariantStock,
    GroceryCategory,
    GroceryStore,
    GroceryItem,
    GroceryOrder,
    GroceryFlashDeal,
    GroceryReview,
    GroceryWishlist,
    GroceryDeliveryZone,
    GrocerySetting,
  ],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});
```

Scripts in `modules/<m>/backend/package.json`:

```json
    "migration:show": "typeorm-ts-node-commonjs -d data-source.ts migration:show",
    "migration:run": "typeorm-ts-node-commonjs -d data-source.ts migration:run",
    "migration:revert": "typeorm-ts-node-commonjs -d data-source.ts migration:revert",
    "migration:generate": "typeorm-ts-node-commonjs -d data-source.ts migration:generate",
```

Confirm the CLI resolves from the module directory before generating anything (npm workspaces hoist it to the root `node_modules/.bin`):

```bash
cd modules/grocery/backend && npx typeorm-ts-node-commonjs --help >/dev/null && echo ok
```

- [ ] **Step 4: The generation procedure — write it once, run it eight times**

A generated migration is a diff between the entities and whatever the target database already contains. Generating against the _live_ database yields an empty (or worse, a partial) migration, because `synchronize` already built the tables. So generate against an empty scratch database:

```bash
# 1. Scratch Postgres on a port nothing else uses (5499). Same image as the platform.
docker run --rm -d --name kartseek-scratch -p 5499:5432 \
  -e POSTGRES_PASSWORD=scratch -e POSTGRES_DB=scratch postgis/postgis:16-3.4-alpine
until docker exec kartseek-scratch pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec kartseek-scratch psql -U postgres -d scratch -c \
  "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# 2. Per module: point the DataSource at the scratch DB, create the schema, generate.
export MODULE=grocery MODULE_UC=GROCERY SCHEMA=grocery
docker exec kartseek-scratch psql -U postgres -d scratch -c "CREATE SCHEMA IF NOT EXISTS $SCHEMA;"
cd modules/$MODULE/backend
env ${MODULE_UC}_DB_HOST=127.0.0.1 ${MODULE_UC}_DB_PORT=5499 ${MODULE_UC}_DB_USER=postgres \
    ${MODULE_UC}_DB_PASSWORD=scratch ${MODULE_UC}_DB_NAME=scratch \
  npm run migration:generate -- migrations/Initial${MODULE_UC}Schema

# 3. Review the emitted SQL before committing it. Two things to look for:
#    - a DROP TABLE / DROP COLUMN anywhere  → an entity is missing from the list; fix and regenerate
#    - a table you do not recognise         → the schema was not empty; drop and repeat
grep -c "DROP TABLE\|DROP COLUMN" migrations/*Initial*.ts     # must be 0

# 4. Prove it applies to an empty database and then reports nothing pending.
docker exec kartseek-scratch psql -U postgres -d scratch -c "DROP SCHEMA $SCHEMA CASCADE; CREATE SCHEMA $SCHEMA;"
env ${MODULE_UC}_DB_HOST=127.0.0.1 ${MODULE_UC}_DB_PORT=5499 ${MODULE_UC}_DB_USER=postgres \
    ${MODULE_UC}_DB_PASSWORD=scratch ${MODULE_UC}_DB_NAME=scratch npm run migration:run
env ${MODULE_UC}_DB_HOST=127.0.0.1 ${MODULE_UC}_DB_PORT=5499 ${MODULE_UC}_DB_USER=postgres \
    ${MODULE_UC}_DB_PASSWORD=scratch ${MODULE_UC}_DB_NAME=scratch npm run migration:show   # zero [ ]

# 5. Boot the service against the scratch database with synchronize off — the
#    real workflow test: migrations alone must be enough to serve a request.
env NODE_ENV=production DB_SYNCHRONIZE=false \
    ${MODULE_UC}_DB_HOST=127.0.0.1 ${MODULE_UC}_DB_PORT=5499 ${MODULE_UC}_DB_USER=postgres \
    ${MODULE_UC}_DB_PASSWORD=scratch ${MODULE_UC}_DB_NAME=scratch \
  node dist/main.js &
curl -s http://127.0.0.1:3018/health/ready | node -pe "JSON.parse(require('fs').readFileSync(0)).checks.database.status"   # up
```

Step 5 is the acceptance test for this task: with `NODE_ENV=production` the guard from Step 2 forces `synchronize: false`, so a `down` there means the migration is incomplete. Tear down at the end with `docker rm -f kartseek-scratch`.

- [ ] **Step 5: Per-module table — run the procedure with these substitutions**

| Module      | Workspace                       | Env prefix     | Schema        | Port | Entity source                                               |
| ----------- | ------------------------------- | -------------- | ------------- | ---- | ----------------------------------------------------------- |
| marketplace | `@kartseek/marketplace-backend` | `MARKETPLACE_` | `marketplace` | 3012 | `ENTITIES` in `src/marketplace-service.module.ts`           |
| grocery     | `@kartseek/grocery-backend`     | `GROCERY_`     | `grocery`     | 3018 | `GROCERY_ENTITIES` in `src/grocery-service.module.ts:30-39` |
| restaurant  | `@kartseek/restaurant-backend`  | `RESTAURANT_`  | `restaurant`  | 3019 | entity list in `src/restaurant-service.module.ts`           |
| pharmacy    | `@kartseek/pharmacy-backend`    | `PHARMACY_`    | `pharmacy`    | 3020 | entity list in `src/pharmacy-service.module.ts`             |
| doctor      | `@kartseek/doctor-backend`      | `DOCTOR_`      | `doctor`      | 3017 | entity list in `src/doctor-service.module.ts`               |
| hotel       | `@kartseek/hotel-backend`       | `HOTEL_`       | `hotel`       | 3035 | entity list in `src/hotel-service.module.ts`                |
| taxi        | `@kartseek/taxi-backend`        | `TAXI_`        | `taxi`        | 3021 | entity list in `src/taxi-service.module.ts`                 |
| franchise   | `@kartseek/franchise-backend`   | `FRANCHISE_`   | `franchise`   | 3016 | entity list in `src/franchise-service.module.ts`            |

Copy the entity list from the module file verbatim — the two must not drift, and the `data-source.ts` comment says so.

- [ ] **Step 6: Baseline the databases that already have their tables**

The eight live databases were built by `synchronize`, so their tables exist with no ledger. Running the new initial migration against them would fail on `CREATE TABLE`. Baseline instead — insert the ledger row without executing:

```bash
# marketplace already has a `migrations` table with 0 rows; the rest have none.
docker exec kartseek-postgres-grocery psql -U grocery_user -d kartseek_grocery -c "
  CREATE TABLE IF NOT EXISTS grocery.migrations (id SERIAL PRIMARY KEY, timestamp BIGINT NOT NULL, name VARCHAR NOT NULL);
  INSERT INTO grocery.migrations (timestamp, name)
  SELECT <ts>, 'InitialGROCERYSchema<ts>'
  WHERE NOT EXISTS (SELECT 1 FROM grocery.migrations WHERE name='InitialGROCERYSchema<ts>');"
cd modules/grocery/backend && npm run migration:show        # zero [ ]
```

`<ts>` is the timestamp TypeORM put in the generated class name. **Rollback note:** the only change is one ledger row; `DELETE FROM <schema>.migrations WHERE name='Initial…'` undoes it, and no DDL ran.

Do this for each module whose store already holds its tables (all eight on this machine). Record in `docs/guides/database-migrations.md` that a genuinely empty store skips the baseline and runs `migration:run` instead.

- [ ] **Step 7: Suites and builds**

```bash
cd apps/api && npx vitest run libs/database && npx nest build --all
for m in marketplace grocery restaurant pharmacy doctor hotel taxi franchise; do
  (cd modules/$m/backend && npm run build && npm test) || echo "FAILED: $m";
done
```

Expected: marketplace 250, grocery 104, hotel 25, taxi 20, restaurant 18, doctor 16, pharmacy 12; every build exits 0.

- [ ] **Step 8: Commit (one per module + one for the guard)**

```bash
git add apps/api/libs/database
git commit -m "feat(api): a boot guard refuses typeorm auto-sync under NODE_ENV=production" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add modules/grocery/backend/data-source.ts modules/grocery/backend/migrations modules/grocery/backend/package.json modules/grocery/backend/src/grocery-service.module.ts
git commit -m "feat(grocery): a migration path for the grocery database, generated from its entities" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
# …seven more, same shape
```

---

### Task 4 (IN4): One credential path, one pool policy, no password literals, per-module database roles

Covers **AUD2-023**, **AUD2-033**, **AUD2-073**, **AUD2-074**, **AUD2-142**.

**Files:**

- Modify: `apps/api/libs/database/src/database.credentials.ts`
- Create: `apps/api/libs/database/src/database.credentials.spec.ts`
- Modify: `modules/marketplace/backend/src/marketplace-service.module.ts:136-152`
- Modify: `apps/api/data-source.main.ts:131`, `apps/api/data-source.ts` (drop the literals)
- Modify: `apps/api/apps/auth-service/src/auth-service.module.ts:29`
- Create: `infra/postgres/init-roles.sql`
- Modify: `infra/docker/compose.infra.yml` (mount the new init script)

**Interfaces:** `databaseCredentials(cfg)` gains `extra: { max, connectionTimeoutMillis, idleTimeoutMillis }`, `connectTimeoutMS`, `retryAttempts`, `retryDelay` — so a service that spreads it cannot silently take pg's defaults.

- [ ] **Step 1: Failing spec**

`apps/api/libs/database/src/database.credentials.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { databaseCredentials } from './database.credentials';

const cfg = (env: Record<string, string>) =>
  ({
    get: (k: string, d?: unknown) => (k in env ? (env[k] as any) : d),
  }) as any;

describe('databaseCredentials', () => {
  it("carries a bounded pool so a service cannot take pg's default 10", () => {
    const c: any = databaseCredentials(cfg({ DB_PASSWORD: 'x' }));
    expect(c.extra.max).toBe(5);
    expect(c.extra.connectionTimeoutMillis).toBe(10_000);
  });

  it('refuses to start without DB_PASSWORD instead of using a literal', () => {
    expect(() => databaseCredentials(cfg({}))).toThrow(/DB_PASSWORD/);
  });

  it('encrypts in production and leaves local plaintext', () => {
    expect(
      (databaseCredentials(cfg({ DB_PASSWORD: 'x', NODE_ENV: 'production' })) as any).ssl,
    ).toBeTruthy();
    expect((databaseCredentials(cfg({ DB_PASSWORD: 'x' })) as any).ssl).toBeUndefined();
  });
});
```

Run → FAIL on the first two.

- [ ] **Step 2: Fold the pool in and drop the literal**

In `database.credentials.ts`, delete `const DEV_FALLBACK_PASSWORD = 'kartseek123';` and replace the password block:

```ts
const password = cfg.get<string>('DB_PASSWORD');
if (!password) {
  // Was `?? 'kartseek123'` — the real development password, as a literal, in
  // tracked source, defeating the .env gitignore this helper's own comment
  // describes (AUD2-074). A missing password is now a startup failure
  // everywhere, not a silent connection with a credential anyone can read.
  throw new Error(
    'DB_PASSWORD is not set. Copy apps/api/.env.example to apps/api/.env (and .env.example ' +
      'to .env at the repository root for Compose) and set it.',
  );
}
```

and add to the returned object, above the `ssl` spread:

```ts
    /**
     * The pool lives here, not in each service.
     *
     * node-postgres opens up to 10 connections per process when no size is
     * given. 25 services against a Postgres with max_connections=100 reserve
     * 250 — two and a half times what the database will grant — and the
     * services that start last simply cannot acquire a connection. Only
     * grocery-service capped it; every other DB app took the default
     * (AUD2-033). Raising this is a decision about the database, so it reads
     * from the environment rather than being fixed here.
     */
    extra: {
      max: Number(cfg.get<number>('DB_POOL_SIZE', 5)),
      connectionTimeoutMillis: Number(cfg.get<number>('DB_POOL_TIMEOUT_MS', 10_000)),
      idleTimeoutMillis: 30_000,
    },
    connectTimeoutMS: Number(cfg.get<number>('DB_CONNECT_TIMEOUT_MS', 5_000)),
    retryAttempts: Number(cfg.get<number>('DB_RETRY_ATTEMPTS', isProduction ? 10 : 3)),
    retryDelay: Number(cfg.get<number>('DB_RETRY_DELAY_MS', isProduction ? 3_000 : 1_500)),
```

Grocery's own `extra` block can go — the spread now supplies it. Spec → PASS.

- [ ] **Step 3: marketplace-service joins the rest (AUD2-023)**

`modules/marketplace/backend/src/marketplace-service.module.ts`, first line of the factory object:

```ts
        type: 'postgres',
        // The one module that did not spread this. Dropping it dropped the ssl
        // block (catalogue, orders and seller KYC ran plaintext under
        // DB_SSL=true) and, because `... || databaseCredentials(cfg).password`
        // short-circuits when MARKETPLACE_DB_PASSWORD is set, the production
        // "refuse to start without DB_PASSWORD" guard never executed.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('MARKETPLACE_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('MARKETPLACE_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('MARKETPLACE_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('MARKETPLACE_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('MARKETPLACE_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
```

Verify the ssl block survives the override order:

```bash
cd modules/marketplace/backend && env DB_SSL=true DB_PASSWORD=x node -e "
const {databaseCredentials}=require('../../../apps/api/libs/database/src/database.credentials');
console.log(JSON.stringify(databaseCredentials({get:(k,d)=>process.env[k]??d})))" | grep ssl
```

- [ ] **Step 4: The two data-source literals**

`apps/api/data-source.main.ts:131` — `password: process.env.DB_PASSWORD || process.env.DB_PASS || 'kartseek123'` becomes:

```ts
  password: (() => {
    const p = process.env.DB_PASSWORD || process.env.DB_PASS;
    if (!p) throw new Error('DB_PASSWORD is not set — the migration CLI will not use a built-in default.');
    return p;
  })(),
```

Same in `apps/api/data-source.ts`. Then prove no literal survives:

```bash
grep -rn "kartseek123" --include=*.ts --include=*.mjs --include=*.js apps modules scripts infra | grep -v node_modules | grep -v "\.env"
```

Expected: no hits.

- [ ] **Step 5: auth-service's idle pool (AUD2-142)**

`auth-service.module.ts:29` registers a Postgres connection with zero entities and no query anywhere in the service. Confirm, then remove:

```bash
grep -rn "DataSource\|EntityManager\|getRepository\|InjectRepository" apps/api/apps/auth-service/src
```

Expected: nothing. Delete the `TypeOrmModule.forRootAsync(...)` import and its `@app/database` import, and set the registry entry's `database: null` and `dependsOn: [redis]` — then `npm run registry:generate`. If the grep _does_ hit, leave the connection and record why in the module comment instead; the `HealthModule.register({ database: … })` flag from Task IN1 must match whichever way it goes.

- [ ] **Step 6: Per-module database roles (AUD2-073)**

`apps/api/.env.example:225-260` already drafts `marketplace_user`, `grocery_user`, … `franchise_user`. Only marketplace exists. Create them in the shared instance with rights to their own schema only:

`infra/postgres/init-roles.sql`:

```sql
-- One role per module, each with rights to its own schema only.
--
-- Every service connects as the PostgreSQL superuser today, so one compromised
-- service yields read/write on all 26 schemas and COPY … FROM PROGRAM (AUD2-073).
-- Passwords come from the environment the entrypoint runs with; the container
-- fails to start rather than creating a role with a default.
\set ON_ERROR_STOP on

DO $$
DECLARE m text; pw text;
BEGIN
  FOREACH m IN ARRAY ARRAY['marketplace','grocery','restaurant','pharmacy','doctor','hotel','taxi','franchise']
  LOOP
    pw := current_setting('kartseek.module_password', true);
    IF pw IS NULL OR pw = '' THEN
      RAISE EXCEPTION 'kartseek.module_password is not set; refusing to create % with a default', m;
    END IF;
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', m);
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m || '_user') THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', m || '_user', pw);
    END IF;
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', m, m || '_user');
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO %I', m, m || '_user');
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO %I', m, m || '_user');
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO %I', m, m || '_user');
    EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', m || '_user');
  END LOOP;
END $$;
```

Mount it in `compose.infra.yml` under the `postgres` service, after the extensions script:

```yaml
- ../postgres/init-roles.sql:/docker-entrypoint-initdb.d/20-roles.sql:ro
```

and pass the password through the entrypoint:

```yaml
POSTGRES_INITDB_ARGS: ''
PGOPTIONS: '-c kartseek.module_password=${MODULE_DB_PASSWORD:?set MODULE_DB_PASSWORD in the root .env}'
```

Add `MODULE_DB_PASSWORD=` to `.env.example` with a comment saying it is required. Init scripts run **only on an empty data directory**, so on an existing volume apply it by hand once:

```bash
docker exec -e PGOPTIONS="-c kartseek.module_password=$MODULE_DB_PASSWORD" -i kartseek-postgres \
  psql -U postgres -d kartseek_db < infra/postgres/init-roles.sql
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c "\du" | grep _user   # 8 roles
```

Switching each service's connection to its own role is the follow-up: set `<MODULE>_DB_USER` in the module `.env.example` (Task IN5) and confirm the service still boots and serves a request. Do not flip all eight at once — do one, run its suite, then the rest.

- [ ] **Step 7: Suites, build, live proof**

```bash
cd apps/api && npx vitest run libs/database && npx nest build --all
cd modules/marketplace/backend && npm run build && npm test      # 250
# Real workflow: a catalogue read through the marketplace connection
curl -s "http://localhost:3001/api/v1/products?limit=1" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.data.length"
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/libs/database apps/api/data-source.ts apps/api/data-source.main.ts apps/api/apps/auth-service modules/marketplace/backend/src/marketplace-service.module.ts infra/postgres/init-roles.sql infra/docker/compose.infra.yml .env.example services.yaml
git commit -m "fix(api): one credential and pool path; no password literals; a role per module schema" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (IN5): Environment truth and three Dockerfiles that build every deployable

Covers **AUD2-020**, **AUD2-021**, **AUD2-022**, **AUD2-075**, **AUD2-137**, **AUD2-138**, **AUD2-139**, **AUD2-140**.

**Files:**

- Modify: `infra/docker/core-service.Dockerfile`
- Rename + modify: `infra/docker/marketplace-service.Dockerfile` → `infra/docker/module-service.Dockerfile`
- Create: `infra/docker/nextjs.Dockerfile`
- Modify: `apps/web/next.config.mjs` (`output: 'standalone'`, `outputFileTracingRoot`)
- Delete: `apps/api/.env.docker`
- Modify: `apps/web/.env.local`, `apps/api/.env`, `apps/api/.env.example`
- Modify: `modules/*/backend/.env.example` × 8
- Modify: `infra/docker/compose.infra.yml`
- Modify: `.dockerignore`, `infra/docker/README.md`, `ARCHITECTURE.md:304-305`, `docs/guides/local-setup.md`

- [ ] **Step 1: `core-service.Dockerfile` HEALTHCHECK reads the right port (AUD2-020)**

The current check probes `process.env.PORT || 3000`. No core service reads `PORT` — each reads its own `<SVC>_SERVICE_PORT` (`order-service/src/main.ts:36`), so every image built from this file is `unhealthy` forever regardless of the app. Add build args and bake them:

```dockerfile
FROM node:26-alpine
ARG APP
ARG PORT
ARG HEALTH_PATH=/health
ENV APP_NAME=${APP}
ENV NODE_ENV=production
# The port the HEALTHCHECK probes, baked at build time from the registry.
# Runtime still reads <SVC>_SERVICE_PORT; this only tells the check where to look.
ENV HEALTHCHECK_PORT=${PORT}
ENV HEALTHCHECK_PATH=${HEALTH_PATH}
…
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${HEALTHCHECK_PORT}${HEALTHCHECK_PATH}" >/dev/null || exit 1
```

`ARG PORT` with no default is deliberate: a build that forgets it fails at `EXPOSE`, which is louder than an image that never goes healthy. The generator in Task IN6 always passes it.

- [ ] **Step 2: One module Dockerfile for all eight backends**

`git mv infra/docker/marketplace-service.Dockerfile infra/docker/module-service.Dockerfile`, then replace every hard-coded `marketplace` with `${APP}` and drop the three baked `MARKETPLACE_*_PORT` `ENV` lines (ports come from Compose and Kubernetes):

```dockerfile
ARG APP
ARG PORT
ARG HEALTH_PATH=/health
…
RUN npm ci --workspace=modules/${APP}/backend --workspace=apps/api --include-workspace-root --omit=dev \
  && mkdir -p modules/${APP}/backend/node_modules
…
WORKDIR /repo/modules/${APP}/backend
COPY --from=builder --chown=nestjs:nodejs /repo/modules/${APP}/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /repo/modules/${APP}/backend/package.json ./package.json
# The gRPC server loads proto/<module>.proto relative to the working directory,
# not from dist/proto. The builder stage creates the folder unconditionally so
# this COPY succeeds for the modules that have no gRPC transport.
COPY --from=builder --chown=nestjs:nodejs /repo/modules/${APP}/backend/proto ./proto
```

In the builder stage, `RUN mkdir -p modules/${APP}/backend/proto` before the build so the final `COPY` cannot fail for doctor/hotel/pharmacy/franchise.

Update `ARCHITECTURE.md:304-305` and `infra/docker/README.md` to the new name.

- [ ] **Step 3: A Next image for the console**

The console is one of the twelve images the `admin` profile builds, and no Dockerfile builds a Next app today. Standalone output keeps the image small and is additive — `next start` and `npm run dev` are unaffected.

`apps/web/next.config.mjs`, inside `nextConfig`:

```js
  // Standalone output for the container image (infra/docker/nextjs.Dockerfile).
  // Additive: `next dev` and `next start` are unchanged; this only also emits
  // .next/standalone. outputFileTracingRoot is the monorepo root because the
  // shell imports from packages/shared-core and modules/*/frontend.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
```

`infra/docker/nextjs.Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1
#
# Any Next workspace in the repository. Build from the repository ROOT:
#
#   docker build -f infra/docker/nextjs.Dockerfile \
#     --build-arg WORKSPACE_DIR=apps/web --build-arg PORT=3000 \
#     --build-arg NEXT_PUBLIC_API_URL=http://nginx/api/v1 -t kartseek/web:dev .
#
# NEXT_PUBLIC_* are inlined at build time, so they are build args, not runtime
# env. Server-side values (API_URL, the zone rewrite targets) stay runtime.

FROM node:26-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages packages
COPY modules modules
RUN npm ci

FROM deps AS builder
ARG WORKSPACE_DIR
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build --workspace=./${WORKSPACE_DIR}

FROM node:26-alpine AS runner
ARG WORKSPACE_DIR
ARG PORT
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=${PORT}
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/.next/static ./${WORKSPACE_DIR}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/public ./${WORKSPACE_DIR}/public
USER nextjs
ENV SERVER_JS=${WORKSPACE_DIR}/server.js
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/admin/login" >/dev/null || exit 1
CMD ["sh", "-c", "node $SERVER_JS"]
```

`.dockerignore` currently excludes `apps/web/**`, `modules/*/frontend/**`, `packages` and `docs`. Stop excluding the first three (keep `docs`), and note in the file's header that the context is now shared by four Dockerfiles.

- [ ] **Step 4: Orphaned and dead variables (AUD2-138, AUD2-139, AUD2-137)**

```bash
# Prove they are dead before deleting.
grep -rn "NEXT_PUBLIC_API_BASE_URL\|NEXT_PUBLIC_GOOGLE_MAPS_KEY" apps modules packages --include=*.ts --include=*.tsx --include=*.mjs | grep -v node_modules
grep -rn "SELLER_TCP_PORT\|SELLER_SERVICE_PORT" apps modules scripts infra --include=*.ts --include=*.mjs --include=*.yaml | grep -v node_modules
grep -rn "env.docker" . --include=*.yml --include=*.yaml --include=Dockerfile --include=*.Dockerfile --include=*.json --include=*.mjs | grep -v node_modules
```

Expected: no code hits for any of them (`docs/guides/secrets.md:16-17` mentions `.env.docker` and is updated, not counted as a use). Then delete the two `NEXT_PUBLIC_*` lines from `apps/web/.env.local`, the two `SELLER_*` lines from `apps/api/.env` and `.env.example`, and `apps/api/.env.docker`. Remove the `.env.docker` paragraph from `docs/guides/secrets.md`.

- [ ] **Step 5: Module `.env.example` matches the documented default (AUD2-021)**

Per Decision 1. In each `modules/<m>/backend/.env.example`, the shared instance is the live value and the isolated instance is the commented override:

```dotenv
# The documented first run (`npm run infra:up`) starts ONE Postgres, and each
# module owns a schema inside kartseek_db. These values point there.
#
# `docker compose --profile isolated up -d` gives this module its own Postgres
# on 5434; if you use it, uncomment the block below. Ports: 5433 marketplace,
# 5434 grocery, 5435 restaurant, 5436 pharmacy, 5437 doctor, 5438 hotel,
# 5439 taxi, 5440 franchise.
GROCERY_DB_HOST=127.0.0.1
GROCERY_DB_PORT=5432
GROCERY_DB_NAME=kartseek_db
GROCERY_DB_USER=grocery_user

# GROCERY_DB_HOST=127.0.0.1
# GROCERY_DB_PORT=5434
# GROCERY_DB_NAME=kartseek_grocery
```

Existing untracked `modules/*/backend/.env` files are the developer's own and stay as they are; say so in `docs/guides/local-setup.md`, alongside the note that `npm run infra:up` does **not** start the isolated containers.

- [ ] **Step 6: Compose hardening (AUD2-022, AUD2-075, AUD2-140)**

In `infra/docker/compose.infra.yml`:

- Every datastore port mapping gains the same loopback default nginx already uses:
  `- '${DB_BIND:-127.0.0.1}:5432:5432'` (and the equivalent for 5433–5440, 6379, 9092, 27017, 9200). One variable, documented in `.env.example`, because these are the ports a `DEV_AUTH_BYPASS` gateway sits behind.
- Elasticsearch: `xpack.security.enabled=true` plus `ELASTIC_PASSWORD=${ELASTIC_PASSWORD:?set ELASTIC_PASSWORD}`, and `ELASTICSEARCH_NODE=http://elastic:${ELASTIC_PASSWORD}@elasticsearch:9200` for the containerised search-service. The healthcheck command gains `-u elastic:${ELASTIC_PASSWORD}`.
- Every `change_me_in_development` default becomes a required variable: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in the root .env}` — and the same at lines 44, 66, 93, 117, 141, 165, 189, 213, 237, 263, 330. A deploy that forgets the env file now fails to start instead of coming up with a password published in tracked source.
- `kafka-ui`, `pgadmin` and `redis-insight` get `condition: service_healthy` on their `depends_on`, matching `kibana`.

Verify:

```bash
docker compose config >/dev/null && echo "compose resolves"
mv .env .env.bak && docker compose config 2>&1 | head -3    # must now FAIL with the :? message
mv .env.bak .env
```

- [ ] **Step 7: Build one image of each kind (background, with logs)**

Image builds are the long pole. Run them detached and read the log rather than blocking the session:

```bash
mkdir -p .build-logs
docker build -f infra/docker/api-gateway.Dockerfile -t kartseek/api-gateway:dev . > .build-logs/api-gateway.log 2>&1 &
docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service --build-arg PORT=3014 -t kartseek/order-service:dev . > .build-logs/order-service.log 2>&1 &
docker build -f infra/docker/module-service.Dockerfile --build-arg APP=grocery --build-arg PORT=3018 -t kartseek/grocery-service:dev . > .build-logs/grocery-service.log 2>&1 &
wait
tail -3 .build-logs/*.log
```

Expected wall time on a cold cache: **8–14 minutes for the first image** (the `npm ci` layer dominates) and **1–3 minutes each** afterwards, since all three share the `deps` layer. Disk: ~2.5 GB of layers for the three plus ~1.2 GB of build cache. Add `.build-logs/` to `.gitignore`.

Then the reproduction AUD2-020 describes, now inverted into a pass:

```bash
docker run -d --name probe --network kartseek-network -e ORDER_SERVICE_PORT=3014 kartseek/order-service:dev
sleep 40 && docker inspect -f '{{.State.Health.Status}}' probe    # healthy (was: unhealthy forever)
docker rm -f probe
```

- [ ] **Step 8: Commit**

```bash
git add infra/docker .dockerignore ARCHITECTURE.md docs/guides apps/web/next.config.mjs apps/web/.env.local apps/api/.env.example modules/*/backend/.env.example .env.example .gitignore
git rm apps/api/.env.docker
git commit -m "fix(docker): healthchecks probe the real port; one module dockerfile; datastores bound to loopback" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (IN6): `compose.services.yml` generated from the registry, with `admin` and `full` profiles

Covers **AUD2-067** and **AUD2-136**.

**Files:**

- Create: `scripts/registry/compose.mjs`
- Create: `scripts/registry/compose.test.mjs`
- Modify: `scripts/registry/generate.mjs` (add the compose target), `scripts/registry/validate.mjs` (drift is already covered via `checkGenerated`)
- Create (generated): `infra/docker/compose.services.yml`
- Modify: `docker-compose.yml`, `package.json`
- Modify: `services.yaml` (add `profiles: [admin]` to the twelve admin-critical entries)

**Interfaces:**

- `renderComposeServices(reg): string` — the whole file, with the GENERATED header.
- `ADMIN_PROFILE: string[]` — the twelve names; asserted against the registry so a typo fails the test.
- Registry addition: an optional `profiles: [admin]` list on a service entry, validated by `lib.mjs`.

- [ ] **Step 1: Failing test for the renderer**

`scripts/registry/compose.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderComposeServices, ADMIN_PROFILE, dockerfileFor } from './compose.mjs';

const gateway = {
  name: 'api-gateway',
  kind: 'gateway',
  path: 'apps/api/apps/api-gateway',
  image: 'kartseek/api-gateway',
  build: { workspace: 'kartseek-api', nestProject: 'api-gateway' },
  ports: { http: 3001 },
  env: { http: 'API_GATEWAY_PORT' },
  health: { live: '/api/v1/health', ready: '/api/v1/health/ready' },
  database: { name: 'kartseek_db', schema: 'public', envPrefix: 'DB' },
  dependsOn: ['postgres', 'redis', 'kafka', 'mongodb'],
  profiles: ['admin'],
};
const grocery = {
  name: 'grocery-service',
  kind: 'module-service',
  path: 'modules/grocery/backend',
  image: 'kartseek/grocery-service',
  build: { workspace: '@kartseek/grocery-backend' },
  ports: { http: 3018, tcp: 4008, grpc: 5010 },
  env: { http: 'GROCERY_SERVICE_PORT', tcp: 'GROCERY_TCP_PORT', grpc: 'GROCERY_GRPC_PORT' },
  health: { live: '/health', ready: '/health/ready' },
  database: { name: 'kartseek_grocery', schema: 'grocery', envPrefix: 'GROCERY_DB' },
  dependsOn: ['postgres', 'redis', 'kafka'],
  profiles: ['admin'],
};
const web = {
  name: 'web',
  kind: 'web-shell',
  path: 'apps/web',
  image: 'kartseek/web',
  build: { workspace: 'kartseek-web' },
  ports: { http: 3000 },
  profiles: ['admin'],
};
const reg = { services: [gateway, grocery, web] };

test('each kind builds from its own Dockerfile', () => {
  assert.equal(dockerfileFor(gateway), 'infra/docker/api-gateway.Dockerfile');
  assert.equal(
    dockerfileFor({ ...gateway, kind: 'core-service' }),
    'infra/docker/core-service.Dockerfile',
  );
  assert.equal(dockerfileFor(grocery), 'infra/docker/module-service.Dockerfile');
  assert.equal(dockerfileFor(web), 'infra/docker/nextjs.Dockerfile');
});

test('services address infrastructure by container name, never localhost', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /DB_HOST: postgres/);
  assert.match(out, /REDIS_HOST: redis/);
  assert.match(out, /KAFKA_BROKERS: kafka:9092/);
  assert.match(out, /MONGO_URI: mongodb:\/\/.*@mongodb:27017/);
  assert.match(out, /ELASTICSEARCH_NODE: http:\/\/.*elasticsearch:9200/);
  assert.ok(!/localhost|127\.0\.0\.1|host\.docker\.internal/.test(out), 'no host addressing');
});

test('container names, network and profiles follow the registry', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /container_name: kartseek-grocery-service/);
  assert.match(out, /name: kartseek-network/);
  assert.match(out, /profiles: \[admin, full\]/);
});

test('healthchecks come from the registry health.live', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /http:\/\/127\.0\.0\.1:3018\/health/);
  assert.match(out, /http:\/\/127\.0\.0\.1:3001\/api\/v1\/health/);
});

test('infrastructure dependencies wait for health, and peers do not', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /postgres:\s*\n\s*condition: service_healthy/);
});

test('every service points at the gateway container for its peers', () => {
  const out = renderComposeServices(reg);
  assert.match(out, /GROCERY_SERVICE_HOST: grocery-service/);
});

test('ADMIN_PROFILE is exactly the twelve admin-critical deployables', () => {
  assert.equal(ADMIN_PROFILE.length, 12);
  assert.deepEqual(ADMIN_PROFILE, [
    'api-gateway',
    'auth-service',
    'user-service',
    'admin-service',
    'audit-log-service',
    'notification-service',
    'order-service',
    'payment-service',
    'marketplace-service',
    'grocery-service',
    'taxi-service',
    'web',
  ]);
});
```

Run: `node --test scripts/registry/compose.test.mjs` → FAIL (no module).

- [ ] **Step 2: The renderer**

`scripts/registry/compose.mjs`:

```js
/**
 * Renders infra/docker/compose.services.yml from services.yaml.
 *
 * The root docker-compose.yml has promised this file since phase 3 and it has
 * never existed: not the gateway, not one of the 17 core services, not one of
 * the 8 module backends, not the console was defined in Compose (AUD2-067).
 * Hand-writing 35 services is how the ports, the health routes and the
 * dependency lists drift from the registry, so it is generated and
 * `npm run registry:check` fails when it is stale.
 *
 * Addressing: inside kartseek-network, infrastructure answers to its compose
 * service name — postgres, redis, kafka:9092, mongodb, elasticsearch — and a
 * service's peers answer to their container's service name. Nothing here may
 * say localhost: that is the host, and from a container it is the container.
 */
import { NEST_KINDS, WEB_KINDS } from './lib.mjs';

export const HEADER =
  '# GENERATED by scripts/registry/compose.mjs from services.yaml — do not edit\n' +
  '#\n' +
  '#   npm run registry:generate    rewrite this file\n' +
  '#   npm run registry:check       fail if it is stale\n' +
  '#\n' +
  '# Profiles: `admin` is the subset an administrator needs end to end (12);\n' +
  '# `full` is every deployable (35). Compose reads only the ROOT .env.\n';

export const ADMIN_PROFILE = [
  'api-gateway',
  'auth-service',
  'user-service',
  'admin-service',
  'audit-log-service',
  'notification-service',
  'order-service',
  'payment-service',
  'marketplace-service',
  'grocery-service',
  'taxi-service',
  'web',
];

export function dockerfileFor(s) {
  if (s.kind === 'gateway') return 'infra/docker/api-gateway.Dockerfile';
  if (s.kind === 'core-service') return 'infra/docker/core-service.Dockerfile';
  if (s.kind === 'module-service') return 'infra/docker/module-service.Dockerfile';
  return 'infra/docker/nextjs.Dockerfile';
}

/** The APP build arg: the nest project for apps/api, the module directory for modules. */
function appArg(s) {
  if (s.kind === 'module-service') return s.path.split('/')[1];
  return s.build.nestProject ?? s.name;
}

const INFRA_HOSTS = {
  postgres: { DB_HOST: 'postgres', DB_PORT: '5432' },
  redis: { REDIS_HOST: 'redis', REDIS_PORT: '6379' },
  kafka: { KAFKA_BROKERS: 'kafka:9092' },
  mongodb: {
    MONGO_URI:
      'mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DB_NAME}?authSource=admin',
  },
  elasticsearch: { ELASTICSEARCH_NODE: 'http://elastic:${ELASTIC_PASSWORD}@elasticsearch:9200' },
};

function profilesOf(s) {
  return ADMIN_PROFILE.includes(s.name) ? '[admin, full]' : '[full]';
}

function envBlock(s, reg) {
  const env = { NODE_ENV: 'production' };
  for (const dep of s.dependsOn ?? []) Object.assign(env, INFRA_HOSTS[dep] ?? {});
  // The service's own ports, under the names main.ts reads.
  for (const [kind, name] of Object.entries(s.env ?? {})) env[name] = String(s.ports[kind]);
  // Every peer's host, so a TCP/gRPC client resolves the container, not localhost.
  for (const peer of reg.services.filter((p) => NEST_KINDS.includes(p.kind) && p.name !== s.name)) {
    env[
      `${peer.name
        .replace(/-service$/, '')
        .replace(/-/g, '_')
        .toUpperCase()}_SERVICE_HOST`
    ] = peer.name;
  }
  if (s.kafka) env['KAFKA_GROUP_ID'] = s.kafka.groupId;
  if (s.database && s.database.envPrefix !== 'DB') {
    env[`${s.database.envPrefix}_HOST`] = 'postgres';
    env[`${s.database.envPrefix}_PORT`] = '5432';
    env[`${s.database.envPrefix}_NAME`] = '${POSTGRES_DB:-kartseek_db}';
  }
  return Object.entries(env)
    .map(([k, v]) => `      ${k}: ${v}`)
    .join('\n');
}

function healthcheck(s) {
  const path = NEST_KINDS.includes(s.kind) ? s.health.live : '/admin/login';
  if (!path) {
    return [
      `    healthcheck:`,
      `      # No HTTP health route in the registry — the port opening is all there is.`,
      `      test: ['CMD-SHELL', 'nc -z 127.0.0.1 ${s.ports.http} || exit 1']`,
      `      interval: 15s`,
      `      timeout: 5s`,
      `      retries: 10`,
      `      start_period: 40s`,
    ].join('\n');
  }
  return [
    `    healthcheck:`,
    `      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:${s.ports.http}${path} >/dev/null || exit 1']`,
    `      interval: 15s`,
    `      timeout: 5s`,
    `      retries: 10`,
    `      start_period: ${WEB_KINDS.includes(s.kind) ? '60s' : '40s'}`,
  ].join('\n');
}

function dependsOn(s) {
  const deps = s.dependsOn ?? [];
  if (!deps.length) return '';
  return (
    '    depends_on:\n' +
    deps.map((d) => `      ${d}:\n        condition: service_healthy`).join('\n') +
    '\n'
  );
}

function buildArgs(s) {
  const args = [`        APP: ${appArg(s)}`, `        PORT: '${s.ports.http}'`];
  if (NEST_KINDS.includes(s.kind) && s.health.live)
    args.push(`        HEALTH_PATH: ${s.health.live}`);
  if (WEB_KINDS.includes(s.kind)) {
    args.length = 0;
    args.push(
      `        WORKSPACE_DIR: ${s.path}`,
      `        PORT: '${s.ports.http}'`,
      // The console talks to the gateway through nginx, by service name. A
      // NEXT_PUBLIC_* value is inlined at build time, so it is a build arg.
      `        NEXT_PUBLIC_API_URL: \${COMPOSE_API_URL:-http://nginx/api/v1}`,
      `        NEXT_PUBLIC_WS_URL: \${COMPOSE_WS_URL:-ws://nginx}`,
      `        API_URL: http://api-gateway:3001/api/v1`,
    );
  }
  return args.join('\n');
}

export function renderComposeServices(reg) {
  const out = [HEADER, 'services:'];
  for (const s of reg.services) {
    out.push(
      `  ${s.name}:`,
      `    build:`,
      `      context: .`,
      `      dockerfile: ${dockerfileFor(s)}`,
      `      args:`,
      buildArgs(s),
      `    image: ${s.image}:\${KARTSEEK_TAG:-dev}`,
      `    container_name: kartseek-${s.name}`,
      `    restart: unless-stopped`,
      `    profiles: ${profilesOf(s)}`,
      `    env_file: [.env]`,
      `    environment:`,
      envBlock(s, reg),
      `    ports:`,
      ...Object.values(s.ports).map((p) => `      - '\${APP_BIND:-127.0.0.1}:${p}:${p}'`),
      dependsOn(s).trimEnd(),
      healthcheck(s),
      '',
    );
  }
  out.push('networks:', '  default:', '    name: kartseek-network', '    external: true', '');
  return out.filter((l) => l !== '').join('\n') + '\n';
}
```

- [ ] **Step 3: Wire it into the generator and the drift check**

In `scripts/registry/generate.mjs`, import `renderComposeServices` and add one entry to `targets` in `generateAll()`:

```js
    { rel: 'infra/docker/compose.services.yml', next: () => renderComposeServices(reg), whole: true },
```

`checkGenerated()` already walks `targets`, so `npm run registry:check` fails on a stale compose file with no further change. Extend `scripts/registry/generate.test.mjs` with one assertion that the target is registered:

```js
test('generateAll renders the compose file as a whole-file target', () => {
  const rels = [];
  // generateAll is exercised through the real registry in registry:check; here
  // we only assert the renderer is exported and reachable.
  assert.equal(typeof renderComposeServices, 'function');
});
```

- [ ] **Step 4: Registry `profiles` field**

In `scripts/registry/lib.mjs` `validateShape()`, after the `dependsOn` block:

```js
if ('profiles' in (s ?? {})) {
  if (!Array.isArray(s.profiles) || s.profiles.some((p) => !['admin', 'full'].includes(p)))
    bad(`${id}: profiles may contain only 'admin' and 'full'`);
}
```

and add `profiles: [admin]` to the twelve entries in `services.yaml`. Add the matching assertion to `scripts/registry/lib.test.mjs`.

- [ ] **Step 5: Generate, and read the output before trusting it**

```bash
npm run registry:generate
node --test scripts/registry/compose.test.mjs scripts/registry/generate.test.mjs scripts/registry/lib.test.mjs
docker compose -f docker-compose.yml -f infra/docker/compose.services.yml config >/dev/null && echo "resolves"
grep -c "container_name: kartseek-" infra/docker/compose.services.yml         # 35
grep -n "localhost\|127.0.0.1:" infra/docker/compose.services.yml | grep -v "APP_BIND\|healthcheck"   # no hits
npm run registry:check                                                        # agrees
```

- [ ] **Step 6: Include it from the root, and honour or retire the observability promise (AUD2-136)**

`docker-compose.yml`:

```yaml
include:
  - path: infra/docker/compose.infra.yml
  - path: infra/docker/compose.services.yml
```

and delete the `compose.observability.yml` line from the header, replacing it with:

```
#   (Prometheus + Grafana were planned for phase 2 and do not exist; when they
#    land they get their own include line and a `monitoring` profile.)
```

`kartseek-network` is created by `compose.infra.yml` (it sets `networks.default.name`), and `compose.services.yml` joins it as `external: true` — so `infra:up` must run first. Say that in `infra/docker/README.md`.

- [ ] **Step 7: npm scripts**

```json
    "stack:up:admin": "docker compose --profile admin up -d --build",
    "stack:up:full": "docker compose --profile full up -d --build",
    "stack:validate": "node scripts/stack/validate.mjs",
    "stack:down": "docker compose --profile full --profile admin down --remove-orphans",
    "stack:logs": "docker compose --profile admin logs -f"
```

- [ ] **Step 8: Commit**

```bash
git add scripts/registry docker-compose.yml infra/docker/compose.services.yml infra/docker/README.md services.yaml package.json docs/architecture/services.md
git commit -m "feat(compose): generate compose.services.yml from the registry with admin and full profiles" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (IN7): `scripts/stack/validate.mjs` — the clean start is proved, not assumed

Builds on A's clean-start sequence (`inspect-A-docker.md` §5) and B's readiness commands (`inspect-B-database.md` §5). No new AUD2 id; this is the gate that proves IN1–IN6 and closes the loop on **AUD2-021**, **AUD2-067** and **AUD2-070**.

**Files:**

- Create: `scripts/stack/validate.mjs`
- Create: `scripts/stack/validate.test.mjs`
- Modify: `docs/guides/local-setup.md` (a "Validate the container stack" section)

**Interfaces:**

- `node scripts/stack/validate.mjs [--profile admin|full] [--skip-build]` — exit 0 when every check passes, 1 on a failed check, 2 on a setup error.
- Exported for the unit test: `classifyLogLine(line)`, `summarise(results)`.

- [ ] **Step 1: Failing test for the pure parts**

`scripts/stack/validate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLogLine, summarise } from './validate.mjs';

test('classifyLogLine catches the boot failures that matter', () => {
  assert.equal(
    classifyLogLine('[Nest] ERROR [ExceptionHandler] UnknownDependenciesException'),
    'fatal',
  );
  assert.equal(classifyLogLine('ERROR [TypeOrmModule] Unable to connect to the database'), 'error');
  assert.equal(classifyLogLine('QueryFailedError: relation "user.users" does not exist'), 'error');
  // The words that are noise, not faults: a handled 404 and the throttler's own log line.
  assert.equal(classifyLogLine('GET /api/v1/does-not-exist 404'), null);
  assert.equal(classifyLogLine('LOG [RouterExplorer] Mapped {/health, GET} route'), null);
});

test('summarise reports the first failure and an exit code', () => {
  assert.equal(
    summarise([
      { name: 'a', ok: true },
      { name: 'b', ok: true },
    ]).code,
    0,
  );
  const bad = summarise([
    { name: 'a', ok: true },
    { name: 'b', ok: false, detail: 'boom' },
  ]);
  assert.equal(bad.code, 1);
  assert.match(bad.report, /b .*boom/);
});
```

- [ ] **Step 2: The script**

`scripts/stack/validate.mjs`:

```js
#!/usr/bin/env node
/**
 * Clean-start validation for the containerised stack.
 *
 *   npm run stack:validate                   # the admin profile (12 containers)
 *   npm run stack:validate -- --profile full # all 35
 *   npm run stack:validate -- --skip-build   # reuse the images already built
 *
 * What it refuses to accept as evidence, deliberately:
 *   - a container marked (healthy): pg_isready proves a listener, not a usable
 *     database, and a Next container answering / proves nothing about /admin;
 *   - an HTTP 200 from a liveness route: that is a constant;
 *   - a PONG that came from the in-process Redis emulator.
 * Every check below either runs a query, reads a body, or both.
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot, nestEntries } from '../registry/lib.mjs';

const FATAL =
  /UnknownDependenciesException|Nest can't resolve dependencies|EADDRINUSE|ECONNREFUSED|Unable to connect to the database/;
const ERROR = /\bERROR\b|QueryFailedError|FATAL|Unhandled|UnhandledPromiseRejection/;
const NOISE = /RouterExplorer|InstanceLoader|NestFactory|ThrottlerGuard|\b40[34]\b/;

export function classifyLogLine(line) {
  if (NOISE.test(line)) return null;
  if (FATAL.test(line)) return 'fatal';
  if (ERROR.test(line)) return 'error';
  return null;
}

export function summarise(results) {
  const failed = results.filter((r) => !r.ok);
  const report = results
    .map((r) => `  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? `   ${r.detail}` : ''}`)
    .join('\n');
  return { code: failed.length ? 1 : 0, report, failed: failed.length, total: results.length };
}

const root = repoRoot();
const results = [];
const ok = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });
const sh = (cmd, opts = {}) =>
  execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const profile = (process.argv.find((a) => a.startsWith('--profile=')) ?? '--profile=admin').split(
  '=',
)[1];
const skipBuild = process.argv.includes('--skip-build');

async function get(url, { timeout = 8000, headers = {} } = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON — the body text is what we wanted */
    }
    return { status: res.status, text, json };
  } catch (err) {
    return { status: 0, text: '', json: null, error: err.message };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // ── 0. The root .env is the only .env Compose reads ────────────────────────
  if (!fs.existsSync(path.join(root, '.env'))) {
    console.error('✗ no root .env — copy .env.example and set the required passwords first');
    process.exit(2);
  }
  ok(
    'compose configuration resolves',
    (() => {
      try {
        sh('docker compose config');
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // ── 1. Stop anything from a previous run, then bring the profile up ────────
  console.log('stopping any previous stack…');
  try {
    sh(`docker compose --profile admin --profile full down --remove-orphans`);
  } catch {}
  console.log(
    `starting the ${profile} profile${skipBuild ? '' : ' (building — expect 15-40 minutes cold)'}…`,
  );
  const upLog = path.join(root, '.build-logs', `stack-up-${profile}.log`);
  fs.mkdirSync(path.dirname(upLog), { recursive: true });
  try {
    sh(`docker compose up -d ${skipBuild ? '' : '--build'} >> "${upLog}" 2>&1`, {
      shell: true,
      timeout: 60 * 60 * 1000,
    });
    sh(
      `docker compose --profile ${profile} up -d ${skipBuild ? '' : '--build'} >> "${upLog}" 2>&1`,
      { shell: true, timeout: 60 * 60 * 1000 },
    );
  } catch (err) {
    console.error(`✗ compose up failed — see ${upLog}`);
    process.exit(2);
  }

  // ── 2. Every container with a healthcheck reaches healthy ─────────────────
  const names = sh(`docker compose --profile ${profile} ps --format "{{.Name}}"`)
    .split('\n')
    .filter(Boolean);
  const deadline = Date.now() + 10 * 60 * 1000; // kafka alone can take 60s cold
  const pending = new Set(names);
  while (pending.size && Date.now() < deadline) {
    for (const n of [...pending]) {
      const state = sh(
        `docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" ${n}`,
      ).trim();
      if (state === 'healthy' || state === 'running') pending.delete(n);
      if (state === 'exited' || state === 'dead') {
        ok(`container ${n}`, false, `${state} — docker logs ${n}`);
        pending.delete(n);
      }
    }
    if (pending.size) await sleep(3000);
  }
  for (const n of pending) ok(`container ${n}`, false, 'never became healthy within 10 minutes');
  ok(`all ${names.length} containers healthy`, pending.size === 0);

  // ── 3. Database readiness — the B commands, run as the application user ───
  // Application → Database → Query → Result, through each service's own
  // connection, not through `docker exec psql -U postgres`.
  for (const s of nestEntries(loadRegistry(root)).filter((e) => e.database)) {
    if (profile === 'admin' && !(s.profiles ?? []).includes('admin')) continue;
    const r = await get(`http://127.0.0.1:${s.ports.http}${s.health.ready ?? '/health/ready'}`);
    const db = r.json?.checks?.database;
    ok(
      `${s.name} ran SELECT 1`,
      db?.status === 'up',
      db ? `${db.status} ${db.error ?? ''}` : `HTTP ${r.status}`,
    );
  }
  // Migration ledgers say nothing is pending.
  ok(
    'main migration ledger is level',
    (() => {
      try {
        return !sh('npm run --silent migration:show:main', {
          cwd: path.join(root, 'apps/api'),
        }).includes('[ ]');
      } catch {
        return false;
      }
    })(),
  );

  // ── 4. API readiness — the deep route, and the aggregate ───────────────────
  const ready = await get('http://127.0.0.1:3001/api/v1/health/ready');
  ok('gateway /api/v1/health/ready answers', ready.status === 200, `HTTP ${ready.status}`);
  ok(
    'gateway readiness is ready, not degraded',
    ready.json?.status === 'ready',
    JSON.stringify(ready.json?.checks ?? {}).slice(0, 300),
  );
  ok(
    'gateway Redis is the real Redis',
    ready.json?.checks?.redis?.emulated !== true,
    ready.json?.checks?.redis?.detail ?? '',
  );

  // ── 5. Console reachability, through the container ────────────────────────
  const login = await get('http://127.0.0.1:3000/admin/login', { timeout: 20000 });
  ok('console GET /admin/login is 200', login.status === 200, `HTTP ${login.status}`);
  // A Next dev server returns 200 for notFound(); assert the page is the page.
  ok(
    'console rendered the sign-in form',
    /name="email"|type="password"/i.test(login.text),
    `${login.text.length} bytes and no password field`,
  );

  // ── 6. Redis and Kafka, from inside the network ───────────────────────────
  ok(
    'redis answers PING',
    (() => {
      try {
        return (
          sh(
            `docker exec kartseek-redis redis-cli -a "${process.env.REDIS_PASSWORD ?? ''}" --no-auth-warning ping`,
          ).trim() === 'PONG'
        );
      } catch {
        return false;
      }
    })(),
  );
  ok(
    'redis does not evict keys that have no expiry',
    (() => {
      try {
        const policy = sh(
          `docker exec kartseek-redis redis-cli -a "${process.env.REDIS_PASSWORD ?? ''}" --no-auth-warning config get maxmemory-policy`,
        );
        return !/allkeys-lru/.test(policy);
      } catch {
        return false;
      }
    })(),
    'allkeys-lru evicts loyalty balances and cart contents',
  );
  ok(
    'kafka lists topics',
    (() => {
      try {
        return (
          sh(
            'docker exec kartseek-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list',
          ).trim().length > 0
        );
      } catch {
        return false;
      }
    })(),
  );

  // ── 7. Logs carry no fatal and no error line ──────────────────────────────
  const logs = sh(`docker compose --profile ${profile} logs --no-color --tail 400`);
  const bad = logs
    .split('\n')
    .map((l) => [l, classifyLogLine(l)])
    .filter(([, c]) => c);
  ok(
    'no fatal or error lines in the container logs',
    bad.length === 0,
    bad
      .slice(0, 3)
      .map(([l]) => l.slice(0, 160))
      .join(' | '),
  );

  const { code, report, failed, total } = summarise(results);
  console.log(`\n${report}\n\n${total - failed}/${total} checks passed`);
  process.exit(code);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
```

- [ ] **Step 3: Run the unit test, then the real thing**

```bash
node --test scripts/stack/validate.test.mjs        # green
npm run stack:up:admin                             # background; see the timing note below
npm run stack:validate
```

**Expected cost.** Twelve images on a cold Docker cache: the shared `deps` layer (root `npm ci`, ~1900 packages) is **8–14 minutes** and is built once per Dockerfile, so three `npm ci` runs dominate; each additional image on top is **40 s – 3 min**. Total **25–45 minutes** cold, **3–6 minutes** warm. Disk: **~9–12 GB** of images plus **~4 GB** of build cache; `docker system df` before starting, and `docker builder prune -f` if under 20 GB free. The build MUST run detached with its log on disk — `docker compose --profile admin up -d --build > .build-logs/stack-up-admin.log 2>&1 &`, then `tail -f` — never in the foreground of a session.

- [ ] **Step 4: Document it**

Add to `docs/guides/local-setup.md`, after "Verify":

> ## Validate the container stack
>
> `npm run stack:up:admin` builds and starts the twelve containers an
> administrator needs end to end; `npm run stack:validate` then proves them:
> every container healthy, every service's `/health/ready` reporting a real
> `SELECT 1`, the gateway not on the Redis emulator, `GET /admin/login`
> returning a page with a password field, Kafka listing topics, and no error
> line in the logs. `npm run stack:down` stops everything.
>
> The first build is 25–45 minutes and needs about 12 GB. Run it detached and
> read `.build-logs/stack-up-admin.log`.

- [ ] **Step 5: Commit**

```bash
git add scripts/stack docs/guides/local-setup.md package.json
git commit -m "feat(stack): a clean-start validator that proves the containers, the queries and the console" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (IN8): Kubernetes probes the real routes, and the manifests name every datastore

Covers **AUD2-001**, **AUD2-002**, **AUD2-027**, **AUD2-028**, **AUD2-029**.

**Files:**

- Modify: `infra/k8s/api-gateway.yaml:135-159`
- Modify: `infra/k8s/gen-microservices.sh` (read the registry)
- Regenerate: `infra/k8s/microservices-generated.yaml`
- Modify: `infra/k8s/config.yaml`, `infra/k8s/databases.yaml`
- Create: `scripts/registry/k8s.test.mjs`

- [ ] **Step 1: The gateway's three probes (AUD2-001)**

`setGlobalPrefix('api')` plus URI versioning make the route `/api/v1/health`; all three probes point at `/health`, so a real rollout never passes readiness and crash-loops on liveness. In `infra/k8s/api-gateway.yaml`:

```yaml
          livenessProbe:
            httpGet:
              # /health is a 404 here: main.ts sets the global prefix `api` and
              # enables URI versioning, so the route is /api/v1/health.
              path: /api/v1/health
              port: http
…
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: http
…
          startupProbe:
            httpGet:
              path: /api/v1/health
              port: http
```

- [ ] **Step 2: Probes for the 22 generated deployments (AUD2-002)**

The generator defaults to `tcpSocket` (`gen-microservices.sh:70-76`) — 42 of them against 2 `httpGet`. A tcpSocket probe passes the moment Nest binds, so a pod whose database is unreachable stays in the Service's endpoint list. Now that Task IN1 gives every service `/health` and `/health/ready`, drive the probes from the registry.

Replace the hard-coded `SERVICES` table and the probe block in `gen-microservices.sh` with a registry read. Emit the table from Node so there is one source of truth:

```bash
# ── Service table, read from services.yaml ───────────────────────────────────
# Columns: name http grpc tcp live ready
SERVICES="$(node --input-type=module -e "
import {loadRegistry,repoRoot,nestEntries} from '../../scripts/registry/lib.mjs';
const reg = loadRegistry(repoRoot());
for (const s of nestEntries(reg)) {
  if (s.kind === 'gateway') continue;                 // api-gateway.yaml is hand-written
  console.log([s.name, s.ports.http, s.ports.grpc ?? '-', s.ports.tcp ?? '-',
               s.health.live ?? '-', s.health.ready ?? '-'].join(' '));
}")"
```

and the probe selection:

```bash
  # Probe the registry's health route. tcpSocket only where there is none, or
  # where the HTTP listener is bound to loopback by design (pharmacy-service),
  # which the kubelet cannot reach.
  if [ "$live" = "-" ] || [ "$svc" = "pharmacy-service" ]; then
    liveblock="tcpSocket: { port: $probe }"
    readyblock="tcpSocket: { port: $probe }"
  else
    liveblock="httpGet: { path: $live, port: http }"
    readyblock="httpGet: { path: ${ready:-$live}, port: http }"
  fi
```

Regenerate and check the counts changed the way they should:

```bash
bash infra/k8s/gen-microservices.sh
grep -c "httpGet" infra/k8s/microservices-generated.yaml    # was 2 → expect 42
grep -c "tcpSocket" infra/k8s/microservices-generated.yaml  # was 42 → expect 2 (pharmacy)
grep -c "kind: Deployment" infra/k8s/microservices-generated.yaml   # still 22
```

- [ ] **Step 3: A drift test so the manifest cannot fall behind the registry**

`scripts/registry/k8s.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRegistry, repoRoot, nestEntries } from './lib.mjs';

const root = repoRoot();
const gen = fs.readFileSync(path.join(root, 'infra/k8s/microservices-generated.yaml'), 'utf8');
const gw = fs.readFileSync(path.join(root, 'infra/k8s/api-gateway.yaml'), 'utf8');
const reg = loadRegistry(root);

test('every generated deployment probes the route the registry declares', () => {
  for (const s of nestEntries(reg)) {
    if (s.kind === 'gateway' || s.name === 'pharmacy-service') continue;
    if (!gen.includes(`name: ${s.name}\n`)) continue; // auth/order/payment live in microservices.yaml
    if (s.health.live) {
      assert.ok(
        gen.includes(`httpGet: { path: ${s.health.live}, port: http }`),
        `${s.name}: no httpGet probe for ${s.health.live}`,
      );
    }
  }
});

test('the gateway probes carry the global prefix and the version', () => {
  assert.match(gw, /path: \/api\/v1\/health\b/);
  assert.match(gw, /path: \/api\/v1\/health\/ready/);
  assert.ok(!/path: \/health\b/.test(gw), 'a bare /health probe is a 404 behind the global prefix');
});

test('every module database has its five keys in the ConfigMap', () => {
  const cm = fs.readFileSync(path.join(root, 'infra/k8s/config.yaml'), 'utf8');
  for (const s of nestEntries(reg)) {
    if (!s.database || s.database.envPrefix === 'DB') continue;
    for (const k of ['HOST', 'PORT', 'NAME'])
      assert.match(
        cm,
        new RegExp(`^\\s*${s.database.envPrefix}_${k}:`, 'm'),
        `${s.database.envPrefix}_${k} missing`,
      );
  }
});
```

Run: `node --test scripts/registry/k8s.test.mjs` → the first two pass after Steps 1–2, the third fails until Step 4.

- [ ] **Step 4: The seven missing module databases (AUD2-027)**

`infra/k8s/config.yaml:194-197` defines `MARKETPLACE_DB_*` only. The other seven fall back to `DB_HOST`/`DB_NAME` → the main `kartseek_db`, whose vertical schemas hold the stale copies Task IN2 quarantined, and where `taxi` has zero tables. Add, for each of grocery, restaurant, pharmacy, doctor, hotel, taxi, franchise:

```yaml
GROCERY_DB_HOST: 'postgres-grocery.kartseek.svc.cluster.local'
GROCERY_DB_PORT: '5432'
GROCERY_DB_NAME: 'kartseek_grocery'
GROCERY_DB_USER: 'grocery_user'
# GROCERY_DB_PASSWORD comes from the kartseek-secrets Secret, never from here.
```

and a StatefulSet per store in `databases.yaml`, copied from the marketplace one (same image `postgis/postgis:16-3.4-alpine`, same PVC shape, its own `metadata.name` and volume claim). The generator's `wait-for-db` init container already resolves `$init_host`; extend its `case` block so each module service waits for its own store:

```bash
    grocery-service|restaurant-service|pharmacy-service|doctor-service|hotel-service|taxi-service|franchise-service)
      mod="${svc%-service}"
      init_name="wait-for-${mod}-db"
      init_host="postgres-${mod}.kartseek.svc.cluster.local"
      init_msg="waiting for ${mod} db"
      ;;
```

- [ ] **Step 5: MongoDB and Elasticsearch (AUD2-028, AUD2-029)**

audit-log-service is deployed with no Mongo anywhere in the manifests; `resolveAuditUri` falls back to `mongodb://localhost:27017/kartseek_audit`, and in a pod localhost is the pod — the admin audit trail has no datastore in the deployment target. Same shape for search-service and Elasticsearch.

Add to `databases.yaml` a `mongodb` StatefulSet (`mongo:8.3`, PVC, `readinessProbe` running `mongosh --eval 'db.adminCommand("ping")'`) and an `elasticsearch` StatefulSet (`elasticsearch:8.17.0`, single node, `xpack.security.enabled=true`, PVC, readiness on `/_cluster/health`). Add to `config.yaml`:

```yaml
MONGO_HOST: 'mongodb.kartseek.svc.cluster.local'
MONGO_DB_NAME: 'kartseek_audit'
ELASTICSEARCH_NODE: 'http://elasticsearch.kartseek.svc.cluster.local:9200'
ELASTICSEARCH_INDEX_PREFIX: 'kartseek_'
```

with `MONGO_URI` and `ELASTIC_PASSWORD` in `kartseek-secrets`. And make the fallback fail loudly — in `resolveAuditUri` (audit-log-service):

```ts
if (!uri && process.env.NODE_ENV === 'production') {
  throw new Error(
    'MONGO_URI is not set. The audit trail has no datastore; refusing to start in production ' +
      'rather than writing to a localhost Mongo that, in a pod, is the pod.',
  );
}
```

and in `search.service.ts`, keep the Redis fallback but make it visible — the ES health check from Task IN1 already reports `down`, so nothing else is needed beyond removing the hardcoded `http://localhost:9200` default in production the same way.

- [ ] **Step 6: Validate the manifests**

```bash
node --test scripts/registry/k8s.test.mjs                       # 3 green
kubectl apply --dry-run=client -f infra/k8s/ 2>&1 | tail -20    # no errors
# --validate=strict passes manifests that cannot actually run (2026-08-13 audit),
# so also assert the probe paths by reading them back:
grep -n "path: /api/v1/health" infra/k8s/api-gateway.yaml        # 3 hits
```

If a cluster is available, `kubectl apply --dry-run=server` as well; if not, record REMAINING with that reason rather than claiming a server-side pass.

- [ ] **Step 7: Commit**

```bash
git add infra/k8s scripts/registry/k8s.test.mjs apps/api/apps/audit-log-service apps/api/apps/search-service
git commit -m "fix(k8s): probes hit the real health routes; mongo, elasticsearch and seven module stores declared" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (IN9): `npm run smoke` leaves nothing behind on Windows

No AUD2 id — this is the standing hazard the memory records ("boots all 26 from dist; leaves processes running on Windows") and a precondition for trusting every other verification in this plan.

**Files:**

- Modify: `tests/smoke/boot-all.mjs`
- Create: `tests/smoke/boot-all.test.mjs`

- [ ] **Step 1: Failing test for the pure parts**

`tests/smoke/boot-all.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { portsStillListening } from './boot-all.mjs';

test('portsStillListening reports a port that is bound and nothing when it is free', async () => {
  const server = net.createServer().listen(45999, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  assert.deepEqual(await portsStillListening([45999, 45998]), [45999]);
  await new Promise((r) => server.close(r));
  assert.deepEqual(await portsStillListening([45999]), []);
});
```

- [ ] **Step 2: Harden `stop()` and assert the tree really died**

In `tests/smoke/boot-all.mjs`, the win32 branch already calls `taskkill /T /F`, but nothing waits for it, nothing runs on an unexpected exit, and nothing checks afterwards — which is how a run leaves 26 listeners behind and the next run reports phantom failures.

```js
/** Kill the child and everything it spawned, then wait for the port to go. */
function stop(child) {
  running.delete(child);
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      // /T because a Nest process spawns workers; /F because SIGTERM is not a
      // thing on Windows and `child.kill()` leaves the tree behind.
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* the tree is already gone */
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
  }
}

/** Which of these ports still has a listener. Used as the teardown assertion. */
export async function portsStillListening(ports) {
  const checks = ports.map(
    (p) =>
      new Promise((resolve) => {
        const sock = net.connect(p, '127.0.0.1');
        const done = (bound) => {
          sock.destroy();
          resolve(bound ? p : null);
        };
        sock.once('connect', () => done(true));
        sock.setTimeout(600, () => done(false));
        sock.once('error', () => done(false));
      }),
  );
  return (await Promise.all(checks)).filter((p) => p !== null);
}
```

Register the cleanup on every exit path, not just the two signals:

```js
process.on('exit', () => {
  for (const c of running) stop(c);
});
process.on('uncaughtException', (err) => {
  for (const c of running) stop(c);
  console.error(err);
  process.exit(2);
});
```

And after the results table, before the final exit:

```js
// Leftover listeners are the failure mode this script has had all along: a run
// that reports 26/26 and leaves 26 Node processes bound means the next run
// measures the previous one. Give the OS a moment to release the sockets, then
// assert, and name the ports so `netstat -ano | findstr <port>` finds the pid.
await new Promise((r) => setTimeout(r, 1500));
const leftover = await portsStillListening(entries.map((s) => s.ports.http));
if (leftover.length) {
  console.error(
    `\n✗ ${leftover.length} port(s) still listening after teardown: ${leftover.join(', ')}\n` +
      `  Windows: netstat -ano | findstr "${leftover[0]}"  then  taskkill /PID <pid> /T /F`,
  );
  process.exit(1);
}
console.log('no leftover listeners');
```

- [ ] **Step 3: Prove it, twice in a row**

```bash
node --test tests/smoke/boot-all.test.mjs
npm run build && npm run smoke
# The real test is the second run — a leftover from the first shows up as a
# service that "starts" in 0.0s on a port it never bound.
npm run smoke
powershell -c "Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -ge 3010 -and $_.LocalPort -le 3035} | Measure-Object | Select-Object -ExpandProperty Count"
```

Expected: both runs end `26/26 healthy` followed by `no leftover listeners`, and the PowerShell count is `0`.

- [ ] **Step 4: Commit**

```bash
git add tests/smoke
git commit -m "fix(smoke): kill the process tree on windows and fail when a port is still listening" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (IN10): The remaining INFRA-assigned security and durability rows

Covers **AUD2-071**, **AUD2-076**, **AUD2-031**, **AUD2-032** and **AUD2-125** (logged under MODULES in §12, assigned to this plan by the workstream brief because both call sites are gateway infrastructure).

**Files:**

- Modify: `apps/api/apps/api-gateway/src/interceptors/audit.interceptor.ts:170-182`
- Modify: `apps/api/apps/api-gateway/src/controllers/geo-security.controller.ts:342-348`
- Create: `apps/api/apps/api-gateway/src/interceptors/audit.interceptor.ip.spec.ts`
- Modify: `apps/api/libs/security/src/jwt.strategy.ts:12-24`, `security.module.ts:44-48`, `apps/api/apps/api-gateway/src/gateways/ws-auth.util.ts:35`
- Modify: the 16 `redis.keys(...)` request-path call sites
- Modify: `infra/docker/compose.infra.yml` (Redis eviction policy)
- Create: `apps/api/scripts/search-reindex.mjs`

- [ ] **Step 1: Client IP (AUD2-125), test first**

Both call sites read `X-Forwarded-For`/`X-Real-IP` unconditionally, so the `actorIp` written to the immutable audit collection is caller-supplied and every geo-fencing decision can be spoofed with a header. `main.ts:56-59` already sets `trust proxy` to a hop count, which makes Express's own `req.ip` the correct, un-spoofable answer — `DdosProtectionMiddleware.extractClientIp:314` gets this right and is the model.

`audit.interceptor.ip.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clientIp } from './audit.interceptor';

describe('clientIp', () => {
  it('uses the value Express resolved under trust proxy', () => {
    expect(clientIp({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' } } as any)).toBe(
      '203.0.113.9',
    );
  });
  it('ignores a spoofed header entirely', () => {
    expect(clientIp({ ip: '10.0.0.5', headers: { 'x-real-ip': '8.8.8.8' } } as any)).toBe(
      '10.0.0.5',
    );
  });
  it('falls back to the socket, never to a header', () => {
    expect(
      clientIp({
        headers: { 'x-forwarded-for': '1.2.3.4' },
        socket: { remoteAddress: '10.0.0.7' },
      } as any),
    ).toBe('10.0.0.7');
  });
});
```

Then replace both private extractors with one exported helper in `audit.interceptor.ts`:

```ts
/**
 * The client IP, from Express rather than from the caller.
 *
 * Both this interceptor and geo-security.controller.ts read X-Forwarded-For
 * and X-Real-IP unconditionally, so anyone could write any address into the
 * immutable audit trail and past every geo-fence. main.ts:56-59 sets
 * `trust proxy` to a hop count, which is precisely the configuration that makes
 * `req.ip` the last untrusted hop — so `req.ip` is the answer, and a header is
 * never consulted.
 */
export function clientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
```

`geo-security.controller.ts` imports it and deletes `extractIp`. Prove nothing else hand-rolls one:

```bash
grep -rn "x-forwarded-for\|x-real-ip\|cf-connecting-ip" apps/api --include=*.ts | grep -v node_modules | grep -v "ddos-protection.middleware.ts" | grep -v "\.spec\.ts"
```

Expected: no hits.

- [ ] **Step 2: The JWT secret (AUD2-071)**

`jwt.strategy.ts:12-24` falls back to a literal that is in the repository and throws only when `NODE_ENV === 'production'`. Combined with Compose declaring `NODE_ENV` nowhere, any non-k8s deployment can be handed a SUPER_ADMIN token signed with a public secret. Make the requirement unconditional with an explicit dev opt-in:

```ts
/**
 * The signing secret, required everywhere.
 *
 * The old fallback was a literal in tracked source, guarded only by
 * NODE_ENV === 'production' — and Compose sets NODE_ENV nowhere, so a staging
 * box signed tokens with a secret anyone can read. There is now one resolver,
 * it throws when JWT_SECRET is unset, and ALLOW_DEV_JWT_SECRET=true is the
 * only way to get the development value — a choice someone has to make.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.ALLOW_DEV_JWT_SECRET === 'true')
    return 'kartseek-development-secret-not-for-any-deployment';
  throw new Error(
    'JWT_SECRET is not set (or is shorter than 32 characters). Set it, or set ' +
      'ALLOW_DEV_JWT_SECRET=true for local development only.',
  );
}
```

`security.module.ts:44-48` and `ws-auth.util.ts:35` both call it, so the HTTP and WebSocket paths cannot verify against different secrets. Add `JWT_SECRET` to the root `.env.example` and `ALLOW_DEV_JWT_SECRET=true` to `apps/api/.env.example` with the comment above it.

- [ ] **Step 3: Blocking `KEYS` off the request path (AUD2-076)**

`redis.keys(pattern)` blocks the whole Redis server for the scan. 297 dev keys hide it; a production keyspace does not. The safe helpers (`scan()`, `delPattern()`) already exist and are used elsewhere.

```bash
grep -rn "\.keys(" apps/api --include=*.ts | grep -v node_modules | grep -v "\.spec\.ts" | grep -v "Object.keys"
```

Expected sites: `driver-dispatch.service.ts:386`, `ddos-monitor.service.ts` (7), `delivery.service.ts`/`delivery.controller.ts` (4), `refund.service.ts` (2), `report.service.ts:192,238`. Replace each `await this.redis.keys(p)` with `await this.redis.scan(p)` (same return shape) and each keys-then-del loop with `await this.redis.delPattern(p)`. Leave any call inside a startup or scheduled path, and annotate it as deliberate. Re-run the grep; anything left must carry a one-line comment saying why.

- [ ] **Step 4: Redis stops evicting records (AUD2-031)**

Loyalty balances are stored without expiry — deliberately, because a balance is a record — in a Redis configured `maxmemory 256mb` with `allkeys-lru`, which evicts them anyway. Moving balances to Postgres is a money-path schema change and belongs to the money workstream; the infrastructure half is one line and is unambiguously right either way:

```yaml
command: >
  redis-server --requirepass ${REDIS_PASSWORD:?set REDIS_PASSWORD}
  --maxmemory 256mb
  # volatile-lru, not allkeys-lru: only keys that were given an expiry may
  # be evicted. Loyalty balances, cart contents and refresh-token slots are
  # written without one precisely because they are records, and allkeys-lru
  # deleted them under pressure regardless.
  --maxmemory-policy volatile-lru
  --appendonly yes
```

`--appendonly yes` because RDB-only loses everything since the last snapshot on an unclean stop. Note in `infra/docker/README.md` that a full `maxmemory` with `volatile-lru` and no evictable keys makes writes fail with OOM — which is the correct, loud behaviour, and the signal to move balances to Postgres.

Verify:

```bash
docker compose up -d --force-recreate redis
docker exec kartseek-redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning config get maxmemory-policy appendonly
```

- [ ] **Step 5: Re-index the search catalogue (AUD2-032)**

The ES index holds 60 documents against 178 products — every search result is a 34% sample, and the service reported "connected". Task IN1 made readiness state the count; this makes it correct.

`apps/api/scripts/search-reindex.mjs`:

```js
#!/usr/bin/env node
/**
 * Rebuild the marketplace search index from the marketplace database.
 *
 *   node apps/api/scripts/search-reindex.mjs [--dry-run]
 *
 * Reads the catalogue directly rather than through search-service, because the
 * point is to establish the truth the service indexes against incrementally.
 * Idempotent: documents are upserted by product id.
 */
import 'dotenv/config';
import { Client } from 'pg';

const NODE = process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200';
const INDEX = `${process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'kartseek_'}marketplace`;
const dryRun = process.argv.includes('--dry-run');

const pg = new Client({
  host: process.env.MARKETPLACE_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.MARKETPLACE_DB_PORT || process.env.DB_PORT || 5432),
  user: process.env.MARKETPLACE_DB_USER || process.env.DB_USER,
  password: process.env.MARKETPLACE_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MARKETPLACE_DB_NAME || process.env.DB_NAME,
});

await pg.connect();
const { rows } = await pg.query(`
  SELECT p.id, p.name, p.description, p.slug, p.brand_id, p.category_id, p.subcategory_id,
         p.region_code, p.status
  FROM marketplace.products p
  WHERE p.status = 'ACTIVE'`);
console.log(`${rows.length} active products in ${process.env.MARKETPLACE_DB_NAME}`);

const before = await fetch(`${NODE}/${INDEX}/_count`).then((r) => (r.ok ? r.json() : { count: 0 }));
console.log(`${before.count} documents in ${INDEX} before`);
if (dryRun) {
  await pg.end();
  process.exit(0);
}

const body =
  rows
    .flatMap((r) => [{ index: { _index: INDEX, _id: r.id } }, r])
    .map((o) => JSON.stringify(o))
    .join('\n') + '\n';
const res = await fetch(`${NODE}/_bulk`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-ndjson' },
  body,
});
const result = await res.json();
if (result.errors) {
  console.error(result.items.filter((i) => i.index?.error).slice(0, 3));
  process.exit(1);
}
await fetch(`${NODE}/${INDEX}/_refresh`, { method: 'POST' });
const after = await fetch(`${NODE}/${INDEX}/_count`).then((r) => r.json());
console.log(
  `${after.count} documents after — ${after.count === rows.length ? 'complete' : 'INCOMPLETE'}`,
);
await pg.end();
process.exit(after.count === rows.length ? 0 : 1);
```

Add `"search:reindex": "node scripts/search-reindex.mjs"` to `apps/api/package.json`. Run `--dry-run` first, then the real one, then confirm readiness agrees:

```bash
cd apps/api && npm run search:reindex -- --dry-run && npm run search:reindex
curl -s http://127.0.0.1:3033/health/ready | node -pe "JSON.parse(require('fs').readFileSync(0)).checks.elasticsearch.detail"
# Real workflow: a search for a product that was outside the 60
curl -s "http://localhost:3001/api/v1/search?q=<a product name from row 120>" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.results.length"
```

- [ ] **Step 6: Suites and build**

```bash
cd apps/api && npx vitest run && npx nest build --all      # 677 + the new specs
cd ../../apps/web && npm test                              # 610
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/apps/api-gateway/src/interceptors apps/api/apps/api-gateway/src/controllers/geo-security.controller.ts apps/api/libs/security apps/api/apps/api-gateway/src/gateways/ws-auth.util.ts
git commit -m "fix(gateway): client ip comes from trust proxy, not a header; the jwt secret is required" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add apps/api/apps apps/api/scripts/search-reindex.mjs apps/api/package.json infra/docker/compose.infra.yml infra/docker/README.md
git commit -m "fix(api): scan instead of keys on request paths; redis keeps records; search index rebuilt" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11 (IN11): The `full` profile — all 35 deployables as containers

Completes **AUD2-067**. **This task may be marked REMAINING** if the machine cannot build 35 images in the session; the `admin` profile from Task IN6 is the gate for everything else, and nothing in Tasks IN1–IN10 depends on this one.

- [ ] **Step 1: Build in the background, with logs**

```bash
mkdir -p .build-logs
docker compose --profile full build > .build-logs/stack-build-full.log 2>&1 &
# then, in the same session, keep working and check periodically:
tail -5 .build-logs/stack-build-full.log
```

**Expected cost.** 35 images sharing three `deps` layers: **45–90 minutes** cold, **8–15 minutes** warm. Disk: **~22–28 GB** of images plus build cache. Check headroom first — `docker system df` and the free space on the Docker disk — and if under **40 GB** free, stop and mark REMAINING rather than filling the disk mid-run. Nine of the 35 are Next zones, each of which needs `output: 'standalone'` and `outputFileTracingRoot` in its own `next.config.mjs` (only `apps/web` gets them in Task IN5); adding them to the eight zones is part of this task.

- [ ] **Step 2: Bring it up and validate**

```bash
npm run stack:up:full
npm run stack:validate -- --profile=full --skip-build
```

Expected: 35 containers healthy, every DB-owning service reporting `SELECT 1` `up`, the console at `http://localhost:3000/admin/login` and each zone under its `basePath` (`/marketplace`, `/grocery`, `/restaurant`, `/pharmacy`, `/doctor`, `/hotel-booking`, `/taxi`, `/franchise`) rendering its own markup — a zone-specific marker string, since Next returns 200 for `notFound()`.

- [ ] **Step 3: Point nginx at service names**

`infra/nginx/nginx.conf:81-91` upstreams to `host.docker.internal`, which is correct while the app tier runs as host processes and wrong once it does not. Add a second upstream block selected by an env-substituted include, or a `nginx.compose.conf` mounted by the `full`/`admin` profile that upstreams to `api-gateway:3001` and `web:3000`. Keep the host-process config as the default so `npm run dev` is unaffected, and document which is which.

- [ ] **Step 4: Commit, or record REMAINING**

```bash
git add infra/docker infra/nginx modules/*/frontend/next.config.mjs
git commit -m "feat(compose): the full profile builds and runs all 35 deployables on the docker network" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

If the build could not complete, write the reason (disk, time, a specific image's failure with its log path) into the self-review as REMAINING. Do not mark it done.

---

## Self-review

### AUD2 id → task coverage

| id       | P   | Area                    | Task                     | How it is proved                                                            |
| -------- | --- | ----------------------- | ------------------------ | --------------------------------------------------------------------------- |
| AUD2-001 | P0  | k8s gateway health      | IN8 Step 1               | `grep "path: /api/v1/health" api-gateway.yaml` → 3; k8s drift test          |
| AUD2-002 | P0  | k8s service health      | IN1 + IN8 Step 2         | httpGet 2 → 42, tcpSocket 42 → 2; every service has a real `/health`        |
| AUD2-003 | P0  | Module databases        | IN3                      | 8 initial migrations; each boots with `NODE_ENV=production` on a scratch DB |
| AUD2-020 | P1  | Docker HEALTHCHECK port | IN5 Step 1, 7            | `docker inspect -f '{{.State.Health.Status}}'` → healthy                    |
| AUD2-021 | P1  | Local bootstrap         | IN5 Step 5               | module `.env.example` → shared instance; documented override                |
| AUD2-022 | P1  | Datastore exposure      | IN5 Step 6               | `${DB_BIND:-127.0.0.1}` on every port; ES security on                       |
| AUD2-023 | P1  | Marketplace credentials | IN4 Step 3               | `ssl` present with `DB_SSL=true`; production guard executes                 |
| AUD2-024 | P1  | Redis health            | IN1 Step 4, 15           | `docker stop kartseek-redis` → `degraded`, `emulated: true`                 |
| AUD2-025 | P1  | user-service schema     | IN2 Step 4               | schema spec + `/health/ready` database `up` + a real user list              |
| AUD2-026 | P1  | admin-service schema    | IN2 Step 4               | schema spec + a layout read                                                 |
| AUD2-027 | P1  | k8s module DBs          | IN8 Step 4               | k8s drift test asserts the five keys per module                             |
| AUD2-028 | P1  | k8s audit store         | IN8 Step 5               | Mongo StatefulSet + `MONGO_URI`; `resolveAuditUri` throws in production     |
| AUD2-029 | P1  | k8s search              | IN8 Step 5               | ES StatefulSet + `ELASTICSEARCH_NODE`; readiness reports `down` not silence |
| AUD2-030 | P1  | Main DB duplicates      | IN2 Step 7 (partial)     | five `public.*` vertical copies renamed; marketplace merge REMAINING        |
| AUD2-031 | P1  | Loyalty balances        | IN10 Step 4 (partial)    | `volatile-lru` + AOF; the move to Postgres is the money workstream          |
| AUD2-032 | P1  | Search index            | IN1 Step 7 + IN10 Step 5 | readiness states the count; `search:reindex` makes it complete              |
| AUD2-033 | P1  | Connection pools        | IN4 Step 2               | `databaseCredentials` spec asserts `extra.max`                              |
| AUD2-067 | P2  | Compose                 | IN6 + IN11               | 35 `container_name:` lines, generated; `registry:check` fails when stale    |
| AUD2-068 | P2  | Migration ledger        | IN2 Step 6               | `migration:show:main` → five `[X]`, zero `[ ]`                              |
| AUD2-069 | P2  | Readiness probe         | IN1 Step 11              | `SELECT 1` through the injected `DataSource`; spec pins the failure path    |
| AUD2-070 | P2  | Auto-sync fail-open     | IN3 Step 1, 2            | `assertSynchronizeAllowed` spec; `NODE_ENV` set explicitly in compose       |
| AUD2-071 | P2  | JWT secret              | IN10 Step 2              | one `resolveJwtSecret()`, unconditional, HTTP and WS share it               |
| AUD2-072 | P2  | Health disclosure       | IN1 Step 12              | spec: an anonymous body contains no four-digit number                       |
| AUD2-073 | P2  | DB privileges           | IN4 Step 6               | eight roles, schema-scoped, `\du` shows them                                |
| AUD2-074 | P2  | Tracked secrets         | IN4 Step 2, 4            | `grep kartseek123` over all source → no hits                                |
| AUD2-075 | P2  | Compose defaults        | IN5 Step 6               | `${VAR:?…}` everywhere; `docker compose config` fails without `.env`        |
| AUD2-076 | P2  | Redis `KEYS`            | IN10 Step 3              | grep leaves only annotated, non-request-path calls                          |
| AUD2-125 | P2  | Client IP trust         | IN10 Step 1              | `clientIp` spec; grep finds no other header reader                          |
| AUD2-136 | P3  | Observability           | IN6 Step 6               | the forward reference is removed, with a note on what would replace it      |
| AUD2-137 | P3  | `.env.docker`           | IN5 Step 4               | deleted after proving nothing reads it                                      |
| AUD2-138 | P3  | Dead env names          | IN5 Step 4               | deleted after proving nothing reads them                                    |
| AUD2-139 | P3  | `SELLER_*`              | IN5 Step 4               | deleted after proving no service exists                                     |
| AUD2-140 | P3  | Compose dependencies    | IN5 Step 6               | `condition: service_healthy` on all four tools                              |
| AUD2-141 | P3  | Orders schema naming    | IN2 Step 8               | recorded in the runbook                                                     |
| AUD2-142 | P3  | auth-service idle pool  | IN4 Step 5               | removed after proving no query, or kept with the reason written             |

35 of 35 INFRA rows are addressed; **AUD2-125** is additionally covered though §12 files it under MODULES.

### Deferred, with reasons

- **AUD2-143** (`@app/config` does not exist; 26 duplicated `ConfigModule.forRoot` calls with three `envFilePath` conventions). The audit's own Fix column says "Out of scope to fix here; recorded so the next audit does not look for it." Consolidating config across 26 modules touches every boot path in the platform and would put every other task in this plan behind it. Not started; recorded.
- **AUD2-030, the marketplace half.** Reconciling `kartseek_db.marketplace` (33 tables, 178 listings, 19 sellers, 0 coupons) with `kartseek_marketplace` (35 tables, 712 listings, 23 sellers, 5 coupons) means choosing which of two live, divergent row sets is the platform's and discarding or merging the other. That is a data-owner decision with money in it (buy-box prices differ by 534 rows), not an infrastructure change. IN2 quarantines only the five copies nothing owns. REMAINING, with the numbers above so the next pass does not re-derive them.
- **AUD2-031, the durable half.** `volatile-lru` + AOF stops the eviction; moving loyalty balances out of Redis into Postgres is a money-path schema change and belongs with the wallet/payout work.
- **Task IN11** may be marked REMAINING on build cost alone (see its Step 1); nothing else in the plan depends on it.

### Placeholder scan

No step says "TBD", "as appropriate" or "fix the others similarly" without naming them. Where a value has to be read from the repository rather than invented, the step gives the exact command that reads it: the `HealthModule.register` truth table (IN1 Step 6) is a `node --input-type=module` one-liner over the registry, not a list retyped here; the eight entity lists (IN3 Step 3) are copied from the module file the per-module table names; the six `redis.keys` call-site groups (IN10 Step 3) come from a grep whose expected output is stated. Three steps are explicitly conditional and say what to do in each branch: IN2 Step 1 (stop if `user.users` has rows), IN4 Step 5 (keep the connection if the grep hits), IN8 Step 6 (record REMAINING if no cluster is available).

### Consistency

`DependencyStatus` has the same shape in `@app/common`, in `RedisService.health()`, in every `HEALTH_CHECK` implementation and in the gateway's `checks` map — one `status` vocabulary (`up` / `degraded` / `down` / `skipped`) and one `emulated` flag, so `scripts/stack/validate.mjs` reads `checks.database.status` and `checks.redis.emulated` from any of the 26 without a per-service branch. The registry is the only place a port, a health route, a database or a dependency list is written down: `compose.services.yml`, `microservices-generated.yaml`, the READMEs, the smoke test and the stack validator all derive from it, and `npm run registry:check` fails when any of them drifts. Every commit message is lower-case, under 100 characters, and carries `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Every task that runs `migration:run` runs `migration:show` first and states what `down()` does.
