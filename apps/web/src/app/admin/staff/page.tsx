'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, Eye, ToggleRight, ToggleLeft,
  Shield, Mail, Phone, MapPin, Calendar, Clock, X, Save, Key,
  UserCheck, UserX, Filter, Download, MoreHorizontal, ChevronDown,
  ShieldCheck, AlertTriangle,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type StaffStatus = 'active' | 'inactive' | 'suspended';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleId: string;
  department: string;
  region: string;
  status: StaffStatus;
  joinedAt: string;
  lastActive: string;
  avatar: string;
  twoFactorEnabled: boolean;
}

const DEMO_STAFF: StaffMember[] = [
  { id: 'STF-001', name: 'Rajesh Kumar', email: 'rajesh@kartseek.com', phone: '+91 98765 43210', role: 'Super Admin', roleId: 'R-01', department: 'Engineering', region: 'All Regions', status: 'active', joinedAt: '2024-01-15', lastActive: '2 min ago', avatar: 'RK', twoFactorEnabled: true },
  { id: 'STF-002', name: 'Sarah Al-Rashid', email: 'sarah@kartseek.com', phone: '+971 50 123 4567', role: 'Admin', roleId: 'R-02', department: 'Operations', region: 'UAE', status: 'active', joinedAt: '2024-03-22', lastActive: '15 min ago', avatar: 'SR', twoFactorEnabled: true },
  { id: 'STF-003', name: 'James Patterson', email: 'james@kartseek.com', phone: '+44 7911 123456', role: 'Country Manager', roleId: 'R-03', department: 'Regional', region: 'United Kingdom', status: 'active', joinedAt: '2024-05-10', lastActive: '1h ago', avatar: 'JP', twoFactorEnabled: true },
  { id: 'STF-004', name: 'Fatima Noor', email: 'fatima@kartseek.com', phone: '+966 55 987 6543', role: 'Country Manager', roleId: 'R-03', department: 'Regional', region: 'Saudi Arabia', status: 'active', joinedAt: '2024-06-01', lastActive: '3h ago', avatar: 'FN', twoFactorEnabled: false },
  { id: 'STF-005', name: 'Priya Sharma', email: 'priya@kartseek.com', phone: '+91 87654 32109', role: 'Finance Manager', roleId: 'R-15', department: 'Finance', region: 'India', status: 'active', joinedAt: '2024-07-12', lastActive: '30 min ago', avatar: 'PS', twoFactorEnabled: true },
  { id: 'STF-006', name: 'Ahmed Hassan', email: 'ahmed@kartseek.com', phone: '+974 5555 1234', role: 'State/District Manager', roleId: 'R-04', department: 'Regional', region: 'Qatar', status: 'active', joinedAt: '2024-08-05', lastActive: '2h ago', avatar: 'AH', twoFactorEnabled: false },
  { id: 'STF-007', name: 'David Chen', email: 'david@kartseek.com', phone: '+1 555 789 0123', role: 'Content/Promotion Manager', roleId: 'R-16', department: 'Marketing', region: 'All Regions', status: 'active', joinedAt: '2024-09-18', lastActive: '45 min ago', avatar: 'DC', twoFactorEnabled: true },
  { id: 'STF-008', name: 'Maria Garcia', email: 'maria@kartseek.com', phone: '+1 555 456 7890', role: 'Customer Support Agent', roleId: 'R-14', department: 'Support', region: 'All Regions', status: 'active', joinedAt: '2024-10-02', lastActive: '5 min ago', avatar: 'MG', twoFactorEnabled: false },
  { id: 'STF-009', name: 'Omar Farooq', email: 'omar@kartseek.com', phone: '+965 9876 5432', role: 'Admin', roleId: 'R-02', department: 'Operations', region: 'Kuwait', status: 'inactive', joinedAt: '2024-04-11', lastActive: '3 days ago', avatar: 'OF', twoFactorEnabled: false },
  { id: 'STF-010', name: 'Lisa Thompson', email: 'lisa@kartseek.com', phone: '+44 7700 900123', role: 'Customer Support Agent', roleId: 'R-14', department: 'Support', region: 'United Kingdom', status: 'suspended', joinedAt: '2025-01-20', lastActive: '1 week ago', avatar: 'LT', twoFactorEnabled: false },
  { id: 'STF-011', name: 'Vikram Singh', email: 'vikram@kartseek.com', phone: '+91 76543 21098', role: 'State/District Manager', roleId: 'R-04', department: 'Regional', region: 'India', status: 'active', joinedAt: '2024-11-05', lastActive: '20 min ago', avatar: 'VS', twoFactorEnabled: true },
  { id: 'STF-012', name: 'Aisha Mohammed', email: 'aisha@kartseek.com', phone: '+968 9123 4567', role: 'Finance Manager', roleId: 'R-15', department: 'Finance', region: 'Oman', status: 'active', joinedAt: '2025-02-14', lastActive: '1h ago', avatar: 'AM', twoFactorEnabled: true },
];

const DEPARTMENTS = ['All', 'Engineering', 'Operations', 'Regional', 'Finance', 'Marketing', 'Support'];
const REGIONS = ['All Regions', 'India', 'UAE', 'Saudi Arabia', 'Qatar', 'United Kingdom', 'Kuwait', 'Oman', 'USA'];
const ADMIN_ROLES = [
  { id: 'R-01', name: 'Super Admin' },
  { id: 'R-02', name: 'Admin' },
  { id: 'R-03', name: 'Country Manager' },
  { id: 'R-04', name: 'State/District Manager' },
  { id: 'R-14', name: 'Customer Support Agent' },
  { id: 'R-15', name: 'Finance Manager' },
  { id: 'R-16', name: 'Content/Promotion Manager' },
];

const statusConfig: Record<StaffStatus, { label: string; bg: string; dot: string }> = {
  active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  suspended: { label: 'Suspended', bg: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
};

// ── Add/Edit Staff Modal ────────────────────────────────────────────────────

function StaffModal({ staff, onSave, onClose }: {
  staff?: StaffMember;
  onSave: (data: Partial<StaffMember>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(staff?.name || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [roleId, setRoleId] = useState(staff?.roleId || 'R-02');
  const [department, setDepartment] = useState(staff?.department || 'Operations');
  const [region, setRegion] = useState(staff?.region || 'All Regions');
  const [status, setStatus] = useState<StaffStatus>(staff?.status || 'active');
  const [twoFactor, setTwoFactor] = useState(staff?.twoFactorEnabled || false);
  const [sendInvite, setSendInvite] = useState(!staff);

  const selectedRole = ADMIN_ROLES.find(r => r.id === roleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">{staff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{staff ? 'Update staff details and permissions' : 'Invite a new team member to the admin panel'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Close dialog" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="full-name">Full Name *</label>
              <input id="full-name" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="email-address">Email Address *</label>
              <input id="email-address" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@kartseek.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="phone-number">Phone Number</label>
              <input id="phone-number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="role">Role *</label>
              <select id="role" value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Staff role">
                {ADMIN_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="department">Department</label>
              <select id="department" value={department} onChange={e => setDepartment(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Department">
                {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="region">Region</label>
              <select id="region" value={region} onChange={e => setRegion(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Region">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Security & Access</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p><p className="text-xs text-slate-400">Require 2FA for this user</p></div>
                <button onClick={() => setTwoFactor(!twoFactor)} className="flex items-center gap-1.5">
                  {twoFactor ? <ToggleRight className="w-7 h-7 text-emerald-600" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-slate-900">Account Status</p><p className="text-xs text-slate-400">Control user access to the admin panel</p></div>
                <select value={status} onChange={e => setStatus(e.target.value as StaffStatus)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none" aria-label="Account status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              {!staff && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-slate-700">Send invitation email with login credentials</span>
                </label>
              )}
            </div>
          </div>

          {selectedRole && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">Role: {selectedRole.name}</p>
              <p className="text-[10px] text-blue-600">This user will inherit all permissions associated with the &ldquo;{selectedRole.name}&rdquo; role. You can customize permissions from the Roles &amp; Permissions page.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={() => {
            const role = ADMIN_ROLES.find(r => r.id === roleId);
            onSave({
              name, email, phone, roleId, role: role?.name || '', department, region, status,
              twoFactorEnabled: twoFactor,
              avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              joinedAt: staff?.joinedAt || new Date().toISOString().split('T')[0],
              lastActive: staff?.lastActive || 'Just now',
            });
            onClose();
          }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {staff ? 'Update Staff' : 'Add & Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Details Drawer ────────────────────────────────────────────────────

function StaffDrawer({ staff, onClose, onEdit, onForce2FA }: {
  staff: StaffMember;
  onClose: () => void;
  onEdit: () => void;
  onForce2FA: (id: string) => void;
}) {
  const sc = statusConfig[staff.status];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Staff Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Close details" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">{staff.avatar}</div>
            <h4 className="text-lg font-bold text-slate-900">{staff.name}</h4>
            <p className="text-sm text-slate-500">{staff.role}</p>
            <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{staff.email}</span></div>
            <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{staff.phone}</span></div>
            <div className="flex items-center gap-3 text-sm"><Shield className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{staff.role} <span className="text-slate-400">({staff.roleId})</span></span></div>
            <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-slate-700">{staff.region}</span></div>
            <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-slate-700">Joined {staff.joinedAt}</span></div>
            <div className="flex items-center gap-3 text-sm"><Clock className="w-4 h-4 text-slate-400" /><span className="text-slate-700">Last active {staff.lastActive}</span></div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Security</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Two-Factor Auth</span>
              {staff.twoFactorEnabled
                ? <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><Key className="w-3 h-3" /> Enabled</span>
                : <span className="text-amber-500 font-bold text-xs">Disabled</span>
              }
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Department</span>
              <span className="text-slate-900 font-medium">{staff.department}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Staff ID</span>
              <span className="text-slate-900 font-mono text-xs">{staff.id}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Quick Actions</p>
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Send Password Reset</button>
            {!staff.twoFactorEnabled ? (
              <button
                onClick={() => {
                  if (confirm(`This will send a mandatory 2FA setup email to ${staff.name}. They must configure 2FA within 48 hours or their account will be locked.\n\nProceed?`)) {
                    onForce2FA(staff.id);
                  }
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-emerald-50 transition-colors text-emerald-700 flex items-center gap-2 font-medium"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Force Enable 2FA
              </button>
            ) : (
              <div className="px-3 py-2.5 rounded-lg text-sm text-emerald-600 flex items-center gap-2 bg-emerald-50">
                <ShieldCheck className="w-4 h-4" /> 2FA Already Active
              </div>
            )}
            <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> View Activity Log</button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={onEdit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
          <button className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"><UserX className="w-3.5 h-3.5" /> Suspend</button>
        </div>
      </div>
    </>
  );
}

// ── Main Staff Page ─────────────────────────────────────────────────────────

export default function StaffPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [staffList, setStaffList] = useState<StaffMember[]>(DEMO_STAFF);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | undefined>(undefined);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);

  const filtered = staffList.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== 'All' && s.department !== deptFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  const activeCount = staffList.filter(s => s.status === 'active').length;
  const withTwoFA = staffList.filter(s => s.twoFactorEnabled).length;

  const handleSave = (data: Partial<StaffMember>) => {
    if (editStaff) {
      setStaffList(prev => prev.map(s => s.id === editStaff.id ? { ...s, ...data } : s));
    } else {
      setStaffList(prev => [...prev, { ...data, id: `STF-${String(prev.length + 1).padStart(3, '0')}` } as StaffMember]);
    }
  };

  const toggleStatus = (id: string) => {
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
  };

  const deleteStaff = (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-sm">Manage admin team members, roles, and access across all regions.</p>
        </div>
        <button onClick={() => { setEditStaff(undefined); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* 2FA Enforcement Banner */}
      {withTwoFA < staffList.filter(s => s.status === 'active').length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {staffList.filter(s => s.status === 'active').length - withTwoFA} active staff members don&apos;t have 2FA enabled
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Two-factor authentication is recommended for all admin accounts.</p>
          </div>
          <button
            onClick={() => {
              if (confirm('This will force-enable 2FA for all staff members who don\'t have it. They will receive a mandatory setup email.\n\nProceed?')) {
                setStaffList(prev => prev.map(s => ({ ...s, twoFactorEnabled: true })));
              }
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
            id="bulk-enable-2fa-btn"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Bulk Enable 2FA
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{staffList.length}</p><p className="text-xs text-slate-500 font-medium">Total Staff</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <UserCheck className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-emerald-600 mt-2">{activeCount}</p><p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-purple-500" /><p className="text-2xl font-black text-purple-600 mt-2">{ADMIN_ROLES.length}</p><p className="text-xs text-slate-500 font-medium">Roles Assigned</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Key className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-amber-600 mt-2">{withTwoFA}</p><p className="text-xs text-slate-500 font-medium">2FA Enabled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none" aria-label="Filter by department">
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none" aria-label="Filter by status">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Staff Member</th>
                <th className="px-4 py-3.5 font-semibold">Role</th>
                <th className="px-4 py-3.5 font-semibold">Department</th>
                <th className="px-4 py-3.5 font-semibold">Region</th>
                <th className="px-4 py-3.5 font-semibold text-center">2FA</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold">Last Active</th>
                <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const sc = statusConfig[s.status];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{s.avatar}</div>
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">{s.role}</span></td>
                    <td className="px-4 py-3.5 text-slate-600">{s.department}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{s.region}</td>
                    <td className="px-4 py-3.5 text-center">
                      {s.twoFactorEnabled
                        ? <span className="text-emerald-600" title="2FA Enabled"><Key className="w-4 h-4 mx-auto" /></span>
                        : (s.role === 'Super Admin' || s.role === 'Admin')
                          ? <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-bold" title="2FA Required"><AlertTriangle className="w-3 h-3" /> Required</span>
                          : <span className="text-slate-300" title="2FA Not Enabled"><Key className="w-4 h-4 mx-auto" /></span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{s.lastActive}</td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewStaff(s)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="View Details"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={() => { setEditStaff(s); setShowModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit2 className="w-4 h-4 text-blue-500" /></button>
                        <button onClick={() => toggleStatus(s.id)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Toggle Status">
                          {s.status === 'active' ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-slate-300" />}
                        </button>
                        {s.role !== 'Super Admin' && (
                          <button onClick={() => deleteStaff(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Remove"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500 flex items-center justify-between">
          <span>Showing {filtered.length} of {staffList.length} staff members</span>
          <button className="flex items-center gap-1.5 text-blue-600 text-xs font-bold hover:text-blue-700"><Download className="w-3.5 h-3.5" /> Export CSV</button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <StaffModal
          staff={editStaff}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditStaff(undefined); }}
        />
      )}

      {/* Details Drawer */}
      {viewStaff && (
        <StaffDrawer
          staff={viewStaff}
          onClose={() => setViewStaff(null)}
          onEdit={() => { setEditStaff(viewStaff); setViewStaff(null); setShowModal(true); }}
          onForce2FA={(id) => {
            setStaffList(prev => prev.map(s => s.id === id ? { ...s, twoFactorEnabled: true } : s));
            setViewStaff(prev => prev ? { ...prev, twoFactorEnabled: true } : null);
          }}
        />
      )}
    </div>
  );
}
