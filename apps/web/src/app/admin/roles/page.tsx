'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useMemo, useState } from 'react';
import {
  Shield,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Lock,
  Plus,
  Settings,
  X,
  Save,
  Copy,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';
import { adminCoreApi, type AdminRoleRow, type PermissionDef } from '@/lib/api/admin-core';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * Roles & Permissions.
 *
 * Every row here comes from `admin.admin_roles` through `GET /admin/roles`,
 * including the permission vocabulary itself. This page used to ship a
 * `const allPermissions` list and seventeen `INITIAL_ROLES` fixtures with
 * invented user counts; "saving" a role mutated React state and a reload put
 * the fixtures back, so nothing an operator did here had ever reached the
 * server. There is deliberately no fallback array any more: if the API is
 * unreachable or the caller is not a SUPER_ADMIN, the page says so rather
 * than drawing roles that do not exist.
 *
 * The old "Access Level" column (platform / regional / partner / operations)
 * is gone with the fixtures — nothing stored it, so it could only ever have
 * been re-invented in the browser. `isSystem` is the real distinction and it
 * already had its own column.
 */

/** Presentation only — no data claim, so it is derived, not stored. */
function roleChrome(role: AdminRoleRow) {
  return role.isSystem
    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
}

// ── Role Editor Modal ───────────────────────────────────────────────────────

function RoleEditorModal({
  role,
  allPermissions,
  isViewOnly,
  saving,
  onSave,
  onClose,
}: {
  role?: AdminRoleRow;
  allPermissions: PermissionDef[];
  isViewOnly?: boolean;
  saving?: boolean;
  onSave: (data: { name: string; description: string; permissions: string[] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || ['dashboard.view']);

  const permissionGroups = useMemo(
    () => [...new Set(allPermissions.map((p) => p.group))],
    [allPermissions],
  );

  // `super_admin` holds the wildcard and the API refuses to edit it at all;
  // showing its checkboxes as editable would promise something the server
  // will reject.
  const readOnly = isViewOnly || role?.key === 'super_admin';
  const wildcard = permissions.includes('*');

  const togglePermission = (key: string) => {
    if (readOnly) return;
    setPermissions((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleGroup = (group: string) => {
    if (readOnly) return;
    const groupPerms = allPermissions.filter((p) => p.group === group).map((p) => p.key);
    const allSelected = groupPerms.every((k) => permissions.includes(k));
    if (allSelected) {
      setPermissions((prev) => prev.filter((k) => !groupPerms.includes(k)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...groupPerms])]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {isViewOnly ? 'View Role' : role ? 'Edit Role' : 'Create Custom Role'}
            </h3>
            {readOnly && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> This role is read-only
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="role-name"
              >
                Role Name *
              </label>
              <input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g. Regional Coordinator"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                htmlFor="role-key"
              >
                Key
              </label>
              <input
                id="role-key"
                value={role?.key ?? '(generated from the name)'}
                disabled
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none bg-slate-50 text-slate-500 font-mono"
              />
            </div>
          </div>
          <div>
            <label
              className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
              htmlFor="description"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Describe this role's responsibilities..."
            />
          </div>

          {/* Permissions Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Permissions ({wildcard ? allPermissions.length : permissions.length}/
                {allPermissions.length})
              </p>
              {!readOnly && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPermissions(allPermissions.map((p) => p.key))}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setPermissions(['dashboard.view'])}
                    className="text-[10px] text-slate-400 font-bold hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
            {wildcard && (
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-3">
                This role holds the <span className="font-mono font-bold">*</span> wildcard — every
                permission, including ones added later.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissionGroups.map((group) => {
                const groupPerms = allPermissions.filter((p) => p.group === group);
                const selectedCount = groupPerms.filter(
                  (p) => wildcard || permissions.includes(p.key),
                ).length;
                const allSelected = selectedCount === groupPerms.length;
                return (
                  <div key={group} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => toggleGroup(group)}
                        disabled={readOnly}
                        className="flex items-center gap-2 disabled:cursor-default"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected ? 'border-blue-500 bg-blue-500' : selectedCount > 0 ? 'border-blue-300 bg-blue-100' : 'border-slate-300'}`}
                        >
                          {allSelected && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                          {!allSelected && selectedCount > 0 && (
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{group}</span>
                      </button>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {selectedCount}/{groupPerms.length}
                      </span>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {groupPerms.map((p) => (
                        <label
                          key={p.key}
                          className={`flex items-center gap-2 text-xs cursor-pointer ${readOnly ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={wildcard || permissions.includes(p.key)}
                            onChange={() => togglePermission(p.key)}
                            disabled={readOnly}
                            className="rounded text-blue-600"
                          />
                          <span
                            className={
                              wildcard || permissions.includes(p.key)
                                ? 'text-slate-700'
                                : 'text-slate-400'
                            }
                          >
                            {p.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex gap-3 p-5 border-t border-slate-200">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ name, description, permissions })}
              disabled={!name.trim() || saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />{' '}
              {saving ? 'Saving…' : role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        )}
        {readOnly && (
          <div className="flex gap-3 p-5 border-t border-slate-200">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

/** `Ops Lead` → `ops_lead`, matching the API's `/^[a-z_]{3,40}$/`. */
function keyFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export default function RolesPage() {
  useMarketplaceRegionFilter([]);

  /**
   * Reading and writing roles are two different permissions, and this page had
   * only ever checked the first by accident.
   *
   * `GET /admin/roles` admits `SUPER_ADMIN | ADMIN` holding `staff.view`, and
   * the seeded `admin` role holds it — while every write is
   * `@Roles(SUPER_ADMIN, 'perm:staff.manage')`. So a global ADMIN could open
   * this page by URL (the nav item is hidden, which is not a gate), press
   * "Create Custom Role", fill the whole form, submit, and be told
   * "Insufficient permissions. Your role cannot perform this action." The
   * failure was at least reported honestly, but the control was offered to
   * someone who can never use it.
   *
   * Same derivation as `staff/page.tsx`, which was fixed for exactly this.
   */
  const { hasPermission } = useAuth();
  const canManage = hasPermission('staff.manage');

  const { data, loading, error, refetch, toast, showToast } = useAdminData(async () => {
    const res = await adminCoreApi.listRoles();
    if (!res.success) throw new Error(res.error || 'Could not load roles');
    return res.data;
  }, []);
  const { execute, actionLoading } = useAdminAction(showToast);

  const [search, setSearch] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<AdminRoleRow | undefined>(undefined);
  const [viewOnlyModal, setViewOnlyModal] = useState(false);

  const roles: AdminRoleRow[] = data?.data ?? [];
  const allPermissions: PermissionDef[] = data?.permissions ?? [];

  const filtered = roles.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.key.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || (typeFilter === 'system' ? r.isSystem : !r.isSystem);
    return matchSearch && matchType;
  });

  const totalUsers = roles.reduce((a, r) => a + (r.userCount ?? 0), 0);

  const handleSaveRole = async (form: {
    name: string;
    description: string;
    permissions: string[];
  }) => {
    const done = editRole
      ? await execute(async () => {
          const res = await adminCoreApi.updateRole(editRole.id, form);
          if (!res.success) throw new Error(res.error || 'Could not update the role');
          return res.data;
        }, `Updated ${form.name}`)
      : await execute(async () => {
          const res = await adminCoreApi.createRole({ ...form, key: keyFromName(form.name) });
          if (!res.success) throw new Error(res.error || 'Could not create the role');
          return res.data;
        }, `Created ${form.name}`);
    if (done) {
      setShowModal(false);
      setEditRole(undefined);
      await refetch();
    }
  };

  const deleteRole = async (role: AdminRoleRow) => {
    // The API refuses both of these too; refusing here saves a round trip and
    // explains why, rather than surfacing a bare 409.
    if (role.isSystem) {
      showToast('System roles cannot be deleted.', 'error');
      return;
    }
    if (role.userCount > 0) {
      showToast(`Cannot delete — ${role.userCount} staff member(s) hold this role.`, 'error');
      return;
    }
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    const done = await execute(async () => {
      const res = await adminCoreApi.deleteRole(role.id);
      if (!res.success) throw new Error(res.error || 'Could not delete the role');
      return res.data;
    }, `Deleted ${role.name}`);
    if (done) await refetch();
  };

  const duplicateRole = async (role: AdminRoleRow) => {
    const name = `${role.name} (Copy)`;
    const done = await execute(async () => {
      const res = await adminCoreApi.createRole({
        key: keyFromName(`${role.key}_copy`),
        name,
        description: role.description ?? undefined,
        // A copy of super_admin cannot carry the wildcard — the API only
        // accepts declared keys from the console.
        permissions: role.permissions.filter((p) => p !== '*'),
      });
      if (!res.success) throw new Error(res.error || 'Could not duplicate the role');
      return res.data;
    }, `Created ${name}`);
    if (done) await refetch();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminToast toast={toast} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles &amp; Permissions</h1>
          <p className="text-slate-500 text-sm">
            Manage access control across the KARTSEEK platform.{' '}
            <Link href="/admin/staff" className="text-blue-600 font-bold hover:underline">
              Manage Staff →
            </Link>
          </p>
        </div>
        {canManage ? (
          <button
            onClick={() => {
              setEditRole(undefined);
              setViewOnlyModal(false);
              setShowModal(true);
            }}
            disabled={loading || !!error}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        ) : (
          // Said plainly rather than left blank, the same wording the staff
          // page uses: a reader should know why there is nothing to press
          // rather than wonder whether the page failed to load.
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Read-only — role changes need the Manage Staff
            permission.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-red-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{roles.length}</p>
          <p className="text-xs text-slate-500 font-medium">Total Roles</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{totalUsers.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium">Staff Assigned</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Lock className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{allPermissions.length}</p>
          <p className="text-xs text-slate-500 font-medium">Permissions</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Settings className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">
            {roles.filter((r) => r.isSystem).length}
          </p>
          <p className="text-xs text-slate-500 font-medium">System Roles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Filter by type"
        >
          <option value="All">All Types</option>
          <option value="system">System</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {loading && <AdminLoadingSkeleton rows={6} />}
      {!loading && error && <AdminErrorBanner error={error} onRetry={refetch} />}

      {/* Roles Table */}
      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Role</th>
                  <th className="px-5 py-3.5 font-semibold">Key</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Staff</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Permissions</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Type</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const wildcard = r.permissions.includes('*');
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedRole(expandedRole === r.id ? null : r.id)}
                        tabIndex={0}
                        onKeyDown={activateOnKey(() =>
                          setExpandedRole(expandedRole === r.id ? null : r.id),
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${roleChrome(r)} border`}
                            >
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{r.name}</p>
                              <p className="text-xs text-slate-400 max-w-xs truncate">
                                {r.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-slate-500">{r.key}</span>
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-900">
                          {(r.userCount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                            {wildcard ? 'ALL' : `${r.permissions.length}/${allPermissions.length}`}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {r.isSystem ? (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                              SYSTEM
                            </span>
                          ) : (
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                              CUSTOM
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditRole(r);
                                setViewOnlyModal(true);
                                setShowModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-slate-400" />
                            </button>
                            {/* Edit, Duplicate and Delete are all writes the
                                API gates on `staff.manage`. A reader keeps the
                                View control beside them, which is the whole of
                                what `staff.view` grants. */}
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditRole(r);
                                  setViewOnlyModal(false);
                                  setShowModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-lg"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                              </button>
                            )}
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void duplicateRole(r);
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-lg"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4 text-slate-400" />
                              </button>
                            )}
                            {canManage && !r.isSystem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteRole(r);
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRole(expandedRole === r.id ? null : r.id);
                              }}
                              aria-label={expandedRole === r.id ? 'Collapse' : 'Expand'}
                            >
                              {expandedRole === r.id ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRole === r.id && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="px-5 py-5">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                              Permissions ({wildcard ? allPermissions.length : r.permissions.length}
                              )
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {allPermissions.map((p) => {
                                const has = wildcard || r.permissions.includes(p.key);
                                return (
                                  <span
                                    key={p.key}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                      has
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                    }`}
                                  >
                                    {has ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    {p.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No roles match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Showing {filtered.length} of {roles.length} roles
          </div>
        </div>
      )}

      {/* Role Editor Modal */}
      {showModal && (
        <RoleEditorModal
          role={editRole}
          allPermissions={allPermissions}
          // The backstop for the row controls above: whatever opens the modal,
          // a caller without `staff.manage` never sees a save button.
          isViewOnly={!canManage || viewOnlyModal}
          saving={actionLoading}
          onSave={handleSaveRole}
          onClose={() => {
            setShowModal(false);
            setEditRole(undefined);
            setViewOnlyModal(false);
          }}
        />
      )}
    </div>
  );
}
