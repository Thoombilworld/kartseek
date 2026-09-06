/**
 * Every zone is its own Next application and inherits nothing from this
 * shell's environment. Without NEXT_PUBLIC_ACTIVE_REGIONS the localization
 * registry treats only the home market as active: RegionProvider ignores the
 * market the shell resolved from the cookie, and the zone describes Qatar —
 * its currency, delivery copy and consent notice — to a shopper in India. The
 * marketplace zone had this pinned; the other seven did not and all snapped
 * back to Qatar under an India cookie. This keeps every zone's documented
 * example in step with the shell.
 */
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_ACTIVE_REGIONS',
  'NEXT_PUBLIC_DEFAULT_REGION',
];

const SHELL_ROOT = path.resolve(__dirname, '../..');
const MODULES = path.resolve(SHELL_ROOT, '../../modules');

const ZONES = fs
  .readdirSync(MODULES)
  .filter((name) => fs.existsSync(path.join(MODULES, name, 'frontend', 'next.config.mjs')));

function pick(src: string, key: string): string | undefined {
  return (src.match(new RegExp(`^${key}=(.*)$`, 'm')) ?? [])[1]?.trim();
}

describe('zone environments', () => {
  it('finds the zones', () => {
    expect(ZONES).toEqual(expect.arrayContaining(['marketplace', 'grocery', 'taxi']));
  });

  describe.each(ZONES)('%s zone', (zone) => {
    const dir = path.join(MODULES, zone, 'frontend');
    const example = fs.readFileSync(path.join(dir, '.env.example'), 'utf8');

    it.each(REQUIRED)('documents %s in .env.example', (key) => {
      expect(pick(example, key)).toBeTruthy();
    });

    it('lists the same active regions as the shell', () => {
      const shellEnv = path.join(SHELL_ROOT, '.env.local');
      // Git-ignored; when absent (CI) the example is the only source of truth.
      if (!fs.existsSync(shellEnv)) return;
      expect(pick(example, 'NEXT_PUBLIC_ACTIVE_REGIONS')).toBe(
        pick(fs.readFileSync(shellEnv, 'utf8'), 'NEXT_PUBLIC_ACTIVE_REGIONS'),
      );
    });

    it('warns at config load when the variable is missing', () => {
      const config = fs.readFileSync(path.join(dir, 'next.config.mjs'), 'utf8');
      expect(config).toContain('NEXT_PUBLIC_ACTIVE_REGIONS is not set');
    });
  });
});
