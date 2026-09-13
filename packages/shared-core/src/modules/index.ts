// ── Domain Modules ────────────────────────────────────────────────────────────
export * from './loyalty';
export * from './profiles';
export * from './restaurant-loyalty';
export * from './doctor-registry';
export * from './grocery-categories';
// seller-api and admin-marketplace-api are imported directly by pages (avoids a
// duplicate export conflict with the api-endpoints.ts barrel). marketplace-api
// was deleted: it was a third copy of the storefront routes with no importers;
// `api/marketplace.ts` is the one client.
