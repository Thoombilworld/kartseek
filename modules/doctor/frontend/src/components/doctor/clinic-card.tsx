import React from 'react';
import Link from 'next/link';
import { Star, MapPin, Clock, Users, Calendar, Stethoscope, ChevronRight } from 'lucide-react';

export interface ClinicData {
  id: string;
  name: string;
  image: string;
  specialties: string[];
  location: string;
  distance: string;
  doctorCount: number;
  todaySlots: number;
  rating: number;
  reviewCount: number;
  nextSlot?: string;
}

interface ClinicCardProps {
  clinic: ClinicData;
}

export default function ClinicCard({ clinic }: ClinicCardProps) {
  return (
    <Link
      href={`/clinic/${clinic.id}`}
      id={`clinic-card-${clinic.id}`}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 block"
    >
      {/* Clinic Image */}
      <div className="relative h-40 md:h-44 overflow-hidden">
        <img
          src={clinic.image}
          alt={clinic.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

        {/* Specialties Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {clinic.specialties.slice(0, 2).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold text-teal-700 shadow-sm">
              <Stethoscope className="w-2.5 h-2.5" />
              {s}
            </span>
          ))}
          {clinic.specialties.length > 2 && (
            <span className="px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
              +{clinic.specialties.length - 2}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-900">{clinic.rating}</span>
          </div>
        </div>

        {/* Clinic Name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-bold text-white leading-tight drop-shadow-md">{clinic.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 min-w-0 flex-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-sm truncate">{clinic.location}</span>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
            {clinic.distance}
          </span>
        </div>

        {/* Doctors & Slots */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">{clinic.doctorCount}</span>
            <span className="text-slate-400">Doctors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600">{clinic.todaySlots} slots today</span>
          </div>
        </div>

        {/* Next Slot */}
        {clinic.nextSlot && (
          <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Next available: {clinic.nextSlot}</span>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-center gap-2 w-full bg-linear-to-r from-teal-600 to-teal-700 group-hover:from-teal-700 group-hover:to-teal-800 text-white font-bold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm shadow-teal-200/50 group-hover:shadow-md group-hover:shadow-teal-300/40">
          View Clinic
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
