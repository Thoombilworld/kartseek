import { formatAddressLines, isCountryCode } from '@/lib/localization';

export type SavedAddressType = 'home' | 'work' | 'other';

export interface SavedAddressRow {
  id: string;
  name: string;
  phone: string;
  type: SavedAddressType;
  isDefault: boolean;
  country: string;
  /** Stored for a different market than the one being browsed. */
  foreign: boolean;
  /** Display lines in the address's own country format (no name, country only when foreign). */
  lines: string[];
  raw: Record<string, unknown>;
}

const str = (v: unknown) => (v == null ? '' : String(v)).trim();

/**
 * One saved address, whatever shape user-service stored it in.
 *
 * Rows carry `label` ("Home") rather than `type`, and an address saved in one
 * market has that market's fields — line1/city/state/postalCode in India,
 * building/street/zone in Qatar. The page used to index `TYPE_CONFIG[row.type]`
 * and print `line1, city, state – pincode` unconditionally, so a row without
 * `type` threw inside render (the whole page became "Page failed to load") and
 * a Qatari row printed as "undefined, undefined – undefined".
 */
export function normaliseSavedAddress(
  raw: Record<string, unknown>,
  viewerCountry: string,
): SavedAddressRow {
  const typeRaw = str(raw.type || raw.label).toLowerCase();
  const type: SavedAddressType = typeRaw === 'home' || typeRaw === 'work' ? typeRaw : 'other';
  const viewer = str(viewerCountry).toUpperCase();
  const stored = str(raw.country).toUpperCase();
  const country = isCountryCode(stored) ? stored : viewer;
  const foreign = country !== viewer;
  const lines = formatAddressLines(
    { ...raw, country, fullName: str(raw.fullName || raw.name) } as Parameters<
      typeof formatAddressLines
    >[0],
    { country, includeName: false, includeCountry: foreign },
  );
  return {
    id: str(raw.id),
    name: str(raw.fullName || raw.name),
    phone: str(raw.phone),
    type,
    isDefault: raw.isDefault === true,
    country,
    foreign,
    lines,
    raw,
  };
}
