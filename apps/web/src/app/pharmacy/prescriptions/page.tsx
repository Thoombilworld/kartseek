'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, Check, Clock, X, AlertTriangle, ChevronRight, Plus, Eye, Download } from 'lucide-react';

const PRESCRIPTIONS = [
  { id:'rx1', name:'Dr. Sarah Prescription', date:'Jul 5, 2026', status:'APPROVED', items:['Augmentin 625 Duo','Dolo 650'], doctor:'Dr. Sarah Kimani', expiry:'Jan 5, 2027', file:'rx_sarah.pdf' },
  { id:'rx2', name:'Monthly Diabetes Rx', date:'Jul 3, 2026', status:'APPROVED', items:['Metformin 500mg','Glimepiride 2mg'], doctor:'Dr. Rajesh Patel', expiry:'Oct 3, 2026', file:'rx_diabetes.pdf' },
  { id:'rx3', name:'Eye Care Prescription', date:'Jul 1, 2026', status:'PENDING', items:['Ofloxacin Eye Drops','Carboxymethylcellulose'], doctor:'Dr. Amit Gupta', expiry:'Dec 1, 2026', file:'rx_eye.jpg' },
  { id:'rx4', name:'Thyroid Prescription', date:'Jun 28, 2026', status:'REJECTED', items:['Thyronorm 50mcg'], doctor:'Dr. Priya Sharma', expiry:'', file:'rx_thyroid.jpg' },
];

const STATUS_CFG: Record<string,{label:string,color:string,bg:string,icon:React.ComponentType<any>}> = {
  APPROVED: { label:'Approved', color:'text-green-700', bg:'bg-green-50 border-green-200', icon:Check },
  PENDING: { label:'Under Review', color:'text-amber-700', bg:'bg-amber-50 border-amber-200', icon:Clock },
  REJECTED: { label:'Rejected', color:'text-red-700', bg:'bg-red-50 border-red-200', icon:X },
};

export default function PharmacyPrescriptionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Prescriptions</h1>
          <p className="text-sm text-slate-500">{PRESCRIPTIONS.length} prescriptions uploaded</p>
        </div>
        <Link href="/pharmacy/prescription/upload"
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <Upload className="w-4 h-4" /> Upload New
        </Link>
      </div>

      <div className="space-y-4">
        {PRESCRIPTIONS.map(rx => {
          const cfg = STATUS_CFG[rx.status];
          const StatusIcon = cfg.icon;
          return (
            <div key={rx.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{rx.name}</h3>
                    <p className="text-xs text-slate-400">Uploaded: {rx.date} • {rx.doctor}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 border rounded-full text-[11px] font-bold flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {rx.items.map(item => (
                  <span key={item} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full">{item}</span>
                ))}
              </div>

              {rx.expiry && (
                <p className="text-xs text-slate-400 mb-3">Valid until: {rx.expiry}</p>
              )}

              {rx.status === 'REJECTED' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">Prescription is not clearly readable. Please re-upload a high-quality image.</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </button>
                <button className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </button>
                {rx.status === 'APPROVED' && (
                  <Link href="/pharmacy/cart" className="ml-auto px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-100 flex items-center gap-1">
                    Order Medicines <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {rx.status === 'REJECTED' && (
                  <Link href="/pharmacy/prescription/upload" className="ml-auto px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Re-upload
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
