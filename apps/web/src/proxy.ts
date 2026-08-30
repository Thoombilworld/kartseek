import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_COUNTRY, isActiveCountry, getCountry, normaliseLanguage,
} from '@/lib/localization';

// ─── Country Subdomain Map (SEO Multi-Country) ─────────────────────────────
const SUBDOMAIN_COUNTRY: Record<string, string> = {
  'qa': 'QA', 'in': 'IN', 'ae': 'AE', 'sa': 'SA',
  'bh': 'BH', 'kw': 'KW', 'om': 'OM', 'sg': 'SG',
  'uk': 'GB', 'gb': 'GB', 'us': 'US',
};

/** Headers CDNs use to report the country they resolved the client IP to. */
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-geo-country',
  'x-appengine-country',
] as const;

/**
 * Seller Type → protected route prefixes mapping.
 * Used to prevent cross-module access at the edge.
 */
const SELLER_MODULE_ROUTES: Record<string, string[]> = {
  marketplace: ['/seller/marketplace'],
  // NOTE: never list a route group like `(portal)` here. Route groups exist only
  // in the source tree and are stripped from the URL, so `/seller/grocery/(portal)`
  // matches nothing — grocery and taxi were absent from cross-module blocking
  // entirely because that was the only prefix they had.
  grocery:     ['/seller/grocery/analytics', '/seller/grocery/brands', '/seller/grocery/commissions',
                '/seller/grocery/compliance', '/seller/grocery/coupons', '/seller/grocery/dashboard',
                '/seller/grocery/delivery', '/seller/grocery/flash-deals', '/seller/grocery/inventory',
                '/seller/grocery/orders', '/seller/grocery/payouts', '/seller/grocery/products',
                '/seller/grocery/promotions', '/seller/grocery/reports', '/seller/grocery/returns',
                '/seller/grocery/settings', '/seller/grocery/staff', '/seller/grocery/tax'],
  restaurant:  ['/seller/restaurant/(portal)', '/seller/restaurant/portal', '/seller/restaurant/dashboard', '/seller/restaurant/menu', '/seller/restaurant/orders', '/seller/restaurant/kitchen', '/seller/restaurant/reservations', '/seller/restaurant/delivery', '/seller/restaurant/reports', '/seller/restaurant/settings', '/seller/restaurant/wallet', '/seller/restaurant/offers', '/seller/restaurant/tables', '/seller/restaurant/inventory', '/seller/restaurant/compliance', '/seller/restaurant/profile', '/seller/restaurant/service-settings', '/seller/restaurant/menu-categories', '/seller/restaurant/menu-items', '/seller/restaurant/takeaway'],
  pharmacy:    ['/seller/pharmacy/dashboard', '/seller/pharmacy/products', '/seller/pharmacy/orders', '/seller/pharmacy/prescriptions', '/seller/pharmacy/offers', '/seller/pharmacy/wallet', '/seller/pharmacy/settings', '/seller/pharmacy/reports', '/seller/pharmacy/profile'],
  doctor:      ['/seller/doctor/dashboard', '/seller/doctor/appointments', '/seller/doctor/patients', '/seller/doctor/profile', '/seller/doctor/schedule', '/seller/doctor/earnings'],
  hotel:       ['/hotel-owner/bookings', '/hotel-owner/rooms', '/hotel-owner/properties', '/hotel-owner/guests', '/hotel-owner/housekeeping', '/hotel-owner/pricing', '/hotel-owner/finance', '/hotel-owner/analytics', '/hotel-owner/staff', '/hotel-owner/reviews', '/hotel-owner/loyalty', '/hotel-owner/documents', '/hotel-owner/settings', '/hotel-owner/support'],
  taxi:        ['/seller/taxi/complaints', '/seller/taxi/documents', '/seller/taxi/drivers',
                '/seller/taxi/earnings', '/seller/taxi/fleet', '/seller/taxi/intercity',
                '/seller/taxi/notifications', '/seller/taxi/rentals', '/seller/taxi/trips'],
  delivery:    ['/seller/delivery'],
};

/** All seller portal dashboard roots (for cross-module redirect logic) */
const SELLER_DASHBOARDS: Record<string, string> = {
  marketplace: '/seller/marketplace',
  grocery:     '/seller/grocery/dashboard',
  restaurant:  '/seller/restaurant/dashboard',
  pharmacy:    '/seller/pharmacy/dashboard',
  doctor:      '/seller/doctor/dashboard',
  hotel:       '/hotel-owner',
  taxi:        '/seller/taxi',
  delivery:    '/seller/delivery',
};

// Customer-facing areas that require a signed-in shopper. Split out from the
// portal prefixes below because the two send people to different login pages:
// everything that was not /admin, /vendor or /hotel-owner used to fall through
// to the SELLER login, so a signed-out customer opening their own profile,
// orders or wallet landed on the seller sign-in page.
const CUSTOMER_PROTECTED_PREFIXES = [
  '/profile', '/account', '/orders', '/wallet', '/loyalty',
  '/rewards', '/cart/checkout',
  // Each module's own profile section. Listed individually rather than by
  // module prefix, because `/marketplace`, `/pharmacy` and the rest are public
  // storefronts — only the profile subtree under them is the customer's.
  '/marketplace/profile', '/grocery/profile', '/restaurant/profile',
  '/pharmacy/profile', '/doctor/my-profile', '/hotel-booking/profile',
  '/taxi/profile',
  // …and each module's own history, which names the customer and their address.
  '/marketplace/orders', '/grocery/orders', '/restaurant/orders',
  '/pharmacy/orders', '/doctor/my-appointments', '/hotel-booking/my-bookings',
  '/taxi/rides', '/hotel-bookings', '/saved-hotels', '/recent-hotels',
];

// Routes that require authentication
const PROTECTED_PREFIXES = [
  ...CUSTOMER_PROTECTED_PREFIXES,
  '/admin', '/seller', '/vendor', '/hotel-owner', '/franchise',
];

// Portal auth pages that MUST be publicly accessible
const PORTAL_PUBLIC_ROUTES = [
  '/admin/login',
  '/seller/login',
  '/seller/register',
  '/seller/otp',
  '/seller/approval-status',
  '/seller/grocery/onboarding',
  '/seller/grocery/login',
  '/seller/grocery/landing',
  // Sign-up has to be reachable by someone who is not signed in — this one was
  // missing, so the marketplace seller onboarding redirected to /seller/login and
  // no marketplace seller could register at all.
  '/seller/marketplace/onboarding',
  '/seller/pharmacy/login',
  '/seller/pharmacy/register',
  '/seller/doctor/register',
  '/seller/doctor/login',
  '/seller/restaurant/login',
  '/seller/restaurant/landing',
  '/seller/restaurant/onboarding',
  '/hotel-owner/login',
  '/seller/taxi/login',
  '/seller/taxi/register',
  '/seller/taxi/otp',
  '/seller/taxi/approval-status',
  '/seller/taxi/landing',
  '/franchise/opportunity',
];

// Routes that should redirect TO login if already authenticated
const AUTH_ONLY_ROUTES = ['/login', '/register', '/forgot-password'];

// Public routes that bypass all checks
const PUBLIC_PREFIXES = ['/api', '/_next', '/static', '/favicon.ico', '/health'];

/**
 * KARTSEEK Next.js Security + RBAC Proxy
 *
 *  1. CSRF token issuance
 *  2. Authentication enforcement (token cookie check)
 *  3. Seller module isolation (seller type cookie check)
 *  4. Admin role protection
 *  5. Country / locale detection + header forwarding
 *  6. Security headers
 */
export function proxy(request: NextRequest) {
  let { pathname } = request.nextUrl;

  // ── Skip public/static routes ─────────────────────────────────────────────
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Skip RSC payload requests & Next.js internal fetches ─────────────────
  const isRscRequest =
    request.headers.has('Next-Router-State-Tree') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-Prefetch') ||
    request.nextUrl.searchParams.has('_rsc');
  if (isRscRequest) {
    return NextResponse.next();
  }

  // URL Path Region Extraction (e.g. /in/admin -> /admin)
  const pathRegionMatch = pathname.match(/^\/([a-z]{2})\/(admin|seller|hotel-owner)(.*)/i);
  let pathCountry = '';
  if (pathRegionMatch) {
    pathCountry = pathRegionMatch[1].toUpperCase();
    const portal = pathRegionMatch[2];
    const rest = pathRegionMatch[3] || '';
    pathname = `/${portal}${rest}`;
    request.nextUrl.pathname = pathname;
  }

  const token      = request.cookies.get('kartseek_token')?.value;
  const sellerType = request.cookies.get('kartseek_seller_type')?.value;
  const country    = request.cookies.get('kartseek_country')?.value;

  // ── Resolve region & language before building the response ───────────────
  // Both have to be decided up front because they are forwarded as *request*
  // headers: the root layout reads them via `headers()` during the render that
  // this same response triggers. Setting them on the response instead — as this
  // did — meant `headers().get('X-Country-Code')` was always null server-side,
  // so the first paint fell back to the default region no matter where the
  // visitor actually was.
  const locale = resolveLocale(request, pathCountry, country);

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('X-Country-Code', locale.country);
  forwardedHeaders.set('X-Region-Code', locale.country);
  forwardedHeaders.set('X-Detected-Language', locale.language);
  forwardedHeaders.set('X-Detected-Country', locale.geoCountry);
  forwardedHeaders.set('X-Region-Source', locale.source);

  const response = pathRegionMatch
    ? NextResponse.rewrite(request.nextUrl, { request: { headers: forwardedHeaders } })
    : NextResponse.next({ request: { headers: forwardedHeaders } });

  // ── 1. CSRF Token Issuance ───────────────────────────────────────────────
  if (request.method === 'GET') {
    const existingCsrf = request.cookies.get('kartseek_csrf')?.value;
    if (!existingCsrf) {
      const csrfToken = generateCsrfToken();
      response.cookies.set('kartseek_csrf', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400,
      });
    }
  }

  // ── 2. Protected Route Auth Enforcement ──────────────────────────────────
  const isPortalPublic = PORTAL_PUBLIC_ROUTES.some(p => pathname.startsWith(p));
  const isProtected    = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));

  if (isProtected && !isPortalPublic && !token) {
    const isAdmin    = pathname.startsWith('/admin');
    const isVendor   = pathname.startsWith('/vendor');
    const isHotel    = pathname.startsWith('/hotel-owner');
    const isCustomer = CUSTOMER_PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
    const loginPath  = isAdmin    ? '/admin/login'
      : isVendor   ? '/seller/taxi/login'
      : isHotel    ? '/hotel-owner/login'
      : isCustomer ? '/auth/login'
      : '/seller/login';
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Seller Module Isolation ───────────────────────────────────────────
  if (token && sellerType && sellerType in SELLER_MODULE_ROUTES) {
    const allowedPrefixes  = SELLER_MODULE_ROUTES[sellerType] ?? [];
    const ownDashboard     = SELLER_DASHBOARDS[sellerType] ?? '/seller/login';

    const otherModulePrefixes = Object.entries(SELLER_MODULE_ROUTES)
      .filter(([type]) => type !== sellerType)
      .flatMap(([, prefixes]) => prefixes);

    const isTryingOtherModule = otherModulePrefixes.some(p => pathname.startsWith(p));

    if (isTryingOtherModule) {
      const blockedUrl = new URL(ownDashboard, request.url);
      blockedUrl.searchParams.set('blocked', '1');
      return NextResponse.redirect(blockedUrl);
    }

    response.headers.set('X-Seller-Type', sellerType);
  }

  // ── 4. Redirect auth users away from login/register pages ────────────────
  const isAuthRoute = AUTH_ONLY_ROUTES.some(r => pathname === r);
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 5. Admin Role Protection ─────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const userRole = request.cookies.get('kartseek_user_role')?.value;
    // Fail closed. The guard used to be `userRole && userRole !== 'SUPER_ADMIN'`,
    // which only rejected a role it could *see*: a signed-in customer whose
    // `kartseek_user_role` cookie was missing — never set, expired ahead of the
    // token, or simply deleted — skipped the check entirely and reached every
    // `/admin` page. Absence of a role is now treated as "not an admin".
    if (userRole !== 'SUPER_ADMIN') {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  // ── 6. Persist the resolved region & language ────────────────────────────
  // Written back so the next request skips detection and so client code can
  // read the active region without waiting for a provider to mount.
  if (country !== locale.country) {
    response.cookies.set('kartseek_country', locale.country, {
      path: '/', maxAge: 31536000, sameSite: 'lax',
    });
  }
  if (request.cookies.get('kartseek_language')?.value !== locale.language) {
    response.cookies.set('kartseek_language', locale.language, {
      path: '/', maxAge: 31536000, sameSite: 'lax',
    });
  }

  // Mirrored onto the response for CDN/debug visibility. The copies that
  // matter to rendering are the request headers set above.
  response.headers.set('X-Country-Code', locale.country);
  response.headers.set('X-Detected-Country', locale.geoCountry);
  response.headers.set('X-Detected-Language', locale.language);
  response.headers.set('X-Region-Source', locale.source);
  // Region changes what the page contains, so shared caches must not serve one
  // region's HTML to another's visitor.
  response.headers.append('Vary', 'X-Country-Code, Accept-Language');

  // ── 7. Security Headers ──────────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  if ((request.headers.get('host') || '').includes('kartseek.com')) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Locale resolution ───────────────────────────────────────────────────────

interface ResolvedLocale {
  country: string;
  language: string;
  /** What the CDN geo-located the client to, whether or not we serve it. */
  geoCountry: string;
  /** Which signal won — surfaced so the UI can offer "you appear to be in X". */
  source: 'path' | 'cookie' | 'subdomain' | 'geo' | 'default';
}

/**
 * Resolve the region and language for a request.
 *
 * Priority, strongest first:
 *   1. an explicit `/qa/...` path prefix — an unambiguous request for a market
 *   2. the visitor's saved cookie — a choice they made, so it outranks geo
 *   3. the subdomain — `qa.kartseek.com` is a market-specific deployment
 *   4. the CDN's IP geolocation
 *   5. the platform default (Qatar unless overridden at build time)
 *
 * Every candidate is validated against the registry before it is accepted.
 * Previously any two-letter value the CDN produced became the region code, so a
 * visitor in France was served region `FR` — which no lookup matches, leaving
 * the storefront with no currency, no payment methods and no catalogue.
 */
function resolveLocale(
  request: NextRequest,
  pathCountry: string,
  cookieCountry: string | undefined,
): ResolvedLocale {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0]?.toLowerCase() ?? '';
  const subdomainCountry = SUBDOMAIN_COUNTRY[subdomain];

  const geoRaw = GEO_HEADERS.reduce<string>(
    (found, header) => found || (request.headers.get(header) || ''),
    '',
  ).toUpperCase();

  const candidates: Array<[string | undefined, ResolvedLocale['source']]> = [
    [pathCountry, 'path'],
    [cookieCountry, 'cookie'],
    [subdomainCountry, 'subdomain'],
    [geoRaw, 'geo'],
  ];

  /**
   * Only a trading market is accepted.
   *
   * Every candidate here is attacker- or accident-supplied: a path segment, a
   * cookie, a subdomain, a geo header. `isCountryCode` accepted any of the
   * twenty countries the registry describes, so `/in/marketplace` or a stale
   * cookie put the visitor on a storefront for a market the business does not
   * operate — priced in its currency, offering its payment rails, asking for
   * its address format. `isActiveCountry` narrows that to markets actually
   * trading; anything else falls through to the home market.
   */
  let country = DEFAULT_COUNTRY as string;
  let source: ResolvedLocale['source'] = 'default';
  for (const [candidate, candidateSource] of candidates) {
    if (candidate && isActiveCountry(candidate)) {
      country = candidate.toUpperCase();
      source = candidateSource;
      break;
    }
  }

  return {
    country,
    language: resolveLanguage(request, country),
    geoCountry: geoRaw,
    source,
  };
}

/**
 * Pick the language to serve, constrained to what the region offers.
 *
 * This is the rule that keeps Qatar on Arabic and English: a saved `hi` cookie
 * or a `ta-IN` browser is not simply passed through — it is checked against the
 * region's list and, failing that, resolved to the region's default. Without
 * the check a visitor who browsed the Indian storefront in Tamil kept Tamil
 * after switching to Qatar, where no Tamil catalogue or support exists.
 */
function resolveLanguage(request: NextRequest, country: string): string {
  const offered = getCountry(country).languages as readonly string[];

  const cookieLang = normaliseLanguage(request.cookies.get('kartseek_language')?.value);
  if (cookieLang && offered.includes(cookieLang)) return cookieLang;

  for (const tag of parseAcceptLanguage(request.headers.get('accept-language'))) {
    const lang = normaliseLanguage(tag);
    if (lang && offered.includes(lang)) return lang;
  }

  return getCountry(country).defaultLanguage;
}

/** `Accept-Language` tags ordered by q-value, highest first. */
function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|screenshots|sw.js|manifest.json).*)',
  ],
};
