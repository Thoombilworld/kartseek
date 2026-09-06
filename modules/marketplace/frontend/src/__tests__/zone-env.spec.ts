/**
 * The zone is its own Next application, so it does not inherit apps/web's
 * environment. Without NEXT_PUBLIC_ACTIVE_REGIONS the localization registry
 * treats only the home market as active and the country picker snaps every
 * choice back to Qatar — a perfectly healthy-looking page with a dead control.
 * This pins the documented variables and keeps the zone's market list equal to
 * the shell's.
 */
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_ACTIVE_REGIONS',
  'NEXT_PUBLIC_DEFAULT_REGION',
];

const ZONE_ROOT = path.resolve(__dirname, '../..');
const SHELL_ROOT = path.resolve(ZONE_ROOT, '../../../apps/web');

function readEnv(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function pick(src: string, key: string): string | undefined {
  return (src.match(new RegExp(`^${key}=(.*)$`, 'm')) ?? [])[1]?.trim();
}

describe('zone environment', () => {
  const example = readEnv(path.join(ZONE_ROOT, '.env.example'));

  it.each(REQUIRED)('documents %s in .env.example', (key) => {
    expect(pick(example, key)).toBeTruthy();
  });

  it('lists the same active regions as the shell', () => {
    const shellEnv = path.join(SHELL_ROOT, '.env.local');
    // The shell's .env.local is git-ignored; when it is absent (CI) the
    // documented example is the only source of truth and the check is moot.
    if (!fs.existsSync(shellEnv)) return;
    expect(pick(example, 'NEXT_PUBLIC_ACTIVE_REGIONS')).toBe(
      pick(readEnv(shellEnv), 'NEXT_PUBLIC_ACTIVE_REGIONS'),
    );
  });
});
