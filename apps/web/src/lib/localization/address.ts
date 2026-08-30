/// KARTSEEK — Region-aware address handling
///
/// An address form is not one shape with optional fields: Qatar identifies a
/// location by Building / Street / Zone and has no postal code at all, while
/// India routes on a 6-digit PIN. Both the form and the rendered address are
/// generated from the region's `AddressSpec`.

import { getCountry } from './countries';
import type { AddressFieldKey, AddressFieldSpec, AddressSpec } from './types';

/** Loosely typed so partially filled forms and stored addresses both fit. */
export type AddressValue = Partial<Record<AddressFieldKey, string>> & {
  country?: string;
  [key: string]: unknown;
};

// ─── Form schema ─────────────────────────────────────────────────────────────

export function getAddressSpec(country?: string): AddressSpec {
  return getCountry(country).address;
}

export function getAddressFields(country?: string): AddressFieldSpec[] {
  return getAddressSpec(country).fields;
}

/** Fields grouped by their `row`, so the form can lay them out side by side. */
export function getAddressRows(country?: string): AddressFieldSpec[][] {
  const rows = new Map<number, AddressFieldSpec[]>();
  for (const field of getAddressFields(country)) {
    const row = field.row ?? 0;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(field);
  }
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, fields]) => fields);
}

/** The label in the active language, falling back to English. */
export function getFieldLabel(field: AddressFieldSpec, language?: string): string {
  return language === 'ar' && field.labelAr ? field.labelAr : field.label;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface AddressValidationResult {
  valid: boolean;
  /** Field key → message. Empty when valid. */
  errors: Partial<Record<AddressFieldKey, string>>;
}

/**
 * Validate an address against its region's spec.
 *
 * Only the region's own fields are considered, so a Qatari address is never
 * failed for a missing postal code and an Indian one is never failed for a
 * missing zone number.
 */
export function validateAddress(value: AddressValue, country?: string): AddressValidationResult {
  const errors: Partial<Record<AddressFieldKey, string>> = {};

  for (const field of getAddressFields(country)) {
    const raw = (value[field.key] ?? '').toString().trim();

    if (field.required && !raw) {
      errors[field.key] = `${field.label} is required`;
      continue;
    }
    if (!raw) continue;

    if (field.maxLength && raw.length > field.maxLength) {
      errors[field.key] = `${field.label} must be at most ${field.maxLength} characters`;
      continue;
    }
    if (field.pattern && !new RegExp(field.pattern).test(raw)) {
      errors[field.key] = field.patternMessage ?? `${field.label} is not valid`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Validate a phone number against the region's calling code and length. */
export function validatePhone(phone: string, country?: string): { valid: boolean; message?: string; e164?: string } {
  const c = getCountry(country);
  const digits = phone.replace(/\D/g, '');
  if (!digits) return { valid: false, message: 'Mobile number is required' };

  const cc = c.callingCode.replace('+', '');
  const local = digits.startsWith(cc) ? digits.slice(cc.length) : digits;

  // National subscriber-number lengths for the regions the platform serves.
  const expected: Record<string, number[]> = {
    QA: [8], AE: [9], SA: [9], BH: [8], KW: [8], OM: [8],
    IN: [10], GB: [10], US: [10], SG: [8],
  };
  const lengths = expected[c.code] ?? [];
  if (lengths.length && !lengths.includes(local.length)) {
    return {
      valid: false,
      message: `${c.name} mobile numbers are ${lengths.join(' or ')} digits after ${c.callingCode}`,
    };
  }

  return { valid: true, e164: `+${cc}${local}` };
}

/** Display form of a phone number: `+974 3312 3456`. */
export function formatPhone(phone: string, country?: string): string {
  const c = getCountry(country);
  const digits = phone.replace(/\D/g, '');
  const cc = c.callingCode.replace('+', '');
  const local = digits.startsWith(cc) ? digits.slice(cc.length) : digits;
  if (!local) return phone;

  // Qatari and most Gulf 8-digit numbers group 4+4; Indian 10-digit groups 5+5.
  const grouped =
    local.length === 8 ? `${local.slice(0, 4)} ${local.slice(4)}`
      : local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}`
        : local.length === 9 ? `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
          : local;

  return `${c.callingCode} ${grouped}`;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/**
 * Field values that need a label prefix to be readable on their own.
 *
 * "25" means nothing on an address label; "Zone 25" is navigable. Qatar's whole
 * addressing system is bare numbers, so without this a printed Qatari label is
 * three unexplained integers.
 */
const PREFIXED: Partial<Record<AddressFieldKey, string>> = {
  buildingNumber: 'Building',
  streetNumber: 'Street',
  zoneNumber: 'Zone',
  unit: 'Unit',
  poBox: 'P.O. Box',
};

const PREFIXED_AR: Partial<Record<AddressFieldKey, string>> = {
  buildingNumber: 'مبنى',
  streetNumber: 'شارع',
  zoneNumber: 'منطقة',
  unit: 'وحدة',
  poBox: 'ص.ب',
};

function renderField(key: AddressFieldKey, value: string, language?: string): string {
  const prefixes = language === 'ar' ? PREFIXED_AR : PREFIXED;
  const prefix = prefixes[key];
  // Only prefix bare numbers — a user who typed "Building 25" should not get
  // "Building Building 25".
  if (prefix && /^\d+$/.test(value.trim())) return `${prefix} ${value.trim()}`;
  return value.trim();
}

export interface FormatAddressOptions {
  country?: string;
  language?: string;
  /** Join the lines with this instead of returning an array. */
  separator?: string;
  /** Append the country name as a final line. */
  includeCountry?: boolean;
  /** Include the recipient name line. Off for "ship to" summaries that already show it. */
  includeName?: boolean;
}

/**
 * Render a stored address into display lines, in this region's conventions.
 *
 * @example
 * formatAddressLines(
 *   { fullName: 'Fatima Al-Kuwari', buildingNumber: '25', streetNumber: '850',
 *     zoneNumber: '63', area: 'Al Sadd', city: 'Doha' },
 *   { country: 'QA' },
 * )
 * // ["Fatima Al-Kuwari", "Building 25", "Street 850", "Zone 63", "Al Sadd, Doha", "Qatar"]
 */
export function formatAddressLines(value: AddressValue, opts: FormatAddressOptions = {}): string[] {
  const country = getCountry(opts.country ?? value.country);
  const spec = country.address;
  const includeName = opts.includeName ?? true;

  const lines: string[] = [];
  for (const line of spec.lines) {
    if (!includeName && line.keys.length === 1 && line.keys[0] === 'fullName') continue;

    const parts = line.keys
      .map((key) => {
        const raw = (value[key] ?? '').toString().trim();
        return raw ? renderField(key, raw, opts.language) : '';
      })
      .filter(Boolean);

    if (parts.length) lines.push(parts.join(line.separator ?? ' '));
  }

  if (opts.includeCountry !== false) {
    lines.push(opts.language === 'ar' ? country.nativeName : country.name);
  }
  return lines;
}

/** Single-string form of {@link formatAddressLines}. */
export function formatAddress(value: AddressValue, opts: FormatAddressOptions = {}): string {
  return formatAddressLines(value, opts).join(opts.separator ?? ', ');
}

/** Compact one-liner for order lists and dropdowns. */
export function formatAddressShort(value: AddressValue, opts: FormatAddressOptions = {}): string {
  const lines = formatAddressLines(value, { ...opts, includeName: false, includeCountry: false });
  return lines.slice(0, 2).join(', ') || '—';
}

// ─── Wire format ─────────────────────────────────────────────────────────────

/**
 * Flatten a region-shaped address into the `{ line1, line2, city, state,
 * postalCode, country }` envelope the order/delivery services persist.
 *
 * The region-native fields are preserved alongside so nothing is lost on the
 * round trip — the flattened columns exist for services that only know the
 * generic shape, not as the source of truth.
 */
export function toWireAddress(value: AddressValue, country?: string): Record<string, unknown> {
  const c = getCountry(country ?? value.country);
  const lines = formatAddressLines(value, { country: c.code, includeName: false, includeCountry: false });

  return {
    line1: (value.line1 ?? lines[0] ?? '').toString(),
    // Everything after the first line, not just the second.
    //
    // A Qatari address renders as four lines (building, street, zone, area+city).
    // Taking only `lines[1]` dropped the zone entirely for any consumer reading
    // the flat envelope — and the zone is the element a Qatari courier actually
    // routes on, so the parcel becomes undeliverable while the record still
    // looks complete.
    line2: (value.line2 ?? lines.slice(1, -1).join(', ')).toString(),
    city: (value.city ?? c.defaultCity).toString(),
    // Qatar has no state/province tier. The zone is the closest equivalent and
    // is the routing element, so it takes the slot; the district name is kept
    // in `area` alongside.
    state: (
      value.state
      ?? (value.zoneNumber ? `Zone ${value.zoneNumber}` : undefined)
      ?? value.area
      ?? ''
    ).toString(),
    postalCode: (value.postalCode ?? '').toString(),
    country: c.code,
    phone: (value.phone ?? '').toString(),
    fullName: (value.fullName ?? '').toString(),
    // Region-native fields, kept verbatim.
    buildingNumber: value.buildingNumber ?? null,
    streetNumber: value.streetNumber ?? null,
    zoneNumber: value.zoneNumber ?? null,
    area: value.area ?? null,
    unit: value.unit ?? null,
    landmark: value.landmark ?? null,
    poBox: value.poBox ?? null,
  };
}

/** Whether this region uses postal codes at all. False for Qatar. */
export function hasPostalCode(country?: string): boolean {
  return getAddressSpec(country).hasPostalCode;
}

/** Guidance text shown above the address form, if the region has any. */
export function getAddressGuidance(country?: string): string | undefined {
  return getAddressSpec(country).guidance;
}

/**
 * Placeholder for the header's free-text "deliver to" search.
 *
 * It was hardcoded to "Enter city, area or PIN code", which asks a shopper in
 * Doha for an identifier Qatar does not issue. Built from the region's own
 * address fields so it names something the shopper can actually type: the
 * postal field's label where one exists, and the finest-grained locality field
 * where it does not.
 */
export function getLocationSearchPlaceholder(country?: string): string {
  const fields = getAddressSpec(country).fields;
  const postal = fields.find((f) => f.key === 'postalCode');
  if (postal) return `Enter city, area or ${postal.label.toLowerCase()}`;
  const area = fields.find((f) => f.key === 'area');
  return area ? `Enter city or ${area.label.toLowerCase()}` : 'Enter your delivery area';
}
