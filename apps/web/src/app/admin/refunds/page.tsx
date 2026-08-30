'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import {
  RefreshCcw, Search, CheckCircle, Clock, XCircle, DollarSign, AlertTriangle,
  Eye, ArrowUpRight, X, Package, Calendar, MapPin, Store, MessageSquare,
  Download, ChevronDown, User, CreditCard,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type RefundStatus = 'pending' | 'approved' | 'processed' | 'rejected';
type Refund = {
  id: string; orderId: string; customer: string; email: string; module: string;
  amount: string; amountNum: number; reason: string; description: string;
  status: RefundStatus; date: string; processedBy: string; seller: string;
  paymentMethod: string; city: string; items: string[];
};

const refunds: Refund[] = [
  { id: 'REF-3201', orderId: 'KS-78432', customer: 'Rahul K.', email: 'rahul.k@gmail.com', module: 'Grocery', amount: '₹487', amountNum: 487, reason: 'Wrong item delivered', description: 'Ordered organic apples but received regular ones. Product labels mismatched.', status: 'approved', date: 'Today, 2:30 PM', processedBy: 'System', seller: 'City Supermart', paymentMethod: 'UPI', city: 'Mumbai', items: ['Organic Apples (1kg)', 'Green Tea (100g)'] },
  { id: 'REF-3200', orderId: 'KS-78410', customer: 'Priya S.', email: 'priya.s@gmail.com', module: 'Taxi', amount: '₹180', amountNum: 180, reason: 'Overcharged — wrong route', description: 'Driver took a longer route via highway. GPS shows 8km but charged for 14km.', status: 'pending', date: 'Today, 1:15 PM', processedBy: '—', seller: 'QuickRide Cabs', paymentMethod: 'Card', city: 'Delhi', items: ['Ride: Connaught Place → Hauz Khas'] },
  { id: 'REF-3199', orderId: 'KS-78395', customer: 'Anil M.', email: 'anil.m@yahoo.com', module: 'Marketplace', amount: '₹12,495', amountNum: 12495, reason: 'Product defective', description: 'Samsung Galaxy Watch received with cracked screen. Box was damaged during shipping. Photos attached.', status: 'pending', date: 'Today, 11:40 AM', processedBy: '—', seller: 'Samsung Official', paymentMethod: 'Card', city: 'Bangalore', items: ['Samsung Galaxy Watch 6 Classic'] },
  { id: 'REF-3198', orderId: 'KS-78380', customer: 'Sneha R.', email: 'sneha.r@outlook.com', module: 'Restaurant', amount: '₹220', amountNum: 220, reason: 'Order arrived cold', description: 'Pizza was cold and soggy upon delivery. Delivery took 55 minutes instead of 30.', status: 'approved', date: 'Yesterday', processedBy: 'Anita M.', seller: 'Pizza Paradise', paymentMethod: 'UPI', city: 'Hyderabad', items: ['Pepperoni Pizza (L)', 'Garlic Bread'] },
  { id: 'REF-3197', orderId: 'KS-78365', customer: 'Vikram T.', email: 'vikram.t@gmail.com', module: 'Pharmacy', amount: '₹850', amountNum: 850, reason: 'Wrong medicine dispatched', description: 'Received Crocin instead of prescribed Combiflam. Critical issue as patient needs specific medication.', status: 'processed', date: 'Yesterday', processedBy: 'System', seller: 'MedPlus Pharmacy', paymentMethod: 'Wallet', city: 'Pune', items: ['Combiflam 400mg x2', 'Volini Gel'] },
  { id: 'REF-3196', orderId: 'KS-78350', customer: 'Deepa N.', email: 'deepa.n@gmail.com', module: 'Doctor', amount: '₹500', amountNum: 500, reason: 'Consultation not attended by doctor', description: 'Booked a video consultation but doctor didn\'t join. Waited 20 minutes with no response.', status: 'processed', date: '28 May', processedBy: 'Super Admin', seller: 'Dr. Sharma Clinic', paymentMethod: 'Card', city: 'Chennai', items: ['Video Consultation — General Medicine'] },
  { id: 'REF-3195', orderId: 'KS-78340', customer: 'Meera P.', email: 'meera.p@gmail.com', module: 'Grocery', amount: '₹120', amountNum: 120, reason: 'Expired product', description: 'Received milk that was already 2 days past expiry date. Health hazard.', status: 'processed', date: '28 May', processedBy: 'System', seller: 'FreshMart Organics', paymentMethod: 'UPI', city: 'Ahmedabad', items: ['Amul Toned Milk 1L x2'] },
  { id: 'REF-3194', orderId: 'KS-78330', customer: 'Rajesh K.', email: 'rajesh.k@gmail.com', module: 'Marketplace', amount: '₹2,999', amountNum: 2999, reason: 'Wants to cancel — duplicate order', description: 'Accidentally placed the same order twice. Requesting cancellation of the second order.', status: 'rejected', date: '28 May', processedBy: 'Rahul V.', seller: 'Apple India Store', paymentMethod: 'Card', city: 'Mumbai', items: ['AirPods Pro 2nd Gen'] },
  { id: 'REF-3193', orderId: 'KS-78318', customer: 'Ahmed R.', email: 'ahmed.r@gmail.com', module: 'Marketplace', amount: 'AED 459', amountNum: 459, reason: 'Size mismatch', description: 'Ordered XL shirt but received M size. Label says XL but dimensions are clearly M.', status: 'pending', date: '27 May', processedBy: '—', seller: 'Gulf Fashion Hub', paymentMethod: 'Card', city: 'Dubai', items: ['Ralph Lauren Polo Shirt — XL'] },
  { id: 'REF-3192', orderId: 'KS-78305', customer: 'Sarah T.', email: 'sarah.t@gmail.com', module: 'Hotel', amount: '£220', amountNum: 220, reason: 'Booking cancelled by hotel', description: 'Hotel cancelled my reservation 2 hours before check-in due to overbooking.', status: 'approved', date: '27 May', processedBy: 'System', seller: 'Hilton London', paymentMethod: 'Card', city: 'London', items: ['Standard Room — 1 Night'] },
];

const sCfg: Record<RefundStatus, { bg: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  processed: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};
const modC: Record<string, string> = { Marketplace: 'bg-blue-100 text-blue-700', Grocery: 'bg-green-100 text-green-700', Restaurant: 'bg-orange-100 text-orange-700', Pharmacy: 'bg-cyan-100 text-cyan-700', Doctor: 'bg-purple-100 text-purple-700', Taxi: 'bg-amber-100 text-amber-700', Hotel: 'bg-rose-100 text-rose-700' };

// ── Refund Detail Drawer ────────────────────────────────────────────────────

function RefundDrawer({ refund, onClose, onApprove, onReject }: {
  refund: Refund; onClose: () => void; onApprove: () => void; onReject: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900">Refund Details</h3>
            <p className="text-xs text-slate-400 mt-0.5">{refund.id} · Order {refund.orderId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Amount Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-red-600">{refund.amount}</p>
            <p className="text-xs text-red-500 mt-1">Refund Amount</p>
            <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${sCfg[refund.status].bg}`}>{sCfg[refund.status].icon} {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}</span>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Customer</p>
            <div className="flex items-center gap-3 text-sm"><User className="w-4 h-4 text-slate-400" /><span className="font-bold text-slate-900">{refund.customer}</span></div>
            <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{refund.city}</span></div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Reason</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm font-bold text-amber-800">{refund.reason}</p>
              <p className="text-xs text-amber-700 mt-1">{refund.description}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Items</p>
            <div className="space-y-1.5">
              {refund.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <Package className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Order & Payment</p>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Order ID</span><span className="font-bold font-mono text-slate-900">{refund.orderId}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Module</span><span className={`${modC[refund.module] || 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-md text-xs font-bold`}>{refund.module}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Seller</span><span className="font-bold text-slate-900">{refund.seller}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Payment Method</span><span className="font-bold text-slate-900">{refund.paymentMethod}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Requested</span><span className="text-slate-900">{refund.date}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Processed By</span><span className="font-bold text-slate-900">{refund.processedBy}</span></div>
          </div>
        </div>

        {refund.status === 'pending' && (
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <button onClick={onReject} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Reject</button>
            <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Approve Refund</button>
          </div>
        )}
        {refund.status !== 'pending' && (
          <div className="p-4 border-t border-slate-200">
            <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-bold">Close</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [data, setData] = useState(refunds);
  const [viewRefund, setViewRefund] = useState<Refund | null>(null);

  const f = data.filter(r => {
    const ms = r.customer.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.orderId.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'All' || r.status === sf;
    const mm = moduleFilter === 'All' || r.module === moduleFilter;
    return ms && mst && mm;
  });

  const approveRefund = (id: string) => setData(p => p.map(r => r.id === id ? { ...r, status: 'approved' as const, processedBy: 'Super Admin' } : r));
  const rejectRefund = (id: string) => setData(p => p.map(r => r.id === id ? { ...r, status: 'rejected' as const, processedBy: 'Super Admin' } : r));

  const pendingTotal = data.filter(r => r.status === 'pending').reduce((s, r) => s + r.amountNum, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Refund Management</h1>
          <p className="text-slate-500 text-sm">Review, approve, or reject customer refund requests across all modules.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Clock className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-3">{data.filter(r => r.status === 'pending').length}</p><p className="text-sm text-slate-500 font-medium mt-1">Pending Review</p></div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><CheckCircle className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-3">{data.filter(r => r.status === 'processed').length}</p><p className="text-sm text-slate-500 font-medium mt-1">Processed</p></div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><DollarSign className="w-5 h-5 text-red-500" /><p className="text-2xl font-black text-slate-900 mt-3">₹185K</p><p className="text-sm text-slate-500 font-medium mt-1">Total Refunded (7d)</p></div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><XCircle className="w-5 h-5 text-slate-400" /><p className="text-2xl font-black text-slate-900 mt-3">{data.filter(r => r.status === 'rejected').length}</p><p className="text-sm text-slate-500 font-medium mt-1">Rejected</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search by customer, refund ID, or order ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" /></div>
        <select value={sf} onChange={e => setSf(e.target.value)} aria-label="Filter refunds by status" className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="processed">Processed</option><option value="rejected">Rejected</option></select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} aria-label="Filter by module" className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Modules</option><option value="Marketplace">Marketplace</option><option value="Grocery">Grocery</option><option value="Restaurant">Restaurant</option><option value="Pharmacy">Pharmacy</option><option value="Doctor">Doctor</option><option value="Taxi">Taxi</option><option value="Hotel">Hotel</option></select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Refund</th>
                <th className="px-4 py-3.5 font-semibold">Module</th>
                <th className="px-4 py-3.5 font-semibold">Reason</th>
                <th className="px-4 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {f.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{r.customer}</p>
                    <p className="text-xs text-slate-400">{r.id} · Order {r.orderId} · {r.date}</p>
                  </td>
                  <td className="px-4 py-4"><span className={`${modC[r.module] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}>{r.module}</span></td>
                  <td className="px-4 py-4 text-xs text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-4 text-right font-black text-red-600">{r.amount}</td>
                  <td className="px-4 py-4 text-center"><span className={`${sCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}>{sCfg[r.status].icon} {r.status}</span></td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewRefund(r)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="View Details"><Eye className="w-4 h-4 text-slate-400" /></button>
                      {r.status === 'pending' && <>
                        <button onClick={() => approveRefund(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Approve</button>
                        <button onClick={() => rejectRefund(r.id)} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg">Reject</button>
                      </>}
                      {r.status !== 'pending' && <span className="text-xs text-slate-400">{r.processedBy}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500 flex items-center justify-between">
          <span>Showing {f.length} of {data.length} refunds</span>
          <span className="text-amber-600 font-bold text-xs">Pending total: ₹{pendingTotal.toLocaleString()}</span>
        </div>
      </div>

      {viewRefund && (
        <RefundDrawer
          refund={viewRefund}
          onClose={() => setViewRefund(null)}
          onApprove={() => { approveRefund(viewRefund.id); setViewRefund(null); }}
          onReject={() => { rejectRefund(viewRefund.id); setViewRefund(null); }}
        />
      )}
    </div>
  );
}
