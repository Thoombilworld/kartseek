'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  Save, Eye, Edit3, Clock, CheckCircle, FileText, Plus, Trash2,
  ChevronDown, ChevronUp, GripVertical, AlertTriangle, Globe, Undo2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

interface TermsSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isEditing: boolean;
}

// ── Initial Content ───────────────────────────────────────────────────────

const INITIAL_SECTIONS: TermsSection[] = [
  {
    id: 'tc-1', order: 1, isEditing: false,
    title: '1. Acceptance of Terms',
    content: 'By accessing and using the KARTSEEK platform ("Platform"), including the website, mobile applications, and all associated services, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must not use the Platform.\n\nThese Terms apply to all users, including buyers, sellers, delivery partners, and visitors. KARTSEEK reserves the right to modify these Terms at any time, and such modifications will be effective immediately upon posting.',
  },
  {
    id: 'tc-2', order: 2, isEditing: false,
    title: '2. Platform Services',
    content: 'KARTSEEK provides a multi-service platform that includes, but is not limited to:\n• Marketplace — E-commerce for electronics, fashion, home & more\n• Grocery — Online grocery ordering from local and chain stores\n• Pharmacy — Medicine and health product ordering\n• Restaurant — Food ordering and delivery\n• Taxi & Rides — On-demand transportation\n• Hotel Booking — Accommodation reservations\n• Doctor Appointments — Telemedicine and clinic bookings\n\nEach module may have additional specific terms that supplement these general Terms.',
  },
  {
    id: 'tc-3', order: 3, isEditing: false,
    title: '3. User Accounts & Registration',
    content: 'To use certain features of the Platform, you must create an account. You agree to:\n• Provide accurate, current, and complete registration information\n• Maintain the security of your password and account credentials\n• Accept responsibility for all activities under your account\n• Immediately notify KARTSEEK of any unauthorized use\n\nKARTSEEK reserves the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity. Users must be at least 18 years of age to create an account.',
  },
  {
    id: 'tc-4', order: 4, isEditing: false,
    title: '4. Orders, Payments & Refunds',
    content: 'All orders placed through KARTSEEK are subject to acceptance and availability. Prices listed are inclusive of applicable taxes unless otherwise stated.\n\nPayment Methods: We accept UPI, credit/debit cards, net banking, mobile wallets, and cash on delivery (where available).\n\nRefund Policy: Refunds are processed within 5-7 business days after approval. For perishable goods (grocery, restaurant), refund requests must be made within 24 hours of delivery. For marketplace products, our standard return window applies as specified per product category.\n\nCancellation: Orders may be cancelled before dispatch. Once dispatched, cancellation is subject to seller/store policy.',
  },
  {
    id: 'tc-5', order: 5, isEditing: false,
    title: '5. Seller Obligations',
    content: 'Sellers on the KARTSEEK platform agree to:\n• List only genuine, legal, and properly described products\n• Maintain accurate stock levels and pricing\n• Comply with all applicable local, state, and national regulations\n• Ship orders within the committed timeframe\n• Respond to customer queries and complaints promptly\n• Not engage in price manipulation, fake reviews, or misleading advertisements\n\nKARTSEEK reserves the right to remove listings, suspend seller accounts, and withhold payments for violations.',
  },
  {
    id: 'tc-6', order: 6, isEditing: false,
    title: '6. Privacy & Data Protection',
    content: 'Your privacy is important to us. Our Privacy Policy, which is incorporated into these Terms, explains how we collect, use, store, and protect your personal data.\n\nWe comply with applicable data protection laws including GDPR (for EU users), Information Technology Act (for India), and PDPA (for GCC countries). You have the right to access, correct, and delete your personal data as described in our Privacy Policy.',
  },
  {
    id: 'tc-7', order: 7, isEditing: false,
    title: '7. Intellectual Property',
    content: 'All content on the KARTSEEK platform, including logos, trademarks, text, images, and software, is the property of KARTSEEK or its licensors and is protected by intellectual property laws.\n\nYou may not reproduce, distribute, modify, or create derivative works from any content without prior written consent from KARTSEEK.',
  },
  {
    id: 'tc-8', order: 8, isEditing: false,
    title: '8. Governing Law & Dispute Resolution',
    content: 'These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising from or relating to these Terms shall be resolved through:\n\n1. Negotiation between the parties\n2. Mediation by a mutually agreed mediator\n3. Arbitration under the Indian Arbitration and Conciliation Act\n4. Courts of competent jurisdiction in Mumbai, India\n\nFor users in other jurisdictions, local consumer protection laws may apply in addition to these Terms.',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// TERMS & CONDITIONS ADMIN EDITOR
// ══════════════════════════════════════════════════════════════════════════

export default function TermsAdminPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [lastSaved, setLastSaved] = useState('2026-06-20 14:30');
  const [isPublished, setIsPublished] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const toggleEdit = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isEditing: !s.isEditing } : s));
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addSection = () => {
    const newId = `tc-${Date.now()}`;
    const newOrder = sections.length + 1;
    setSections(prev => [...prev, {
      id: newId,
      title: `${newOrder}. New Section`,
      content: 'Enter section content here...',
      order: newOrder,
      isEditing: true,
    }]);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save to API
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      setSuccessMsg('Terms & Conditions saved successfully!');
      setSections(prev => prev.map(s => ({ ...s, isEditing: false })));
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 1000);
  };

  const handlePublish = () => {
    setIsPublished(!isPublished);
  };

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions — Preview</h1>
          <button onClick={() => setPreviewMode(false)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
            <Edit3 className="w-4 h-4" /> Back to Editor
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">KARTSEEK — Terms & Conditions</h1>
          <p className="text-sm text-slate-500 mb-6">Last updated: {lastSaved}</p>
          {sections.map(section => (
            <div key={section.id} className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2">{section.title}</h2>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and edit the platform&apos;s Terms & Conditions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPreviewMode(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={handlePublish} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isPublished ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`} aria-label="Global">
            <Globe className="w-4 h-4" /> {isPublished ? 'Published' : 'Unpublished'}
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-50" aria-label="Save">
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm font-medium animate-in slide-in-from-top">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last saved: {lastSaved}</span>
        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {sections.length} sections</span>
        <span className={`flex items-center gap-1 font-semibold ${isPublished ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isPublished ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {isPublished ? 'Live on website' : 'Draft — not published'}
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                <span className="text-xs text-slate-400 font-mono">#{section.order}</span>
                {section.isEditing ? (
                  <input
                    aria-label="Section title"
                    value={section.title}
                    onChange={e => updateSection(section.id, 'title', e.target.value)}
                    className="font-bold text-slate-900 text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <h3 className="font-bold text-slate-900 text-sm">{section.title}</h3>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move up">
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={() => moveSection(section.id, 'down')} disabled={idx === sections.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move down">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={() => toggleEdit(section.id)} className={`p-1.5 rounded-lg transition-colors ${section.isEditing ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-400'}`} title="Edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeSection(section.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete section">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-5">
              {section.isEditing ? (
                <textarea
                  aria-label="Section content"
                  value={section.content}
                  onChange={e => updateSection(section.id, 'content', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-y font-mono"
                />
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      <button
        onClick={addSection}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-semibold text-slate-500 hover:text-green-600 hover:border-green-400 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add New Section
      </button>
    </div>
  );
}
