/**
 * KARTSEEK Web — Components Barrel Export
 *
 * Shared primitives:  import { Button, StatCard } from '@/components';
 * Module-scoped:      import { ... } from '@/components/marketplace';
 */

// ── Shared UI & Application components ───────────────────────────────────────
// All generic components now live in components/shared/
export * from '@/components/shared/ui';
export { Field }                 from '@/components/shared/field';
export { SiteHeader }            from '@/components/shared/site-header';
export { KartseekLoader, FullPageLoader, SkeletonPageLoader } from '@/components/shared/kartseek-loader';
export { ProtectedRoute }        from '@/components/shared/protected-route';
export { CurrencyDisplay }       from '@/components/shared/currency-display';
export { BarFill }               from '@/components/shared/bar-fill';
export { LocaleSwitcher }        from '@/components/shared/locale-switcher';
export { VpnDetectionOverlay }   from '@/components/shared/vpn-detection-overlay';

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
