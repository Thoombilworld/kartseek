import { redirect } from 'next/navigation';

/**
 * Storefront settings live at Brand Center → Brand Store.
 *
 * There were two storefront editors. This one had overlapping tabs (Branding,
 * SEO, Policies) with `brand-center/store` (Branding, Theme, Content, SEO), a
 * different set of brand-colour swatches, and no indication of which one won.
 *
 * It was also the broken half. Every input was uncontrolled — `defaultValue`
 * seeded with another merchant's copy ("Tech Haven Electronics", "Premium
 * Electronics at Best Prices") and no `onChange` — so nothing a seller typed was
 * captured anywhere. `save()` then posted a literal `{}`, swallowed the error,
 * and set the success flag unconditionally outside the try, so it reported
 * "Saved!" whether the request succeeded, failed, or carried no data at all.
 *
 * `brand-center/store` holds real form state and sends it to
 * `PUT /sellers/:id/brand`, so it is the one that stays. Redirecting rather than
 * deleting keeps every existing link, bookmark and nav entry working.
 */
export default function SellerStorefrontPage() {
  redirect('/seller/marketplace/brand-center/store');
}
