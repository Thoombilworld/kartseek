import React from 'react';
import { Activity, Server, Database, ShieldAlert, Cpu, HardDrive, Network, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export default function SystemHealthPage() {
  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health & Monitoring</h1>
          <p className="text-slate-500 text-sm">Real-time status of microservices, databases, and server resources.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh Status
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-emerald-900">All Systems Operational</h2>
          <p className="text-sm text-emerald-700">Platform is running smoothly. Uptime for the last 30 days is 99.99%.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Microservices Status (Left 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-600" /> Core Microservices
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4 gap-4">
              
              {/* Service Card */}
              <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-0.5">API Gateway</p>
                  <p className="text-xs text-slate-500">Latency: 42ms • Requests: 1.2k/s</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              {/* Service Card */}
              <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Auth Service</p>
                  <p className="text-xs text-slate-500">Latency: 85ms • Uptime: 99.9%</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              {/* Service Card (Warning) */}
              <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900 text-sm mb-0.5">Payment Service</p>
                  <p className="text-xs text-amber-700">Latency: 850ms (High) • Gateway sync delayed</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>

              {/* Service Card */}
              <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Location & Map Service</p>
                  <p className="text-xs text-slate-500">Latency: 32ms • Requests: 3.5k/s</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              {/* Service Card */}
              <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Logistics & Taxi Socket</p>
                  <p className="text-xs text-slate-500">Connections: 42,109 (Active)</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              {/* Service Card */}
              <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Notification Service</p>
                  <p className="text-xs text-slate-500">Queue: 12 pending • FCM synced</p>
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" /> Databases & Storage
              </h2>
            </div>
            <div className="p-4 space-y-4">
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">Primary PostgreSQL (Read/Write)</span>
                  <span className="text-xs font-bold text-emerald-600">Healthy</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Storage: 45% used (450GB / 1TB)</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">Redis Cache (Session & Cart)</span>
                  <span className="text-xs font-bold text-emerald-600">Healthy</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Memory: 82% used (13GB / 16GB) • Hits: 98%</p>
              </div>

            </div>
          </div>
        </div>

        {/* Server Resources (Right 1/3) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-slate-600" /> Server Resources
                </h2>
             </div>
             
             <div className="p-4 space-y-6">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center relative shrink-0">
                   <Cpu className="w-5 h-5 text-indigo-600" />
                   <svg className="absolute inset-0 w-full h-full -rotate-90">
                     <circle cx="20" cy="20" r="18" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="113" strokeDashoffset="45" />
                   </svg>
                 </div>
                 <div>
                   <p className="font-bold text-slate-900">CPU Usage</p>
                   <p className="text-sm text-slate-500">60% (16 Cores Active)</p>
                 </div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border-4 border-amber-100 flex items-center justify-center relative shrink-0">
                   <HardDrive className="w-5 h-5 text-amber-600" />
                   <svg className="absolute inset-0 w-full h-full -rotate-90">
                     <circle cx="20" cy="20" r="18" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="113" strokeDashoffset="22" />
                   </svg>
                 </div>
                 <div>
                   <p className="font-bold text-slate-900">RAM Usage</p>
                   <p className="text-sm text-slate-500">80% (25.6GB / 32GB)</p>
                 </div>
               </div>
             </div>
          </div>

          {/* Critical Logs Preview */}
          <div className="bg-slate-900 rounded-2xl shadow-sm overflow-hidden text-slate-300 font-mono text-xs">
             <div className="p-3 border-b border-slate-800 bg-black/50 flex justify-between items-center">
                <span className="font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4" /> Live Tail Logs</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             </div>
             <div className="p-4 space-y-2 h-[250px] overflow-auto">
               <p><span className="text-emerald-400">[INFO]</span> [AuthService] Token refreshed for UserID: 8812</p>
               <p><span className="text-emerald-400">[INFO]</span> [Logistics] Taxi route calculated (24ms)</p>
               <p><span className="text-amber-400">[WARN]</span> [PaymentService] Gateway timeout on attempt 1. Retrying...</p>
               <p><span className="text-emerald-400">[INFO]</span> [Grocery] Inventory synced for StoreID: 41</p>
               <p><span className="text-red-400">[ERROR]</span> [MailService] SMTP connection failed. Connection refused.</p>
               <p><span className="text-emerald-400">[INFO]</span> [Pharmacy] Prescription #9182 verified by Admin ID: 12</p>
               <p><span className="text-emerald-400">[INFO]</span> [AuthService] Successful login from IP 192.168.1.5</p>
             </div>
          </div>

        </div>
      </div>

    </div>
  );
}
