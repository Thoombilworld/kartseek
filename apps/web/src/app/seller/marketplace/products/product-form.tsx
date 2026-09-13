'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Package,
  PlusCircle,
  Save,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import {
  sellerApi,
  type SellerProductDetail,
  type SellerProductWrite,
} from '@/lib/modules/seller-api';
import { getCategories, getBrands } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api-endpoints';
import { useCategoryAttributes } from '@/lib/marketplace/use-category-attributes';
import {
  attributeFields,
  groupFields,
  validateAttributeValues,
  serialiseAttributeValues,
  attributeValuesFromProduct,
  type AttributeField,
  type AttributeValues,
} from '@/lib/marketplace/attribute-form';
import { buildCategoryTree, type CategoryNode } from '@/lib/marketplace/category-tree';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

/**
 * The seller's product form, for creating a product and for editing one.
 *
 * What it replaces: an "Add product" page whose Publish button slept for 1.5 s
 * and navigated away, whose category picker was a three-level literal that
 * named categories the catalogue does not have, and whose "specifications"
 * were free text that no reader ever displayed; and an "Edit product" page
 * whose Save did `setTimeout(setSaving(false), 1500)`.
 *
 * The category comes from the catalogue, and the category decides the
 * attribute fields (RAM, display size, material, fit…) through the same
 * definitions the storefront's specification table renders from. Values are
 * validated here for the seller's benefit and again on the server, which is
 * the authority; a server refusal is shown per field when it names the field.
 */

type Mode = 'create' | 'edit';

interface FormState {
  name: string;
  brandId: string;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  longDescription: string;
  sellingPrice: string;
  mrp: string;
  stock: string;
  sku: string;
  condition: 'NEW' | 'REFURBISHED' | 'USED';
  gtin: string;
}

const EMPTY: FormState = {
  name: '',
  brandId: '',
  categoryId: '',
  subcategoryId: '',
  shortDescription: '',
  longDescription: '',
  sellingPrice: '',
  mrp: '',
  stock: '0',
  sku: '',
  condition: 'NEW',
  gtin: '',
};

const num = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function fromDetail(p: SellerProductDetail): FormState {
  return {
    name: p.name ?? '',
    brandId: p.brand?.id ?? '',
    categoryId: p.category?.id ?? '',
    subcategoryId: p.subcategory?.id ?? '',
    shortDescription: p.short_description ?? '',
    longDescription: p.long_description ?? '',
    sellingPrice: p.listing ? String(p.listing.sellingPrice ?? '') : '',
    mrp: String(p.listing?.mrp ?? p.mrp ?? ''),
    stock: String(p.listing?.stockQuantity ?? 0),
    sku: p.listing?.sellerSku ?? '',
    condition: (p.listing?.condition ?? 'NEW').toUpperCase() as FormState['condition'],
    gtin: p.gtin ?? '',
  };
}

const approvalOf = (p: SellerProductDetail | undefined): string =>
  String(p?.approvalStatus ?? p?.approval_status ?? '').toUpperCase();

export function ProductForm({ mode, product }: { mode: Mode; product?: SellerProductDetail }) {
  const router = useRouter();
  const { format: money } = useSellerMoney();

  const [form, setForm] = useState<FormState>(() => (product ? fromDetail(product) : EMPTY));
  const [attributeValues, setAttributeValues] = useState<AttributeValues>(() =>
    product ? attributeValuesFromProduct(product.attributes) : {},
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReReview, setConfirmReReview] = useState(false);
  const [saved, setSaved] = useState<{
    productId: string;
    message: string;
    reReview: boolean;
  } | null>(null);

  // ── Reference data: the catalogue's own categories and brands ─────────────
  const [tree, setTree] = useState<CategoryNode[] | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }> | null>(null);
  const [refFailed, setRefFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getBrands()])
      .then(([cats, brs]) => {
        if (cancelled) return;
        setTree(buildCategoryTree(cats));
        const rows: any[] = Array.isArray(brs) ? brs : (brs?.data ?? []);
        setBrands(
          rows
            .filter((b) => b?.id && b?.name)
            .map((b) => ({ id: String(b.id), name: String(b.name) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => {
        if (!cancelled) setRefFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const category = useMemo(
    () => tree?.find((c) => c.id === form.categoryId) ?? null,
    [tree, form.categoryId],
  );
  const subcategory = useMemo(
    () => category?.children.find((c) => c.id === form.subcategoryId) ?? null,
    [category, form.subcategoryId],
  );

  // ── Attribute schema for the chosen (sub)category ─────────────────────────
  // The subcategory inherits the parent's definitions server-side, so the
  // narrowest slug is the one to ask for.
  const schemaKey = subcategory?.slug || category?.slug || undefined;
  const { schema, loading: schemaLoading } = useCategoryAttributes(schemaKey);
  const fields = useMemo<AttributeField[]>(() => attributeFields(schema?.data), [schema]);
  const groups = useMemo(() => groupFields(fields), [fields]);
  const variantAxes = useMemo(() => (schema?.data ?? []).filter((a) => a.isVariantAxis), [schema]);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const setAttr = (slug: string, value: AttributeValues[string]) => {
    setAttributeValues((prev) => ({ ...prev, [slug]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`attr:${slug}`];
      return next;
    });
  };

  // ── Validation (the courtesy copy; the server decides) ────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'A product name is required.';
    else if (form.name.trim().length > 200) e.name = 'Keep the name under 200 characters.';
    if (!form.categoryId) e.categoryId = 'Choose a category.';
    if (category && category.children.length > 0 && !form.subcategoryId)
      e.subcategoryId = 'Choose a subcategory.';

    if (mode === 'create') {
      const price = num(form.sellingPrice);
      if (price === null || price <= 0)
        e.sellingPrice = 'A selling price greater than zero is required.';
      const mrp = num(form.mrp);
      if (mrp !== null && price !== null && mrp < price)
        e.mrp = 'The list price cannot be below the selling price.';
      const stock = num(form.stock);
      if (stock === null || stock < 0 || !Number.isInteger(stock))
        e.stock = 'Stock must be a whole number, zero or more.';
    }
    if (form.gtin.trim() && !/^\d{8,14}$/.test(form.gtin.trim()))
      e.gtin = 'A GTIN/EAN/UPC is 8 to 14 digits.';

    for (const [slug, message] of Object.entries(
      validateAttributeValues(fields, attributeValues),
    )) {
      e[`attr:${slug}`] = message;
    }
    return e;
  };

  const isApproved = approvalOf(product) === 'APPROVED';

  // Content fields whose change on an approved product triggers re-review.
  const contentChanged = useMemo(() => {
    if (!product) return false;
    const base = fromDetail(product);
    const baseAttrs = attributeValuesFromProduct(product.attributes);
    const same = (a: unknown, b: unknown) =>
      JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    return (
      base.name !== form.name ||
      base.brandId !== form.brandId ||
      base.categoryId !== form.categoryId ||
      base.subcategoryId !== form.subcategoryId ||
      base.shortDescription !== form.shortDescription ||
      base.longDescription !== form.longDescription ||
      !same(baseAttrs, attributeValues)
    );
  }, [product, form, attributeValues]);

  const buildPayload = (): SellerProductWrite => {
    const payload: SellerProductWrite = {
      name: form.name.trim(),
      description: form.shortDescription.trim() || undefined,
      longDescription: form.longDescription.trim() || undefined,
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      brandId: form.brandId || undefined,
      gtin: form.gtin.trim() || undefined,
      attributes: serialiseAttributeValues(fields, attributeValues),
    };
    if (mode === 'create') {
      payload.sellingPrice = num(form.sellingPrice) ?? undefined;
      payload.mrp = num(form.mrp) ?? undefined;
      payload.stock = num(form.stock) ?? 0;
      payload.sku = form.sku.trim() || undefined;
      payload.condition = form.condition;
    }
    return payload;
  };

  /** A 400 names fields as `errors: [{ slug, message }]`; older bodies carry only a message. */
  const applyServerErrors = (err: unknown) => {
    if (err instanceof ApiError) {
      const body: any = err.body;
      const list: any[] = Array.isArray(body?.errors)
        ? body.errors
        : Array.isArray(body?.message?.errors)
          ? body.message.errors
          : [];
      const mapped: Record<string, string> = {};
      for (const row of list) {
        const key = row?.slug ? `attr:${row.slug}` : row?.field ? String(row.field) : '';
        if (key && row?.message) mapped[key] = String(row.message);
      }
      if (Object.keys(mapped).length) setErrors((prev) => ({ ...prev, ...mapped }));
      setServerMessage(
        typeof body?.message === 'string'
          ? body.message
          : err.message || 'The product could not be saved.',
      );
      return;
    }
    setServerMessage(
      'We could not reach the seller service. Please check your connection and try again.',
    );
  };

  const submit = async (asDraft = false) => {
    setServerMessage(null);
    const e = validate();
    setErrors(e);
    setTouched((prev) => {
      const all: Record<string, boolean> = {
        ...prev,
        name: true,
        categoryId: true,
        subcategoryId: true,
        sellingPrice: true,
        mrp: true,
        stock: true,
        gtin: true,
      };
      for (const f of fields) all[`attr:${f.slug}`] = true;
      return all;
    });
    if (Object.keys(e).length) {
      setServerMessage('Please fix the highlighted fields.');
      return;
    }
    if (mode === 'edit' && isApproved && contentChanged && !confirmReReview) {
      setConfirmReReview(true);
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        const payload = buildPayload();
        if (asDraft) payload.status = 'DRAFT';
        const res = await sellerApi.createOwnProduct(payload);
        const productId = res?.productId;
        if (!productId) throw new Error('The service did not return the new product id.');
        setSaved({ productId, message: res.message || 'Submitted for review.', reReview: false });
      } else if (product) {
        const res = await sellerApi.updateOwnProduct(product.id, buildPayload());
        setSaved({
          productId: product.id,
          message: res?.message || 'Your changes have been saved.',
          reReview: Boolean(res?.reReview),
        });
      }
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setSaving(false);
    }
  };

  const show = (key: string) => touched[key] && errors[key];
  const fieldClass = (key: string) =>
    `w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50 ${
      show(key)
        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
        : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`;
  const blur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  if (saved) {
    return (
      <div
        className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center"
        data-testid="seller-product-saved"
      >
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          {mode === 'create'
            ? 'Product submitted'
            : saved.reReview
              ? 'Changes submitted for re-review'
              : 'Changes saved'}
        </h2>
        <p className="text-sm text-slate-600 mb-6">{saved.message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/seller/marketplace/products/${saved.productId}/images`}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700"
          >
            {mode === 'create' ? 'Add photos' : 'Manage photos'}
          </Link>
          {variantAxes.length > 0 && (
            <Link
              href={`/seller/marketplace/products/${saved.productId}/variants`}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
            >
              Set up {variantAxes.map((a) => a.name.toLowerCase()).join(' / ')} SKUs
            </Link>
          )}
          <Link
            href={`/seller/marketplace/products/${saved.productId}`}
            className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
          >
            View product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="max-w-5xl mx-auto space-y-5 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      noValidate
      data-testid="seller-product-form"
    >
      <div className="flex items-center gap-4">
        <Link
          href={
            mode === 'create'
              ? '/seller/marketplace/products'
              : `/seller/marketplace/products/${product?.id ?? ''}`
          }
          className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            {mode === 'create' ? (
              <PlusCircle className="w-7 h-7 text-indigo-600" aria-hidden="true" />
            ) : (
              <Package className="w-7 h-7 text-indigo-600" aria-hidden="true" />
            )}
            {mode === 'create' ? 'Add a product' : 'Edit product'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'create'
              ? 'The category you choose decides which details shoppers see on the product page.'
              : 'Content changes to an approved product go back for review before they show on the storefront.'}
          </p>
        </div>
      </div>

      {mode === 'edit' && isApproved && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          role="note"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            This product is live. Saving changes to its name, descriptions, category, brand or
            attributes takes it off sale until an admin re-approves it. Price and stock changes on
            the product page do not.
          </p>
        </div>
      )}

      {refFailed && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700"
          role="alert"
        >
          The catalogue&apos;s categories and brands could not be loaded, so this form cannot be
          completed right now. Please reload the page.
        </div>
      )}

      {/* ── Basics ─────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-600" aria-hidden="true" /> Basics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label htmlFor="pf-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Product name <span className="text-red-400">*</span>
            </label>
            <input
              id="pf-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => blur('name')}
              className={fieldClass('name')}
              placeholder="e.g. Galaxy S24 Ultra (256GB)"
              maxLength={200}
              aria-invalid={!!show('name')}
              aria-describedby={show('name') ? 'pf-name-err' : undefined}
            />
            {show('name') && (
              <p id="pf-name-err" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="pf-category"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="pf-category"
              value={form.categoryId}
              onChange={(e) => {
                set('categoryId', e.target.value);
                set('subcategoryId', '');
              }}
              onBlur={() => blur('categoryId')}
              disabled={!tree}
              className={fieldClass('categoryId')}
              aria-invalid={!!show('categoryId')}
            >
              <option value="">{tree ? 'Choose a category' : 'Loading categories…'}</option>
              {(tree ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {show('categoryId') && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
          </div>

          <div>
            <label
              htmlFor="pf-subcategory"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Subcategory{' '}
              {category && category.children.length > 0 && <span className="text-red-400">*</span>}
            </label>
            <select
              id="pf-subcategory"
              value={form.subcategoryId}
              onChange={(e) => set('subcategoryId', e.target.value)}
              onBlur={() => blur('subcategoryId')}
              disabled={!category || category.children.length === 0}
              className={fieldClass('subcategoryId')}
              aria-invalid={!!show('subcategoryId')}
            >
              <option value="">
                {!category
                  ? 'Choose a category first'
                  : category.children.length === 0
                    ? 'No subcategories'
                    : 'Choose a subcategory'}
              </option>
              {(category?.children ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {show('subcategoryId') && (
              <p className="text-xs text-red-500 mt-1">{errors.subcategoryId}</p>
            )}
          </div>

          <div>
            <label htmlFor="pf-brand" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Brand
            </label>
            <select
              id="pf-brand"
              value={form.brandId}
              onChange={(e) => set('brandId', e.target.value)}
              disabled={!brands}
              className={fieldClass('brandId')}
            >
              <option value="">{brands ? 'No brand / unbranded' : 'Loading brands…'}</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pf-gtin" className="block text-sm font-semibold text-slate-700 mb-1.5">
              GTIN / EAN / UPC
            </label>
            <input
              id="pf-gtin"
              value={form.gtin}
              onChange={(e) => set('gtin', e.target.value)}
              onBlur={() => blur('gtin')}
              className={fieldClass('gtin')}
              placeholder="8–14 digits, from the barcode"
              inputMode="numeric"
              aria-invalid={!!show('gtin')}
            />
            {show('gtin') && <p className="text-xs text-red-500 mt-1">{errors.gtin}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="pf-short" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Short description
            </label>
            <input
              id="pf-short"
              value={form.shortDescription}
              onChange={(e) => set('shortDescription', e.target.value)}
              className={fieldClass('shortDescription')}
              placeholder="One line shown under the title and in search results"
              maxLength={300}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="pf-long" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              id="pf-long"
              value={form.longDescription}
              onChange={(e) => set('longDescription', e.target.value)}
              rows={6}
              className={`${fieldClass('longDescription')} resize-y`}
              placeholder="What it is, what it does, what is in the box. Plain text; separate paragraphs with a blank line."
            />
          </div>
        </div>
      </section>

      {/* ── Attributes, from the category's definitions ─────────────────── */}
      <section
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        data-testid="seller-attribute-fields"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" aria-hidden="true" /> Product
            details
          </h2>
          {schemaLoading && (
            <Loader2
              className="w-4 h-4 animate-spin text-slate-400"
              aria-label="Loading attribute definitions"
            />
          )}
        </div>

        {!schemaKey ? (
          <p className="text-sm text-slate-500">
            Choose a category to see which details this kind of product needs.
          </p>
        ) : fields.length === 0 && !schemaLoading ? (
          <p className="text-sm text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            This category has no attribute definitions yet, so the product page will show your
            description only. Ask an admin to define attributes for{' '}
            {subcategory?.name ?? category?.name}.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <fieldset key={group.group} className="space-y-4">
                <legend className="text-sm font-bold text-slate-800 mb-1">{group.group}</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.fields.map((f) => (
                    <AttributeInput
                      key={f.slug}
                      field={f}
                      value={attributeValues[f.slug]}
                      error={show(`attr:${f.slug}`) ? errors[`attr:${f.slug}`] : undefined}
                      onChange={(v) => setAttr(f.slug, v)}
                      onBlur={() => blur(`attr:${f.slug}`)}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            {variantAxes.length > 0 && (
              <p className="text-xs text-slate-500 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                {variantAxes.map((a) => a.name).join(' and ')} are chosen per SKU on the Variants
                page after the product is created — each combination carries its own price and
                stock.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Offer (create only — edits go through the product page) ────── */}
      {mode === 'create' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900">Your offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label
                htmlFor="pf-price"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Selling price <span className="text-red-400">*</span>
              </label>
              <input
                id="pf-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', e.target.value)}
                onBlur={() => blur('sellingPrice')}
                className={fieldClass('sellingPrice')}
                aria-invalid={!!show('sellingPrice')}
              />
              {show('sellingPrice') ? (
                <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>
              ) : num(form.sellingPrice) ? (
                <p className="text-xs text-slate-400 mt-1">
                  {money(num(form.sellingPrice) as number)}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pf-mrp" className="block text-sm font-semibold text-slate-700 mb-1.5">
                List price
              </label>
              <input
                id="pf-mrp"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.mrp}
                onChange={(e) => set('mrp', e.target.value)}
                onBlur={() => blur('mrp')}
                className={fieldClass('mrp')}
                placeholder="Struck-through price, if any"
                aria-invalid={!!show('mrp')}
              />
              {show('mrp') && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
            </div>
            <div>
              <label
                htmlFor="pf-stock"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Stock <span className="text-red-400">*</span>
              </label>
              <input
                id="pf-stock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                onBlur={() => blur('stock')}
                className={fieldClass('stock')}
                aria-invalid={!!show('stock')}
              />
              {show('stock') && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
            <div>
              <label htmlFor="pf-sku" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Your SKU
              </label>
              <input
                id="pf-sku"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                className={fieldClass('sku')}
                placeholder="Optional — generated if blank"
                maxLength={64}
              />
            </div>
            <div>
              <label
                htmlFor="pf-condition"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Condition
              </label>
              <select
                id="pf-condition"
                value={form.condition}
                onChange={(e) => set('condition', e.target.value)}
                className={fieldClass('condition')}
              >
                <option value="NEW">New</option>
                <option value="REFURBISHED">Refurbished</option>
                <option value="USED">Used</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {serverMessage && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
          role="alert"
          data-testid="seller-product-error"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700">{serverMessage}</p>
        </div>
      )}

      {confirmReReview && (
        <div
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3"
          role="alertdialog"
          aria-labelledby="rereview-title"
        >
          <p id="rereview-title" className="text-sm font-bold text-amber-900">
            Saving these changes takes the product off sale until it is re-approved.
          </p>
          <p className="text-sm text-amber-800">
            Shoppers will not see it in the meantime. Continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmReReview(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void submit(false);
              }}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Yes, submit for re-review'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        {mode === 'create' && (
          <button
            type="button"
            onClick={() => void submit(true)}
            disabled={saving || refFailed}
            className="px-5 py-2.5 border-2 border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" aria-hidden="true" /> Save as draft
          </button>
        )}
        <button
          type="submit"
          disabled={saving || refFailed || confirmReReview}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="seller-product-submit"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          )}
          {saving ? 'Saving…' : mode === 'create' ? 'Submit for review' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

/** One attribute input, drawn for the definition's type. */
function AttributeInput({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: AttributeField;
  value: AttributeValues[string];
  error?: string;
  onChange: (value: AttributeValues[string]) => void;
  onBlur: () => void;
}) {
  const id = `attr-${field.slug}`;
  const errId = `${id}-err`;
  const base = `w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${
    error
      ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
      : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
  }`;
  const label = (
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">
      {field.name}
      {field.unit ? <span className="text-slate-400 font-normal"> ({field.unit})</span> : null}
      {field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
  const hint =
    field.type === 'NUMBER' && (field.minValue !== null || field.maxValue !== null)
      ? `${field.minValue !== null ? `min ${field.minValue}` : ''}${field.minValue !== null && field.maxValue !== null ? ' · ' : ''}${field.maxValue !== null ? `max ${field.maxValue}` : ''}`
      : field.type === 'RANGE'
        ? 'e.g. 10-20'
        : '';
  const err = error ? (
    <p id={errId} className="text-xs text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" aria-hidden="true" />
      {error}
    </p>
  ) : hint ? (
    <p className="text-xs text-slate-400 mt-1">{hint}</p>
  ) : null;
  const str =
    typeof value === 'string' ? value : value === true ? 'true' : value === false ? 'false' : '';

  switch (field.type) {
    case 'SELECT':
    case 'COLOR':
      if (field.options.length > 0) {
        return (
          <div>
            {label}
            <select
              id={id}
              value={str}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              className={base}
              aria-invalid={!!error}
              aria-describedby={error ? errId : undefined}
            >
              <option value="">Choose…</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {err}
          </div>
        );
      }
      return (
        <div>
          {label}
          <input
            id={id}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={base}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {err}
        </div>
      );
    case 'MULTI_SELECT': {
      const chosen = Array.isArray(value)
        ? value
        : typeof value === 'string' && value
          ? value.split(',').map((s) => s.trim())
          : [];
      if (field.options.length === 0) {
        return (
          <div>
            {label}
            <input
              id={id}
              value={chosen.join(', ')}
              onChange={(e) =>
                onChange(
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              onBlur={onBlur}
              className={base}
              placeholder="Comma-separated"
              aria-invalid={!!error}
              aria-describedby={error ? errId : undefined}
            />
            {err}
          </div>
        );
      }
      return (
        <fieldset>
          <legend className="block text-sm font-semibold text-slate-700 mb-1.5">
            {field.name}
            {field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
          </legend>
          <div className="flex flex-wrap gap-2" onBlur={onBlur}>
            {field.options.map((o) => {
              const on = chosen.includes(o.value) || chosen.includes(o.label);
              return (
                <label
                  key={o.value}
                  className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border cursor-pointer ${on ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange(
                        on
                          ? chosen.filter((v) => v !== o.value && v !== o.label)
                          : [...chosen, o.value],
                      )
                    }
                    className="rounded"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {err}
        </fieldset>
      );
    }
    case 'BOOLEAN':
      return (
        <div>
          {label}
          <select
            id={id}
            value={str}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
            onBlur={onBlur}
            className={base}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          >
            <option value="">Not specified</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          {err}
        </div>
      );
    case 'NUMBER':
      return (
        <div>
          {label}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            min={field.minValue ?? undefined}
            max={field.maxValue ?? undefined}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={base}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {err}
        </div>
      );
    case 'DATE':
      return (
        <div>
          {label}
          <input
            id={id}
            type="date"
            value={str}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={base}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {err}
        </div>
      );
    case 'RANGE':
    case 'TEXT':
    default:
      return (
        <div>
          {label}
          <input
            id={id}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={base}
            maxLength={500}
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
          />
          {err}
        </div>
      );
  }
}
