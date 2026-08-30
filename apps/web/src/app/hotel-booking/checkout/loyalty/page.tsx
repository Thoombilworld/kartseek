'use client';
import React, { useState } from 'react';
import { Gift, Star, ArrowRight, Info, Zap, Minus, Plus, CheckCircle2, Trophy } from 'lucide-react';

const LOYALTY = { points: 12500, tier: 'Gold', conversionRate: 100, currency: 'AED', nextTierPoints: 20000, nextTier: 'Platinum' };
const BOOKING = { subtotal: 1350, taxesAndFees: 202, roomName: 'Deluxe King Room', nights: 3, hotelName: 'The Grand Palace Hotel' };

export default function LoyaltyCheckoutPage() {
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [redeemAll, setRedeemAll] = useState(false);

  const maxRedeemableValue = Math.min(LOYALTY.points / LOYALTY.conversionRate, BOOKING.subtotal + BOOKING.taxesAndFees);
  const maxRedeemablePoints = Math.min(LOYALTY.points, maxRedeemableValue * LOYALTY.conversionRate);
  const discountAmount = pointsToRedeem / LOYALTY.conversionRate;
  const grandTotal = BOOKING.subtotal + BOOKING.taxesAndFees - discountAmount;
  const pointsEarned = Math.round(grandTotal * 2); // 2 pts per AED spent

  const toggleRedeemAll = () => {
    if (redeemAll) {
      setRedeemAll(false);
      setPointsToRedeem(0);
    } else {
      setRedeemAll(true);
      setPointsToRedeem(maxRedeemablePoints);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Redeem Loyalty Points</h1>
        <p className="text-sm text-slate-500 mt-1">Use your KARTSEEK Rewards points toward this booking</p>
      </div>

      {/* Points Balance Card */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-xl shadow-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/70 font-semibold">{LOYALTY.tier} Member</p>
              <p className="text-3xl font-black">{LOYALTY.points.toLocaleString()} pts</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">Worth up to</p>
            <p className="text-xl font-black">{LOYALTY.currency} {(LOYALTY.points / LOYALTY.conversionRate).toLocaleString()}</p>
          </div>
        </div>
        {/* Tier Progress */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-white/60 mb-1">
            <span>{LOYALTY.tier}</span>
            <span>{LOYALTY.nextTier} ({LOYALTY.nextTierPoints.toLocaleString()} pts)</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/80 rounded-full" style={{ width: `${(LOYALTY.points / LOYALTY.nextTierPoints) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Conversion Info */}
      <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 rounded-xl border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700"><span className="font-bold">{LOYALTY.conversionRate} points = {LOYALTY.currency} 1.</span> Maximum redeemable for this booking: <span className="font-bold">{maxRedeemablePoints.toLocaleString()} pts ({LOYALTY.currency} {maxRedeemableValue.toLocaleString()})</span></p>
      </div>

      {/* Redeem Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-slate-900">How many points to redeem?</h3>

        <button onClick={toggleRedeemAll}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all ${
            redeemAll ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              redeemAll ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
            }`}>
              {redeemAll && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <span className="font-semibold text-slate-800">Use maximum points</span>
          </div>
          <span className="font-bold text-amber-600">{maxRedeemablePoints.toLocaleString()} pts</span>
        </button>

        <div className={`space-y-3 ${redeemAll ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Custom points</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPointsToRedeem(Math.max(0, pointsToRedeem - 500))}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <Minus className="w-3 h-3 text-slate-600" />
              </button>
              <span className="font-bold text-slate-900 min-w-[120px] text-center">
                {pointsToRedeem.toLocaleString()} pts
              </span>
              <button onClick={() => setPointsToRedeem(Math.min(maxRedeemablePoints, pointsToRedeem + 500))}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <Plus className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          </div>
          <input type="range" min={0} max={maxRedeemablePoints} step={100} value={pointsToRedeem}
            onChange={e => setPointsToRedeem(+e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0 pts</span>
            <span>{maxRedeemablePoints.toLocaleString()} pts</span>
          </div>
          {pointsToRedeem > 0 && (
            <p className="text-xs text-amber-600 font-semibold text-center">
              = {LOYALTY.currency} {discountAmount.toLocaleString()} discount
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4">Booking Summary</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{BOOKING.roomName} × {BOOKING.nights} nights</span>
            <span className="font-semibold text-slate-900">{LOYALTY.currency} {BOOKING.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Taxes & Fees</span>
            <span className="font-semibold text-slate-900">{LOYALTY.currency} {BOOKING.taxesAndFees}</span>
          </div>
          {pointsToRedeem > 0 && (
            <div className="flex justify-between text-amber-600">
              <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Points Redeemed ({pointsToRedeem.toLocaleString()} pts)</span>
              <span className="font-bold">-{LOYALTY.currency} {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <hr className="border-slate-100" />
          <div className="flex justify-between">
            <span className="font-bold text-slate-900">Amount Due</span>
            <span className="font-black text-lg text-rose-600">{LOYALTY.currency} {Math.max(0, grandTotal).toLocaleString()}</span>
          </div>
        </div>

        {/* Points Earned */}
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
          <Zap className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-700 font-semibold">You'll earn <span className="font-bold">{pointsEarned.toLocaleString()} points</span> from this booking!</span>
        </div>

        <button className="w-full mt-5 py-3.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
          Apply & Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
