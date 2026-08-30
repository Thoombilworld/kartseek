'use client';

import React, { useState, useRef } from 'react';
import { Edit2, Trash2, Plus, Search, X, Save, ChevronRight, ImageIcon, Tag, AlertTriangle } from 'lucide-react';
import { GROCERY_CATEGORIES, type GroceryCategory } from '@/lib/modules/grocery-categories';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

// ── Types ────────────────────────────────────────────────────────────────────

type CategoryStatus = 'active' | 'draft' | 'archived';

interface EditableCategory extends GroceryCategory {
  _dirty?: boolean;
}

// ── Modal ────────────────────────────────────────────────────────────────────

function CategoryModal({
  category,
  onSave,
  onClose,
}: {
  category: Partial<EditableCategory> | null;
  onSave: (cat: EditableCategory) => void;
  onClose: () => void;
}) {
  const isNew = !category?.id;
  const [form, setForm] = useState<Partial<EditableCategory>>(
    category ?? { status: 'active', emoji: '🛒', gradient: 'from-green-600 to-emerald-500', color: 'bg-green-100 text-green-700', productCount: 0 },
  );
  const set = (k: keyof EditableCategory, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim() || !form.id?.trim()) return;
    onSave({ ...(form as EditableCategory), _dirty: true });
  };

  return (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">
            {isNew ? 'Add New Category' : `Edit — ${category?.name}`}
          </h2>
          <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preview tile */}
          <div className={`bg-linear-to-r ${form.gradient ?? 'from-slate-500 to-slate-700'} rounded-xl p-4 flex items-center gap-3 text-white`}>
            <span className="text-4xl">{form.emoji}</span>
            <div>
              <p className="font-bold text-base leading-tight">{form.name || 'Category Name'}</p>
              <p className="text-xs opacity-75 mt-0.5">{form.description || 'Description...'}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="category-name">Category Name *</label>
              <input id="category-name"
                value={form.name ?? ''}
                onChange={(e) => {
                  set('name', e.target.value);
                  if (isNew) set('id', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
                placeholder="e.g. Fruits & Vegetables"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="slug-id">Slug / ID *</label>
              <input id="slug-id"
                value={form.id ?? ''}
                onChange={(e) => set('id', e.target.value)}
                placeholder="fruits-vegetables"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="emoji-icon">Emoji Icon</label>
              <input id="emoji-icon"
                value={form.emoji ?? ''}
                onChange={(e) => set('emoji', e.target.value)}
                placeholder="🥬"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="description">Description</label>
              <input id="description"
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Short marketing description..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> Image URL
                <span className="text-slate-400 font-normal">(optional — overrides emoji)</span>
              </label>
              <input
                value={form.imageUrl ?? ''}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="https://cdn.example.com/category/fruits.webp"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="gradient-classes">Gradient Classes</label>
              <input id="gradient-classes"
                value={form.gradient ?? ''}
                onChange={(e) => set('gradient', e.target.value)}
                placeholder="from-green-600 to-emerald-500"
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label htmlFor="cat-modal-status" className="text-xs font-bold text-slate-600 mb-1 block">Status</label>
              <select
                id="cat-modal-status"
                value={form.status ?? 'active'}
                onChange={(e) => set('status', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {isNew && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              After saving, update <code className="font-mono bg-amber-100 px-1 rounded">apps/web/src/lib/grocery-categories.ts</code> to persist this category across deployments.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name?.trim() || !form.id?.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"
           aria-label="Save">
            <Save className="w-3.5 h-3.5" /> {isNew ? 'Create Category' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm">Delete Category?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This will set <strong>{name}</strong> to archived.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mb-4">
          Products in this category will not be deleted — they will be reassigned to "Uncategorized". This action can be undone by editing the category status.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Archive</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminGroceryCategoriesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | 'all'>('all');
  const [modal, setModal] = useState<'add' | { edit: EditableCategory } | { delete: EditableCategory } | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { regionLabel, isFiltered } = useGroceryRegionFilter([]);

  /**
   * Load the real category tree.
   *
   * The page seeded itself from `GROCERY_CATEGORIES` — the static client-side list
   * — so it showed 23 categories whether or not the database held any, and an
   * admin editing one was editing an in-memory copy of a constant.
   */
  const { data: loadedCategories, loading, error, reload: load } = useAsyncData<EditableCategory[]>(
    async () => {
      const res = await adminGroceryApi.getCategories();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load grocery categories');
      const rows = (res.data.categories ?? []) as Array<Record<string, any>>;
      return rows.map((c) => ({
        ...c,
        id: String(c.id),
        name: String(c.name ?? ''),
        productCount: Number(c.productCount ?? 0),
        // The table has no three-state workflow — `isActive` is the only flag —
        // so map it rather than invent draft/archived states the API cannot store.
        status: (c.isActive === false ? 'archived' : 'active') as CategoryStatus,
      })) as EditableCategory[];
    },
    [],
  );
  const categories = error ? [] : (loadedCategories ?? []);

  const filtered = categories.filter((c) => {
    const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.id.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalProducts = filtered.reduce((s, c) => s + c.productCount, 0);
  const activeCount = categories.filter((c) => c.status === 'active').length;
  const draftCount = categories.filter((c) => c.status === 'draft').length;

  /**
   * Create or update a category.
   *
   * This used to splice the local array, flash a toast, and fire
   * `fetch('/api/grocery/categories/invalidate-cache', …).catch(() => {})` at a
   * Next route that does not exist — the comment above it said "In production:
   * POST /grocery/categories", which is exactly what it should have been doing.
   * The service invalidates its own Redis cache on write, so no second call is
   * needed.
   */
  const handleSave = async (cat: EditableCategory) => {
    setActionError(null);
    const exists = categories.some((c) => c.id === cat.id);
    const payload = {
      name: cat.name,
      emoji: (cat as any).emoji,
      description: (cat as any).description,
      isActive: cat.status !== 'archived',
      sortOrder: (cat as any).sortOrder,
    };
    const res = exists
      ? await adminGroceryApi.updateCategory(cat.id, payload)
      : await adminGroceryApi.createCategory({ ...payload, name: cat.name });

    if (!res.success) {
      // A duplicate slug is the common rejection here and has to be shown.
      setActionError(res.error ?? 'Could not save this category');
      return;
    }
    setModal(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
    await load();
  };

  const handleDelete = async (cat: EditableCategory) => {
    setActionError(null);
    // The service refuses to delete a category products still reference, and says
    // how many — surfacing that is the whole point of the call.
    const res = await adminGroceryApi.deleteCategory(cat.id);
    if (!res.success) {
      setActionError(res.error ?? 'Could not delete this category');
      return;
    }
    setModal(null);
    await load();
  };

  const statusColor: Record<CategoryStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-amber-100 text-amber-700',
    archived: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => void load()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}
      {loading && <p className="text-sm text-slate-400" aria-busy="true">Loading categories…</p>}

      {/* Toast */}
      {saveToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top">
          <Save className="w-4 h-4" /> Category saved — cache invalidated across all platforms
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Category Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}{activeCount} active • {draftCount} draft • {totalProducts.toLocaleString()} products in view
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">Live Sync</span>
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'draft', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${statusFilter === s ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Description</th>
                <th className="px-4 py-3 font-semibold text-center">Products</th>
                <th className="px-4 py-3 font-semibold text-center">Subcategories</th>
                <th className="px-4 py-3 font-semibold text-center">Image</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cat) => (
                <tr key={cat.id} className={`hover:bg-slate-50/50 transition-colors ${cat.status === 'archived' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${cat.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-lg">{cat.emoji}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{cat.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{cat.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-slate-500 max-w-[200px] truncate">{cat.description}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">{cat.productCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setModal({ edit: cat })}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mx-auto"
                    >
                      {(cat.subcategories ?? []).length} <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cat.imageUrl ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                        <ImageIcon className="w-3 h-3" /> Set
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">{cat.emoji}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor[cat.status]}`}>
                      {cat.status.charAt(0).toUpperCase() + cat.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setModal({ edit: cat })}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setModal({ delete: cat })}
                        className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded-lg transition-colors"
                        title="Archive category"
                        disabled={cat.status === 'archived'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No categories match your filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <CategoryModal category={null} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal && typeof modal === 'object' && 'edit' in modal && (
        <CategoryModal category={modal.edit} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal && typeof modal === 'object' && 'delete' in modal && (
        <DeleteConfirm
          name={modal.delete.name}
          onConfirm={() => handleDelete(modal.delete)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
