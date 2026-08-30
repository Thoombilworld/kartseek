import React from 'react';
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, ShieldCheck, AlertCircle, Camera } from 'lucide-react';
import Link from 'next/link';

export default function PharmacyPrescriptionUpload() {
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Upload Prescription</h1>
            <p className="text-xs text-slate-500 font-medium">Fast & Secure Verification</p>
          </div>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 text-sm mb-1">Your privacy is protected</h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              Your prescription is securely encrypted and will only be reviewed by our verified, registered pharmacists to fulfill your order.
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-1">Upload from Gallery</h2>
          <p className="text-sm text-slate-500 mb-6">Supports JPG, PNG, PDF (Max 5MB)</p>
          
          <div className="flex gap-3 w-full">
            <button className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <FileText className="w-5 h-5" /> Browse Files
            </button>
            <button className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Camera className="w-5 h-5" /> Open Camera
            </button>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" /> Valid Prescription Guide
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-700">Must contain the <strong className="text-slate-900">Doctor's Name & Signature</strong>.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-700">Must contain the <strong className="text-slate-900">Patient's Name & Age</strong>.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-700">Date of prescription must be clearly visible and within validity limits.</p>
            </div>
          </div>
        </div>

        {/* Order Details Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Delivery Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Who is the patient? <span className="text-red-500">*</span></label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm appearance-none font-medium">
                <option>Myself</option>
                <option>Family Member</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Delivery Address <span className="text-red-500">*</span></label>
              <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center cursor-pointer">
                <span className="text-slate-700 line-clamp-1">Apt 4B, Skyline Apartments...</span>
                <span className="text-blue-600 font-bold ml-2">Change</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Sticky Bottom Confirm */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 p-4">
        <div className="max-w-3xl mx-auto">
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors shadow-sm text-base">
            Continue to Verification
          </button>
        </div>
      </div>
    </div>
  );
}
