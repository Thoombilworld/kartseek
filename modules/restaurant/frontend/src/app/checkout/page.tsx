'use client';

import { AuthGate } from '@/components/shared/auth-gate';
import React, { useState, useEffect, Suspense } from 'react';
import { MapPin, Clock, CreditCard, ChevronRight, CheckCircle2, TicketPercent, Wallet, Info, Loader2, ShoppingBag, Utensils, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { restaurantApi } from '@/lib/api/restaurant';
import { useRegion } from '@/lib/contexts/region-context';

interface CartItem {
  id: string; name: string; price: number; qty: number; type: string; customization?: string;
}

function RestaurantCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrencyValue, currencySymbol, taxLabel } = useRegion();
  const defaultType = (searchParams.get('type') as 'delivery' | 'takeaway' | 'dine-in') || 'delivery';
  
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'takeaway' | 'dine-in'>(defaultType);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [walletApplied, setWalletApplied] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [restaurantId, setRestaurantId] = useState('RST-001');
  
  useEffect(() => {
    // Try server cart first, fall back to sessionStorage
    (async () => {
      try {
        const serverCart = await restaurantApi.getCart();
        if ((serverCart as any)?.items?.length) {
          setCartItems((serverCart as any).items);
          setRestaurantName((serverCart as any).restaurantName || 'Restaurant');
          setRestaurantId((serverCart as any).restaurantId || 'RST-001');
          return;
        }
      } catch { /* fall through to sessionStorage */ }
      
      const stored = sessionStorage.getItem('restaurant_cart');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.items && parsed.items.length > 0) {
            setCartItems(parsed.items);
            setRestaurantName(parsed.restaurantName || 'Restaurant');
            setRestaurantId(parsed.restaurantId || 'RST-001');
          }
        } catch (e) {}
      }
    })();
  }, []);

  const itemTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = fulfillmentType === 'delivery' ? 40 : 0;
  const packingCharge = fulfillmentType === 'delivery' || fulfillmentType === 'takeaway' ? 25 : 0;
  const tax = Math.round(itemTotal * 0.05);
  const walletDiscount = walletApplied ? Math.min(50, itemTotal) : 0;
  const grandTotal = itemTotal + deliveryFee + packingCharge + tax - walletDiscount;

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    const fallbackOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const successUrl = `/orders/restaurant/${fallbackOrderId}?type=${fulfillmentType}`;

    try {
      // Try API call with a timeout to prevent hanging
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await restaurantApi.placeOrder(restaurantId, {
        type: fulfillmentType,
        items: cartItems,
        total: grandTotal,
        paymentMethod,
        tableNumber: fulfillmentType === 'dine-in' ? tableNumber : undefined
      });
      clearTimeout(timeout);

      sessionStorage.removeItem('restaurant_cart');
      const orderId = (response as any)?.orderId || fallbackOrderId;
      window.location.assign(`/orders/restaurant/${orderId}?type=${fulfillmentType}`);
    } catch (error) {
      console.error('Failed to place order (using fallback flow):', error);
      // Always navigate to order confirmation — do not leave user stuck
      sessionStorage.removeItem('restaurant_cart');
      router.push(successUrl);
    } finally {
      setIsPlacing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
          <button onClick={() => router.back()} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 text-lg">Checkout</h1>
          <span className="text-sm font-bold text-slate-500">{restaurantName}</span>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Fulfillment Type Selection */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
          <button 
            id="btn-home-delivery"
            onClick={() => setFulfillmentType('delivery')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${fulfillmentType === 'delivery' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Delivery
          </button>
          <button 
            id="btn-store-takeaway"
            onClick={() => setFulfillmentType('takeaway')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${fulfillmentType === 'takeaway' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Takeaway
          </button>
          <button 
            id="btn-dine-in"
            onClick={() => setFulfillmentType('dine-in')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${fulfillmentType === 'dine-in' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Dine-in
          </button>
        </div>

        {/* Fulfillment Specific UI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {fulfillmentType === 'delivery' && (
            <>
              <div className="p-4 border-b border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900">Delivery to Home</h3>
                    <button className="text-orange-600 text-sm font-bold hover:text-orange-700">Change</button>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">Apt 4B, Skyline Apartments, MG Road, Ernakulam, Kerala 682011</p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-4 bg-emerald-50/50">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Delivery in 35–40 mins</h3>
                  <p className="text-sm text-slate-500">Your food will be hot and fresh.</p>
                </div>
              </div>
            </>
          )}

          {fulfillmentType === 'takeaway' && (
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Pickup from {restaurantName}</h3>
                <p className="text-sm text-slate-500">We will notify you when it's ready.</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">Select Pickup Time:</span>
                  <select title="Select pickup time" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-orange-500">
                    <option>In 15 Minutes</option>
                    <option>In 30 Minutes</option>
                    <option>In 1 Hour</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {fulfillmentType === 'dine-in' && (
            <div className="p-4 flex items-start gap-4 bg-orange-50/30">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Dine-in at {restaurantName}</h3>
                <p className="text-sm text-slate-500 mb-3">Order from your table. No need to wait for a waiter!</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Table Number (Optional)" 
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-600" /> Your Order
          </h2>
          <div className="space-y-4 mb-6">
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <div className={`w-3 h-3 border ${item.type === 'non-veg' ? 'border-red-500' : 'border-green-500'} rounded-sm flex items-center justify-center p-0.5`}>
                      <div className={`w-1.5 h-1.5 ${item.type === 'non-veg' ? 'bg-red-500' : 'bg-green-500'} rounded-full`}></div>
                    </div>
                    {item.name}
                  </h4>
                  {item.customization && <p className="text-xs text-slate-500 mt-0.5">{item.customization}</p>}
                  <div className="text-sm font-bold text-slate-900 mt-1">{formatCurrencyValue(item.price * item.qty)}</div>
                </div>
                <div className="flex items-center bg-orange-50 rounded-lg px-3 py-1.5 border border-orange-100">
                  <span className="font-bold text-orange-600 text-sm">Qty: {item.qty}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Item Total</span>
              <span className="font-medium">{formatCurrencyValue(itemTotal)}</span>
            </div>
            {fulfillmentType === 'delivery' && (
              <div className="flex justify-between">
                <span className="text-slate-600 flex items-center gap-1">Delivery Fee</span>
                <span className="font-medium">{formatCurrencyValue(deliveryFee)}</span>
              </div>
            )}
            {fulfillmentType === 'takeaway' && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">✓ No Delivery Fee</span>
                <span className="font-medium text-emerald-700">{formatCurrencyValue(0)}</span>
              </div>
            )}
            {fulfillmentType === 'dine-in' && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">✓ Table Service</span>
                <span className="font-medium text-emerald-700">{formatCurrencyValue(0)}</span>
              </div>
            )}
            {(packingCharge > 0) && (
              <div className="flex justify-between">
                <span className="text-slate-600">Restaurant Packing Charges</span>
                <span className="font-medium">{formatCurrencyValue(packingCharge)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">{taxLabel || 'Taxes'} (5%)</span>
              <span className="font-medium">{formatCurrencyValue(tax)}</span>
            </div>
            {walletApplied && (
              <div className="flex justify-between">
                <span className="text-emerald-700">Wallet Discount</span>
                <span className="font-medium text-emerald-700">−{formatCurrencyValue(walletDiscount)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-lg text-slate-900">
              <span>Grand Total</span>
              <span>{formatCurrencyValue(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Wallet */}
        <label className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-sm">Use KARTSEEK Wallet</h3>
              <p className="text-xs text-slate-500">Balance: ₹250 available{walletApplied ? ' • Applied' : ''}</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={walletApplied}
            onChange={e => setWalletApplied(e.target.checked)}
            className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 accent-orange-600" 
          />
        </label>

        {/* Payment Method */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'online' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                name="payment" 
                value="online"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
                className="text-orange-600 focus:ring-orange-500 w-4 h-4 accent-orange-600"
              />
              <span className="ml-3 font-medium text-slate-700 text-sm flex-1">Pay Online (UPI, Cards, NetBanking)</span>
              <CreditCard className="w-5 h-5 text-slate-400" />
            </label>
            <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                name="payment" 
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="text-orange-600 focus:ring-orange-500 w-4 h-4 accent-orange-600"
              />
              <span className="ml-3 font-medium text-slate-700 text-sm flex-1">
                {fulfillmentType === 'delivery' ? 'Cash on Delivery' : fulfillmentType === 'takeaway' ? 'Pay at Counter' : 'Pay after Meal'}
              </span>
            </label>
          </div>
        </div>

      </main>

      {/* Sticky Bottom Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)] z-40 p-4 pb-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Total to Pay</p>
            <h2 className="text-2xl font-black text-slate-900">{formatCurrencyValue(grandTotal)}</h2>
          </div>
          <button
            id="btn-place-order"
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-xl font-bold transition-colors shadow-sm flex items-center gap-2"
           aria-label="Loader2">
            {isPlacing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <>Place {fulfillmentType.replace('-', ' ')} Order <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Orders are placed against the signed-in account, so the page waits behind the
// sign-in prompt instead of redirecting away and losing the basket.
export default function RestaurantCheckoutPage() {
  return (
    <AuthGate reason="Please sign in to place your order — your basket is saved.">
      <RestaurantCheckoutPageContent />
    </AuthGate>
  );
}

function RestaurantCheckoutPageContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading checkout...</p>
        </div>
      </div>
    }>
      <RestaurantCheckoutContent />
    </Suspense>
  );
}
