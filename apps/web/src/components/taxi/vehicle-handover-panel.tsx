'use client';

import React, { useState, useCallback } from 'react';
import {
  Fuel, Key, Camera, Gauge, CheckCircle, AlertTriangle, Clock,
  ClipboardCheck, Car, Shield, FileText, XCircle, ChevronDown,
  ChevronUp, ArrowRight, Wrench, Eye, Upload, Battery,
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';

// ── Types ────────────────────────────────────────────────────────────────────

type HandoverStep = 'pre_inspection' | 'documents' | 'fuel_mileage' | 'damage_check' | 'sign_off';
type ProcessMode = 'handover' | 'return';

interface CheckItem {
  id: string;
  label: string;
  icon: React.ElementType;
  checked: boolean;
  note?: string;
  severity?: 'ok' | 'warning' | 'critical';
}

interface DamageRecord {
  id: string;
  location: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  notes: string;
  photoUploaded: boolean;
}

// ── Inspection Checklists ────────────────────────────────────────────────────

const PRE_HANDOVER_CHECKS: CheckItem[] = [
  { id: 'exterior_clean', label: 'Exterior cleaned & washed', icon: Car, checked: false },
  { id: 'interior_clean', label: 'Interior cleaned & vacuumed', icon: Car, checked: false },
  { id: 'tire_pressure', label: 'Tire pressure checked (all 4 + spare)', icon: Gauge, checked: false },
  { id: 'fluid_levels', label: 'Oil, coolant, brake fluid topped', icon: Fuel, checked: false },
  { id: 'battery', label: 'Battery charge verified', icon: Battery, checked: false },
  { id: 'lights_signals', label: 'All lights & signals working', icon: Eye, checked: false },
  { id: 'ac_working', label: 'A/C & heating functional', icon: Wrench, checked: false },
  { id: 'wipers_fluid', label: 'Wipers & washer fluid OK', icon: Wrench, checked: false },
  { id: 'spare_tire_jack', label: 'Spare tire & jack present', icon: Wrench, checked: false },
  { id: 'first_aid', label: 'First-aid kit & fire extinguisher', icon: Shield, checked: false },
  { id: 'tool_kit', label: 'Tool kit & warning triangle', icon: Wrench, checked: false },
  { id: 'gps_tracker', label: 'GPS tracker active', icon: Gauge, checked: false },
];

const RETURN_CHECKS: CheckItem[] = [
  { id: 'exterior_damage', label: 'Check exterior for new damage', icon: Eye, checked: false, severity: 'ok' },
  { id: 'interior_condition', label: 'Inspect interior condition', icon: Eye, checked: false, severity: 'ok' },
  { id: 'belongings_check', label: 'Customer belongings removed', icon: ClipboardCheck, checked: false },
  { id: 'fuel_level_return', label: 'Fuel level recorded', icon: Fuel, checked: false },
  { id: 'odometer_return', label: 'Odometer reading recorded', icon: Gauge, checked: false },
  { id: 'key_count', label: 'All keys & fobs returned', icon: Key, checked: false },
  { id: 'accessories_return', label: 'All accessories returned (GPS, child seat, etc.)', icon: Wrench, checked: false },
  { id: 'parking_fines_check', label: 'Check for outstanding parking fines', icon: AlertTriangle, checked: false },
  { id: 'toll_charges', label: 'Check for toll charges', icon: FileText, checked: false },
];

const DAMAGE_LOCATIONS = [
  'Front bumper', 'Rear bumper', 'Left front fender', 'Right front fender',
  'Left rear fender', 'Right rear fender', 'Hood', 'Trunk', 'Roof',
  'Left front door', 'Left rear door', 'Right front door', 'Right rear door',
  'Windshield', 'Rear window', 'Left mirror', 'Right mirror',
  'Front left wheel', 'Front right wheel', 'Rear left wheel', 'Rear right wheel',
  'Interior – dashboard', 'Interior – seats', 'Interior – carpet',
];

const DAMAGE_TYPES = ['Scratch', 'Dent', 'Crack', 'Chip', 'Stain', 'Tear', 'Missing part', 'Malfunction'];

// ── Troubleshooting Guide ────────────────────────────────────────────────────

const TROUBLESHOOTING = [
  { issue: 'Customer disputes pre-existing damage', steps: ['Review handover photos', 'Compare with pre-inspection report', 'Check GPS tracker for accident events', 'Escalate to manager if unresolved'] },
  { issue: 'Vehicle won\'t start at pickup', steps: ['Check battery with jump starter', 'Verify fuel level', 'Call breakdown assistance', 'Offer replacement vehicle if available'] },
  { issue: 'Customer returns late', steps: ['Apply late return fee per policy', 'Send automated SMS reminder 1h before due', 'Contact customer if 30min+ overdue', 'Report to admin if 2h+ overdue'] },
  { issue: 'Fuel level dispute', steps: ['Show fuel photo from handover', 'Calculate difference using GPS distance', 'Apply fuel surcharge per policy', 'Issue itemized receipt'] },
  { issue: 'Key not returned / lost', steps: ['Charge key replacement fee', 'Deduct from security deposit', 'Disable vehicle remotely via GPS', 'File police report if vehicle not returned'] },
  { issue: 'Customer demands refund on return', steps: ['Review cancellation policy for the region', 'Check if within free cancellation window', 'Process partial refund if eligible', 'Escalate to admin for full refund requests'] },
];

// ── Step Components ──────────────────────────────────────────────────────────

function StepIndicator({ steps, current, completed }: { steps: { key: HandoverStep; label: string }[]; current: HandoverStep; completed: Set<string> }) {
  return (
    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const isCurrent = s.key === current;
        const isDone = completed.has(s.key);
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {isDone ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <ArrowRight className={`w-3 h-3 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-300'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface VehicleHandoverPanelProps {
  bookingId: string;
  vehicleName: string;
  plate: string | null;
  mode: ProcessMode;
  rentalMode: 'chauffeur' | 'self_drive';
  fuelPolicy: string;
  onComplete?: (data: { mileage: number; fuelLevel: number; damages: DamageRecord[]; signedOff: boolean }) => void;
}

export function VehicleHandoverPanel({
  bookingId, vehicleName, plate, mode, rentalMode, fuelPolicy, onComplete,
}: VehicleHandoverPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<HandoverStep>('pre_inspection');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [checks, setChecks] = useState<CheckItem[]>(mode === 'handover' ? PRE_HANDOVER_CHECKS : RETURN_CHECKS);
  const [fuelLevel, setFuelLevel] = useState(mode === 'handover' ? 100 : 75);
  const [mileageStart, setMileageStart] = useState(mode === 'handover' ? 45230 : 45230);
  const [mileageEnd, setMileageEnd] = useState(mode === 'return' ? 45890 : 0);
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [newDamage, setNewDamage] = useState<Partial<DamageRecord>>({});
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customerSignature, setCustomerSignature] = useState(false);
  const [vendorSignature, setVendorSignature] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const STEPS: { key: HandoverStep; label: string }[] = mode === 'handover'
    ? [{ key: 'pre_inspection', label: 'Pre-Inspection' }, { key: 'documents', label: 'Documents' }, { key: 'fuel_mileage', label: 'Fuel & Mileage' }, { key: 'damage_check', label: 'Damage Log' }, { key: 'sign_off', label: 'Sign Off' }]
    : [{ key: 'pre_inspection', label: 'Return Check' }, { key: 'fuel_mileage', label: 'Fuel & Mileage' }, { key: 'damage_check', label: 'Damage Assessment' }, { key: 'documents', label: 'Final Invoice' }, { key: 'sign_off', label: 'Close Out' }];

  const toggleCheck = (id: string) => setChecks(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  const allChecked = checks.every(c => c.checked);

  const nextStep = () => {
    const stepOrder = STEPS.map(s => s.key);
    const idx = stepOrder.indexOf(step);
    setCompletedSteps(prev => new Set([...prev, step]));
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1]);
  };

  const addDamage = () => {
    if (newDamage.location && newDamage.type) {
      setDamages(prev => [...prev, {
        id: `DMG-${Date.now()}`,
        location: newDamage.location!,
        type: newDamage.type!,
        severity: (newDamage.severity as DamageRecord['severity']) || 'minor',
        notes: newDamage.notes || '',
        photoUploaded: false,
      }]);
      setNewDamage({});
    }
  };

  const handleSignOff = () => {
    setCompletedSteps(prev => new Set([...prev, 'sign_off']));
    onComplete?.({ mileage: mode === 'handover' ? mileageStart : mileageEnd, fuelLevel, damages, signedOff: true });
    showToast(`✅ ${mode === 'handover' ? 'Vehicle handover' : 'Vehicle return'} completed for ${bookingId}`);
  };

  const checkedCount = checks.filter(c => c.checked).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-top">{toast}</div>}

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${mode === 'handover' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-amber-50 hover:bg-amber-100'}`}>
        <div className="flex items-center gap-3">
          {mode === 'handover' ? <Key className="w-4 h-4 text-blue-600" /> : <ClipboardCheck className="w-4 h-4 text-amber-600" />}
          <span className="text-sm font-bold text-slate-700">
            {mode === 'handover' ? '🔑 Vehicle Handover Process' : '🔙 Vehicle Return Process'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completedSteps.has('sign_off') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
            {completedSteps.has('sign_off') ? '✅ Complete' : `Step ${STEPS.findIndex(s => s.key === step) + 1}/${STEPS.length}`}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Vehicle info */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-4">
            <Car className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm font-bold text-slate-800">{vehicleName}</p>
              <p className="text-[10px] text-slate-500">Plate: {plate || 'To be assigned'} · Booking: {bookingId} · Mode: {rentalMode === 'chauffeur' ? '👨‍✈️ Chauffeur' : '🔑 Self-Drive'}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-slate-400">Fuel Policy</p>
              <p className="text-xs font-bold text-slate-700">{fuelPolicy.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator steps={STEPS} current={step} completed={completedSteps} />

          {/* ─── STEP: Pre-Inspection / Return Check ─── */}
          {step === 'pre_inspection' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">{mode === 'handover' ? '🔍 Pre-Handover Inspection' : '🔍 Return Condition Check'}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {checkedCount}/{checks.length} items
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {checks.map(c => (
                  <button key={c.id} onClick={() => toggleCheck(c.id)} className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${c.checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 ${c.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {c.checked && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <c.icon className={`w-3.5 h-3.5 shrink-0 ${c.checked ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-[11px] font-medium ${c.checked ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={nextStep} disabled={!allChecked} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${allChecked ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  Continue <ArrowRight className="w-3 h-3" />
                </button>
                {!allChecked && <p className="text-[10px] text-amber-600">Complete all checks to continue</p>}
              </div>
            </div>
          )}

          {/* ─── STEP: Documents ─── */}
          {step === 'documents' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700">{mode === 'handover' ? '📄 Document Verification & Agreement' : '📄 Final Invoice & Settlement'}</h3>
              {mode === 'handover' ? (
                <div className="space-y-2">
                  {[
                    { label: 'Rental Agreement signed', desc: 'Country-specific terms, liability waiver, insurance coverage' },
                    { label: 'Driver\'s License verified', desc: 'Checked validity, expiry, endorsements' },
                    { label: 'Identity document verified', desc: 'National ID / Passport / Emirates ID' },
                    { label: 'Insurance certificate issued', desc: 'Coverage type, policy number, excess amount' },
                    { label: 'Security deposit collected', desc: 'Pre-authorization on card or cash deposit' },
                    { label: 'Emergency contacts recorded', desc: 'At least 2 contacts with phone numbers' },
                    { label: 'Vehicle condition report signed', desc: 'Both parties confirm pre-existing damage record' },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" title="Mark checklist item complete" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{doc.label}</p>
                        <p className="text-[10px] text-slate-400">{doc.desc}</p>
                      </div>
                      <button onClick={() => showToast(`📎 ${doc.label} — uploaded`)} className="text-[10px] text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded"><Upload className="w-3 h-3 inline" /> Upload</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-3">📊 Rental Settlement</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Base rental</span><span className="font-bold">Included</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Distance: {mileageEnd - mileageStart} km</span><span className="font-bold">{mileageEnd - mileageStart > 500 ? '⚠️ Extra KM charges apply' : '✅ Within limit'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Fuel difference</span><span className={`font-bold ${fuelLevel < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{fuelLevel}% → {fuelLevel < 80 ? 'Fuel surcharge applies' : 'OK'}</span></div>
                      {damages.length > 0 && <div className="flex justify-between text-red-600"><span>Damage charges ({damages.length} items)</span><span className="font-bold">Deducted from deposit</span></div>}
                      <div className="flex justify-between"><span className="text-slate-500">Parking/toll fines</span><span className="font-bold text-slate-700">Check pending</span></div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-800">Security deposit</span><span className={`font-bold ${damages.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{damages.length > 0 ? '⚠️ Partial release' : '✅ Full release'}</span></div>
                    </div>
                  </div>
                  {[
                    { label: 'Final invoice generated', desc: 'Itemized breakdown of all charges' },
                    { label: 'Damage report filed', desc: damages.length > 0 ? `${damages.length} damage(s) documented` : 'No new damage recorded' },
                    { label: 'Deposit settlement processed', desc: 'Release or partial deduction applied' },
                    { label: 'Return receipt issued', desc: 'SMS/email sent to customer' },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" title="Mark return checklist item complete" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{doc.label}</p>
                        <p className="text-[10px] text-slate-400">{doc.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={nextStep} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Continue <ArrowRight className="w-3 h-3" /></button>
            </div>
          )}

          {/* ─── STEP: Fuel & Mileage ─── */}
          {step === 'fuel_mileage' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700">⛽ Fuel Level & Odometer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fuel Gauge */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 mb-2">Fuel Level (%)</p>
                  <input title="Fuel Level" type="range" min="0" max="100" value={fuelLevel} onChange={e => setFuelLevel(+e.target.value)} className="w-full accent-blue-600 mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[0, 25, 50, 75, 100].map(v => (
                        <button key={v} onClick={() => setFuelLevel(v)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${fuelLevel === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{v}%</button>
                      ))}
                    </div>
                    <span className={`text-lg font-black ${fuelLevel > 50 ? 'text-emerald-600' : fuelLevel > 25 ? 'text-amber-600' : 'text-red-600'}`}>{fuelLevel}%</span>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <ProgressBar value={fuelLevel} className={`h-full rounded-full transition-all ${fuelLevel > 50 ? 'bg-emerald-500' : fuelLevel > 25 ? 'bg-amber-500' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Policy: <b>{fuelPolicy.replace(/_/g, ' ')}</b></p>
                </div>

                {/* Odometer */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 mb-2">Odometer Reading (km)</p>
                  {mode === 'handover' ? (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1" htmlFor="starting-mileage">Starting Mileage</label>
                      <input id="starting-mileage" title="Starting mileage" type="number" value={mileageStart} onChange={e => setMileageStart(+e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-center" />
                      <button onClick={() => showToast('📸 Odometer photo captured')} className="mt-2 w-full flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg"><Camera className="w-3 h-3" /> Capture Photo</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-400 block mb-1">At Handover</label>
                          <div className="px-3 py-2 rounded-lg bg-slate-50 text-sm font-bold text-center text-slate-500">{mileageStart.toLocaleString()}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 mt-3" />
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-400 block mb-1" htmlFor="at-return">At Return</label>
                          <input id="at-return" title="Return mileage" type="number" value={mileageEnd} onChange={e => setMileageEnd(+e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-center" />
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-blue-500">Distance Traveled</p>
                        <p className="text-lg font-black text-blue-700">{(mileageEnd - mileageStart).toLocaleString()} km</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={nextStep} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Continue <ArrowRight className="w-3 h-3" /></button>
            </div>
          )}

          {/* ─── STEP: Damage Check ─── */}
          {step === 'damage_check' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">{mode === 'handover' ? '📸 Pre-Existing Damage Log' : '🔍 Return Damage Assessment'}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${damages.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {damages.length === 0 ? '✅ No damage' : `⚠️ ${damages.length} item(s)`}
                </span>
              </div>

              {/* Add damage form */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-amber-700 mb-2">➕ Log New Damage / Pre-Existing Condition</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <select title="Location" value={newDamage.location || ''} onChange={e => setNewDamage(p => ({ ...p, location: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] bg-white">
                    <option value="">Location...</option>
                    {DAMAGE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select title="Type" value={newDamage.type || ''} onChange={e => setNewDamage(p => ({ ...p, type: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] bg-white">
                    <option value="">Type...</option>
                    {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select title="Severity" value={newDamage.severity || 'minor'} onChange={e => setNewDamage(p => ({ ...p, severity: e.target.value as DamageRecord['severity'] }))} className="px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] bg-white">
                    <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option>
                  </select>
                  <button onClick={addDamage} disabled={!newDamage.location || !newDamage.type} className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">+ Add</button>
                </div>
                <input title="Notes" placeholder="Additional notes..." value={newDamage.notes || ''} onChange={e => setNewDamage(p => ({ ...p, notes: e.target.value }))} className="mt-2 w-full px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] bg-white" />
              </div>

              {/* Damage list */}
              {damages.length > 0 && (
                <div className="space-y-1.5">
                  {damages.map(d => (
                    <div key={d.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${d.severity === 'major' ? 'bg-red-50 border-red-200' : d.severity === 'moderate' ? 'bg-amber-50 border-amber-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700">{d.location} — {d.type}</p>
                        <p className="text-[10px] text-slate-500">{d.notes || 'No notes'}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${d.severity === 'major' ? 'bg-red-100 text-red-700' : d.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.severity}</span>
                      <button onClick={() => showToast('📸 Photo uploaded')} className="text-[10px] text-blue-600 font-bold" title="Upload damage photo"><Camera className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDamages(prev => prev.filter(x => x.id !== d.id))} className="text-[10px] text-red-400" title="Remove damage entry"><XCircle className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {damages.length === 0 && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center text-xs text-emerald-700 font-bold">✅ No damage recorded — vehicle in good condition</div>}
              <button onClick={nextStep} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Continue <ArrowRight className="w-3 h-3" /></button>
            </div>
          )}

          {/* ─── STEP: Sign Off ─── */}
          {step === 'sign_off' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700">✍️ Sign Off & Completion</h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-bold">Summary</p>
                  <p>• Vehicle: {vehicleName} ({plate})</p>
                  <p>• {mode === 'handover' ? 'Starting' : 'Ending'} mileage: {mode === 'handover' ? mileageStart.toLocaleString() : mileageEnd.toLocaleString()} km</p>
                  {mode === 'return' && <p>• Distance traveled: {(mileageEnd - mileageStart).toLocaleString()} km</p>}
                  <p>• Fuel level: {fuelLevel}%</p>
                  <p>• Damages: {damages.length === 0 ? 'None' : `${damages.length} item(s) logged`}</p>
                  <p>• Inspection: {checkedCount}/{checks.length} items passed</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCustomerSignature(!customerSignature)} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-xs font-bold transition-all ${customerSignature ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {customerSignature ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    <div>
                      <p>{customerSignature ? '✅ Signed' : '👤 Customer Signature'}</p>
                      <p className="text-[9px] font-normal opacity-70">Tap to {customerSignature ? 'undo' : 'confirm'}</p>
                    </div>
                  </button>
                  <button onClick={() => setVendorSignature(!vendorSignature)} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-xs font-bold transition-all ${vendorSignature ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {vendorSignature ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    <div>
                      <p>{vendorSignature ? '✅ Signed' : '🏢 Vendor Signature'}</p>
                      <p className="text-[9px] font-normal opacity-70">Tap to {vendorSignature ? 'undo' : 'confirm'}</p>
                    </div>
                  </button>
                </div>
                <button onClick={handleSignOff} disabled={!customerSignature || !vendorSignature} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${customerSignature && vendorSignature ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  <CheckCircle className="w-5 h-5" />
                  {mode === 'handover' ? 'Complete Handover & Release Vehicle' : 'Complete Return & Close Booking'}
                </button>
              </div>
            </div>
          )}

          {/* ─── Troubleshooting Guide ─── */}
          <div className="border-t border-slate-200 pt-3">
            <button onClick={() => setShowTroubleshooting(!showTroubleshooting)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700">
              <Wrench className="w-3.5 h-3.5" />
              {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting Guide
              {showTroubleshooting ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showTroubleshooting && (
              <div className="mt-2 space-y-2">
                {TROUBLESHOOTING.map((t, i) => (
                  <details key={i} className="bg-white border border-slate-200 rounded-lg">
                    <summary className="px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">⚠️ {t.issue}</summary>
                    <ol className="px-3 pb-2 pl-6 list-decimal space-y-0.5">
                      {t.steps.map((s, j) => <li key={j} className="text-[10px] text-slate-600">{s}</li>)}
                    </ol>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
