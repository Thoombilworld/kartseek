'use client';
import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock, CheckCircle, AlertCircle, FileText, Car, Phone, Mail, Shield, XCircle,
} from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { CountryFlag } from '@/components/shared/country-flag';

// ─── Country document configs ────────────────────────────────────────────────
const COUNTRIES: Record<string, { name: string; flag: string; docs: string[] }> = {
  IN: { name: 'India', flag: '🇮🇳', docs: ['RTO Operator Permit', 'Business Registration Certificate', 'GST Registration Certificate', 'Fleet Insurance Certificate', 'Municipal Trade License', 'Police Clearance Certificate'] },
  AE: { name: 'UAE', flag: '🇦🇪', docs: ['RTA Fleet Operator Permit', 'Trade License', 'TRN Certificate', 'Emirates ID (Owner)', 'Fleet Insurance Policy', 'MOHRE Labor Card'] },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦', docs: ['TGA Transport License', 'Commercial Registration (CR)', 'VAT Certificate', 'National ID / Iqama', 'Fleet Insurance', 'Municipality License'] },
  GB: { name: 'United Kingdom', flag: '🇬🇧', docs: ['Private Hire Operator License', 'Companies House Certificate', 'VAT Registration', 'Public Liability Insurance', 'Fleet Insurance', 'DBS Check (Director)'] },
  NG: { name: 'Nigeria', flag: '🇳🇬', docs: ['CAC Business Registration', 'FRSC Fleet Registration', 'TIN Certificate', 'Vehicle Insurance (Fleet)', 'LASRRA ID (Lagos)', 'Police Clearance'] },
};

function buildReviewSteps(countryCode: string) {
  const docs = COUNTRIES[countryCode]?.docs || [];
  const steps: { label: string; status: 'done' | 'in_progress' | 'pending'; date: string }[] = [
    { label: 'Vendor Registration Submitted', status: 'done', date: 'Jun 17, 2026 at 3:12 PM' },
    { label: 'Fleet Business Details Verified', status: 'done', date: 'Jun 17, 2026 at 3:12 PM' },
  ];
  if (docs.length > 0) steps.push({ label: `${docs[0]} Verification`, status: 'done', date: 'Jun 18, 2026 at 10:45 AM' });
  if (docs.length > 1) steps.push({ label: `${docs[1]} Review`, status: 'in_progress', date: 'In progress' });
  steps.push({ label: 'Bank Account Verification', status: 'pending', date: 'Pending' });
  steps.push({ label: 'Final Super Admin Approval', status: 'pending', date: 'Pending' });
  return steps;
}

function buildDocStatuses(countryCode: string) {
  const docs = COUNTRIES[countryCode]?.docs || [];
  return docs.map((doc, i) => ({
    name: doc,
    status: i < 2 ? 'verified' : i < docs.length - 2 ? 'under_review' : 'pending',
    file: i < docs.length - 1 ? doc.toLowerCase().replace(/[\s\/()]/g, '_').replace(/_+/g, '_') + '.pdf' : '',
  }));
}

const DOC_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  verified: { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  under_review: { bg: 'bg-amber-50 text-amber-700', icon: Clock },
  pending: { bg: 'bg-slate-100 text-slate-500', icon: AlertCircle },
  rejected: { bg: 'bg-red-50 text-red-700', icon: XCircle },
};

export default function VendorApprovalStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><KartseekLoader size="lg" message="Loading..." /></div>}>
      <ApprovalContent />
    </Suspense>
  );
}

function ApprovalContent() {
  const searchParams = useSearchParams();
  const countryCode = searchParams.get('country') || 'IN';
  const country = COUNTRIES[countryCode] || COUNTRIES.IN;
  const vendorId = `VND-${Math.floor(1000 + Math.random() * 9000)}`;

  const steps = buildReviewSteps(countryCode);
  const documents = buildDocStatuses(countryCode);

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50/50 via-slate-50 to-yellow-50/50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <div><p className="font-black text-slate-900">KARTSEEK Vendor Center</p><p className="text-xs text-slate-400">Application Status</p></div>
        </div>
        <Link href="/seller/taxi/login" className="text-sm text-amber-600 font-bold hover:underline">Sign Out</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-amber-900">Application Under Review</h1>
            <p className="text-sm text-amber-700 mt-1">
              Your taxi vendor application is being reviewed by the KARTSEEK Super Admin team. You&apos;ll be notified via email and SMS once a decision is made.
            </p>
            <p className="text-xs text-amber-600 mt-2">Submitted: Jun 17, 2026 · Estimated: 1–3 business days · ID: {vendorId}</p>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900">QuickRide Fleet</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">🚕 Taxi Vendor</span>
            </div>
            <p className="text-xs text-slate-400">{vendorId} · <CountryFlag code={countryCode} size="sm" /> {country.name}</p>
          </div>
        </div>

        {/* Review Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" />Review Progress</h2>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${s.status === 'done' ? 'bg-emerald-500' : s.status === 'in_progress' ? 'bg-amber-400 animate-pulse' : 'bg-slate-200'}`}>
                    {s.status === 'done' ? <CheckCircle className="w-4 h-4 text-white" /> : s.status === 'in_progress' ? <Clock className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                  </div>
                  {i < steps.length - 1 && <div className={`w-0.5 h-10 ${s.status === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                </div>
                <div className="pb-8">
                  <p className={`text-sm font-bold ${s.status === 'done' ? 'text-slate-900' : s.status === 'in_progress' ? 'text-amber-800' : 'text-slate-400'}`}>{s.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" />Document Verification Status — <CountryFlag code={countryCode} size="sm" /> {country.name}</h2>
          <div className="space-y-3">
            {documents.map(doc => {
              const style = DOC_STYLES[doc.status];
              const DocIcon = style.icon;
              return (
                <div key={doc.name} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                      {doc.file && <p className="text-xs text-slate-400">{doc.file}</p>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${style.bg}`}>
                    <DocIcon className="w-3 h-3" />{doc.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* What You Can Do */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">What happens after approval?</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Access your Vendor Dashboard to manage your fleet</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Add drivers with country-specific document uploads</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Each driver requires separate Super Admin approval before going active</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Track earnings, payouts, trip history, and fleet analytics</li>
          </ul>
        </div>

        {/* Support */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-slate-900">Need help with your application?</p>
            <p className="text-xs text-slate-400 mt-0.5">Contact vendor support for application status inquiries</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold" id="vendor-support-email"><Mail className="w-3.5 h-3.5" />Email</button>
            <button className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold" id="vendor-support-call"><Phone className="w-3.5 h-3.5" />Call</button>
          </div>
        </div>
      </div>
    </div>
  );
}
