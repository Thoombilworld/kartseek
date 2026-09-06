const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('yaml');

function findRepoRoot(from) {
  let dir = from;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'services.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`services.yaml not found above ${from}`);
    dir = parent;
  }
}

/**
 * Asserts that a Next workspace agrees with its own entry in services.yaml.
 *
 * Every zone and the shell call this from src/__tests__/registry-entry.spec.ts
 * with their workspace directory. It is the frontend counterpart of the
 * registry validator's main.ts checks for the backends: the registry is the
 * only source of ports and basePaths, and this is where a zone that drifted
 * (a port changed in package.json, a basePath changed in next.config.mjs)
 * fails a unit run instead of a deploy.
 *
 * next.config.mjs is read as text, not imported: it is ESM wrapped by the
 * next-intl plugin, which Jest's CommonJS runtime cannot load without VM
 * modules. A literal `basePath: '<value>',` line is the convention every zone
 * follows (docs/architecture/frontend-zones.md).
 *
 * @param {string} workspaceDir  absolute path of the workspace (apps/web or modules/<vertical>/frontend)
 */
function expectRegistryEntry(workspaceDir) {
  const root = findRepoRoot(workspaceDir);
  const registry = parse(fs.readFileSync(path.join(root, 'services.yaml'), 'utf8'));
  const relPath = path.relative(root, workspaceDir).split(path.sep).join('/');
  const entry = registry.services.find((service) => service.path === relPath);
  const pkg = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf8'));
  const nextConfig = fs.readFileSync(path.join(workspaceDir, 'next.config.mjs'), 'utf8');

  describe(`${relPath} agrees with services.yaml`, () => {
    it('is registered as a web-shell or a web-zone', () => {
      expect(entry).toBeDefined();
      expect(['web-shell', 'web-zone']).toContain(entry.kind);
    });

    it('binds the registered HTTP port in dev and start', () => {
      const flag = new RegExp(`(^| )-p ${entry.ports.http}( |$)`);
      expect(pkg.scripts.dev).toMatch(flag);
      expect(pkg.scripts.start).toMatch(flag);
    });

    it('declares the registered basePath', () => {
      const declared = /^\s*basePath:\s*'([^']*)'/m.exec(nextConfig);
      if (entry.kind === 'web-zone') {
        expect(declared && declared[1]).toBe(entry.basePath);
      } else {
        expect(declared).toBeNull();
      }
    });
  });
}

module.exports = { expectRegistryEntry };
