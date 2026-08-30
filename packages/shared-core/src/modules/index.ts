// ── Domain Modules ────────────────────────────────────────────────────────────
export * from './loyalty';
export * from './profiles';
export * from './restaurant-loyalty';
export * from './doctor-registry';
export * from './grocery-categories';
// seller-api, marketplace-api, admin-marketplace-api are imported directly by pages
// (avoids duplicate export conflict with api-endpoints.ts barrel)
