'use client';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import React, { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
  Save, X, Layers, Tag, Eye, EyeOff, Filter, Download, Upload,
} from 'lucide-react';
import { useMarketplace, type SubcategoryItem, type ExtendedCategory } from '@/lib/contexts/marketplace-context';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

export default function SubcategoriesPage() {
  const { categories, subcategories, addSubcategory, updateSubcategory, deleteSubcategory } = useMarketplace();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedCat, setExpandedCat] = useState<string | null>(categories[0]?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSub, setEditSub] = useState<SubcategoryItem | null>(null);
  const [addToCategory, setAddToCategory] = useState<string>('');

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
      () => adminMarketplaceApi.getSubcategories(),
      []
    );
    const { execute } = useAdminAction(showToast);


  // Group subcategories by parent
  const grouped = useMemo(() => {
    const map: Record<string, SubcategoryItem[]> = {};
    categories.forEach(c => { map[c.id] = []; });
    subcategories.forEach(s => {
      if (map[s.parentCategoryId]) {
        if (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase())) {
          map[s.parentCategoryId].push(s);
        }
      }
    });
    // Sort within each group
    Object.keys(map).forEach(k => map[k].sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [categories, subcategories, search]);

  const filteredCategories = filterCategory === 'all' ? categories : categories.filter(c => c.id === filterCategory);

  const totalActive = subcategories.filter(s => s.status === 'active').length;
  const totalInactive = subcategories.filter(s => s.status === 'inactive').length;

  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Subcategory Management</h1>
          <p className="text-slate-500 text-sm mt-1">{isFiltered ? `${regionLabel} — ` : ''}Manage subcategories within each parent category. Controls marketplace navigation, filtering, and SEO structure.</p>
        </div>
        <button onClick={() => { setAddToCategory(categories[0]?.id || ''); setEditSub(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Add Subcategory
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{subcategories.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Subcategories</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{totalActive}</p>
          <p className="text-xs text-slate-500 mt-1">Active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-slate-400">{totalInactive}</p>
          <p className="text-xs text-slate-500 mt-1">Inactive</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{categories.length}</p>
          <p className="text-xs text-slate-500 mt-1">Parent Categories</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subcategories..." className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="relative">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-sm px-4 py-2.5 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label="Filter by category">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Tree View */}
      <div className="space-y-3">
        {filteredCategories.map(cat => {
          const subs = grouped[cat.id] || [];
          const isExpanded = expandedCat === cat.id;
          const activeSubs = subs.filter(s => s.status === 'active').length;

          return (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Category Header */}
              <div onClick={() => setExpandedCat(isExpanded ? null : cat.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedCat(isExpanded ? null : cat.id); } }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors text-left cursor-pointer">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center text-lg`}>
                    {cat.iconName === 'Smartphone' ? '📱' : cat.iconName === 'Laptop' ? '💻' : cat.iconName === 'Shirt' ? '👗' : cat.label.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{cat.label}</h3>
                    <p className="text-xs text-slate-400">{subs.length} subcategories · {activeSubs} active · {cat.productCount?.toLocaleString()} products</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setAddToCategory(cat.id); setEditSub(null); setShowAddModal(true); }}
                  className="flex items-center gap-1 text-blue-600 text-xs font-bold hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Subcategory List */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {subs.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs">
                        <tr>
                          <th className="px-5 py-2.5 text-left font-semibold w-12">#</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Subcategory</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Slug</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Products</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                          <th className="px-4 py-2.5 text-center font-semibold w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subs.map(sub => (
                          <tr key={sub.id} className={`hover:bg-slate-50/50 transition-colors ${sub.status === 'inactive' ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-3 text-slate-400 text-xs font-mono">{sub.sortOrder}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {sub.icon && <span className="text-lg">{sub.icon}</span>}
                                <span className="font-medium text-slate-900">{sub.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{sub.slug}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">{sub.productCount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => updateSubcategory(sub.id, { status: sub.status === 'active' ? 'inactive' : 'active' })} className="flex items-center gap-1 mx-auto">
                                {sub.status === 'active' ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                                <span className={`text-[9px] font-bold ${sub.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{sub.status === 'active' ? 'ON' : 'OFF'}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => { setEditSub(sub); setAddToCategory(sub.parentCategoryId); setShowAddModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit2 className="w-3.5 h-3.5 text-blue-600" /></button>
                                <button onClick={() => { if (confirm(`Delete "${sub.name}"?`)) deleteSubcategory(sub.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      No subcategories {search ? 'matching search' : 'yet'}
                      <button onClick={() => { setAddToCategory(cat.id); setEditSub(null); setShowAddModal(true); }} className="ml-1 text-blue-600 font-bold">+ Add</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <SubcategoryModal
          sub={editSub}
          parentCategoryId={addToCategory}
          categories={categories}
          onSave={(data) => {
            if (editSub) {
              updateSubcategory(editSub.id, data);
            } else {
              addSubcategory({ ...data } as Omit<SubcategoryItem, 'id'>);
            }
            setShowAddModal(false);
            setEditSub(null);
          }}
          onClose={() => { setShowAddModal(false); setEditSub(null); }}
        />
      )}
    </div>
  );
}

// ── Subcategory Modal ───────────────────────────────────────────────────────

function SubcategoryModal({ sub, parentCategoryId, categories, onSave, onClose }: {
  sub: SubcategoryItem | null;
  parentCategoryId: string;
  categories: ExtendedCategory[];
  onSave: (data: Partial<SubcategoryItem>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(sub?.name || '');
  const [slug, setSlug] = useState(sub?.slug || '');
  const [parent, setParent] = useState(sub?.parentCategoryId || parentCategoryId);
  const [icon, setIcon] = useState(sub?.icon || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(sub?.status || 'active');
  const [sortOrder, setSortOrder] = useState(sub?.sortOrder || 1);
  const [metaTitle, setMetaTitle] = useState(sub?.seo?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(sub?.seo?.metaDescription || '');

  const autoSlug = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">{sub ? 'Edit Subcategory' : 'Add Subcategory'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="parent-category">Parent Category *</label>
            <select id="parent-category" value={parent} onChange={e => setParent(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Parent category">
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="subcategory-name">Subcategory Name *</label>
            <input id="subcategory-name" value={name} onChange={e => { setName(e.target.value); if (!sub) setSlug(autoSlug(e.target.value)); }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Smartphones" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="url-slug">URL Slug</label>
            <input id="url-slug" value={slug} onChange={e => setSlug(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono" placeholder="smartphones" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="icon-emoji">Icon (Emoji)</label>
              <input id="icon-emoji" value={icon} onChange={e => setIcon(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" placeholder="📱" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="sort-order">Sort Order</label>
              <input id="sort-order" type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Sort order" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">SEO (Optional)</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1" htmlFor="meta-title">Meta Title</label>
                <input id="meta-title" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder={`Buy ${name || 'Category'} Online | KARTSEEK`} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1" htmlFor="meta-description">Meta Description</label>
                <textarea id="meta-description" value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none resize-none" placeholder={`Shop ${name || 'products'} online at best prices on KARTSEEK.`} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <button onClick={() => setStatus(s => s === 'active' ? 'inactive' : 'active')} className="flex items-center gap-1.5">
              {status === 'active' ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              <span className={`text-xs font-bold ${status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={() => onSave({
            name, slug, parentCategoryId: parent, icon, status, sortOrder,
            productCount: sub?.productCount || 0,
            seo: (metaTitle || metaDesc) ? { metaTitle, metaDescription: metaDesc } : undefined,
          })} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {sub ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
