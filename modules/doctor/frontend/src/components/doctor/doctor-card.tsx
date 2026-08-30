import React from 'react';
import Link from 'next/link';
import { Star, Clock, Award, ShieldCheck, Calendar, ChevronRight } from 'lucide-react';

export interface DoctorData {
  id: string;
  name: string;
  photo: string;
  qualification: string;
  specialty: string;
  experience: string;
  fee: string;
  rating: number;
  reviewCount: number;
  nextSlot?: string;
  isAvailable: boolean;
  consultModes: ('in-person' | 'video')[];
}

interface DoctorCardProps {
  doctor: DoctorData;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div
      id={`doctor-card-${doctor.id}`}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="p-5 md:p-6">
        {/* Doctor Header */}
        <div className="flex gap-4">
          {/* Photo */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-blue-100 shadow-sm">
              <img
                src={doctor.photo}
                alt={doctor.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            {doctor.isAvailable && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-slate-900 truncate">{doctor.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{doctor.qualification}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{doctor.rating}</span>
              </div>
            </div>

            {/* Specialty & Experience */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                {doctor.specialty}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Award className="w-3 h-3 text-slate-400" />
                {doctor.experience}
              </span>
            </div>

            {/* Reviews */}
            <p className="text-[11px] text-slate-400 mt-1.5">{doctor.reviewCount} verified reviews</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-100 my-4" />

        {/* Fee & Availability */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Consultation Fee</p>
            <p className="text-xl font-black text-slate-900">{doctor.fee}</p>
          </div>

          {doctor.nextSlot && (
            <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{doctor.nextSlot}</span>
            </div>
          )}
        </div>

        {/* Consult Modes */}
        <div className="flex items-center gap-2 mb-4">
          {doctor.consultModes.includes('in-person') && (
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
              🏥 In-Person
            </span>
          )}
          {doctor.consultModes.includes('video') && (
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
              📱 Video Consult
            </span>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/profile/${doctor.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-all duration-200 border border-slate-200"
          >
            View Profile
          </Link>
          <Link
            href={`/book/${doctor.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm shadow-blue-200/50 hover:shadow-md hover:shadow-blue-300/40"
          >
            <Calendar className="w-4 h-4" />
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
