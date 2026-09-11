'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Star,
  Ban,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  Car,
  Building2,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import type { TaxiDriverRow } from '@/lib/api/admin-taxi';
import { useAdminData } from '@/hooks/useAdminData';
import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Driver management — the `taxi_drivers` rows `GET /admin/taxi/drivers` returns.
 *
 * What was here before: `mockDrivers`, eight invented drivers (Ravi Kumar,
 * Fatima Okonkwo, Ahmed Hassan, …) with earnings, cities and "last active"
 * strings, seeded into state. The list fetch that was supposed to replace them
 * asked for `/taxi/admin/drivers` — the segments reversed, a route that does not
 * exist — with no `Authorization` header, so it never replaced anything.
 *
 * The three status actions were one `POST /admin/taxi/drivers/:id/<action>`:
 * `approve` and `suspend` are `@Patch` routes, so those two 404'd, and `block`
 * carried no body at all against a handler whose `ReasonDto` requires one — a
 * 400 the page swallowed before applying the status change locally anyway. Each
 * action now uses its own verb, block and suspend collect the reason the
 * platform records, and nothing moves on screen unless the server accepted it.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

export const DRIVERS_ROUTE = 'GET /admin/taxi/drivers';

export type DriversResult =
  | { ok: true; rows: TaxiDriverRow[]; total: number }
  | { ok: false; kind: ApiFailureKind; message: string };

export async function loadDrivers(params: {
  status?: string;
  countryCode?: string;
  search?: string;
}): Promise<DriversResult> {
  const res = await adminTaxiApi.getDrivers({
    limit: 100,
    status: params.status,
    countryCode: params.countryCode,
    search: params.search,
  });
  if (!res.success) {
    const message = res.error || 'The driver list did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  const rows = res.data?.data ?? [];
  return { ok: true, rows, total: res.data?.total ?? rows.length };
}

const sCfg: Record<string, { bg: string; l: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', l: 'Active' },
  onboarding: { bg: 'bg-indigo-100 text-indigo-700', l: 'Onboarding' },
  suspended: { bg: 'bg-amber-100 text-amber-700', l: 'Suspended' },
  blocked: { bg: 'bg-red-100 text-red-700', l: 'Blocked' },
  pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' },
  rejected: { bg: 'bg-slate-200 text-slate-600', l: 'Rejected' },
};

const VEHICLE_ICONS: Record<string, string> = {
  economy: '🚗',
  comfort: '🚙',
  premium: '🏎️',
  bike: '🏍️',
  suv: '🚐',
};

const fullName = (d: TaxiDriverRow) => `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || d.id;
const ratingOf = (d: TaxiDriverRow) => {
  const n = typeof d.rating === 'string' ? Number(d.rating) : d.rating;
  return Number.isFinite(n) ? n : 0;
};

// ─── Reason prompt ────────────────────────────────────────────────────────────

/**
 * Suspending and blocking both post `ReasonDto`, whose `reason` is required and
 * 3–500 characters. There is no default to fall back on — inventing one would
 * put a sentence no administrator wrote onto a driver's record.
 */
function ReasonDialog({
  title,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <DismissOnEscape onDismiss={onCancel} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <label className="block text-xs font-bold text-slate-500" htmlFor="driver-reason">
          Reason (3–500 characters, stored on the driver record)
        </label>
        <textarea
          id="driver-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          placeholder="Expired insurance certificate, repeated no-shows, …"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600"
          >
            Cancel
          </button>
          <button
            disabled={reason.trim().length < 3 || busy}
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type DriverAction = { kind: 'approve' | 'suspend' | 'block'; driver: TaxiDriverRow };

export default function TaxiDriversPage() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<DriverAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminData<DriversResult>(
    () =>
      loadDrivers({
        status: statusFilter === 'All' ? undefined : statusFilter,
        countryCode: countryFilter === 'All' ? undefined : countryFilter,
        search: applied || undefined,
      }),
    [statusFilter, countryFilter, applied],
  );

  const result = data ?? null;
  const board = result?.ok ? result : null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const drivers = board?.rows ?? [];

  const run = async (action: DriverAction, reason?: string) => {
    setBusy(true);
    setActionError(null);
    setActionNote(null);
    const { kind, driver } = action;
    const res =
      kind === 'approve'
        ? await adminTaxiApi.approveDriver(driver.id)
        : kind === 'suspend'
          ? await adminTaxiApi.suspendDriver(driver.id, reason ?? '')
          : await adminTaxiApi.blockDriver(driver.id, reason ?? '');
    setBusy(false);
    setPending(null);
    if (!res.success) {
      // The status used to change on screen whether or not the call worked.
      setActionError(res.error || `The ${kind} call did not answer`);
      return;
    }
    setActionNote(`${fullName(driver)}: ${kind} accepted.`);
    await refetch();
  };

  const onAction = (action: DriverAction) => {
    if (action.kind === 'approve') void run(action);
    else setPending(action);
  };

  const stats = {
    total: board?.total ?? 0,
    active: drivers.filter((d) => d.status === 'active').length,
    pending: drivers.filter((d) => d.status === 'pending' || d.status === 'onboarding').length,
    independent: drivers.filter((d) => !d.vendorId).length,
    vendorManaged: drivers.filter((d) => d.vendorId).length,
  };

  const countries = [...new Set(drivers.map((d) => d.countryCode).filter(Boolean))];

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          Driver management
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Drivers across vendors and independents, as taxi-service records them.
        </p>
      </div>
    </div>
  );

  if (loading && !board) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {header}
        <AdminLoading rows={6} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {header}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden what="the driver list" route={DRIVERS_ROUTE} message={failure.message} />
        ) : (
          <AdminNotConnected
            what="The driver list"
            route={DRIVERS_ROUTE}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {header}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Users, color: 'text-indigo-500', value: stats.total, label: 'Matching drivers' },
          {
            icon: CheckCircle,
            color: 'text-emerald-500',
            value: stats.active,
            label: 'Active, on this page',
          },
          {
            icon: Clock,
            color: 'text-blue-500',
            value: stats.pending,
            label: 'Pending/onboarding',
          },
          { icon: Shield, color: 'text-amber-500', value: stats.independent, label: 'Independent' },
          {
            icon: Building2,
            color: 'text-purple-500',
            value: stats.vendorManaged,
            label: 'Vendor-managed',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <card.icon className={`w-5 h-5 ${card.color}`} />
            <p className="text-2xl font-black text-slate-900 mt-2">{card.value}</p>
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {actionError}
        </p>
      )}
      {actionNote && (
        <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          {actionNote}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <form
          className="flex-1 relative"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(search.trim());
          }}
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search name, email or plate, then press Enter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            id="search-drivers"
          />
        </form>
        <select
          title="Filter by country"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
          id="filter-country-drivers"
        >
          <option value="All">All markets</option>
          {countries.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <select
          title="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
          id="filter-status-drivers"
        >
          <option value="All">All statuses</option>
          {Object.entries(sCfg).map(([k, v]) => (
            <option key={k} value={k}>
              {v.l}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-4 py-3.5 font-semibold">Vendor</th>
                <th className="px-4 py-3.5 font-semibold">Vehicle</th>
                <th className="px-4 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-4 py-3.5 font-semibold text-right">Trips</th>
                <th className="px-4 py-3.5 font-semibold text-center">Onboarding</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <React.Fragment key={d.id}>
                  <tr
                    className={`hover:bg-slate-50/50 cursor-pointer ${d.status === 'blocked' ? 'opacity-50' : ''}`}
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    tabIndex={0}
                    onKeyDown={activateOnKey(() => setExpanded(expanded === d.id ? null : d.id))}
                  >
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900">{fullName(d)}</p>
                      <p className="text-[10px] text-slate-400">
                        {d.id} • {d.countryCode}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {d.vendor?.name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                          <Building2 className="w-3 h-3" />
                          {d.vendor.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Independent</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{VEHICLE_ICONS[d.vehicleType] || '🚗'}</span>
                      <span className="text-xs text-slate-600 font-medium ml-1">
                        {d.vehicleModel ?? d.vehicleType}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {d.vehiclePlate ?? 'no plate recorded'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ratingOf(d) > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-bold">{ratingOf(d).toFixed(1)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {(d.totalTrips ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[50px] mx-auto">
                        <div
                          className={`h-1.5 rounded-full ${d.onboardingProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          {...{ style: { width: `${d.onboardingProgress ?? 0}%` } }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {d.onboardingProgress ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`${sCfg[d.status]?.bg ?? 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-full text-[10px] font-bold`}
                      >
                        {sCfg[d.status]?.l ?? d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expanded === d.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Contact</p>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {d.phone}
                            </p>
                            <p className="text-xs text-slate-500">{d.email}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Vehicle</p>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {d.vehicleType}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-0.5">Registered</p>
                            <p className="font-bold text-slate-700 text-xs">
                              {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          {d.suspensionReason && (
                            <div>
                              <p className="text-slate-400 text-xs font-medium mb-0.5">
                                Last enforcement reason
                              </p>
                              <p className="text-xs text-slate-700">{d.suspensionReason}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                          {(d.status === 'pending' || d.status === 'onboarding') && (
                            <button
                              onClick={() => onAction({ kind: 'approve', driver: d })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {d.status === 'active' && (
                            <button
                              onClick={() => onAction({ kind: 'suspend', driver: d })}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                          {d.status !== 'blocked' && (
                            <button
                              onClick={() => onAction({ kind: 'block', driver: d })}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                          )}
                          <span className="text-[11px] text-slate-400 self-center">
                            Reinstating a blocked driver is not a route the gateway exposes yet.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {drivers.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No driver matches these filters.</p>
          </div>
        )}
      </div>

      {pending && (
        <ReasonDialog
          title={`${pending.kind === 'block' ? 'Block' : 'Suspend'} ${fullName(pending.driver)}`}
          confirmLabel={pending.kind === 'block' ? 'Block driver' : 'Suspend driver'}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={(reason) => void run(pending, reason)}
        />
      )}
    </div>
  );
}
