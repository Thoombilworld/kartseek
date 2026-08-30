'use client';
import { useModuleTitle } from '@/hooks/useModuleTitle';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Search, MapPin, Video, Building2, ShieldCheck,
  ArrowRight, Sparkles, Phone, Clock, Star,
  Users, Stethoscope, ChevronRight, Activity,
  Filter, X, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import SpecialtyGrid, { SPECIALTIES } from '@/components/doctor/specialty-grid';
import HospitalCard, { type HospitalData } from '@/components/doctor/hospital-card';
import ClinicCard, { type ClinicData } from '@/components/doctor/clinic-card';
import DoctorCard, { type DoctorData } from '@/components/doctor/doctor-card';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { API_BASE_URL } from '@/lib/config/api-base';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const HOSPITALS: HospitalData[] = [
  {
    id: 'hsp-001', name: 'Apollo Heart & Multi-Speciality Hospital',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics'],
    location: 'Jubilee Hills, Hyderabad', distance: '2.3 km',
    rating: 4.9, reviewCount: 1240, isOpen: true, openHours: '24/7', doctorCount: 85,
    facilities: ['Emergency 24/7', 'ICU', 'Operation Theater', 'Pharmacy', 'Lab & Diagnostics', 'Ambulance', 'Parking', 'Cafeteria'],
  },
  {
    id: 'hsp-002', name: 'Fortis Memorial Research Institute',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&q=80',
    specialties: ['General Medicine', 'Dermatology', 'ENT', 'Gynecology'],
    location: 'Sector 44, Gurugram', distance: '4.1 km',
    rating: 4.8, reviewCount: 890, isOpen: true, openHours: '8AM – 10PM', doctorCount: 62,
    facilities: ['Emergency Care', 'Advanced Diagnostics', 'Pharmacy', 'Blood Bank', 'Physiotherapy', 'Cafeteria'],
  },
  {
    id: 'hsp-003', name: 'Max Super Speciality Hospital',
    image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&q=80',
    specialties: ['Cardiology', 'Gastroenterology', 'Pulmonology'],
    location: 'Saket, New Delhi', distance: '5.8 km',
    rating: 4.7, reviewCount: 720, isOpen: false, openHours: '8AM – 9PM', doctorCount: 45,
    facilities: ['Cath Lab', 'Endoscopy Suite', 'Pulmonary Lab', 'Pharmacy', 'Lab & Diagnostics', 'Parking'],
  },
  {
    id: 'hsp-004', name: 'AIIMS Wellness Center',
    image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&q=80',
    specialties: ['General Medicine', 'Psychiatry', 'Mental Health', 'Nephrology'],
    location: 'Ansari Nagar, New Delhi', distance: '6.2 km',
    rating: 4.9, reviewCount: 2100, isOpen: true, openHours: '24/7', doctorCount: 150,
    facilities: ['24/7 Emergency', 'Dialysis Unit', 'Mental Health Wing', 'Pharmacy', 'Lab', 'Parking'],
  },
  {
    id: 'hsp-005', name: 'Manipal Hospital — Whitefield',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&q=80',
    specialties: ['Orthopedics', 'Urology', 'Oncology', 'Physiotherapy'],
    location: 'Whitefield, Bangalore', distance: '3.5 km',
    rating: 4.8, reviewCount: 960, isOpen: true, openHours: '8AM – 10PM', doctorCount: 70,
    facilities: ['Operation Theater', 'Physiotherapy Unit', 'Chemotherapy Ward', 'Pharmacy', 'Lab', 'Ambulance'],
  },
  {
    id: 'hsp-006', name: 'Narayana Hrudayalaya',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80',
    specialties: ['Cardiology', 'Pulmonology', 'Diabetes Care'],
    location: 'Bommasandra, Bangalore', distance: '8.0 km',
    rating: 4.7, reviewCount: 1380, isOpen: true, openHours: '24/7', doctorCount: 95,
    facilities: ['Cardiac ICU', 'Cath Lab', 'Diabetes Center', 'Pharmacy', 'Emergency', 'Blood Bank'],
  },
];

const CLINICS: ClinicData[] = [
  {
    id: 'cln-001', name: 'SmileCare Dental Clinic',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=80',
    specialties: ['Dentistry', 'Orthodontics'], location: 'Koramangala, Bangalore', distance: '1.2 km',
    doctorCount: 4, todaySlots: 8, rating: 4.8, reviewCount: 340, nextSlot: 'Today 3:30 PM',
  },
  {
    id: 'cln-002', name: 'SkinFirst Dermatology Center',
    image: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=600&q=80',
    specialties: ['Dermatology', 'Skin & Hair', 'Cosmetology'], location: 'Andheri West, Mumbai', distance: '2.5 km',
    doctorCount: 3, todaySlots: 5, rating: 4.9, reviewCount: 520, nextSlot: 'Today 4:00 PM',
  },
  {
    id: 'cln-003', name: 'NeuroCare Wellness Clinic',
    image: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=600&q=80',
    specialties: ['Neurology', 'Psychiatry'], location: 'HSR Layout, Bangalore', distance: '3.0 km',
    doctorCount: 2, todaySlots: 3, rating: 4.7, reviewCount: 180, nextSlot: 'Tomorrow 10:00 AM',
  },
  {
    id: 'cln-004', name: 'Little Stars Pediatric Clinic',
    image: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=600&q=80',
    specialties: ['Pediatrics', 'Child Care', 'Vaccination'], location: 'Indiranagar, Bangalore', distance: '1.8 km',
    doctorCount: 3, todaySlots: 6, rating: 4.9, reviewCount: 410, nextSlot: 'Today 2:00 PM',
  },
  {
    id: 'cln-005', name: 'HeartBeat Cardiology Clinic',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&q=80',
    specialties: ['Cardiology', 'General Medicine'], location: 'Bandra West, Mumbai', distance: '2.1 km',
    doctorCount: 3, todaySlots: 4, rating: 4.8, reviewCount: 290, nextSlot: 'Today 5:00 PM',
  },
  {
    id: 'cln-006', name: 'FemCare Women\'s Health Clinic',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80',
    specialties: ['Gynecology', 'Obstetrics', 'Fertility'], location: 'JP Nagar, Bangalore', distance: '2.8 km',
    doctorCount: 4, todaySlots: 7, rating: 4.9, reviewCount: 460, nextSlot: 'Today 3:00 PM',
  },
  {
    id: 'cln-007', name: 'BoneStrong Orthopedic Clinic',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&q=80',
    specialties: ['Orthopedics', 'Physiotherapy', 'Sports Medicine'], location: 'Whitefield, Bangalore', distance: '4.0 km',
    doctorCount: 2, todaySlots: 5, rating: 4.6, reviewCount: 210, nextSlot: 'Tomorrow 9:00 AM',
  },
  {
    id: 'cln-008', name: 'MindWell Psychiatry Center',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
    specialties: ['Psychiatry', 'Mental Health', 'Psychology'], location: 'Koramangala, Bangalore', distance: '1.5 km',
    doctorCount: 3, todaySlots: 4, rating: 4.8, reviewCount: 320, nextSlot: 'Today 6:00 PM',
  },
];

const INDEPENDENT_DOCTORS: DoctorData[] = [
  {
    id: 'doc-001', name: 'Dr. Anjali Mehta', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    qualification: 'MBBS, MD (Medicine)', specialty: 'General Physician', experience: '15 years',
    fee: '₹500', rating: 4.9, reviewCount: 428, nextSlot: 'Today 4:30 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-002', name: 'Dr. Rahul Sharma', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    qualification: 'MBBS, MD, DM (Cardiology)', specialty: 'Cardiologist', experience: '18 years',
    fee: '₹1,200', rating: 4.9, reviewCount: 612, nextSlot: 'Today 5:00 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-003', name: 'Dr. Priya Desai', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80',
    qualification: 'BDS, MDS (Orthodontics)', specialty: 'Dentist', experience: '10 years',
    fee: '₹600', rating: 4.8, reviewCount: 356, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true,
    consultModes: ['in-person'],
  },
  {
    id: 'doc-004', name: 'Dr. Arjun Nair', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    qualification: 'MBBS, MS (Ortho)', specialty: 'Orthopedic', experience: '12 years',
    fee: '₹900', rating: 4.7, reviewCount: 280, nextSlot: 'Today 6:00 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-005', name: 'Dr. Meera Reddy', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80',
    qualification: 'MBBS, MD (Dermatology)', specialty: 'Dermatologist', experience: '8 years',
    fee: '₹700', rating: 4.8, reviewCount: 394, nextSlot: 'Today 3:00 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-006', name: 'Dr. Suresh Iyer', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80',
    qualification: 'MBBS, DM (Neurology)', specialty: 'Neurologist', experience: '20 years',
    fee: '₹1,500', rating: 4.9, reviewCount: 518, nextSlot: 'Tomorrow 11:00 AM', isAvailable: true,
    consultModes: ['in-person'],
  },
  {
    id: 'doc-007', name: 'Dr. Kavita Gupta', photo: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80',
    qualification: 'MBBS, MD (Gynecology)', specialty: 'Gynecologist', experience: '14 years',
    fee: '₹800', rating: 4.8, reviewCount: 490, nextSlot: 'Today 2:00 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-008', name: 'Dr. Vikram Patel', photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80',
    qualification: 'MBBS, MD (Pediatrics)', specialty: 'Pediatrician', experience: '11 years',
    fee: '₹650', rating: 4.7, reviewCount: 310, nextSlot: 'Today 4:00 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-009', name: 'Dr. Fatima Khan', photo: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80',
    qualification: 'MBBS, DM (Gastro)', specialty: 'Gastroenterologist', experience: '16 years',
    fee: '₹1,100', rating: 4.9, reviewCount: 370, nextSlot: 'Tomorrow 9:30 AM', isAvailable: true,
    consultModes: ['in-person'],
  },
  {
    id: 'doc-010', name: 'Dr. Sanjay Rao', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    qualification: 'MBBS, MS (ENT)', specialty: 'ENT Specialist', experience: '13 years',
    fee: '₹750', rating: 4.6, reviewCount: 245, nextSlot: 'Today 5:30 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
  {
    id: 'doc-011', name: 'Dr. Lakshmi Venkat', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '9 years',
    fee: '₹1,000', rating: 4.8, reviewCount: 310, nextSlot: 'Tomorrow 2:00 PM', isAvailable: true,
    consultModes: ['video'],
  },
  {
    id: 'doc-012', name: 'Dr. Arun Kumar', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    qualification: 'MBBS, DM (Endocrinology)', specialty: 'Diabetes Specialist', experience: '17 years',
    fee: '₹1,200', rating: 4.9, reviewCount: 420, nextSlot: 'Today 3:30 PM', isAvailable: true,
    consultModes: ['in-person', 'video'],
  },
];

// ─── Specialty → keyword mapping for filtering ────────────────────────────────

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  'general-physician':   ['General Physician', 'General Medicine'],
  'dentist':             ['Dentist', 'Dentistry', 'Dental', 'Orthodontics'],
  'dermatologist':       ['Dermatologist', 'Dermatology', 'Skin'],
  'gynecologist':        ['Gynecologist', 'Gynecology', 'Obstetrics'],
  'pediatrician':        ['Pediatrician', 'Pediatrics', 'Child'],
  'orthopedic':          ['Orthopedic', 'Orthopedics', 'Ortho'],
  'cardiologist':        ['Cardiologist', 'Cardiology', 'Heart'],
  'ent':                 ['ENT', 'ENT Specialist', 'Ear'],
  'neurologist':         ['Neurologist', 'Neurology', 'Neuro'],
  'ophthalmologist':     ['Ophthalmologist', 'Ophthalmology', 'Eye'],
  'psychiatrist':        ['Psychiatrist', 'Psychiatry', 'Mental Health'],
  'physiotherapist':     ['Physiotherapist', 'Physiotherapy'],
  'diabetes-care':       ['Diabetes', 'Diabetes Care', 'Diabetes Specialist', 'Endocrinology'],
  'gastroenterology':    ['Gastroenterology', 'Gastroenterologist', 'Gastro'],
  'urology':             ['Urology', 'Urologist'],
  'pulmonology':         ['Pulmonology', 'Pulmonologist'],
  'nephrology':          ['Nephrology', 'Nephrologist'],
  'oncology':            ['Oncology', 'Oncologist'],
  'fertility-specialist':['Fertility', 'Fertility Specialist', 'IVF'],
  'mental-health':       ['Mental Health', 'Psychiatry', 'Psychiatrist', 'Psychology'],
  'skin-hair':           ['Skin', 'Hair', 'Dermatology', 'Dermatologist'],
  'womens-health':       ["Women's Health", 'Gynecology', 'Gynecologist', 'Obstetrics'],
  'child-care':          ['Child Care', 'Pediatrics', 'Pediatrician'],
};

function matchesSpecialty(specialtyId: string, ...textFields: string[]): boolean {
  const keywords = SPECIALTY_KEYWORDS[specialtyId] || [];
  const combined = textFields.join(' ').toLowerCase();
  return keywords.some(kw => combined.toLowerCase().includes(kw.toLowerCase()));
}

// ─── Page Component ─────────────────────────────────────────────────────────────

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;

function useDoctorHome() {
  const [layout, setLayout] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchHome = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/layouts/doctor/homepage`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ? json.data : json;
        if (data && data.sections) {
          setLayout(data);
          setIsLive(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setIsLive(false);
  }, []);

  React.useEffect(() => {
    fetchHome();
    const interval = setInterval(fetchHome, 5000);
    return () => clearInterval(interval);
  }, [fetchHome]);

  return { layout, isLive, refresh: fetchHome };
}

export default function DoctorHome() {
  useModuleTitle('doctor');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Recommendation Engine ──
  const { forYou, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('doctor', null);

  const handleSpecialtySelect = useCallback((specId: string | null) => {
    setSelectedSpecialty(specId);
    if (specId && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  const selectedSpecialtyName = useMemo(() => {
    if (!selectedSpecialty) return null;
    return SPECIALTIES.find(s => s.id === selectedSpecialty)?.name ?? null;
  }, [selectedSpecialty]);

  // ── Filtered data ──
  const filteredHospitals = useMemo(() => {
    if (!selectedSpecialty) return HOSPITALS;
    return HOSPITALS.filter(h =>
      h.specialties.some(s => matchesSpecialty(selectedSpecialty, s))
    );
  }, [selectedSpecialty]);

  const filteredClinics = useMemo(() => {
    if (!selectedSpecialty) return CLINICS;
    return CLINICS.filter(c =>
      c.specialties.some(s => matchesSpecialty(selectedSpecialty, s))
    );
  }, [selectedSpecialty]);

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) return INDEPENDENT_DOCTORS;
    return INDEPENDENT_DOCTORS.filter(d =>
      matchesSpecialty(selectedSpecialty, d.specialty, d.qualification)
    );
  }, [selectedSpecialty]);

  const totalResults = filteredHospitals.length + filteredClinics.length + filteredDoctors.length;
  const { layout, isLive, refresh } = useDoctorHome();

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'hero_slider':
        return null; // Hero is hardcoded at the top for layout stability, but we could make it dynamic if needed
      case 'category_grid':
        return (
          <section key={section.id}>
            <SpecialtyGrid
              selectedSpecialty={selectedSpecialty}
              onSelect={handleSpecialtySelect}
            />
          </section>
        );
      case 'brand_promo':
        return (
          filteredHospitals.length > 0 && (
            <section key={section.id} id="hospitals-section">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    {selectedSpecialty ? `${selectedSpecialtyName} Hospitals` : (section.title || 'Featured Hospitals')}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Top-rated hospitals with verified specialists</p>
                </div>
              </div>

              <div className="card-grid-2-3">
                {filteredHospitals.map((h) => (
                  <HospitalCard key={h.id} hospital={h} />
                ))}
              </div>
            </section>
          )
        );
      case 'product_carousel':
        return (
          filteredDoctors.length > 0 && (
            <section key={section.id} id="doctors-section">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-indigo-600" />
                    {selectedSpecialty ? `${selectedSpecialtyName} Doctors` : (section.title || 'Independent Doctors')}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Book verified doctors for personal consultations</p>
                </div>
              </div>

              <div className="card-grid-2-3">
                {filteredDoctors.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
            </section>
          )
        );
      case 'trust_badges':
        return (
          <section key={section.id} className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">{section.title || 'Why Patients Trust KARTSEEK Health'}</h2>
              <p className="text-slate-400 text-sm md:text-base mb-8">
                We verify every doctor, hospital, and clinic on our platform. Your health journey starts with trust.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { icon: ShieldCheck, label: 'Verified Doctors', value: '100%' },
                  { icon: Star, label: 'Avg. Rating', value: '4.8★' },
                  { icon: Clock, label: 'Avg. Wait Time', value: '<15 min' },
                  { icon: Users, label: 'Daily Consultations', value: '10K+' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <stat.icon className="w-5 h-5 text-teal-400" />
                    </div>
                    <p className="text-xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      default:
        return (
          filteredClinics.length > 0 && (
            <section key={section.id} id="clinics-section">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Activity className="w-6 h-6 text-teal-600" />
                    {selectedSpecialty ? `${selectedSpecialtyName} Clinics` : (section.title || 'Available Clinics')}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Specialized clinics with same-day appointments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredClinics.map((c) => (
                  <ClinicCard key={c.id} clinic={c} />
                ))}
              </div>
            </section>
          )
        );
    }
  };

  return (
    <div className="bg-linear-to-b from-slate-50 via-white to-slate-50 min-h-screen pb-8">

      {/* ─── Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative bg-linear-to-br from-blue-600 via-blue-700 to-teal-600 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-10 md:py-16">
          {/* Mobile Search */}
          <div className="md:hidden mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search doctors, hospitals, specialties..."
                className="w-full pl-11 pr-4 py-3.5 bg-white/95 backdrop-blur-sm rounded-2xl outline-none focus:ring-2 focus:ring-white/50 text-sm text-slate-800 placeholder-slate-400 shadow-lg"
              />
              <Search className="w-5 h-5 text-blue-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6 border border-white/20">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">Trusted Healthcare</span>
              </div>
              <h1 className="hero-title text-white leading-tight mb-3 tracking-tight">
                Your Health,<br />
                <span className="text-teal-300">Our Priority</span>
              </h1>
              <p className="hero-subtitle text-blue-100 mb-6 leading-relaxed max-w-lg">
                Find the best doctors, hospitals & clinics near you. Book confirmed appointments — online or in-person — in just a few clicks.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 md:gap-10">
                <div>
                  <p className="text-2xl md:text-3xl font-black text-white">5,000+</p>
                  <p className="text-xs text-blue-200 font-medium">Verified Doctors</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-black text-white">500+</p>
                  <p className="text-xs text-blue-200 font-medium">Hospitals & Clinics</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-black text-white">2M+</p>
                  <p className="text-xs text-blue-200 font-medium">Happy Patients</p>
                </div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button onClick={() => handleSpecialtySelect(null)} className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 md:p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer text-left">
                <div className="w-12 h-12 bg-teal-400/20 rounded-xl flex items-center justify-center mb-3">
                  <Video className="w-6 h-6 text-teal-300" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Video Consult</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Talk to a doctor online within 15 mins</p>
              </button>

              <button onClick={() => handleSpecialtySelect(null)} className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 md:p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer text-left">
                <div className="w-12 h-12 bg-blue-400/20 rounded-xl flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-blue-200" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Hospital Visit</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Book walk-in appointment nearby</p>
              </button>

              <button onClick={() => handleSpecialtySelect(null)} className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 md:p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer text-left">
                <div className="w-12 h-12 bg-red-400/20 rounded-xl flex items-center justify-center mb-3">
                  <Phone className="w-6 h-6 text-red-300" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Emergency</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Instant connect with specialists</p>
              </button>

              <button onClick={() => handleSpecialtySelect(null)} className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 md:p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer text-left">
                <div className="w-12 h-12 bg-purple-400/20 rounded-xl flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-purple-300" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Second Opinion</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Expert verification of diagnosis</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 space-y-10 mt-6 md:mt-12 pb-mobile-nav">

        {isLive && (
          <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-3 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">Live sync active</span>
              <span className="text-blue-500">— Data updates in real time</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        )}

        {/* ─── Specialty Filter ───────────────────────────────────── */}
        <section>
          <SpecialtyGrid
            selectedSpecialty={selectedSpecialty}
            onSelect={handleSpecialtySelect}
          />
        </section>

        {/* ─── Filter Results Header ──────────────────────────────── */}
        {selectedSpecialty && (
          <div ref={resultsRef} className="flex items-center justify-between bg-blue-50 border border-blue-200/60 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Filter className="w-4 h-4" />
              <span className="font-bold">Showing results for:</span>
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{selectedSpecialtyName}</span>
              <span className="text-blue-600">— {totalResults} result{totalResults !== 1 ? 's' : ''} found</span>
            </div>
            <button
              onClick={() => handleSpecialtySelect(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* ─── Hospitals ──────────────────────────────────────────── */}
        {filteredHospitals.length > 0 && (
          <section id="hospitals-section">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  {selectedSpecialty ? `${selectedSpecialtyName} Hospitals` : 'Featured Hospitals'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Top-rated hospitals with verified specialists</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHospitals.map((h) => (
                <HospitalCard key={h.id} hospital={h} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Clinics ────────────────────────────────────────────── */}
        {filteredClinics.length > 0 && (
          <section id="clinics-section">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-6 h-6 text-teal-600" />
                  {selectedSpecialty ? `${selectedSpecialtyName} Clinics` : 'Available Clinics'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Specialized clinics with same-day appointments</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredClinics.map((c) => (
                <ClinicCard key={c.id} clinic={c} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Independent Doctors ────────────────────────────────── */}
        {filteredDoctors.length > 0 && (
          <section id="doctors-section">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Stethoscope className="w-6 h-6 text-indigo-600" />
                  {selectedSpecialty ? `${selectedSpecialtyName} Doctors` : 'Independent Doctors'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Book verified doctors for personal consultations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDoctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          </section>
        )}

        {/* ══ 🧠 RECOMMENDED FOR YOU (recommendation engine) ══ */}
        <RecommendationCarousel
          title="Recommended Specialists"
          icon="🩺"
          recommendations={forYou}
          module="doctor"
          isLoading={recoLoading}
          onCardClick={trackClick}
        />

        {/* ══ ✨ EXPLORE OTHER SERVICES ══ */}
        <CrossModulePicks
          recommendations={crossModule}
          currentModule="doctor"
          onCardClick={trackClick}
        />

        {/* ─── Trust Banner ────────────────────────────────────────── */}
        <section className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">Why Patients Trust KARTSEEK Health</h2>
            <p className="text-slate-400 text-sm md:text-base mb-8">
              We verify every doctor, hospital, and clinic on our platform. Your health journey starts with trust.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: ShieldCheck, label: 'Verified Doctors', value: '100%' },
                { icon: Star, label: 'Avg. Rating', value: '4.8★' },
                { icon: Clock, label: 'Avg. Wait Time', value: '<15 min' },
                { icon: Users, label: 'Daily Consultations', value: '10K+' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
