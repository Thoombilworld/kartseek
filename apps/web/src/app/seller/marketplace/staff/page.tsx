'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type StaffMember } from '@/lib/modules/seller-api';
import { Users, Search, Plus, Mail, Phone, Shield, Edit, Trash2, MoreVertical, X } from 'lucide-react';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';

const ROLE_CFG: Record<string, { color: string; label: string }> = {
  admin: { color: 'bg-red-50 text-red-700', label: 'Admin' },
  manager: { color: 'bg-blue-50 text-blue-700', label: 'Manager' },
  catalog: { color: 'bg-violet-50 text-violet-700', label: 'Catalog' },
  finance: { color: 'bg-emerald-50 text-emerald-700', label: 'Finance' },
  support: { color: 'bg-amber-50 text-amber-700', label: 'Support' },
};

export default function StaffPage() {
  const { seller } = useSeller();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'support' });

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getStaff(seller.sellerId)
      .then(res => { setStaff(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setStaff([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const filtered = staff.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  /**
   * Remove a colleague's access.
   *
   * The `catch {}` here dropped the row from the list whether or not the server
   * agreed — so a failed removal looked exactly like a successful one, and the
   * person kept their access until someone reloaded the page and saw them back.
   */
  const handleRemove = async (staffId: string) => {
    setActionError(null);
    try {
      await sellerApi.removeStaff(seller.sellerId, staffId);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (e) {
      setActionError(e instanceof Error
        ? e.message
        : "We couldn't remove that person. They still have access — please try again.");
    }
  };

  /**
   * Invite a colleague.
   *
   * "Invite Staff" had no `onClick` at all. `POST /sellers/:id/staff` and the
   * `seller_staff` table have both existed since the 1785850000000 migration —
   * only the form was missing.
   */
  const handleInvite = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return setFormError('Enter their name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Enter a valid email address.');

    setSaving(true);
    setFormError(null);
    try {
      await sellerApi.addStaff(seller.sellerId, {
        name,
        email,
        phone: form.phone.trim(),
        role: form.role,
      } as any);
      // Re-read rather than push the local object: the server assigns the id
      // and the initial status, and guessing them here is how a list drifts
      // from the table behind it.
      const res = await sellerApi.getStaff(seller.sellerId);
      setStaff(res?.data ?? []);
      setInviting(false);
      setForm({ name: '', email: '', phone: '', role: 'support' });
    } catch (e) {
      setFormError(e instanceof Error
        ? e.message
        : "We couldn't send that invitation. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Users className="w-7 h-7 text-blue-600" />Staff Management</h1><p className="text-sm text-slate-500 mt-1">Manage team members and their access roles</p></div>
        <button onClick={() => { setInviting(true); setFormError(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />Invite Staff</button>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{actionError}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Staff</p><p className="text-2xl font-black text-slate-900 mt-1">{staff.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Active</p><p className="text-2xl font-black text-emerald-600 mt-1">{staff.filter(s => s.status === 'active').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Inactive</p><p className="text-2xl font-black text-slate-400 mt-1">{staff.filter(s => s.status === 'inactive').length}</p></div>
      </div>

      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(s => {
          const role = ROLE_CFG[s.role] || ROLE_CFG.support;
          return (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">{s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{s.name}</h3><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${role.color}`}>{role.label}</span>{s.status === 'inactive' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">Inactive</span>}</div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{s.email}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleRemove(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">Last active: {new Date(s.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 bg-white border border-slate-200 rounded-xl"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No staff found</p></div>}

      {inviting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setInviting(false)}>
            {/* A backdrop that only closes on click leaves keyboard users stuck
                in the dialog. `keyboard-access.spec.ts` enforces this. */}
            <DismissOnEscape onDismiss={() => setInviting(false)} />
          </div>
          <div role="dialog" aria-modal="true" aria-labelledby="invite-title" className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 id="invite-title" className="text-lg font-black text-slate-900">Invite a colleague</h3>
              <button onClick={() => setInviting(false)} aria-label="Close" className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="staff-name" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full name *</label>
                <input id="staff-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="staff-email" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email *</label>
                <input id="staff-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="staff-phone" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                <input id="staff-phone" inputMode="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="staff-role" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role</label>
                <select id="staff-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                  {Object.entries(ROLE_CFG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                </select>
              </div>
              {formError && (
                <p role="alert" className="text-xs font-medium text-red-600">{formError}</p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setInviting(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleInvite} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
                {saving ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
