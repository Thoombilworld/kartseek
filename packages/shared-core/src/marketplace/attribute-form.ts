/**
 * Category-driven attribute fields for the seller product form.
 *
 * The category's attribute definitions (`GET /marketplace/categories/:slug/
 * attributes`) decide which fields a seller fills in: a phone form asks for
 * RAM, storage and battery because the phone category defines them; a jacket
 * form asks for material and fit. Nothing here is a fixed template.
 *
 * Validation mirrors the server's rules — type, allowed options, numeric
 * range, required — so the seller sees the refusal beside the field before
 * submitting. The server re-validates every value regardless; this is the
 * courtesy copy, never the authority.
 */
import type { CategoryAttribute } from './variant-display';

export type AttributeFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'COLOR'
  | 'DATE'
  | 'RANGE';

/** A category attribute definition as the form needs it. */
export interface AttributeField {
  id: string;
  slug: string;
  name: string;
  type: AttributeFieldType;
  group: string;
  unit: string | null;
  options: Array<{ label: string; value: string; hex?: string }>;
  isRequired: boolean;
  /** Variant axes are entered per SKU on the variants page, not here. */
  isVariantAxis: boolean;
  isHighlight: boolean;
  minValue: number | null;
  maxValue: number | null;
  sortOrder: number;
}

/** The form's value store: attribute slug → what the seller typed. */
export type AttributeValues = Record<string, string | string[] | boolean | null | undefined>;

const FIELD_TYPES: ReadonlySet<string> = new Set([
  'TEXT',
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTI_SELECT',
  'COLOR',
  'DATE',
  'RANGE',
]);

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Definitions → form fields, in admin order, variant axes excluded. */
export function attributeFields(
  definitions: Array<CategoryAttribute | Record<string, any>> | null | undefined,
): AttributeField[] {
  return (definitions ?? [])
    .filter((d: any) => d && d.isActive !== false)
    .map((d: any): AttributeField => {
      const type = String(d.type ?? 'TEXT').toUpperCase();
      return {
        id: String(d.id ?? ''),
        slug: String(d.slug ?? ''),
        name: String(d.name ?? d.slug ?? ''),
        type: (FIELD_TYPES.has(type) ? type : 'TEXT') as AttributeFieldType,
        group: String(d.groupName ?? d.group ?? '').trim() || 'General',
        unit: d.unit ? String(d.unit) : null,
        options: Array.isArray(d.options)
          ? d.options
              .map((o: any) =>
                typeof o === 'string'
                  ? { label: o, value: o }
                  : {
                      label: String(o?.label ?? o?.value ?? ''),
                      value: String(o?.value ?? o?.label ?? ''),
                      ...(o?.hex ? { hex: String(o.hex) } : {}),
                    },
              )
              .filter((o: { label: string; value: string }) => o.value)
          : [],
        isRequired: Boolean(d.isRequired),
        isVariantAxis: Boolean(d.isVariantAxis),
        isHighlight: Boolean(d.isHighlight),
        minValue: num(d.minValue),
        maxValue: num(d.maxValue),
        sortOrder: Number(d.sortOrder) || 0,
      };
    })
    .filter((f) => f.slug && !f.isVariantAxis)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Fields grouped under their headings, in the order the first field of each group appears. */
export function groupFields(
  fields: AttributeField[],
): Array<{ group: string; fields: AttributeField[] }> {
  const groups = new Map<string, AttributeField[]>();
  for (const f of fields) groups.set(f.group, [...(groups.get(f.group) ?? []), f]);
  return [...groups.entries()].map(([group, rows]) => ({ group, fields: rows }));
}

const isBlank = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Validate one field's value. Returns the message to show, or null.
 *
 * The rules, in the order the server applies them: required, then type, then
 * allowed options, then numeric range. A blank optional field is valid.
 */
export function validateAttributeValue(field: AttributeField, raw: unknown): string | null {
  if (isBlank(raw)) return field.isRequired ? `${field.name} is required.` : null;

  switch (field.type) {
    case 'NUMBER': {
      const n = num(raw);
      if (n === null) return `${field.name} must be a number.`;
      if (field.minValue !== null && n < field.minValue) {
        return `${field.name} must be at least ${field.minValue}${field.unit ? ` ${field.unit}` : ''}.`;
      }
      if (field.maxValue !== null && n > field.maxValue) {
        return `${field.name} must be at most ${field.maxValue}${field.unit ? ` ${field.unit}` : ''}.`;
      }
      return null;
    }
    case 'RANGE': {
      const text = String(raw).trim();
      const m = /^(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)$/.exec(text);
      if (!m) return `${field.name} must be a range like "10-20".`;
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      if (lo > hi) return `${field.name}: the first number must not exceed the second.`;
      if (field.minValue !== null && lo < field.minValue)
        return `${field.name} must start at ${field.minValue} or more.`;
      if (field.maxValue !== null && hi > field.maxValue)
        return `${field.name} must end at ${field.maxValue} or less.`;
      return null;
    }
    case 'BOOLEAN': {
      const v = typeof raw === 'boolean' ? raw : String(raw).toLowerCase();
      if (v === true || v === false || v === 'true' || v === 'false' || v === 'yes' || v === 'no')
        return null;
      return `${field.name} must be Yes or No.`;
    }
    case 'SELECT':
    case 'COLOR': {
      const v = String(raw);
      if (field.options.length === 0) {
        return field.type === 'COLOR' && !HEX_RE.test(v) && v.length > 60
          ? `${field.name} is too long.`
          : null;
      }
      const ok = field.options.some((o) => o.value === v || o.label === v);
      return ok
        ? null
        : `${field.name} must be one of: ${field.options.map((o) => o.label).join(', ')}.`;
    }
    case 'MULTI_SELECT': {
      const values = Array.isArray(raw)
        ? raw.map(String)
        : String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      if (values.length === 0) return field.isRequired ? `${field.name} is required.` : null;
      if (field.options.length === 0) return null;
      const bad = values.filter((v) => !field.options.some((o) => o.value === v || o.label === v));
      return bad.length
        ? `${field.name}: ${bad.join(', ')} ${bad.length === 1 ? 'is' : 'are'} not an allowed value.`
        : null;
    }
    case 'DATE':
      return DATE_RE.test(String(raw)) && !Number.isNaN(Date.parse(String(raw)))
        ? null
        : `${field.name} must be a date (YYYY-MM-DD).`;
    case 'TEXT':
    default: {
      const text = String(raw);
      if (text.length > 500) return `${field.name} must be 500 characters or fewer.`;
      const n = num(text);
      if (n !== null) {
        if (field.minValue !== null && n < field.minValue)
          return `${field.name} must be at least ${field.minValue}.`;
        if (field.maxValue !== null && n > field.maxValue)
          return `${field.name} must be at most ${field.maxValue}.`;
      }
      return null;
    }
  }
}

/** Every field's message, keyed by slug; empty when the values are valid. */
export function validateAttributeValues(
  fields: AttributeField[],
  values: AttributeValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = validateAttributeValue(field, values[field.slug]);
    if (message) errors[field.slug] = message;
  }
  return errors;
}

/**
 * Form values → the `attributes[]` the seller routes accept.
 *
 * Blank optional fields are omitted rather than sent as empty strings, so an
 * edit that leaves a field untouched does not clear it. Numbers travel as
 * numbers, booleans as booleans, multi-selects as arrays — the server stores
 * typed values and validates the type.
 */
export function serialiseAttributeValues(
  fields: AttributeField[],
  values: AttributeValues,
): Array<{ attributeId: string; slug: string; value: string | number | boolean | string[] }> {
  const out: Array<{
    attributeId: string;
    slug: string;
    value: string | number | boolean | string[];
  }> = [];
  for (const field of fields) {
    const raw = values[field.slug];
    if (isBlank(raw)) continue;
    let value: string | number | boolean | string[];
    switch (field.type) {
      case 'NUMBER':
        value = Number(raw);
        break;
      case 'BOOLEAN':
        value =
          raw === true ||
          String(raw).toLowerCase() === 'true' ||
          String(raw).toLowerCase() === 'yes';
        break;
      case 'MULTI_SELECT':
        value = Array.isArray(raw)
          ? raw.map(String)
          : String(raw)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
        break;
      default:
        value = String(raw).trim();
    }
    out.push({ attributeId: field.id, slug: field.slug, value });
  }
  return out;
}

/** Stored values (from `GET /seller/products/:id`) → the form's value store. */
export function attributeValuesFromProduct(
  rows: Array<{ slug: string; value: unknown; type?: string }> | null | undefined,
): AttributeValues {
  const values: AttributeValues = {};
  for (const row of rows ?? []) {
    if (!row?.slug) continue;
    const v = row.value;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) values[row.slug] = v.map(String);
    else if (typeof v === 'boolean') values[row.slug] = v;
    else values[row.slug] = String(v);
  }
  return values;
}
