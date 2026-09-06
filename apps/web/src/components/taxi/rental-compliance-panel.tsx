'use client';

import React, { useState, useCallback } from 'react';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Shield, Upload,
  ChevronDown, ChevronUp, FileText, Camera, CreditCard, User,
  Car, Scale,
} from 'lucide-react';
import type { ComplianceCheck, ComplianceStatus, CountryRentalConfig } from '@/lib/config/rental-policies';

// ── Icon Mapping ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  age: User, license: FileText, insurance: Shield, deposit: CreditCard,
  inspection: Car, driver: User, vehicle_check: Car, payment: CreditCard,
  terms: Scale, doc_driving_license: FileText, doc_national_id: FileText,
  doc_aadhaar_card: FileText, doc_passport: FileText,
  doc_international_driving_permit: FileText, doc_visa: FileText,
  doc_emirates_id: FileText, doc_uae_driving_license: FileText,
  doc_tourist_visa: FileText, doc_uk_driving_license: FileText,
  doc_proof_of_address: FileText, doc_us_drivers_license: FileText,
  doc_credit_card: CreditCard, doc_nric: FileText,
  doc_singapore_driving_license: FileText, doc_saudi_driving_license: FileText,
  doc_iqama: FileText, doc_cpr_card: FileText,
  doc_bahrain_driving_license: FileText, doc_qatar_driving_license: FileText,
  doc_qatar_id: FileText, doc_residence_permit: FileText,
  doc_kuwait_driving_license: FileText, doc_civil_id: FileText,
};

const STATUS_STYLES: Record<ComplianceStatus, { bg: string; icon: React.ElementType; label: string }> = {
  pending:      { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock,          label: 'Pending' },
  verified:     { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Verified' },
  failed:       { bg: 'bg-red-50 text-red-700 border-red-200',        icon: XCircle,        label: 'Failed' },
  expired:      { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle, label: 'Expired' },
  not_required: { bg: 'bg-slate-50 text-slate-500 border-slate-200',  icon: CheckCircle,    label: 'N/A' },
};

// ── Component ────────────────────────────────────────────────────────────────

interface RentalCompliancePanelProps {
  checks: ComplianceCheck[];
  countryConfig: CountryRentalConfig;
  bookingId: string;
  mode: 'admin' | 'vendor';
  onStatusChange?: (checkId: string, newStatus: ComplianceStatus) => void;
  defaultExpanded?: boolean;
}

export function RentalCompliancePanel({
  checks,
  countryConfig,
  bookingId,
  mode,
  onStatusChange,
  defaultExpanded = false,
}: RentalCompliancePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [localChecks, setLocalChecks] = useState<ComplianceCheck[]>(checks);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const verifiedCount = localChecks.filter(c => c.status === 'verified' || c.status === 'not_required').length;
  const totalRequired = localChecks.filter(c => c.required).length;
  const allVerified = localChecks.filter(c => c.required).every(c => c.status === 'verified');
  const progressPercent = totalRequired > 0 ? Math.round((verifiedCount / localChecks.length) * 100) : 100;

  const handleVerify = (checkId: string) => {
    setLocalChecks(prev => prev.map(c =>
      c.id === checkId ? { ...c, status: 'verified' as ComplianceStatus, verifiedAt: new Date().toISOString(), verifiedBy: mode === 'admin' ? 'Admin' : 'Vendor' } : c
    ));
    onStatusChange?.(checkId, 'verified');
    showToast(`✅ ${checkId.replace(/_/g, ' ')} verified`);
  };

  const handleFail = (checkId: string) => {
    setLocalChecks(prev => prev.map(c =>
      c.id === checkId ? { ...c, status: 'failed' as ComplianceStatus } : c
    ));
    onStatusChange?.(checkId, 'failed');
    showToast(`❌ ${checkId.replace(/_/g, ' ')} failed verification`);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium">{toast}</div>}

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-3">
          <Shield className={`w-4 h-4 ${allVerified ? 'text-emerald-600' : 'text-amber-500'}`} />
          <span className="text-sm font-bold text-slate-700">Compliance Checklist</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {verifiedCount}/{localChecks.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <ProgressBar value={progressPercent} className={`h-full rounded-full transition-all ${allVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-2">
          {/* Country info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[10px] text-blue-700 mb-3">
            <span className="font-bold">{countryConfig.flag} {countryConfig.countryName} Compliance Rules</span>
            <ul className="mt-1 space-y-0.5">
              {countryConfig.complianceNotes.slice(0, 2).map((note, i) => <li key={i}>• {note}</li>)}
            </ul>
          </div>

          {/* Checks */}
          {localChecks.map(check => {
            const status = STATUS_STYLES[check.status];
            const Icon = ICON_MAP[check.id] || FileText;
            const StatusIcon = status.icon;

            return (
              <div key={check.id} className={`flex items-center gap-3 p-3 rounded-lg border ${status.bg}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">{check.label}{check.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                  <p className="text-[10px] opacity-70">{check.description}</p>
                  {check.verifiedAt && <p className="text-[9px] opacity-50 mt-0.5">Verified {new Date(check.verifiedAt).toLocaleString()} by {check.verifiedBy}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {check.status === 'pending' && (
                    <>
                      <button onClick={() => handleVerify(check.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verify</button>
                      <button onClick={() => handleFail(check.id)} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-bold transition-colors" title="Fail check"><XCircle className="w-3 h-3" /></button>
                    </>
                  )}
                  {check.status !== 'pending' && <StatusIcon className="w-4 h-4" />}
                </div>
              </div>
            );
          })}

          {/* Summary */}
          {allVerified ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-emerald-700">All compliance checks passed ✅</p>
              <p className="text-[10px] text-emerald-600">Booking {bookingId} is cleared for operations</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              <span className="font-bold">{totalRequired - verifiedCount} required check{totalRequired - verifiedCount > 1 ? 's' : ''} remaining</span> — booking cannot proceed until all mandatory checks are verified.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
