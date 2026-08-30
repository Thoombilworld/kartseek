'use client';
import React, { useState, useEffect } from 'react';
import { Clock, Save, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const initSchedule = DAYS.map((d, i) => ({ day: d, active: i < 6, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', slotDuration: 30, maxPatients: 1, consultMode: 'both' as const }));

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(initSchedule);
  const upd = (i: number, k: string, v: any) => setSchedule(s => s.map((d, idx) => idx === i ? { ...d, [k]: v } : d));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Clock className="w-6 h-6 text-violet-600" /> Availability & Schedule</h1><p className="text-sm text-slate-500 mt-1">Set your weekly availability for patient appointments</p></div>
      {/* General Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="default-slot-duration">Default Slot Duration</label><select id="default-slot-duration" defaultValue="30" aria-label="Default slot duration" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-violet-400 outline-none"><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
          <div><label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="max-patients-per-slot">Max Patients per Slot</label><select id="max-patients-per-slot" defaultValue="1" aria-label="Max patients per slot" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-violet-400 outline-none"><option value="1">1 patient</option><option value="2">2 patients</option><option value="3">3 patients</option></select></div>
          <div><label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="buffer-between-slots">Buffer Between Slots</label><select id="buffer-between-slots" defaultValue="5" aria-label="Buffer between slots" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-violet-400 outline-none"><option value="0">No buffer</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></div>
        </div>
      </div>
      {/* Weekly Schedule */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">Weekly Schedule</h3></div>
        <div className="divide-y divide-slate-100">
          {schedule.map((d, i) => (
            <div key={d.day} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:px-6 ${!d.active ? 'bg-slate-50/50 opacity-60' : ''}`}>
              <div className="w-28 shrink-0 flex items-center gap-2">
                <button title={d.active ? `Disable ${d.day}` : `Enable ${d.day}`} onClick={() => upd(i, 'active', !d.active)} className="shrink-0">{d.active ? <ToggleRight className="w-6 h-6 text-violet-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}</button>
                <span className={`text-sm font-bold ${d.active ? 'text-slate-900' : 'text-slate-400'}`}>{d.day}</span>
              </div>
              {d.active && (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5"><label className="text-[10px] text-slate-500 font-bold" htmlFor="start">START</label><input id="start" type="time" value={d.startTime} onChange={e => upd(i, 'startTime', e.target.value)} title="Start time" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-violet-400 outline-none" /></div>
                  <span className="text-slate-300">–</span>
                  <div className="flex items-center gap-1.5"><label className="text-[10px] text-slate-500 font-bold" htmlFor="end">END</label><input id="end" type="time" value={d.endTime} onChange={e => upd(i, 'endTime', e.target.value)} title="End time" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-violet-400 outline-none" /></div>
                  <span className="text-slate-200 mx-1">|</span>
                  <div className="flex items-center gap-1.5"><label className="text-[10px] text-slate-500 font-bold" htmlFor="break">BREAK</label><input id="break" type="time" value={d.breakStart} onChange={e => upd(i, 'breakStart', e.target.value)} title="Break start" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-violet-400 outline-none w-24" /></div>
                  <span className="text-slate-300">–</span>
                  <input type="time" value={d.breakEnd} onChange={e => upd(i, 'breakEnd', e.target.value)} title="Break end" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-violet-400 outline-none w-24" />
                </div>
              )}
              {!d.active && <span className="text-xs text-slate-400 italic">Not available</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end"><button className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-lg shadow-violet-200/50"><Save className="w-4 h-4" /> Save Schedule</button></div>
    </div>
  );
}
