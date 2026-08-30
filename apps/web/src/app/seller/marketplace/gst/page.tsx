'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { FileText, Download, CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react';

interface GstInfo { gstin: string; status: 'active' | 'pending' | 'suspended'; filingStatus: string; lastFiled: string; nextDue: string; filingHistory: { period: string; type: string; status: string; filedOn?: string; dueDate: string }[]; }

const DEMO_GST: GstInfo = {
  gstin: '29AABCU9603R1ZM', status: 'active', filingStatus: 'Up to date', lastFiled: '2025-06-30', nextDue: '2025-07-20',
  filingHistory: [
    { period: 'Jun 2025', type: 'GSTR-1', status: 'Filed', filedOn: '2025-06-28', dueDate: '2025-07-11' },
    { period: 'Jun 2025', type: 'GSTR-3B', status: 'Filed', filedOn: '2025-06-30', dueDate: '2025-07-20' },
    { period: 'May 2025', type: 'GSTR-1', status: 'Filed', filedOn: '2025-05-28', dueDate: '2025-06-11' },
    { period: 'May 2025', type: 'GSTR-3B', status: 'Filed', filedOn: '2025-05-30', dueDate: '2025-06-20' },
    { period: 'Jul 2025', type: 'GSTR-1', status: 'Pending', dueDate: '2025-08-11' },
    { period: 'Jul 2025', type: 'GSTR-3B', status: 'Pending', dueDate: '2025-08-20' },
  ],
};

const STATUS_CFG: Record<string, string> = { Filed: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Overdue: 'bg-red-50 text-red-700' };

export default function GstPage() {
  const { seller } = useSeller();
  const [gst, setGst] = useState<GstInfo>(DEMO_GST);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getGstInfo(seller.sellerId)
      .then(res => { if (res?.data) setGst(res.data as GstInfo); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FileText className="w-7 h-7 text-blue-600" />GST Filing</h1><p className="text-sm text-slate-500 mt-1">GST compliance status and filing history</p></div>
        <Link href="/seller/marketplace/gst/compliance" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"><Shield className="w-4 h-4" />Compliance Check</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">GSTIN</p>
          <p className="text-lg font-black text-slate-900 mt-1 font-mono">{gst.gstin}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${gst.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{gst.status}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Filing Status</p><p className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-5 h-5" />{gst.filingStatus}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Last Filed</p><p className="text-xl font-black text-slate-900 mt-1">{new Date(gst.lastFiled).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Next Due</p><p className="text-xl font-black text-amber-600 mt-1 flex items-center gap-1"><Clock className="w-5 h-5" />{new Date(gst.nextDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Filing History</h3>
          <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"><Download className="w-3.5 h-3.5" />Download</button>
        </div>
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Period</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Return Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Filed On</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gst.filingHistory.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800">{f.period}</td>
                  <td className="px-4 py-3.5"><span className="font-mono text-xs font-bold text-blue-600">{f.type}</span></td>
                  <td className="px-4 py-3.5 text-slate-500">{new Date(f.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-3.5 text-slate-500">{f.filedOn ? new Date(f.filedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_CFG[f.status]}`}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
