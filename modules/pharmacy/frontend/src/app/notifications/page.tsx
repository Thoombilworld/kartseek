'use client';
import React, { useState } from 'react';
import { ArrowLeft, Bell, Package, FileText, AlertTriangle, CheckCircle, Truck, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';

const notifications = [
  { id: 1, type: 'order' as const, title: 'Order Delivered', desc: 'Order #PH-2026-1234 has been delivered. Rate your experience!', time: '5 min ago', read: false },
  { id: 2, type: 'prescription' as const, title: 'Prescription Verified', desc: 'Your prescription RX-4521 has been verified by the pharmacist.', time: '2 hours ago', read: false },
  { id: 3, type: 'delivery' as const, title: 'Out for Delivery', desc: 'Your order #PH-2026-1234 is on the way. ETA: 15 minutes.', time: '3 hours ago', read: true },
  { id: 4, type: 'offer' as const, title: '20% Off Wellness Products', desc: 'Use code WELLNESS20. Valid until July 15, 2026.', time: '1 day ago', read: true },
  { id: 5, type: 'alert' as const, title: 'Refund Processed', desc: 'Refund of ₹89 for order #PH-2026-1190 has been credited.', time: '2 days ago', read: true },
  { id: 6, type: 'order' as const, title: 'Order Confirmed', desc: 'Order #PH-2026-1234 confirmed. Preparing your medicines.', time: '3 days ago', read: true },
];

const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
  order: { icon: <Package className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-100' },
  prescription: { icon: <FileText className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100' },
  delivery: { icon: <Truck className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-100' },
  offer: { icon: <Tag className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100' },
  alert: { icon: <CheckCircle className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState(notifications);
  const unread = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setItems([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Notifications</h1>
            {unread > 0 && <p className="text-sm text-teal-600 font-medium">{unread} unread</p>}
          </div>
          <button onClick={markAllRead} className="text-sm font-medium text-teal-600 hover:text-teal-800">Mark all read</button>
          <button onClick={clearAll} className="p-2 rounded-lg hover:bg-gray-100"><Trash2 className="w-4 h-4 text-gray-400" /></button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border divide-y">
            {items.map(n => {
              const cfg = iconMap[n.type];
              return (
                <div key={n.id} className={`p-4 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-teal-50/30' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.desc}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
