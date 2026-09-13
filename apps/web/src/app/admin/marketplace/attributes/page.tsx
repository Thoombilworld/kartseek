'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  ToggleRight,
  ToggleLeft,
  Filter,
  Type,
  Hash,
  List,
  Calendar,
  Palette,
  Ruler,
  ToggleLeft as TL,
  Boxes,
} from 'lucide-react';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

/**
 * Category Attributes — the schema every product form, filter facet and variant
 * picker in the platform is generated from.
 *
 * This screen used to be a mock: five hard-coded categories with invented ids
 * ('mobiles-tablets', 'fashion'), and Add / Edit / Delete that mutated local
 * state and returned. It *did* call `getAttributes()` — but the gateway answered
 * that route with a literal `{ data: [], total: 0 }` without asking the service,
 * so even the create path (which really did write a row) could never show what
 * it had written. Both ends are wired now, and everything here is the database.
 *
 * The consequential field is **Variant axis**. It is what tells the seller
 * portal that Colour and Size split a product into SKUs while Battery Capacity
 * merely describes it, and what tells the storefront to draw swatches. Nothing
 * expressed that before, so each surface guessed from the attribute's name.
 */

// ── Types ───────────────────────────────────────────────────────────────────

type AttrType =
  | 'TEXT'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN'
  | 'COLOR'
  | 'DATE'
  | 'RANGE';

interface AttributeOption {
  label: string;
  value: string;
  /** CSS colour for COLOR attributes — what paints the storefront swatch. */
  hex?: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: AttrType;
  options: AttributeOption[] | null;
  unit: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVariantAxis: boolean;
  isActive: boolean;
  sortOrder: number;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
  /** Specification group heading on the product page, e.g. "Display". */
  groupName: string | null;
  /** Whether the value goes into the product page's highlights list. */
  isHighlight: boolean;
  /** Numeric bounds the seller's value must respect (NUMBER / RANGE). */
  minValue: number | null;
  maxValue: number | null;
}

interface AdminCategoryRow {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
}

const typeIcons: Record<AttrType, React.ReactNode> = {
  TEXT: <Type className="w-3.5 h-3.5" />,
  NUMBER: <Hash className="w-3.5 h-3.5" />,
  SELECT: <List className="w-3.5 h-3.5" />,
  MULTI_SELECT: <List className="w-3.5 h-3.5" />,
  BOOLEAN: <TL className="w-3.5 h-3.5" />,
  COLOR: <Palette className="w-3.5 h-3.5" />,
  DATE: <Calendar className="w-3.5 h-3.5" />,
  RANGE: <Ruler className="w-3.5 h-3.5" />,
};

const typeLabels: Record<AttrType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  SELECT: 'Single Select',
  MULTI_SELECT: 'Multi Select',
  BOOLEAN: 'Yes/No',
  COLOR: 'Colour',
  DATE: 'Date',
  RANGE: 'Range',
};

/** Types whose values are a fixed list — the only ones a variant can be built on. */
const VALUED_TYPES: AttrType[] = ['SELECT', 'MULTI_SELECT', 'COLOR'];

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Rows out of a gateway list response, wherever the envelope put them. */
function rowsOf(payload: any): any[] {
  const inner = payload?.data ?? payload;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

// ── Modal ───────────────────────────────────────────────────────────────────

function AttrModal({
  attr,
  categories,
  defaultCategoryId,
  onSave,
  onClose,
  saving,
}: {
  attr?: Attribute;
  categories: AdminCategoryRow[];
  defaultCategoryId: string | null;
  onSave: (data: Partial<Attribute>) => void | Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(attr?.name || '');
  const [slug, setSlug] = useState(attr?.slug || '');
  const [type, setType] = useState<AttrType>(attr?.type || 'SELECT');
  const [categoryId, setCategoryId] = useState<string>(attr?.categoryId ?? defaultCategoryId ?? '');
  const [unit, setUnit] = useState(attr?.unit || '');
  const [isRequired, setRequired] = useState<boolean>(attr?.isRequired ?? false);
  const [isFilterable, setFilterable] = useState<boolean>(attr?.isFilterable ?? true);
  const [isSearchable, setSearchable] = useState<boolean>(attr?.isSearchable ?? false);
  const [isVariantAxis, setVariantAxis] = useState<boolean>(attr?.isVariantAxis ?? false);
  const [options, setOptions] = useState<AttributeOption[]>(attr?.options ?? []);
  const [newVal, setNewVal] = useState('');
  const [newHex, setNewHex] = useState('#3b82f6');
  // How the value is presented on the product page: which specification
  // group it sits under, whether it earns a highlight bullet, and the numeric
  // bounds a seller's value must respect.
  const [groupName, setGroupName] = useState(attr?.groupName ?? '');
  const [isHighlight, setHighlight] = useState<boolean>(attr?.isHighlight ?? false);
  const [minValue, setMinValue] = useState(
    attr?.minValue === null || attr?.minValue === undefined ? '' : String(attr.minValue),
  );
  const [maxValue, setMaxValue] = useState(
    attr?.maxValue === null || attr?.maxValue === undefined ? '' : String(attr.maxValue),
  );
  const rangeInvalid = minValue !== '' && maxValue !== '' && Number(minValue) > Number(maxValue);

  const hasValues = VALUED_TYPES.includes(type);
  const isColour = type === 'COLOR';

  const addValue = () => {
    const label = newVal.trim();
    if (!label) return;
    setOptions((prev) => [
      ...prev.filter((o) => o.value !== slugify(label)),
      isColour ? { label, value: slugify(label), hex: newHex } : { label, value: slugify(label) },
    ]);
    setNewVal('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">
            {attr ? 'Edit Attribute' : 'Add Attribute'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="attr-name"
              >
                Name *
              </label>
              <input
                id="attr-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!attr) setSlug(slugify(e.target.value));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. RAM"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="attr-slug"
              >
                Slug
              </label>
              <input
                id="attr-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono"
                placeholder="e.g. ram"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="attr-type"
              >
                Type
              </label>
              <select
                id="attr-type"
                value={type}
                onChange={(e) => setType(e.target.value as AttrType)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
              >
                {(Object.keys(typeLabels) as AttrType[]).map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="attr-category"
              >
                Category
              </label>
              {/* "All categories" is a real option, not a blank: an attribute with
                  no category applies platform-wide and is inherited everywhere. */}
              <select
                id="attr-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
              >
                <option value="">All categories (global)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasValues && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                Values ({options.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {options.map((o) => (
                  <span
                    key={o.value}
                    className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg"
                  >
                    {o.hex && (
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300"
                        style={{ backgroundColor: o.hex }}
                      />
                    )}
                    {o.label}
                    <button
                      onClick={() => setOptions((prev) => prev.filter((p) => p.value !== o.value))}
                      className="text-slate-400 hover:text-red-500"
                      aria-label={`Remove ${o.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue();
                    }
                  }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                  placeholder="Add a value…"
                />
                {/* The swatch a shopper actually sees. Without it the storefront
                    can only guess a colour from its name, and any shade it does
                    not recognise renders as a grey chip. */}
                {isColour && (
                  <input
                    type="color"
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                    aria-label="Swatch colour"
                    title="Swatch colour"
                    className="w-12 h-11 border border-slate-200 rounded-xl cursor-pointer"
                  />
                )}
                <button
                  onClick={addValue}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
                  aria-label="Add value"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="attr-group"
              >
                Specification group
              </label>
              <input
                id="attr-group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                list="attr-group-options"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                placeholder="e.g. Display, Performance, Warranty"
                maxLength={60}
              />
              <datalist id="attr-group-options">
                {[
                  'General',
                  'Performance',
                  'Display',
                  'Camera',
                  'Battery',
                  'Connectivity',
                  'Dimensions',
                  'Material',
                  'Fit',
                  'Care',
                  'Warranty',
                  'In the box',
                ].map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-400 mt-1">
                The heading this attribute sits under on the product page.
              </p>
            </div>
            {(type === 'NUMBER' || type === 'RANGE') && (
              <div>
                <label
                  className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                  htmlFor="attr-unit"
                >
                  Unit
                </label>
                <input
                  id="attr-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                  placeholder="e.g. mAh, inches, kg"
                />
              </div>
            )}
          </div>

          {(type === 'NUMBER' || type === 'RANGE') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                  htmlFor="attr-min"
                >
                  Minimum
                </label>
                <input
                  id="attr-min"
                  type="number"
                  step="any"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none ${rangeInvalid ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  placeholder="none"
                />
              </div>
              <div>
                <label
                  className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                  htmlFor="attr-max"
                >
                  Maximum
                </label>
                <input
                  id="attr-max"
                  type="number"
                  step="any"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none ${rangeInvalid ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  placeholder="none"
                />
              </div>
              <p className="col-span-2 text-[11px] text-slate-400 -mt-1">
                {rangeInvalid ? (
                  <span className="text-red-500 font-semibold">
                    The minimum must not exceed the maximum.
                  </span>
                ) : (
                  'A seller value outside these bounds is refused on save — this is what stops "RAM: 999999".'
                )}
              </p>
            </div>
          )}

          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              isVariantAxis ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
            } ${hasValues ? '' : 'opacity-50 pointer-events-none'}`}
          >
            <input
              type="checkbox"
              checked={isVariantAxis && hasValues}
              disabled={!hasValues}
              onChange={(e) => setVariantAxis(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-blue-600" /> Variant axis
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                {hasValues
                  ? 'Sellers create one SKU per value, and the storefront shows a picker. Use for Colour, Size, Storage — not for specifications.'
                  : 'Only Single Select, Multi Select and Colour attributes can be variant axes.'}
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {[
              { label: 'Required', val: isRequired, set: setRequired },
              { label: 'Filterable', val: isFilterable, set: setFilterable },
              { label: 'Searchable', val: isSearchable, set: setSearchable },
              { label: 'Highlight', val: isHighlight, set: setHighlight },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.val}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim(),
                slug: slug || slugify(name),
                type,
                categoryId: categoryId || null,
                unit: unit.trim() || null,
                options: hasValues ? options : null,
                isRequired,
                isFilterable,
                isSearchable,
                isVariantAxis: isVariantAxis && hasValues,
                groupName: groupName.trim() || null,
                isHighlight,
                minValue:
                  (type === 'NUMBER' || type === 'RANGE') && minValue !== ''
                    ? Number(minValue)
                    : null,
                maxValue:
                  (type === 'NUMBER' || type === 'RANGE') && maxValue !== ''
                    ? Number(maxValue)
                    : null,
              })
            }
            disabled={!name.trim() || saving || rangeInvalid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : attr ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AttributesPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editAttr, setEditAttr] = useState<Attribute | undefined>(undefined);
  const [modalCatId, setModalCatId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoriesRes = useAdminData(() => adminMarketplaceApi.getCategories(), []);
  const attributesRes = useAdminData(() => adminMarketplaceApi.getAttributes(), []);
  const { execute } = useAdminAction(attributesRes.showToast);

  const categories: AdminCategoryRow[] = useMemo(
    () =>
      rowsOf(categoriesRes.data).map((c: any) => ({
        id: String(c.id),
        name: c.name ?? c.slug ?? 'Category',
        slug: c.slug,
        icon: c.icon,
      })),
    [categoriesRes.data],
  );

  const attributes: Attribute[] = useMemo(
    () =>
      rowsOf(attributesRes.data).map((a: any) => ({
        id: String(a.id),
        name: a.name ?? '',
        slug: a.slug ?? '',
        type: String(a.type ?? 'TEXT').toUpperCase() as AttrType,
        options: Array.isArray(a.options) ? a.options : null,
        unit: a.unit ?? null,
        isRequired: !!a.isRequired,
        isFilterable: !!a.isFilterable,
        isSearchable: !!a.isSearchable,
        isVariantAxis: !!a.isVariantAxis,
        isActive: a.isActive !== false,
        sortOrder: Number(a.sortOrder ?? 0),
        categoryId: a.categoryId ?? null,
        category: a.category ?? null,
        groupName: a.groupName ? String(a.groupName) : null,
        isHighlight: !!a.isHighlight,
        minValue:
          a.minValue === null || a.minValue === undefined || a.minValue === ''
            ? null
            : Number(a.minValue),
        maxValue:
          a.maxValue === null || a.maxValue === undefined || a.maxValue === ''
            ? null
            : Number(a.maxValue),
      })),
    [attributesRes.data],
  );

  /**
   * Attributes grouped under the category that owns them.
   *
   * Only categories that have attributes are listed, plus the global bucket.
   * Rendering all 113 categories as empty accordions would bury the ones an
   * admin has configured.
   */
  const groups = useMemo(() => {
    const byCategory = new Map<string, Attribute[]>();
    for (const attr of attributes) {
      const key = attr.categoryId ?? '__global__';
      byCategory.set(key, [...(byCategory.get(key) ?? []), attr]);
    }
    return [...byCategory.entries()]
      .map(([key, list]) => ({
        key,
        categoryId: key === '__global__' ? null : key,
        name:
          key === '__global__'
            ? 'All categories (global)'
            : (categories.find((c) => c.id === key)?.name ??
              list[0]?.category?.name ??
              'Unassigned category'),
        attributes: list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attributes, categories]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        attributes: g.attributes.filter(
          (a) => a.name.toLowerCase().includes(q) || a.slug.includes(q),
        ),
      }))
      .filter((g) => g.attributes.length > 0);
  }, [groups, search]);

  const totalAttrs = attributes.length;
  const totalFilterable = attributes.filter((a) => a.isFilterable).length;
  const totalVariantAxes = attributes.filter((a) => a.isVariantAxis).length;

  const reload = useCallback(() => {
    attributesRes.refetch();
  }, [attributesRes]);

  const save = async (data: Partial<Attribute>) => {
    setSaving(true);
    try {
      const ok = await execute(
        () =>
          editAttr
            ? adminMarketplaceApi.updateAttribute(editAttr.id, data)
            : adminMarketplaceApi.createAttribute(data),
        editAttr ? 'Attribute updated' : 'Attribute created',
      );
      // `execute` returns null when the request failed. Only close then — the
      // old screen closed regardless, which made a rejected save (a duplicate
      // slug, say) look exactly like a successful one.
      if (ok !== null) {
        setShowModal(false);
        setEditAttr(undefined);
        reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (attr: Attribute) => {
    if (
      !confirm(
        `Deactivate "${attr.name}"? Existing products keep the values already saved against it.`,
      )
    )
      return;
    await execute(() => adminMarketplaceApi.deleteAttribute(attr.id), 'Attribute deactivated');
    reload();
  };

  const toggleActive = async (attr: Attribute) => {
    await execute(
      () => adminMarketplaceApi.updateAttribute(attr.id, { isActive: !attr.isActive } as any),
      attr.isActive ? 'Attribute deactivated' : 'Attribute activated',
    );
    reload();
  };

  const loading = attributesRes.loading || categoriesRes.loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Category Attributes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isFiltered ? `${regionLabel} — ` : ''}
            Define product attributes per category. Controls seller listing forms, storefront
            filters, and variant pickers.
          </p>
        </div>
        <button
          onClick={() => {
            setEditAttr(undefined);
            setModalCatId(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Attribute
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{groups.length}</p>
          <p className="text-xs text-slate-500 mt-1">Categories Configured</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{totalAttrs}</p>
          <p className="text-xs text-slate-500 mt-1">Total Attributes</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{totalFilterable}</p>
          <p className="text-xs text-slate-500 mt-1">Filterable</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-purple-600">{totalVariantAxes}</p>
          <p className="text-xs text-slate-500 mt-1">Variant Axes</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search attributes…"
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {attributesRes.error && !loading && (
        <AdminErrorBanner error={attributesRes.error} onRetry={reload} />
      )}

      {!loading && !attributesRes.error && filteredGroups.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">No attributes defined yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Attributes drive the seller listing form, the storefront filters and the variant
            pickers. Start with a Colour and a Size on your largest category and mark both as
            variant axes.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const isExpanded = expanded === group.key;
          const activeCount = group.attributes.filter((a) => a.isActive).length;
          return (
            <div
              key={group.key}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <div
                onClick={() => setExpanded(isExpanded ? null : group.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(isExpanded ? null : group.key);
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900">{group.name}</h3>
                    <p className="text-xs text-slate-400">
                      {group.attributes.length} attributes · {activeCount} active ·{' '}
                      {group.attributes.filter((a) => a.isVariantAxis).length} variant axes
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalCatId(group.categoryId);
                    setEditAttr(undefined);
                    setShowModal(true);
                  }}
                  className="flex items-center gap-1 text-blue-600 text-xs font-bold hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm min-w-180">
                    <thead className="bg-slate-50 text-slate-500 text-xs">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-bold">Attribute</th>
                        <th className="text-left px-4 py-2.5 font-bold">Type</th>
                        <th className="text-left px-4 py-2.5 font-bold">Values</th>
                        <th className="text-center px-4 py-2.5 font-bold">Variant axis</th>
                        <th className="text-center px-4 py-2.5 font-bold">Flags</th>
                        <th className="text-center px-4 py-2.5 font-bold">Status</th>
                        <th className="text-right px-4 py-2.5 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.attributes.map((attr) => (
                        <tr key={attr.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">{attr.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {attr.slug}
                              {attr.unit ? ` · ${attr.unit}` : ''}
                              {attr.minValue !== null || attr.maxValue !== null
                                ? ` · ${attr.minValue ?? '…'}–${attr.maxValue ?? '…'}`
                                : ''}
                            </p>
                            {(attr.groupName || attr.isHighlight) && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {attr.groupName && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1">
                                    {attr.groupName}
                                  </span>
                                )}
                                {attr.isHighlight && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                    HIGHLIGHT
                                  </span>
                                )}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                              {typeIcons[attr.type] ?? <Type className="w-3.5 h-3.5" />}{' '}
                              {typeLabels[attr.type] ?? attr.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {attr.options?.length ? (
                              <div className="flex flex-wrap gap-1 max-w-65">
                                {attr.options.slice(0, 5).map((o) => (
                                  <span
                                    key={o.value}
                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] px-1.5 py-0.5 rounded"
                                  >
                                    {o.hex && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                        style={{ backgroundColor: o.hex }}
                                      />
                                    )}
                                    {o.label}
                                  </span>
                                ))}
                                {attr.options.length > 5 && (
                                  <span className="text-[11px] text-slate-400">
                                    +{attr.options.length - 5}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {attr.isVariantAxis ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <Boxes className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {attr.isRequired && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  REQ
                                </span>
                              )}
                              {attr.isFilterable && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                                  <Filter className="w-2.5 h-2.5" />
                                  FILTER
                                </span>
                              )}
                              {attr.isSearchable && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  SEARCH
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleActive(attr)}
                              className="inline-flex items-center gap-1.5"
                              aria-label={attr.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {attr.isActive ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-emerald-500" />
                                  <span className="text-xs text-emerald-600 font-bold">Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-slate-300" />
                                  <span className="text-xs text-slate-400 font-bold">Inactive</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditAttr(attr);
                                  setModalCatId(attr.categoryId);
                                  setShowModal(true);
                                }}
                                className="p-1.5 hover:bg-blue-50 rounded-lg"
                                title="Edit"
                                aria-label={`Edit ${attr.name}`}
                              >
                                <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                              </button>
                              <button
                                onClick={() => remove(attr)}
                                className="p-1.5 hover:bg-red-50 rounded-lg"
                                title="Deactivate"
                                aria-label={`Deactivate ${attr.name}`}
                              >
                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <AttrModal
          attr={editAttr}
          categories={categories}
          defaultCategoryId={modalCatId}
          saving={saving}
          onSave={save}
          onClose={() => {
            setShowModal(false);
            setEditAttr(undefined);
          }}
        />
      )}

      <AdminToast toast={attributesRes.toast} />
    </div>
  );
}
