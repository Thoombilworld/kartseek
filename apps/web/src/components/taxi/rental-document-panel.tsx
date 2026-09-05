'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText, Download, Printer, Shield, CheckCircle, Clock,
  ChevronDown, ChevronUp, Eye, Mail, AlertTriangle, Globe,
} from 'lucide-react';
import type { CountryRentalConfig } from '@/lib/config/rental-policies';

// ── Document Types ───────────────────────────────────────────────────────────

interface RentalDocument {
  id: string;
  title: string;
  description: string;
  required: boolean;
  status: 'draft' | 'generated' | 'signed' | 'sent';
  category: 'agreement' | 'inspection' | 'invoice' | 'compliance';
}

// ── Country-Specific Document Templates ──────────────────────────────────────

function getDocumentsForCountry(countryConfig: CountryRentalConfig, mode: 'chauffeur' | 'self_drive'): RentalDocument[] {
  const base: RentalDocument[] = [
    { id: 'rental_agreement', title: `${countryConfig.countryName} Rental Agreement`, description: `Legal rental contract compliant with ${countryConfig.countryName} regulations. Includes liability terms, insurance coverage, and dispute resolution.`, required: true, status: 'draft', category: 'agreement' },
    { id: 'vehicle_condition_report', title: 'Vehicle Condition Report', description: 'Pre-and-post rental condition assessment with photos. Documents all pre-existing and new damages.', required: true, status: 'draft', category: 'inspection' },
    { id: 'pricing_agreement', title: 'Pricing & Payment Confirmation', description: `Itemized breakdown: base rate, extras, ${countryConfig.pricing.taxLabel} (${(countryConfig.pricing.taxRate * 100).toFixed(0)}%), deposits, and payment method confirmation.`, required: true, status: 'draft', category: 'invoice' },
    { id: 'insurance_certificate', title: 'Insurance Certificate', description: `${countryConfig.selfDrive.insuranceMandatory ? 'MANDATORY' : 'Optional'} comprehensive coverage. Policy number, excess amount, covered items, and exclusions.`, required: countryConfig.selfDrive.insuranceMandatory, status: 'draft', category: 'compliance' },
    { id: 'cancellation_terms', title: 'Cancellation & Refund Terms', description: `Free cancellation window: ${countryConfig.rentalCancellation.freeCancellationHours}h. Partial refund: ${countryConfig.rentalCancellation.partialRefundPercent}%. Processing: ${countryConfig.rentalCancellation.processingDays} business days.`, required: true, status: 'draft', category: 'agreement' },
    { id: 'data_privacy', title: 'Data Privacy Consent', description: `${countryConfig.countryName}-specific data protection compliance (GDPR/PDPA/DPA). GPS tracking disclosure and consent.`, required: true, status: 'draft', category: 'compliance' },
  ];

  if (mode === 'self_drive') {
    base.push(
      { id: 'license_verification', title: 'Driver\'s License Verification', description: `Minimum ${countryConfig.selfDrive.minimumLicenseYears} years holding period. Age requirement: ${countryConfig.selfDrive.minimumAge}+. International permits for foreigners.`, required: true, status: 'draft', category: 'compliance' },
      { id: 'deposit_receipt', title: 'Security Deposit Receipt', description: `${countryConfig.pricing.currencySymbol}${countryConfig.selfDrive.securityDepositAmount.toLocaleString()} held. Conditions for deduction: damage, fuel difference, late return, fines.`, required: true, status: 'draft', category: 'invoice' },
      { id: 'fuel_policy_doc', title: 'Fuel Policy Agreement', description: `Policy: ${countryConfig.selfDrive.fuelPolicy.replace(/_/g, ' ')}. Fuel level at handover vs. required return level. Surcharge rates for shortfall.`, required: true, status: 'draft', category: 'agreement' },
      { id: 'road_assistance', title: 'Roadside Assistance Card', description: '24/7 emergency contact numbers, breakdown procedure, accident reporting instructions, and nearest service centers.', required: false, status: 'draft', category: 'compliance' },
    );
  } else {
    base.push(
      { id: 'driver_details', title: 'Assigned Driver Details', description: 'Driver name, license number, contact, vehicle assigned. Emergency contact for passenger.', required: true, status: 'draft', category: 'compliance' },
      { id: 'chauffeur_terms', title: 'Chauffeur Service Terms', description: `Overtime rate: ${countryConfig.chauffeur.overtimeRateMultiplier}x. Max wait: ${countryConfig.chauffeur.maxWaitMinutes} min. Route changes and detour charges.`, required: true, status: 'draft', category: 'agreement' },
    );
  }

  // Country-specific additions
  const notes = countryConfig.complianceNotes;
  notes.forEach((note, i) => {
    if (note.toLowerCase().includes('vat') || note.toLowerCase().includes('gst') || note.toLowerCase().includes('tax')) {
      base.push({ id: `tax_compliance_${i}`, title: `${countryConfig.pricing.taxLabel} Compliance Document`, description: note, required: true, status: 'draft', category: 'compliance' });
    }
  });

  return base;
}

// ── Rental Agreement Preview ─────────────────────────────────────────────────

function AgreementPreview({ config, mode, bookingId }: { config: CountryRentalConfig; mode: 'chauffeur' | 'self_drive'; bookingId: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 max-h-[400px] overflow-y-auto text-xs text-slate-700 space-y-3">
      <div className="text-center border-b border-slate-200 pb-3">
        <p className="text-lg font-black text-slate-900">KARTSEEK RIDES</p>
        <p className="text-[10px] text-slate-400">Vehicle Rental Agreement</p>
        <p className="text-[10px] font-bold text-blue-600">{config.flag} {config.countryName} · Booking {bookingId}</p>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">1. PARTIES</p>
        <p>This Rental Agreement ("Agreement") is entered between Kartseek Rides (the "Company") and the Customer (the "Renter") identified below, for the rental of the vehicle described herein.</p>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">2. VEHICLE & RENTAL PERIOD</p>
        <p>Vehicle details, rental start/end dates, pickup/return locations, and any agreed extensions shall be as specified in the Booking Confirmation (Ref: {bookingId}).</p>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">3. RENTAL MODE: {mode === 'chauffeur' ? 'CHAUFFEUR-DRIVEN' : 'SELF-DRIVE'}</p>
        {mode === 'self_drive' ? (
          <ul className="space-y-0.5 pl-3">
            <li>• Renter must be at least <b>{config.selfDrive.minimumAge} years</b> old</li>
            <li>• Valid driving license held for minimum <b>{config.selfDrive.minimumLicenseYears} years</b></li>
            <li>• Required documents: {config.selfDrive.requiredDocuments.map(d => d.replace(/_/g, ' ')).join(', ')}</li>
            <li>• Fuel policy: <b>{config.selfDrive.fuelPolicy.replace(/_/g, ' ')}</b></li>
            <li>• Maximum rental period: <b>{config.selfDrive.maxRentalDays} days</b> (extensions subject to availability)</li>
            {config.selfDrive.insuranceMandatory && <li>• <b className="text-red-600">Comprehensive insurance is MANDATORY</b></li>}
          </ul>
        ) : (
          <ul className="space-y-0.5 pl-3">
            <li>• Professional driver assigned by Company</li>
            <li>• Maximum waiting time: <b>{config.chauffeur.maxWaitMinutes} minutes</b></li>
            <li>• Overtime rate: <b>{config.chauffeur.overtimeRateMultiplier}x</b> standard rate</li>
          </ul>
        )}
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">4. PRICING & PAYMENT</p>
        <ul className="space-y-0.5 pl-3">
          <li>• All prices are in <b>{config.pricing.currencyCode} ({config.pricing.currencySymbol})</b></li>
          <li>• {config.pricing.taxLabel} at <b>{(config.pricing.taxRate * 100).toFixed(1)}%</b> applies to all charges</li>
          <li>• Extra km rate: <b>{config.pricing.currencySymbol}{config.pricing.extraKmRate}/km</b> beyond package limit</li>
          <li>• Overtime: <b>{config.pricing.currencySymbol}{config.pricing.overtimeHourlyRate}/hour</b></li>
          {mode === 'self_drive' && <li>• Security deposit: <b>{config.pricing.currencySymbol}{config.selfDrive.securityDepositAmount.toLocaleString()}</b></li>}
        </ul>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">5. CANCELLATION POLICY</p>
        <ul className="space-y-0.5 pl-3">
          <li>• Free cancellation: up to <b>{config.rentalCancellation.freeCancellationHours} hours</b> before pickup</li>
          <li>• Partial refund ({config.rentalCancellation.partialRefundPercent}%): within <b>{config.rentalCancellation.partialRefundWindowHours} hours</b></li>
          <li>• No-show fee: <b>{config.rentalCancellation.noShowFeePercent}%</b> of total fare</li>
          <li>• Late return fee: <b>{config.pricing.currencySymbol}{config.rentalCancellation.lateReturnFeePerHour}/hour</b></li>
          <li>• Refund processing: <b>{config.rentalCancellation.processingDays} business days</b></li>
        </ul>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">6. INSURANCE & LIABILITY</p>
        <p>The vehicle is covered under comprehensive insurance as per {config.countryName} motor vehicle regulations. The Renter is responsible for any damage not covered by insurance, including but not limited to: intentional damage, driving under influence, unauthorized drivers, and off-road use.</p>
      </div>

      <div>
        <p className="font-bold text-slate-900 mb-1">7. COUNTRY-SPECIFIC REGULATIONS</p>
        <ul className="space-y-0.5 pl-3">
          {config.complianceNotes.map((note, i) => <li key={i}>• {note}</li>)}
        </ul>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <p className="font-bold text-slate-900 mb-1">8. SIGNATURES</p>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border-t-2 border-slate-300 pt-2">
            <p className="text-[10px] text-slate-400">Renter Signature & Date</p>
          </div>
          <div className="border-t-2 border-slate-300 pt-2">
            <p className="text-[10px] text-slate-400">Company Representative & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface RentalDocumentPanelProps {
  countryConfig: CountryRentalConfig;
  bookingId: string;
  mode: 'chauffeur' | 'self_drive';
  portal: 'admin' | 'vendor';
}

export function RentalDocumentPanel({ countryConfig, bookingId, mode, portal }: RentalDocumentPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [docs, setDocs] = useState<RentalDocument[]>(() => getDocumentsForCountry(countryConfig, mode));
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const generatedCount = docs.filter(d => d.status !== 'draft').length;
  const requiredDocs = docs.filter(d => d.required);
  const allRequiredDone = requiredDocs.every(d => d.status !== 'draft');

  const CATEGORY_LABELS: Record<string, { label: string; bg: string }> = {
    agreement: { label: '📜 Agreement', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    inspection: { label: '🔍 Inspection', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    invoice: { label: '💰 Invoice', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    compliance: { label: '🛡️ Compliance', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  };

  const STATUS_LABELS: Record<string, { label: string; bg: string; icon: React.ElementType }> = {
    draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-500', icon: FileText },
    generated: { label: 'Generated', bg: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    signed: { label: 'Signed', bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    sent: { label: 'Sent', bg: 'bg-violet-100 text-violet-700', icon: Mail },
  };

  const generateDoc = (docId: string) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'generated' as const } : d));
    showToast(`📄 Document generated`);
  };

  const signDoc = (docId: string) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'signed' as const } : d));
    showToast(`✅ Document signed`);
  };

  const sendDoc = (docId: string) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'sent' as const } : d));
    showToast(`📧 Document sent to customer`);
  };

  const generateAll = () => {
    setDocs(prev => prev.map(d => d.status === 'draft' ? { ...d, status: 'generated' as const } : d));
    showToast(`📄 All documents generated`);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium">{toast}</div>}

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-bold text-slate-700">📋 Paperwork & Documentation</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allRequiredDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {generatedCount}/{docs.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-violet-600 font-bold">{countryConfig.flag} {countryConfig.countryName}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={generateAll} className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"><FileText className="w-3 h-3" /> Generate All</button>
            <button onClick={() => showToast('📧 All documents emailed to customer')} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"><Mail className="w-3 h-3" /> Email All</button>
            <button onClick={() => showToast('🖨️ Print queue prepared')} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"><Printer className="w-3 h-3" /> Print Set</button>
            <button onClick={() => showToast('📥 ZIP downloaded')} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"><Download className="w-3 h-3" /> Download ZIP</button>
          </div>

          {/* Country-specific compliance banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[10px] text-blue-700">
            <span className="font-bold flex items-center gap-1"><Globe className="w-3 h-3" /> {countryConfig.flag} {countryConfig.countryName} Regulatory Requirements</span>
            <ul className="mt-1 space-y-0.5">
              {countryConfig.complianceNotes.map((note, i) => <li key={i}>• {note}</li>)}
            </ul>
          </div>

          {/* Document list by category */}
          {(['agreement', 'inspection', 'invoice', 'compliance'] as const).map(cat => {
            const catDocs = docs.filter(d => d.category === cat);
            if (catDocs.length === 0) return null;
            const catStyle = CATEGORY_LABELS[cat];
            return (
              <div key={cat}>
                <p className={`text-[10px] font-bold mb-1.5 ${catStyle.bg.split(' ')[1]}`}>{catStyle.label}</p>
                <div className="space-y-1.5">
                  {catDocs.map(doc => {
                    const st = STATUS_LABELS[doc.status];
                    const StIcon = st.icon;
                    return (
                      <div key={doc.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${doc.required ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                        <StIcon className={`w-4 h-4 shrink-0 ${doc.status === 'signed' || doc.status === 'sent' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700">{doc.title}{doc.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.description}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {doc.status === 'draft' && <button onClick={() => generateDoc(doc.id)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Generate</button>}
                          {doc.status === 'generated' && (
                            <>
                              {doc.id === 'rental_agreement' && <button onClick={() => setPreviewDoc(previewDoc === doc.id ? null : doc.id)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded" title="Preview document"><Eye className="w-3 h-3 inline" /></button>}
                              <button onClick={() => signDoc(doc.id)} className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded">Sign</button>
                            </>
                          )}
                          {doc.status === 'signed' && <button onClick={() => sendDoc(doc.id)} className="text-[10px] font-bold text-violet-600 hover:bg-violet-50 px-2 py-1 rounded"><Mail className="w-3 h-3 inline" /> Send</button>}
                          {doc.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Agreement preview */}
          {previewDoc === 'rental_agreement' && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-700">📄 Rental Agreement Preview</p>
                <button onClick={() => setPreviewDoc(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Close ✕</button>
              </div>
              <AgreementPreview config={countryConfig} mode={mode} bookingId={bookingId} />
            </div>
          )}

          {/* Completion status */}
          {allRequiredDone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-emerald-700">All required paperwork complete ✅</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              <span className="font-bold">{requiredDocs.filter(d => d.status === 'draft').length} required document(s)</span> still need to be generated.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
