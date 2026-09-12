export type DependencyState = 'up' | 'degraded' | 'down' | 'skipped';

export interface DependencyStatus {
  status: DependencyState;
  /**
   * Why a dependency is not `up`, from a fixed vocabulary — never a driver
   * message. Populated by `RedisService.health()` so a `degraded` verdict can
   * say whether the store was switched off on purpose or has quietly died.
   */
  reason?: string;
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

/** Worst-of over a set of dependency verdicts. `down` beats `degraded` beats ready. */
export function worstOf(checks: Record<string, DependencyStatus>): 'ready' | 'degraded' | 'down' {
  const states = Object.values(checks).map((c) => c.status);
  if (states.includes('down')) return 'down';
  if (states.includes('degraded')) return 'degraded';
  return 'ready';
}

/**
 * The status code a readiness answer must carry.
 *
 * Kubernetes' `httpGet` probe and Docker's `curl -f` HEALTHCHECK decide pass or
 * fail from the status line alone — neither reads the body. A readiness route
 * that answers 200 with `{"status":"down"}` therefore tells the load balancer
 * to keep sending production traffic to a process whose database is gone,
 * which is the same unfalsifiable health as the TCP probe this work replaced.
 *
 * `degraded` deliberately stays 200: an emulated Redis or a half-failing cache
 * is a process that can still serve, and evicting it from the Service would
 * turn a warm-cache problem into an outage.
 */
export function readinessHttpStatus(status: string): number {
  return status === 'down' ? 503 : 200;
}

/**
 * The form of a readiness answer an unauthenticated caller may see: the verdict
 * and one word per dependency.
 *
 * `detail` named the database, the broker list and the Mongo URI, and `error`
 * is a driver message — a connection-level Postgres failure throws
 * `connect ECONNREFUSED <host>:<port>`, so keeping it would hand an anonymous
 * caller the internal address of the database during the one moment, a real
 * outage, when that matters most (AUD2-072). The reason is still recorded:
 * `HealthService` logs every failure it reports, and the staff board keeps the
 * raw message.
 */
export function publicReadiness(result: {
  status: string;
  checks: Record<string, DependencyStatus>;
}): { status: string; checks: Record<string, DependencyState> } {
  return {
    status: result.status,
    checks: Object.fromEntries(
      Object.entries(result.checks).map(([name, c]) => [name, c.status]),
    ) as Record<string, DependencyState>,
  };
}
