'use client';
import React, { useState } from 'react';
import { Wallet, CreditCard, ArrowRight, Info, CheckCircle2, Minus, Plus } from 'lucide-react';

const WALLET = { balance: 1250, currency: 'AED' };
const BOOKING = { subtotal: 1350, taxesAndFees: 202, roomName: 'Deluxe King Room', nights: 3, hotelName: 'The Grand Palace Hotel' };

export default function WalletCheckoutPage() {
  const [walletAmount, setWalletAmount] = useState(0);
  const [useFullBalance, setUseFullBalance] = useState(false);

  const maxApplicable = Math.min(WALLET.balance, BOOKING.subtotal + BOOKING.taxesAndFees);
  const grandTotal = BOOKING.subtotal + BOOKING.taxesAndFees - walletAmount;
  const cardAmount = Math.max(0, grandTotal);

  const toggleFullBalance = () => {
    if (useFullBalance) {
      setUseFullBalance(false);
      setWalletAmount(0);
    } else {
      setUseFullBalance(true);
      setWalletAmount(maxApplicable);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Apply Wallet Balance</h1>
        <p className="text-sm text-slate-500 mt-1">Use your KARTSEEK wallet to pay for part or all of your booking</p>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-6 text-white shadow-xl shadow-rose-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/70 font-semibold">Available Balance</p>
            <p className="text-3xl font-black">{WALLET.currency} {WALLET.balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Info className="w-3 h-3" />
          <span>Max applicable to this booking: {WALLET.currency} {maxApplicable.toLocaleString()}</span>
        </div>
      </div>

      {/* Amount Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-slate-900">How much would you like to apply?</h3>

        {/* Full balance toggle */}
        <button onClick={toggleFullBalance}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all ${
            useFullBalance ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              useFullBalance ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
            }`}>
              {useFullBalance && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <span className="font-semibold text-slate-800">Use full applicable balance</span>
          </div>
          <span className="font-bold text-rose-600">{WALLET.currency} {maxApplicable.toLocaleString()}</span>
        </button>

        {/* Custom amount slider */}
        <div className={`space-y-3 ${useFullBalance ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Custom amount</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setWalletAmount(Math.max(0, walletAmount - 50))}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <Minus className="w-3 h-3 text-slate-600" />
              </button>
              <span className="font-bold text-slate-900 min-w-[100px] text-center">
                {WALLET.currency} {walletAmount.toLocaleString()}
              </span>
              <button onClick={() => setWalletAmount(Math.min(maxApplicable, walletAmount + 50))}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <Plus className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          </div>
          <input type="range" min={0} max={maxApplicable} step={10} value={walletAmount}
            onChange={e => setWalletAmount(+e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600" />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0</span>
            <span>{WALLET.currency} {maxApplicable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4">Payment Summary</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{BOOKING.roomName} × {BOOKING.nights} nights</span>
            <span className="font-semibold text-slate-900">{WALLET.currency} {BOOKING.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Taxes & Fees</span>
            <span className="font-semibold text-slate-900">{WALLET.currency} {BOOKING.taxesAndFees}</span>
          </div>
          {walletAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet Applied</span>
              <span className="font-bold">-{WALLET.currency} {walletAmount.toLocaleString()}</span>
            </div>
          )}
          <hr className="border-slate-100" />
          {cardAmount > 0 ? (
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-slate-500"><CreditCard className="w-3 h-3" /> Due on Card</span>
              <span className="font-black text-lg text-slate-900">{WALLET.currency} {cardAmount.toLocaleString()}</span>
            </div>
          ) : (
            <div className="flex justify-between text-emerald-600">
              <span className="font-semibold">Fully covered by wallet! 🎉</span>
              <span className="font-black text-lg">{WALLET.currency} 0</span>
            </div>
          )}
        </div>
        <button className="w-full mt-5 py-3.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
          Continue to Payment <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
