/**
 * Nest's dependency injection depends on the runner emitting decorator
 * metadata, so this asserts it directly.
 *
 * Every provider Nest constructs by class — rather than by an explicit token —
 * is resolved from `design:paramtypes`, which the TypeScript decorator
 * transform emits and which esbuild, Vite's usual TS transform, does not
 * implement. Vitest 4 does emit it; this test exists so that if a future Vite
 * or Vitest upgrade stops, the failure says so in one line instead of
 * appearing as "Nest can't resolve dependencies" across forty unrelated
 * suites.
 */
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';

class Dependency {}

@Injectable()
class Consumer {
  constructor(readonly dep: Dependency) {}
}

describe('decorator metadata', () => {
  it('emits design:paramtypes for an @Injectable constructor', () => {
    const types = Reflect.getMetadata('design:paramtypes', Consumer);
    expect(types).toBeDefined();
    expect(types).toHaveLength(1);
    expect(types[0]).toBe(Dependency);
  });
});
