'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star, MapPin, Clock, Users, Building2, Phone, ChevronLeft,
  ShieldCheck, Calendar, Stethoscope, Award, ChevronRight,
} from 'lucide-react';
import DoctorCard, { type DoctorData } from '@/components/doctor/doctor-card';

// ─── Hospital Database ──────────────────────────────────────────────────────────

interface HospitalDetail {
  id: string;
  name: string;
  image: string;
  specialties: string[];
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  openHours: string;
  doctorCount: number;
  phone: string;
  about: string;
  facilities: string[];
}

const HOSPITALS: Record<string, HospitalDetail> = {
  'hsp-001': {
    id: 'hsp-001', name: 'Apollo Heart & Multi-Speciality Hospital',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics'],
    location: 'Jubilee Hills, Hyderabad', distance: '2.3 km',
    rating: 4.9, reviewCount: 1240, isOpen: true, openHours: '24/7', doctorCount: 85,
    phone: '+91 40 2345 6789',
    about: 'Apollo Heart & Multi-Speciality Hospital is a premier healthcare institution offering world-class medical care across multiple disciplines. With state-of-the-art infrastructure and a team of renowned specialists, we are committed to delivering exceptional patient outcomes.',
    facilities: ['Emergency 24/7', 'ICU', 'Operation Theater', 'Pharmacy', 'Lab & Diagnostics', 'Ambulance', 'Parking', 'Cafeteria'],
  },
  'hsp-002': {
    id: 'hsp-002', name: 'Fortis Memorial Research Institute',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80',
    specialties: ['General Medicine', 'Dermatology', 'ENT', 'Gynecology'],
    location: 'Sector 44, Gurugram', distance: '4.1 km',
    rating: 4.8, reviewCount: 890, isOpen: true, openHours: '8AM – 10PM', doctorCount: 62,
    phone: '+91 124 456 7890',
    about: 'Fortis Memorial Research Institute is a multi-super speciality, quaternary care hospital committed to the mission of saving and enriching lives through healthcare.',
    facilities: ['Emergency Care', 'Advanced Diagnostics', 'Pharmacy', 'Blood Bank', 'Physiotherapy', 'Cafeteria'],
  },
  'hsp-003': {
    id: 'hsp-003', name: 'Max Super Speciality Hospital',
    image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80',
    specialties: ['Cardiology', 'Gastroenterology', 'Pulmonology'],
    location: 'Saket, New Delhi', distance: '5.8 km',
    rating: 4.7, reviewCount: 720, isOpen: false, openHours: '8AM – 9PM', doctorCount: 45,
    phone: '+91 11 2345 6789',
    about: 'Max Super Speciality Hospital is a leading healthcare provider offering comprehensive medical services with a focus on cardiac care, gastroenterology, and pulmonary medicine.',
    facilities: ['Cath Lab', 'Endoscopy Suite', 'Pulmonary Lab', 'Pharmacy', 'Lab & Diagnostics', 'Parking'],
  },
  'hsp-004': {
    id: 'hsp-004', name: 'AIIMS Wellness Center',
    image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&q=80',
    specialties: ['General Medicine', 'Psychiatry', 'Mental Health', 'Nephrology'],
    location: 'Ansari Nagar, New Delhi', distance: '6.2 km',
    rating: 4.9, reviewCount: 2100, isOpen: true, openHours: '24/7', doctorCount: 150,
    phone: '+91 11 2658 8500',
    about: 'AIIMS Wellness Center is the outpatient wellness wing of the All India Institute of Medical Sciences, providing premium healthcare services across various specialties.',
    facilities: ['24/7 Emergency', 'Dialysis Unit', 'Mental Health Wing', 'Pharmacy', 'Lab', 'Parking'],
  },
  'hsp-005': {
    id: 'hsp-005', name: 'Manipal Hospital — Whitefield',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&q=80',
    specialties: ['Orthopedics', 'Urology', 'Oncology', 'Physiotherapy'],
    location: 'Whitefield, Bangalore', distance: '3.5 km',
    rating: 4.8, reviewCount: 960, isOpen: true, openHours: '8AM – 10PM', doctorCount: 70,
    phone: '+91 80 2345 6789',
    about: 'Manipal Hospital Whitefield is a leading multi-speciality hospital offering advanced surgical and medical care with a focus on orthopedics, urology, and oncology.',
    facilities: ['Operation Theater', 'Physiotherapy Unit', 'Chemotherapy Ward', 'Pharmacy', 'Lab', 'Ambulance'],
  },
  'hsp-006': {
    id: 'hsp-006', name: 'Narayana Hrudayalaya',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    specialties: ['Cardiology', 'Pulmonology', 'Diabetes Care'],
    location: 'Bommasandra, Bangalore', distance: '8.0 km',
    rating: 4.7, reviewCount: 1380, isOpen: true, openHours: '24/7', doctorCount: 95,
    phone: '+91 80 7122 2222',
    about: 'Narayana Hrudayalaya is one of India\'s leading cardiac care hospitals, known for affordable and accessible heart care along with expertise in pulmonology and diabetes management.',
    facilities: ['Cardiac ICU', 'Cath Lab', 'Diabetes Center', 'Pharmacy', 'Emergency', 'Blood Bank'],
  },
};

// ─── Doctors per Hospital ────────────────────────────────────────────────────────

const HOSPITAL_DOCTORS: Record<string, DoctorData[]> = {
  'hsp-001': [
    { id: 'h1-d1', name: 'Dr. Sunil Kapoor', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '22 years', fee: '₹1,500', rating: 4.9, reviewCount: 680, nextSlot: 'Today 3:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h1-d2', name: 'Dr. Neha Joshi', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, DM (Neurology)', specialty: 'Neurologist', experience: '16 years', fee: '₹1,200', rating: 4.8, reviewCount: 420, nextSlot: 'Today 4:30 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h1-d3', name: 'Dr. Rajesh Verma', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, MS (Ortho)', specialty: 'Orthopedic', experience: '14 years', fee: '₹1,000', rating: 4.7, reviewCount: 310, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h1-d4', name: 'Dr. Priya Menon', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', qualification: 'MBBS, MD (Oncology)', specialty: 'Oncologist', experience: '18 years', fee: '₹2,000', rating: 4.9, reviewCount: 540, nextSlot: 'Today 5:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h1-d5', name: 'Dr. Amit Sinha', photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80', qualification: 'MBBS, MD (Pediatrics)', specialty: 'Pediatrician', experience: '12 years', fee: '₹800', rating: 4.8, reviewCount: 290, nextSlot: 'Today 6:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h1-d6', name: 'Dr. Kavita Rao', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '10 years', fee: '₹1,100', rating: 4.7, reviewCount: 210, nextSlot: 'Tomorrow 11:00 AM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'hsp-002': [
    { id: 'h2-d1', name: 'Dr. Anita Sharma', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MD (Medicine)', specialty: 'General Physician', experience: '20 years', fee: '₹600', rating: 4.8, reviewCount: 510, nextSlot: 'Today 2:30 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h2-d2', name: 'Dr. Rohan Gupta', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD (Dermatology)', specialty: 'Dermatologist', experience: '11 years', fee: '₹900', rating: 4.7, reviewCount: 340, nextSlot: 'Today 4:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h2-d3', name: 'Dr. Seema Malik', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', qualification: 'MBBS, MS (ENT)', specialty: 'ENT Specialist', experience: '15 years', fee: '₹800', rating: 4.8, reviewCount: 280, nextSlot: 'Tomorrow 9:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h2-d4', name: 'Dr. Deepa Nair', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'MBBS, MD (Gynecology)', specialty: 'Gynecologist', experience: '18 years', fee: '₹1,000', rating: 4.9, reviewCount: 460, nextSlot: 'Today 5:30 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'hsp-003': [
    { id: 'h3-d1', name: 'Dr. Vikram Singh', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '25 years', fee: '₹1,800', rating: 4.9, reviewCount: 720, nextSlot: 'Today 3:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h3-d2', name: 'Dr. Rekha Iyer', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, DM (Gastro)', specialty: 'Gastroenterologist', experience: '17 years', fee: '₹1,200', rating: 4.8, reviewCount: 380, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h3-d3', name: 'Dr. Arun Mishra', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', qualification: 'MBBS, DM (Pulmonology)', specialty: 'Pulmonologist', experience: '14 years', fee: '₹1,000', rating: 4.7, reviewCount: 260, nextSlot: 'Today 6:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h3-d4', name: 'Dr. Pooja Reddy', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '9 years', fee: '₹1,000', rating: 4.6, reviewCount: 180, nextSlot: 'Tomorrow 2:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'hsp-004': [
    { id: 'h4-d1', name: 'Dr. Ramesh Chandra', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD (Medicine)', specialty: 'General Physician', experience: '28 years', fee: '₹500', rating: 4.9, reviewCount: 890, nextSlot: 'Today 2:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h4-d2', name: 'Dr. Sunita Banerjee', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '20 years', fee: '₹1,200', rating: 4.8, reviewCount: 510, nextSlot: 'Today 4:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h4-d3', name: 'Dr. Manoj Kumar', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, DM (Nephrology)', specialty: 'Nephrologist', experience: '15 years', fee: '₹1,400', rating: 4.7, reviewCount: 340, nextSlot: 'Tomorrow 11:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h4-d4', name: 'Dr. Lakshmi Pillai', photo: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80', qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '12 years', fee: '₹1,000', rating: 4.8, reviewCount: 290, nextSlot: 'Today 5:30 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'hsp-005': [
    { id: 'h5-d1', name: 'Dr. Karthik Naidu', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, MS (Ortho)', specialty: 'Orthopedic', experience: '19 years', fee: '₹1,200', rating: 4.9, reviewCount: 480, nextSlot: 'Today 3:30 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h5-d2', name: 'Dr. Aditi Kulkarni', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', qualification: 'MBBS, MCh (Urology)', specialty: 'Urologist', experience: '14 years', fee: '₹1,100', rating: 4.7, reviewCount: 310, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h5-d3', name: 'Dr. Suresh Patil', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', qualification: 'MBBS, MD (Oncology)', specialty: 'Oncologist', experience: '16 years', fee: '₹1,500', rating: 4.8, reviewCount: 390, nextSlot: 'Today 5:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h5-d4', name: 'Dr. Meghana Rao', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'BPT, MPT (Physio)', specialty: 'Physiotherapist', experience: '8 years', fee: '₹600', rating: 4.6, reviewCount: 180, nextSlot: 'Today 4:00 PM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'hsp-006': [
    { id: 'h6-d1', name: 'Dr. Devi Prasad', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '30 years', fee: '₹2,000', rating: 4.9, reviewCount: 1200, nextSlot: 'Today 2:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h6-d2', name: 'Dr. Ashwin Kumar', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, DM (Pulmonology)', specialty: 'Pulmonologist', experience: '18 years', fee: '₹1,200', rating: 4.8, reviewCount: 450, nextSlot: 'Today 4:30 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'h6-d3', name: 'Dr. Preethi Nair', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, DM (Endocrinology)', specialty: 'Diabetes Specialist', experience: '15 years', fee: '₹1,100', rating: 4.8, reviewCount: 380, nextSlot: 'Tomorrow 9:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'h6-d4', name: 'Dr. Ravi Shankar', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '12 years', fee: '₹1,000', rating: 4.7, reviewCount: 220, nextSlot: 'Today 6:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
};

// ─── Page Component ─────────────────────────────────────────────────────────────

export default function HospitalProfilePage() {
  const params = useParams();
  const hospitalId = params.id as string;
  const hospital = HOSPITALS[hospitalId];
  const doctors = HOSPITAL_DOCTORS[hospitalId] || [];

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) return doctors;
    return doctors.filter(d =>
      d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
      d.qualification.toLowerCase().includes(selectedSpecialty.toLowerCase())
    );
  }, [selectedSpecialty, doctors]);

  if (!hospital) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl mb-4 block">🏥</span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Hospital Not Found</h1>
        <p className="text-slate-500 mb-6">The hospital you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/doctor" className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">
          Back to Health Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen pb-24">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img src={hospital.image} alt={hospital.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link href="/doctor" className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-sm ${
            hospital.isOpen ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hospital.isOpen ? 'bg-white animate-pulse' : 'bg-white/70'}`} />
            {hospital.isOpen ? 'Open Now' : 'Closed'}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">{hospital.name}</h1>
          <div className="flex items-center gap-3 text-white/90 text-sm">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hospital.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {hospital.openHours}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">

        {/* ── Quick Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xl font-black text-slate-900">{hospital.rating}</span>
            </div>
            <p className="text-xs text-slate-500">{hospital.reviewCount} reviews</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-slate-900 mb-1">{doctors.length}</p>
            <p className="text-xs text-slate-500">Doctors</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-slate-900 mb-1">{hospital.specialties.length}</p>
            <p className="text-xs text-slate-500">Specialties</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-blue-600 mb-1 flex items-center justify-center gap-1"><Phone className="w-4 h-4" /></p>
            <p className="text-xs text-slate-500">Call Hospital</p>
          </div>
        </div>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> About
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">{hospital.about}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {hospital.facilities.map(f => (
              <span key={f} className="text-xs font-medium bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> {f}
              </span>
            ))}
          </div>
        </div>

        {/* ── Specializations ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" /> Specializations
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSpecialty(null)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                !selectedSpecialty
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              All Doctors ({doctors.length})
            </button>
            {hospital.specialties.map(spec => {
              const count = doctors.filter(d =>
                d.specialty.toLowerCase().includes(spec.toLowerCase()) ||
                d.qualification.toLowerCase().includes(spec.toLowerCase())
              ).length;
              const isActive = selectedSpecialty === spec;
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(isActive ? null : spec)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {spec} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Doctors ──────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              {selectedSpecialty ? `${selectedSpecialty} Doctors` : 'All Doctors'}
              <span className="text-sm font-normal text-slate-500">({filteredDoctors.length})</span>
            </h2>
          </div>

          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDoctors.map(d => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="text-4xl mb-3 block">👨‍⚕️</span>
              <p className="font-bold text-slate-900 mb-1">No doctors found for {selectedSpecialty}</p>
              <p className="text-sm text-slate-500">Try selecting a different specialty</p>
              <button onClick={() => setSelectedSpecialty(null)} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                View All Doctors
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
