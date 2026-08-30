import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function MarketplaceErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please check the API Gateway connection and retry.',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  );
}
