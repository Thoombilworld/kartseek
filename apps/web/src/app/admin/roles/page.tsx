'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  Shield, Users, Search, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Edit, Eye, Lock, Unlock, Plus, Settings, X, Save, Copy, Trash2,
  ToggleRight, ToggleLeft, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Permission = { key: string; label: string; group: string };
type Role = {
  id: string; name: string; description: string; userCount: number; level: 'platform' | 'regional' | 'partner' | 'operations';
  color: string; permissions: string[]; isSystem: boolean;
};

const allPermissions: Permission[] = [
  // Dashboard
  { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' },
  // Users
  { key: 'users.view', label: 'View Users', group: 'Users' },
  { key: 'users.manage', label: 'Manage Users', group: 'Users' },
  { key: 'users.delete', label: 'Delete Users', group: 'Users' },
  // Sellers
  { key: 'sellers.view', label: 'View Sellers', group: 'Sellers' },
  { key: 'sellers.manage', label: 'Manage Sellers', group: 'Sellers' },
  { key: 'sellers.approve', label: 'Approve Sellers', group: 'Sellers' },
  // Orders
  { key: 'orders.view', label: 'View Orders', group: 'Orders' },
  { key: 'orders.manage', label: 'Manage Orders', group: 'Orders' },
  { key: 'orders.refund', label: 'Process Refunds', group: 'Orders' },
  // Finance
  { key: 'finance.view', label: 'View Financials', group: 'Finance' },
  { key: 'finance.payouts', label: 'Process Payouts', group: 'Finance' },
  { key: 'finance.reports', label: 'Export Reports', group: 'Finance' },
  // KYC
  { key: 'kyc.view', label: 'View KYC', group: 'KYC' },
  { key: 'kyc.approve', label: 'Approve KYC', group: 'KYC' },
  // Content
  { key: 'content.view', label: 'View Content', group: 'Content' },
  { key: 'content.manage', label: 'Manage Content', group: 'Content' },
  { key: 'promotions.manage', label: 'Manage Promotions', group: 'Content' },
  // System
  { key: 'system.settings', label: 'System Settings', group: 'System' },
  { key: 'system.health', label: 'System Health', group: 'System' },
  { key: 'audit.logs', label: 'Audit Logs', group: 'System' },
  // Franchise
  { key: 'franchise.view', label: 'View Franchises', group: 'Franchise' },
  { key: 'franchise.manage', label: 'Manage Franchises', group: 'Franchise' },
  // Delivery
  { key: 'delivery.view', label: 'View Delivery Ops', group: 'Delivery' },
  { key: 'delivery.manage', label: 'Manage Delivery', group: 'Delivery' },
  // Support
  { key: 'support.view', label: 'View Support Tickets', group: 'Support' },
  { key: 'support.respond', label: 'Respond to Tickets', group: 'Support' },
  // Modules
  { key: 'modules.marketplace', label: 'Marketplace Module', group: 'Modules' },
  { key: 'modules.grocery', label: 'Grocery Module', group: 'Modules' },
  { key: 'modules.restaurant', label: 'Restaurant Module', group: 'Modules' },
  { key: 'modules.pharmacy', label: 'Pharmacy Module', group: 'Modules' },
  { key: 'modules.doctor', label: 'Doctor Module', group: 'Modules' },
  { key: 'modules.taxi', label: 'Taxi Module', group: 'Modules' },
  // Staff
  { key: 'staff.view', label: 'View Staff', group: 'Staff' },
  { key: 'staff.manage', label: 'Manage Staff', group: 'Staff' },
  { key: 'staff.invite', label: 'Invite Staff', group: 'Staff' },
  // Loyalty
  { key: 'loyalty.config', label: 'Manage Loyalty Configuration', group: 'Loyalty' },
  { key: 'loyalty.adjust', label: 'Adjust User Points', group: 'Loyalty' },
  { key: 'loyalty.view', label: 'View Loyalty Analytics', group: 'Loyalty' },
  // Wallet
  { key: 'wallet.audit', label: 'View Wallet Transactions', group: 'Wallet' },
  { key: 'wallet.adjust', label: 'Adjust Wallet Balance', group: 'Wallet' },
  { key: 'wallet.freeze', label: 'Freeze/Unfreeze Wallets', group: 'Wallet' },
];

const INITIAL_ROLES: Role[] = [
  { id: 'R-01', name: 'Super Admin', description: 'Full platform access with all permissions. Cannot be modified or deleted.', userCount: 2, level: 'platform', color: 'bg-red-100 text-red-700 border-red-200', permissions: allPermissions.map(p => p.key), isSystem: true },
  { id: 'R-02', name: 'Admin', description: 'Platform-wide management excluding system settings and user deletion.', userCount: 8, level: 'platform', color: 'bg-orange-100 text-orange-700 border-orange-200', permissions: allPermissions.filter(p => !['users.delete', 'system.settings'].includes(p.key)).map(p => p.key), isSystem: true },
  { id: 'R-03', name: 'Country Manager', description: 'Oversees all operations within a specific country.', userCount: 3, level: 'regional', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', permissions: ['dashboard.view', 'users.view', 'users.manage', 'sellers.view', 'sellers.manage', 'sellers.approve', 'orders.view', 'orders.manage', 'finance.view', 'finance.reports', 'kyc.view', 'kyc.approve', 'franchise.view', 'franchise.manage', 'delivery.view', 'delivery.manage', 'support.view', 'staff.view'], isSystem: true },
  { id: 'R-04', name: 'State/District Manager', description: 'Manages operations within a state or district.', userCount: 12, level: 'regional', color: 'bg-blue-100 text-blue-700 border-blue-200', permissions: ['dashboard.view', 'sellers.view', 'sellers.manage', 'orders.view', 'orders.manage', 'kyc.view', 'kyc.approve', 'franchise.view', 'delivery.view', 'delivery.manage', 'support.view', 'support.respond'], isSystem: true },
  { id: 'R-05', name: 'Franchise Admin', description: 'Manages local vendors and delivery zones within their franchise territory.', userCount: 45, level: 'regional', color: 'bg-teal-100 text-teal-700 border-teal-200', permissions: ['dashboard.view', 'sellers.view', 'sellers.manage', 'orders.view', 'kyc.view', 'franchise.view', 'delivery.view', 'delivery.manage'], isSystem: true },
  { id: 'R-06', name: 'Seller', description: 'Marketplace seller with product and order management.', userCount: 1240, level: 'partner', color: 'bg-blue-50 text-blue-600 border-blue-100', permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'modules.marketplace'], isSystem: true },
  { id: 'R-07', name: 'Grocery Seller', description: 'Grocery store operator with inventory and order management.', userCount: 680, level: 'partner', color: 'bg-green-100 text-green-700 border-green-200', permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'modules.grocery'], isSystem: true },
  { id: 'R-08', name: 'Restaurant Partner', description: 'Restaurant owner/manager.', userCount: 520, level: 'partner', color: 'bg-orange-50 text-orange-600 border-orange-100', permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'modules.restaurant'], isSystem: true },
  { id: 'R-09', name: 'Pharmacy Partner', description: 'Licensed pharmacy with Rx verification.', userCount: 340, level: 'partner', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'modules.pharmacy'], isSystem: true },
  { id: 'R-10', name: 'Doctor/Hospital Partner', description: 'Healthcare provider managing appointments.', userCount: 180, level: 'partner', color: 'bg-purple-100 text-purple-700 border-purple-200', permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'modules.doctor'], isSystem: true },
  { id: 'R-11', name: 'Taxi Vendor', description: 'Fleet owner managing drivers and vehicles.', userCount: 95, level: 'partner', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', permissions: ['dashboard.view', 'orders.view', 'delivery.view', 'modules.taxi'], isSystem: true },
  { id: 'R-12', name: 'Taxi Driver', description: 'Individual driver handling ride requests.', userCount: 2400, level: 'operations', color: 'bg-amber-50 text-amber-600 border-amber-100', permissions: ['dashboard.view', 'orders.view', 'modules.taxi'], isSystem: true },
  { id: 'R-13', name: 'Delivery Boy', description: 'Delivery partner handling pick-up and drop-off.', userCount: 1850, level: 'operations', color: 'bg-violet-100 text-violet-700 border-violet-200', permissions: ['dashboard.view', 'orders.view', 'delivery.view'], isSystem: true },
  { id: 'R-14', name: 'Customer Support Agent', description: 'Handles customer queries and complaints.', userCount: 65, level: 'operations', color: 'bg-pink-100 text-pink-700 border-pink-200', permissions: ['dashboard.view', 'users.view', 'orders.view', 'orders.refund', 'support.view', 'support.respond'], isSystem: true },
  { id: 'R-15', name: 'Finance Manager', description: 'Oversees platform financials and payouts.', userCount: 8, level: 'operations', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', permissions: ['dashboard.view', 'finance.view', 'finance.payouts', 'finance.reports', 'orders.view'], isSystem: true },
  { id: 'R-16', name: 'Content/Promotion Manager', description: 'Manages banners, campaigns, and promotions.', userCount: 12, level: 'operations', color: 'bg-rose-100 text-rose-700 border-rose-200', permissions: ['dashboard.view', 'content.view', 'content.manage', 'promotions.manage'], isSystem: true },
  { id: 'R-17', name: 'Customer', description: 'End-user with access to shopping and ordering.', userCount: 124500, level: 'operations', color: 'bg-slate-100 text-slate-600 border-slate-200', permissions: ['dashboard.view'], isSystem: true },
];

const levelLabels: Record<string, { label: string; bg: string }> = {
  platform: { label: 'Platform', bg: 'bg-red-50 text-red-700' },
  regional: { label: 'Regional', bg: 'bg-indigo-50 text-indigo-700' },
  partner: { label: 'Partner', bg: 'bg-teal-50 text-teal-700' },
  operations: { label: 'Operations', bg: 'bg-slate-50 text-slate-600' },
};

const permissionGroups = [...new Set(allPermissions.map(p => p.group))];

// ── Role Editor Modal ───────────────────────────────────────────────────────

function RoleEditorModal({ role, isViewOnly, onSave, onClose }: {
  role?: Role;
  isViewOnly?: boolean;
  onSave: (data: Partial<Role>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [level, setLevel] = useState<Role['level']>(role?.level || 'operations');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || ['dashboard.view']);

  const togglePermission = (key: string) => {
    if (isViewOnly) return;
    setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleGroup = (group: string) => {
    if (isViewOnly) return;
    const groupPerms = allPermissions.filter(p => p.group === group).map(p => p.key);
    const allSelected = groupPerms.every(k => permissions.includes(k));
    if (allSelected) {
      setPermissions(prev => prev.filter(k => !groupPerms.includes(k)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const readOnly = isViewOnly || (role?.isSystem && role?.name === 'Super Admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {isViewOnly ? 'View Role' : role ? 'Edit Role' : 'Create Custom Role'}
            </h3>
            {readOnly && <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> This role is read-only</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="role-name">Role Name *</label>
              <input id="role-name" value={name} onChange={e => setName(e.target.value)} disabled={readOnly}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500" placeholder="e.g. Regional Coordinator" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="access-level">Access Level</label>
              <select id="access-level" value={level} onChange={e => setLevel(e.target.value as Role['level'])} disabled={readOnly}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none disabled:bg-slate-50" aria-label="Access level">
                <option value="platform">Platform</option>
                <option value="regional">Regional</option>
                <option value="partner">Partner</option>
                <option value="operations">Operations</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} disabled={readOnly} rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:bg-slate-50 disabled:text-slate-500" placeholder="Describe this role's responsibilities..." />
          </div>

          {/* Permissions Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase">Permissions ({permissions.length}/{allPermissions.length})</p>
              {!readOnly && (
                <div className="flex gap-2">
                  <button onClick={() => setPermissions(allPermissions.map(p => p.key))} className="text-[10px] text-blue-600 font-bold hover:underline">Select All</button>
                  <button onClick={() => setPermissions(['dashboard.view'])} className="text-[10px] text-slate-400 font-bold hover:underline">Clear All</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissionGroups.map(group => {
                const groupPerms = allPermissions.filter(p => p.group === group);
                const selectedCount = groupPerms.filter(p => permissions.includes(p.key)).length;
                const allSelected = selectedCount === groupPerms.length;
                return (
                  <div key={group} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => toggleGroup(group)} disabled={readOnly} className="flex items-center gap-2 disabled:cursor-default">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected ? 'border-blue-500 bg-blue-500' : selectedCount > 0 ? 'border-blue-300 bg-blue-100' : 'border-slate-300'}`}>
                          {allSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          {!allSelected && selectedCount > 0 && <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{group}</span>
                      </button>
                      <span className="text-[9px] text-slate-400 font-bold">{selectedCount}/{groupPerms.length}</span>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {groupPerms.map(p => (
                        <label key={p.key} className={`flex items-center gap-2 text-xs cursor-pointer ${readOnly ? 'cursor-default' : ''}`}>
                          <input type="checkbox" checked={permissions.includes(p.key)} onChange={() => togglePermission(p.key)} disabled={readOnly} className="rounded text-blue-600" />
                          <span className={permissions.includes(p.key) ? 'text-slate-700' : 'text-slate-400'}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {!isViewOnly && (
          <div className="flex gap-3 p-5 border-t border-slate-200">
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={() => {
              onSave({ name, description, level, permissions, isSystem: false, color: 'bg-blue-100 text-blue-700 border-blue-200', userCount: role?.userCount || 0 });
              onClose();
            }} disabled={!name.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        )}
        {isViewOnly && (
          <div className="flex gap-3 p-5 border-t border-slate-200">
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [search, setSearch] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | undefined>(undefined);
  const [viewOnlyModal, setViewOnlyModal] = useState(false);

  const filtered = roles.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'All' || r.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const totalUsers = roles.reduce((a, r) => a + r.userCount, 0);

  const handleSaveRole = (data: Partial<Role>) => {
    if (editRole) {
      setRoles(prev => prev.map(r => r.id === editRole.id ? { ...r, ...data } : r));
    } else {
      setRoles(prev => [...prev, { ...data, id: `R-${String(prev.length + 1).padStart(2, '0')}` } as Role]);
    }
  };

  const deleteRole = (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) { alert('System roles cannot be deleted.'); return; }
    if (role && role.userCount > 0) { alert(`Cannot delete — ${role.userCount} users are assigned to this role.`); return; }
    if (confirm(`Delete role "${role?.name}"?`)) {
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  const duplicateRole = (role: Role) => {
    const newRole: Role = {
      ...role,
      id: `R-${String(roles.length + 1).padStart(2, '0')}`,
      name: `${role.name} (Copy)`,
      userCount: 0,
      isSystem: false,
    };
    setRoles(prev => [...prev, newRole]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-slate-500 text-sm">Manage access control across the KARTSEEK platform. <Link href="/admin/staff" className="text-blue-600 font-bold hover:underline">Manage Staff →</Link></p>
        </div>
        <button onClick={() => { setEditRole(undefined); setViewOnlyModal(false); setShowModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Create Custom Role
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-red-500" /><p className="text-2xl font-black text-slate-900 mt-2">{roles.length}</p><p className="text-xs text-slate-500 font-medium">Total Roles</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{totalUsers.toLocaleString()}</p><p className="text-xs text-slate-500 font-medium">Total Users</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Lock className="w-5 h-5 text-indigo-500" /><p className="text-2xl font-black text-slate-900 mt-2">{allPermissions.length}</p><p className="text-xs text-slate-500 font-medium">Permissions</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Settings className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">4</p><p className="text-xs text-slate-500 font-medium">Access Levels</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Filter by level">
          <option value="All">All Levels</option>
          <option value="platform">Platform</option>
          <option value="regional">Regional</option>
          <option value="partner">Partner</option>
          <option value="operations">Operations</option>
        </select>
      </div>

      {/* Roles Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Role</th>
                <th className="px-5 py-3.5 font-semibold">Level</th>
                <th className="px-5 py-3.5 font-semibold text-center">Users</th>
                <th className="px-5 py-3.5 font-semibold text-center">Permissions</th>
                <th className="px-5 py-3.5 font-semibold text-center">Type</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedRole(expandedRole === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedRole(expandedRole === r.id ? null : r.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${r.color} border`}><Shield className="w-4 h-4" /></div>
                        <div><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400 max-w-xs truncate">{r.description}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`${levelLabels[r.level].bg} px-2.5 py-1 rounded-md text-xs font-bold`}>{levelLabels[r.level].label}</span></td>
                    <td className="px-5 py-4 text-center font-bold text-slate-900">{r.userCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{r.permissions.length}/{allPermissions.length}</span></td>
                    <td className="px-5 py-4 text-center">
                      {r.isSystem ? <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">SYSTEM</span> : <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">CUSTOM</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditRole(r); setViewOnlyModal(true); setShowModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="View"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditRole(r); setViewOnlyModal(false); setShowModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit className="w-4 h-4 text-blue-500" /></button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateRole(r); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Duplicate"><Copy className="w-4 h-4 text-slate-400" /></button>
                        {!r.isSystem && (
                          <button onClick={(e) => { e.stopPropagation(); deleteRole(r.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setExpandedRole(expandedRole === r.id ? null : r.id); }}>
                          {expandedRole === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRole === r.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={6} className="px-5 py-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Permissions ({r.permissions.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {allPermissions.map(p => {
                            const has = r.permissions.includes(p.key);
                            return (
                              <span key={p.key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                has ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                              }`}>
                                {has ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {p.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {filtered.length} of {roles.length} roles
        </div>
      </div>

      {/* Role Editor Modal */}
      {showModal && (
        <RoleEditorModal
          role={editRole}
          isViewOnly={viewOnlyModal}
          onSave={handleSaveRole}
          onClose={() => { setShowModal(false); setEditRole(undefined); setViewOnlyModal(false); }}
        />
      )}
    </div>
  );
}
