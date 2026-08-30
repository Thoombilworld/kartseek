'use client';
import React, { useState } from 'react';
import {
  ArrowLeft, Shield, Building2, User, MapPin, Clock, AlertTriangle,
  AlertOctagon, CheckCircle, XCircle, MessageSquare, FileText,
  Phone, Car, DollarSign, Scale, Gavel, Send, ChevronRight,
  Ban, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const complaintData = {
  id: 'CMP-001',
  tripId: 'RIDE-4823',
  countrycode: 'IN',
  filedBy: 'customer' as const,
  filerName: 'Sarah Wanjiku',
  filerPhone: '+91 712 345 678',
  filerEmail: 'sarah.w@email.com',
  category: 'safety_incident',
  severity: 'critical' as const,
  description: 'Driver was on the phone while driving at high speed on Thika Road. I felt unsafe for the entire ride and asked the driver to stop but he ignored me initially. He only put the phone down after I raised my voice.',
  evidence: [
    { type: 'photo', url: '#', uploadedAt: '2026-06-17T11:05:00Z' },
    { type: 'audio', url: '#', uploadedAt: '2026-06-17T11:06:00Z' },
  ],
  driverId: 'DRV-045',
  driverName: 'Rajesh Kumar',
  driverPhone: '+91 700 111 222',
  driverRating: 4.2,
  driverTotalTrips: 1284,
  driverComplaintCount: 3,
  vendorId: 'VND-003',
  vendorName: 'SafeRide India',
  vendorCity: 'Mumbai',
  accountability: 'vendor' as const,
  tripContext: {
    pickupAddress: 'BKC Complex Mall, Thika Road',
    dropAddress: 'CST, Fort',
    fareAmount: 650,
    currency: '₹',
    vehicleType: 'comfort',
    paymentMethod: 'UPI',
    tripDate: '2026-06-17T10:30:00Z',
    tripDuration: 35,
    tripDistance: 12.4,
  },
  status: 'escalated' as const,
  escalationLevel: 1,
  assignedTo: 'admin_002',
  assignedToName: 'Mary Akinyi',
  internalNotes: '[ESCALATED L1 by system] Auto-escalated: critical severity',
  slaDeadline: '2026-06-17T15:00:00Z',
  slaBreached: false,
  createdAt: '2026-06-17T11:00:00Z',
  resolution: null as string | null,
  actionTaken: 'none',
  resolvedAt: null as string | null,
  resolvedBy: null as string | null,
};

const driverHistory = [
  { id: 'CMP-012', date: '2026-05-20', category: 'driver_behavior', severity: 'medium', status: 'resolved', action: 'verbal_warning' },
  { id: 'CMP-008', date: '2026-04-10', category: 'route_deviation', severity: 'low', status: 'resolved', action: 'none' },
  { id: 'CMP-001', date: '2026-06-17', category: 'safety_incident', severity: 'critical', status: 'escalated', action: 'none' },
];

const timeline = [
  { time: '11:00 AM', action: 'Complaint filed by Sarah Wanjiku', type: 'filed' },
  { time: '11:00 AM', action: 'Auto-escalated: critical severity', type: 'escalated' },
  { time: '11:05 AM', action: 'Evidence uploaded (2 files)', type: 'evidence' },
  { time: '11:15 AM', action: 'Assigned to Mary Akinyi', type: 'assigned' },
];

const sevCfg: Record<string, { bg: string; l: string }> = {
  critical: { bg: 'bg-red-100 text-red-700', l: 'CRITICAL' },
  high: { bg: 'bg-orange-100 text-orange-700', l: 'HIGH' },
  medium: { bg: 'bg-amber-100 text-amber-700', l: 'MEDIUM' },
  low: { bg: 'bg-slate-100 text-slate-600', l: 'LOW' },
};

const disciplines = [
  { value: 'verbal_warning', label: 'Verbal Warning', icon: '🗣️' },
  { value: 'written_warning', label: 'Written Warning', icon: '📝' },
  { value: 'fine', label: 'Fine', icon: '💰' },
  { value: 'temporary_suspension', label: 'Temporary Suspension', icon: '⏸️' },
  { value: 'permanent_suspension', label: 'Permanent Suspension', icon: '🚫' },
  { value: 'platform_ban', label: 'Platform Ban', icon: '❌' },
  { value: 'retraining_required', label: 'Retraining Required', icon: '📚' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplaintDetailPage() {
  const params = useParams();
  const c = complaintData;
  const sv = sevCfg[c.severity];

  const [resolution, setResolution] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [legalRef, setLegalRef] = useState('');

  const now = new Date();
  const sla = new Date(c.slaDeadline);
  const slaHours = Math.max(0, Math.round((sla.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/taxi/complaints" className="mt-1 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" id="back-to-complaints">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900">{c.id}</h1>
            <span className={`${sv.bg} px-2.5 py-1 rounded-full text-[10px] font-bold`}>{sv.l}</span>
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" /> Escalated L{c.escalationLevel}
            </span>
            {!c.slaBreached ? (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${slaHours <= 4 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                <Clock className="w-3 h-3 inline mr-0.5" />{slaHours}h SLA remaining
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">SLA BREACHED</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Filed on {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content — Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-4 h-4 text-red-500" /> Complaint Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
            {c.evidence.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-2">Evidence ({c.evidence.length} files)</p>
                <div className="flex gap-2">
                  {c.evidence.map((e, i) => (
                    <button key={i} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 transition-colors" id={`evidence-${i}`} aria-label="Document">
                      <FileText className="w-3.5 h-3.5" /> {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trip Context */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4 text-blue-500" /> Trip Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div><p className="text-slate-400">Trip ID</p><p className="font-bold text-slate-900 font-mono">{c.tripId}</p></div>
              <div><p className="text-slate-400">Pickup</p><p className="font-bold text-slate-900">{c.tripContext.pickupAddress}</p></div>
              <div><p className="text-slate-400">Drop-off</p><p className="font-bold text-slate-900">{c.tripContext.dropAddress}</p></div>
              <div><p className="text-slate-400">Fare</p><p className="font-bold text-slate-900">{c.tripContext.currency} {c.tripContext.fareAmount.toLocaleString()}</p></div>
              <div><p className="text-slate-400">Vehicle Type</p><p className="font-bold text-slate-900 capitalize">{c.tripContext.vehicleType}</p></div>
              <div><p className="text-slate-400">Payment</p><p className="font-bold text-slate-900">{c.tripContext.paymentMethod}</p></div>
              <div><p className="text-slate-400">Duration</p><p className="font-bold text-slate-900">{c.tripContext.tripDuration} min</p></div>
              <div><p className="text-slate-400">Distance</p><p className="font-bold text-slate-900">{c.tripContext.tripDistance} km</p></div>
              <div><p className="text-slate-400">Date</p><p className="font-bold text-slate-900">{new Date(c.tripContext.tripDate).toLocaleDateString()}</p></div>
            </div>
          </div>

          {/* Accountability Chain */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              <Scale className="w-4 h-4 text-purple-500" /> Accountability Chain
            </h3>
            <div className="flex items-center gap-3">
              {/* Filer */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center flex-1">
                <User className="w-5 h-5 text-blue-500 mx-auto" />
                <p className="text-xs font-bold text-blue-700 mt-1">{c.filerName}</p>
                <p className="text-[10px] text-blue-400">Customer</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              {/* Driver */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center flex-1">
                <Car className="w-5 h-5 text-indigo-500 mx-auto" />
                <p className="text-xs font-bold text-indigo-700 mt-1">{c.driverName}</p>
                <p className="text-[10px] text-indigo-400">Driver • {c.driverComplaintCount} prior</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              {/* Accountable */}
              <div className={`rounded-lg p-3 text-center flex-1 ${c.accountability === 'vendor' ? 'bg-purple-50 border border-purple-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                {c.accountability === 'vendor' ? (
                  <>
                    <Building2 className="w-5 h-5 text-purple-500 mx-auto" />
                    <p className="text-xs font-bold text-purple-700 mt-1">{c.vendorName}</p>
                    <p className="text-[10px] text-purple-400">Vendor — Accountable</p>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-700 mt-1">KARTSEEK</p>
                    <p className="text-[10px] text-emerald-400">Platform — Accountable</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Resolution Form */}
          <div className="bg-white border-2 border-red-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-4">
              <Gavel className="w-4 h-4 text-red-500" /> Take Action
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Disciplinary Action</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {disciplines.map(d => (
                    <button key={d.value} onClick={() => setSelectedAction(d.value)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${selectedAction === d.value ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`} id={`action-${d.value}`}>
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5" htmlFor="legal-ref-input">Legal Reference (optional)</label>
                <input value={legalRef} onChange={e => setLegalRef(e.target.value)} placeholder="e.g. India Transport Act §42, RTO Regulation 2024/17..." className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" id="legal-ref-input" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5" htmlFor="resolution-notes">Resolution Notes</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe the investigation findings and resolution..." rows={3} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" id="resolution-notes" />
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5" id="resolve-complaint">
                  <Gavel className="w-3.5 h-3.5" /> Resolve & Issue Action
                </button>
                <button className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors" id="dismiss-complaint">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — Right */}
        <div className="space-y-4">
          {/* Assigned */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-2">Assigned To</h4>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">MA</div>
              <div>
                <p className="text-xs font-bold text-slate-900">{c.assignedToName}</p>
                <p className="text-[10px] text-slate-400">Compliance Officer</p>
              </div>
            </div>
          </div>

          {/* Driver Profile */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-3">Driver Profile</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-xs font-bold text-slate-900">{c.driverName}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">ID</p>
                <p className="text-xs font-bold text-slate-900 font-mono">{c.driverId}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-xs font-bold text-slate-900">{c.driverPhone}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Rating</p>
                <p className="text-xs font-bold text-slate-900">⭐ {c.driverRating}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Total Trips</p>
                <p className="text-xs font-bold text-slate-900">{c.driverTotalTrips.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Prior Complaints</p>
                <p className="text-xs font-bold text-red-600">{c.driverComplaintCount}</p>
              </div>
            </div>
          </div>

          {/* Driver Complaint History */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-3">Complaint History (Driver)</h4>
            <div className="space-y-2">
              {driverHistory.map(h => (
                <div key={h.id} className={`flex items-center justify-between px-2.5 py-2 rounded-lg ${h.id === c.id ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">{h.id}</p>
                    <p className="text-[10px] text-slate-400">{h.date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`${sevCfg[h.severity as keyof typeof sevCfg]?.bg || 'bg-slate-100'} px-1.5 py-0.5 rounded text-[9px] font-bold`}>
                      {h.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-3">Activity Timeline</h4>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="relative">
                    <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${t.type === 'escalated' ? 'bg-red-500' : t.type === 'filed' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    {i < timeline.length - 1 && <div className="absolute top-3 left-1 w-px h-6 bg-slate-200" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-700">{t.action}</p>
                    <p className="text-[10px] text-slate-400">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-2">Internal Notes</h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mb-3">{c.internalNotes || 'No notes yet.'}</p>
            <div className="flex gap-2">
              <input value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Add a note..." className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500" id="internal-note-input" />
              <button className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600" id="add-note-btn" aria-label="Send"><Send className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
