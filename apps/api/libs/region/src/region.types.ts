/**
 * KARTSEEK Multi-Regional Architecture — Type Definitions
 *
 * Defines the operational regions KARTSEEK supports. Every seller, product,
 * and delivery partner is scoped to exactly one region. Customers see only
 * the vendors that belong to their detected country.
 */

/** ISO 3166-1 alpha-2 codes for supported operational regions */
export type SupportedCountryCode = 'IN' | 'QA' | 'AE' | 'SA' | 'BH' | 'KW' | 'OM' | 'GB' | 'US' | 'SG';

/** Full region configuration object */
export interface RegionConfig {
  /** ISO 3166-1 alpha-2 country code */
  code: SupportedCountryCode;
  /** Human-readable country name */
  name: string;
  /** Flag emoji (fallback — may not render on all platforms) */
  flag: string;
  /** Cross-platform flag image URL (SVG) */
  flagUrl: string;
  /** ISO 4217 currency code */
  currencyCode: string;
  /** Currency symbol for display */
  currencySymbol: string;
  /**
   * Consumption tax for the market.
   *
   * Lives on the region config so a service that has a region also has its tax
   * rules. Before this, the only server-side table was a private `seedTaxRules`
   * array inside the gateway's localization controller, unreachable from the
   * services — which is why the invoice builder simply hardcoded India's 18%
   * GST for every market. `rate: 0` is a real answer (Qatar and Kuwait levy
   * none), distinct from "unknown".
   */
  tax: {
    /** Display name — "VAT", "GST", "Sales Tax", or "No Tax" where rate is 0. */
    name: string;
    /** Percentage, e.g. 5 for 5%. */
    rate: number;
    /** Whether the rate is already included in displayed prices. */
    isInclusive: boolean;
  };
  /** BCP-47 locale tag */
  locale: string;
  /** IANA timezone identifier */
  timezone: string;
  /** Default coordinates (capital / major city) */
  defaultCoords: { lat: number; lng: number };
  /** Default city name */
  defaultCity: string;
  /** Country calling code (e.g. +91) */
  callingCode: string;
  /** Whether the region is currently active */
  isActive: boolean;
  /** Supported service modules in this region */
  enabledModules: ServiceModule[];
  /** Supported payment methods and gateways for this region */
  supportedPaymentMethods?: RegionPaymentMethod[];
}

/** Payment method configuration for a region */
export interface RegionPaymentMethod {
  /** Method type shown to user (card, upi, upi, wallet, etc.) */
  methodType: string;
  /** Gateway that processes this method (razorpay, stripe, mada, upi, wallet) */
  gateway: string;
  /** Display name for frontend */
  displayName: string;
  /** Whether this is the default payment method */
  isDefault?: boolean;
}

/** Service modules that can be enabled/disabled per region */
export type ServiceModule =
  | 'marketplace'
  | 'grocery'
  | 'restaurant'
  | 'pharmacy'
  | 'doctor'
  | 'taxi'
  | 'delivery'
  | 'hotel-booking'
  | 'wallet'
  | 'loyalty'
  | 'franchise';

/** Region detection result from GPS or IP */
export interface RegionDetectionResult {
  /** Detected country code */
  countryCode: SupportedCountryCode;
  /** Detection method used */
  detectedVia: 'gps' | 'ip' | 'header' | 'default';
  /** Confidence score 0–1 */
  confidence: number;
  /** Full region config */
  region: RegionConfig;
  /** Detected coordinates (if GPS) */
  coords?: { lat: number; lng: number };
  /** Detected city name */
  city?: string;
}

/** Region-scoped query filter applied to all data access */
export interface RegionFilter {
  countryCode: SupportedCountryCode;
}

/** Region stats for admin dashboard */
export interface RegionStats {
  code: SupportedCountryCode;
  name: string;
  flag: string;
  totalSellers: number;
  activeSellers: number;
  totalOrders: number;
  todayOrders: number;
  totalCustomers: number;
  totalPartners: number;
  activePartners: number;
  revenue: number;
  todayRevenue: number;
  currency: string;
}
