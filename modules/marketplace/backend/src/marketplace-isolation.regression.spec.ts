import * as fs from 'fs';
import * as path from 'path';

/**
 * Marketplace Isolation Regression Tests
 *
 * These tests guard the module boundary statically — they do not need a running
 * database or NestJS application context.  They verify:
 *
 *   1. No source file inside marketplace-service imports from another service.
 *   2. The ENTITIES array in marketplace.module.ts matches the entity files on disk.
 *   3. The TypeORM config reads MARKETPLACE_DB_* env vars for dedicated DB support.
 */

const MARKETPLACE_SRC = path.resolve(__dirname);
const SERVICES_ROOT = path.resolve(__dirname, '../../');

/** Recursively collect all .ts files (excluding .spec.ts, .d.ts). */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...collectTsFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

/** Collect all *.entity.ts files from the entities directory. */
function collectEntityFiles(): string[] {
  const entitiesDir = path.join(MARKETPLACE_SRC, 'entities');
  if (!fs.existsSync(entitiesDir)) return [];
  return fs.readdirSync(entitiesDir).filter((f) => f.endsWith('.entity.ts'));
}

describe('Marketplace Module Isolation (Regression)', () => {

  // ── Test 1: No cross-service imports ────────────────────────────────────────
  describe('Cross-service import boundary', () => {
    const tsFiles = collectTsFiles(MARKETPLACE_SRC);

    // Build a list of sibling service directory names to detect cross-imports
    const siblingServices = fs
      .readdirSync(SERVICES_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'marketplace-service')
      .map((d) => d.name);

    it('marketplace-service source should have .ts files to scan', () => {
      expect(tsFiles.length).toBeGreaterThan(0);
    });

    it('should NOT import from any sibling service source directory', () => {
      const violations: { file: string; line: number; text: string }[] = [];

      for (const file of tsFiles) {
        const lines = fs.readFileSync(file, 'utf-8').split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Only check import/require statements
          if (!line.match(/^\s*(import|require)/)) continue;
          for (const svc of siblingServices) {
            // Detect patterns like '../../../auth-service/src/' or 'apps/auth-service'
            if (line.includes(`/${svc}/`) || line.includes(`'${svc}'`)) {
              violations.push({
                file: path.relative(MARKETPLACE_SRC, file),
                line: i + 1,
                text: line.trim(),
              });
            }
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
          .join('\n');
        throw new Error(
          `Cross-service import violations detected!\n` +
            `Marketplace must not import from sibling services:\n${report}`,
        );
      }

      expect(violations).toHaveLength(0);
    });
  });

  // ── Test 2: Entity completeness ─────────────────────────────────────────────
  describe('Entity completeness', () => {
    it('every .entity.ts file should be referenced in marketplace.module.ts', () => {
      const entityFiles = collectEntityFiles();
      expect(entityFiles.length).toBeGreaterThan(0);

      const moduleSource = fs.readFileSync(
        path.join(MARKETPLACE_SRC, 'marketplace.module.ts'),
        'utf-8',
      );

      const unregistered = entityFiles.filter((f) => {
        // Extract the import path stem: 'product.entity.ts' → './entities/product.entity'
        const importPath = `./entities/${f.replace('.ts', '')}`;
        return !moduleSource.includes(importPath);
      });

      if (unregistered.length > 0) {
        throw new Error(
          `Entity files not imported in marketplace.module.ts: ${unregistered.join(', ')}\n` +
            `Every entity must be explicitly imported and added to the ENTITIES array.`,
        );
      }

      expect(unregistered).toHaveLength(0);
    });
  });

  // ── Test 3: Dedicated DB config ─────────────────────────────────────────────
  describe('Dedicated database configuration', () => {
    let moduleSource: string;

    beforeAll(() => {
      moduleSource = fs.readFileSync(
        path.join(MARKETPLACE_SRC, 'marketplace.module.ts'),
        'utf-8',
      );
    });

    it('should read MARKETPLACE_DB_HOST env var', () => {
      expect(moduleSource).toContain("'MARKETPLACE_DB_HOST'");
    });

    it('should read MARKETPLACE_DB_PORT env var', () => {
      expect(moduleSource).toContain("'MARKETPLACE_DB_PORT'");
    });

    it('should read MARKETPLACE_DB_NAME env var', () => {
      expect(moduleSource).toContain("'MARKETPLACE_DB_NAME'");
    });

    it('should read MARKETPLACE_DB_USER env var', () => {
      expect(moduleSource).toContain("'MARKETPLACE_DB_USER'");
    });

    it('should read MARKETPLACE_DB_PASSWORD env var', () => {
      expect(moduleSource).toContain("'MARKETPLACE_DB_PASSWORD'");
    });

    it('should always enforce schema: marketplace', () => {
      expect(moduleSource).toContain("schema: 'marketplace'");
    });

    it('should fall back to DB_HOST when MARKETPLACE_DB_HOST is not set', () => {
      // The pattern should be: cfg.get('MARKETPLACE_DB_HOST') || cfg.get('DB_HOST', ...)
      expect(moduleSource).toMatch(/MARKETPLACE_DB_HOST.*\|\|.*DB_HOST/);
    });
  });
});
