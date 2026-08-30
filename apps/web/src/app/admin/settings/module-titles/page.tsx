'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Edit3, Save, RotateCcw, Eye, CheckCircle, AlertTriangle,
  Search as SearchIcon, FileText, Hash, Image as ImageIcon, Type,
  ChevronDown, ChevronUp, ExternalLink, Info,
} from 'lucide-react';
import {
  getAllModuleTitleConfigs,
  saveModuleTitleConfig,
  resetModuleTitleConfig,
  getDefaultConfig,
  MODULE_KEYS,
  type ModuleTitleConfig,
  type ModuleKey,
} from '@/lib/config/module-titles';

// ── SEO Score Calculator ────────────────────────────────────────────────────

function calcSeoScore(config: ModuleTitleConfig): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  // Title length (ideal: 50–60 chars)
  const titleLen = config.pageTitle.length;
  if (titleLen < 30) { score -= 15; issues.push('Title too short (< 30 chars)'); }
  else if (titleLen > 70) { score -= 10; issues.push('Title too long (> 70 chars)'); }

  // Description length (ideal: 150–160 chars)
  const descLen = config.metaDescription.length;
  if (descLen < 80) { score -= 15; issues.push('Description too short (< 80 chars)'); }
  else if (descLen > 200) { score -= 10; issues.push('Description too long (> 200 chars)'); }

  // Keywords
  if (config.keywords.length < 3) { score -= 10; issues.push('Too few keywords (< 3)'); }

  // OG title
  if (!config.ogTitle || config.ogTitle.length < 10) { score -= 10; issues.push('OG title missing or too short'); }

  // Contains brand name
  if (!config.pageTitle.toLowerCase().includes('kartseek') && !config.ogTitle.toLowerCase().includes('kartseek')) {
    score -= 5; issues.push('Consider including brand name in title');
  }

  return { score: Math.max(0, score), issues };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminModuleTitlesPage() {
  const [configs, setConfigs] = useState<ModuleTitleConfig[]>([]);
  const [expandedModule, setExpandedModule] = useState<ModuleKey | null>(null);
  const [editMode, setEditMode] = useState<ModuleKey | null>(null);
  const [editForm, setEditForm] = useState<ModuleTitleConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewModule, setPreviewModule] = useState<ModuleKey | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  useEffect(() => {
    setConfigs(getAllModuleTitleConfigs());
  }, []);

  const handleEdit = (key: ModuleKey) => {
    const config = configs.find(c => c.key === key);
    if (config) {
      setEditForm({ ...config });
      setEditMode(key);
      setExpandedModule(key);
    }
  };

  const handleSave = () => {
    if (!editForm || !editMode) return;
    saveModuleTitleConfig(editMode, editForm);
    setConfigs(getAllModuleTitleConfigs());
    setEditMode(null);
    setEditForm(null);
    showToast(`✅ ${editForm.label} page title updated. Changes take effect on next page load.`);
  };

  const handleReset = (key: ModuleKey) => {
    resetModuleTitleConfig(key);
    setConfigs(getAllModuleTitleConfigs());
    setEditMode(null);
    setEditForm(null);
    showToast(`🔄 ${getDefaultConfig(key).label} reset to default title.`);
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditForm(null);
  };

  const avgScore = configs.length > 0
    ? Math.round(configs.reduce((s, c) => s + calcSeoScore(c).score, 0) / configs.length)
    : 0;

  const moduleRoutes: Record<ModuleKey, string> = {
    marketplace: '/marketplace',
    grocery: '/grocery',
    restaurant: '/restaurant',
    pharmacy: '/pharmacy',
    doctor: '/doctor',
    'hotel-booking': '/hotel-booking',
    taxi: '/taxi',
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Globe className="w-6 h-6 text-blue-500" /> Module Page Titles</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure SEO-friendly page titles, meta descriptions, and Open Graph tags for all 7 customer-facing modules</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-blue-500 uppercase">Total Modules</p>
          <p className="text-2xl font-black text-blue-700">{configs.length}</p>
        </div>
        <div className={`${avgScore >= 80 ? 'bg-emerald-50 border-emerald-200' : avgScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Avg SEO Score</p>
          <p className={`text-2xl font-black ${avgScore >= 80 ? 'text-emerald-700' : avgScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{avgScore}/100</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-violet-500 uppercase">Customized</p>
          <p className="text-2xl font-black text-violet-700">{configs.filter((c, i) => {
            const def = getDefaultConfig(c.key);
            return c.pageTitle !== def.pageTitle || c.metaDescription !== def.metaDescription;
          }).length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Using Defaults</p>
          <p className="text-2xl font-black text-slate-700">{configs.filter((c) => {
            const def = getDefaultConfig(c.key);
            return c.pageTitle === def.pageTitle && c.metaDescription === def.metaDescription;
          }).length}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-bold mb-1">How Module Titles Work</p>
          <p>Each module&apos;s homepage displays a unique <code className="bg-blue-100 px-1 rounded">&lt;title&gt;</code> tag for SEO. The <b>Page Title</b> appears in browser tabs and search results. The <b>Meta Description</b> appears as the snippet in Google/Bing results. <b>OG Title</b> is used when pages are shared on social media. Changes are applied immediately on the next page load.</p>
        </div>
      </div>

      {/* Module Cards */}
      <div className="space-y-3">
        {configs.map(config => {
          const isEditing = editMode === config.key;
          const isExpanded = expandedModule === config.key;
          const { score, issues } = calcSeoScore(config);
          const defaultConfig = getDefaultConfig(config.key);
          const isCustomized = config.pageTitle !== defaultConfig.pageTitle || config.metaDescription !== defaultConfig.metaDescription;
          const form = isEditing ? editForm! : config;

          return (
            <div key={config.key} className={`bg-white border rounded-xl overflow-hidden transition-shadow ${isEditing ? 'border-blue-300 shadow-blue-100 shadow-md' : 'border-slate-200 hover:shadow-sm'}`}>
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{config.label}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">{moduleRoutes[config.key]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCustomized && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Customized</span>}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      SEO {score}/100
                    </span>
                  </div>
                </div>

                {/* Current Title Preview */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Current Page Title</p>
                  <p className="text-sm font-bold text-blue-700">{config.pageTitle}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">KARTSEEK | {config.pageTitle}</p>
                </div>

                {/* Google SERP Preview */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-bold text-slate-400 mb-2">🔍 Google Search Preview</p>
                  <div>
                    <p className="text-blue-700 text-sm font-medium hover:underline cursor-pointer truncate">{config.pageTitle} | KARTSEEK</p>
                    <p className="text-emerald-700 text-[11px] font-mono">kartseek.com{moduleRoutes[config.key]}</p>
                    <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{config.metaDescription}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={() => handleEdit(config.key)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg"><Edit3 className="w-3.5 h-3.5" /> Edit Title</button>
                      {isCustomized && <button onClick={() => handleReset(config.key)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg"><RotateCcw className="w-3.5 h-3.5" /> Reset to Default</button>}
                      <a href={moduleRoutes[config.key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg ml-auto"><ExternalLink className="w-3.5 h-3.5" /> Preview</a>
                    </>
                  ) : (
                    <>
                      <button onClick={handleSave} className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><Save className="w-3.5 h-3.5" /> Save Changes</button>
                      <button onClick={handleCancel} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg">Cancel</button>
                    </>
                  )}
                  <button onClick={() => setExpandedModule(isExpanded && !isEditing ? null : config.key)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded ml-auto">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Editor / Details */}
              {(isExpanded || isEditing) && (
                <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4">
                  {isEditing ? (
                    /* ── Edit Form ── */
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <Type className="w-3 h-3 inline mr-1" />Page Title
                            <span className={`ml-2 ${(editForm?.pageTitle.length || 0) > 60 ? 'text-red-500' : 'text-emerald-500'}`}>({editForm?.pageTitle.length || 0}/60 chars)</span>
                          </label>
                          <input
                            title="Page Title"
                            value={editForm?.pageTitle || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, pageTitle: e.target.value } : prev)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="SEO-friendly page title"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <Globe className="w-3 h-3 inline mr-1" />OG Title (Social Media)
                            <span className={`ml-2 ${(editForm?.ogTitle.length || 0) > 65 ? 'text-red-500' : 'text-emerald-500'}`}>({editForm?.ogTitle.length || 0}/65 chars)</span>
                          </label>
                          <input
                            title="OG Title"
                            value={editForm?.ogTitle || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, ogTitle: e.target.value } : prev)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Title shown when shared on social media"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          <FileText className="w-3 h-3 inline mr-1" />Meta Description
                          <span className={`ml-2 ${(editForm?.metaDescription.length || 0) > 160 ? 'text-red-500' : (editForm?.metaDescription.length || 0) < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>({editForm?.metaDescription.length || 0}/160 chars)</span>
                        </label>
                        <textarea
                          title="Meta Description"
                          value={editForm?.metaDescription || ''}
                          onChange={e => setEditForm(prev => prev ? { ...prev, metaDescription: e.target.value } : prev)}
                          rows={3}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                          placeholder="Compelling description for search engine results"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <Hash className="w-3 h-3 inline mr-1" />Keywords (comma-separated)
                          </label>
                          <input
                            title="Keywords"
                            value={editForm?.keywords.join(', ') || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) } : prev)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="keyword1, keyword2, keyword3"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Title Template
                          </label>
                          <input
                            title="Title Template"
                            value={editForm?.titleTemplate || ''}
                            onChange={e => setEditForm(prev => prev ? { ...prev, titleTemplate: e.target.value } : prev)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="%s | KARTSEEK Module"
                          />
                          <p className="text-[9px] text-slate-400 mt-1">%s is replaced with the sub-page title (e.g., product name, doctor name)</p>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div className="bg-white border border-blue-200 rounded-lg p-4">
                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">🔍 Live Google Preview</p>
                        <p className="text-blue-700 text-sm font-medium truncate">{editForm?.pageTitle} | KARTSEEK</p>
                        <p className="text-emerald-700 text-[11px] font-mono">kartseek.com{moduleRoutes[config.key]}</p>
                        <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{editForm?.metaDescription}</p>
                      </div>

                      {/* Social Preview */}
                      <div className="bg-white border border-blue-200 rounded-lg p-4">
                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">📱 Social Media Share Preview</p>
                        <div className="bg-slate-100 rounded-lg overflow-hidden max-w-sm">
                          <div className="h-24 bg-linear-to-br from-slate-300 to-slate-400 flex items-center justify-center text-4xl">{config.icon}</div>
                          <div className="p-3">
                            <p className="text-[10px] text-slate-400 uppercase font-mono">kartseek.com</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{editForm?.ogTitle}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{editForm?.metaDescription}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── Read-Only Details ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Meta Description</p>
                          <p className="text-xs text-slate-700 mt-1">{config.metaDescription}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">OG Title</p>
                          <p className="text-xs text-slate-700 mt-1">{config.ogTitle}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Title Template</p>
                          <p className="text-xs text-slate-700 mt-1 font-mono">{config.titleTemplate}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Keywords</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.keywords.map(k => <span key={k} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{k}</span>)}
                          </div>
                        </div>
                        {issues.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 uppercase">SEO Issues</p>
                            <ul className="mt-1 space-y-0.5">
                              {issues.map((issue, i) => <li key={i} className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{issue}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
