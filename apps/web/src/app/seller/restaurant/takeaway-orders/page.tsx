'use client';
import React, { useState } from 'react';
import { Clock, Phone, CheckCircle, XCircle, ChefHat, ShoppingBag, Users, Bell, Package } from 'lucide-react';

type TakeawayOrderStatus = 'restaurant_pending' | 'restaurant_accepted' | 'preparing' | 'ready_for_pickup' | 'customer_arrived' | 'collected' | 'completed' | 'restaurant_rejected';

type TakeawayOrder = {
  id: string; customer: string; mobile: string; items: string[];
  pickupTime: string; total: number; status: TakeawayOrderStatus;
  paymentStatus: 'paid' | 'pending'; createdAt: string; prepTime: number;
};

const INIT_ORDERS: TakeawayOrder[] = [
  { id: 'TKW-9981', customer: 'Ahmed Al-Rashidi', mobile: '+966 55 123 4567', items: ['2× Chicken Biryani', '1× Paneer Butter Masala', '4× Butter Naan'], pickupTime: 'ASAP', total: 1180, status: 'restaurant_pending', paymentStatus: 'paid', createdAt: '3 min ago', prepTime: 20 },
  { id: 'TKW-9980', customer: 'Fatima Zahra', mobile: '+966 55 987 6543', items: ['1× Mutton Biryani', '2× Raita', '1× Gulab Jamun'], pickupTime: '7:30 PM', total: 548, status: 'preparing', paymentStatus: 'paid', createdAt: '18 min ago', prepTime: 15 },
  { id: 'TKW-9979', customer: 'Omar Khalil', mobile: '+966 55 456 7890', items: ['3× Chicken 65', '2× Butter Naan'], pickupTime: '8:00 PM', total: 818, status: 'ready_for_pickup', paymentStatus: 'paid', createdAt: '35 min ago', prepTime: 0 },
  { id: 'TKW-9978', customer: 'Sara Al-Mutairi', mobile: '+966 55 321 0987', items: ['1× Family Biryani Pack', '4× Naan'], pickupTime: '8:30 PM', total: 1299, status: 'customer_arrived', paymentStatus: 'paid', createdAt: '50 min ago', prepTime: 0 },
];

const STATUS_CONFIG: Record<TakeawayOrderStatus, { label: string; color: string; bg: string; }> = {
  restaurant_pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  restaurant_accepted: { label: 'Accepted', color: 'text-blue-700', bg: 'bg-blue-100' },
  preparing: { label: 'Preparing', color: 'text-orange-700', bg: 'bg-orange-100' },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'text-green-700', bg: 'bg-green-100' },
  customer_arrived: { label: 'Customer Arrived', color: 'text-teal-700', bg: 'bg-teal-100' },
  collected: { label: 'Collected', color: 'text-purple-700', bg: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  restaurant_rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function SellerTakeawayOrdersPage() {
  const [orders, setOrders] = useState(INIT_ORDERS);
  const [filter, setFilter] = useState<TakeawayOrderStatus | 'all'>('all');

  const advance = (id: string, next: TakeawayOrderStatus) => setOrders(p => p.map(o => o.id === id ? { ...o, status: next } : o));
  const reject = (id: string) => advance(id, 'restaurant_rejected');

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const pending = orders.filter(o => o.status === 'restaurant_pending').length;
  const preparing = orders.filter(o => o.status === 'preparing').length;
  const ready = orders.filter(o => o.status === 'ready_for_pickup').length;
  const arrived = orders.filter(o => o.status === 'customer_arrived').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600" /> Takeaway Orders
          </h1>
          <p className="text-slate-500 text-sm">Manage all incoming takeaway orders in real-time</p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl animate-pulse">
            <Bell className="w-4 h-4" />
            <span className="font-black text-sm">{pending} New Order{pending > 1 ? 's' : ''}!</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'New / Pending', value: pending, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Preparing', value: preparing, icon: ChefHat, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Ready for Pickup', value: ready, icon: Package, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Customer Arrived', value: arrived, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center shadow-sm`}>
            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'restaurant_pending', 'preparing', 'ready_for_pickup', 'customer_arrived', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${filter === f ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-400'}`}>
            {f === 'all' ? 'All Orders' : STATUS_CONFIG[f as TakeawayOrderStatus]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-4">
        {filtered.map(order => {
          const cfg = STATUS_CONFIG[order.status];
          return (
            <div key={order.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${order.status === 'restaurant_pending' ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-200'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900">{order.id}</p>
                      {order.status === 'restaurant_pending' && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">NEW!</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{order.createdAt}</p>
                  </div>
                </div>
                <span className={`${cfg.bg} ${cfg.color} px-2.5 py-1 rounded-xl text-xs font-bold`}>{cfg.label}</span>
              </div>

              {/* Customer & Pickup */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium mb-1">Customer</p>
                  <p className="font-bold text-slate-900 text-sm">{order.customer}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <p className="text-xs text-slate-500">{order.mobile}</p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium mb-1">Pickup Time</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <p className="font-black text-purple-700 text-sm">{order.pickupTime}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-xs font-bold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                      {order.paymentStatus === 'paid' ? '✓ Paid' : '⚠ Unpaid'} • ₹{order.total}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-400 font-medium mb-1.5">Order Items</p>
                <div className="flex flex-wrap gap-1.5">
                  {order.items.map(item => (
                    <span key={item} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded-lg font-medium">{item}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {order.status === 'restaurant_pending' && (<>
                  <button onClick={() => advance(order.id, 'restaurant_accepted')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Accept Order
                  </button>
                  <button onClick={() => reject(order.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>)}
                {order.status === 'restaurant_accepted' && (
                  <button onClick={() => advance(order.id, 'preparing')}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <ChefHat className="w-4 h-4" /> Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button onClick={() => advance(order.id, 'ready_for_pickup')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <Package className="w-4 h-4" /> Mark Ready for Pickup
                  </button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <button onClick={() => advance(order.id, 'customer_arrived')}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <Users className="w-4 h-4" /> Customer Arrived
                  </button>
                )}
                {order.status === 'customer_arrived' && (
                  <button onClick={() => advance(order.id, 'collected')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Mark Collected
                  </button>
                )}
                {order.status === 'collected' && (
                  <button onClick={() => advance(order.id, 'completed')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Mark Completed
                  </button>
                )}
                {(order.status === 'completed' || order.status === 'restaurant_rejected') && (
                  <div className="flex-1 bg-slate-100 text-slate-500 rounded-xl py-2.5 text-sm text-center font-medium">
                    {order.status === 'completed' ? '✓ Order Completed' : '✗ Order Rejected'}
                  </div>
                )}
                <button className="bg-slate-100 text-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-200 transition-colors">Support</button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-lg">No takeaway orders</p>
            <p className="text-slate-300 text-sm">New orders will appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
