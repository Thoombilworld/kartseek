'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Eye, EyeOff, Globe, ToggleLeft, ToggleRight, Tag, Layers, Trash2, Save, X } from 'lucide-react';
import MarketplaceFilterBar from '@/components/admin/marketplace/marketplace-filter-bar';
import MarketplaceActionMenu from '@/components/admin/marketplace/marketplace-action-menu';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

/**
 * Category Management.
 *
 * Was a mock: ten hard-coded categories with invented ids ("CAT-01") and
 * invented product counts, while the catalogue holds 113 real ones. "Save
 * Category" had no click handler at all, and the status and featured toggles
 * only moved local state. Everything here now reads and writes the database.
 *
 * Categories are the anchor for variant configuration — an attribute is scoped
 * to one, and the seller portal and storefront both resolve a product's variant
 * axes through it. A category that cannot actually be created is therefore a
 * category whose variants can never be configured, which is why this screen had
 * to become real before the attribute schema meant anything.
 */

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Rows out of a gateway list response, wherever the envelope put them. */
function rowsOf(payload: any): any[] {
  const inner = payload?.data ?? payload;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function CategoryModal({ category, categories, onSave, onClose, saving }: {
  category?: AdminCategory;
  categories: AdminCategory[];
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [image, setImage] = useState(category?.image ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [seoTitle, setSeoTitle] = useState(category?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(category?.seoDescription ?? '');

  const field = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'text-xs font-bold text-slate-500 uppercase block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">{category ? 'Edit Category' : 'Add New Category'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="cat-name">Category Name *</label>
              <input id="cat-name" className={field} placeholder="e.g. Electronics" value={name}
                onChange={(e) => { setName(e.target.value); if (!category) setSlug(slugify(e.target.value)); }} />
            </div>
            <div>
              <label className={label} htmlFor="cat-slug">URL Slug</label>
              <input id="cat-slug" className={`${field} font-mono`} placeholder="electronics" value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))} />
              {/* The slug is the storefront's address for this category — every
                  route into it is /marketplace/category/<slug>, never the uuid. */}
              <p className="text-[10px] text-slate-400 mt-1">Used in the storefront URL. Auto-generated from the name.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="cat-icon">Icon</label>
              <input id="cat-icon" className={field} placeholder="Smartphone or 📱" value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="cat-parent">Parent Category</label>
              <select id="cat-parent" className={field} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None (top level)</option>
                {categories.filter((c) => c.id !== category?.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="cat-sort">Sort Order</label>
              <input id="cat-sort" type="number" className={field} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="cat-image">Category Image URL</label>
            {/* A URL field, not a file picker: there is no upload pipeline behind
                this screen, and a picker that silently discarded the file would
                be worse than asking for the address. */}
            <input id="cat-image" className={field} placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">Active (visible to customers)</span>
          </label>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> SEO</p>
            <div>
              <label className={label} htmlFor="cat-seo-title">Meta Title</label>
              <input id="cat-seo-title" className={field} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Buy Electronics Online – Best Deals | KARTSEEK" />
            </div>
            <div>
              <label className={label} htmlFor="cat-seo-desc">Meta Description</label>
              <textarea id="cat-seo-desc" rows={2} className={`${field} resize-none`} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button
            disabled={!name.trim() || saving}
            onClick={() => onSave({
              name: name.trim(),
              slug: slug || slugify(name),
              icon: icon.trim() || undefined,
              image: image.trim() || undefined,
              parentId: parentId || undefined,
              sortOrder: Number(sortOrder) || 0,
              isActive,
              seoTitle: seoTitle.trim() || undefined,
              seoDescription: seoDescription.trim() || undefined,
            })}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : category ? 'Update Category' : 'Save Category'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getCategories(),
    [],
  );
  const { execute } = useAdminAction(showToast);
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const categories: AdminCategory[] = useMemo(
    () => rowsOf(data).map((c: any) => ({
      id: String(c.id),
      name: c.name ?? '',
      slug: c.slug ?? '',
      icon: c.icon ?? null,
      image: c.image ?? c.imageUrl ?? null,
      isActive: (c.is_active ?? c.isActive) !== false,
      sortOrder: Number(c.sort_order ?? c.sortOrder ?? 0),
      parentId: c.parentId ?? c.parent?.id ?? null,
      seoTitle: c.seo_title ?? c.seoTitle ?? null,
      seoDescription: c.seo_description ?? c.seoDescription ?? null,
    })).sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name)),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [categories, search]);

  const roots = categories.filter((c) => !c.parentId);
  const childCount = (id: string) => categories.filter((c) => c.parentId === id).length;

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const result = await execute(
        () => (editing
          ? adminMarketplaceApi.updateCategory(editing.id, payload as any)
          : adminMarketplaceApi.createCategory(payload as any)),
        editing ? 'Category updated' : 'Category created',
      );
      // Null means the request failed; keep the form open with the data intact.
      if (result !== null) { setShowModal(false); setEditing(undefined); refetch(); }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c: AdminCategory) => {
    await execute(
      () => adminMarketplaceApi.updateCategory(c.id, { isActive: !c.isActive } as any),
      c.isActive ? `${c.name} hidden from customers` : `${c.name} is now visible`,
    );
    refetch();
  };

  const remove = async (c: AdminCategory) => {
    if (!confirm(`Delete "${c.name}"? A category that still has products is deactivated rather than deleted.`)) return;
    await execute(() => adminMarketplaceApi.deleteCategory(c.id), `${c.name} removed`);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Category Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isFiltered ? `${regionLabel} — ` : ''}
            Categories control storefront navigation, product listing structure and the variant schema sellers list against.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/marketplace/attributes"
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <Layers className="w-4 h-4" /> Attributes &amp; Variants
          </Link>
          <button onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{categories.length}</p><p className="text-xs text-slate-500 mt-1">Total Categories</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-emerald-600">{categories.filter(c => c.isActive).length}</p><p className="text-xs text-slate-500 mt-1">Active</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-blue-600">{roots.length}</p><p className="text-xs text-slate-500 mt-1">Top-level</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-purple-600">{categories.length - roots.length}</p><p className="text-xs text-slate-500 mt-1">Subcategories</p></div>
      </div>

      <MarketplaceFilterBar search={search} onSearch={setSearch} placeholder="Search categories..." />

      {loading && <AdminLoadingSkeleton rows={6} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-160">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold">#</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Category</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Slug</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Parent</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Subcategories</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{c.sortOrder}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {c.image
                          ? <img src={c.image} alt="" className="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-slate-100" />
                          : <span className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400"><Tag className="w-4 h-4" /></span>}
                        <p className="font-bold text-slate-900">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{c.slug}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {c.parentId ? (categories.find((p) => p.id === c.parentId)?.name ?? '—') : <span className="text-slate-300">Top level</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{childCount(c.id)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => toggleStatus(c)} className="flex items-center gap-1.5 mx-auto" aria-label={c.isActive ? 'Disable category' : 'Enable category'}>
                        {c.isActive ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                        <span className={`text-[10px] font-bold ${c.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{c.isActive ? 'ON' : 'OFF'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <MarketplaceActionMenu items={[
                        { label: 'Edit Category', icon: Edit2, onClick: () => { setEditing(c); setShowModal(true); } },
                        { label: 'Attributes & Variants', icon: Layers, onClick: () => { window.location.href = '/admin/marketplace/attributes'; } },
                        { label: c.isActive ? 'Disable Category' : 'Enable Category', icon: c.isActive ? EyeOff : Eye, onClick: () => toggleStatus(c), variant: c.isActive ? 'warning' as const : 'success' as const, divider: true },
                        { label: 'Delete Category', icon: Trash2, onClick: () => remove(c), variant: 'danger' as const },
                      ]} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      {search ? 'No categories match that search.' : 'No categories yet — create the first one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editing}
          categories={categories}
          saving={saving}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
        />
      )}

      <AdminToast toast={toast} />
    </div>
  );
}
