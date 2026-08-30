/**
 * KARTSEEK — API Client Barrel Export
 *
 * Import any module API from '@/lib/api-endpoints':
 *   import { groceryApi, taxiModuleApi } from '@/lib/api-endpoints';
 */

// Grocery is not re-exported here. `./grocery` was a second, thinner grocery
// client whose response types were wrong — it declared `{ stores }`, `{ products }`
// and `{ categories }` where the API returns `{ data, total, page, limit }`, and
// sent `categoryId` on a route that reads `category` — so the thirteen seller
// screens importing it destructured keys that are never present. The complete,
// correct client is `@/lib/grocery-api`; that file is gone.
export { restaurantApi }   from './restaurant';
export { pharmacyApi }     from './pharmacy';
export { doctorApi }       from './doctor';
export { taxiModuleApi }   from './taxi';
export { sellerApi }       from './seller';
export { loyaltyApi }      from './loyalty';
export { franchiseApi }    from './franchise';

// Marketplace API — import directly from '@/lib/api/marketplace'
// Admin Marketplace API — import directly from '@/lib/api/admin-marketplace'
