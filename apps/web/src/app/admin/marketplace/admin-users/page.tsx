'use client';
import React, { useState } from 'react';
import { UserCog, Search, Plus, X, ChevronLeft, ChevronRight, Download, Eye, Shield, Lock, Edit3, Trash2, CheckCircle, Clock } from 'lucide-react';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type AdminUser = {
  id: string; name: string; email: string; role: string; status: 'Active' | 'Inactive' | 'Locked';
  lastLogin: string; permissions: string[]; createdAt: string; avatar: string;
};

const ROLES = ['Super Admin', 'Finance Admin', 'Content Moderator', 'Customer Support', 'Seller Manager', 'Marketing Lead', 'Analytics Viewer'];
const PERMISSION_GROUPS = {
  'Sellers': ['sellers.view', 'sellers.approve', 'sellers.suspend', 'sellers.manage'],
  'Products': ['products.view', 'products.approve', 'products.edit', 'products.delete'],
  'Orders': ['orders.view', 'orders.manage', 'orders.cancel', 'orders.refund'],
  'Finance': ['payments.view', 'payouts.process', 'commissions.edit', 'wallets.adjust'],
  'Content': ['reviews.moderate', 'qa.moderate', 'complaints.resolve', 'notifications.send'],
  'Marketing': ['campaigns.manage', 'coupons.create', 'banners.edit', 'promotions.manage'],
  'Settings': ['settings.view', 'settings.edit', 'admin_users.manage', 'audit.view'],
};

const ADMINS: AdminUser[] = [
  { id: 'ADM-001', name: 'Rajesh Kumar', email: 'rajesh@kartseek.com', role: 'Super Admin', status: 'Active', lastLogin: '2026-06-06 14:30', permissions: ['*'], createdAt: '2025-01-01', avatar: '👨‍💼' },
  { id: 'ADM-002', name: 'Priya Agent', email: 'priya@kartseek.com', role: 'Customer Support', status: 'Active', lastLogin: '2026-06-06 16:00', permissions: ['orders.view', 'orders.manage', 'complaints.resolve', 'reviews.moderate', 'qa.moderate'], createdAt: '2025-03-15', avatar: '👩‍💻' },
  { id: 'ADM-003', name: 'Vikram Lead', email: 'vikram@kartseek.com', role: 'Seller Manager', status: 'Active', lastLogin: '2026-06-06 11:00', permissions: ['sellers.view', 'sellers.approve', 'sellers.suspend', 'sellers.manage', 'products.view', 'products.approve'], createdAt: '2025-02-10', avatar: '👨‍💻' },
  { id: 'ADM-004', name: 'Ananya Desai', email: 'ananya@kartseek.com', role: 'Finance Admin', status: 'Active', lastLogin: '2026-06-05 17:30', permissions: ['payments.view', 'payouts.process', 'commissions.edit', 'wallets.adjust', 'orders.view'], createdAt: '2025-04-20', avatar: '👩‍💼' },
  { id: 'ADM-005', name: 'Arjun Mehta', email: 'arjun@kartseek.com', role: 'Marketing Lead', status: 'Active', lastLogin: '2026-06-06 09:00', permissions: ['campaigns.manage', 'coupons.create', 'banners.edit', 'promotions.manage', 'notifications.send'], createdAt: '2025-05-01', avatar: '👨‍🎨' },
  { id: 'ADM-006', name: 'Sneha Nair', email: 'sneha@kartseek.com', role: 'Content Moderator', status: 'Inactive', lastLogin: '2026-05-20 10:00', permissions: ['reviews.moderate', 'qa.moderate', 'products.view'], createdAt: '2025-06-15', avatar: '👩‍🔧' },
  { id: 'ADM-007', name: 'Guest Account', email: 'guest@kartseek.com', role: 'Analytics Viewer', status: 'Locked', lastLogin: '2026-04-10 08:00', permissions: ['orders.view', 'payments.view', 'audit.view'], createdAt: '2025-07-01', avatar: '👤' },
];

const STATUS_STYLES: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', Inactive: 'bg-slate-100 text-slate-600', Locked: 'bg-red-50 text-red-700' };
const ROLE_COLORS: Record<string, string> = { 'Super Admin': 'bg-red-50 text-red-700', 'Finance Admin': 'bg-blue-50 text-blue-700', 'Content Moderator': 'bg-purple-50 text-purple-700', 'Customer Support': 'bg-emerald-50 text-emerald-700', 'Seller Manager': 'bg-amber-50 text-amber-700', 'Marketing Lead': 'bg-indigo-50 text-indigo-700', 'Analytics Viewer': 'bg-slate-100 text-slate-600' };

// ── User Drawer ──────────────────────────────────────────────────────────────
function UserDrawer({ user: u, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3"><span className="text-3xl">{u.avatar}</span><div><h2 className="text-lg font-black text-slate-900">{u.name}</h2><p className="text-xs text-slate-500">{u.email}</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[u.status]}`}>{u.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${ROLE_COLORS[u.role] || 'bg-slate-100'}`}>{u.role}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Last Login</p><p className="text-sm font-bold text-slate-900">{u.lastLogin}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Created</p><p className="text-sm font-bold text-slate-900">{u.createdAt}</p></div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />Permissions</h3>
            {u.permissions.includes('*') ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><Shield className="w-5 h-5 text-red-600" /><div><p className="text-sm font-bold text-red-800">Full Access</p><p className="text-xs text-red-600">This user has unrestricted access to all admin features.</p></div></div>
            ) : (
              <div className="space-y-2">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                  const granted = perms.filter(p => u.permissions.includes(p));
                  if (granted.length === 0) return null;
                  return (
                    <div key={group} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-1">{group}</p>
                      <div className="flex flex-wrap gap-1">{granted.map(p => (<span key={p} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{p.split('.')[1]}</span>))}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Admin Modal ───────────────────────────────────────────────────────
function CreateAdminModal({ onSave, onClose }: { onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: ROLES[0], permissions: [] as string[] });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const togglePerm = (p: string) => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Add Admin User</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="full-name">Full Name</label><input id="full-name" value={form.name} onChange={e => u('name', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="email">Email</label><input id="email" type="email" value={form.email} onChange={e => u('email', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="role">Role</label><select id="role" value={form.role} onChange={e => u('role', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none">{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Permissions</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <div key={group} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-700 mb-1">{group}</p>
                  <div className="flex flex-wrap gap-1">{perms.map(p => (<button key={p} onClick={() => togglePerm(p)} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${form.permissions.includes(p) ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50'}`}>{p.split('.')[1]}</button>))}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.email} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getSettings(), []);
  const { execute } = useAdminAction(showToast);

  const filtered = ADMINS.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = (data: any) => { execute(() => adminMarketplaceApi.updateSettings(data), `Admin ${data.name} created`, () => refetch()); setShowCreate(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Admin Users & Roles</h1><p className="text-sm text-slate-500 mt-0.5">Manage admin accounts, roles, and permissions (RBAC)</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Add Admin</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Total', v: ADMINS.length, c: 'text-slate-900' }, { l: 'Active', v: ADMINS.filter(u => u.status === 'Active').length, c: 'text-emerald-600' }, { l: 'Roles', v: new Set(ADMINS.map(u => u.role)).size, c: 'text-blue-600' }, { l: 'Locked', v: ADMINS.filter(u => u.status === 'Locked').length, c: 'text-red-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', ...ROLES.slice(0, 5)].map(r => (<button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${roleFilter === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{r === 'all' ? 'All' : r}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">User</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Role</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Permissions</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Last Login</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6}><MarketplaceEmptyState title="No admin users found" icon={UserCog} /></td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(u)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(u))}>
                <td className="px-4 py-3.5 flex items-center gap-3"><span className="text-2xl">{u.avatar}</span><div><p className="font-bold text-slate-900 text-xs">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_COLORS[u.role] || 'bg-slate-100'}`}>{u.role}</span></td>
                <td className="px-4 py-3.5 text-center"><span className="text-xs font-bold text-slate-900">{u.permissions.includes('*') ? 'Full' : u.permissions.length}</span></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[u.status]}`}>{u.status}</span></td>
                <td className="px-4 py-3.5 text-xs text-slate-600">{u.lastLogin}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(u)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
      {showCreate && <CreateAdminModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
