import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/**
 * Regression test for `patches/kafkajs+2.2.4.patch`.
 *
 * Every service's boot log carried
 * `TimeoutNegativeWarning: -1788135873001 is a negative number. Timeout duration
 * was set to 1.` — one per fulfilled broker request. The number is
 * `-1 - Date.now()`: kafkajs's RequestQueue starts `throttledUntil` at -1 and
 * `scheduleCheckPendingRequests()` handed `throttledUntil - Date.now()` straight
 * to `setTimeout` whenever the pending queue was empty. Node ≥ 22 clamps the
 * delay to 1 ms and warns, so the timer fired immediately and did nothing.
 *
 * The patch returns early when nothing is pending and no throttle is in force.
 * These tests pin that behaviour against the *installed* module, so an upgrade
 * that drops the patch fails here rather than in a boot log nobody reads.
 */
const require = createRequire(import.meta.url);
const RequestQueue = require('kafkajs/src/network/requestQueue');

const silent = { debug() {}, info() {}, warn() {}, error() {}, namespace: () => silent };

function queue() {
  return new RequestQueue({
    maxInFlightRequests: null,
    requestTimeout: 1000,
    enforceRequestTimeout: false,
    clientId: 'spec',
    broker: 'localhost:9092',
    logger: silent,
  });
}

/** Warnings Node emits while `run` executes — `process.emitWarning` is asynchronous, so wait a tick. */
async function warningsDuring(run: () => void): Promise<Error[]> {
  const seen: Error[] = [];
  const onWarning = (w: Error) => seen.push(w);
  process.on('warning', onWarning);
  try {
    run();
    await new Promise((resolve) => setTimeout(resolve, 30));
  } finally {
    process.off('warning', onWarning);
  }
  return seen;
}

const negativeTimeoutWarnings = (warnings: Error[]) =>
  warnings.filter((w) => w.name === 'TimeoutNegativeWarning');

describe('kafkajs RequestQueue.scheduleCheckPendingRequests (patched)', () => {
  it('control: a negative setTimeout delay does emit TimeoutNegativeWarning on this Node', async () => {
    const warnings = await warningsDuring(() => {
      const t = setTimeout(() => {}, -1);
      clearTimeout(t);
    });
    expect(negativeTimeoutWarnings(warnings).length).toBeGreaterThan(0);
  });

  it('schedules nothing when the queue is idle and unthrottled', async () => {
    const q = queue();
    const warnings = await warningsDuring(() => q.scheduleCheckPendingRequests());
    expect(negativeTimeoutWarnings(warnings)).toEqual([]);
    expect(q.throttleCheckTimeoutId).toBeNull();
  });

  it('still checks pending requests on the short interval when unthrottled', async () => {
    const q = queue();
    q.pending.push({ correlationId: 1 });
    let scheduled: unknown = null;
    // A negative delay warns at the `setTimeout` call, so the timer can be
    // torn down before the 10 ms interval tries to send the fake entry.
    const warnings = await warningsDuring(() => {
      q.scheduleCheckPendingRequests();
      scheduled = q.throttleCheckTimeoutId;
      q.destroy();
    });
    expect(negativeTimeoutWarnings(warnings)).toEqual([]);
    expect(scheduled).not.toBeNull();
  });

  it('schedules the check for the end of a client-side throttle', async () => {
    const q = queue();
    q.maybeThrottle(200);
    const warnings = await warningsDuring(() => q.scheduleCheckPendingRequests());
    expect(negativeTimeoutWarnings(warnings)).toEqual([]);
    expect(q.throttleCheckTimeoutId).not.toBeNull();
    q.destroy();
  });

  it('does not double-schedule while a check is already pending', () => {
    const q = queue();
    q.maybeThrottle(200);
    q.scheduleCheckPendingRequests();
    const first = q.throttleCheckTimeoutId;
    q.scheduleCheckPendingRequests();
    expect(q.throttleCheckTimeoutId).toBe(first);
    q.destroy();
  });
});
