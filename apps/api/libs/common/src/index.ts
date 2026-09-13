// ─── Common Shared Types & Constants ────────────────────────────────────────
export * from './enums/status.enum';
export * from './enums/country.enum';
export * from './enums/role.enum';
export * from './interfaces/paginated-response.interface';
export * from './interfaces/base-entity.interface';
export * from './common.module';

// ─── Exceptions ──────────────────────────────────────────────────────────────
export * from './exceptions/business.exception';

// ─── Filters ─────────────────────────────────────────────────────────────────
export * from './filters/http-exception.filter';
export * from './filters/rpc-exception.filter';

// ─── RPC forwarding ──────────────────────────────────────────────────────────
export * from './rpc/forward-rpc';
export * from './rpc/rpc-payload';

// ─── Interceptors ─────────────────────────────────────────────────────────────
export * from './interceptors/logging.interceptor';
export * from './interceptors/transform.interceptor';

// ─── Config ──────────────────────────────────────────────────────────────────
export * from './config';

// ─── Staff market scope (backend half) ───────────────────────────────────────
export * from './market/market-scope';

// ─── Search document field names, shared by the writer and the filter ────────
export * from './search/search-fields';
// The HTTP half, which reads the request rather than a record. It was declared
// in `apps/api-gateway/src/guards`, where `libs/gdpr` had to reach up into the
// application to import it (dispatch addendum item 5).
export * from './market/http-market-scope';

// ─── Admin permission vocabulary & seeded roles ──────────────────────────────
export * from './admin/permissions';
// The status words the admin console filters on, and the fold that turns what a
// human clicked into the value the wire carries.
export * from './admin/status-vocabularies';

// ─── Health (the one implementation for every deployable) ────────────────────
export * from './health/health.types';
export * from './health/health.service';
export * from './health/shared-health.controller';
export * from './health/health.module';
