import 'reflect-metadata';
import { vi } from 'vitest';

/**
 * `reflect-metadata` before anything else: Nest resolves class dependencies
 * from the design-time type metadata the decorators emit, and the polyfill has
 * to be loaded before any decorated class is evaluated. See
 * `modules/doctor/backend/src/__tests__/decorator-metadata.spec.ts` for the
 * guard that the metadata is actually emitted under this runner.
 */

/**
 * `jest` as an alias for `vi`, so the existing specs run unmodified.
 *
 * The surface actually used across this repository's backend specs is
 * `jest.fn` and one `jest.resetModules`. There is no `jest.mock`, `spyOn`,
 * `useFakeTimers` or `requireActual` anywhere, which is what would have made
 * this a rewrite rather than an alias.
 *
 * This is a migration shim, not a destination: once the specs are renamed to
 * `vi`, delete it. Keeping the specs untouched during the move is deliberate —
 * it means any failure belongs to the runner swap rather than to an edit made
 * while porting.
 */
(globalThis as any).jest = vi;

/**
 * A placeholder `DB_PASSWORD` for the specs that import a DataSource.
 *
 * `databaseCredentials()` and the eight `db-config.ts` resolvers have no
 * built-in password any more (IN4/AUD2-074): a missing one throws. The module
 * `data-source.ts` files resolve their connection at *import* time, so on a
 * machine without `apps/api/.env` — a fresh clone, CI — `module-data-sources.spec.ts`
 * would fail on the import rather than on anything it asserts.
 *
 * `||=` so a real environment always wins, and deliberately a value that could
 * not authenticate against anything: nothing in the default suite opens a
 * connection, and the specs that do (the integration suites, excluded from this
 * run) read `process.env.DB_PASSWORD` themselves and refuse without it.
 */
process.env.DB_PASSWORD ||= 'vitest-placeholder-no-connection-is-opened';
