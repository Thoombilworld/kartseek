'use client';
import React, { useState } from 'react';
import { Activity, Server, Database, Globe, Wifi, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Zap, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { useAdminData, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

type ServiceStatus = { name: string; status: 'Healthy' | 'Degraded' | 'Down'; latency: number; uptime: string; lastIncident: string; region: string };
type SystemMetric = { label: string; value: number; max: number; unit: string; status: 'ok' | 'warn' | 'critical' };

const SERVICES: ServiceStatus[] = [
  { name: 'Web App (Next.js)', status: 'Healthy', latency: 42, uptime: '99.98%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'API Gateway', status: 'Healthy', latency: 18, uptime: '99.99%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'Seller Service (gRPC)', status: 'Healthy', latency: 12, uptime: '99.95%', lastIncident: '2026-06-02', region: 'Mumbai' },
  { name: 'Product Service', status: 'Healthy', latency: 25, uptime: '99.97%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'Order Service', status: 'Healthy', latency: 35, uptime: '99.96%', lastIncident: '2026-05-28', region: 'Mumbai' },
  { name: 'Payment Service', status: 'Healthy', latency: 88, uptime: '99.99%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'Search (Elasticsearch)', status: 'Healthy', latency: 22, uptime: '99.94%', lastIncident: '2026-06-01', region: 'Mumbai' },
  { name: 'CDN (Images)', status: 'Healthy', latency: 8, uptime: '99.99%', lastIncident: 'None', region: 'Global' },
  { name: 'Cache (Redis)', status: 'Healthy', latency: 2, uptime: '99.99%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'Database (PostgreSQL)', status: 'Healthy', latency: 5, uptime: '99.99%', lastIncident: 'None', region: 'Mumbai' },
  { name: 'Email Service', status: 'Degraded', latency: 450, uptime: '98.2%', lastIncident: '2026-06-06', region: 'Mumbai' },
  { name: 'SMS Gateway', status: 'Healthy', latency: 120, uptime: '99.8%', lastIncident: '2026-06-04', region: 'Mumbai' },
  { name: 'UAE CDN Edge', status: 'Healthy', latency: 15, uptime: '99.97%', lastIncident: 'None', region: 'Dubai' },
  { name: 'Notification Service', status: 'Healthy', latency: 30, uptime: '99.95%', lastIncident: '2026-06-03', region: 'Mumbai' },
];

const METRICS: SystemMetric[] = [
  { label: 'CPU Usage', value: 34, max: 100, unit: '%', status: 'ok' },
  { label: 'Memory', value: 68, max: 100, unit: '%', status: 'ok' },
  { label: 'Disk I/O', value: 22, max: 100, unit: '%', status: 'ok' },
  { label: 'DB Connections', value: 45, max: 200, unit: '', status: 'ok' },
  { label: 'Redis Memory', value: 1.2, max: 4, unit: 'GB', status: 'ok' },
  { label: 'Queue Depth', value: 12, max: 1000, unit: '', status: 'ok' },
  { label: 'Error Rate', value: 0.02, max: 5, unit: '%', status: 'ok' },
  { label: 'Avg Response', value: 142, max: 500, unit: 'ms', status: 'ok' },
];

const STATUS_ICON = { Healthy: CheckCircle, Degraded: AlertTriangle, Down: XCircle };
const STATUS_COLOR = { Healthy: 'text-emerald-600', Degraded: 'text-amber-600', Down: 'text-red-600' };
const STATUS_BG = { Healthy: 'bg-emerald-50', Degraded: 'bg-amber-50', Down: 'bg-red-50' };

function getMetricColor(m: SystemMetric): string {
  const pct = (m.value / m.max) * 100;
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function SystemHealthPage() {
  const { data: apiData, loading, error, refetch, toast } = useAdminData(() => adminMarketplaceApi.getOrders(), []);
  const [lastRefresh] = useState(new Date().toLocaleTimeString());

  const healthyCount = SERVICES.filter(s => s.status === 'Healthy').length;
  const degradedCount = SERVICES.filter(s => s.status === 'Degraded').length;
  const downCount = SERVICES.filter(s => s.status === 'Down').length;
  const overallHealth = downCount > 0 ? 'Down' : degradedCount > 0 ? 'Degraded' : 'Healthy';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">System Health</h1><p className="text-sm text-slate-500 mt-0.5">Real-time platform monitoring — services, infrastructure, performance</p></div>
        <div className="flex items-center gap-3"><span className="text-xs text-slate-400">Last: {lastRefresh}</span><button onClick={() => refetch()} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-2xl p-6 flex items-center gap-4 ${overallHealth === 'Healthy' ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : overallHealth === 'Degraded' ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-600 to-red-800'} text-white`}>
        {React.createElement(STATUS_ICON[overallHealth], { className: 'w-10 h-10' })}
        <div><p className="text-xl font-black">{overallHealth === 'Healthy' ? 'All Systems Operational' : overallHealth === 'Degraded' ? 'Partial Degradation Detected' : 'System Outage'}</p><p className="text-sm opacity-80 mt-0.5">{healthyCount}/{SERVICES.length} services healthy · {degradedCount} degraded · {downCount} down</p></div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-emerald-600 font-bold">Healthy</p><p className="text-2xl font-black text-emerald-600">{healthyCount}</p></div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-amber-600 font-bold">Degraded</p><p className="text-2xl font-black text-amber-600">{degradedCount}</p></div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-red-600 font-bold">Down</p><p className="text-2xl font-black text-red-600">{downCount}</p></div>
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-blue-600 font-bold">Avg Latency</p><p className="text-2xl font-black text-blue-600">{Math.round(SERVICES.reduce((a, s) => a + s.latency, 0) / SERVICES.length)}ms</p></div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      {/* Infrastructure Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-600" /> Infrastructure Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {METRICS.map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-3">
              <div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-600">{m.label}</span><span className="text-xs font-black text-slate-900">{m.value}{m.unit}</span></div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${getMetricColor(m)}`} style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }} /></div>
              <p className="text-[10px] text-slate-400 mt-1">Max: {m.max}{m.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service Status Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Server className="w-4 h-4 text-blue-600" /> Service Status</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Service</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th><th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Latency</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Uptime</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Region</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Last Incident</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {SERVICES.map(s => {
              const Icon = STATUS_ICON[s.status];
              return (
                <tr key={s.name} className={`${s.status !== 'Healthy' ? STATUS_BG[s.status] : ''} hover:bg-slate-50/50 transition-colors`}>
                  <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">{s.name}</td>
                  <td className="px-4 py-3.5 text-center"><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_BG[s.status]} ${STATUS_COLOR[s.status]}`}><Icon className="w-3 h-3" />{s.status}</span></td>
                  <td className="px-4 py-3.5 text-right"><span className={`text-xs font-black ${s.latency > 200 ? 'text-amber-600' : s.latency > 500 ? 'text-red-600' : 'text-slate-900'}`}>{s.latency}ms</span></td>
                  <td className="px-4 py-3.5 text-center text-xs font-bold text-emerald-600">{s.uptime}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.region}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{s.lastIncident}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminToast toast={toast} />
    </div>
  );
}
