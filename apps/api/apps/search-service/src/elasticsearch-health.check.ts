import { Injectable } from '@nestjs/common';
import type { DependencyStatus, HealthCheck } from '@app/common';

/**
 * Readiness for the one service whose store is neither Postgres nor Mongo.
 *
 * `SearchService.healthCheck()` reported `elasticsearch: 'connected'` from a
 * boolean set once at construction, which says nothing about whether the index
 * holds anything. A reachable but near-empty index is the failure mode that hid
 * for months: 60 documents against 178 products meant every search was a 34%
 * sample, and the service reported "connected" throughout. Readiness now states
 * the number, which is the assertion AUD2-032 asks for.
 */
@Injectable()
export class ElasticsearchHealthCheck implements HealthCheck {
  readonly name = 'elasticsearch';

  async run(): Promise<DependencyStatus> {
    const node = process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200';
    const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'kartseek_';
    const t0 = Date.now();
    const res = await fetch(`${node}/${prefix}marketplace/_count`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok)
      return {
        status: 'down',
        error: `HTTP ${res.status} from ${node}`,
        latencyMs: Date.now() - t0,
      };
    const { count } = (await res.json()) as { count: number };
    return count > 0
      ? {
          status: 'up',
          latencyMs: Date.now() - t0,
          detail: `${prefix}marketplace: ${count} documents`,
        }
      : {
          status: 'degraded',
          latencyMs: Date.now() - t0,
          detail: `${prefix}marketplace is empty`,
        };
  }
}
