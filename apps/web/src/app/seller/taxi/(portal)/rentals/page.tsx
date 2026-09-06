'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRegion } from '@/lib/contexts/region-context';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  Car, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle,
  Calendar, Key, Phone, User, UserCheck, Shield, Timer, Gauge,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { RentalCompliancePanel } from '@/components/taxi/rental-compliance-panel';
import { VehicleHandoverPanel } from '@/components/taxi/vehicle-handover-panel';
import { RentalDocumentPanel } from '@/components/taxi/rental-document-panel';
import { getCountryConfig, getRequiredComplianceChecks, formatCancellationPolicy } from '@/lib/config/rental-policies';
import { vendorTaxiApi } from '@/lib/api/vendor-taxi';

type RentalStatus = 'incoming' | 'accepted' | 'driver_assigned' | 'active' | 'returned' | 'declined';
type RentalMode = 'chauffeur' | 'self_drive';
type DurationType = 'hourly' | 'daily' | 'weekly';

interface VendorRental {
  id: string;
  customer: string;
  phone: string;
  vehicle: string;
  vehicleType: string;
  pickup: string;
  returnLoc: string;
  startDate: string;
  startTime: string;
  mode: RentalMode;
  durationType: DurationType;
  hours: number;
  days: number;
  kmIncluded: number;
  kmUsed: number;
  baseRate: number;
  chauffeurCharge: number;
  extrasCharge: number;
  total: number;
  extras: string[];
  status: RentalStatus;
  assignedPlate: string | null;
  driver: string | null;
  deposit: number;
}

const RENTALS: VendorRental[] = [
  { id: 'RNT-501', customer: 'Vikram Singh', phone: '+91 98765 43210', vehicle: 'Toyota Prado', vehicleType: 'SUV', pickup: 'Connaught Place, Delhi', returnLoc: 'Same', startDate: '2026-07-10', startTime: '09:00', mode: 'chauffeur', durationType: 'daily', hours: 0, days: 3, kmIncluded: 0, kmUsed: 0, baseRate: 22500, chauffeurCharge: 6000, extrasCharge: 0, total: 28500, extras: [], status: 'incoming', assignedPlate: null, driver: null, deposit: 0 },
  { id: 'RNT-502', customer: 'Sarah Johnson', phone: '+44 7700 900 456', vehicle: 'Mercedes C-Class', vehicleType: 'Premium', pickup: 'Heathrow T5', returnLoc: 'Same', startDate: '2026-07-11', startTime: '10:00', mode: 'chauffeur', durationType: 'hourly', hours: 8, days: 0, kmIncluded: 80, kmUsed: 0, baseRate: 24000, chauffeurCharge: 2500, extrasCharge: 0, total: 26500, extras: [], status: 'incoming', assignedPlate: null, driver: null, deposit: 0 },
  { id: 'RNT-503', customer: 'Suresh Nair', phone: '+91 722 345 678', vehicle: 'Toyota Fielder', vehicleType: 'Economy', pickup: 'Westlands', returnLoc: 'Same', startDate: '2026-07-09', startTime: '08:00', mode: 'self_drive', durationType: 'daily', hours: 0, days: 5, kmIncluded: 0, kmUsed: 0, baseRate: 17500, chauffeurCharge: 0, extrasCharge: 1500, total: 19000, extras: ['GPS', 'WiFi'], status: 'incoming', assignedPlate: null, driver: null, deposit: 5000 },
  { id: 'RNT-500', customer: 'Priya Patel', phone: '+91 711 888 999', vehicle: 'Toyota Fielder', vehicleType: 'Economy', pickup: 'JKIA', returnLoc: 'Same', startDate: '2026-07-08', startTime: '06:00', mode: 'chauffeur', durationType: 'hourly', hours: 12, days: 0, kmIncluded: 120, kmUsed: 95, baseRate: 9600, chauffeurCharge: 1500, extrasCharge: 0, total: 11100, extras: [], status: 'active', assignedPlate: 'KCA 111B', driver: 'Joseph M.', deposit: 0 },
  { id: 'RNT-496', customer: 'Omar Al-Falasi', phone: '+971 50 123 4567', vehicle: 'Toyota Prado', vehicleType: 'SUV', pickup: 'Dubai Mall Valet', returnLoc: 'DXB Airport T3', startDate: '2026-07-06', startTime: '07:00', mode: 'self_drive', durationType: 'daily', hours: 0, days: 7, kmIncluded: 0, kmUsed: 680, baseRate: 52500, chauffeurCharge: 0, extrasCharge: 3500, total: 56000, extras: ['GPS', 'Child Seat'], status: 'active', assignedPlate: 'D 12345', driver: null, deposit: 5000 },
  { id: 'RNT-494', customer: 'Mike Chen', phone: '+1 212 555 0199', vehicle: 'Toyota HiAce Van', vehicleType: 'Van', pickup: 'JFK Airport', returnLoc: 'Same', startDate: '2026-07-08', startTime: '11:00', mode: 'chauffeur', durationType: 'daily', hours: 0, days: 3, kmIncluded: 0, kmUsed: 0, baseRate: 27000, chauffeurCharge: 6000, extrasCharge: 800, total: 33800, extras: ['Premium Insurance'], status: 'driver_assigned', assignedPlate: 'NY-VAN-8812', driver: 'Carlos R.', deposit: 0 },
  { id: 'RNT-498', customer: 'Wei Lin Tan', phone: '+65 8123 4567', vehicle: 'Toyota HiAce Van', vehicleType: 'Van', pickup: 'Changi T1', returnLoc: 'Marina Bay', startDate: '2026-07-07', startTime: '14:00', mode: 'chauffeur', durationType: 'hourly', hours: 4, days: 0, kmIncluded: 40, kmUsed: 38, baseRate: 10000, chauffeurCharge: 2000, extrasCharge: 0, total: 12000, extras: [], status: 'returned', assignedPlate: 'SBA 1234A', driver: 'Kumar S.', deposit: 0 },
  { id: 'RNT-495', customer: 'Ali Hassan', phone: '+973 3312 3456', vehicle: 'Toyota Corolla', vehicleType: 'Comfort', pickup: 'Seef Mall', returnLoc: 'Same', startDate: '2026-07-07', startTime: '10:00', mode: 'self_drive', durationType: 'hourly', hours: 2, days: 0, kmIncluded: 20, kmUsed: 0, baseRate: 2400, chauffeurCharge: 0, extrasCharge: 0, total: 2400, extras: [], status: 'declined', assignedPlate: null, driver: null, deposit: 5000 },
];

const AVAILABLE_DRIVERS = ['Joseph M.', 'Samuel O.', 'Mwangi K.', 'James M.', 'Rajan P.', 'David T.'];

const STATUS_STYLES: Record<RentalStatus, { bg: string; label: string }> = {
  incoming: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: '🔔 New Request' },
  accepted: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Accepted' },
  driver_assigned: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Driver Assigned' },
  active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' },
  returned: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Returned' },
  declined: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Declined' },
};

const MODE_STYLES: Record<RentalMode, { bg: string; label: string }> = {
  chauffeur: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: '👨‍✈️ Chauffeur' },
  self_drive: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: '🔑 Self-Drive' },
};

export default function VendorRentalsPage() {
  const { formatCurrencyValue } = useRegion();
  const [tab, setTab] = useState<'incoming' | 'active' | 'history'>('incoming');
  const [modeFilter, setModeFilter] = useState<RentalMode | 'all'>('all');
  const [driverModal, setDriverModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const filtered = useMemo(() => {
    let list = RENTALS;
    if (tab === 'incoming') list = list.filter(r => r.status === 'incoming');
    else if (tab === 'active') list = list.filter(r => ['accepted', 'driver_assigned', 'active'].includes(r.status));
    else list = list.filter(r => ['returned', 'declined'].includes(r.status));
    if (modeFilter !== 'all') list = list.filter(r => r.mode === modeFilter);
    return list;
  }, [tab, modeFilter]);

  const incomingCount = RENTALS.filter(r => r.status === 'incoming').length;
  const activeCount = RENTALS.filter(r => ['accepted', 'driver_assigned', 'active'].includes(r.status)).length;
  const chauffeurEarnings = RENTALS.filter(r => r.mode === 'chauffeur' && ['active', 'returned'].includes(r.status)).reduce((s, r) => s + r.total, 0);
  const selfDriveEarnings = RENTALS.filter(r => r.mode === 'self_drive' && ['active', 'returned'].includes(r.status)).reduce((s, r) => s + r.total, 0);

  const getDurLabel = (r: VendorRental) => {
    if (r.durationType === 'hourly') return `⏱️ ${r.hours}h (${r.kmIncluded} km)`;
    if (r.durationType === 'weekly') return `📆 ${Math.round(r.days / 7)}w`;
    return `📅 ${r.days}d`;
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      {/* Driver assign modal */}
      {driverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-black text-lg mb-1">Assign Driver</h3>
            <p className="text-sm text-slate-500 mb-4">Select a driver for booking {driverModal}</p>
            <div className="space-y-2 mb-4">
              {AVAILABLE_DRIVERS.map(d => (
                <button key={d} onClick={() => { showToast(`${d} assigned to ${driverModal}`); setDriverModal(null); }} className="w-full text-left bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3">
                  <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs">{d.charAt(0)}</div>
                  {d}
                </button>
              ))}
            </div>
            <button onClick={() => setDriverModal(null)} className="w-full text-slate-500 font-semibold text-sm py-2">Cancel</button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-slate-900">🚗 Rental Bookings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage chauffeur-driven and self-drive rental requests</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Incoming', value: incomingCount, color: incomingCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Car },
          { label: 'Chauffeur Revenue', value: formatCurrencyValue(chauffeurEarnings), color: 'bg-violet-50 text-violet-700 border-violet-200', icon: UserCheck },
          { label: 'Self-Drive Revenue', value: formatCurrencyValue(selfDriveEarnings), color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Key },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-3 border ${kpi.color}`}><kpi.icon className="w-4 h-4 mb-1.5" /><p className="text-lg font-black">{kpi.value}</p><p className="text-[10px] font-medium opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      {/* Tabs + Mode filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {([{ key: 'incoming', label: `Incoming (${incomingCount})` }, { key: 'active', label: `Active (${activeCount})` }, { key: 'history', label: 'History' }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'chauffeur', 'self_drive'] as const).map(m => (
            <button key={m} onClick={() => setModeFilter(m)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${modeFilter === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'all' ? 'All' : MODE_STYLES[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Booking Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No bookings match current filters</div>
        ) : filtered.map(r => (
          <div key={r.id} className={`bg-white border rounded-xl p-5 transition-shadow hover:shadow-md ${r.status === 'incoming' ? 'border-amber-300 shadow-amber-100' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs text-blue-600 font-bold">{r.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status].bg}`}>{STATUS_STYLES[r.status].label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${MODE_STYLES[r.mode].bg}`}>{MODE_STYLES[r.mode].label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{getDurLabel(r)}</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{r.customer}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">{formatCurrencyValue(r.total)}</p>
                <p className="text-xs text-slate-400">
                  {r.chauffeurCharge > 0 && <span className="text-violet-500">+{formatCurrencyValue(r.chauffeurCharge)} driver</span>}
                  {r.extrasCharge > 0 && <span className="text-yellow-600 ml-1">+{formatCurrencyValue(r.extrasCharge)} extras</span>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 mb-3">
              <div><span className="text-slate-400">Vehicle</span><p className="font-bold">{r.vehicle}</p></div>
              <div><span className="text-slate-400">Pickup</span><p className="font-medium">{r.pickup}</p></div>
              <div><span className="text-slate-400">Start</span><p className="font-medium">{new Date(r.startDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · {r.startTime}</p></div>
              <div><span className="text-slate-400">{r.mode === 'chauffeur' ? 'Driver' : 'Deposit'}</span><p className="font-medium">{r.mode === 'chauffeur' ? (r.driver || <span className="text-amber-500 italic">Not assigned</span>) : formatCurrencyValue(r.deposit)}</p></div>
            </div>

            {r.extras.length > 0 && (
              <div className="flex gap-1 mb-3">{r.extras.map(e => <span key={e} className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200">{e}</span>)}</div>
            )}

            {/* KM bar for hourly */}
            {r.durationType === 'hourly' && r.kmIncluded > 0 && r.status === 'active' && (
              <div className="mb-3 bg-slate-50 rounded-lg p-2.5">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-500">KM Usage</span>
                  <span className="font-bold">{r.kmUsed}/{r.kmIncluded} km</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <ProgressBar value={Math.min(100, (r.kmUsed / r.kmIncluded) * 100)} className={`h-full rounded-full ${r.kmUsed > r.kmIncluded * 0.9 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </div>
              </div>
            )}

            {/* Compliance & Policies */}
            {(() => {
              const countryConfig = getCountryConfig('IN'); // Vendor sees their country
              const policyLines = formatCancellationPolicy(countryConfig.rentalCancellation, countryConfig.pricing.currencySymbol);
              const compChecks = getRequiredComplianceChecks(countryConfig, r.mode, false);
              return (
                <div className="space-y-2 mb-3">
                  {['incoming', 'accepted', 'driver_assigned'].includes(r.status) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-amber-700 mb-1">📋 Cancellation Policy</p>
                      <ul className="space-y-0.5">
                        {policyLines.slice(0, 3).map((line, i) => <li key={i} className="text-[9px] text-amber-600">{line}</li>)}
                      </ul>
                    </div>
                  )}
                  {['incoming', 'accepted', 'driver_assigned'].includes(r.status) && (
                    <RentalCompliancePanel
                      checks={compChecks}
                      countryConfig={countryConfig}
                      bookingId={r.id}
                      mode="vendor"
                    />
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            {r.status === 'incoming' && (
              <div className="flex items-center gap-2 pt-3 border-t border-amber-100">
                {r.mode === 'chauffeur' ? (
                  <button onClick={() => setDriverModal(r.id)} className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"><UserCheck className="w-3.5 h-3.5" /> Accept & Assign Driver</button>
                ) : (
                  <button onClick={() => showToast(`${r.id} accepted — vehicle reserved. Customer license pending verification.`)} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"><Key className="w-3.5 h-3.5" /> Accept & Reserve Vehicle</button>
                )}
                <button onClick={() => showToast(`${r.id} declined`)} className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"><XCircle className="w-3.5 h-3.5" /> Decline</button>
                <button onClick={() => showToast(`Calling ${r.customer}...`)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors ml-auto">Call</button>
              </div>
            )}
            {r.status === 'accepted' && r.mode === 'chauffeur' && (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => setDriverModal(r.id)} className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold"><UserCheck className="w-3.5 h-3.5" /> Assign Driver</button>
              </div>
            )}
            {r.status === 'driver_assigned' && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs text-violet-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /><span>Driver <b>{r.driver}</b> assigned · Plate: <b>{r.assignedPlate}</b></span>
                </div>
                <VehicleHandoverPanel
                  bookingId={r.id}
                  vehicleName={r.vehicle}
                  plate={r.assignedPlate}
                  mode="handover"
                  rentalMode={r.mode}
                  fuelPolicy={getCountryConfig('IN').selfDrive.fuelPolicy}
                />
                <RentalDocumentPanel
                  countryConfig={getCountryConfig('IN')}
                  bookingId={r.id}
                  mode={r.mode}
                  portal="vendor"
                />
                <button onClick={() => showToast(`${r.id} dispatched — driver heading to pickup`)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Dispatch</button>
              </div>
            )}
            {r.status === 'active' && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <VehicleHandoverPanel
                  bookingId={r.id}
                  vehicleName={r.vehicle}
                  plate={r.assignedPlate}
                  mode="return"
                  rentalMode={r.mode}
                  fuelPolicy={getCountryConfig('IN').selfDrive.fuelPolicy}
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => showToast(`${r.id} completed`)} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"><CheckCircle className="w-3.5 h-3.5" /> {r.mode === 'self_drive' ? 'Collect Keys & Return' : 'Complete Trip'}</button>
                  {r.durationType === 'hourly' && <button onClick={() => showToast(`${r.id} extended`)} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold"><Timer className="w-3.5 h-3.5" /> Extend</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
