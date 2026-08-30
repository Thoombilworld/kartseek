'use client';

import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

const ITEMS = [
  {
    "title": "Cardiology",
    "subtitle": "Heart and cardiovascular system",
    "badge": "Active",
    "stats": "3 doctors"
  },
  {
    "title": "Dermatology",
    "subtitle": "Skin, hair, and nail conditions",
    "badge": "Active",
    "stats": "2 doctors"
  },
  {
    "title": "Pediatrics",
    "subtitle": "Children and adolescent health",
    "badge": "Active",
    "stats": "1 doctor"
  },
  {
    "title": "Orthopedics",
    "subtitle": "Bones, joints, and muscles",
    "badge": "Inactive",
    "stats": "0 doctors"
  }
];

export default function SpecialtiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Heart className="w-7 h-7 text-blue-600" />Specialties
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage offered medical specialties</p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{item.subtitle}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700">{item.badge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{item.stats}</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
