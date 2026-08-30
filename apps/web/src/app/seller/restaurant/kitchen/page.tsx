'use client';
import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertTriangle, CheckCircle, Bell, Bike, ShoppingBag, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

// ── Types & Data ─────────────────────────────────────────────────────────────

type KDSStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed';

interface KDSOrder {
  id: string; items: string[]; specialInstructions?: string; status: KDSStatus;
  type: 'delivery' | 'takeaway' | 'dine-in'; table?: string;
  total: number; customer: string; createdAt: number; prepTimeMin: number;
}

const MOCK_ORDERS: KDSOrder[] = [
  { id: 'ORD-9982', items: ['2x Chicken Biryani', '1x Paneer Tikka', '3x Butter Naan'], specialInstructions: 'Extra spicy biryani, no onion in tikka', status: 'new', type: 'delivery', total: 840, customer: 'Rajesh K.', createdAt: Date.now() - 60000, prepTimeMin: 25 },
  { id: 'ORD-9981', items: ['1x Mutton Rogan Josh', '2x Garlic Naan'], status: 'new', type: 'takeaway', total: 520, customer: 'Priya M.', createdAt: Date.now() - 180000, prepTimeMin: 30 },
  { id: 'ORD-9980', items: ['1x Mutton Mandi', '1x Arabic Salad'], specialInstructions: 'Low salt', status: 'accepted', type: 'delivery', total: 480, customer: 'Ahmed R.', createdAt: Date.now() - 300000, prepTimeMin: 35 },
  { id: 'ORD-9979', items: ['3x Butter Chicken', '4x Naan', '2x Raita'], status: 'preparing', type: 'dine-in', table: 'T-05', total: 920, customer: 'Anita S.', createdAt: Date.now() - 600000, prepTimeMin: 20 },
  { id: 'ORD-9978', items: ['1x Veg Pulao', '1x Dal Makhani'], status: 'preparing', type: 'delivery', total: 340, customer: 'David O.', createdAt: Date.now() - 900000, prepTimeMin: 18 },
  { id: 'ORD-9977', items: ['2x Tandoori Chicken Half', '2x Roomali Roti'], status: 'ready', type: 'takeaway', total: 560, customer: 'Sara L.', createdAt: Date.now() - 1200000, prepTimeMin: 20 },
  { id: 'ORD-9976', items: ['1x Family Biryani Pack'], status: 'ready', type: 'delivery', total: 699, customer: 'Omar K.', createdAt: Date.now() - 1500000, prepTimeMin: 30 },
];

const LANES: { status: KDSStatus; label: string; color: string; headerBg: string }[] = [
  { status: 'new', label: 'New Orders', color: 'border-orange-300', headerBg: 'bg-orange-600' },
  { status: 'accepted', label: 'Accepted', color: 'border-blue-300', headerBg: 'bg-blue-600' },
  { status: 'preparing', label: 'Preparing', color: 'border-amber-300', headerBg: 'bg-amber-600' },
  { status: 'ready', label: 'Ready', color: 'border-emerald-300', headerBg: 'bg-emerald-600' },
];

const TYPE_ICON = { delivery: Bike, takeaway: ShoppingBag, 'dine-in': UtensilsCrossed };
const TYPE_LABEL = { delivery: 'Delivery', takeaway: 'Takeaway', 'dine-in': 'Dine-in' };

function getElapsedMin(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 60000);
}

function getUrgency(elapsed: number, prepTime: number): 'green' | 'yellow' | 'red' {
  const ratio = elapsed / prepTime;
  if (ratio < 0.6) return 'green';
  if (ratio < 1) return 'yellow';
  return 'red';
}

const URGENCY_STYLES = {
  green: 'border-l-emerald-500',
  yellow: 'border-l-amber-500',
  red: 'border-l-red-500 animate-pulse',
};

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [, setTick] = useState(0);

  // Re-render every 30s to update elapsed times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const advanceStatus = (id: string) => {
    const nextMap: Record<string, KDSStatus> = { new: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' };
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: nextMap[o.status] || o.status } : o));
  };

  const getActionLabel = (status: KDSStatus): string => {
    const map: Record<string, string> = { new: 'Accept', accepted: 'Start Preparing', preparing: 'Mark Ready', ready: 'Complete' };
    return map[status] || '';
  };

  const newCount = orders.filter((o) => o.status === 'new').length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-600" /> Kitchen Display System
          </h1>
          <p className="text-sm text-slate-500">Real-time order tracking and preparation management</p>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl animate-pulse">
              <Bell className="w-4 h-4" />
              <span className="font-black text-sm">{newCount} New Order{newCount > 1 ? 's' : ''}!</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-slate-700">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {LANES.map((lane) => {
          const count = orders.filter((o) => o.status === lane.status).length;
          return (
            <div key={lane.status} className={`${lane.headerBg} rounded-xl p-3 text-white text-center shadow-sm`}>
              <p className="text-2xl font-black">{count}</p>
              <p className="text-[10px] font-bold opacity-80 uppercase">{lane.label}</p>
            </div>
          );
        })}
      </div>

      {/* Kanban Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LANES.map((lane) => {
          const laneOrders = orders.filter((o) => o.status === lane.status);
          return (
            <div key={lane.status} className="flex flex-col">
              {/* Lane Header */}
              <div className={`${lane.headerBg} text-white px-4 py-2.5 rounded-t-2xl flex items-center justify-between`}>
                <span className="font-bold text-sm">{lane.label}</span>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{laneOrders.length}</span>
              </div>

              {/* Lane Content */}
              <div className={`flex-1 bg-slate-50 border-2 ${lane.color} border-t-0 rounded-b-2xl p-3 space-y-3 min-h-[400px]`}>
                {laneOrders.map((order) => {
                  const elapsed = getElapsedMin(order.createdAt);
                  const urgency = getUrgency(elapsed, order.prepTimeMin);
                  const Icon = TYPE_ICON[order.type];

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 ${URGENCY_STYLES[urgency]}`}
                    >
                      {/* Card Header */}
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">{order.id}</span>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Icon className="w-3 h-3" /> {TYPE_LABEL[order.type]}
                          </span>
                          {order.table && <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{order.table}</span>}
                        </div>
                        <span className="font-bold text-xs text-slate-700">₹{order.total}</span>
                      </div>

                      {/* Items */}
                      <div className="px-3 py-2">
                        <ul className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                              <span className="text-orange-500 font-bold mt-0.5">•</span> {item}
                            </li>
                          ))}
                        </ul>
                        {order.specialInstructions && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                            <p className="text-[10px] font-bold text-amber-800">📝 {order.specialInstructions}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${
                          urgency === 'red' ? 'text-red-600' : urgency === 'yellow' ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {urgency === 'red' && <AlertTriangle className="w-3 h-3" />}
                          <Clock className="w-3 h-3" />
                          {elapsed}m ago
                          {urgency === 'red' && <span className="ml-1">DELAYED</span>}
                        </div>
                        <button
                          onClick={() => advanceStatus(order.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-colors flex items-center gap-1 ${
                            lane.status === 'new' ? 'bg-orange-600 hover:bg-orange-700' :
                            lane.status === 'accepted' ? 'bg-blue-600 hover:bg-blue-700' :
                            lane.status === 'preparing' ? 'bg-amber-600 hover:bg-amber-700' :
                            'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {getActionLabel(lane.status)} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {laneOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <CheckCircle className="w-8 h-8 mb-2" />
                    <p className="text-xs font-medium">No orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
