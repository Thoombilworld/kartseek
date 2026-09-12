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

  it('names the runner that should have been used instead', () => {
    // The message has to end somewhere useful. A deployer who hits this has a
    // service that will not boot and no obvious next move; the command that
    // builds the schema properly is the next move.
    expect(() => assertSynchronizeAllowed(true, 'production', 'taxi-service')).toThrow(
      'npm run migration:run -w @kartseek/taxi-backend',
    );
  });
});
