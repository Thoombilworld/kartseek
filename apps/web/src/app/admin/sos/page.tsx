'use client';
import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, Clock, CheckCircle, XCircle, Shield, Radio, Eye, ChevronDown, ChevronUp, Car, Truck, User } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type SosCase = {
  id: string; partnerId: string; partnerName: string; partnerPhone: string;
  referenceType: 'TAXI_RIDE' | 'DELIVERY_TASK' | 'NONE'; referenceId: string;
  lat: number; lng: number; address: string; status: 'ACTIVE' | 'DISPATCHED' | 'RESPONDING' | 'RESOLVED' | 'FALSE_ALARM';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'; createdAt: string; resolvedAt?: string;
  resolution?: string; responderId?: string; responderName?: string;
};

const sosCases: SosCase[] = [
  { id: 'SOS-001', partnerId: 'P-101', partnerName: 'Ravi Kumar', partnerPhone: '+91 98765 43210', referenceType: 'TAXI_RIDE', referenceId: 'RIDE-9021', lat: -1.2833, lng: 36.8219, address: 'Indiatta Ave, Mumbai Central', status: 'ACTIVE', priority: 'CRITICAL', createdAt: '2026-07-09T02:15:00Z' },
  { id: 'SOS-002', partnerId: 'P-102', partnerName: 'James Mwangi', partnerPhone: '+91 712 345678', referenceType: 'DELIVERY_TASK', referenceId: 'TASK-5512', lat: -1.2641, lng: 36.8049, address: 'Westlands, Mumbai', status: 'DISPATCHED', priority: 'HIGH', createdAt: '2026-07-09T01:45:00Z' },
  { id: 'SOS-003', partnerId: 'P-103', partnerName: 'Amit Singh', partnerPhone: '+91 98765 43211', referenceType: 'TAXI_RIDE', referenceId: 'RIDE-8992', lat: 19.0760, lng: 72.8777, address: 'Andheri East, Mumbai', status: 'RESPONDING', priority: 'HIGH', createdAt: '2026-07-09T01:30:00Z', responderId: 'RESP-01', responderName: 'Mumbai Police Unit 4' },
  { id: 'SOS-004', partnerId: 'P-104', partnerName: 'Deepak R.', partnerPhone: '+91 98765 43213', referenceType: 'NONE', referenceId: '', lat: 28.6139, lng: 77.2090, address: 'Connaught Place, Delhi', status: 'RESOLVED', priority: 'MEDIUM', createdAt: '2026-07-08T22:10:00Z', resolvedAt: '2026-07-08T22:35:00Z', resolution: 'Accidental trigger — partner confirmed safe', responderId: 'RESP-02', responderName: 'Delhi Response Unit' },
  { id: 'SOS-005', partnerId: 'P-105', partnerName: 'Fatima O.', partnerPhone: '+234 801 234567', referenceType: 'TAXI_RIDE', referenceId: 'RIDE-8910', lat: 6.5244, lng: 3.3792, address: 'Victoria Island, Lagos', status: 'FALSE_ALARM', priority: 'MEDIUM', createdAt: '2026-07-08T20:00:00Z', resolvedAt: '2026-07-08T20:12:00Z', resolution: 'Confirmed false alarm — phone pocket-dial' },
];

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-red-600 text-white animate-pulse', DISPATCHED: 'bg-orange-500 text-white',
  RESPONDING: 'bg-blue-500 text-white', RESOLVED: 'bg-emerald-100 text-emerald-700',
  FALSE_ALARM: 'bg-slate-100 text-slate-500',
};
const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 ring-1 ring-red-300', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
};
const refIcons: Record<string, React.ReactNode> = {
  TAXI_RIDE: <Car className="w-4 h-4" />, DELIVERY_TASK: <Truck className="w-4 h-4" />, NONE: <User className="w-4 h-4" />,
};

export default function SosManagementPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = sosCases.filter(s => s.status === 'ACTIVE' || s.status === 'DISPATCHED' || s.status === 'RESPONDING').length;
  const resolved = sosCases.filter(s => s.status === 'RESOLVED').length;
  const falseAlarms = sosCases.filter(s => s.status === 'FALSE_ALARM').length;

  const filtered = sosCases.filter(s => statusFilter === 'All' || s.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-500" /> SOS Emergency Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor and respond to partner emergency alerts in real-time</p>
        </div>
        {active > 0 && (
          <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl animate-pulse shadow-lg shadow-red-200">
            <Radio className="w-5 h-5" />
            <span className="font-bold text-lg">{active}</span>
            <span className="text-sm font-medium">Active Emergencies</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-2xl font-black text-red-700 mt-2">{active}</p>
          <p className="text-xs text-red-500 font-medium">Active / In Progress</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-emerald-700 mt-2">{resolved}</p>
          <p className="text-xs text-emerald-500 font-medium">Resolved</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <XCircle className="w-5 h-5 text-slate-400" />
          <p className="text-2xl font-black text-slate-700 mt-2">{falseAlarms}</p>
          <p className="text-xs text-slate-500 font-medium">False Alarms</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-blue-700 mt-2">4m</p>
          <p className="text-xs text-blue-500 font-medium">Avg. Response Time</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['All', 'ACTIVE', 'DISPATCHED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s === 'FALSE_ALARM' ? 'False Alarm' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* SOS Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Case ID</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Partner</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Type</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Location</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Priority</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Time</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <React.Fragment key={s.id}>
                <tr className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors ${s.status === 'ACTIVE' ? 'bg-red-50/50' : ''}`}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === s.id ? null : s.id))}>
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">{s.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{s.partnerName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {s.partnerPhone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-slate-700">{refIcons[s.referenceType]} {s.referenceType === 'NONE' ? 'Manual' : s.referenceId}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {s.address}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[s.priority]}`}>{s.priority}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[s.status]}`}>{s.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      {s.status === 'ACTIVE' && (
                        <button className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">Dispatch</button>
                      )}
                      {(s.status === 'DISPATCHED' || s.status === 'RESPONDING') && (
                        <button className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">Resolve</button>
                      )}
                      {expanded === s.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr className="bg-slate-50/80">
                    <td colSpan={8} className="px-5 py-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Partner ID</p>
                          <p className="text-sm font-semibold text-slate-800">{s.partnerId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">GPS Coordinates</p>
                          <p className="text-sm font-semibold text-slate-800">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Responder</p>
                          <p className="text-sm font-semibold text-slate-800">{s.responderName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Resolution</p>
                          <p className="text-sm text-slate-700">{s.resolution || '—'}</p>
                        </div>
                      </div>
                      {s.status !== 'RESOLVED' && s.status !== 'FALSE_ALARM' && (
                        <div className="mt-4 flex items-center gap-2">
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> Call Partner
                          </button>
                          <button className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> View on Map
                          </button>
                          <button className="bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">
                            Mark False Alarm
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
