'use client';

import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  FileSignature,
  Building2,
  User,
  ShieldAlert,
} from 'lucide-react';
import { adminCoreApi } from '@/lib/api/admin-core';
import type { KycPendingRow } from '@/lib/api/admin-core';
import { useAdminData } from '@/hooks/useAdminData';
import { activateOnKey } from '@/lib/a11y/activate-on-key';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * KYC & document verification — the queue `GET /admin/kyc/pending` returns, and
 * nothing else.
 *
 * What was here before: `MOCK_QUEUE`, three invented applications (MediCare
 * Plus Pharmacy, The Spice Route Kitchen, CityRide Fleet Services) seeded
 * straight into state, so the page opened on a queue whether or not the API
 * answered and the API's rows were used only when there was at least one. Below
 * them sat three hard-coded document cards — a drug licence, a GST certificate
 * and a PAN card, with sizes and filenames — rendered for every applicant
 * regardless of what they had submitted, under a heading that counted them as
 * "(3)".
 *
 * The queue itself is Redis keys (`admin:kyc:pending:<entityType>:<entityId>`)
 * holding whatever JSON was written there. So the row type is almost entirely
 * optional and this page shows the fields that are present and says so when
 * they are not — an empty queue reads as an empty queue, which on this platform
 * is the ordinary case.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * A queue row that can actually be acted on.
 *
 * `entityId` and `entityType` are the two segments the approve and reject
 * routes rebuild the Redis key from, so a record carrying neither cannot be
 * decided and is not offered as though it could be.
 */
export interface KycRecord {
  entityId: string;
  entityType: string;
  businessName: string | null;
  ownerName: string | null;
  country: string | null;
  location: string | null;
  gstin: string | null;
  submittedAt: string | null;
  documents: Array<{ name?: string; type?: string; url?: string; size?: string }>;
  raw: KycPendingRow;
}

/** `null` when the record has no id to act on — dropped rather than drawn as undecidable. */
export function normalizeKycRow(row: KycPendingRow): KycRecord | null {
  const entityId = row.entityId ?? row.id;
  const entityType = row.entityType ?? row.type;
  if (!entityId || !entityType) return null;

  const city = row.city ?? null;
  const state = row.state ?? null;
  return {
    entityId,
    entityType,
    businessName: row.businessName ?? row.name ?? null,
    ownerName: row.ownerName ?? null,
    country: row.country ?? row.countryCode ?? row.regionCode ?? null,
    location: [city, state].filter(Boolean).join(', ') || null,
    gstin: row.gstin ?? null,
    submittedAt: row.submittedAt ?? null,
    documents: Array.isArray(row.documents) ? row.documents : [],
    raw: row,
  };
}

/** The record's identity: the two segments its Redis key is built from. */
export const keyOf = (r: Pick<KycRecord, 'entityType' | 'entityId'>) =>
  `${r.entityType}:${r.entityId}`;

export type KycQueueResult =
  | { ok: true; records: KycRecord[]; total: number; undecidable: number }
  | { ok: false; kind: ApiFailureKind; message: string };

export const KYC_ROUTE = 'GET /admin/kyc/pending';

/**
 * Resolves a result rather than throwing: `useAdminData` swallows auth-shaped
 * throws into `data = null, error = null`, which here would draw an empty queue
 * for an expired session — indistinguishable from "nobody is waiting".
 */
export async function loadKycQueue(): Promise<KycQueueResult> {
  const res = await adminCoreApi.getPendingKyc({ limit: 100 });
  if (!res.success) {
    const message = res.error || 'The identity-check queue did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  const rows = res.data?.data ?? [];
  const records = rows.map(normalizeKycRow).filter((r): r is KycRecord => r !== null);
  return {
    ok: true,
    records,
    total: res.data?.total ?? records.length,
    undecidable: rows.length - records.length,
  };
}

const typeColors: Record<string, string> = {
  pharmacy: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  taxi: 'bg-yellow-100 text-yellow-700',
  marketplace: 'bg-purple-100 text-purple-700',
  grocery: 'bg-green-100 text-green-700',
  seller: 'bg-indigo-100 text-indigo-700',
};

function formatSubmitted(value: string | null): string {
  if (!value) return 'Submission date not recorded';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Reason prompt ────────────────────────────────────────────────────────────

/**
 * A rejection has to carry a reason the applicant can read.
 *
 * `KycDecisionDto.reason` is 3–500 characters when present, and the page used
 * to send the same sentence — "Documents not matching records" — for every
 * rejection it ever made, which is a fabricated justification in an audited
 * decision.
 */
function ReasonDialog({
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < 3;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <label className="block text-xs font-bold text-slate-500" htmlFor="kyc-reason">
          Reason (3–500 characters, stored on the decision)
        </label>
        <textarea
          id="kyc-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          placeholder="What is wrong with the submission?"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600"
          >
            Cancel
          </button>
          <button
            disabled={tooShort || busy}
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

export default function AdminKYCVerificationPage() {
  const { data, loading, error, refetch } = useAdminData<KycQueueResult>(() => loadKycQueue(), []);

  // `<entityType>:<entityId>`, because that pair is the record's identity — it
  // is literally the Redis key (`admin:kyc:pending:<type>:<id>`) the approve and
  // reject routes rebuild. Keyed on `entityId` alone, two queued records sharing
  // an id under different verticals select each other, and the decision then
  // lands on the wrong one under the right-looking name.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const result = data ?? null;
  const board = result?.ok ? result : null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const records = board?.records ?? [];
  const selected = records.find((r) => keyOf(r) === selectedKey) ?? records[0] ?? null;

  const decide = async (kind: 'approve' | 'reject', reason?: string) => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    const res =
      kind === 'approve'
        ? await adminCoreApi.approveKyc(selected.entityId, selected.entityType)
        : await adminCoreApi.rejectKyc(selected.entityId, selected.entityType, reason ?? '');
    setActionLoading(false);
    setRejecting(false);
    if (!res.success) {
      // No optimistic removal: a row that vanished from the queue while the
      // server refused the decision is the page lying about what it did.
      setActionError(res.error || `The ${kind} call did not answer`);
      return;
    }
    await adminCoreApi.addAuditLog({
      action: kind === 'approve' ? 'kyc.approved' : 'kyc.rejected',
      entityType: selected.entityType,
      entityId: selected.entityId,
      reason,
    });
    setSelectedKey(null);
    await refetch();
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KYC &amp; document verification</h1>
        <p className="text-slate-500 text-sm">
          Identity checks awaiting a decision in your market, as admin-service holds them.
        </p>
      </div>
      {board && (
        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold border border-slate-200 text-xs">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> {board.total} pending
        </span>
      )}
    </div>
  );

  if (loading && !board) {
    return (
      <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
        {header}
        <AdminLoading rows={5} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
        {header}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden
            what="the identity-check queue"
            route={KYC_ROUTE}
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The identity-check queue"
            route={KYC_ROUTE}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  // Not `return null`. Unreachable today — `loadKycQueue` resolves a result
  // rather than throwing, so `useAdminData` cannot leave both `data` and `error`
  // null — but a blank screen is the one answer this console must never give.
  if (!board) {
    return (
      <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
        {header}
        <AdminNotConnected
          what="The identity-check queue"
          route={KYC_ROUTE}
          error="The page received no result and no error."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      {header}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Queue ───────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">
              Pending review queue ({records.length})
            </h2>
          </div>
          <div className="overflow-auto divide-y divide-slate-100 flex-1">
            {records.map((record) => (
              <div
                key={keyOf(record)}
                onClick={() => setSelectedKey(keyOf(record))}
                role="button"
                tabIndex={0}
                onKeyDown={activateOnKey(() => setSelectedKey(keyOf(record)))}
                className={`p-4 cursor-pointer border-l-4 transition-colors ${
                  selected && keyOf(selected) === keyOf(record)
                    ? 'bg-indigo-50/50 border-l-indigo-600'
                    : 'hover:bg-slate-50 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`${typeColors[record.entityType] || 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}
                  >
                    {record.entityType}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {formatSubmitted(record.submittedAt)}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-0.5">
                  {record.businessName ?? record.entityId}
                </p>
                <p className="text-xs text-slate-500">
                  ID: {record.entityId}
                  {record.location ? ` • ${record.location}` : ''}
                  {record.country ? ` • ${record.country}` : ''}
                </p>
              </div>
            ))}
            {records.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No identity checks are waiting for a decision.
              </div>
            )}
          </div>
          {board.undecidable > 0 && (
            <div className="p-3 border-t border-amber-200 bg-amber-50 text-[11px] text-amber-700">
              {board.undecidable} queue record(s) carry no entity id or type and cannot be decided
              from here.
            </div>
          )}
        </div>

        {/* ── Review panel ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">
                {selected ? (selected.businessName ?? selected.entityId) : 'Nothing selected'}
              </h2>
              {selected && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                  Under review
                </span>
              )}
            </div>
            {selected && (
              <p className="text-slate-500 flex flex-wrap items-center gap-4 text-sm">
                {selected.gstin && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> GSTIN: {selected.gstin}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Owner: {selected.ownerName ?? 'not recorded'}
                </span>
                <span>Submitted: {formatSubmitted(selected.submittedAt)}</span>
              </p>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
            {!selected ? (
              <p className="text-sm text-slate-400">
                Select an application from the queue to review it.
              </p>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">
                  Submitted documents ({selected.documents.length})
                </h3>
                <div className="space-y-4">
                  {selected.documents.map((doc, i) => (
                    <div
                      key={`${doc.name ?? 'document'}-${i}`}
                      className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {doc.name ?? doc.type ?? 'Untitled document'}
                          </p>
                          {doc.type && <p className="text-xs text-slate-500 mb-1">{doc.type}</p>}
                          {doc.url ? (
                            <a
                              href={doc.url}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open document{doc.size ? ` (${doc.size})` : ''}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">No file was attached.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selected.documents.length === 0 && (
                    <div className="bg-white border border-slate-200 p-6 rounded-xl text-center">
                      <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        This queue record carries no document list.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Documents are held by the module the applicant registered with, not by the
                        identity-check queue.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {actionError && (
            <p className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border-t border-red-200">
              {actionError}
            </p>
          )}

          <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
            <button
              disabled={actionLoading || !selected}
              onClick={() => setRejecting(true)}
              className="text-red-600 font-bold px-4 py-2 hover:bg-red-50 rounded-lg transition-colors text-sm border border-transparent hover:border-red-200 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 inline mr-1" /> Reject application
            </button>
            <button
              disabled={actionLoading || !selected}
              onClick={() => void decide('approve')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2 rounded-lg transition-colors text-sm shadow-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {actionLoading ? 'Processing…' : 'Approve KYC'}
            </button>
          </div>
        </div>
      </div>

      {rejecting && selected && (
        <ReasonDialog
          title={`Reject ${selected.businessName ?? selected.entityId}`}
          confirmLabel="Reject application"
          busy={actionLoading}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason) => void decide('reject', reason)}
        />
      )}
    </div>
  );
}
