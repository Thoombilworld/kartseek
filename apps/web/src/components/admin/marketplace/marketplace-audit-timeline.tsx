import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Zap, Edit2, Eye } from 'lucide-react';

interface AuditEntry {
  id: string;
  actionType: string;
  actor: string;
  actorRole?: string;
  entity: string;
  entityId?: string;
  reason?: string;
  createdAt: string;
}

interface Props { entries: AuditEntry[]; maxItems?: number }

const ACTION_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  'approved':   { icon: CheckCircle,    color: 'bg-emerald-100 text-emerald-600' },
  'rejected':   { icon: XCircle,        color: 'bg-red-100 text-red-600' },
  'suspended':  { icon: AlertTriangle,  color: 'bg-amber-100 text-amber-600' },
  'unpublished':{ icon: AlertTriangle,  color: 'bg-amber-100 text-amber-600' },
  'updated':    { icon: Edit2,          color: 'bg-blue-100 text-blue-600' },
  'published':  { icon: Zap,            color: 'bg-blue-100 text-blue-600' },
  'viewed':     { icon: Eye,            color: 'bg-slate-100 text-slate-600' },
};

function getIcon(actionType: string) {
  const key = Object.keys(ACTION_ICON).find(k => actionType.toLowerCase().includes(k));
  return key ? ACTION_ICON[key] : { icon: Zap, color: 'bg-slate-100 text-slate-600' };
}

export default function MarketplaceAuditTimeline({ entries, maxItems = 10 }: Props) {
  const items = entries.slice(0, maxItems);

  return (
    <div className="relative pl-5">
      {/* Vertical line */}
      <div className="absolute left-2 top-3 bottom-3 w-px bg-slate-200" />

      <div className="space-y-4">
        {items.map((entry, i) => {
          const { icon: Icon, color } = getIcon(entry.actionType);
          return (
            <div key={entry.id} className="relative flex items-start gap-3">
              {/* Dot */}
              <div className={`absolute -left-5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow ${color}`} style={{ top: '2px' }}>
                <Icon className="w-2.5 h-2.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{entry.actionType}</span>
                  <span className="text-sm font-bold text-slate-900">{entry.entity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  by <span className="font-semibold text-slate-600">{entry.actor}</span>
                  {entry.actorRole && <span className="text-slate-400"> ({entry.actorRole})</span>}
                  {' · '}{entry.createdAt}
                </p>
                {entry.reason && (
                  <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">{entry.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
