'use client';

import React, { useEffect, useState } from 'react';
import { doctorApi } from '@/lib/api/doctor';

type Relation = 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

interface FamilyMember {
  id: string; name: string; relation: Relation;
  dateOfBirth?: string; gender?: string; bloodGroup?: string;
  allergies?: string[]; medicalConditions?: string[];
  insuranceProvider?: string; insurancePolicyNo?: string;
}

const RELATIONS: Relation[] = ['self', 'spouse', 'child', 'parent', 'sibling', 'other'];

const RELATION_EMOJI: Record<Relation, string> = {
  self: '🧑', spouse: '💑', child: '👶', parent: '👴', sibling: '👫', other: '👤',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const USER_ID = 'CUSTOMER_SELF'; // TODO: from auth

export default function FamilyMembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<FamilyMember>>({ relation: 'spouse' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setMembers((await doctorApi.getFamilyMembers(USER_ID)) ?? []); } catch { /* */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await doctorApi.addFamilyMember({ userId: USER_ID, name: form.name!, relation: form.relation ?? 'other', ...form });
      setForm({ relation: 'spouse' });
      setShowForm(false);
      await load();
    } catch { /* */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await doctorApi.deleteFamilyMember(id, USER_ID);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Family Members</h1>
            <p className="text-slate-500 mt-1">Manage profiles to book appointments for your family</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-3 bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 transition flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Member
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-violet-200 p-6 mb-6 animate-in fade-in">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Add Family Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="full-name">Full Name</label>
                <input id="full-name" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="relation">Relation</label>
                <select id="relation" aria-label="Relation" value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value as Relation })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
                  {RELATIONS.map(r => <option key={r} value={r}>{RELATION_EMOJI[r]} {r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="date-of-birth">Date of Birth</label>
                <input id="date-of-birth" type="date" value={form.dateOfBirth ?? ''} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} placeholder="YYYY-MM-DD"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="gender">Gender</label>
                <select id="gender" aria-label="Gender" value={form.gender ?? ''} onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="blood-group">Blood Group</label>
                <select id="blood-group" aria-label="Blood Group" value={form.bloodGroup ?? ''} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="insurance-provider">Insurance Provider</label>
                <input id="insurance-provider" value={form.insuranceProvider ?? ''} onChange={e => setForm({ ...form, insuranceProvider: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim()}
                className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Member'}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No family members added</h3>
            <p className="text-slate-400">Add your family members to book appointments on their behalf</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map(m => (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:border-violet-200 transition-all group relative">
                <button onClick={() => handleDelete(m.id)}
                  className="absolute top-3 right-3 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100">✕</button>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-2xl">
                    {RELATION_EMOJI[m.relation]}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{m.name}</div>
                    <div className="text-xs text-violet-600 font-bold capitalize">{m.relation}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {m.gender && <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-600">{m.gender}</span>}
                  {m.bloodGroup && <span className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-600">🩸 {m.bloodGroup}</span>}
                  {m.dateOfBirth && <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-600">🎂 {new Date(m.dateOfBirth).toLocaleDateString()}</span>}
                  {m.insuranceProvider && <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg font-semibold text-blue-600">🛡️ {m.insuranceProvider}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
