/**
 * Seller onboarding types shared across every module's registration.
 *
 * These three types were defined inside `lib/demo-data/seller-grocery/types.ts`
 * alongside the grocery portal's fixture types. They are not fixtures — they
 * describe which markets the business actually operates in and what each one
 * requires — and a folder called `demo-data` is the wrong place for the only
 * copy of that, because the obvious cleanup ("delete the demo data") deletes the
 * compliance rules with it.
 *
 * The grocery types file now re-exports these, so the portal's existing imports
 * keep resolving to exactly the same types.
 */

/**
 * The markets the platform actually onboards sellers in.
 *
 * Nine, and deliberately not the same set as the storefront's country registry
 * in `lib/localization/countries.ts`, which describes ten. Singapore is
 * described there — its currency and address format resolve, so historical
 * records stay readable — but no seller compliance profile exists for it, so a
 * business cannot be onboarded there. Adding a tenth market means adding its
 * entry to `COUNTRY_COMPLIANCE`, not widening this union on its own.
 */
export type SellerCountryCode = 'IN' | 'QA' | 'AE' | 'SA' | 'BH' | 'KW' | 'OM' | 'GB' | 'US';

export type BusinessType =
  | 'supermarket'
  | 'mini_market'
  | 'fresh_meat_shop'
  | 'fish_shop'
  | 'fruits_vegetables'
  | 'organic_grocery'
  | 'bakery'
  | 'wholesale_grocery'
  | 'brand_distributor'
  | 'dark_store'
  | 'home_based_food';

export type DocumentType =
  // Country-level documents, required of any business in that market.
  | 'business_registration'
  | 'trade_licence'
  | 'tax_certificate'
  | 'food_safety_licence'
  | 'bank_details'
  | 'owner_id'
  | 'store_photos'
  | 'address_proof'
  | 'cold_chain_proof'
  | 'ecommerce_licence'
  | 'fda_registration'
  | 'allergen_declaration'
  | 'distance_selling_info'
  // Module-level documents, required by what the business sells rather than
  // where it sells. A pharmacy needs a dispensing licence in every market.
  | 'pharmacy_licence'
  | 'medical_council_registration'
  | 'vehicle_registration'
  | 'driving_licence'
  | 'tourism_licence';
