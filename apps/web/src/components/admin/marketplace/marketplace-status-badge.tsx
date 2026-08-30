import React from 'react';

type Status =
  | 'active' | 'inactive' | 'pending' | 'approved' | 'rejected'
  | 'suspended' | 'blocked' | 'correction' | 'published' | 'unpublished'
  | 'featured' | 'expired' | 'paused' | 'scheduled' | 'processing'
  | 'delivered' | 'cancelled' | 'refunded' | 'verified' | 'under-review'
  | 'beta' | 'limited';

const STATUS_CONFIG: Record<Status, { bg: string; dot: string; label: string }> = {
  active:       { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
  approved:     { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
  verified:     { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Verified' },
  published:    { bg: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    label: 'Published' },
  featured:     { bg: 'bg-purple-100 text-purple-700 border-purple-200',    dot: 'bg-purple-500',  label: 'Featured' },
  scheduled:    { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',    dot: 'bg-indigo-500',  label: 'Scheduled' },
  beta:         { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200',          dot: 'bg-cyan-500',    label: 'Beta' },
  pending:      { bg: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Pending' },
  correction:   { bg: 'bg-orange-100 text-orange-700 border-orange-200',    dot: 'bg-orange-500',  label: 'Correction Req.' },
  processing:   { bg: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Processing' },
  'under-review': { bg: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500',   label: 'Under Review' },
  paused:       { bg: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400',   label: 'Paused' },
  inactive:     { bg: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400',   label: 'Inactive' },
  unpublished:  { bg: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400',   label: 'Unpublished' },
  limited:      { bg: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400',   label: 'Limited' },
  rejected:     { bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Rejected' },
  suspended:    { bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Suspended' },
  blocked:      { bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Blocked' },
  cancelled:    { bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Cancelled' },
  expired:      { bg: 'bg-red-50 text-red-500 border-red-100',              dot: 'bg-red-400',     label: 'Expired' },
  delivered:    { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Delivered' },
  refunded:     { bg: 'bg-purple-100 text-purple-700 border-purple-200',    dot: 'bg-purple-500',  label: 'Refunded' },
};

interface Props {
  status: Status | string;
  showDot?: boolean;
  size?: 'xs' | 'sm';
  customLabel?: string;
}

export default function MarketplaceStatusBadge({ status, showDot = false, size = 'xs', customLabel }: Props) {
  const config = STATUS_CONFIG[status as Status] ?? {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 border font-bold rounded-full ${size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${config.bg}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      {customLabel ?? config.label}
    </span>
  );
}
