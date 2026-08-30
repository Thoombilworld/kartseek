'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star, MapPin, Clock, Users, Phone, ChevronLeft,
  ShieldCheck, Calendar, Stethoscope, Award, Activity,
} from 'lucide-react';
import DoctorCard, { type DoctorData } from '@/components/doctor/doctor-card';

// ─── Clinic Database ─────────────────────────────────────────────────────────────

interface ClinicDetail {
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
  nextSlot: string;
  phone: string;
  about: string;
  services: string[];
  workingHours: { day: string; time: string; active: boolean }[];
}

const CLINICS: Record<string, ClinicDetail> = {
  'cln-001': {
    id: 'cln-001', name: 'SmileCare Dental Clinic',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    specialties: ['Dentistry', 'Orthodontics'],
    location: 'Koramangala, Bangalore', distance: '1.2 km',
    doctorCount: 4, todaySlots: 8, rating: 4.8, reviewCount: 340, nextSlot: 'Today 3:30 PM',
    phone: '+91 80 4567 8901',
    about: 'SmileCare Dental Clinic is a modern dental practice offering comprehensive dental services from routine check-ups to advanced orthodontics. We use state-of-the-art equipment and follow international sterilization protocols.',
    services: ['Teeth Cleaning', 'Root Canal', 'Dental Implants', 'Braces & Aligners', 'Teeth Whitening', 'Gum Treatment', 'Wisdom Tooth Extraction'],
    workingHours: [{ day: 'Mon - Sat', time: '9:00 AM - 8:00 PM', active: true }, { day: 'Sunday', time: '10:00 AM - 2:00 PM', active: true }],
  },
  'cln-002': {
    id: 'cln-002', name: 'SkinFirst Dermatology Center',
    image: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800&q=80',
    specialties: ['Dermatology', 'Skin & Hair', 'Cosmetology'],
    location: 'Andheri West, Mumbai', distance: '2.5 km',
    doctorCount: 3, todaySlots: 5, rating: 4.9, reviewCount: 520, nextSlot: 'Today 4:00 PM',
    phone: '+91 22 3456 7890',
    about: 'SkinFirst Dermatology Center specializes in comprehensive skincare, hair treatment, and cosmetic dermatology. Our expert dermatologists provide personalized treatment plans using the latest technology.',
    services: ['Acne Treatment', 'Hair Loss Treatment', 'Laser Therapy', 'Chemical Peels', 'Anti-Aging', 'Skin Biopsy', 'Mole Removal'],
    workingHours: [{ day: 'Mon - Fri', time: '10:00 AM - 7:00 PM', active: true }, { day: 'Saturday', time: '10:00 AM - 4:00 PM', active: true }, { day: 'Sunday', time: 'Closed', active: false }],
  },
  'cln-003': {
    id: 'cln-003', name: 'NeuroCare Wellness Clinic',
    image: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80',
    specialties: ['Neurology', 'Psychiatry'],
    location: 'HSR Layout, Bangalore', distance: '3.0 km',
    doctorCount: 2, todaySlots: 3, rating: 4.7, reviewCount: 180, nextSlot: 'Tomorrow 10:00 AM',
    phone: '+91 80 5678 9012',
    about: 'NeuroCare Wellness Clinic provides specialized care for neurological and psychiatric conditions. We offer comprehensive diagnostic and therapeutic services in a patient-friendly environment.',
    services: ['EEG', 'EMG/NCV', 'Headache & Migraine', 'Epilepsy Management', 'Stroke Rehab', 'Counseling', 'CBT Therapy'],
    workingHours: [{ day: 'Mon - Fri', time: '10:00 AM - 6:00 PM', active: true }, { day: 'Saturday', time: '10:00 AM - 2:00 PM', active: true }, { day: 'Sunday', time: 'Closed', active: false }],
  },
  'cln-004': {
    id: 'cln-004', name: 'Little Stars Pediatric Clinic',
    image: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=800&q=80',
    specialties: ['Pediatrics', 'Child Care', 'Vaccination'],
    location: 'Indiranagar, Bangalore', distance: '1.8 km',
    doctorCount: 3, todaySlots: 6, rating: 4.9, reviewCount: 410, nextSlot: 'Today 2:00 PM',
    phone: '+91 80 6789 0123',
    about: 'Little Stars Pediatric Clinic is dedicated to children\'s health from newborn to adolescent care. Our warm, child-friendly environment and experienced pediatricians ensure the best care for your little ones.',
    services: ['Well-baby Checkups', 'Vaccinations', 'Growth Monitoring', 'Allergy Testing', 'Newborn Screening', 'Nutrition Counseling', 'Developmental Assessment'],
    workingHours: [{ day: 'Mon - Sat', time: '9:00 AM - 7:00 PM', active: true }, { day: 'Sunday', time: '10:00 AM - 1:00 PM', active: true }],
  },
  'cln-005': {
    id: 'cln-005', name: 'HeartBeat Cardiology Clinic',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80',
    specialties: ['Cardiology', 'General Medicine'],
    location: 'Bandra West, Mumbai', distance: '2.1 km',
    doctorCount: 3, todaySlots: 4, rating: 4.8, reviewCount: 290, nextSlot: 'Today 5:00 PM',
    phone: '+91 22 4567 8901',
    about: 'HeartBeat Cardiology Clinic offers expert cardiac care in a clinic setting. From preventive heart health to post-intervention follow-ups, our cardiologists provide personalized heart care.',
    services: ['ECG', 'Echocardiography', 'Treadmill Test', 'Holter Monitoring', 'Blood Pressure Management', 'Lipid Management', 'Heart Failure Management'],
    workingHours: [{ day: 'Mon - Fri', time: '9:00 AM - 6:00 PM', active: true }, { day: 'Saturday', time: '9:00 AM - 2:00 PM', active: true }, { day: 'Sunday', time: 'Closed', active: false }],
  },
  'cln-006': {
    id: 'cln-006', name: "FemCare Women's Health Clinic",
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    specialties: ['Gynecology', 'Obstetrics', 'Fertility'],
    location: 'JP Nagar, Bangalore', distance: '2.8 km',
    doctorCount: 4, todaySlots: 7, rating: 4.9, reviewCount: 460, nextSlot: 'Today 3:00 PM',
    phone: '+91 80 7890 1234',
    about: "FemCare Women's Health Clinic is a comprehensive women's healthcare center providing expert gynecological, obstetric, and fertility services. We are committed to supporting women at every stage of life.",
    services: ['Prenatal Care', 'Routine Gynecology', 'Fertility Assessment', 'IUI/IVF Counseling', 'Menopause Management', 'PCOD Treatment', 'Pap Smear'],
    workingHours: [{ day: 'Mon - Sat', time: '9:00 AM - 7:00 PM', active: true }, { day: 'Sunday', time: 'By Appointment', active: true }],
  },
  'cln-007': {
    id: 'cln-007', name: 'BoneStrong Orthopedic Clinic',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
    specialties: ['Orthopedics', 'Physiotherapy', 'Sports Medicine'],
    location: 'Whitefield, Bangalore', distance: '4.0 km',
    doctorCount: 2, todaySlots: 5, rating: 4.6, reviewCount: 210, nextSlot: 'Tomorrow 9:00 AM',
    phone: '+91 80 8901 2345',
    about: 'BoneStrong Orthopedic Clinic specializes in musculoskeletal care, sports injuries, and rehabilitation. Our integrated approach combines orthopedic expertise with physiotherapy for optimal recovery.',
    services: ['Fracture Care', 'Joint Replacement Consult', 'Sports Injury Rehab', 'Physiotherapy', 'Spine Care', 'Arthroscopy Consult', 'PRP Therapy'],
    workingHours: [{ day: 'Mon - Fri', time: '10:00 AM - 7:00 PM', active: true }, { day: 'Saturday', time: '10:00 AM - 3:00 PM', active: true }, { day: 'Sunday', time: 'Closed', active: false }],
  },
  'cln-008': {
    id: 'cln-008', name: 'MindWell Psychiatry Center',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    specialties: ['Psychiatry', 'Mental Health', 'Psychology'],
    location: 'Koramangala, Bangalore', distance: '1.5 km',
    doctorCount: 3, todaySlots: 4, rating: 4.8, reviewCount: 320, nextSlot: 'Today 6:00 PM',
    phone: '+91 80 9012 3456',
    about: 'MindWell Psychiatry Center offers compassionate mental healthcare services including psychiatric evaluation, therapy, and counseling. We create a safe, non-judgmental space for healing and growth.',
    services: ['Psychiatric Evaluation', 'CBT', 'Anxiety & Depression', 'Sleep Disorders', 'Addiction Counseling', 'Couple Therapy', 'Child Psychology'],
    workingHours: [{ day: 'Mon - Fri', time: '10:00 AM - 7:00 PM', active: true }, { day: 'Saturday', time: '10:00 AM - 4:00 PM', active: true }, { day: 'Sunday', time: 'Closed', active: false }],
  },
};

// ─── Doctors per Clinic ─────────────────────────────────────────────────────────

const CLINIC_DOCTORS: Record<string, DoctorData[]> = {
  'cln-001': [
    { id: 'c1-d1', name: 'Dr. Priya Desai', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', qualification: 'BDS, MDS (Orthodontics)', specialty: 'Orthodontist', experience: '10 years', fee: '₹600', rating: 4.8, reviewCount: 356, nextSlot: 'Today 3:30 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c1-d2', name: 'Dr. Karan Mehta', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'BDS, MDS (Prosthodontics)', specialty: 'Dentist', experience: '8 years', fee: '₹500', rating: 4.7, reviewCount: 240, nextSlot: 'Today 4:00 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c1-d3', name: 'Dr. Swati Kulkarni', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'BDS (General Dentistry)', specialty: 'Dentist', experience: '6 years', fee: '₹400', rating: 4.6, reviewCount: 180, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c1-d4', name: 'Dr. Nikhil Jain', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'BDS, MDS (Orthodontics)', specialty: 'Orthodontist', experience: '12 years', fee: '₹700', rating: 4.9, reviewCount: 420, nextSlot: 'Today 5:00 PM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'cln-002': [
    { id: 'c2-d1', name: 'Dr. Meera Reddy', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'MBBS, MD (Dermatology)', specialty: 'Dermatologist', experience: '8 years', fee: '₹700', rating: 4.9, reviewCount: 394, nextSlot: 'Today 4:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c2-d2', name: 'Dr. Anil Kapoor', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD (Dermatology), Fellowship (Cosmetology)', specialty: 'Cosmetologist', experience: '12 years', fee: '₹1,000', rating: 4.8, reviewCount: 310, nextSlot: 'Tomorrow 11:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c2-d3', name: 'Dr. Rashmi Verma', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MD (Dermatology), Trichology', specialty: 'Skin & Hair Specialist', experience: '6 years', fee: '₹600', rating: 4.7, reviewCount: 220, nextSlot: 'Today 5:30 PM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'cln-003': [
    { id: 'c3-d1', name: 'Dr. Suresh Iyer', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', qualification: 'MBBS, DM (Neurology)', specialty: 'Neurologist', experience: '20 years', fee: '₹1,500', rating: 4.9, reviewCount: 518, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c3-d2', name: 'Dr. Kavitha Murthy', photo: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80', qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '14 years', fee: '₹1,000', rating: 4.7, reviewCount: 280, nextSlot: 'Tomorrow 2:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'cln-004': [
    { id: 'c4-d1', name: 'Dr. Vikram Patel', photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80', qualification: 'MBBS, MD (Pediatrics)', specialty: 'Pediatrician', experience: '11 years', fee: '₹650', rating: 4.9, reviewCount: 310, nextSlot: 'Today 2:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c4-d2', name: 'Dr. Asha Gopal', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, DCH (Child Health)', specialty: 'Child Care Specialist', experience: '8 years', fee: '₹500', rating: 4.7, reviewCount: 190, nextSlot: 'Today 4:30 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c4-d3', name: 'Dr. Rahul Bhat', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD (Pediatrics), IAP Vaccination', specialty: 'Pediatrician', experience: '15 years', fee: '₹800', rating: 4.8, reviewCount: 370, nextSlot: 'Tomorrow 9:00 AM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'cln-005': [
    { id: 'c5-d1', name: 'Dr. Rahul Sharma', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD, DM (Cardiology)', specialty: 'Cardiologist', experience: '18 years', fee: '₹1,200', rating: 4.9, reviewCount: 612, nextSlot: 'Today 5:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c5-d2', name: 'Dr. Anjali Mehta', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MD (Medicine)', specialty: 'General Physician', experience: '15 years', fee: '₹500', rating: 4.8, reviewCount: 428, nextSlot: 'Today 6:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c5-d3', name: 'Dr. Sanjay Puri', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, DM (Cardiology)', specialty: 'Cardiologist', experience: '10 years', fee: '₹900', rating: 4.7, reviewCount: 250, nextSlot: 'Tomorrow 10:30 AM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'cln-006': [
    { id: 'c6-d1', name: 'Dr. Kavita Gupta', photo: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80', qualification: 'MBBS, MD (Gynecology)', specialty: 'Gynecologist', experience: '14 years', fee: '₹800', rating: 4.9, reviewCount: 490, nextSlot: 'Today 3:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c6-d2', name: 'Dr. Shreya Menon', photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', qualification: 'MBBS, MS (Obstetrics)', specialty: 'Obstetrician', experience: '12 years', fee: '₹900', rating: 4.8, reviewCount: 360, nextSlot: 'Today 4:30 PM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c6-d3', name: 'Dr. Neetha Rao', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MS (Gynecology), Fellowship (IVF)', specialty: 'Fertility Specialist', experience: '16 years', fee: '₹1,500', rating: 4.9, reviewCount: 410, nextSlot: 'Tomorrow 11:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c6-d4', name: 'Dr. Pooja Singh', photo: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80', qualification: 'MBBS, DGO', specialty: 'Gynecologist', experience: '9 years', fee: '₹700', rating: 4.7, reviewCount: 260, nextSlot: 'Today 5:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
  'cln-007': [
    { id: 'c7-d1', name: 'Dr. Arjun Nair', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', qualification: 'MBBS, MS (Ortho)', specialty: 'Orthopedic', experience: '12 years', fee: '₹900', rating: 4.7, reviewCount: 280, nextSlot: 'Tomorrow 9:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c7-d2', name: 'Dr. Sneha Das', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', qualification: 'BPT, MPT (Sports Physio)', specialty: 'Physiotherapist', experience: '7 years', fee: '₹500', rating: 4.6, reviewCount: 150, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
  ],
  'cln-008': [
    { id: 'c8-d1', name: 'Dr. Lakshmi Venkat', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '9 years', fee: '₹1,000', rating: 4.8, reviewCount: 310, nextSlot: 'Today 6:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
    { id: 'c8-d2', name: 'Dr. Rohan Shetty', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', qualification: 'MBBS, MD (Psychiatry)', specialty: 'Psychiatrist', experience: '14 years', fee: '₹1,200', rating: 4.9, reviewCount: 390, nextSlot: 'Tomorrow 10:00 AM', isAvailable: true, consultModes: ['in-person'] },
    { id: 'c8-d3', name: 'Dr. Ananya Pillai', photo: 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80', qualification: 'MA (Clinical Psychology), MPhil', specialty: 'Clinical Psychologist', experience: '6 years', fee: '₹800', rating: 4.7, reviewCount: 220, nextSlot: 'Today 7:00 PM', isAvailable: true, consultModes: ['in-person', 'video'] },
  ],
};

// ─── Page Component ─────────────────────────────────────────────────────────────

export default function ClinicProfilePage() {
  const params = useParams();
  const clinicId = params.id as string;
  const clinic = CLINICS[clinicId];
  const doctors = CLINIC_DOCTORS[clinicId] || [];

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) return doctors;
    return doctors.filter(d =>
      d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
      d.qualification.toLowerCase().includes(selectedSpecialty.toLowerCase())
    );
  }, [selectedSpecialty, doctors]);

  if (!clinic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl mb-4 block">🏥</span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Clinic Not Found</h1>
        <p className="text-slate-500 mb-6">The clinic you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/doctor" className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl text-sm hover:bg-teal-700 transition-colors">
          Back to Health Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen pb-24">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        <img src={clinic.image} alt={clinic.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link href="/doctor" className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-900">{clinic.rating}</span>
            <span className="text-[10px] text-slate-400">({clinic.reviewCount})</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {clinic.specialties.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white border border-white/30">
                <Stethoscope className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">{clinic.name}</h1>
          <span className="flex items-center gap-1 text-white/90 text-sm"><MapPin className="w-3.5 h-3.5" /> {clinic.location}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">

        {/* ── Quick Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-slate-900 mb-1">{doctors.length}</p>
            <p className="text-xs text-slate-500">Doctors</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-emerald-600 mb-1">{clinic.todaySlots}</p>
            <p className="text-xs text-slate-500">Slots Today</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">Next</span>
            </div>
            <p className="text-xs text-slate-500">{clinic.nextSlot}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xl font-black text-blue-600 mb-1 flex items-center justify-center gap-1"><Phone className="w-4 h-4" /></p>
            <p className="text-xs text-slate-500">Call Clinic</p>
          </div>
        </div>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" /> About
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{clinic.about}</p>

          <h3 className="font-bold text-slate-800 text-sm mb-2">Services Offered</h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {clinic.services.map(s => (
              <span key={s} className="text-xs font-medium bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> {s}
              </span>
            ))}
          </div>

          <h3 className="font-bold text-slate-800 text-sm mb-2">Working Hours</h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            {clinic.workingHours.map((wh, i) => (
              <div key={i} className={`flex justify-between items-center py-2 ${i < clinic.workingHours.length - 1 ? 'border-b border-slate-200' : ''}`}>
                <span className={`text-sm font-semibold ${wh.active ? 'text-slate-700' : 'text-red-500'}`}>{wh.day}</span>
                <span className={`text-sm ${wh.active ? 'text-slate-600' : 'text-red-500 font-medium'}`}>{wh.time}</span>
              </div>
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
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200/50'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              All Doctors ({doctors.length})
            </button>
            {clinic.specialties.map(spec => {
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
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-200/50'
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
              <button onClick={() => setSelectedSpecialty(null)} className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors">
                View All Doctors
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
