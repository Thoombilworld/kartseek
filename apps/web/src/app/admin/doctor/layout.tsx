'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Stethoscope, Calendar,
  ShieldCheck, FileCheck, Star, Activity,
} from 'lucide-react';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';

const NAV_ITEMS = [
  { href: '/admin/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/doctor/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/admin/doctor/clinics', label: 'Clinics', icon: Building2 },
  { href: '/admin/doctor/specialties', label: 'Specialties', icon: Activity },
  { href: '/admin/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/admin/doctor/documents', label: 'Verification', icon: FileCheck },
  { href: '/admin/doctor/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/doctor/reviews', label: 'Reviews', icon: Star },
];

export default function DoctorAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { regionLabel, isFiltered, countryFlag, currencySymbol } = useDoctorRegionFilter([]);

  return (
    <div className="flex flex-col">
      {/* Sub-Navigation — horizontal tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto py-1 scrollbar-thin">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href
                || (item.href !== '/admin/doctor' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {/* Region Indicator Bar */}
      {isFiltered && (
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold">
            <span className="text-base">{countryFlag}</span>
            <span>Doctor & Hospital filtered to <strong>{regionLabel}</strong></span>
            <span className="ml-auto bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold">{currencySymbol}</span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </div>
    </div>
  );
}

