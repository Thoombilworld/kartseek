/// KARTSEEK — Localization core
///
/// One import surface for everything that changes with the active region:
/// languages, currency, dates, addresses, payments and compliance.
///
/// In a React tree prefer `useRegion()` from `@/lib/contexts/region-context`,
/// which binds these to the detected region automatically. Reach for these
/// directly in server components, route handlers and pure helpers.

export * from './types';
export * from './languages';
export * from './countries';
export * from './currency';
export * from './datetime';
export * from './address';
export * from './payments';
export * from './compliance';
export * from './legal';
export * from './terms';
export * from './corporate';
export * from './seller';
