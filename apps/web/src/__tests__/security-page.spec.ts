/**
 * `/admin/security` shows what the DDoS monitor measured, or says why it cannot.
 *
 * The page was 839 lines of fixtures — a threat level, eight banned IPs with
 * countries, twelve WAF rules, nineteen geo-block verdicts, eight incidents, and
 * a 10-second interval that added `Math.random()` to the counters. These
 * assertions pin both halves of the replacement: the values the API returned are
 * on screen, and the strings that only ever existed in that file are not.
 *
 * Rendered with `react-dom/server`, like `audit-logs-render.spec.ts`: this
 * workspace's Jest runs `testEnvironment: 'node'` and has neither
 * `@testing-library/react` nor `jest-environment-jsdom` installed.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getSecurityStatus = jest.fn();
const getSecurityTrend = jest.fn();
const getOffenders = jest.fn();
const getBans = jest.fn();
const getWhitelist = jest.fn();
const getEndpointStats = jest.fn();

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getSecurityStatus: (...a: unknown[]) => getSecurityStatus(...a),
    getSecurityTrend: (...a: unknown[]) => getSecurityTrend(...a),
    getOffenders: (...a: unknown[]) => getOffenders(...a),
    getBans: (...a: unknown[]) => getBans(...a),
    getWhitelist: (...a: unknown[]) => getWhitelist(...a),
    getEndpointStats: (...a: unknown[]) => getEndpointStats(...a),
    banIp: jest.fn(),
    unbanIp: jest.fn(),
    addWhitelist: jest.fn(),
    removeWhitelist: jest.fn(),
    resetAttackMode: jest.fn(),
  },
}));

/** Stands in for `useAdminData` the way `audit-logs-render.spec.ts` does. */
let hookResult: { data: unknown; loading: boolean; error: string | null };

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    void Promise.resolve(fetcher()).catch(() => undefined);
    return { ...hookResult, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => React.createElement('div', null, 'loading-skeleton'),
  AdminErrorBanner: ({ error }: { error: string }) => React.createElement('div', null, error),
}));

const SecurityPage = require('../app/admin/security/page');
const {
  default: Page,
  loadSecurityBoard,
  formatSeconds,
  parseEndpointKey,
  topEndpoints,
} = SecurityPage;

const ok = <T>(data: T) => ({ success: true, data });
const fail = (error: string) => ({ success: false, data: null, error });

const BOARD = {
  status: {
    level: 'elevated' as const,
    httpBansToday: 7,
    wsBansToday: 2,
    activeBans: 3,
    isHttpAttackMode: true,
    isWsAttackMode: false,
    timestamp: '2026-09-11T19:38:19.311Z',
  },
  trend: [
    { date: '2026-09-10', httpBans: 4, wsBans: 1 },
    { date: '2026-09-11', httpBans: 7, wsBans: 2 },
  ],
  offenders: [{ ip: '198.51.100.9', strikes: 4 }],
  bans: [
    {
      ip: '203.0.113.77',
      type: 'http' as const,
      details: { reason: 'burst_flood', strikes: 6, bannedAt: '2026-09-11T18:00:00.000Z' },
      remainingSeconds: 900,
    },
  ],
  whitelist: ['198.18.0.7'],
  endpoints: {
    'GET:/api/v1/products:2026-09-11T18': 1200,
    'POST:/api/v1/auth/login:2026-09-11T18': 40,
  },
};

/** Strings that only ever existed in the deleted fixture arrays. */
const FIXTURE_STRINGS = [
  '185.220.101.45', // MOCK_BANS
  '62.210.102.33', // MOCK_OFFENDERS
  'SQL Injection Protection', // MOCK_WAF_RULES
  'Malicious Bot Detection',
  'North Korea', // MOCK_GEO_BLOCKS
  'Credential Stuffing', // MOCK_INCIDENTS
  'DNS Amplification',
  '172.16.0.0/16', // MOCK_WHITELIST
  '2.8M', // MOCK_STATUS.totalRequests24h through formatNum
  'Under Attack', // the protection-mode switch that set state locally
];

const render = () => renderToStaticMarkup(React.createElement(Page));

beforeEach(() => {
  jest.clearAllMocks();
  getSecurityStatus.mockResolvedValue(ok(BOARD.status));
  getSecurityTrend.mockResolvedValue(ok(BOARD.trend));
  getOffenders.mockResolvedValue(ok(BOARD.offenders));
  getBans.mockResolvedValue(ok(BOARD.bans));
  getWhitelist.mockResolvedValue(ok(BOARD.whitelist));
  getEndpointStats.mockResolvedValue(ok(BOARD.endpoints));
  hookResult = { data: { ok: true, board: BOARD }, loading: false, error: null };
});

describe('/admin/security renders the API', () => {
  it('asks every security route', async () => {
    render();
    await Promise.resolve();
    expect(getSecurityStatus).toHaveBeenCalled();
    expect(getSecurityTrend).toHaveBeenCalled();
    expect(getOffenders).toHaveBeenCalled();
    expect(getBans).toHaveBeenCalled();
    expect(getWhitelist).toHaveBeenCalled();
    expect(getEndpointStats).toHaveBeenCalled();
  });

  it('renders the values the API returned', () => {
    const html = render();
    expect(html).toContain('ELEVATED');
    expect(html).toContain('203.0.113.77'); // the banned address
    expect(html).toContain('198.51.100.9'); // the offender
    expect(html).toContain('198.18.0.7'); // the whitelist entry
    expect(html).toContain('burst_flood');
    expect(html).toContain('GET /api/v1/products'); // busiest endpoint
    expect(html).toContain('9 bans today'); // 7 http + 2 ws, from status
    expect(html).toContain('3 active');
    expect(html).toContain('HTTP attack mode');
    expect(html).toContain('Clear attack mode'); // only offered while one is on
  });

  it.each(FIXTURE_STRINGS)('no longer renders the fixture string %s', (needle) => {
    expect(render()).not.toContain(needle);
  });

  it('says what has no API behind it instead of drawing it empty', () => {
    const html = render();
    expect(html).toContain('Not measured by the platform yet');
    expect(html).toContain('WAF rules');
    expect(html).toContain('Geo-blocking');
    expect(html).toContain('Incident history');
  });

  it('offers no attack-mode control when neither mode is on', () => {
    hookResult = {
      data: {
        ok: true,
        board: {
          ...BOARD,
          status: { ...BOARD.status, level: 'normal', isHttpAttackMode: false },
        },
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('NORMAL');
    expect(html).not.toContain('Clear attack mode');
  });

  it('says a list is empty only when the API returned nothing for it', () => {
    hookResult = {
      data: {
        ok: true,
        board: { ...BOARD, bans: [], offenders: [], whitelist: [], endpoints: {} },
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('No address is banned.');
    expect(html).toContain('No IP currently holds a strike.');
    expect(html).toContain('Nothing is whitelisted.');
  });
});

describe('/admin/security trend chart', () => {
  /**
   * One scale for both series. The deleted version divided HTTP by
   * `trendMax * 60px` and WebSocket by `trendMax * 20px`, so two equal counts
   * drew bars a third apart — harmless while the numbers were invented.
   */
  it('draws equal HTTP and WebSocket counts at the same height', () => {
    hookResult = {
      data: {
        ok: true,
        board: {
          ...BOARD,
          trend: [{ date: '2026-09-11', httpBans: 5, wsBans: 5 }],
        },
      },
      loading: false,
      error: null,
    };
    // `--bar-h` is applied through a ref, which `renderToStaticMarkup` does not
    // run, so the scale is asserted on the source of the two expressions
    // instead: they must divide by the same denominator and multiply by the
    // same factor.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../app/admin/security/page.tsx'),
      'utf8',
    ) as string;
    const factors = [...source.matchAll(/\/ trendMax\) \* (\d+)\}px/g)].map((m) => m[1]);
    expect(factors).toHaveLength(2);
    expect(new Set(factors).size).toBe(1);
    // Stacked in an 80px column, so the shared factor must leave them room.
    expect(Number(factors[0])).toBeLessThanOrEqual(80);
    render();
  });
});

describe('/admin/security mutation errors', () => {
  it('keeps a refusal on screen instead of only flashing a toast', () => {
    // A validation rejection has to survive long enough to read, work out which
    // field it names, and correct — the form deliberately keeps its contents so
    // the admin can. `AdminToast` self-dismisses after four seconds.
    const html = render();
    expect(html).not.toContain('The security API refused that request.');
    // The line is state-driven, so its copy is asserted from the source; what
    // matters here is that the page has somewhere persistent to put it.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../app/admin/security/page.tsx'),
      'utf8',
    ) as string;
    expect(source).toContain('setLastError');
    expect(source).toContain('The security API refused that request.');
    expect(source).toContain('role="alert"');
  });
});

describe('/admin/security failure states', () => {
  it('shows a forbidden panel naming the permission when the server refused', () => {
    hookResult = {
      data: {
        ok: false,
        kind: 'forbidden',
        message: 'Missing required permissions: security.manage',
        route: 'GET /admin/security/status',
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('You cannot open the threat board.');
    expect(html).toContain('security.manage');
    expect(html).not.toContain('is not connected.');
    expect(html).not.toContain('ELEVATED');
  });

  it('shows a not-connected panel naming the route when nobody answered', () => {
    hookResult = {
      data: {
        ok: false,
        kind: 'unreachable',
        message: 'Network error — API Gateway unreachable',
        route: 'GET /admin/security/bans',
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('The threat board is not connected.');
    expect(html).toContain('GET /admin/security/bans');
    expect(html).toContain('Network error — API Gateway unreachable');
    expect(html).not.toContain('NORMAL');
  });

  it('still fails visibly if the hook surfaces a thrown error instead', () => {
    hookResult = { data: null, loading: false, error: 'Security service unavailable' };
    const html = render();
    expect(html).toContain('The threat board is not connected.');
  });

  it('shows the skeleton while it is still asking, not a threat level', () => {
    hookResult = { data: null, loading: true, error: null };
    const html = render();
    expect(html).toContain('loading-skeleton');
    expect(html).not.toContain('NORMAL');
  });
});

describe('loadSecurityBoard', () => {
  it('carries the first failing route so the panel can name it', async () => {
    getBans.mockResolvedValue(fail('Missing required permissions: security.manage'));
    const res = await loadSecurityBoard();
    expect(res).toMatchObject({
      ok: false,
      kind: 'forbidden',
      route: 'GET /admin/security/bans',
    });
  });

  it('classifies an outage as unreachable, not as a refusal', async () => {
    getSecurityStatus.mockResolvedValue(fail('Network error — API Gateway unreachable'));
    const res = await loadSecurityBoard();
    expect(res).toMatchObject({ ok: false, kind: 'unreachable' });
  });

  it('returns the board when every call succeeded', async () => {
    const res = await loadSecurityBoard();
    expect(res.ok).toBe(true);
    expect(res.board.status.activeBans).toBe(3);
  });
});

describe('security helpers', () => {
  it('formats a TTL, and says so when there is no expiry', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(900)).toBe('15m 0s');
    expect(formatSeconds(3660)).toBe('1h 1m');
    expect(formatSeconds(90000)).toBe('1d 1h');
    // Redis answers -1 for a key with no expiry; "-1s" would be nonsense.
    expect(formatSeconds(-1)).toBe('no expiry');
  });

  it('splits an endpoint key on its outer colons, not on every one', () => {
    expect(parseEndpointKey('GET:/api/v1/products:2026-09-11T18')).toEqual({
      method: 'GET',
      path: '/api/v1/products',
      hour: '2026-09-11T18',
    });
  });

  it('sums an endpoint across its hourly buckets', () => {
    const top = topEndpoints({
      'GET:/a:2026-09-11T17': 10,
      'GET:/a:2026-09-11T18': 5,
      'POST:/b:2026-09-11T18': 12,
    });
    expect(top[0]).toEqual({ label: 'GET /a', count: 15 });
    expect(top[1]).toEqual({ label: 'POST /b', count: 12 });
  });
});
