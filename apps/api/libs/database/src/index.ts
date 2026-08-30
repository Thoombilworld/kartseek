export * from './database.module';
// `database.validator.ts` was never re-exported here, so the gateway's
// `import { validateDatabaseConfig, logDatabaseConfig } from '@app/database'`
// in main.ts failed to typecheck (TS2305) even though both functions exist.
export * from './database.validator';
export * from './database.credentials';
