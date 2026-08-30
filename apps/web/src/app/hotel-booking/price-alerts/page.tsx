'use client';
import React, { useState } from 'react';
import { Bell, BellOff, Star, TrendingDown, Trash2, Plus, Calendar, MapPin, DollarSign } from 'lucide-react';

const ALERTS = [
  { id: 'pa-001', hotelName: 'The Grand Palace Hotel', city: 'Dubai', targetPrice: 400, currentPrice: 450, checkin: '2026-08-15', checkout: '2026-08-18', status: 'active', notifyEmail: true, notifyPush: true, createdAt: '2026-07-01', image: '🏨' },
  { id: 'pa-002', hotelName: 'Heritage Boutique Hotel', city: 'Dubai', targetPrice: 550, currentPrice: 650, checkin: '2026-09-01', checkout: '2026-09-04', status: 'active', notifyEmail: true, notifyPush: false, createdAt: '2026-07-03', image: '🏰' },
  { id: 'pa-003', hotelName: 'Seaside Family Resort', city: 'Dubai', targetPrice: 350, currentPrice: 320, checkin: '2026-07-20', checkout: '2026-07-23', status: 'triggered', notifyEmail: true, notifyPush: true, createdAt: '2026-06-28', image: '🏖️' },
];

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [showCreate, setShowCreate] = useState(false);

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Price Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">Get notified when hotel prices drop to your target</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
          <Plus className="w-4 h-4" /> Create Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900">New Price Alert</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="hotel-or-destination">Hotel or Destination</label>
              <input id="hotel-or-destination" type="text" placeholder="Search hotels..." className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="target-price-aed">Target Price (AED)</label>
              <input id="target-price-aed" type="number" placeholder="400" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="check-in">Check-in</label>
              <input id="check-in" type="date" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="check-out">Check-out</label>
              <input id="check-out" type="date" className="w-full px-3 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="accent-rose-600" /> Email alerts</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="accent-rose-600" /> Push notifications</label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors">Create Alert</button>
          </div>
        </div>
      )}

      {/* Alert Cards */}
      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
            alert.status === 'triggered' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{alert.image}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{alert.hotelName}</h3>
                    {alert.status === 'triggered' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> PRICE DROPPED!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alert.city}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {alert.checkin} → {alert.checkout}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Current Price</p>
                      <p className={`text-lg font-black ${alert.currentPrice <= alert.targetPrice ? 'text-emerald-600' : 'text-slate-900'}`}>
                        AED {alert.currentPrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Target Price</p>
                      <p className="text-lg font-black text-rose-600">AED {alert.targetPrice}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Difference</p>
                      <p className={`text-lg font-black ${alert.currentPrice > alert.targetPrice ? 'text-red-500' : 'text-emerald-600'}`}>
                        {alert.currentPrice > alert.targetPrice ? '+' : '-'}AED {Math.abs(alert.currentPrice - alert.targetPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {alert.notifyEmail && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">📧 Email</span>}
                    {alert.notifyPush && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">🔔 Push</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {alert.status === 'triggered' && (
                  <button className="px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors">
                    Book Now
                  </button>
                )}
                <button onClick={() => deleteAlert(alert.id)}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No price alerts</h3>
          <p className="text-sm text-slate-500">Create your first alert to get notified when prices drop</p>
        </div>
      )}
    </div>
  );
}
