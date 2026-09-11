'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api-endpoints';
import { AUTH_TOKEN_KEY } from '@/lib/auth-token';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'SELLER' | 'DRIVER' | 'SUPER_ADMIN' | 'FRANCHISE';

/**
 * Seller sub-type — determines which portal the seller has access to.
 * Stored in the JWT payload and replicated to a cookie for edge middleware.
 */
export type SellerType =
  | 'marketplace' // General e-commerce seller
  | 'grocery' // Grocery store seller
  | 'restaurant' // Restaurant / food partner
  | 'pharmacy' // Pharmacy seller
  | 'doctor' // Doctor / clinic / hospital
  | 'hotel' // Hotel / property owner
  | 'taxi' // Taxi / ride-hailing vendor
  | 'delivery'; // Delivery partner

/** Dashboard URL for each seller type */
export const SELLER_DASHBOARDS: Record<SellerType, string> = {
  marketplace: '/seller/marketplace',
  grocery: '/seller/grocery/dashboard',
  restaurant: '/seller/restaurant/dashboard',
  pharmacy: '/seller/pharmacy/dashboard',
  doctor: '/seller/doctor/dashboard',
  hotel: '/hotel-owner',
  taxi: '/seller/taxi',
  delivery: '/seller/delivery',
};

/** Public login URL for each seller type */
export const SELLER_LOGIN_URLS: Record<SellerType, string> = {
  marketplace: '/seller/login',
  grocery: '/seller/grocery/login',
  restaurant: '/seller/restaurant/login',
  pharmacy: '/seller/pharmacy/login',
  doctor: '/seller/doctor/login',
  hotel: '/hotel-owner/login',
  taxi: '/seller/taxi/login',
  delivery: '/seller/login',
};

export type TwoFactorMethod = 'authenticator' | 'sms' | 'email';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** Sub-role for SELLER accounts — determines portal access */
  sellerType?: SellerType;
  avatarUrl?: string;
  isVerified: boolean;
  walletBalance?: number;
  loyaltyPoints?: number;
  /** ISO country code: IN | QA | AE | SA | BH | KW | OM | GB | US */
  regionCode?: string;
  /** City within the country for localized data */
  city?: string;
  /** Whether 2FA is configured for this account */
  twoFactorEnabled?: boolean;
  /** Active 2FA method */
  twoFactorMethod?: TwoFactorMethod;
  /** Admin role ID from RBAC system (R-01, R-02, R-03, etc.) */
  adminRoleId?: string;
  /** Admin role display name */
  adminRoleName?: string;
  /** Granular permission keys from the RBAC system */
  adminPermissions?: string[];
  /** True when user can ONLY access their assigned regionCode */
  regionLocked?: boolean;
  /**
   * Seller accounts only: false while the registration is awaiting admin
   * approval. A pending seller may sign in and watch their application, but the
   * portal itself stays shut.
   */
  sellerApproved?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  /** True when credentials are valid but 2FA OTP is still pending */
  requires2FA: boolean;
}

type AuthAction =
  | { type: 'HYDRATE'; user: AuthUser | null; token: string | null; requires2FA?: boolean }
  | { type: 'LOGIN'; user: AuthUser; token: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; updates: Partial<AuthUser> }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_2FA_REQUIRED' }
  | { type: 'COMPLETE_2FA' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        user: action.user,
        token: action.token,
        isLoading: false,
        isHydrated: true,
        requires2FA: action.requires2FA ?? false,
      };
    case 'LOGIN':
      return { ...state, user: action.user, token: action.token, isLoading: false };
    case 'LOGOUT':
      return { user: null, token: null, isLoading: false, isHydrated: true, requires2FA: false };
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.updates } : null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_2FA_REQUIRED':
      return { ...state, requires2FA: true };
    case 'COMPLETE_2FA':
      return { ...state, requires2FA: false };
    default:
      return state;
  }
}

const INITIAL_STATE: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isHydrated: false,
  requires2FA: false,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (user: AuthUser, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  hasSellerType: (...types: SellerType[]) => boolean;
  /** Check if the current admin user has ALL of the specified permissions */
  hasPermission: (...perms: string[]) => boolean;
  /** Check if the current admin user has ANY of the specified permissions */
  hasAnyPermission: (...perms: string[]) => boolean;
  /** Redirect path for the current seller's dashboard */
  sellerDashboard: string | null;
  /** Mark the current login as requiring 2FA verification */
  set2FARequired: () => void;
  /** Complete the 2FA verification step and allow access */
  complete2FA: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Persistence helpers ──────────────────────────────────────────────────────

// Re-exported from the shared module so the writer here and every reader in
// `lib/api/*` are guaranteed to agree on the key.
const STORAGE_KEY_TOKEN = AUTH_TOKEN_KEY;
const STORAGE_KEY_USER = 'kartseek_user';
const STORAGE_KEY_2FA = 'kartseek_2fa_pending';
const STORAGE_KEY_REFRESH = 'kartseek_refresh_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Normalise the gateway's role onto the client union.
 *
 * The API signs roles from a lower-case enum (`customer`, `super_admin`) while
 * this app compares against upper-case literals, so passing the wire value
 * straight through would make every `hasRole()` check fail silently.
 */
export function normaliseRole(role: string | undefined): UserRole {
  switch ((role ?? '').toUpperCase()) {
    // Every seller-shaped role on the API collapses to SELLER here. The client
    // union has no separate literal for them, and which module they belong to is
    // carried by `sellerType`, not by the role. Leaving them to fall through to
    // CUSTOMER would lock a grocer, pharmacist or doctor out of their own portal
    // the moment the guard starts requiring SELLER.
    case 'SELLER':
    case 'GROCERY_SELLER':
    case 'RESTAURANT_SELLER':
    case 'PHARMACY_SELLER':
    case 'PHARMACIST':
    case 'DOCTOR':
      return 'SELLER';
    case 'DRIVER':
    case 'TAXI_DRIVER':
    case 'DELIVERY_DRIVER':
    case 'DELIVERY_BOY':
      return 'DRIVER';
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'ADMIN':
      return 'SUPER_ADMIN';
    case 'FRANCHISE':
    case 'FRANCHISE_OWNER':
    case 'FRANCHISE_ADMIN':
      return 'FRANCHISE';
    default:
      return 'CUSTOMER';
  }
}

/**
 * Map a gateway user onto the client's `AuthUser`.
 *
 * `name` is defensive on purpose: register echoes the submitted name, but login
 * currently returns the email's local part, and neither is guaranteed present.
 */
export function toAuthUser(
  apiUser: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    role: string;
    sellerType?: string | null;
    status?: string | null;
    regionCode?: string | null;
    regionLocked?: boolean;
  },
  regionCode?: string,
): AuthUser {
  return {
    id: apiUser.id,
    name: apiUser.name?.trim() || apiUser.email.split('@')[0],
    email: apiUser.email,
    phone: apiUser.phone || undefined,
    role: normaliseRole(apiUser.role),
    // Only ever taken from the API. It decides which seller portal opens, so a
    // value the client invented would make portal isolation meaningless — which
    // is exactly what the old seller login's module dropdown did.
    sellerType: isSellerType(apiUser.sellerType) ? apiUser.sellerType : undefined,
    // Anything other than an explicit `active` is treated as not yet approved,
    // so an unrecognised status keeps the portal shut rather than opening it.
    // Fails closed for sellers. This read `(status ?? 'active') === 'active'`,
    // so a response that omitted `status` — which `/auth/profile` did — marked a
    // pending seller approved and routed them into a portal that refused them.
    // A non-seller has no approval to grant, so it stays true for them.
    sellerApproved:
      String(apiUser.role ?? '').toUpperCase() === 'SELLER'
        ? apiUser.status === 'active'
        : (apiUser.status ?? 'active') === 'active',
    isVerified: false,
    // A region-locked staff account's market comes from the API, never from
    // the browser's chosen region, and the lock itself is a signed claim the
    // gateway enforces on every request — the console only mirrors it.
    regionCode: apiUser.regionLocked && apiUser.regionCode ? apiUser.regionCode : regionCode,
    regionLocked: apiUser.regionLocked === true,
  };
}

const SELLER_TYPES: readonly SellerType[] = [
  'marketplace',
  'grocery',
  'restaurant',
  'pharmacy',
  'doctor',
  'hotel',
  'taxi',
  'delivery',
];

function isSellerType(value: unknown): value is SellerType {
  return typeof value === 'string' && (SELLER_TYPES as readonly string[]).includes(value);
}

function persist(user: AuthUser, token: string, refreshToken?: string) {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    if (refreshToken) localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
    // Cookies for middleware edge-runtime access
    document.cookie = `kartseek_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    document.cookie = `kartseek_user_role=${user.role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    // RBAC cookies — read by middleware to enforce module isolation
    if (user.sellerType) {
      document.cookie = `kartseek_seller_type=${user.sellerType}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    }
    if (user.regionCode) {
      document.cookie = `kartseek_country=${user.regionCode}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    }
    if (user.adminRoleId) {
      document.cookie = `kartseek_admin_role=${user.adminRoleId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    }
    if (user.regionLocked !== undefined) {
      document.cookie = `kartseek_region_locked=${user.regionLocked}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
    }
  } catch {
    /* ignore */
  }
}

function hydrate(): { user: AuthUser | null; token: string | null; requires2FA: boolean } {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    const pending2FA = localStorage.getItem(STORAGE_KEY_2FA) === 'true';
    if (token && raw) return { token, user: JSON.parse(raw) as AuthUser, requires2FA: pending2FA };
  } catch {
    /* ignore */
  }
  return { user: null, token: null, requires2FA: false };
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_2FA);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    // Clear all auth cookies
    document.cookie = 'kartseek_token=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'kartseek_user_role=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'kartseek_seller_type=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'kartseek_country=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'kartseek_admin_role=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'kartseek_region_locked=; path=/; max-age=0; SameSite=Strict';
  } catch {
    /* ignore */
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const { user, token, requires2FA } = hydrate();
    dispatch({ type: 'HYDRATE', user, token, requires2FA });
  }, []);

  // `refreshToken` is optional so the seller, admin and franchise login pages —
  // which still call `login(user, token)` — keep working untouched.
  const login = useCallback((user: AuthUser, token: string, refreshToken?: string) => {
    persist(user, token, refreshToken);
    dispatch({ type: 'LOGIN', user, token });
  }, []);

  /**
   * End the session on the server as well as in this browser.
   *
   * Clearing localStorage alone left `session:<id>` and a 30-day `refresh:<id>`
   * live on the gateway: the browser looked signed out while the session wasn't.
   * The call is deliberately not awaited — callers are synchronous click
   * handlers, and a failed or slow request must never trap someone in a signed-in
   * state. It is fired before the token is cleared, since the route needs it.
   */
  const logout = useCallback(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_TOKEN)) {
      void authApi.logout().catch(() => {
        /* local sign-out proceeds regardless */
      });
    }
    clearStorage();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback(
    (updates: Partial<AuthUser>) => {
      dispatch({ type: 'UPDATE_USER', updates });
      if (state.user && state.token) {
        persist({ ...state.user, ...updates }, state.token);
      }
    },
    [state.user, state.token],
  );

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      return !!state.user && roles.includes(state.user.role);
    },
    [state.user],
  );

  const hasSellerType = useCallback(
    (...types: SellerType[]) => {
      return !!state.user?.sellerType && types.includes(state.user.sellerType);
    },
    [state.user],
  );

  const hasPermission = useCallback(
    (...perms: string[]) => {
      if (!state.user?.adminPermissions) return state.user?.role === 'SUPER_ADMIN';
      return perms.every((p) => state.user!.adminPermissions!.includes(p));
    },
    [state.user],
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]) => {
      if (!state.user?.adminPermissions) return state.user?.role === 'SUPER_ADMIN';
      return perms.some((p) => state.user!.adminPermissions!.includes(p));
    },
    [state.user],
  );

  const sellerDashboard = state.user?.sellerType ? SELLER_DASHBOARDS[state.user.sellerType] : null;

  const set2FARequired = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_2FA, 'true');
    } catch {
      /* ignore */
    }
    dispatch({ type: 'SET_2FA_REQUIRED' });
  }, []);

  const complete2FA = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_2FA);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'COMPLETE_2FA' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.user && !!state.token && !state.requires2FA,
        login,
        logout,
        updateUser,
        hasRole,
        hasSellerType,
        hasPermission,
        hasAnyPermission,
        sellerDashboard,
        set2FARequired,
        complete2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
