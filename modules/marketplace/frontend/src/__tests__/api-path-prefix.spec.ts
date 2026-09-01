/**
 * Every gateway path this zone requests must carry its module prefix.
 *
 * `apiFetch` prepends a base URL that already ends in `/api/v1`, so a call
 * written as `/flash-deals` resolves to `/api/v1/flash-deals` — a route the
 * gateway does not declare. That is not a hypothetical: the offers page called
 * `get('/flash-deals')` and `get('/deals-of-the-day')`, both 404'd, both
 * resolved to null, and the page rendered "We couldn't load this list" on every
 * visit in every region. It could never have worked, and nothing failed loudly
 * enough to say so.
 *
 * The check is on the source rather than at runtime because the failure is a
 * missing string, not a broken branch — no amount of exercising the page finds
 * it if the fallback swallows the 404.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Gateway path segments that legitimately sit outside the module prefix. */
const SHARED_PREFIXES = [
  '/auth', '/users', '/regions', '/upload', '/uploads', '/notifications',
  '/wallet', '/loyalty', '/search', '/orders', '/cart', '/payments',
  '/partners', '/delivery', '/health', '/gift-cards', '/support',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '__tests__'].includes(entry.name)) walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Literal paths handed to `apiFetch(...)`, or to a local helper that wraps it.
 * Template literals with a leading variable are skipped — the prefix cannot be
 * read from the source in that case.
 */
function apiPaths(source: string): string[] {
  const found: string[] = [];
  const patterns = [
    /apiFetch\(\s*[`'"](\/[a-zA-Z0-9\-_/]*)/g,
    /\bget\(\s*[`'"](\/[a-zA-Z0-9\-_/]*)/g,
    /\bpost\(\s*[`'"](\/[a-zA-Z0-9\-_/]*)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) found.push(m[1]);
  }
  return found;
}

describe('gateway paths carry the /marketplace prefix', () => {
  const files = walk(SRC);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no API call omits the module prefix', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const p of apiPaths(source)) {
        if (p.startsWith('/marketplace')) continue;
        if (SHARED_PREFIXES.some((s) => p === s || p.startsWith(s + '/'))) continue;
        offenders.push(`${path.relative(SRC, file).replace(/\\/g, '/')} → ${p}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
