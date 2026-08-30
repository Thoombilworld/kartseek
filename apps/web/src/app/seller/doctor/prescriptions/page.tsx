'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { doctorApi } from '@/lib/api/doctor';
import { DOCTOR_ROUTES } from '@/lib/routes/doctor-routes';

// Mock doctor ID — will come from auth context in production
const DOCTOR_ID = 'DOCTOR_SELF';

export default function SellerPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorApi.getDoctorPrescriptions(DOCTOR_ID, { limit: 50 });
        setPrescriptions(res?.data ?? []);
      } catch { /* fallback to empty */ }
      setLoading(false);
    })();
  }, []);

  const statusColor = (s: string) => {
    if (s === 'ISSUED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'DISPENSED') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Prescriptions</h1>
            <p className="text-slate-500 mt-1">All prescriptions you&apos;ve issued</p>
          </div>
          <Link href={DOCTOR_ROUTES.SELLER_WRITE_RX}
            className="px-5 py-3 bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 transition flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Write Prescription
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No prescriptions yet</h3>
            <p className="text-slate-400 mb-6">Write your first prescription for a patient</p>
            <Link href={DOCTOR_ROUTES.SELLER_WRITE_RX}
              className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition">
              Write Prescription
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Items</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map(rx => (
                  <tr key={rx.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-sm text-slate-900">{rx.patientName || 'Patient'}</div>
                      <div className="text-xs text-slate-400">ID: {rx.id?.substring(0, 8)}…</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 max-w-[200px] truncate">{rx.diagnosis || '—'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 rounded-lg text-sm font-bold">
                        {rx.items?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${statusColor(rx.status)}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-slate-500">
                      {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString() : new Date(rx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {rx.status === 'DRAFT' && (
                        <button onClick={async () => {
                          await doctorApi.issuePrescription(rx.id);
                          setPrescriptions(prev => prev.map(p => p.id === rx.id ? { ...p, status: 'ISSUED', issuedAt: new Date().toISOString() } : p));
                        }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">
                          Issue
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
