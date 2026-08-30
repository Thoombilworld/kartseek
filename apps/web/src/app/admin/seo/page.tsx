'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

/// KARTSEEK — Admin SEO Management Dashboard
/// Full admin control over per-page metadata, OG tags, schema, FAQs, and robots.

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Eye, AlertTriangle, CheckCircle, Globe, FileText, Hash, Image } from 'lucide-react';

interface SeoOverride {
  id: string;
  path: string;
  module: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robotsIndex: boolean;
  sitemapInclude: boolean;
  faqItems?: { question: string; answer: string }[];
  updatedAt: string;
}

const MODULES = ['marketplace', 'restaurant', 'doctor', 'pharmacy', 'grocery', 'taxi', 'general'];

export default function AdminSeoPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [overrides, setOverrides] = useState<SeoOverride[]>([]);
  const [filter, setFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [editingItem, setEditingItem] = useState<SeoOverride | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [form, setForm] = useState({
    path: '', module: 'general', metaTitle: '', metaDescription: '',
    ogTitle: '', ogDescription: '', ogImage: '',
    robotsIndex: true, sitemapInclude: true,
    keywords: '',
    faqItems: [{ question: '', answer: '' }],
  });

  const filteredOverrides = overrides.filter(o => {
    const matchSearch = !filter || o.path.includes(filter) || o.metaTitle?.includes(filter);
    const matchModule = !moduleFilter || o.module === moduleFilter;
    return matchSearch && matchModule;
  });

  function openEditor(item?: SeoOverride) {
    if (item) {
      setForm({
        path: item.path, module: item.module,
        metaTitle: item.metaTitle || '', metaDescription: item.metaDescription || '',
        ogTitle: item.ogTitle || '', ogDescription: item.ogDescription || '',
        ogImage: item.ogImage || '',
        robotsIndex: item.robotsIndex, sitemapInclude: item.sitemapInclude,
        keywords: '',
        faqItems: item.faqItems?.length ? item.faqItems : [{ question: '', answer: '' }],
      });
      setEditingItem(item);
    } else {
      setForm({
        path: '', module: 'general', metaTitle: '', metaDescription: '',
        ogTitle: '', ogDescription: '', ogImage: '',
        robotsIndex: true, sitemapInclude: true, keywords: '',
        faqItems: [{ question: '', answer: '' }],
      });
      setEditingItem(null);
    }
    setShowEditor(true);
  }

  function addFaqItem() {
    setForm({ ...form, faqItems: [...form.faqItems, { question: '', answer: '' }] });
  }

  function updateFaq(idx: number, field: 'question' | 'answer', value: string) {
    const updated = [...form.faqItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, faqItems: updated });
  }

  function removeFaq(idx: number) {
    setForm({ ...form, faqItems: form.faqItems.filter((_, i) => i !== idx) });
  }

  async function saveOverride() {
    // In production: POST to /api/v1/admin/seo
    const newItem: SeoOverride = {
      id: editingItem?.id || `seo_${Date.now()}`,
      path: form.path,
      module: form.module,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogTitle: form.ogTitle || undefined,
      ogDescription: form.ogDescription || undefined,
      ogImage: form.ogImage || undefined,
      robotsIndex: form.robotsIndex,
      sitemapInclude: form.sitemapInclude,
      faqItems: form.faqItems.filter(f => f.question && f.answer),
      updatedAt: new Date().toISOString(),
    };

    if (editingItem) {
      setOverrides(overrides.map(o => o.id === editingItem.id ? newItem : o));
    } else {
      setOverrides([...overrides, newItem]);
    }
    setShowEditor(false);
  }

  const titleLength = form.metaTitle.length;
  const descLength = form.metaDescription.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SEO Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage metadata, Open Graph tags, schema, and FAQs for all pages</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
          title="Add new SEO override"
        >
          <Plus className="w-4 h-4" /> Add Override
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search by path or title..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            title="Search SEO overrides"
          />
        </div>
        <select
          value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          title="Filter by module"
        >
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Overrides', value: overrides.length, icon: FileText, color: 'indigo' },
          { label: 'Indexed Pages', value: overrides.filter(o => o.robotsIndex).length, icon: Globe, color: 'green' },
          { label: 'With FAQs', value: overrides.filter(o => o.faqItems?.length).length, icon: Hash, color: 'purple' },
          { label: 'With OG Image', value: overrides.filter(o => o.ogImage).length, icon: Image, color: 'orange' },
        ].map(stat => (
          <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
              <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
            </div>
            <span className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Overrides Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Path</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Module</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Meta Title</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Indexed</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">FAQs</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverrides.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No SEO overrides yet. Click "Add Override" to create one.</td></tr>
            ) : (
              filteredOverrides.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{item.path}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{item.module}</span></td>
                  <td className="px-4 py-3 text-slate-700 truncate max-w-[200px]">{item.metaTitle || '—'}</td>
                  <td className="px-4 py-3">
                    {item.robotsIndex ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.faqItems?.length || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditor(item)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => setOverrides(overrides.filter(o => o.id !== item.id))} className="p-1.5 text-slate-400 hover:text-red-500 ml-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              {editingItem ? 'Edit SEO Override' : 'New SEO Override'}
            </h2>

            <div className="space-y-4">
              {/* Path + Module */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="page-path">Page Path *</label>
                  <input id="page-path" type="text" value={form.path} onChange={e => setForm({...form, path: e.target.value})}
                    placeholder="/marketplace/product/iphone-17" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" title="Page path" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="module">Module</label>
                  <select id="module" value={form.module} onChange={e => setForm({...form, module: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" title="Module">
                    {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Meta Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Meta Title <span className={titleLength > 60 ? 'text-red-500' : 'text-slate-400'}>({titleLength}/60)</span>
                </label>
                <input type="text" value={form.metaTitle} onChange={e => setForm({...form, metaTitle: e.target.value})}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm ${titleLength > 60 ? 'border-red-300' : 'border-slate-200'}`} title="Meta title" />
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Meta Description <span className={descLength > 160 ? 'text-red-500' : 'text-slate-400'}>({descLength}/160)</span>
                </label>
                <textarea value={form.metaDescription} onChange={e => setForm({...form, metaDescription: e.target.value})}
                  rows={3} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${descLength > 160 ? 'border-red-300' : 'border-slate-200'}`} title="Meta description" />
              </div>

              {/* OG Tags */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Open Graph Tags</h3>
                <div className="space-y-3">
                  <input type="text" value={form.ogTitle} onChange={e => setForm({...form, ogTitle: e.target.value})}
                    placeholder="OG Title (defaults to meta title)" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" title="OG title" />
                  <textarea value={form.ogDescription} onChange={e => setForm({...form, ogDescription: e.target.value})}
                    placeholder="OG Description" rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" title="OG description" />
                  <input type="url" value={form.ogImage} onChange={e => setForm({...form, ogImage: e.target.value})}
                    placeholder="OG Image URL (https://...  1200x630)" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" title="OG image URL" />
                </div>
              </div>

              {/* Robots + Sitemap */}
              <div className="flex gap-6 border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.robotsIndex} onChange={e => setForm({...form, robotsIndex: e.target.checked})} />
                  <span className="font-medium text-slate-700">Index this page</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.sitemapInclude} onChange={e => setForm({...form, sitemapInclude: e.target.checked})} />
                  <span className="font-medium text-slate-700">Include in sitemap</span>
                </label>
              </div>

              {/* FAQ Items */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">FAQ Items (AEO)</h3>
                  <button onClick={addFaqItem} className="text-xs font-bold text-indigo-600 hover:text-indigo-800" title="Add FAQ item">+ Add FAQ</button>
                </div>
                {form.faqItems.map((faq, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={faq.question} onChange={e => updateFaq(i, 'question', e.target.value)}
                      placeholder="Question" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" title={`FAQ question ${i+1}`} />
                    <input type="text" value={faq.answer} onChange={e => updateFaq(i, 'answer', e.target.value)}
                      placeholder="Answer" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" title={`FAQ answer ${i+1}`} />
                    <button onClick={() => removeFaq(i)} className="p-2 text-red-400 hover:text-red-600" title="Remove FAQ"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowEditor(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl" title="Cancel">Cancel</button>
              <button onClick={saveOverride} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700" title="Save override">
                {editingItem ? 'Update' : 'Create'} Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
