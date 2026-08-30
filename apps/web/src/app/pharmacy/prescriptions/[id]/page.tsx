'use client';
import React, { useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Download, Eye, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const mockPrescription = {
  id: 'RX-2026-4521',
  status: 'verified' as const,
  uploadedAt: 'Jul 3, 2026 • 2:30 PM',
  verifiedAt: 'Jul 3, 2026 • 3:15 PM',
  pharmacist: 'Dr. Sarah Khan',
  patient: 'Ahmed Hassan',
  store: 'MedPlus Pharmacy - Hyderabad',
  doctor: 'Dr. Rajesh Verma',
  hospital: 'Apollo Hospital',
  notes: 'All medicines are available. Generic alternatives suggested for Augmentin.',
  items: [
    { name: 'Paracetamol 500mg', qty: '2 strips', available: true, price: 35.00 },
    { name: 'Augmentin 625mg', qty: '1 strip', available: true, price: 245.00, alternative: 'Amoxyclav 625mg (₹120)' },
    { name: 'Cetrizine 10mg', qty: '1 strip', available: true, price: 28.00 },
    { name: 'Pantoprazole 40mg', qty: '1 strip', available: false, price: 85.00 },
  ],
};

const sCfg: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-4 h-4" />, label: 'Pending Review' },
  verified: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Verified' },
  rejected: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' },
  clarification: { bg: 'bg-blue-100 text-blue-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Needs Clarification' },
};

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
  const p = mockPrescription;
  const s = sCfg[p.status];
  const [showImage, setShowImage] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/pharmacy/prescriptions" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Prescription {p.id}</h1>
            <p className="text-sm text-gray-500">{p.uploadedAt}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${s.bg}`}>
            {s.icon} {s.label}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Prescription Image */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Prescription Image</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Eye className="w-4 h-4" /> View Full</button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Download className="w-4 h-4" /> Download</button>
            </div>
          </div>
          <div className="p-8 bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center" style={{ minHeight: 200 }}>
            <div className="text-center">
              <FileText className="w-16 h-16 text-teal-300 mx-auto mb-3" />
              <p className="text-sm text-teal-600 font-medium">Prescription image uploaded</p>
              <p className="text-xs text-teal-500 mt-1">Click &quot;View Full&quot; to see original</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Patient Details</h3>
            <div className="space-y-3">
              <_Row label="Patient Name" value={p.patient} />
              <_Row label="Prescribing Doctor" value={p.doctor} />
              <_Row label="Hospital/Clinic" value={p.hospital} />
              <_Row label="Upload Date" value={p.uploadedAt} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Verification Details</h3>
            <div className="space-y-3">
              <_Row label="Verified By" value={p.pharmacist} />
              <_Row label="Verified At" value={p.verifiedAt} />
              <_Row label="Pharmacy Store" value={p.store} />
              <_Row label="Status" value={s.label} />
            </div>
          </div>
        </div>

        {/* Pharmacist Notes */}
        {p.notes && (
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5">
            <h3 className="font-bold text-teal-800 mb-2">💊 Pharmacist Notes</h3>
            <p className="text-sm text-teal-700">{p.notes}</p>
          </div>
        )}

        {/* Medicines */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Prescribed Medicines</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {p.items.map((item, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.available ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {item.available ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.qty} • {item.available ? 'In stock' : 'Out of stock'}</p>
                  {item.alternative && <p className="text-xs text-teal-600 mt-1">💡 Alternative: {item.alternative}</p>}
                </div>
                <p className="font-bold text-gray-900">₹{item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 flex items-center justify-between border-t">
            <span className="text-sm font-medium text-gray-600">Estimated Total</span>
            <span className="text-lg font-bold text-gray-900">₹{p.items.reduce((s, i) => s + i.price, 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {p.status === 'verified' && (
            <Link href="/pharmacy/cart" className="flex-1 bg-teal-600 text-white text-center font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-colors">
              Order These Medicines
            </Link>
          )}
          <button className="flex-1 border border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Re-upload Prescription
          </button>
        </div>
      </div>
    </div>
  );
}

function _Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
