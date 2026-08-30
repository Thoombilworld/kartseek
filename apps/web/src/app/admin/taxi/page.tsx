'use client';
import React, { useState, useEffect } from 'react';
import {
  Car, Settings2, DollarSign, Building2, Users, Truck, MapPin,
  TrendingUp, Star, AlertTriangle, ArrowRight, Zap, Shield,
  FileText, CreditCard, Scale, AlertOctagon, Globe,
} from 'lucide-react';
import Link from 'next/link';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

const modules = [
  {
    href: '/admin/taxi/settings',
    icon: Settings2,
    color: 'from-emerald-500 to-emerald-600',
    title: 'Per-Country Settings',
    desc: 'Feature toggles, payment gateways, document requirements, and regional configuration.',
    badge: null,
  },
  {
    href: '/admin/taxi/pricing',
    icon: DollarSign,
    color: 'from-amber-500 to-amber-600',
    title: 'Dynamic Pricing',
    desc: 'Rate cards, surge limits, peak hours, and fare configuration per vehicle type.',
    badge: null,
  },
  {
    href: '/admin/taxi/vendors',
    icon: Building2,
    color: 'from-purple-500 to-purple-600',
    title: 'Vendor Management',
    desc: 'Approve, monitor, and manage fleet vendors across all regions.',
    badge: '1 pending',
  },
  {
    href: '/admin/taxi/drivers',
    icon: Users,
    color: 'from-indigo-500 to-indigo-600',
    title: 'Driver Management',
    desc: 'Onboarding, document review, and driver lifecycle across vendors and independents.',
    badge: '2 onboarding',
  },
  {
    href: '/admin/taxi/fleet',
    icon: Truck,
    color: 'from-blue-500 to-blue-600',
    title: 'Fleet Monitoring',
    desc: 'Real-time driver locations, ride tracking, surge monitoring, and live dispatch.',
    badge: 'Live',
  },
  {
    href: '/admin/taxi/pending-approvals',
    icon: Shield,
    color: 'from-amber-500 to-yellow-500',
    title: 'Pending Approvals',
    desc: 'Review and approve vendor registrations, driver onboarding submissions, and document uploads.',
    badge: '7 pending',
  },
  {
    href: '/admin/taxi/payouts',
    icon: CreditCard,
    color: 'from-rose-500 to-rose-600',
    title: 'Financial Reconciliation',
    desc: 'Payout management, commission splits, batch processing, and settlement tracking.',
    badge: '3 pending',
  },
  {
    href: '/admin/taxi/complaints',
    icon: AlertOctagon,
    color: 'from-red-500 to-red-600',
    title: 'Complaints & Incidents',
    desc: 'Track, investigate, and resolve complaints. Trace accountability to vendors or the platform.',
    badge: '2 open',
  },
  {
    href: '/admin/taxi/compliance',
    icon: Scale,
    color: 'from-violet-500 to-violet-600',
    title: 'Compliance Framework',
    desc: 'Per-country legal compliance rules, SLA targets, and auto-trigger disciplinary policies.',
    badge: null,
  },
  {
    href: '/admin/taxi/landing-editor',
    icon: Globe,
    color: 'from-cyan-500 to-teal-500',
    title: 'Landing Page Editor',
    desc: 'Edit vendor landing page content, requirements, earnings, and testimonials per country.',
    badge: null,
  },
];

const kpis = [
  { label: 'Active Vendors', value: '6', icon: Building2, color: 'text-purple-500' },
  { label: 'Active Drivers', value: '342', icon: Users, color: 'text-indigo-500' },
  { label: 'Rides Today', value: '3,218', icon: Car, color: 'text-blue-500' },
  { label: 'Revenue Today', value: 'Multi-Currency', icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'Avg Rating', value: '4.6', icon: Star, color: 'text-amber-500' },
  { label: 'Open Complaints', value: '4', icon: AlertOctagon, color: 'text-red-500' },
];

export default function TaxiModuleHub() {
  const { regionLabel, isFiltered, formatPrice, regulatoryBody, surgeCapLabel } = useTaxiRegionFilter([]);
  const [dashData, setDashData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminTaxiApi.getDashboard();
        if (res.success && res.data) setDashData(res.data);
      } catch { /* keep demo KPIs */ }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
            <Car className="w-6 h-6 text-white" />
          </div>
          Taxi & Rides Module
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          {isFiltered ? `${regionLabel} — ` : ''}Central hub for taxi operations. {regulatoryBody} compliance, surge cap: {surgeCapLabel}.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            <p className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</p>
            <p className="text-[10px] text-slate-500 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-slate-300 transition-all overflow-hidden"
            id={`module-card-${mod.href.split('/').pop()}`}
          >
            <div className={`bg-linear-to-br ${mod.color} p-4 flex items-center justify-between`}>
              <mod.icon className="w-8 h-8 text-white opacity-90" />
              {mod.badge && (
                <span className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                  {mod.badge}
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                {mod.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{mod.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats Banner */}
      <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm">System Health</h3>
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> All services operational
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Ride Matching</p>
            <p className="font-bold text-emerald-400">Avg 12s</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Active Rides</p>
            <p className="font-bold">148</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Drivers Online</p>
            <p className="font-bold">234 / 342</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Surge Zones</p>
            <p className="font-bold text-amber-400">3 active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
