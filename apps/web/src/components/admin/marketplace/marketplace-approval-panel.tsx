'use client';
import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, MessageSquare, X, Loader2 } from 'lucide-react';

type ActionType = 'approve' | 'reject' | 'correction' | 'suspend';

interface Props {
  entityName: string;
  entityType: string;
  action: ActionType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  reasonOptions?: string[];
}

const ACTION_CONFIG: Record<ActionType, { title: string; icon: React.ElementType; color: string; btnClass: string; needsReason: boolean }> = {
  approve:    { title: 'Approve',           icon: CheckCircle,    color: 'text-emerald-600', btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white', needsReason: false },
  reject:     { title: 'Reject',            icon: XCircle,        color: 'text-red-600',     btnClass: 'bg-red-600 hover:bg-red-700 text-white',         needsReason: true },
  correction: { title: 'Request Correction',icon: AlertTriangle,  color: 'text-amber-600',   btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',     needsReason: true },
  suspend:    { title: 'Suspend',           icon: MessageSquare,  color: 'text-red-600',     btnClass: 'bg-red-600 hover:bg-red-700 text-white',         needsReason: true },
};

export default function MarketplaceApprovalPanel({ entityName, entityType, action, isOpen, onClose, onConfirm, reasonOptions }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (cfg.needsReason && !reason.trim()) { setError('Please provide a reason.'); return; }
    setLoading(true); setError('');
    try { await onConfirm(reason); onClose(); setReason(''); }
    catch (e: any) { setError(e?.message || 'Action failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${cfg.color}`} />
            <h3 className="text-lg font-black text-slate-900">{cfg.title} {entityType}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            You are about to <strong>{cfg.title.toLowerCase()}</strong>: <strong className="text-slate-900">{entityName}</strong>
          </p>
          {cfg.needsReason && (
            <>
              {reasonOptions && (
                <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select reason...</option>
                  {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value="Other">Other</option>
                </select>
              )}
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={reasonOptions ? 'Add additional notes (optional)...' : 'Provide a reason *'}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            ⚠️ This action will be logged in the Marketplace Audit Trail with your name, role, and timestamp.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${cfg.btnClass}`} aria-label="Loading">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
            {loading ? 'Processing...' : cfg.title}
          </button>
        </div>
      </div>
    </div>
  );
}
