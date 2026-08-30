/**
 * How long a shop is likely to take, and the one place that decides it.
 *
 * `grocery_stores` has no delivery-time column. The store directory already
 * estimated one from distance, but the homepage read `s.estimatedDeliveryTime`
 * — a field the API does not return — and fell back to the literal string
 * `'25-35 min'`. So every shop on the homepage advertised the same fabricated
 * window, and the same shop showed a *different* window on the directory page.
 *
 * The estimate below is a rough model, not a promise: about ten minutes to pick
 * an order plus roughly three minutes per kilometre. It is honest because it is
 * derived from the distance we actually know; when we have no fix on the shopper
 * it assumes 3 km, which is what the directory has always done.
 */

/** Minutes to pick an order before it leaves the shop. */
const PICKING_MINUTES = 10;

/** Minutes per kilometre of riding. */
const MINUTES_PER_KM = 3;

/** Assumed distance when the shopper has not shared a location. */
const ASSUMED_KM = 3;

/** Width of the quoted window, in minutes. */
const WINDOW_MINUTES = 10;

/**
 * A delivery window such as `"19-29 min"`.
 *
 * @param distKm Distance to the shop, or null/undefined when unknown.
 */
export function deliveryWindow(distKm?: number | null): string {
  const km = typeof distKm === 'number' && Number.isFinite(distKm) ? distKm : ASSUMED_KM;
  const from = Math.round(PICKING_MINUTES + km * MINUTES_PER_KM);
  return `${from}-${from + WINDOW_MINUTES} min`;
}

/** Great-circle distance in km, or null when either point is unknown. */
export function distanceKm(
  from: { lat?: number | null; lng?: number | null } | null | undefined,
  to: { lat?: number | null; lng?: number | null } | null | undefined,
): number | null {
  const aLat = from?.lat, aLng = from?.lng, bLat = to?.lat, bLng = to?.lng;
  if (
    typeof aLat !== 'number' || typeof aLng !== 'number' ||
    typeof bLat !== 'number' || typeof bLng !== 'number'
  ) return null;

  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** A distance label such as `"800 m"` or `"2.4 km"`; empty when unknown. */
export function distanceLabel(distKm?: number | null): string {
  if (typeof distKm !== 'number' || !Number.isFinite(distKm)) return '';
  return distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
}
