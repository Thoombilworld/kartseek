import React from 'react';
import { Map, TrendingUp, Store, Users, FileText, Download, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FranchiseRestaurantDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Map className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Franchise Region: Kerala (South)</h1>
              <p className="text-sm text-slate-500">ID: FR-9912 | Managing 42 Active Restaurants</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Region KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+18% MoM</span>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Franchise Commission</p>
            <h3 className="text-2xl font-black text-slate-900">₹84,520</h3>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Total Restaurants</p>
            <h3 className="text-2xl font-black text-slate-900">42</h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full animate-pulse">3 Pending</span>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Approvals Needed</p>
            <h3 className="text-2xl font-black text-slate-900">3</h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Customer Complaints</p>
            <h3 className="text-2xl font-black text-slate-900">14</h3>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Performing Restaurants */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Top Performing Partners</h2>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View Leaderboard</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Restaurant</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Total Orders</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Net Revenue</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Franchise Cut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">The Grand Biryani House</p>
                        <p className="text-xs text-slate-500 font-medium">Ernakulam</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">1,245</td>
                      <td className="px-6 py-4 font-medium text-slate-700">₹4,12,000</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">₹8,240</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">Kerala Spice Kitchen</p>
                        <p className="text-xs text-slate-500 font-medium">Kochi</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">980</td>
                      <td className="px-6 py-4 font-medium text-slate-700">₹3,45,000</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">₹6,900</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Center */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Approvals</h2>
              <div className="space-y-3">
                <div className="w-full bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Grill Masterz</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Submitted KYC Docs</p>
                  </div>
                  <button className="text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100">Review</button>
                </div>
                <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Pizza Paradise</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Updated Bank Details</p>
                  </div>
                  <button className="text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100">Review</button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Monthly Settlement</h3>
              <p className="text-sm text-slate-400 mb-4 relative z-10">Your commission payout for this month will be initiated on the 1st.</p>
              <button className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors relative z-10 w-full">
                View Ledger
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
