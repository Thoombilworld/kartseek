import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository, TreeRepository, type EntityManager } from 'typeorm';
import { Category } from '../entities/category.entity';
import { ProductAttribute, type AttributeOption } from '../entities/product-attribute.entity';
import { ProductAttributeValue } from '../entities/product-attribute-value.entity';

export type AttributeType =
  | 'TEXT'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN'
  | 'COLOR'
  | 'DATE'
  | 'RANGE';

const ATTRIBUTE_TYPES: ReadonlySet<string> = new Set([
  'TEXT',
  'NUMBER',
  'SELECT',
  'MULTI_SELECT',
  'BOOLEAN',
  'COLOR',
  'DATE',
  'RANGE',
]);

/** What a seller or admin submits: the attribute by id or slug, and its value. */
export interface AttributeInput {
  attributeId?: string;
  slug?: string;
  value: unknown;
}

/** One rejected input, addressed by the definition's slug so a form can mark the field. */
export interface AttributeValidationError {
  slug: string;
  message: string;
}

/**
 * The public row shape: what `GET /marketplace/products/:id` carries in
 * `attributes[]` and `specificationGroups[].attributes[]`.
 */
export interface AttributeValueRow {
  id: string;
  slug: string;
  name: string;
  group: string;
  type: AttributeType;
  value: string | number | boolean | string[] | { min: number; max: number };
  unit: string | null;
  displayValue: string;
  isHighlight: boolean;
  sortOrder: number;
}

export interface SpecificationGroup {
  group: string;
  attributes: AttributeValueRow[];
}

export interface PresentedAttributes {
  attributes: AttributeValueRow[];
  specificationGroups: SpecificationGroup[];
  highlights: string[];
}

const GENERAL_GROUP = 'General';
const MAX_TEXT_LENGTH = 500;
const MAX_HIGHLIGHTS = 8;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Product attribute values: validation against the category's definitions,
 * storage, and the shapes the product page renders.
 *
 * The rules live here and nowhere else. The seller form mirrors them for a
 * good experience, but a value that reaches the database has passed this
 * class — `RAM = "hello"`, `Battery = -5000 mAh`, `Screen size = 999999 inch`
 * are refused server-side whatever the client sent.
 */
@Injectable()
export class AttributeValuesService {
  constructor(
    @InjectRepository(ProductAttribute)
    private readonly definitionRepo: Repository<ProductAttribute>,
    @InjectRepository(ProductAttributeValue)
    private readonly valueRepo: Repository<ProductAttributeValue>,
    @InjectRepository(Category)
    private readonly categoryRepo: TreeRepository<Category>,
  ) {}

  /** `text` and `Number` are the same type; the column has never been constrained. */
  static normaliseType(raw: unknown): AttributeType {
    const t = String(raw ?? 'TEXT')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    return (ATTRIBUTE_TYPES.has(t) ? t : 'TEXT') as AttributeType;
  }

  /**
   * The definitions that apply to a product in a category: the category's
   * own, its ancestors' (a subcategory inherits the parent's schema) and the
   * global set. A child's definition wins over an inherited one with the same
   * slug. Same resolution as the category-attributes read the seller form
   * uses, so the form and the validator agree on what exists.
   */
  async definitionsForCategories(categoryIds: string[]): Promise<ProductAttribute[]> {
    const ids = [...new Set(categoryIds.filter(Boolean))];
    const lineage: string[] = [];
    for (const id of ids) {
      const category = await this.categoryRepo.findOne({ where: { id } });
      if (!category) continue;
      const ancestors = await this.categoryRepo.findAncestors(category).catch(() => [category]);
      for (const c of ancestors) if (!lineage.includes(c.id)) lineage.push(c.id);
      if (!lineage.includes(category.id)) lineage.push(category.id);
    }
    const rows = await this.definitionRepo.find({
      where: lineage.length
        ? [
            { isActive: true, categoryId: In(lineage) },
            { isActive: true, categoryId: IsNull() },
          ]
        : { isActive: true, categoryId: IsNull() },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    // Deeper category wins: a leaf's "Size" replaces the parent's "Size".
    const depth = (a: ProductAttribute) => (a.categoryId ? lineage.indexOf(a.categoryId) : -1);
    const bySlug = new Map<string, ProductAttribute>();
    for (const def of [...rows].sort((a, b) => depth(a) - depth(b))) bySlug.set(def.slug, def);
    return [...bySlug.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }

  /**
   * Check submitted values against the definitions.
   *
   * `requireAll` enforces `isRequired` (used on create, and whenever a seller
   * sends the attribute set at all). Variant axes are never required at the
   * product level: colour and size belong to the SKUs, which carry their own.
   */
  static validate(
    definitions: ProductAttribute[],
    inputs: AttributeInput[],
    options: { requireAll: boolean },
  ): { rows: Partial<ProductAttributeValue>[]; errors: AttributeValidationError[] } {
    const errors: AttributeValidationError[] = [];
    const rows: Partial<ProductAttributeValue>[] = [];
    const byId = new Map(definitions.map((d) => [d.id, d]));
    const bySlug = new Map(definitions.map((d) => [d.slug, d]));
    const seen = new Set<string>();

    for (const input of Array.isArray(inputs) ? inputs : []) {
      const def =
        (input?.attributeId && byId.get(String(input.attributeId))) ||
        (input?.slug && bySlug.get(String(input.slug).trim().toLowerCase())) ||
        null;
      const label = String(input?.slug ?? input?.attributeId ?? '').trim() || '(unknown)';
      if (!def) {
        errors.push({ slug: label, message: `${label} is not an attribute of this category.` });
        continue;
      }
      if (seen.has(def.id)) {
        errors.push({ slug: def.slug, message: `${def.name} was submitted more than once.` });
        continue;
      }
      seen.add(def.id);

      const outcome = AttributeValuesService.coerce(def, input.value);
      if ('error' in outcome) {
        errors.push({ slug: def.slug, message: outcome.error });
        continue;
      }
      rows.push({ attributeId: def.id, ...outcome.row });
    }

    if (options.requireAll) {
      for (const def of definitions) {
        if (def.isRequired && !def.isVariantAxis && !seen.has(def.id)) {
          errors.push({ slug: def.slug, message: `${def.name} is required.` });
        }
      }
    }
    return { rows, errors };
  }

  /** Coerce one value to its storage columns, or explain why it cannot be. */
  private static coerce(
    def: ProductAttribute,
    raw: unknown,
  ): { row: Partial<ProductAttributeValue> } | { error: string } {
    const type = AttributeValuesService.normaliseType(def.type);
    const unit = def.unit ? ` ${def.unit}` : '';
    const empty = { valueText: null, valueNumber: null, valueBool: null, valueJson: null };
    const options = Array.isArray(def.options) ? def.options : [];

    if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) {
      return { error: `${def.name} needs a value.` };
    }

    switch (type) {
      case 'NUMBER': {
        const n = AttributeValuesService.toNumber(raw);
        if (n === null) return { error: `${def.name} must be a number${unit}.` };
        const bound = AttributeValuesService.checkBounds(def, n);
        if (bound) return { error: bound };
        return { row: { ...empty, valueNumber: n.toFixed(4) } };
      }
      case 'BOOLEAN': {
        const b = AttributeValuesService.toBoolean(raw);
        if (b === null) return { error: `${def.name} must be yes or no.` };
        return { row: { ...empty, valueBool: b } };
      }
      case 'SELECT':
      case 'COLOR': {
        if (!options.length) return AttributeValuesService.coerceText(def, raw, empty);
        const match = AttributeValuesService.matchOption(options, raw);
        if (!match) {
          return {
            error: `${def.name} must be one of: ${options.map((o) => o.label).join(', ')}.`,
          };
        }
        return { row: { ...empty, valueText: match.value } };
      }
      case 'MULTI_SELECT': {
        const list = Array.isArray(raw)
          ? raw
          : String(raw)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
        if (!list.length) return { error: `${def.name} needs at least one value.` };
        const values: string[] = [];
        for (const item of list) {
          if (options.length) {
            const match = AttributeValuesService.matchOption(options, item);
            if (!match) {
              return {
                error: `${def.name} must only contain: ${options.map((o) => o.label).join(', ')}.`,
              };
            }
            if (!values.includes(match.value)) values.push(match.value);
          } else {
            const text = AttributeValuesService.cleanText(item);
            if (!text) return { error: `${def.name} must not contain HTML or be empty.` };
            if (!values.includes(text)) values.push(text);
          }
        }
        return { row: { ...empty, valueJson: values } };
      }
      case 'DATE': {
        const s = String(raw).trim();
        if (!ISO_DATE.test(s) || Number.isNaN(Date.parse(s))) {
          return { error: `${def.name} must be a date in YYYY-MM-DD form.` };
        }
        return { row: { ...empty, valueText: s } };
      }
      case 'RANGE': {
        const obj = raw as { min?: unknown; max?: unknown };
        const min = AttributeValuesService.toNumber(obj?.min);
        const max = AttributeValuesService.toNumber(obj?.max);
        if (min === null || max === null) {
          return { error: `${def.name} needs numeric min and max values${unit}.` };
        }
        if (min > max) return { error: `${def.name}: min must not exceed max.` };
        const bound =
          AttributeValuesService.checkBounds(def, min) ??
          AttributeValuesService.checkBounds(def, max);
        if (bound) return { error: bound };
        return { row: { ...empty, valueJson: { min, max } } };
      }
      case 'TEXT':
      default:
        return AttributeValuesService.coerceText(def, raw, empty);
    }
  }

  private static coerceText(
    def: ProductAttribute,
    raw: unknown,
    empty: Partial<ProductAttributeValue>,
  ): { row: Partial<ProductAttributeValue> } | { error: string } {
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      return { error: `${def.name} must be text.` };
    }
    const text = AttributeValuesService.cleanText(String(raw));
    if (!text) return { error: `${def.name} must not contain HTML or be empty.` };
    if (text.length > MAX_TEXT_LENGTH) {
      return { error: `${def.name} must be ${MAX_TEXT_LENGTH} characters or fewer.` };
    }
    return { row: { ...empty, valueText: text } };
  }

  /** Plain text only: markup is refused rather than stripped, so a seller learns why. */
  private static cleanText(raw: string): string | null {
    // Control characters are dropped (tab, newline and carriage return stay).
    const text = raw
      .replace(/\p{Cc}/gu, (c) => (c === '\t' || c === '\n' || c === '\r' ? c : ''))
      .trim();
    if (!text || /[<>]/.test(text)) return null;
    return text;
  }

  private static toNumber(raw: unknown): number | null {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    if (typeof raw !== 'string') return null;
    const s = raw.trim().replace(/,/g, '');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  private static toBoolean(raw: unknown): boolean | null {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1 ? true : raw === 0 ? false : null;
    const s = String(raw).trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'on'].includes(s)) return true;
    if (['false', 'no', 'n', '0', 'off'].includes(s)) return false;
    return null;
  }

  private static checkBounds(def: ProductAttribute, n: number): string | null {
    const unit = def.unit ? ` ${def.unit}` : '';
    const min = def.minValue == null ? null : Number(def.minValue);
    const max = def.maxValue == null ? null : Number(def.maxValue);
    if (min != null && Number.isFinite(min) && n < min) {
      return `${def.name} must be at least ${AttributeValuesService.fmt(min)}${unit}.`;
    }
    if (max != null && Number.isFinite(max) && n > max) {
      return `${def.name} must be at most ${AttributeValuesService.fmt(max)}${unit}.`;
    }
    return null;
  }

  private static matchOption(options: AttributeOption[], raw: unknown): AttributeOption | null {
    const s = String(raw ?? '')
      .trim()
      .toLowerCase();
    if (!s) return null;
    return (
      options.find((o) => String(o.value).toLowerCase() === s) ??
      options.find((o) => String(o.label).toLowerCase() === s) ??
      null
    );
  }

  private static fmt(n: number): string {
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)));
  }

  /**
   * Replace a product's values with `rows`, in one transaction, so a form
   * that removes an attribute removes its value and a half-applied edit can
   * never be read.
   */
  async replaceForProduct(
    productId: string,
    rows: Partial<ProductAttributeValue>[],
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (m: EntityManager) => {
      const repo = m.getRepository(ProductAttributeValue);
      await repo.delete({ productId });
      if (rows.length) {
        await repo.save(rows.map((r) => repo.create({ ...r, productId } as ProductAttributeValue)));
      }
    };
    if (manager) return run(manager);
    return this.valueRepo.manager.transaction(run);
  }

  /** Values for a set of products, with their definitions, in the public row shape. */
  async forProducts(productIds: string[]): Promise<Map<string, AttributeValueRow[]>> {
    const result = new Map<string, AttributeValueRow[]>();
    const ids = [...new Set(productIds.filter(Boolean))];
    if (!ids.length) return result;
    const values = await this.valueRepo.find({
      where: { productId: In(ids) },
      relations: { attribute: true },
    });
    for (const v of values) {
      const def = v.attribute;
      if (!def || def.isActive === false) continue;
      const row = AttributeValuesService.toRow(def, v);
      if (!row) continue;
      const list = result.get(v.productId) ?? [];
      list.push(row);
      result.set(v.productId, list);
    }
    for (const [id, list] of result) {
      result.set(
        id,
        list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      );
    }
    return result;
  }

  /** One stored value as the page reads it; null when the row carries nothing usable. */
  static toRow(def: ProductAttribute, v: ProductAttributeValue): AttributeValueRow | null {
    const type = AttributeValuesService.normaliseType(def.type);
    const options = Array.isArray(def.options) ? def.options : [];
    const unit = def.unit ?? null;
    const labelOf = (value: string) =>
      options.find((o) => String(o.value) === value)?.label ?? value;
    let value: AttributeValueRow['value'];
    let displayValue: string;

    switch (type) {
      case 'NUMBER': {
        if (v.valueNumber == null) return null;
        const n = Number(v.valueNumber);
        if (!Number.isFinite(n)) return null;
        value = n;
        displayValue = unit
          ? `${AttributeValuesService.fmt(n)} ${unit}`
          : AttributeValuesService.fmt(n);
        break;
      }
      case 'BOOLEAN':
        if (v.valueBool == null) return null;
        value = v.valueBool;
        displayValue = v.valueBool ? 'Yes' : 'No';
        break;
      case 'MULTI_SELECT': {
        const list = Array.isArray(v.valueJson) ? (v.valueJson as unknown[]).map(String) : [];
        if (!list.length) return null;
        value = list;
        displayValue = list.map(labelOf).join(', ');
        break;
      }
      case 'RANGE': {
        const r = v.valueJson as { min?: unknown; max?: unknown } | null;
        const min = Number(r?.min);
        const max = Number(r?.max);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        value = { min, max };
        displayValue = `${AttributeValuesService.fmt(min)}–${AttributeValuesService.fmt(max)}${unit ? ` ${unit}` : ''}`;
        break;
      }
      case 'SELECT':
      case 'COLOR':
      case 'DATE':
      case 'TEXT':
      default:
        if (v.valueText == null || !v.valueText.trim()) return null;
        value = v.valueText;
        displayValue = type === 'SELECT' || type === 'COLOR' ? labelOf(v.valueText) : v.valueText;
        break;
    }

    return {
      id: def.id,
      slug: def.slug,
      name: def.name,
      group: def.groupName?.trim() || GENERAL_GROUP,
      type,
      value,
      unit,
      displayValue,
      isHighlight: !!def.isHighlight,
      sortOrder: def.sortOrder ?? 0,
    };
  }

  /**
   * The three shapes the product page renders, all derived from the rows:
   * the flat list, the grouped specification table (groups in first-seen
   * order, only groups with values), and the highlights (attributes the
   * definition flags, `Name: value`; a true boolean is just its name, a false
   * one is not a highlight of anything).
   */
  static present(rows: AttributeValueRow[]): PresentedAttributes {
    const groups = new Map<string, AttributeValueRow[]>();
    for (const row of rows) {
      const list = groups.get(row.group) ?? [];
      list.push(row);
      groups.set(row.group, list);
    }
    const specificationGroups: SpecificationGroup[] = [...groups.entries()].map(
      ([group, attributes]) => ({ group, attributes }),
    );
    const highlights: string[] = [];
    for (const row of rows) {
      if (!row.isHighlight || highlights.length >= MAX_HIGHLIGHTS) continue;
      if (row.type === 'BOOLEAN') {
        if (row.value === true) highlights.push(row.name);
        continue;
      }
      highlights.push(`${row.name}: ${row.displayValue}`);
    }
    return { attributes: rows, specificationGroups, highlights };
  }
}
