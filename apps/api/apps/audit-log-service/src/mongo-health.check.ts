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
