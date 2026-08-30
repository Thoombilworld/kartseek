// ── TCP Message Pattern Contracts ──────────────────────────────────────────
export { MARKETPLACE_PATTERNS, MarketplacePattern } from './marketplace.patterns';
export {
  GROCERY_PATTERNS, RESTAURANT_PATTERNS, PHARMACY_PATTERNS,
  TAXI_PATTERNS, HOTEL_PATTERNS, DOCTOR_PATTERNS,
  WALLET_PATTERNS, LOYALTY_PATTERNS, FRANCHISE_PATTERNS,
} from './service-patterns';

// ── Kafka Domain Event Contracts ──────────────────────────────────────────
export {
  MARKETPLACE_EVENTS, GROCERY_EVENTS, RESTAURANT_EVENTS,
  PHARMACY_EVENTS, TAXI_EVENTS, HOTEL_EVENTS,
  DOCTOR_EVENTS, WALLET_EVENTS, LOYALTY_EVENTS, FRANCHISE_EVENTS,
} from './domain-events';
