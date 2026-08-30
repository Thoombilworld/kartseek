'use client';
import React, { useState } from 'react';
import { FileText, Download, Search, Calendar, Filter, CheckCircle, Clock, Eye, Printer } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Invoice = {
  id: string; period: string; amount: number; commission: number; net: number;
  currency: string; status: 'paid' | 'pending' | 'overdue'; issueDate: string;
  dueDate: string; bookings: number;
};

const INVOICES: Invoice[] = [
  { id: 'INV-2026-012', period: 'Jun 1–15, 2026', amount: 52941, commission: 7941, net: 45000, currency: 'AED', status: 'paid', issueDate: 'Jun 16, 2026', dueDate: 'Jun 18, 2026', bookings: 24 },
  { id: 'INV-2026-011', period: 'May 16–31, 2026', amount: 45294, commission: 6794, net: 38500, currency: 'AED', status: 'paid', issueDate: 'Jun 1, 2026', dueDate: 'Jun 3, 2026', bookings: 21 },
  { id: 'INV-2026-010', period: 'May 1–15, 2026', amount: 41412, commission: 6212, net: 35200, currency: 'AED', status: 'paid', issueDate: 'May 16, 2026', dueDate: 'May 18, 2026', bookings: 19 },
  { id: 'INV-2026-013', period: 'Jun 16–30, 2026', amount: 49412, commission: 7412, net: 42000, currency: 'AED', status: 'pending', issueDate: 'Jul 1, 2026', dueDate: 'Jul 3, 2026', bookings: 23 },
];

export default function OwnerInvoicesPage() {
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filtered = INVOICES.filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Invoices & Receipts</h1><p className="text-slate-500 text-sm">Download and manage your billing statements.</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'paid', 'pending', 'overdue'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === s ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Invoice</th>
                <th className="px-5 py-3.5 font-semibold">Period</th>
                <th className="px-5 py-3.5 font-semibold text-right">Gross</th>
                <th className="px-5 py-3.5 font-semibold text-right">Commission</th>
                <th className="px-5 py-3.5 font-semibold text-right">Net Payout</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{inv.id}</p><p className="text-xs text-slate-400">{inv.bookings} bookings</p></td>
                  <td className="px-5 py-4 text-slate-600">{inv.period}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{inv.currency} {inv.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-red-600">-{inv.currency} {inv.commission.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">{inv.currency} {inv.net.toLocaleString()}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {inv.status === 'paid' ? <CheckCircle className="w-3 h-3 inline mr-0.5" /> : <Clock className="w-3 h-3 inline mr-0.5" />}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setSelectedInvoice(inv)} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors" title="View"><Eye className="w-3 h-3" /></button>
                      <button className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Download"><Download className="w-3 h-3" /></button>
                      <button className="w-7 h-7 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors" title="Print"><Printer className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}><DismissOnEscape onDismiss={() => setSelectedInvoice(null)} />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedInvoice.id}</h2>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-bold">{selectedInvoice.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bookings</span><span>{selectedInvoice.bookings}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Gross Revenue</span><span>{selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}</span></div>
              <div className="flex justify-between text-red-600"><span>KARTSEEK Commission (15%)</span><span>-{selectedInvoice.currency} {selectedInvoice.commission.toLocaleString()}</span></div>
              <div className="flex justify-between pt-3 border-t border-slate-100 font-bold text-lg"><span>Net Payout</span><span className="text-emerald-600">{selectedInvoice.currency} {selectedInvoice.net.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Issue Date</span><span>{selectedInvoice.issueDate}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Due Date</span><span>{selectedInvoice.dueDate}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors"><Download className="w-4 h-4" /> Download PDF</button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"><Printer className="w-4 h-4" /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
