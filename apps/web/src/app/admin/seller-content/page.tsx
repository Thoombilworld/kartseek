'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState, useMemo } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Search, Eye, Edit3, CheckCircle, XCircle, AlertTriangle, ChevronDown,
  Package, Store, Star, Filter, Image as ImageIcon, Tag, DollarSign,
  MoreHorizontal, Clock, ShieldCheck, Ban, RefreshCw, ArrowUpDown, ExternalLink,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ── Types ─────────────────────────────────────────────────────────────────

type ContentStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
type ContentModule = 'marketplace' | 'grocery' | 'pharmacy' | 'restaurant';

interface SellerContent {
  id: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  module: ContentModule;
  category: string;
  price: number;
  mrp: number;
  images: number;
  status: ContentStatus;
  submittedAt: string;
  lastUpdated: string;
  issues: string[];
  rating: number;
  stock: number;
  description: string;
  brand: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_CONTENT: SellerContent[] = [
  { id: 'SC-001', productName: 'Wireless Bluetooth Earbuds Pro', sellerId: 'SEL-001', sellerName: 'TechPro Electronics', module: 'marketplace', category: 'Electronics', price: 2499, mrp: 3999, images: 5, status: 'pending', submittedAt: '2026-06-20', lastUpdated: '2026-06-20', issues: [], rating: 0, stock: 150, description: 'Premium wireless earbuds with ANC, 40hr battery.', brand: 'TechPro' },
  { id: 'SC-002', productName: 'Organic Quinoa (1kg)', sellerId: 'SEL-003', sellerName: 'Nature Fresh Organics', module: 'grocery', category: 'Health Foods', price: 450, mrp: 599, images: 3, status: 'approved', submittedAt: '2026-06-18', lastUpdated: '2026-06-19', issues: [], rating: 4.5, stock: 80, description: 'Premium organic quinoa, rich in protein.', brand: 'NatureFresh' },
  { id: 'SC-003', productName: 'Vitamin D3 Supplements (60 caps)', sellerId: 'SEL-005', sellerName: 'MediCare Plus', module: 'pharmacy', category: 'Supplements', price: 349, mrp: 450, images: 2, status: 'flagged', submittedAt: '2026-06-17', lastUpdated: '2026-06-20', issues: ['Missing FSSAI label', 'Expiry date not visible'], rating: 3.8, stock: 200, description: 'Daily Vitamin D3 supplement 1000IU.', brand: 'HealthPlus' },
  { id: 'SC-004', productName: 'Handmade Silk Kurta Set', sellerId: 'SEL-002', sellerName: 'Royal Ethnic Wear', module: 'marketplace', category: 'Fashion', price: 4999, mrp: 7999, images: 8, status: 'approved', submittedAt: '2026-06-15', lastUpdated: '2026-06-16', issues: [], rating: 4.7, stock: 25, description: 'Pure silk kurta with intricate embroidery.', brand: 'RoyalEthnic' },
  { id: 'SC-005', productName: 'Fresh Farm Eggs (30 pcs)', sellerId: 'SEL-003', sellerName: 'Nature Fresh Organics', module: 'grocery', category: 'Dairy & Eggs', price: 249, mrp: 280, images: 2, status: 'pending', submittedAt: '2026-06-21', lastUpdated: '2026-06-21', issues: [], rating: 0, stock: 500, description: 'Farm-fresh, free-range eggs.', brand: 'FarmFresh' },
  { id: 'SC-006', productName: 'Blood Pressure Monitor (Digital)', sellerId: 'SEL-005', sellerName: 'MediCare Plus', module: 'pharmacy', category: 'Medical Devices', price: 1899, mrp: 2499, images: 4, status: 'rejected', submittedAt: '2026-06-16', lastUpdated: '2026-06-18', issues: ['No BIS certification', 'Misleading accuracy claims'], rating: 0, stock: 45, description: 'Automatic BP monitor with memory storage.', brand: 'HealthTrack' },
  { id: 'SC-007', productName: 'Men\'s Running Shoes', sellerId: 'SEL-006', sellerName: 'SportZone India', module: 'marketplace', category: 'Footwear', price: 3299, mrp: 4999, images: 6, status: 'approved', submittedAt: '2026-06-14', lastUpdated: '2026-06-15', issues: [], rating: 4.3, stock: 60, description: 'Lightweight running shoes with cushioned sole.', brand: 'SportZone' },
  { id: 'SC-008', productName: 'Basmati Rice (5kg Premium)', sellerId: 'SEL-007', sellerName: 'Grain House Wholesale', module: 'grocery', category: 'Staples', price: 599, mrp: 750, images: 3, status: 'pending', submittedAt: '2026-06-21', lastUpdated: '2026-06-21', issues: [], rating: 0, stock: 300, description: 'Aged premium basmati rice.', brand: 'IndiaGate' },
  { id: 'SC-009', productName: 'Paracetamol 500mg (Strip of 15)', sellerId: 'SEL-005', sellerName: 'MediCare Plus', module: 'pharmacy', category: 'OTC Medicine', price: 25, mrp: 32, images: 1, status: 'approved', submittedAt: '2026-06-12', lastUpdated: '2026-06-13', issues: [], rating: 4.9, stock: 1000, description: 'Paracetamol tablets for pain and fever.', brand: 'Crocin' },
  { id: 'SC-010', productName: 'Smart LED TV 43" 4K', sellerId: 'SEL-001', sellerName: 'TechPro Electronics', module: 'marketplace', category: 'Electronics', price: 24999, mrp: 34999, images: 7, status: 'flagged', submittedAt: '2026-06-19', lastUpdated: '2026-06-20', issues: ['Energy rating not specified'], rating: 4.1, stock: 20, description: '43 inch 4K Smart LED TV with built-in streaming.', brand: 'TechPro' },
];

// ── Status Badge ──────────────────────────────────────────────────────────

const statusConfig: Record<ContentStatus, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle },
  flagged: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: AlertTriangle },
};

const moduleConfig: Record<ContentModule, { color: string; label: string }> = {
  marketplace: { color: 'bg-blue-100 text-blue-700', label: 'Marketplace' },
  grocery: { color: 'bg-green-100 text-green-700', label: 'Grocery' },
  pharmacy: { color: 'bg-purple-100 text-purple-700', label: 'Pharmacy' },
  restaurant: { color: 'bg-orange-100 text-orange-700', label: 'Restaurant' },
};

// ── Content Review Modal ──────────────────────────────────────────────────

function ContentReviewModal({ content, onClose, onAction }: {
  content: SellerContent;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject' | 'flag') => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    productName: content.productName,
    price: content.price,
    mrp: content.mrp,
    description: content.description,
    brand: content.brand,
    category: content.category,
  });

  const sc = statusConfig[content.status];
  const StatusIcon = sc.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}><DismissOnEscape onDismiss={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Content Review</h2>
              <p className="text-xs text-slate-500">{content.id} • Submitted {content.submittedAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${sc.bg} ${sc.text} border px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 capitalize`}>
              <StatusIcon className="w-3 h-3" />{content.status}
            </span>
            <button onClick={onClose} aria-label="Close review" className="text-slate-400 hover:text-slate-600 p-1">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Seller Info */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {content.sellerName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-800">{content.sellerName}</p>
              <p className="text-xs text-slate-500">{content.sellerId} • <span className={`${moduleConfig[content.module].color} px-1.5 py-0.5 rounded text-[10px] font-bold`}>{moduleConfig[content.module].label}</span></p>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Product Name</label>
              {editMode ? (
                <input aria-label="Product name" value={editData.productName} onChange={e => setEditData(p => ({ ...p, productName: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
              ) : (
                <p className="font-bold text-slate-900 mt-0.5">{content.productName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Selling Price</label>
                {editMode ? (
                  <input aria-label="Selling price" type="number" value={editData.price} onChange={e => setEditData(p => ({ ...p, price: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                ) : (
                  <p className="font-bold text-slate-900 mt-0.5">₹{content.price.toLocaleString()}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">MRP</label>
                {editMode ? (
                  <input aria-label="MRP" type="number" value={editData.mrp} onChange={e => setEditData(p => ({ ...p, mrp: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                ) : (
                  <p className="font-bold text-slate-900 mt-0.5">₹{content.mrp.toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Brand</label>
                {editMode ? (
                  <input aria-label="Brand" value={editData.brand} onChange={e => setEditData(p => ({ ...p, brand: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                ) : (
                  <p className="font-semibold text-slate-900 mt-0.5">{content.brand}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Category</label>
                {editMode ? (
                  <input aria-label="Category" value={editData.category} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                ) : (
                  <p className="font-semibold text-slate-900 mt-0.5">{content.category}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Description</label>
              {editMode ? (
                <textarea aria-label="Product description" value={editData.description} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none" />
              ) : (
                <p className="text-sm text-slate-700 mt-0.5">{content.description}</p>
              )}
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{content.images}</p>
                <p className="text-[10px] text-slate-500">Images</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{content.stock}</p>
                <p className="text-[10px] text-slate-500">Stock</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{content.rating > 0 ? content.rating : '—'}</p>
                <p className="text-[10px] text-slate-500">Rating</p>
              </div>
            </div>

            {/* Issues */}
            {content.issues.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <h4 className="text-xs font-bold text-red-800 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Issues Detected</h4>
                <ul className="space-y-1">
                  {content.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-center gap-1.5">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> {editMode ? 'Cancel Edit' : 'Edit Content'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onAction(content.id, 'reject')}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => onAction(content.id, 'flag')}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Flag
            </button>
            <button
              onClick={() => onAction(content.id, 'approve')}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SELLER CONTENT MANAGEMENT PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function SellerContentPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [data, setData] = useState(MOCK_CONTENT);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<ContentModule | 'all'>('all');
  const [reviewContent, setReviewContent] = useState<SellerContent | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date');

  const filtered = useMemo(() => {
    let list = data;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (moduleFilter !== 'all') list = list.filter(c => c.module === moduleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.productName.toLowerCase().includes(q) ||
        c.sellerName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => sortBy === 'date' ? b.submittedAt.localeCompare(a.submittedAt) : b.price - a.price);
    return list;
  }, [data, statusFilter, moduleFilter, search, sortBy]);

  const stats = useMemo(() => ({
    total: data.length,
    pending: data.filter(c => c.status === 'pending').length,
    approved: data.filter(c => c.status === 'approved').length,
    rejected: data.filter(c => c.status === 'rejected').length,
    flagged: data.filter(c => c.status === 'flagged').length,
  }), [data]);

  const handleAction = (id: string, action: 'approve' | 'reject' | 'flag') => {
    const statusMap: Record<string, ContentStatus> = { approve: 'approved', reject: 'rejected', flag: 'flagged' };
    setData(prev => prev.map(c => c.id === id ? { ...c, status: statusMap[action] } : c));
    setReviewContent(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Content Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, edit, approve, and moderate content posted by sellers</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Sync Content
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Package className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 font-medium">Total Submissions</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-amber-600 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Pending Review</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.approved}</p>
          <p className="text-xs text-slate-500 font-medium">Approved</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-2xl font-black text-red-600 mt-2">{stats.rejected}</p>
          <p className="text-xs text-slate-500 font-medium">Rejected</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <p className="text-2xl font-black text-orange-600 mt-2">{stats.flagged}</p>
          <p className="text-xs text-slate-500 font-medium">Flagged</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by product, seller, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
        <select
          aria-label="Filter by module"
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value as any)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Modules</option>
          <option value="marketplace">Marketplace</option>
          <option value="grocery">Grocery</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="restaurant">Restaurant</option>
        </select>
        <button
          onClick={() => setSortBy(s => s === 'date' ? 'price' : 'date')}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 bg-white"
        >
          <ArrowUpDown className="w-3.5 h-3.5" /> Sort: {sortBy === 'date' ? 'Newest' : 'Price'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Seller</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Module</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Submitted</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => {
                const sc = statusConfig[item.status];
                const mc = moduleConfig[item.module];
                const StatusIcon = sc.icon;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate max-w-[200px]">{item.productName}</p>
                          <p className="text-[10px] text-slate-400">{item.id} • {item.brand} • {item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 text-xs">{item.sellerName}</p>
                      <p className="text-[10px] text-slate-400">{item.sellerId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${mc.color} px-2 py-0.5 rounded text-[10px] font-bold`}>{mc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">₹{item.price.toLocaleString()}</p>
                      {item.mrp > item.price && <p className="text-[10px] text-slate-400 line-through">₹{item.mrp.toLocaleString()}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${sc.bg} ${sc.text} border px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 w-fit capitalize`}>
                        <StatusIcon className="w-3 h-3" />{item.status}
                      </span>
                      {item.issues.length > 0 && (
                        <p className="text-[9px] text-red-500 mt-0.5">{item.issues.length} issue{item.issues.length > 1 ? 's' : ''}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.submittedAt}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setReviewContent(item)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Review">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction(item.id, 'approve')} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Quick Approve">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </button>
                            <button onClick={() => handleAction(item.id, 'reject')} className="p-1.5 hover:bg-red-50 rounded-lg" title="Quick Reject">
                              <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {filtered.length} of {data.length} submissions
        </div>
      </div>

      {/* Review Modal */}
      {reviewContent && (
        <ContentReviewModal
          content={reviewContent}
          onClose={() => setReviewContent(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
