import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * gRPC proto contract: every module backend that serves gRPC must be able to
 * find its proto file, at build time and at run time, and must serve the same
 * contract the gateway compiles against.
 *
 * Three things went wrong here on 2026-09-06 and none of them failed a test:
 *
 *   • `createGrpcMicroserviceOptions` loads `<cwd>/proto/<file>`, so each
 *     module keeps its own `proto/` directory beside `src/`.
 *   • nest-cli.json copies protos into `dist/proto` as build assets, but the
 *     Nest CLI joins every asset `include` onto `sourceRoot` (`src/`). The
 *     pattern `../../../apps/api/proto/**` therefore resolved to
 *     `modules/apps/api/proto/**` — nothing — and every watcher started with
 *     "No files matched the asset pattern". Taxi's `proto/**` resolved to
 *     `src/proto/**`, also nothing. No backend ever had a `dist/proto`.
 *     Pointing the include at `../proto/**` matches, but the CLI then strips
 *     as many leading path segments as the tsconfig `rootDir` has (the repo
 *     root here, so the module can compile apps/api/libs) and the copy lands
 *     at `dist/proto/modules/<m>/backend/proto/<file>`. The shape that yields
 *     a flat `dist/proto/<file>` is the CLI's own monorepo mechanism: a
 *     `projects.proto` library whose `sourceRoot` is `proto`, listed in
 *     `compilerOptions.includeLibraryAssets`, so paths are stripped relative
 *     to `proto/` itself. That is what the assertions below pin.
 *   • The gateway's gRPC clients compile `apps/api/proto/<file>`, a second
 *     copy of each module's contract. Nothing checked that the copies agree.
 *
 * This spec asserts all three, the way the CLI and the helper actually resolve
 * paths, so a moved directory or a drifted copy fails here and not in a
 * container that boots without a gRPC transport.
 */

const REPO = path.resolve(__dirname, '..', '..', '..');
const MODULES = path.join(REPO, 'modules');
const GATEWAY_PROTOS = path.join(REPO, 'apps', 'api', 'proto');

interface GrpcBackend {
  module: string;
  workspace: string;
  protoFile: string;
}

/** Module backends whose main.ts registers a gRPC transport, and the proto each names. */
function grpcBackends(): GrpcBackend[] {
  const found: GrpcBackend[] = [];
  for (const module of fs.readdirSync(MODULES)) {
    const workspace = path.join(MODULES, module, 'backend');
    const main = path.join(workspace, 'src', 'main.ts');
    if (!fs.existsSync(main)) continue;
    const call = fs
      .readFileSync(main, 'utf8')
      .match(/createGrpcMicroserviceOptions\(\s*'[^']+'\s*,\s*'([^']+\.proto)'/);
    if (call) found.push({ module, workspace, protoFile: call[1] });
  }
  return found;
}

interface NestCliConfig {
  sourceRoot?: string;
  compilerOptions?: { assets?: unknown[]; includeLibraryAssets?: string[] };
  projects?: Record<
    string,
    {
      type?: string;
      root?: string;
      sourceRoot?: string;
      compilerOptions?: {
        assets?: Array<{ include: string; outDir?: string; watchAssets?: boolean }>;
      };
    }
  >;
}

function nestCli(workspace: string): NestCliConfig {
  return JSON.parse(fs.readFileSync(path.join(workspace, 'nest-cli.json'), 'utf8'));
}

describe('gRPC proto contract', () => {
  const backends = grpcBackends();

  it('finds the gRPC-serving module backends', () => {
    // Guards the detection itself: a refactor of the helper's call shape would
    // otherwise make every assertion below pass vacuously.
    expect(backends.map((b) => b.module).sort()).toEqual([
      'grocery',
      'marketplace',
      'restaurant',
      'taxi',
    ]);
  });

  for (const b of backends) {
    describe(b.module, () => {
      it('has the proto file where the runtime loads it: <workspace>/proto/<file>', () => {
        expect(fs.existsSync(path.join(b.workspace, 'proto', b.protoFile))).toBe(true);
      });

      it('copies proto/ into dist/proto through a library asset rooted at proto/, not a src-relative include', () => {
        const cfg = nestCli(b.workspace);
        // A src-relative include can only ever miss (joined onto src/) or nest
        // (stripped against the repo-root rootDir); neither is allowed back.
        expect(cfg.compilerOptions?.assets ?? []).toHaveLength(0);
        expect(cfg.compilerOptions?.includeLibraryAssets).toContain('proto');

        const lib = cfg.projects?.proto;
        expect(lib, `${b.module}: nest-cli.json has no projects.proto library`).toBeDefined();
        expect(lib!.type).toBe('library');
        expect(path.resolve(b.workspace, lib!.sourceRoot ?? lib!.root ?? '')).toBe(
          path.join(b.workspace, 'proto'),
        );

        const assets = lib!.compilerOptions?.assets ?? [];
        expect(assets).toHaveLength(1);
        expect(assets[0].include).toBe('**/*.proto');
        expect(assets[0].outDir).toBe('./dist/proto');
        expect(assets[0].watchAssets).toBe(true);
      });

      it('serves the same contract the gateway compiles against (apps/api/proto)', () => {
        const ours = fs.readFileSync(path.join(b.workspace, 'proto', b.protoFile), 'utf8');
        const gateway = fs.readFileSync(path.join(GATEWAY_PROTOS, b.protoFile), 'utf8');
        expect(ours.replace(/\r\n/g, '\n')).toBe(gateway.replace(/\r\n/g, '\n'));
      });
    });
  }
});
