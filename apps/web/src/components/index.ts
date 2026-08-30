/**
 * KARTSEEK Web — Components Barrel Export
 *
 * Shared primitives:  import { Button, StatCard } from '@/components';
 * Module-scoped:      import { ... } from '@/components/marketplace';
 */

// ── Shared UI & Application components ───────────────────────────────────────
// All generic components now live in components/shared/
export * from './shared/ui';
export { Field }                 from './shared/field';
export { SiteHeader }            from './shared/site-header';
export { KartseekLoader, FullPageLoader, SkeletonPageLoader } from './shared/kartseek-loader';
export { ProtectedRoute }        from './shared/protected-route';
export { CurrencyDisplay }       from './shared/currency-display';
export { BarFill }               from './shared/bar-fill';
export { LocaleSwitcher }        from './shared/locale-switcher';
export { VpnDetectionOverlay }   from './shared/vpn-detection-overlay';

// ── Module-scoped components (import from sub-paths when populated) ──────────
// @/components/shared           → Generic UI primitives & app-wide components
// @/components/admin/marketplace → Admin marketplace components
// @/components/grocery          → Customer grocery components
// @/components/restaurant       → Customer restaurant components
// @/components/marketplace      → Customer marketplace components
// @/components/pharmacy         → Customer pharmacy components
// @/components/doctor           → Customer doctor components
// @/components/taxi             → Customer taxi components
// @/components/seller           → Seller portal shared components
