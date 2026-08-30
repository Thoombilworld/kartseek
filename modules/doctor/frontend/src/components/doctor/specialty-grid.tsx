'use client';

import React, { useState } from 'react';
import {
  Stethoscope, Smile, Sparkles, Heart, Baby, Bone,
  HeartPulse, Ear, Brain, Eye, BrainCircuit, Dumbbell,
  Droplets, Pill, Activity, Wind, Droplet, Radiation,
  Users, Flower2, Scissors, ShieldPlus, Syringe,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';

export interface Specialty {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  gradient: string;
}

export const SPECIALTIES: Specialty[] = [
  { id: 'general-physician',   name: 'General Physician',    icon: Stethoscope,  color: 'text-blue-600',     bg: 'bg-blue-50',      gradient: 'from-blue-50 to-blue-100/60' },
  { id: 'dentist',             name: 'Dentist',              icon: Smile,        color: 'text-cyan-600',     bg: 'bg-cyan-50',      gradient: 'from-cyan-50 to-cyan-100/60' },
  { id: 'dermatologist',       name: 'Dermatologist',        icon: Sparkles,     color: 'text-pink-600',     bg: 'bg-pink-50',      gradient: 'from-pink-50 to-pink-100/60' },
  { id: 'gynecologist',        name: 'Gynecologist',         icon: Heart,        color: 'text-rose-600',     bg: 'bg-rose-50',      gradient: 'from-rose-50 to-rose-100/60' },
  { id: 'pediatrician',        name: 'Pediatrician',         icon: Baby,         color: 'text-sky-600',      bg: 'bg-sky-50',       gradient: 'from-sky-50 to-sky-100/60' },
  { id: 'orthopedic',          name: 'Orthopedic',           icon: Bone,         color: 'text-amber-600',    bg: 'bg-amber-50',     gradient: 'from-amber-50 to-amber-100/60' },
  { id: 'cardiologist',        name: 'Cardiologist',         icon: HeartPulse,   color: 'text-red-600',      bg: 'bg-red-50',       gradient: 'from-red-50 to-red-100/60' },
  { id: 'ent',                 name: 'ENT',                  icon: Ear,          color: 'text-violet-600',   bg: 'bg-violet-50',    gradient: 'from-violet-50 to-violet-100/60' },
  { id: 'neurologist',         name: 'Neurologist',          icon: Brain,        color: 'text-purple-600',   bg: 'bg-purple-50',    gradient: 'from-purple-50 to-purple-100/60' },
  { id: 'ophthalmologist',     name: 'Ophthalmologist',      icon: Eye,          color: 'text-teal-600',     bg: 'bg-teal-50',      gradient: 'from-teal-50 to-teal-100/60' },
  { id: 'psychiatrist',        name: 'Psychiatrist',         icon: BrainCircuit, color: 'text-indigo-600',   bg: 'bg-indigo-50',    gradient: 'from-indigo-50 to-indigo-100/60' },
  { id: 'physiotherapist',     name: 'Physiotherapist',      icon: Dumbbell,     color: 'text-emerald-600',  bg: 'bg-emerald-50',   gradient: 'from-emerald-50 to-emerald-100/60' },
  { id: 'diabetes-care',       name: 'Diabetes Care',        icon: Droplets,     color: 'text-orange-600',   bg: 'bg-orange-50',    gradient: 'from-orange-50 to-orange-100/60' },
  { id: 'gastroenterology',    name: 'Gastroenterology',     icon: Pill,         color: 'text-lime-600',     bg: 'bg-lime-50',      gradient: 'from-lime-50 to-lime-100/60' },
  { id: 'urology',             name: 'Urology',              icon: Activity,     color: 'text-blue-700',     bg: 'bg-blue-50',      gradient: 'from-blue-50 to-blue-100/60' },
  { id: 'pulmonology',         name: 'Pulmonology',          icon: Wind,         color: 'text-sky-700',      bg: 'bg-sky-50',       gradient: 'from-sky-50 to-sky-100/60' },
  { id: 'nephrology',          name: 'Nephrology',           icon: Droplet,      color: 'text-fuchsia-600',  bg: 'bg-fuchsia-50',   gradient: 'from-fuchsia-50 to-fuchsia-100/60' },
  { id: 'oncology',            name: 'Oncology',             icon: Radiation,    color: 'text-slate-700',    bg: 'bg-slate-100',    gradient: 'from-slate-50 to-slate-100/60' },
  { id: 'fertility-specialist',name: 'Fertility Specialist', icon: Users,        color: 'text-pink-700',     bg: 'bg-pink-50',      gradient: 'from-pink-50 to-pink-100/60' },
  { id: 'mental-health',       name: 'Mental Health',        icon: Flower2,      color: 'text-green-600',    bg: 'bg-green-50',     gradient: 'from-green-50 to-green-100/60' },
  { id: 'skin-hair',           name: 'Skin & Hair',          icon: Scissors,     color: 'text-rose-500',     bg: 'bg-rose-50',      gradient: 'from-rose-50 to-rose-100/60' },
  { id: 'womens-health',       name: "Women's Health",       icon: ShieldPlus,   color: 'text-fuchsia-500',  bg: 'bg-fuchsia-50',   gradient: 'from-fuchsia-50 to-fuchsia-100/60' },
  { id: 'child-care',          name: 'Child Care',           icon: Syringe,      color: 'text-amber-500',    bg: 'bg-amber-50',     gradient: 'from-amber-50 to-amber-100/60' },
];

const INITIAL_VISIBLE = 12;

interface SpecialtyGridProps {
  selectedSpecialty?: string | null;
  onSelect?: (specialtyId: string | null) => void;
}

export default function SpecialtyGrid({ selectedSpecialty, onSelect }: SpecialtyGridProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? SPECIALTIES : SPECIALTIES.slice(0, INITIAL_VISIBLE);

  const handleClick = (specId: string) => {
    if (!onSelect) return;
    // Toggle: clicking the same specialty again clears the filter
    onSelect(selectedSpecialty === specId ? null : specId);
  };

  return (
    <section id="specialties-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Top Specialties</h2>
          <p className="text-sm text-slate-500 mt-1">Find the right specialist for your health needs</p>
        </div>
        {selectedSpecialty && onSelect && (
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all duration-200"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3 md:gap-4">
        {visible.map((spec) => {
          const Icon = spec.icon;
          const isSelected = selectedSpecialty === spec.id;
          return (
            <button
              key={spec.id}
              onClick={() => handleClick(spec.id)}
              id={`specialty-${spec.id}`}
              className={`group relative bg-linear-to-br ${spec.gradient} rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center gap-2.5 border cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-200/40 -translate-y-1'
                  : 'border-white/80 hover:border-slate-200'
              }`}
            >
              <div className={`w-12 h-12 md:w-14 md:h-14 ${spec.bg} ${spec.color} rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm ${isSelected ? 'scale-110' : ''}`}>
                <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.8} />
              </div>
              <span className={`text-[11px] md:text-xs font-semibold leading-tight transition-colors ${
                isSelected ? 'text-blue-700 font-bold' : 'text-slate-700 group-hover:text-slate-900'
              }`}>
                {spec.name}
              </span>
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {SPECIALTIES.length > INITIAL_VISIBLE && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-200 shadow-sm"
          >
            {showAll ? (
              <>Show Less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>View All {SPECIALTIES.length} Specialties <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
