'use client';
import React, { useState } from 'react';
import { Tag, Edit, Save, X, CheckCircle } from 'lucide-react';

type Rate = { room: string; base: number; weekend: number; peakSeason: number; offSeason: number; currency: string };

const INITIAL: Rate[] = [
  { room: 'Deluxe King Room', base: 450, weekend: 550, peakSeason: 650, offSeason: 380, currency: 'AED' },
  { room: 'Premium Twin Room', base: 520, weekend: 620, peakSeason: 750, offSeason: 450, currency: 'AED' },
  { room: 'Executive Suite', base: 850, weekend: 1050, peakSeason: 1200, offSeason: 700, currency: 'AED' },
  { room: 'Family Suite', base: 980, weekend: 1100, peakSeason: 1400, offSeason: 800, currency: 'AED' },
];

export default function OwnerPricingPage() {
  const [rates, setRates] = useState(INITIAL);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Rate | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditForm({ ...rates[idx] });
  };

  const cancelEdit = () => { setEditIdx(null); setEditForm(null); };

  const saveEdit = () => {
    if (editIdx === null || !editForm) return;
    setRates(prev => prev.map((r, i) => i === editIdx ? editForm : r));
    setEditIdx(null);
    setEditForm(null);
    showToast('Pricing updated successfully!');
  };

  const saveAll = () => { showToast('All pricing changes saved!'); };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1><p className="text-slate-500 text-sm">Set base rates, seasonal adjustments, and special pricing.</p></div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Room Type</th>
                <th className="px-5 py-3.5 font-semibold text-right">Base Rate</th>
                <th className="px-5 py-3.5 font-semibold text-right">Weekend</th>
                <th className="px-5 py-3.5 font-semibold text-right">Peak Season</th>
                <th className="px-5 py-3.5 font-semibold text-right">Off Season</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((r, i) => (
                <tr key={r.room} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-bold text-slate-900">{r.room}</td>
                  {editIdx === i && editForm ? (
                    <>
                      <td className="px-5 py-4 text-right">
                        <input type="number" aria-label="Base rate" value={editForm.base} onChange={e => setEditForm({ ...editForm, base: Number(e.target.value) })} className="w-24 text-right border-2 border-rose-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-rose-500" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <input type="number" aria-label="Weekend rate" value={editForm.weekend} onChange={e => setEditForm({ ...editForm, weekend: Number(e.target.value) })} className="w-24 text-right border-2 border-rose-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-rose-500" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <input type="number" aria-label="Peak season rate" value={editForm.peakSeason} onChange={e => setEditForm({ ...editForm, peakSeason: Number(e.target.value) })} className="w-24 text-right border-2 border-rose-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-rose-500" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <input type="number" aria-label="Off season rate" value={editForm.offSeason} onChange={e => setEditForm({ ...editForm, offSeason: Number(e.target.value) })} className="w-24 text-right border-2 border-rose-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-rose-500" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button title="Save" onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"><Save className="w-3.5 h-3.5" /></button>
                          <button title="Cancel" onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-4 text-right font-bold">{r.currency} {r.base}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{r.currency} {r.weekend}</td>
                      <td className="px-5 py-4 text-right text-rose-600 font-medium">{r.currency} {r.peakSeason}</td>
                      <td className="px-5 py-4 text-right text-emerald-600 font-medium">{r.currency} {r.offSeason}</td>
                      <td className="px-5 py-4 text-center">
                        <button title="Edit pricing" onClick={() => startEdit(i)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={saveAll} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Save className="w-4 h-4" />Save Changes</button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-4 h-4" /><span className="text-sm font-bold">{toast}</span>
        </div>
      )}
    </div>
  );
}
