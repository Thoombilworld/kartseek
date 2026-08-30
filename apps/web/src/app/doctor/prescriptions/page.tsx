'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { doctorApi } from '@/lib/api/doctor';
import { DOCTOR_ROUTES } from '@/lib/routes/doctor-routes';

export default function MyPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // TODO: get from auth context
  const customerId = 'CUSTOMER_SELF';

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorApi.getMyPrescriptions(customerId);
        setPrescriptions(Array.isArray(res) ? res : []);
      } catch { /* fallback */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Prescriptions</h1>
          <p className="text-slate-500 mt-1">All prescriptions from your doctors</p>
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
            <p className="text-slate-400">Your prescriptions will appear here after your doctor issues them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map(rx => (
              <Link key={rx.id} href={DOCTOR_ROUTES.PRESCRIPTION_DETAIL(rx.id)}
                className="block bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                      Rx
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                        {rx.doctor?.name || 'Doctor'}
                      </div>
                      <div className="text-sm text-slate-500">{rx.diagnosis || 'No diagnosis noted'}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {rx.items?.length ?? 0} medication(s) • {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!rx.pharmacyOrderId && (
                      <span className="hidden sm:inline-block px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                        Order Medicines →
                      </span>
                    )}
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
