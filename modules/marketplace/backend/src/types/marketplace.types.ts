/**
 * Shared shapes for the Marketplace module.
 *
 * Extracted from marketplace.service.ts so the domain services split out of it
 * (catalog, analytics, admin) can share them without importing each other.
 */

export interface ProductFilter {
  /**
   * ISO country code the catalogue is being browsed from.
   *
   * Scopes the result to products a seller in that region actually offers, and
   * ranks those sellers above cross-border ones. Omit for an unscoped read
   * (admin catalogue views).
   */
  country?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

/** Minimal shape for paginated list responses returned by the module's services. */
export interface DataList<T = unknown> {
  data: T[];
  total: number;
  [key: string]: unknown;
}
