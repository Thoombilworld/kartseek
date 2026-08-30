'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface MenuItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  divider?: boolean;
  destructive?: boolean;
}

interface Props { items: MenuItem[] }

export default function MarketplaceActionMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const variantClass: Record<string, string> = {
    default: 'text-slate-700 hover:bg-slate-50',
    danger:  'text-red-600 hover:bg-red-50',
    warning: 'text-amber-700 hover:bg-amber-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[180px]">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={i}>
                {item.divider && i > 0 && <div className="my-1 border-t border-slate-100" />}
                <button
                  onClick={() => { item.onClick(); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors text-left ${variantClass[item.variant || 'default']}`}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" />}
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
