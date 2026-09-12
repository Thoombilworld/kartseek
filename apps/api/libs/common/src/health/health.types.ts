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
