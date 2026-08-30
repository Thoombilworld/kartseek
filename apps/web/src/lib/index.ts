/**
 * KARTSEEK Web — Library Barrel Export
 *
 * Import anything from '@/lib':
 *   import { useToast, useAuth, useDebounce, cn, … } from '@/lib';
 *
 * Structure:
 *   lib/hooks/     — custom React hooks (useSocket, useSellerSocket, …)
 *   lib/contexts/  — React context providers (AuthContext, RegionContext, …)
 *   lib/socket/    — WebSocket client (getSocket, disconnectSocket)
 *   lib/modules/   — domain logic (loyalty, seller-api, grocery-categories, …)
 */

// ── Utilities ─────────────────────────────────────────────────────────────────
// Note: locale-utils exports richer locale-aware versions of formatCurrency &
// formatDate — exclude the simpler utils.ts versions to avoid barrel collision.
export {
  cn, formatCompact, discountPct, clamp, truncate, slugify, titleCase,
  maskPhone, maskEmail, relativeTime, formatDateTime,
  groupBy, pick, omit, uniqueBy, chunk, uid,
  buildQueryString, parseQueryString, lockScroll, unlockScroll, scrollToId, validate,
} from '@/lib/utils';
export * from './api-endpoints';
export * from './locale-utils';


// ── Custom Hooks ──────────────────────────────────────────────────────────────
export * from '@/lib/hooks';

// ── Contexts ──────────────────────────────────────────────────────────────────
export * from '@/lib/contexts';

// ── Socket Client ─────────────────────────────────────────────────────────────
export * from '@/lib/socket';

// ── Domain Modules ────────────────────────────────────────────────────────────
export * from '@/lib/modules';

// ── Error Boundary ────────────────────────────────────────────────────────────
export * from './error-boundary';
