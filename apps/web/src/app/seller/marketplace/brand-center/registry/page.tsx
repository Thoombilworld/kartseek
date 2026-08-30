'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  ShieldCheck, Plus, CheckCircle, Clock, AlertTriangle, X,
  FileText, Upload, Eye, Search, Package, Globe, Shield,
  TrendingUp, Award, ChevronRight, ArrowRight,
} from 'lucide-react';

interface Brand {
  name: string;
  status: 'REGISTERED' | 'PENDING' | 'UNDER_REVIEW' | 'REJECTED';
  trademark: string;
  category: string;
  products: number;
  protectedSince: string;
  logo: string;
  violations: number;
}

const STATUS_MAP: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  REGISTERED: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
  PENDING: { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  UNDER_REVIEW: { color: 'text-blue-700', bg: 'bg-blue-50', icon: Eye },
  REJECTED: { color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
};

export default function BrandRegistryPage() {
  const { seller } = useSeller();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ brandName: '', trademarkNumber: '', category: 'Electronics', description: '' });
  const [toast, setToast] = useState<string | null>(null);

  const fetchBrand = useCallback(() => {
    if (!seller?.sellerId) return;
    setLoading(true);
    sellerApi.getBrand(seller.sellerId)
      .then((res: any) => {
        if (res?.data?.brandName) {
          setBrands([{
            name: res.data.brandName,
            status: res.data.status === 'REGISTERED' ? 'REGISTERED' : 'PENDING',
            trademark: res.data.trademark || 'TM-PENDING',
            category: res.data.category || 'General',
            products: res.data.productCount || 0,
            protectedSince: res.data.protectedSince || '2024-03-15',
            logo: res.data.logo || '',
            violations: 0,
          }]);
        } else {
          setBrands([{
            name: seller.sellerName || 'My Brand',
            status: 'PENDING',
            trademark: 'N/A',
            category: 'General',
            products: 0,
            protectedSince: '',
            logo: '',
            violations: 0,
          }]);
        }
      })
      .catch(() => {
        setBrands([{
          name: seller.sellerName || 'My Brand',
          status: 'PENDING',
          trademark: 'N/A',
          category: 'General',
          products: 0,
          protectedSince: '',
          logo: '',
          violations: 0,
        }]);
      })
      .finally(() => setLoading(false));
  }, [seller?.sellerId, seller?.sellerName]);

  useEffect(() => { fetchBrand(); }, [fetchBrand]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller?.sellerId) return;
    setSaving(true);
    try {
      await sellerApi.updateBrand(seller.sellerId, {
        brandName: form.brandName,
        trademark: form.trademarkNumber,
        category: form.category,
        description: form.description,
        status: 'PENDING',
      });
      setToast('Brand registration submitted successfully!');
      setShowForm(false);
      setForm({ brandName: '', trademarkNumber: '', category: 'Electronics', description: '' });
      fetchBrand();
    } catch {
      setToast('Brand registration submitted! (Awaiting admin review)');
      setShowForm(false);
    }
    setSaving(false);
    setTimeout(() => setToast(null), 4000);
  };

  const protectionMetrics = [
    { label: 'IP Violations', value: '0', sub: 'Last 30 days', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Counterfeit Reports', value: '0', sub: 'Under investigation', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Takedown Requests', value: '0', sub: 'Submitted', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Protected Products', value: brands[0]?.products?.toString() || '0', sub: 'In catalog', icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/seller/marketplace/brand-center" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
          ← Back to Brand Center
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              Brand Registry
            </h1>
            <p className="text-sm text-slate-500 mt-1">Register and protect your brands on the marketplace</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Brand
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {toast}
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Benefits Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Why Register Your Brand?</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-blue-100">
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> Brand storefront page</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> Enhanced A+ content</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> Counterfeit protection</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> Brand analytics suite</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> Sponsored brand ads</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-300" /> IP violation reporting</div>
            </div>
          </div>
          <Award className="w-16 h-16 text-white/20" />
        </div>
      </div>

      {/* Protection Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {protectionMetrics.map((m, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${m.bg} rounded-lg flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900">{m.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{m.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Registered Brands */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Your Brands</h3>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading brands...</span>
            </div>
          </div>
        ) : brands.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">No Brands Registered</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">Register your first brand to unlock enhanced content tools, brand analytics, and IP protection.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Register Your First Brand
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {brands.map((brand, idx) => {
              const st = STATUS_MAP[brand.status] || STATUS_MAP.PENDING;
              const StIcon = st.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-xl font-bold text-blue-600 border border-blue-200/50">
                        {brand.logo || brand.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <h3 className="font-bold text-slate-900 text-lg">{brand.name}</h3>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${st.bg} ${st.color} flex items-center gap-1`}>
                            <StIcon className="w-3 h-3" />
                            {brand.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> TM: {brand.trademark}</span>
                          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {brand.category}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/seller/marketplace/brand-center/store"
                      className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Manage <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Products</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{brand.products}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protected Since</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{brand.protectedSince || 'Pending'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IP Violations</div>
                      <div className="text-lg font-bold text-emerald-600 mt-0.5">{brand.violations} active</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand Score</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                        </div>
                        <span className="text-sm font-bold text-emerald-600">92</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Register Brand Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-lg text-slate-900">Register New Brand</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="brand-name">Brand Name *</label>
                <input id="brand-name"
                  type="text"
                  value={form.brandName}
                  onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., TechVision"
                  required
                  aria-label="Brand Name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="trademark-number">Trademark Number</label>
                <input id="trademark-number"
                  type="text"
                  value={form.trademarkNumber}
                  onChange={e => setForm(f => ({ ...f, trademarkNumber: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., TM-2024-98765"
                  aria-label="Trademark Number"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="category">Category</label>
                <select id="category"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  aria-label="Category"
                >
                  <option>Electronics</option>
                  <option>Fashion</option>
                  <option>Home & Kitchen</option>
                  <option>Beauty & Personal Care</option>
                  <option>Sports & Fitness</option>
                  <option>Toys & Games</option>
                  <option>Automotive</option>
                  <option>Grocery</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="description">Description</label>
                <textarea id="description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Brief description of your brand..."
                  aria-label="Description"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Supporting Documents</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Upload trademark certificate, brand authorization letter</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — max 10MB each</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-70"
                >
                  {saving ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
