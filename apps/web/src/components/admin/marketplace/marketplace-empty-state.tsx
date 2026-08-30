import React from 'react';
import { Package, Inbox } from 'lucide-react';

interface Props {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
}

export default function MarketplaceEmptyState({
  title = 'No records found',
  message = 'There are no items to display. Try adjusting your search or filters.',
  icon: Icon = Package,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{message}</p>
      {action && (
        <button onClick={action.onClick} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
