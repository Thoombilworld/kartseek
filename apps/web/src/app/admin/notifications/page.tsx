'use client';
import React, { useState } from 'react';
import { Bell, Send, Users, Truck, Car, Globe, Clock, CheckCircle, Filter, Search, Plus, X, ChevronDown, ChevronUp, Eye, Megaphone } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Notification = {
  id: string; title: string; body: string; audience: 'all_partners' | 'taxi_drivers' | 'delivery_partners' | 'specific';
  channel: 'push' | 'sms' | 'email' | 'in_app'; status: 'sent' | 'scheduled' | 'draft' | 'failed';
  sentAt?: string; scheduledAt?: string; recipientCount: number; readCount: number; createdBy: string;
};

const notifications: Notification[] = [
  { id: 'NTF-001', title: 'Weekly Bonus Unlocked!', body: 'Complete 15 rides this week to earn 1,500 bonus. Keep going!', audience: 'taxi_drivers', channel: 'push', status: 'sent', sentAt: '2026-07-09T01:00:00Z', recipientCount: 342, readCount: 198, createdBy: 'Admin' },
  { id: 'NTF-002', title: 'New Delivery Zone: Lavington', body: 'Lavington area is now open for delivery orders. Enable it in your zone settings to start receiving orders.', audience: 'delivery_partners', channel: 'push', status: 'sent', sentAt: '2026-07-08T14:00:00Z', recipientCount: 156, readCount: 89, createdBy: 'Admin' },
  { id: 'NTF-003', title: 'System Maintenance — July 10', body: 'Platform will be under maintenance from 2:00 AM to 4:00 AM EAT. You won\'t receive orders during this time.', audience: 'all_partners', channel: 'push', status: 'scheduled', scheduledAt: '2026-07-10T02:00:00Z', recipientCount: 498, readCount: 0, createdBy: 'Admin' },
  { id: 'NTF-004', title: 'KYC Document Reminder', body: 'Your insurance document is expiring in 7 days. Please upload a renewed copy to avoid service suspension.', audience: 'specific', channel: 'sms', status: 'sent', sentAt: '2026-07-07T10:00:00Z', recipientCount: 23, readCount: 23, createdBy: 'System' },
  { id: 'NTF-005', title: 'Holiday Peak Incentive', body: 'Double earnings on all orders during the Independence Day weekend. Go online to maximize your earnings!', audience: 'all_partners', channel: 'push', status: 'draft', recipientCount: 0, readCount: 0, createdBy: 'Admin' },
  { id: 'NTF-006', title: 'COD Collection Reminder', body: 'You have pending COD balance of 5,200. Please deposit at the nearest collection point.', audience: 'delivery_partners', channel: 'in_app', status: 'failed', sentAt: '2026-07-06T09:00:00Z', recipientCount: 45, readCount: 0, createdBy: 'System' },
];

const statusColors: Record<string, string> = {
  sent: 'bg-emerald-100 text-emerald-700', scheduled: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600', failed: 'bg-red-100 text-red-700',
};
const audienceIcons: Record<string, React.ReactNode> = {
  all_partners: <Globe className="w-4 h-4 text-indigo-500" />, taxi_drivers: <Car className="w-4 h-4 text-amber-500" />,
  delivery_partners: <Truck className="w-4 h-4 text-violet-500" />, specific: <Users className="w-4 h-4 text-slate-500" />,
};
const audienceLabels: Record<string, string> = {
  all_partners: 'All Partners', taxi_drivers: 'Taxi Drivers', delivery_partners: 'Delivery Partners', specific: 'Specific Partners',
};
const channelColors: Record<string, string> = {
  push: 'bg-blue-50 text-blue-700', sms: 'bg-purple-50 text-purple-700',
  email: 'bg-teal-50 text-teal-700', in_app: 'bg-amber-50 text-amber-700',
};

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCompose, setShowCompose] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sentCount = notifications.filter(n => n.status === 'sent').length;
  const scheduledCount = notifications.filter(n => n.status === 'scheduled').length;
  const totalReach = notifications.filter(n => n.status === 'sent').reduce((s, n) => s + n.recipientCount, 0);
  const avgRead = notifications.filter(n => n.status === 'sent' && n.recipientCount > 0).reduce((s, n) => s + (n.readCount / n.recipientCount) * 100, 0) / Math.max(1, sentCount);

  const filtered = notifications.filter(n => statusFilter === 'All' || n.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-500" /> Partner Notifications
          </h1>
          <p className="text-slate-500 text-sm mt-1">Send push notifications, SMS, and in-app messages to partners</p>
        </div>
        <button onClick={() => setShowCompose(!showCompose)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200">
          {showCompose ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCompose ? 'Cancel' : 'New Notification'}
        </button>
      </div>

      {/* Compose Panel */}
      {showCompose && (
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-lg">
          <h3 className="font-bold text-slate-900 mb-4">Compose Notification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="title">Title</label>
              <input id="title" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Notification title..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="audience">Audience</label>
                <select id="audience" title="Select notification audience" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="all_partners">All Partners</option>
                  <option value="taxi_drivers">Taxi Drivers</option>
                  <option value="delivery_partners">Delivery Partners</option>
                  <option value="specific">Specific Partners</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="channel">Channel</label>
                <select id="channel" title="Select notification channel" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="push">Push Notification</option>
                  <option value="sms">SMS</option>
                  <option value="in_app">In-App</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="message-body">Message Body</label>
            <textarea id="message-body" rows={3} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" placeholder="Write your message..." />
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"><Send className="w-4 h-4" /> Send Now</button>
            <button className="bg-blue-100 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors flex items-center gap-2"><Clock className="w-4 h-4" /> Schedule</button>
            <button className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Save as Draft</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-md text-white">
          <Send className="w-5 h-5 opacity-80" /><p className="text-2xl font-black mt-2">{sentCount}</p><p className="text-xs font-medium opacity-80">Sent</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{scheduledCount}</p><p className="text-xs text-slate-500 font-medium">Scheduled</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">{totalReach}</p><p className="text-xs text-slate-500 font-medium">Total Reach</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Eye className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">{avgRead.toFixed(0)}%</p><p className="text-xs text-slate-500 font-medium">Avg Read Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['All', 'sent', 'scheduled', 'draft', 'failed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Title</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Audience</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Channel</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Recipients</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Read</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Time</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => (
              <React.Fragment key={n.id}>
                <tr className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === n.id ? null : n.id))}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-400">{n.id} · by {n.createdBy}</p>
                  </td>
                  <td className="px-5 py-4"><span className="flex items-center gap-1.5">{audienceIcons[n.audience]}<span className="text-slate-700">{audienceLabels[n.audience]}</span></span></td>
                  <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${channelColors[n.channel]}`}>{n.channel.toUpperCase()}</span></td>
                  <td className="px-5 py-4 text-center font-bold text-slate-900">{n.recipientCount}</td>
                  <td className="px-5 py-4 text-center">
                    {n.recipientCount > 0 ? <span className="font-bold text-emerald-600">{Math.round((n.readCount / n.recipientCount) * 100)}%</span> : '—'}
                  </td>
                  <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[n.status]}`}>{n.status}</span></td>
                  <td className="px-5 py-4 text-xs text-slate-500">{n.sentAt ? new Date(n.sentAt).toLocaleDateString() : n.scheduledAt ? `Sched: ${new Date(n.scheduledAt).toLocaleDateString()}` : '—'}</td>
                  <td className="px-5 py-4 text-center">{expanded === n.id ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}</td>
                </tr>
                {expanded === n.id && (
                  <tr className="bg-slate-50/80"><td colSpan={8} className="px-5 py-4">
                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">{n.body}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {n.status === 'draft' && <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Send Now</button>}
                      {n.status === 'failed' && <button className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 flex items-center gap-1">Retry</button>}
                      {n.status === 'scheduled' && <button className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>}
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
