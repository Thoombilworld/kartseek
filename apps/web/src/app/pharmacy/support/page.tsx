'use client';
import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import Link from 'next/link';

const categories = ['General', 'Order Issue', 'Prescription', 'Refund', 'Delivery', 'Payment', 'Medicine Quality', 'App Bug'];
const existing = [
  { id: 'TK-4521', subject: 'Refund not received', status: 'open' as const, priority: 'High', time: '2 hours ago' },
  { id: 'TK-4498', subject: 'Wrong medicine delivered', status: 'resolved' as const, priority: 'Medium', time: '3 days ago' },
  { id: 'TK-4410', subject: 'Prescription delay', status: 'closed' as const, priority: 'Low', time: '1 week ago' },
];
const sCfg: Record<string, { bg: string }> = { open: { bg: 'bg-emerald-100 text-emerald-700' }, resolved: { bg: 'bg-blue-100 text-blue-700' }, closed: { bg: 'bg-gray-100 text-gray-500' } };

export default function SupportPage() {
  const [tab, setTab] = useState<'new' | 'tickets'>('new');
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/pharmacy" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold">Pharmacy Support</h1>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-1">
          {(['new', 'tickets'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'new' ? 'New Ticket' : 'My Tickets'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {tab === 'new' ? (
          <>
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${category === c ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Subject</h3>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <h3 className="font-bold text-gray-900">Description</h3>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe in detail..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <button className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2 text-lg disabled:bg-gray-300" disabled={!subject || !description}>
              <Send className="w-5 h-5" /> Submit Ticket
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {existing.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-teal-600">{t.id}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sCfg[t.status].bg}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                </div>
                <p className="font-semibold text-gray-900">{t.subject}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Priority: {t.priority}</span>
                  <span>{t.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
