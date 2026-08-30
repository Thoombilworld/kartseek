'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doctorApi } from '@/lib/api/doctor';

export default function PrescriptionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [rx, setRx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await doctorApi.getPrescription(id);
        setRx(data);
      } catch { /* 404 */ }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700">Prescription not found</h2>
          <Link href="/doctor/prescriptions" className="text-violet-600 font-bold mt-4 inline-block hover:underline">← Back to Prescriptions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/doctor/prescriptions" className="text-sm font-bold text-violet-600 hover:underline mb-2 inline-block">← My Prescriptions</Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Prescription Details</h1>
          <p className="text-slate-500 mt-1">Issued on {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
        </div>

        {/* Doctor + Patient Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-linear-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg">
              Rx
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900">{rx.doctor?.name || 'Doctor'}</div>
              <div className="text-sm font-semibold text-violet-600">{rx.doctor?.specialty || 'Specialist'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div><span className="text-xs text-slate-400 font-bold uppercase">Patient</span><p className="text-sm font-bold text-slate-800 mt-0.5">{rx.patientName}</p></div>
            <div><span className="text-xs text-slate-400 font-bold uppercase">Age / Gender</span><p className="text-sm font-bold text-slate-800 mt-0.5">{rx.patientAge ?? '—'} / {rx.patientGender ?? '—'}</p></div>
            <div><span className="text-xs text-slate-400 font-bold uppercase">Diagnosis</span><p className="text-sm font-bold text-slate-800 mt-0.5">{rx.diagnosis || '—'}</p></div>
            <div><span className="text-xs text-slate-400 font-bold uppercase">Follow-Up</span><p className="text-sm font-bold text-slate-800 mt-0.5">{rx.followUpDate ? new Date(rx.followUpDate).toLocaleDateString() : 'None'}</p></div>
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Medications ({rx.items?.length ?? 0})</h3>
          <div className="space-y-3">
            {(rx.items || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="bg-linear-to-r from-violet-50/50 to-purple-50/30 border border-violet-100 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-200 text-violet-800 rounded-lg flex items-center justify-center text-sm font-black">{idx + 1}</div>
                    <div>
                      <div className="font-extrabold text-slate-900">{item.drugName}</div>
                      {item.genericName && <div className="text-xs text-slate-400">({item.genericName})</div>}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-violet-200 rounded-lg text-xs font-bold text-violet-700">{item.dosage}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 font-semibold text-slate-600">📅 {item.frequency}</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 font-semibold text-slate-600">⏱ {item.duration}</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 font-semibold text-slate-600">📦 Qty: {item.quantity}</span>
                </div>
                {item.instructions && (
                  <div className="mt-2 text-xs text-slate-500 italic">💡 {item.instructions}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {rx.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor&apos;s Notes</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{rx.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button className="flex-1 min-w-[180px] py-4 bg-white border-2 border-slate-200 text-slate-700 font-extrabold rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </button>
          <Link href="/pharmacy" className="flex-1 min-w-[180px] py-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white font-extrabold rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            Order Medicines from Kartseek Pharmacy
          </Link>
        </div>
      </div>
    </div>
  );
}
