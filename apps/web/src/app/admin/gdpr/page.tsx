'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState } from 'react';
import {
  Shield, Download, Trash2, FileCheck, Clock, Users,
  Eye, AlertTriangle, CheckCircle, XCircle, BarChart3,
  Lock, Unlock, FileText, Globe,
} from 'lucide-react';

interface DataRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'export' | 'erasure';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

const mockRequests: DataRequest[] = [
  { id: 'GDPR-EXP-001', userId: 'U-1001', userName: 'John Doe', type: 'export', status: 'pending', requestedAt: '2026-05-31T10:00:00Z' },
  { id: 'GDPR-EXP-002', userId: 'U-1022', userName: 'Jane Smith', type: 'export', status: 'completed', requestedAt: '2026-05-30T08:15:00Z', processedAt: '2026-05-30T08:45:00Z' },
  { id: 'GDPR-ERA-001', userId: 'U-1044', userName: 'Alex Ochieng', type: 'erasure', status: 'pending', requestedAt: '2026-05-31T14:20:00Z' },
  { id: 'GDPR-ERA-002', userId: 'U-1055', userName: 'Wanjiru Maina', type: 'erasure', status: 'processing', requestedAt: '2026-05-30T16:00:00Z' },
  { id: 'GDPR-EXP-003', userId: 'U-1070', userName: 'David Sharma', type: 'export', status: 'completed', requestedAt: '2026-05-29T12:00:00Z', processedAt: '2026-05-29T12:30:00Z' },
];

const consentTypes = [
  { key: 'marketing_email', label: 'Marketing Emails', granted: 78 },
  { key: 'marketing_sms', label: 'SMS Notifications', granted: 65 },
  { key: 'marketing_push', label: 'Push Notifications', granted: 82 },
  { key: 'analytics', label: 'Analytics & Tracking', granted: 90 },
  { key: 'location_tracking', label: 'Location Tracking', granted: 55 },
  { key: 'data_sharing_partners', label: 'Partner Data Sharing', granted: 32 },
  { key: 'personalized_ads', label: 'Personalized Ads', granted: 45 },
  { key: 'order_notifications', label: 'Order Updates', granted: 97 },
];

const retentionPolicies = [
  { dataType: 'User Profiles', retention: '2 years after last activity', basis: 'Contract (Art. 6(1)(b))' },
  { dataType: 'Order Records', retention: '7 years', basis: 'Legal Obligation (Tax)' },
  { dataType: 'Payment Logs', retention: '7 years', basis: 'Legal Obligation (Tax)' },
  { dataType: 'Search History', retention: '90 days', basis: 'Legitimate Interest' },
  { dataType: 'Push Notifications', retention: '30 days', basis: 'Contract' },
  { dataType: 'Session / Login Logs', retention: '30 days', basis: 'Security' },
  { dataType: 'Consent Audit Trail', retention: 'Indefinite', basis: 'GDPR Art. 7 Proof' },
  { dataType: 'Location History', retention: '90 days', basis: 'Consent' },
  { dataType: 'Chat Messages', retention: '1 year', basis: 'Contract' },
  { dataType: 'Fraud Detection', retention: '5 years', basis: 'Legitimate Interest' },
];

export default function AdminGdprPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'consent' | 'retention'>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            GDPR & Data Privacy
          </h1>
          <p className="text-gray-500 mt-1">Manage data subject requests, consent, and retention policies</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Compliant
          </span>
          <span className="text-xs text-gray-400">Policy v1.0 · Last updated Jan 15, 2026</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['overview', 'requests', 'consent', 'retention'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize transition border-b-2 ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Download className="w-5 h-5 text-blue-500" />} label="Export Requests" value="3" subtext="1 pending" color="blue" />
            <StatCard icon={<Trash2 className="w-5 h-5 text-red-500" />} label="Erasure Requests" value="2" subtext="1 pending" color="red" />
            <StatCard icon={<FileCheck className="w-5 h-5 text-green-500" />} label="Consent Rate" value="68%" subtext="Avg across all types" color="green" />
            <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="Avg Processing" value="28m" subtext="Export completion" color="amber" />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" /> Recent GDPR Activity
            </h3>
            <div className="space-y-3">
              {mockRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {req.type === 'export' ? <Download className="w-4 h-4 text-blue-500" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.userName}</p>
                      <p className="text-xs text-gray-500">{req.id} · {req.type === 'export' ? 'Data Export' : 'Account Deletion'}</p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Data Subject Requests</h3>
            <span className="text-xs text-gray-400">Must be processed within 30 days (GDPR Art. 12)</span>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Request ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requested</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{req.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{req.userName}</p>
                    <p className="text-xs text-gray-400">{req.userId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      req.type === 'export' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {req.type === 'export' ? <Download className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      {req.type === 'export' ? 'Data Export' : 'Erasure'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' && (
                      <button className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Process
                      </button>
                    )}
                    {req.status === 'completed' && (
                      <button className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Consent Analytics Tab */}
      {activeTab === 'consent' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" /> Consent Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consentTypes.map((c) => (
                <div key={c.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {c.granted > 70 ? <Unlock className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
                    <span className="text-sm font-medium text-gray-800">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${c.granted > 70 ? 'bg-green-500' : c.granted > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${c.granted}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{c.granted}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Retention Policies Tab */}
      {activeTab === 'retention' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Data Retention Policies
            </h3>
            <p className="text-xs text-gray-400 mt-1">GDPR Article 5(1)(e) — Storage Limitation Principle</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retention Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Legal Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {retentionPolicies.map((p) => (
                <tr key={p.dataType} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.dataType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.retention}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      <Globe className="w-3 h-3" /> {p.basis}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode; label: string; value: string; subtext: string; color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50', red: 'bg-red-50', green: 'bg-green-50', amber: 'bg-amber-50',
  };
  return (
    <div className={`${bgMap[color] ?? 'bg-gray-50'} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xs text-gray-400">{subtext}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    processing: <BarChart3 className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {icons[status]} {status}
    </span>
  );
}
