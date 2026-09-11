'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Eye,
  ToggleRight,
  ToggleLeft,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  Save,
  Key,
  UserCheck,
  UserX,
  Lock,
  AlertTriangle,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';
import { REGIONS } from '@/lib/contexts/region-context';
import {
  adminCoreApi,
  type AdminRoleRow,
  type CreateStaffPayload,
  type StaffRow,
} from '@/lib/api/admin-core';

/**
 * Staff Management.
 *
 * Every row comes from `GET /admin/staff`; roles come from `GET /admin/roles`
 * and markets from the localization registry. The page used to render twelve
 * invented colleagues (`DEMO_STAFF`) against a hard-coded role list and a
 * hard-coded list of region *names*, and "adding" one pushed an object into
 * React state. There is no fallback array now: an unreachable API or a caller
 * who is not a SUPER_ADMIN sees the error, not a staffed directory.
 *
 * Three fixture columns are gone with the data, because nothing stores them:
 * `department`, `lastActive`, and the per-user 2FA toggle. The second factor
 * is not optional any more — every staff sign-in has to clear a server-issued
 * code — so a switch offering to turn it off for one person would have been a
 * control that does nothing.
 */

type StatusTone = { label: string; bg: string; dot: string };

function statusOf(s: StaffRow): StatusTone {
  if (!s.isActive || s.status === 'suspended') {
    return {
      label: s.status === 'suspended' ? 'Suspended' : 'Inactive',
      bg: 'bg-red-50 text-red-600',
      dot: 'bg-red-500',
    };
  }
  if (s.status === 'pending') {
    return { label: 'Pending', bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  }
  return { label: 'Active', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
}

function initials(name: string, email: string | null): string {
  const source = name?.trim() || email || '?';
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const MARKETS = Object.values(REGIONS).map((r) => ({ code: r.code, name: r.name, flag: r.flag }));

/** Roles a staff account may hold. SUPER_ADMIN is made by an operator, not here. */
const ASSIGNABLE_ROLES = ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_MANAGER', 'PRODUCT_MANAGER'];

// ── Add/Edit Staff Modal ────────────────────────────────────────────────────

function StaffModal({
  staff,
  roles,
  saving,
  onSave,
  onClose,
}: {
  staff?: StaffRow;
  roles: AdminRoleRow[];
  saving?: boolean;
  onSave: (data: CreateStaffPayload & { isActive?: boolean }) => void;
  onClose: () => void;
}) {
  const assignableRoles = roles.filter((r) => r.key !== 'super_admin');
  const [firstName, setFirstName] = useState(staff?.firstName || '');
  const [lastName, setLastName] = useState(staff?.lastName || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [phone, setPhone] = useState('');
  const [adminRoleId, setAdminRoleId] = useState(
    staff?.adminRoleId || assignableRoles[0]?.id || '',
  );
  const [role, setRole] = useState(
    staff?.role && staff.role !== 'SUPER_ADMIN' ? staff.role : 'ADMIN',
  );
  const [regionCode, setRegionCode] = useState(staff?.regionCode || '');
  const [regionLocked, setRegionLocked] = useState(staff?.regionLocked ?? false);
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);

  const selectedRole = assignableRoles.find((r) => r.id === adminRoleId);
  const lockWithoutMarket = regionLocked && !regionCode;
  const canSave =
    Boolean(firstName.trim() && lastName.trim() && email.trim() && adminRoleId) &&
    !lockWithoutMarket &&
    !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {staff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {staff
                ? 'Update role, market and access'
                : 'A temporary password is emailed to the address below'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            title="Close dialog"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="first-name"
              >
                First Name *
              </label>
              <input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amal"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="last-name"
              >
                Last Name *
              </label>
              <input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rahman"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="email-address"
              >
                Email Address *
              </label>
              <input
                id="email-address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!staff}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="amal@kartseek.com"
              />
              {!staff && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Sign-in codes are delivered here, so it is required.
                </p>
              )}
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="phone-number"
              >
                Phone Number
              </label>
              <input
                id="phone-number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                placeholder={staff?.hasPhone ? 'On file — type to replace' : '+971 50 000 0000'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="admin-role"
              >
                Permission Role *
              </label>
              <select
                id="admin-role"
                value={adminRoleId}
                onChange={(e) => setAdminRoleId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Permission role"
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="account-role"
              >
                Account Role *
              </label>
              <select
                id="account-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Account role"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="market"
              >
                Market
              </label>
              <select
                id="market"
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Market"
              >
                <option value="">Every market (global)</option>
                {MARKETS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Confine to market</p>
                  <p className="text-xs text-slate-400">Regional admin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRegionLocked(!regionLocked)}
                  aria-label="Toggle market lock"
                >
                  {regionLocked ? (
                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {lockWithoutMarket && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> A confined account needs a market.
            </p>
          )}

          {staff && (
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Account Active</p>
                <p className="text-xs text-slate-400">A suspended account cannot sign in</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                aria-label="Toggle active"
              >
                {isActive ? (
                  <ToggleRight className="w-7 h-7 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-300" />
                )}
              </button>
            </div>
          )}

          {selectedRole && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">Role: {selectedRole.name}</p>
              <p className="text-[10px] text-blue-600">
                {selectedRole.permissions.includes('*')
                  ? 'Every permission on the platform.'
                  : `${selectedRole.permissions.length} permission(s). Change them on the Roles & Permissions page.`}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSave({
                email: email.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
                role,
                adminRoleId,
                ...(regionCode ? { regionCode } : { regionCode: '' }),
                regionLocked,
                ...(staff ? { isActive } : {}),
              })
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />{' '}
            {saving ? 'Saving…' : staff ? 'Update Staff' : 'Create & Email Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Details Drawer ────────────────────────────────────────────────────

function StaffDrawer({
  staff,
  roleName,
  onClose,
  onEdit,
  onToggleActive,
}: {
  staff: StaffRow;
  roleName: string;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const sc = statusOf(staff);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Staff Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            title="Close details"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
              {initials(staff.name, staff.email)}
            </div>
            <h4 className="text-lg font-bold text-slate-900">{staff.name || staff.email}</h4>
            <p className="text-sm text-slate-500">{roleName}</p>
            <span
              className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{staff.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                {staff.hasPhone ? 'On file (encrypted)' : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                {roleName} <span className="text-slate-400">({staff.role})</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                {staff.regionCode
                  ? `${staff.regionCode}${staff.regionLocked ? ' — confined' : ''}`
                  : 'Every market'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                Joined {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Security</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Second factor</span>
              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                <Key className="w-3 h-3" /> Required at every sign-in
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Market lock</span>
              <span className="text-slate-900 font-medium">
                {staff.regionLocked ? `Locked to ${staff.regionCode}` : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Account ID</span>
              <span className="text-slate-900 font-mono text-[10px]">{staff.id}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={onToggleActive}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${staff.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
          >
            {staff.isActive ? (
              <>
                <UserX className="w-3.5 h-3.5" /> Suspend
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" /> Reactivate
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Staff Page ─────────────────────────────────────────────────────────

export default function StaffPage() {
  useMarketplaceRegionFilter([]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffRow | undefined>(undefined);
  const [viewStaff, setViewStaff] = useState<StaffRow | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<{ email: string; password: string } | null>(
    null,
  );

  const rolesQuery = useAdminData(async () => {
    const res = await adminCoreApi.listRoles();
    if (!res.success) throw new Error(res.error || 'Could not load roles');
    return res.data;
  }, []);

  const { data, loading, error, refetch, toast, showToast } = useAdminData(async () => {
    const res = await adminCoreApi.listStaff({
      page: 1,
      limit: 50,
      ...(search ? { search } : {}),
      ...(roleFilter ? { roleId: roleFilter } : {}),
      ...(marketFilter ? { regionCode: marketFilter } : {}),
    });
    if (!res.success) throw new Error(res.error || 'Could not load staff');
    return res.data;
  }, [search, roleFilter, marketFilter]);
  const { execute, actionLoading } = useAdminAction(showToast);

  const roles: AdminRoleRow[] = rolesQuery.data?.data ?? [];
  const staffList: StaffRow[] = data?.data ?? [];
  const total = data?.total ?? staffList.length;

  const roleNameById = Object.fromEntries(roles.map((r) => [r.id, r.name])) as Record<
    string,
    string
  >;
  const roleNameOf = (s: StaffRow) =>
    (s.adminRoleId && roleNameById[s.adminRoleId]) || 'No role assigned';

  const activeCount = staffList.filter((s) => s.isActive).length;
  const lockedCount = staffList.filter((s) => s.regionLocked).length;
  const unassigned = staffList.filter((s) => !s.adminRoleId).length;

  const handleSave = async (form: CreateStaffPayload & { isActive?: boolean }) => {
    const payload = { ...form, regionCode: form.regionCode || undefined };
    if (editStaff) {
      const done = await execute(async () => {
        const res = await adminCoreApi.updateStaff(editStaff.id, payload);
        if (!res.success) throw new Error(res.error || 'Could not update this staff member');
        return res.data;
      }, `Updated ${form.firstName} ${form.lastName}`);
      if (done) {
        setShowModal(false);
        setEditStaff(undefined);
        await refetch();
      }
      return;
    }
    const created = await execute(async () => {
      const res = await adminCoreApi.createStaff(payload);
      if (!res.success) throw new Error(res.error || 'Could not create this staff member');
      return res.data;
    }, `Invited ${form.email}`);
    if (created) {
      setShowModal(false);
      // Shown only when the gateway echoed it — it does that outside
      // production so a developer is not locked out of an account the mail
      // relay never delivered. In production there is nothing to show.
      const temp = (created as { data?: StaffRow })?.data?.temporaryPassword;
      if (temp) setIssuedPassword({ email: form.email, password: temp });
      await refetch();
    }
  };

  const toggleActive = async (s: StaffRow) => {
    const next = !s.isActive;
    if (!next && !confirm(`Suspend ${s.email}? They will not be able to sign in.`)) return;
    const done = await execute(
      async () => {
        const res = await adminCoreApi.updateStaff(s.id, { isActive: next });
        if (!res.success) throw new Error(res.error || 'Could not change this account');
        return res.data;
      },
      next ? `Reactivated ${s.email}` : `Suspended ${s.email}`,
    );
    if (done) {
      setViewStaff(null);
      await refetch();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminToast toast={toast} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-sm">
            Admin accounts, their permission role and the market each one is confined to.
          </p>
        </div>
        <button
          onClick={() => {
            setEditStaff(undefined);
            setShowModal(true);
          }}
          disabled={loading || !!error || roles.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {issuedPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              Temporary password for {issuedPassword.email}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              It has also been emailed. Shown here because this environment echoes it; production
              never does.
            </p>
            <p className="font-mono text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 mt-2 inline-block">
              {issuedPassword.password}
            </p>
          </div>
          <button
            onClick={() => setIssuedPassword(null)}
            className="p-1.5 hover:bg-amber-100 rounded-lg"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      )}

      {unassigned > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {unassigned} staff account(s) hold no permission role
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Assign one so their console permissions come from a role rather than from their
              account role alone.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{total}</p>
          <p className="text-xs text-slate-500 font-medium">Total Staff</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <UserCheck className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-emerald-600 mt-2">{activeCount}</p>
          <p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-purple-500" />
          <p className="text-2xl font-black text-purple-600 mt-2">{roles.length}</p>
          <p className="text-xs text-slate-500 font-medium">Roles Available</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Lock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-amber-600 mt-2">{lockedCount}</p>
          <p className="text-xs text-slate-500 font-medium">Market-Locked</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none"
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none"
          aria-label="Filter by market"
        >
          <option value="">All Markets</option>
          {MARKETS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <AdminLoadingSkeleton rows={6} />}
      {!loading && error && <AdminErrorBanner error={error} onRetry={refetch} />}

      {/* Staff Table */}
      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Staff Member</th>
                  <th className="px-4 py-3.5 font-semibold">Permission Role</th>
                  <th className="px-4 py-3.5 font-semibold">Account Role</th>
                  <th className="px-4 py-3.5 font-semibold">Market</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Joined</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((s) => {
                  const sc = statusOf(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials(s.name, s.email)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.name || '—'}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${s.adminRoleId ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'}`}
                        >
                          {roleNameOf(s)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {s.role.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {s.regionCode ? (
                          <span className="inline-flex items-center gap-1">
                            {s.regionCode}
                            {s.regionLocked && (
                              <Lock
                                className="w-3 h-3 text-amber-500"
                                aria-label="Confined to this market"
                              />
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">Every market</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewStaff(s)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => {
                              setEditStaff(s);
                              setShowModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            onClick={() => void toggleActive(s)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg"
                            title={s.isActive ? 'Suspend' : 'Reactivate'}
                          >
                            {s.isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {staffList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No staff accounts match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Showing {staffList.length} of {total} staff members
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <StaffModal
          staff={editStaff}
          roles={roles}
          saving={actionLoading}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditStaff(undefined);
          }}
        />
      )}

      {/* Details Drawer */}
      {viewStaff && (
        <StaffDrawer
          staff={viewStaff}
          roleName={roleNameOf(viewStaff)}
          onClose={() => setViewStaff(null)}
          onEdit={() => {
            setEditStaff(viewStaff);
            setViewStaff(null);
            setShowModal(true);
          }}
          onToggleActive={() => void toggleActive(viewStaff)}
        />
      )}
    </div>
  );
}
