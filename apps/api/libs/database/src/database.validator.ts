/**
 * Database Configuration Validation
 *
 * Prevents misconfigurations that could corrupt shared database tables
 * when multiple services share one PostgreSQL instance.
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseConfig');

/**
 * Validates database configuration before app bootstrap
 *
 * CRITICAL: Multiple services share one PostgreSQL database.
 * If even one service enables AUTO_SCHEMA_SYNC (synchronize: true),
 * it will auto-alter shared tables and corrupt data.
 *
 * All schema changes must be made through migrations, not auto-sync.
 */
export function validateDatabaseConfig(): void {
  const isSyncEnabled = process.env.DB_SYNCHRONIZE === 'true';
  const skipDb = process.env.SKIP_DB === 'true';

  if (skipDb) {
    logger.warn('⚠️  DB_SYNCHRONIZE=true check skipped (SKIP_DB=true)');
    return;
  }

  if (isSyncEnabled) {
    const errorMessage =
      `\n\n❌ FATAL: DB_SYNCHRONIZE=true is forbidden!\n` +
      `\n` +
      `Multiple microservices share one PostgreSQL database.\n` +
      `Enabling auto-schema-sync means this service will auto-ALTER shared tables\n` +
      `based on its own @Entity() definitions, causing data corruption.\n` +
      `\n` +
      `Solutions:\n` +
      `  1. Set DB_SYNCHRONIZE=false in .env\n` +
      `  2. Use TypeORM migrations for all schema changes\n` +
      `  3. Only one service owns each table (see entity ownership in comments)\n` +
      `\n` +
      `See: TypeORM Migration Docs\n` +
      `https://typeorm.io/migrations\n\n`;

    logger.error(errorMessage);
    throw new Error('DB_SYNCHRONIZE=true is forbidden');
  }

  logger.debug('✅ Database auto-sync disabled (safe for multi-service shared database)');
}

/**
 * Logs current database configuration for debugging
 */
export function logDatabaseConfig(): void {
  const config = {
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ?? '5432',
    username: process.env.DB_USER ?? 'postgres',
    database: process.env.DB_NAME ?? 'kartseek_db',
    synchronize: process.env.DB_SYNCHRONIZE ?? 'false',
    skipDb: process.env.SKIP_DB ?? 'false',
  };

  logger.log(`📊 Database Configuration:\n${JSON.stringify(config, null, 2)}`);
}

/**
 * The last line before TypeORM writes DDL.
 *
 * `validateDatabaseConfig()` guards DB_SYNCHRONIZE only, and all eight module
 * backends keyed `synchronize` on `NODE_ENV !== 'production'` instead — which
 * the validator never sees, and which Compose (declaring NODE_ENV nowhere)
 * resolves to `development` on a staging box, running auto-sync against real
 * data (AUD2-070). This runs inside the useFactory, where the value actually is.
 *
 * It is deliberately a throw and not a coercion to false. A service that would
 * have rewritten the schema is misconfigured, and a silent downgrade leaves the
 * misconfiguration in place for the next deploy to find; the boot failure names
 * the runner that should have built the schema instead.
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
