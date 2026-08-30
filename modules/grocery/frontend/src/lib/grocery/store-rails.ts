/**
 * The rails a shop belongs on, and the vocabulary both screens that show rails
 * agree to use.
 *
 * The homepage and `/grocery/stores` each had their own idea of what a rail is.
 * The homepage derived keys like `meat-fish` from the shop's `storeTypes`; the
 * stores page filtered on `storeTypes` directly, so its "Meat & Fish" and
 * "Dairy & Bakery" chips matched nothing — an exact `includes('meat-fish')`
 * against `['Butchery']` is false, and the tag fallback beneath it never
 * contained a hyphenated key either. One definition, used by both, is what makes
 * the homepage's "View All" land on the same set of shops the rail was showing.
 */

/** A shop, as much of it as deciding rails requires. */
export interface RailStore {
  storeTypes?: string[];
  rating?: number | string;
  isPromoted?: boolean;
  createdAt?: string;
  totalOrders?: number | string;
  isHyperlocalDeliveryAvailable?: boolean;
}

/** How recently a shop must have opened to count as new. */
const NEW_STORE_DAYS = 30;

export function railsFor(s: RailStore): string[] {
  const types = (s.storeTypes ?? []).map((t) => String(t).toLowerCase());
  const has = (...needles: string[]) => types.some((t) => needles.some((n) => t.includes(n)));
  const rating = Number(s.rating ?? 0);

  const rails = ['nearby'];
  if (has('supermarket', 'hypermarket')) rails.push('supermarket');
  if (has('meat', 'fish', 'butcher')) rails.push('meat-fish');
  if (has('organic')) rails.push('organic');
  if (has('bakery', 'dairy')) rails.push('dairy-bakery');
  if (has('produce', 'fruit', 'vegetable')) rails.push('fruits-veggies');
  if (rating >= 4.5) rails.push('top-rated');
  if (s.isPromoted) rails.push('trending');

  // Express: the shop's own hyperlocal flag, which is what the ~10km
  // short-radius delivery is recorded under.
  if (s.isHyperlocalDeliveryAvailable) rails.push('fast-delivery');

  // Recently opened. An unparseable date is not "new".
  const opened = s.createdAt ? Date.parse(s.createdAt) : NaN;
  if (!Number.isNaN(opened) && Date.now() - opened < NEW_STORE_DAYS * 86_400_000) {
    rails.push('new');
  }

  // Best sellers need real orders behind them; a market with none shows no rail
  // rather than an arbitrary top-N of zeroes.
  if (Number(s.totalOrders ?? 0) > 0) rails.push('best-seller');

  return rails;
}

/**
 * Every rail a shopper can filter the store directory by.
 *
 * `key` is what travels in `?type=` — stable and English. The homepage used to
 * build that value from the section's *translated* heading
 * (`title.toLowerCase().replace(/ /g, '-')`), so in Arabic every "View All" link
 * carried an Arabic slug, and in any language it pointed at
 * `/grocery/search?section=…`, a parameter the search page does not read. Every
 * rail's "View All" led to a blank search.
 */
export const STORE_RAILS: ReadonlyArray<{ key: string; label: string; emoji: string }> = [
  { key: 'all', label: 'All Stores', emoji: '🛒' },
  { key: 'nearby', label: 'Nearby', emoji: '📍' },
  { key: 'fast-delivery', label: 'Express', emoji: '⚡' },
  { key: 'top-rated', label: 'Top Rated', emoji: '⭐' },
  { key: 'trending', label: 'Trending', emoji: '🔥' },
  { key: 'new', label: 'New', emoji: '🆕' },
  { key: 'supermarket', label: 'Supermarkets', emoji: '🏪' },
  { key: 'meat-fish', label: 'Meat & Fish', emoji: '🥩' },
  { key: 'fruits-veggies', label: 'Fruits & Veg', emoji: '🥬' },
  { key: 'dairy-bakery', label: 'Dairy & Bakery', emoji: '🥛' },
  { key: 'organic', label: 'Organic', emoji: '🌿' },
  { key: 'best-seller', label: 'Best Sellers', emoji: '🏆' },
];

const RAIL_KEYS = new Set(STORE_RAILS.map((r) => r.key));

/** A `?type=` value only filters when it names a rail; anything else means "all". */
export function isRailKey(v: string | null | undefined): boolean {
  return !!v && RAIL_KEYS.has(v);
}

/** Where a rail's "View All" goes. */
export function railHref(key: string): string {
  return `/grocery/stores?type=${encodeURIComponent(key)}`;
}
