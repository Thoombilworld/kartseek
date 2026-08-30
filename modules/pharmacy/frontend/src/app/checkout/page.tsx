'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Clock, CreditCard, Smartphone, Wallet, Banknote, Shield, ChevronRight, Check, Upload, Pill, Truck } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';

const ADDRESSES = [
  { id:'a1', label:'Home', address:'123 Main Avenue, Westlands, Mumbai', phone:'+91 712 345 678', default:true },
  { id:'a2', label:'Work', address:'45 CBD Tower, MG Road, Mumbai', phone:'+91 712 345 678', default:false },
];

const SLOTS = [
  { id:'s1', label:'Express', time:'25-35 min', extra:49, express:true },
  { id:'s2', label:'Standard', time:'1-2 hours', extra:0, express:false },
  { id:'s3', label:'Scheduled', time:'Choose time', extra:0, express:false },
];

const PAYMENTS = [
  { id:'pm1', label:'UPI', icon:Smartphone, color:'text-green-600 bg-green-50', recommended:true },
  { id:'pm2', label:'Credit / Debit Card', icon:CreditCard, color:'text-blue-600 bg-blue-50', recommended:false },
  { id:'pm3', label:'Wallet', icon:Wallet, color:'text-purple-600 bg-purple-50', recommended:false },
  { id:'pm4', label:'Cash on Delivery', icon:Banknote, color:'text-orange-600 bg-orange-50', recommended:false },
];

// Orders are placed against the signed-in account, so the page waits behind the
// sign-in prompt instead of redirecting away and losing the basket.
export default function PharmacyCheckoutPage() {
  return (
    <AuthGate reason="Please sign in to place your pharmacy order — your basket is saved.">
      <PharmacyCheckoutPageContent />
    </AuthGate>
  );
}

function PharmacyCheckoutPageContent() {
  const [address, setAddress] = useState('a1');
  const [slot, setSlot] = useState('s2');
  const [payment, setPayment] = useState('pm1');
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Checkout</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[{n:1,l:'Address'},{n:2,l:'Delivery'},{n:3,l:'Payment'}].map((s,i) => (
          <React.Fragment key={s.n}>
            <button onClick={()=>setStep(s.n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${step >= s.n ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > s.n ? <Check className="w-4 h-4" /> : <span>{s.n}</span>} {s.l}
            </button>
            {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-teal-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Address */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Delivery Address</h2>
          {ADDRESSES.map(a => (
            <button key={a.id} onClick={()=>setAddress(a.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${address===a.id ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${address===a.id ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <MapPin className={`w-5 h-5 ${address===a.id ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{a.label}</span>
                    {a.default && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded">Default</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{a.address}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.phone}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${address===a.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                  {address===a.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          ))}
          <button onClick={()=>setStep(2)} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Delivery slot */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Delivery Time</h2>
          {SLOTS.map(s => (
            <button key={s.id} onClick={()=>setSlot(s.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${slot===s.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.express ? 'bg-amber-100' : (slot===s.id ? 'bg-teal-100' : 'bg-slate-100')}`}>
                  {s.express ? <Truck className="w-5 h-5 text-amber-600" /> : <Clock className={`w-5 h-5 ${slot===s.id ? 'text-teal-600' : 'text-slate-400'}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{s.label}</span>
                    {s.express && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-extrabold rounded">EXPRESS</span>}
                  </div>
                  <p className="text-sm text-slate-500">{s.time}</p>
                </div>
                <span className={`text-sm font-bold ${s.extra ? 'text-amber-600' : 'text-green-600'}`}>{s.extra ? `+₹${s.extra}` : 'FREE'}</span>
              </div>
            </button>
          ))}
          <button onClick={()=>setStep(3)} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>
          {PAYMENTS.map(p => (
            <button key={p.id} onClick={()=>setPayment(p.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${payment===p.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.color.split(' ')[1]}`}>
                  <p.icon className={`w-5 h-5 ${p.color.split(' ')[0]}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{p.label}</span>
                    {p.recommended && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded">Recommended</span>}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment===p.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                  {payment===p.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          ))}

          {/* Rx upload reminder */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Pill className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Prescription Required</p>
              <p className="text-xs text-amber-700">Upload will be requested after placing order.</p>
            </div>
            <Link href="/prescription/upload" className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 flex items-center gap-1">
              <Upload className="w-3 h-3" /> Upload Now
            </Link>
          </div>

          {/* Summary + Place order */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">₹659</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="font-semibold text-green-600">FREE</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold text-green-600">-₹98</span></div>
              <hr className="border-slate-100" />
              <div className="flex justify-between text-base"><span className="font-bold">Total</span><span className="font-black">₹561</span></div>
            </div>
          </div>

          <button className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" /> Place Order • ₹561
          </button>
        </div>
      )}
    </div>
  );
}
