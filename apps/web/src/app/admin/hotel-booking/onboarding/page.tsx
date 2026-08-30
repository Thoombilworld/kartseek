'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight, Building2, FileText, DollarSign, Camera, Shield, Rocket, ChevronDown, ChevronUp } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

interface OnboardingHotel {
  id: string; name: string; ownerName: string; email: string; city: string;
  currentStep: number; totalSteps: number; createdAt: string; lastActivity: string;
  steps: Array<{ name: string; status: 'completed' | 'in_progress' | 'pending'; approvedBy?: string; completedAt?: string }>;
}

const ONBOARDING: OnboardingHotel[] = [
  { id: 'ob-001', name: 'Al Barsha Grand Hotel', ownerName: 'Mohammed Al Rashid', email: 'info@albarshahotel.ae', city: 'Dubai',
    currentStep: 4, totalSteps: 6, createdAt: '2026-06-28', lastActivity: '2026-07-05',
    steps: [
      { name: 'Owner Registration', status: 'completed', approvedBy: 'Admin', completedAt: '2026-06-28' },
      { name: 'Identity Verification', status: 'completed', approvedBy: 'KYC Team', completedAt: '2026-06-29' },
      { name: 'Hotel Details', status: 'completed', completedAt: '2026-06-30' },
      { name: 'Room Configuration', status: 'in_progress' },
      { name: 'Pricing Setup', status: 'pending' },
      { name: 'Go Live', status: 'pending' },
    ],
  },
  { id: 'ob-002', name: 'Creek View Residence', ownerName: 'Fatima Hassan', email: 'fatima@creekview.ae', city: 'Dubai',
    currentStep: 6, totalSteps: 6, createdAt: '2026-06-15', lastActivity: '2026-07-03',
    steps: [
      { name: 'Owner Registration', status: 'completed', completedAt: '2026-06-15' },
      { name: 'Identity Verification', status: 'completed', completedAt: '2026-06-16' },
      { name: 'Hotel Details', status: 'completed', completedAt: '2026-06-18' },
      { name: 'Room Configuration', status: 'completed', completedAt: '2026-06-20' },
      { name: 'Pricing Setup', status: 'completed', completedAt: '2026-06-22' },
      { name: 'Go Live', status: 'completed', approvedBy: 'Admin', completedAt: '2026-07-03' },
    ],
  },
  { id: 'ob-003', name: 'Palm View Suites', ownerName: 'Khalid Al Maktoum', email: 'khalid@palmview.ae', city: 'Dubai',
    currentStep: 2, totalSteps: 6, createdAt: '2026-07-02', lastActivity: '2026-07-04',
    steps: [
      { name: 'Owner Registration', status: 'completed', completedAt: '2026-07-02' },
      { name: 'Identity Verification', status: 'in_progress' },
      { name: 'Hotel Details', status: 'pending' },
      { name: 'Room Configuration', status: 'pending' },
      { name: 'Pricing Setup', status: 'pending' },
      { name: 'Go Live', status: 'pending' },
    ],
  },
  { id: 'ob-004', name: 'Marina Bay Hotel', ownerName: 'Sarah Williams', email: 'sarah@marinabay.ae', city: 'Abu Dhabi',
    currentStep: 1, totalSteps: 6, createdAt: '2026-07-05', lastActivity: '2026-07-05',
    steps: [
      { name: 'Owner Registration', status: 'in_progress' },
      { name: 'Identity Verification', status: 'pending' },
      { name: 'Hotel Details', status: 'pending' },
      { name: 'Room Configuration', status: 'pending' },
      { name: 'Pricing Setup', status: 'pending' },
      { name: 'Go Live', status: 'pending' },
    ],
  },
];

const STEP_ICONS = [Building2, Shield, FileText, Camera, DollarSign, Rocket];

export default function OnboardingPage() {
  const [hotels, setHotels] = useState(ONBOARDING);
  const [expandedId, setExpandedId] = useState<string | null>('ob-001');
  const [filter, setFilter] = useState<string>('all');

  const filtered = hotels.filter(h => {
    if (filter === 'in_progress') return h.currentStep < h.totalSteps && h.currentStep > 0;
    if (filter === 'completed') return h.currentStep >= h.totalSteps;
    if (filter === 'new') return h.currentStep <= 1;
    return true;
  });

  const stats = {
    total: hotels.length,
    inProgress: hotels.filter(h => h.currentStep < h.totalSteps && h.currentStep > 0).length,
    completed: hotels.filter(h => h.currentStep >= h.totalSteps).length,
    avgProgress: Math.round(hotels.reduce((s, h) => s + (h.currentStep / h.totalSteps) * 100, 0) / hotels.length),
  };

  const approveStep = (hotelId: string, stepIndex: number) => {
    setHotels(hotels.map(h => {
      if (h.id !== hotelId) return h;
      const steps = [...h.steps];
      steps[stepIndex] = { ...steps[stepIndex], status: 'completed', approvedBy: 'Admin', completedAt: new Date().toISOString().split('T')[0] };
      if (stepIndex + 1 < steps.length) steps[stepIndex + 1] = { ...steps[stepIndex + 1], status: 'in_progress' };
      return { ...h, steps, currentStep: Math.min(h.currentStep + 1, h.totalSteps) };
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Hotel Onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">Guide new hotels through the registration-to-go-live pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats.total, icon: Building2, bg: 'bg-blue-100 text-blue-600' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, bg: 'bg-amber-100 text-amber-600' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-600' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: Rocket, bg: 'bg-rose-100 text-rose-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'new', 'in_progress', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              filter === f ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
            }`}>
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Onboarding Cards */}
      <div className="space-y-4">
        {filtered.map(hotel => {
          const progress = Math.round((hotel.steps.filter(s => s.status === 'completed').length / hotel.totalSteps) * 100);
          const isExpanded = expandedId === hotel.id;
          const isComplete = progress === 100;

          return (
            <div key={hotel.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${
              isComplete ? 'border-emerald-200' : 'border-slate-100'
            }`}>
              {/* Header */}
              <button onClick={() => setExpandedId(isExpanded ? null : hotel.id)}
                className="w-full p-5 text-left">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{hotel.name}</h4>
                      {isComplete && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{hotel.ownerName}</span>
                      <span>{hotel.city}</span>
                      <span>Started: {hotel.createdAt}</span>
                      <span>Last activity: {hotel.lastActivity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{progress}%</p>
                      <p className="text-[10px] text-slate-400">Step {hotel.steps.filter(s => s.status === 'completed').length}/{hotel.totalSteps}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-rose-600'}`}
                    style={{ width: `${progress}%` }} />
                </div>
              </button>

              {/* Expanded Steps */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="mt-4 space-y-3">
                    {hotel.steps.map((step, i) => {
                      const Icon = STEP_ICONS[i] || Circle;
                      return (
                        <div key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                          step.status === 'in_progress' ? 'bg-amber-50 border border-amber-200' :
                          step.status === 'completed' ? 'bg-emerald-50/50' : 'bg-slate-50/50'
                        }`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            step.status === 'completed' ? 'bg-emerald-500' :
                            step.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-200'
                          }`}>
                            {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                             step.status === 'in_progress' ? <Clock className="w-4 h-4 text-white" /> :
                             <Icon className="w-4 h-4 text-slate-400" />}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>{step.name}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              {step.completedAt && <span>Completed: {step.completedAt}</span>}
                              {step.approvedBy && <span>Approved by: {step.approvedBy}</span>}
                            </div>
                          </div>
                          {step.status === 'in_progress' && (
                            <button onClick={() => approveStep(hotel.id, i)}
                              className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
