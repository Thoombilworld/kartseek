'use client';
import React, { useState } from 'react';
import {
  Users,
  Search,
  Download,
  Eye,
  Ban,
  CheckCircle,
  X,
  ShoppingBag,
  CreditCard,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = {
  India: 'IN',
  UAE: 'AE',
  UK: 'GB',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  status: 'active' | 'suspended' | 'blocked';
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  avgRating: number;
  returns: number;
  complaints: number;
};

const CUSTOMERS: Customer[] = [
  {
    id: 'CUS-1001',
    name: 'Ananya Sharma',
    email: 'ananya@example.com',
    phone: '+91-98765-43210',
    country: 'India',
    city: 'Bengaluru',
    status: 'active',
    joinDate: '2025-12-15',
    totalOrders: 23,
    totalSpent: 485000,
    lastOrder: '2026-06-05',
    avgRating: 4.8,
    returns: 1,
    complaints: 0,
  },
  {
    id: 'CUS-1002',
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '+91-98765-43211',
    country: 'India',
    city: 'New Delhi',
    status: 'active',
    joinDate: '2026-01-20',
    totalOrders: 15,
    totalSpent: 280000,
    lastOrder: '2026-06-04',
    avgRating: 4.5,
    returns: 2,
    complaints: 0,
  },
  {
    id: 'CUS-1003',
    name: 'Priya Mehta',
    email: 'priya@example.com',
    phone: '+91-98765-43212',
    country: 'India',
    city: 'Mumbai',
    status: 'active',
    joinDate: '2026-02-10',
    totalOrders: 8,
    totalSpent: 145000,
    lastOrder: '2026-06-01',
    avgRating: 4.9,
    returns: 0,
    complaints: 0,
  },
  {
    id: 'CUS-1004',
    name: 'Suspicious User',
    email: 'fake@disposable.com',
    phone: '+91-00000-00000',
    country: 'India',
    city: 'Unknown',
    status: 'blocked',
    joinDate: '2026-05-28',
    totalOrders: 2,
    totalSpent: 0,
    lastOrder: '2026-05-29',
    avgRating: 0,
    returns: 2,
    complaints: 3,
  },
  {
    id: 'CUS-1005',
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '+91-98765-43214',
    country: 'India',
    city: 'Ahmedabad',
    status: 'active',
    joinDate: '2025-11-05',
    totalOrders: 34,
    totalSpent: 620000,
    lastOrder: '2026-06-06',
    avgRating: 4.7,
    returns: 3,
    complaints: 1,
  },
  {
    id: 'CUS-2001',
    name: 'Ahmed Al-Farsi',
    email: 'ahmed@example.com',
    phone: '+971-50-123-4567',
    country: 'UAE',
    city: 'Dubai',
    status: 'active',
    joinDate: '2026-01-15',
    totalOrders: 12,
    totalSpent: 28500,
    lastOrder: '2026-06-05',
    avgRating: 4.6,
    returns: 1,
    complaints: 0,
  },
  {
    id: 'CUS-2002',
    name: 'Fatima Al-Rashid',
    email: 'fatima@example.com',
    phone: '+971-55-987-6543',
    country: 'UAE',
    city: 'Abu Dhabi',
    status: 'active',
    joinDate: '2026-03-20',
    totalOrders: 6,
    totalSpent: 15800,
    lastOrder: '2026-06-03',
    avgRating: 5.0,
    returns: 0,
    complaints: 0,
  },
  {
    id: 'CUS-3001',
    name: 'Abdullah Al-Otaibi',
    email: 'abdullah@example.com',
    phone: '+966-55-123-4567',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    status: 'suspended',
    joinDate: '2026-02-01',
    totalOrders: 18,
    totalSpent: 42000,
    lastOrder: '2026-05-15',
    avgRating: 3.2,
    returns: 8,
    complaints: 4,
  },
  {
    id: 'CUS-4001',
    name: 'James Wilson',
    email: 'james@example.com',
    phone: '+44-7911-123456',
    country: 'UK',
    city: 'London',
    status: 'active',
    joinDate: '2026-04-10',
    totalOrders: 4,
    totalSpent: 6800,
    lastOrder: '2026-06-02',
    avgRating: 4.8,
    returns: 0,
    complaints: 0,
  },
];

const PAGE_SIZE = 8;

// ── Customer Detail Drawer ───────────────────────────────────────────────────
function CustomerDetailDrawer({
  customer: c,
  onClose,
  onBlock,
  onUnblock,
}: {
  customer: Customer;
  onClose: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{c.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{c.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <MarketplaceStatusBadge
              status={
                c.status === 'active' ? 'active' : c.status === 'suspended' ? 'pending' : 'rejected'
              }
              customLabel={c.status}
            />
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
              <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" /> {c.country}
            </span>
          </div>

          {/* Contact */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" /> {c.email}
            </p>
            <p className="text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" /> {c.phone}
            </p>
            <p className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> {c.city}, {c.country}
            </p>
            <p className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Joined {c.joinDate}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <ShoppingBag className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-black text-blue-700">{c.totalOrders}</p>
              <p className="text-[10px] text-blue-600">Total Orders</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <CreditCard className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xl font-black text-emerald-700">
                ₹{(c.totalSpent / 1000).toFixed(0)}K
              </p>
              <p className="text-[10px] text-emerald-600">Total Spent</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <Star className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-black text-amber-700">{c.avgRating || '—'}</p>
              <p className="text-[10px] text-amber-600">Avg Rating</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-black text-red-600">{c.complaints}</p>
              <p className="text-[10px] text-red-500">Complaints</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {[
              { label: 'Last Order', value: c.lastOrder },
              { label: 'Returns', value: `${c.returns} returns` },
              { label: 'Complaints', value: `${c.complaints} complaints` },
            ].map((row, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
              >
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm font-bold text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {c.status !== 'blocked' ? (
              <button
                onClick={onBlock}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" /> Block Customer
              </button>
            ) : (
              <button
                onClick={onUnblock}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Unblock Customer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Block Confirmation ───────────────────────────────────────────────────────
function BlockModal({
  customer,
  action,
  onConfirm,
  onClose,
}: {
  customer: Customer;
  action: 'block' | 'unblock';
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const isBlock = action === 'block';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {isBlock ? (
            <Ban className="w-6 h-6 text-red-500" />
          ) : (
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          )}
          <h3 className="text-lg font-black text-slate-900">
            {isBlock ? 'Block' : 'Unblock'} Customer
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {isBlock ? 'This will prevent' : 'This will allow'}{' '}
          <span className="font-bold">{customer.name}</span>{' '}
          {isBlock
            ? 'from placing orders or accessing their account.'
            : 'to access their account and place orders again.'}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isBlock ? 'Reason for blocking...' : 'Note (optional)...'}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-red-200 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isBlock && !reason.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${isBlock ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          >
            {isBlock ? 'Block' : 'Unblock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [blockAction, setBlockAction] = useState<{
    customer: Customer;
    action: 'block' | 'unblock';
  } | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(
    () => adminMarketplaceApi.getCustomers({ search: search || undefined, country }),
    [search, country],
  );
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
    formatCurrencyValue,
  } = useMarketplaceRegionFilter(CUSTOMERS);

  const filtered = regionFiltered.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.email.toLowerCase().includes(search.toLowerCase()) &&
      !c.id.includes(search)
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleBlockConfirm = (reason: string) => {
    if (!blockAction) return;
    const { customer, action } = blockAction;
    execute(
      () => adminMarketplaceApi.blockCustomer(customer.id),
      `Customer ${customer.name} ${action}ed`,
      () => refetch(),
    );
    setBlockAction(null);
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Customer Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Manage marketplace customers
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{regionFiltered.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Customers</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">
            {regionFiltered.filter((c) => c.status === 'active').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-amber-600">
            {regionFiltered.filter((c) => c.status === 'suspended').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Suspended</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-red-600">
            {regionFiltered.filter((c) => c.status === 'blocked').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Blocked</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['', 'active', 'suspended', 'blocked'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Email</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Country
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Orders</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Spent</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Rating</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Joined</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <MarketplaceEmptyState title="No customers found" icon={Users} />
                </td>
              </tr>
            ) : (
              paged.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCustomer(c)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelectedCustomer(c))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.id}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{c.email}</td>
                  <td className="px-4 py-3.5 text-center">
                    <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                    {c.totalOrders}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    ₹{(c.totalSpent / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-bold">
                      {c.avgRating ? `⭐ ${c.avgRating}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceStatusBadge
                      status={
                        c.status === 'active'
                          ? 'active'
                          : c.status === 'suspended'
                            ? 'pending'
                            : 'rejected'
                      }
                      customLabel={c.status}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{c.joinDate}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      {c.status !== 'blocked' && (
                        <button
                          onClick={() => setBlockAction({ customer: c, action: 'block' })}
                          className="p-1.5 hover:bg-red-50 rounded-lg"
                        >
                          <Ban className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                      {c.status === 'blocked' && (
                        <button
                          onClick={() => setBlockAction({ customer: c, action: 'unblock' })}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">{filtered.length} customers</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onBlock={() => setBlockAction({ customer: selectedCustomer, action: 'block' })}
          onUnblock={() => setBlockAction({ customer: selectedCustomer, action: 'unblock' })}
        />
      )}
      {blockAction && (
        <BlockModal
          customer={blockAction.customer}
          action={blockAction.action}
          onConfirm={handleBlockConfirm}
          onClose={() => setBlockAction(null)}
        />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
