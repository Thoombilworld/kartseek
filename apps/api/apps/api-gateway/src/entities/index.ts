// ── Gateway-owned entities ──────────────────────────────────────────────────
// These entities are owned by the API Gateway itself (not stubs of other services).
//
// Do NOT add an entity here for a table another service owns. Removed 2026-07-27:
//   ./order.entity      → `orders`      is owned by order-service
//   ./restaurant.entity → `restaurants` is owned by restaurant-service
// Both were registered on the gateway's DataSource but never queried.
//
// STILL VIOLATING (Phase 1 — these are live, so they need a proxy migration first):
//   ./delivery.entity   → `delivery_*`  is owned by delivery-service, but
//                         controllers/partner.controller.ts queries it directly.
//   ./taxi.entity       → `taxi_*`      is owned by taxi-service, but
//                         controllers/taxi.controller.ts implements the ride path on it.
export * from './taxi.entity';
export * from './partner.entity';
export * from './delivery.entity';
// ./localization.entities was removed — the 7 entities it declared were never
// registered with TypeORM and no matching table was ever created, so every read
// silently fell back to seed arrays and every write 500'd. Localization
// reference data is now served from constants in
// controllers/localization.controller.ts.
export * from './geo-security.entities';
export * from './page-layout.entity';
export * from './bank-offer.entity';
export * from './exchange-offer.entity';
export * from './static-page.entity';

