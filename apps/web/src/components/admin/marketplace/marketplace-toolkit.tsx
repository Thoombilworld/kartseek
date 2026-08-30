'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Trash2, CheckSquare } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ── Pagination Component ─────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, label = 'items', onPageChange }: { page: number; totalPages: number; total: number; label?: string; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-2 py-2">
      <p className="text-xs text-slate-500">{total.toLocaleString()} {label}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {/* Numbered pages for medium-size paginations */}
        {totalPages <= 7 ? (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => onPageChange(p)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
          ))
        ) : (
          <span className="text-xs font-bold text-slate-600">Page {page} of {totalPages}</span>
        )}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Bulk Selection Hook ──────────────────────────────────────────────────────
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => prev.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  }, [items]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;
  const selectedItems = items.filter(i => selectedIds.has(i.id));

  return { selectedIds, toggle, toggleAll, clear, isAllSelected, selectedCount, hasSelection, selectedItems };
}

// ── Bulk Action Bar ──────────────────────────────────────────────────────────
export function BulkActionBar({ count, onClear, actions }: { count: number; onClear: () => void; actions: { label: string; icon: React.ElementType; onClick: () => void; variant?: 'danger' | 'primary' | 'default' }[] }) {
  if (count === 0) return null;
  const variantStyles = { danger: 'bg-red-600 hover:bg-red-700 text-white', primary: 'bg-blue-600 hover:bg-blue-700 text-white', default: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200' };
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50" style={{ animation: 'slideUp 0.2s ease-out' }}>
      <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-blue-400" /><span className="text-sm font-bold">{count} selected</span></div>
      <div className="w-px h-6 bg-slate-700" />
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (<button key={i} onClick={a.onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${variantStyles[a.variant || 'default']}`} aria-label="Icon"><Icon className="w-3.5 h-3.5" />{a.label}</button>);
      })}
      <div className="w-px h-6 bg-slate-700" />
      <button onClick={onClear} className="text-xs text-slate-400 hover:text-white transition-colors">Clear</button>
    </div>
  );
}

// ── CSV Export Utility ───────────────────────────────────────────────────────
export function exportCsv(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Keyboard Shortcuts Hook ──────────────────────────────────────────────────
type ShortcutDef = { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; handler: () => void; description: string };

export function useKeyboardShortcuts(shortcuts: ShortcutDef[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target.isContentEditable) return;

      for (const s of shortcuts) {
        if (
          e.key.toLowerCase() === s.key.toLowerCase() &&
          !!e.ctrlKey === !!s.ctrl &&
          !!e.shiftKey === !!s.shift &&
          !!e.altKey === !!s.alt
        ) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}

// ── Shortcuts Help Modal ─────────────────────────────────────────────────────
export function KeyboardShortcutsHelp({ shortcuts, isOpen, onClose }: { shortcuts: ShortcutDef[]; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  const formatKey = (s: ShortcutDef) => {
    const parts: string[] = [];
    if (s.ctrl) parts.push('Ctrl');
    if (s.shift) parts.push('Shift');
    if (s.alt) parts.push('Alt');
    parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
    return parts;
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-4">⌨️ Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-600">{s.description}</span>
              <div className="flex gap-1">
                {formatKey(s).map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-[10px] text-slate-300">+</span>}
                    <kbd className="bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">{k}</kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Close</button>
      </div>
    </div>
  );
}
