'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText, Download, Eye, Search, Filter, ArrowLeft,
  Calendar, Clock, User, Stethoscope, ChevronRight, Upload,
  Shield, FolderOpen, FileImage, File, Pill, Activity,
  Heart, Microscope, Syringe, Plus, CheckCircle, Lock
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────────
type RecordCategory = 'all' | 'prescription' | 'lab_report' | 'scan' | 'discharge' | 'vaccination';

interface MedicalRecord {
  id: string;
  title: string;
  category: RecordCategory;
  doctor: string;
  hospital: string;
  date: string;
  fileType: string;
  fileSize: string;
  description: string;
  icon: string;
  tags: string[];
}

const RECORDS: MedicalRecord[] = [
  {
    id: 'rec-001', title: 'Prescription — General Checkup',
    category: 'prescription', doctor: 'Dr. Amara Okonkwo', hospital: 'Mumbai Hospital',
    date: 'Jun 14, 2026', fileType: 'PDF', fileSize: '245 KB',
    description: 'Routine checkup prescription. Paracetamol 500mg, Vitamin D3, B12 supplement for 30 days.',
    icon: '💊', tags: ['General', 'Routine']
  },
  {
    id: 'rec-002', title: 'Blood Test Report — CBC & Lipid Panel',
    category: 'lab_report', doctor: 'Dr. Sunil Kapoor', hospital: 'Apollo Heart & Multi-Speciality Hospital',
    date: 'Jun 10, 2026', fileType: 'PDF', fileSize: '1.2 MB',
    description: 'Complete blood count, lipid panel, and liver function tests. All values within normal range.',
    icon: '🧬', tags: ['Blood Test', 'Cardiology']
  },
  {
    id: 'rec-003', title: 'Skin Biopsy Report',
    category: 'lab_report', doctor: 'Dr. Meera Reddy', hospital: 'SkinFirst Dermatology Center',
    date: 'Jun 11, 2026', fileType: 'PDF', fileSize: '890 KB',
    description: 'Biopsy of suspicious mole on left forearm. Results: Benign melanocytic nevus. No malignancy detected.',
    icon: '🔬', tags: ['Dermatology', 'Biopsy']
  },
  {
    id: 'rec-004', title: 'Chest X-Ray & ECG',
    category: 'scan', doctor: 'Dr. Sunil Kapoor', hospital: 'Apollo Heart & Multi-Speciality Hospital',
    date: 'Jun 10, 2026', fileType: 'DICOM + PDF', fileSize: '8.5 MB',
    description: 'Chest X-ray PA view — clear lung fields. ECG — normal sinus rhythm, no ST changes.',
    icon: '📸', tags: ['Cardiology', 'Imaging']
  },
  {
    id: 'rec-005', title: 'Prescription — Pediatric Consultation',
    category: 'prescription', doctor: 'Dr. Zara Ahmed', hospital: 'Mumbai Hospital',
    date: 'Jun 9, 2026', fileType: 'PDF', fileSize: '180 KB',
    description: 'Amoxicillin 250mg/5ml, Calpol for fever. Follow-up in 5 days if symptoms persist.',
    icon: '💊', tags: ['Pediatrics', 'Infection']
  },
  {
    id: 'rec-006', title: 'COVID-19 Vaccination Certificate',
    category: 'vaccination', doctor: 'Vaccination Center', hospital: 'KEMRI Vaccination Hub',
    date: 'Mar 15, 2024', fileType: 'PDF', fileSize: '320 KB',
    description: 'Pfizer-BioNTech COVID-19 Booster — 3rd dose. Certificate ID: VAX-2024-IN-78294.',
    icon: '💉', tags: ['COVID-19', 'Booster']
  },
  {
    id: 'rec-007', title: 'Discharge Summary — Day Surgery',
    category: 'discharge', doctor: 'Dr. Vikram Singh', hospital: 'Fortis Memorial Research Institute',
    date: 'May 28, 2026', fileType: 'PDF', fileSize: '540 KB',
    description: 'Minor surgical procedure (mole removal). Post-op instructions: Keep wound dry for 48 hrs. Follow-up in 7 days.',
    icon: '🏥', tags: ['Surgery', 'Discharge']
  },
  {
    id: 'rec-008', title: 'Allergy Test Panel',
    category: 'lab_report', doctor: 'Dr. Meera Reddy', hospital: 'SkinFirst Dermatology Center',
    date: 'May 20, 2026', fileType: 'PDF', fileSize: '1.5 MB',
    description: 'IgE panel for common allergens. Positive for dust mites, pollen (moderate). Negative for food allergens.',
    icon: '🧪', tags: ['Dermatology', 'Allergy']
  },
];

const CATEGORY_CONFIG: Record<RecordCategory, { label: string; icon: string; color: string }> = {
  all: { label: 'All Records', icon: '📁', color: 'text-slate-700 bg-slate-100' },
  prescription: { label: 'Prescriptions', icon: '💊', color: 'text-blue-700 bg-blue-50' },
  lab_report: { label: 'Lab Reports', icon: '🧬', color: 'text-emerald-700 bg-emerald-50' },
  scan: { label: 'Scans & Imaging', icon: '📸', color: 'text-violet-700 bg-violet-50' },
  discharge: { label: 'Discharge', icon: '🏥', color: 'text-amber-700 bg-amber-50' },
  vaccination: { label: 'Vaccination', icon: '💉', color: 'text-teal-700 bg-teal-50' }
};

// ─── Component ───────────────────────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RecordCategory>('all');
  const [viewingRecord, setViewingRecord] = useState<string | null>(null);

  const filtered = RECORDS.filter(r => {
    if (category !== 'all' && r.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.doctor.toLowerCase().includes(q) || r.hospital.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const categoryCounts = RECORDS.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50/40 via-white to-slate-50 pb-20">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white px-4 pt-6 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/doctor/my-profile" className="inline-flex items-center gap-1 text-indigo-200 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Profile
          </Link>
          <h1 className="text-2xl font-black mb-1">Medical Records</h1>
          <p className="text-indigo-200 text-sm">View and manage your prescriptions, lab reports, and health documents</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10">

        {/* ── Stats ──────────────────────────────────────────────── */}
        {/* 2-up on phones: four `p-4` cards with 12px gutters leave ~53px of
            content per column at 320px, too narrow for "Prescriptions". */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-indigo-600">{RECORDS.length}</p>
            <p className="text-xs text-slate-500 font-medium">Total Records</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-blue-600">{categoryCounts['prescription'] || 0}</p>
            <p className="text-xs text-slate-500 font-medium">Prescriptions</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-emerald-600">{categoryCounts['lab_report'] || 0}</p>
            <p className="text-xs text-slate-500 font-medium">Lab Reports</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-violet-600">{(categoryCounts['scan'] || 0) + (categoryCounts['vaccination'] || 0)}</p>
            <p className="text-xs text-slate-500 font-medium">Scans & Vax</p>
          </div>
        </div>

        {/* ── Category Filter ────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-6">
          {(Object.entries(CATEGORY_CONFIG) as [RecordCategory, typeof CATEGORY_CONFIG['all']][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                category === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cfg.icon}</span> {cfg.label}
              {key !== 'all' && categoryCounts[key] && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${category === key ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {categoryCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records by title, doctor, hospital, or tags..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
            />
          </div>
        </div>

        {/* ── Upload CTA ─────────────────────────────────────────── */}
        <div className="bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-5 mb-6 flex items-center justify-between hover:border-indigo-400 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Upload New Record</p>
              <p className="text-xs text-slate-400">PDF, JPEG, PNG, DICOM — Max 25 MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-bold">End-to-end encrypted</span>
          </div>
        </div>

        {/* ── Records List ────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <span className="text-4xl mb-3 block">📂</span>
            <p className="font-bold text-slate-900 mb-1">No records found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => {
              const cfg = CATEGORY_CONFIG[record.category];
              const isExpanded = viewingRecord === record.id;
              return (
                <div key={record.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <button
                    onClick={() => setViewingRecord(isExpanded ? null : record.id)}
                    className="w-full p-4 flex items-start gap-4 text-left"
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${cfg.color.split(' ').pop()}`}>
                      {record.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{record.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{record.doctor} · {record.hospital}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label.replace('s', '')}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {record.date}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {record.fileType}</span>
                        <span>{record.fileSize}</span>
                      </div>

                      {/* Tags */}
                      <div className="flex gap-1.5 mt-2">
                        {record.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-medium bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </button>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                      <p className="text-sm text-slate-600 leading-relaxed mt-3 mb-4">{record.description}</p>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View Full Report
                        </button>
                        <button className="flex items-center gap-1.5 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Security Note ──────────────────────────────────────── */}
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Your records are secure</p>
            <p className="text-xs text-emerald-700 mt-0.5">All medical records are encrypted end-to-end and stored securely. Only you and your authorized doctors can access them.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
