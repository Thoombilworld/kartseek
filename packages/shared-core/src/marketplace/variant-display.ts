/**
 * How a variant axis is *drawn* — shared by the card grid, the product detail
 * page and the seller portal.
 *
 * Three surfaces used to answer "is this axis a colour, and what colour is
 * `Titanium Natural`?" independently: the card had a 17-entry lookup table, the
 * detail page decided by testing whether the attribute name contained "color",
 * and the seller portal had no notion of it at all. So a shopper could see a
 * grey chip on the grid, a bordered button on the detail page and nothing in
 * the portal — for one attribute.
 *
 * The authority is the category's attribute schema, which the admin panel
 * authors and `/marketplace/categories/:idOrSlug/attributes` serves: an option
 * declared there carries its own `hex`. Everything here is the fallback for a
 * value the schema does not describe — a seller's free-typed shade, or a
 * category with no schema configured yet.
 */

/** One selectable value of a category attribute, as the API returns it. */
export interface AttributeOption {
  label: string;
  value: string;
  hex?: string;
}

/** One attribute in a category's schema. */
export interface CategoryAttribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  options?: AttributeOption[] | null;
  unit?: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVariantAxis: boolean;
  sortOrder: number;
  categoryId?: string | null;
}

/** `/marketplace/categories/:idOrSlug/attributes` response body. */
export interface CategoryAttributeSchema {
  category: { id: string; name: string; slug: string } | null;
  data: CategoryAttribute[];
  total: number;
  /** Slugs of the attributes that split a product into SKUs. */
  variantAxes: string[];
}

/**
 * Named colours the storefront can paint without being told.
 *
 * Deliberately conservative: a name that isn't here renders as a neutral chip
 * rather than a guess, because a wrong swatch misrepresents the product. The
 * fix for a missing colour is to give the option a `hex` in the admin panel,
 * not to add rows here.
 */
const NAMED_COLOURS: Record<string, string> = {
  black: '#1e293b', white: '#f8fafc', silver: '#cbd5e1', grey: '#94a3b8', gray: '#94a3b8',
  navy: '#1e3a8a', blue: '#2563eb', red: '#dc2626', green: '#16a34a', yellow: '#eab308',
  pink: '#ec4899', purple: '#9333ea', brown: '#78350f', beige: '#e7d8c9', gold: '#d4af37',
  orange: '#ea580c', cream: '#fdf6e3', maroon: '#7f1d1d', teal: '#0d9488', olive: '#4d7c0f',
  charcoal: '#374151', ivory: '#fffff0', lavender: '#c4b5fd', mint: '#a7f3d0',
  turquoise: '#14b8a6', burgundy: '#800020', khaki: '#c3b091', tan: '#d2b48c',
  copper: '#b87333', bronze: '#cd7f32', platinum: '#e5e4e2', graphite: '#41424c',
  titanium: '#878681',
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * The fill for a colour option, or `null` when it cannot be known.
 *
 * `null` is a real answer, not a failure: the caller renders a neutral chip.
 * Returning an invented colour would be worse than admitting ignorance.
 *
 * A compound name resolves on its most specific recognised word, so "Midnight
 * Black" is black and "Titanium Blue" is blue rather than titanium — the last
 * word of an English colour name is the colour, the earlier ones qualify it.
 */
export function swatchFill(name: string, declared?: string | null): string | null {
  if (declared && HEX_RE.test(declared.trim())) return declared.trim().toLowerCase();

  const raw = String(name ?? '').trim();
  if (!raw) return null;
  if (HEX_RE.test(raw)) return raw.toLowerCase();

  const key = raw.toLowerCase();
  if (NAMED_COLOURS[key]) return NAMED_COLOURS[key];

  const words = key.split(/[^a-z]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const fill = NAMED_COLOURS[words[i]];
    if (fill) return fill;
  }
  return null;
}

/**
 * Whether an axis should be drawn as swatches.
 *
 * The schema decides when it can: a COLOR attribute is a colour axis whatever
 * it is called, which is what lets a seller name the axis "Shade" or a market
 * name it "Colour" without either breaking. The name test is only reached for a
 * variant whose axis has no matching attribute — sizes must never become dots.
 */
export function isColourAxis(axisName: string, attribute?: CategoryAttribute | null): boolean {
  if (attribute) return attribute.type?.toUpperCase() === 'COLOR';
  return /colou?r|shade|finish/i.test(axisName);
}

/**
 * Index a category schema by both slug and lower-cased name.
 *
 * Variants store the axis under the name a seller typed ("Colour", "color",
 * "Color"); the schema keys it by slug ("color"). Looking up by one alone left
 * every real variant unmatched, so nothing ever got its declared swatch.
 */
export function indexAttributes(schema?: CategoryAttributeSchema | null): Map<string, CategoryAttribute> {
  const index = new Map<string, CategoryAttribute>();
  for (const attr of schema?.data ?? []) {
    index.set(attr.slug.toLowerCase(), attr);
    index.set(attr.name.trim().toLowerCase(), attr);
  }
  return index;
}

/** The schema entry describing a variant axis, matched by slug or by name. */
export function findAttribute(
  index: Map<string, CategoryAttribute>,
  axisName: string,
): CategoryAttribute | null {
  const key = String(axisName ?? '').trim().toLowerCase();
  if (!key) return null;
  return index.get(key) ?? index.get(key.replace(/[^a-z0-9]+/g, '-')) ?? null;
}

/** The declared `hex` for one value of an attribute, if the schema names it. */
export function optionHex(attribute: CategoryAttribute | null | undefined, value: string): string | undefined {
  if (!attribute?.options?.length) return undefined;
  const key = String(value ?? '').trim().toLowerCase();
  const match = attribute.options.find(
    (opt) => opt.label?.trim().toLowerCase() === key || opt.value?.trim().toLowerCase() === key,
  );
  return match?.hex;
}

/**
 * Countable label for a non-colour axis on a card.
 *
 * "Size" pluralises cleanly ("4 sizes"); most axis names do not — blanket-adding
 * an "s" produced "3 storages". Anything that isn't a size is counted as
 * options instead, which reads correctly whatever the seller named the axis.
 * Any parenthetical qualifier is dropped: the axis "Size (UK)" is still sizes.
 */
export function variantAxisLabel(name: string, count: number): string {
  const bare = name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
  if (/^sizes?$/.test(bare)) return `${count} size${count === 1 ? '' : 's'}`;
  return `${count} ${bare} option${count === 1 ? '' : 's'}`;
}
