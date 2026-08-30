import React from 'react';
import Link from 'next/link';
import { Star, MapPin, Clock, Users, ChevronRight, Building2, ShieldCheck } from 'lucide-react';

export interface HospitalData {
  id: string;
  name: string;
  image: string;
  specialties: string[];
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  openHours?: string;
  doctorCount: number;
  facilities?: string[];
}

interface HospitalCardProps {
  hospital: HospitalData;
}

export default function HospitalCard({ hospital }: HospitalCardProps) {
  return (
    <Link
      href={`/hospital/${hospital.id}`}
      id={`hospital-card-${hospital.id}`}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 block"
    >
      {/* Hospital Image */}
      <div className="relative h-44 md:h-48 overflow-hidden">
        <img
          src={hospital.image}
          alt={hospital.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-sm ${
            hospital.isOpen
              ? 'bg-emerald-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hospital.isOpen ? 'bg-white animate-pulse' : 'bg-white/70'}`} />
            {hospital.isOpen ? 'Open Now' : 'Closed'}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-900">{hospital.rating}</span>
            <span className="text-[10px] text-slate-400">({hospital.reviewCount})</span>
          </div>
        </div>

        {/* Hospital Name Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white leading-tight drop-shadow-md">{hospital.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 space-y-3">
        {/* Location & Distance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 min-w-0 flex-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-sm truncate">{hospital.location}</span>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
            {hospital.distance}
          </span>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1.5">
          {hospital.specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              {s}
            </span>
          ))}
          {hospital.specialties.length > 3 && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              +{hospital.specialties.length - 3} more
            </span>
          )}
        </div>

        {/* Facilities */}
        {hospital.facilities && hospital.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hospital.facilities.slice(0, 4).map((f) => (
              <span key={f} className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> {f}
              </span>
            ))}
            {hospital.facilities.length > 4 && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                +{hospital.facilities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Doctors & Hours */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">{hospital.doctorCount}</span>
            <span className="text-slate-400">Doctors</span>
          </div>
          {hospital.openHours && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {hospital.openHours}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-2 w-full bg-linear-to-r from-blue-600 to-blue-700 group-hover:from-blue-700 group-hover:to-blue-800 text-white font-bold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm shadow-blue-200/50 group-hover:shadow-md group-hover:shadow-blue-300/40">
          <Building2 className="w-4 h-4" />
          View Hospital
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
