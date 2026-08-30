'use client';

import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import { Star, Clock, MapPin, Search, Info, Plus, Minus, ChevronRight, CheckCircle2, CircleDot, Bike, Utensils, CalendarDays, ShoppingBag, ShoppingCart, X, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { MOCK_RESTAURANTS, MOCK_MENU } from '@/lib/demo-data/restaurant';
import { restaurantApi } from '@/lib/api/restaurant';
import { useRegion } from '@/lib/contexts/region-context';
import CustomizationModal from '@/components/restaurant/customization-modal';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: string;
}

function RestaurantDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const { currencySymbol, formatCurrencyValue, taxLabel } = useRegion();
  const [selectedCustomizationItem, setSelectedCustomizationItem] = useState<any | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway' | 'dine-in' | 'table-booking'>('delivery');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showVendorModal, setShowVendorModal] = useState<{ item: any; newRestaurant: string } | null>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Pre-select service mode from ?mode= query (e.g., from homepage service modal)
  const searchParams = useSearchParams();
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode && ['delivery', 'takeaway', 'dine-in', 'table-booking'].includes(mode)) {
      setOrderType(mode as typeof orderType);
    }
  }, [searchParams]);

  const restaurant = MOCK_RESTAURANTS.find(r => r.id === slug) || MOCK_RESTAURANTS[0];
  const menuData = MOCK_MENU[slug as keyof typeof MOCK_MENU] || MOCK_MENU['default'];

  // Set initial active category
  useEffect(() => {
    if (menuData.length > 0 && !activeCategory) {
      setActiveCategory(menuData[0].category);
    }
  }, [menuData, activeCategory]);

  // Scroll to category section
  const scrollToCategory = useCallback((categoryName: string) => {
    setActiveCategory(categoryName);
    const el = document.querySelector(`[data-category="${categoryName}"]`) as HTMLElement | null;
    if (el) {
      const headerOffset = 140; // sticky header + category bar
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - headerOffset, behavior: 'smooth' });
    }
  }, []);

  // Track which category is in view while scrolling
  useEffect(() => {
    const handleScroll = () => {
      const headerOffset = 180;
      for (let i = menuData.length - 1; i >= 0; i--) {
        const cat = menuData[i];
        const el = document.querySelector(`[data-category="${cat.category}"]`) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= headerOffset) {
            setActiveCategory(cat.category);
            return;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuData]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addToCart = useCallback((item: { id: string; name: string; price: number; type: string }) => {
    // Restaurant closed validation
    if (!restaurant.isOpen) {
      showToast('🔴 Restaurant is currently closed');
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    // Also sync to server cart (fire-and-forget)
    restaurantApi.addToCart({ restaurantId: restaurant.id, menuItemId: item.id, quantity: 1 }).catch(() => {});
    showToast(`${item.name} added to cart`);
  }, [showToast, restaurant.isOpen, restaurant.id]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(c => c.id !== itemId);
      return prev.map(c => c.id === itemId ? { ...c, qty: c.qty - 1 } : c);
    });
  }, []);

  const getItemQty = (itemId: string) => cart.find(c => c.id === itemId)?.qty ?? 0;

  const handleProceed = () => {
    // Restaurant closed re-validation
    if (!restaurant.isOpen && orderType !== 'table-booking') {
      showToast('🔴 Restaurant is currently closed. Your cart has been saved.');
      return;
    }
    // Sync cart to both sessionStorage (fallback) and server
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('restaurant_cart', JSON.stringify({
        items: cart,
        total: cartTotal,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name
      }));
    }

    if (orderType === 'table-booking') {
      router.push(`/table-booking/${slug}`);
    } else {
      router.push(`/checkout?type=${orderType}`);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            {toast}
          </div>
        </div>
      )}

      {/* Restaurant Closed Banner */}
      {!restaurant.isOpen && (
        <div className="bg-red-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>This restaurant is currently closed. You can browse the menu but cannot place orders.</span>
          </div>
        </div>
      )}

      {/* Multi-Vendor Cart Isolation Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Replace Cart Items?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Your cart contains items from another restaurant. Adding items from <strong>{showVendorModal.newRestaurant}</strong> will clear your current cart.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVendorModal(null)}
                className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCart([]);
                  restaurantApi.clearCart().catch(() => {});
                  const item = showVendorModal.item;
                  addToCart(item);
                  setShowVendorModal(null);
                }}
                className="flex-1 py-3 font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors"
              >
                Yes, Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-48 aspect-video md:aspect-square bg-slate-100 rounded-2xl overflow-hidden shrink-0 shadow-sm relative">
             {restaurant.imageUrl ? (
               <Image src={restaurant.imageUrl} alt={restaurant.name} fill className="object-cover" />
             ) : (
               <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80" alt="Restaurant Cover" className="w-full h-full object-cover" />
             )}
             {restaurant.isPromoted && (
               <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">PROMOTED</div>
             )}
          </div>
          
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{restaurant.name}</h1>
                <div className="flex flex-col items-center bg-green-600 text-white rounded-lg p-1.5 shadow-sm">
                  <div className="flex items-center gap-1 font-bold text-sm">{restaurant.rating} <Star className="w-3.5 h-3.5 fill-current" /></div>
                  <div className="text-[9px] font-medium border-t border-green-500 pt-0.5 mt-0.5 w-full text-center">10K+</div>
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-1">{restaurant.cuisines.join(', ')}</p>
              <p className="text-slate-400 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {restaurant.distance}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-sm font-medium">
               <div className="flex items-center gap-1.5 text-slate-700">
                 <Clock className="w-4 h-4 text-orange-500" /> 
                 {orderType === 'delivery' && restaurant.deliveryTime}
                 {orderType === 'takeaway' && 'Pickup in 15 mins'}
                 {orderType === 'dine-in' && 'Walk-in accepted'}
                 {orderType === 'table-booking' && 'Slots available'}
               </div>
               <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
               <div className="text-slate-700">{restaurant.costForTwo} for two</div>
               <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
               <div className={`flex items-center gap-1 ${restaurant.isOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                 {restaurant.isOpen ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                 {restaurant.isOpen ? 'Accepting Orders' : 'Currently Closed'}
               </div>
            </div>
          </div>
        </div>
        
        {/* Order Type Segmented Control */}
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 pb-4 mt-2">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl overflow-x-auto hide-scrollbar" role="radiogroup" aria-label="Order type">
            {restaurant.services.includes('delivery') && (
              <button onClick={() => setOrderType('delivery')} role="radio" aria-checked={orderType === 'delivery'} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all ${orderType === 'delivery' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}>
                <Bike className={`w-4 h-4 ${orderType === 'delivery' ? 'text-orange-600' : ''}`} /> Delivery
              </button>
            )}
            {restaurant.services.includes('takeaway') && (
              <button onClick={() => setOrderType('takeaway')} role="radio" aria-checked={orderType === 'takeaway'} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all ${orderType === 'takeaway' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}>
                <ShoppingBag className={`w-4 h-4 ${orderType === 'takeaway' ? 'text-orange-600' : ''}`} /> Takeaway
              </button>
            )}
            {restaurant.services.includes('dine-in') && (
              <button onClick={() => setOrderType('dine-in')} role="radio" aria-checked={orderType === 'dine-in'} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all ${orderType === 'dine-in' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}>
                <Utensils className={`w-4 h-4 ${orderType === 'dine-in' ? 'text-orange-600' : ''}`} /> Dine-in
              </button>
            )}
            {restaurant.services.includes('table-booking') && (
              <button onClick={() => setOrderType('table-booking')} role="radio" aria-checked={orderType === 'table-booking'} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all ${orderType === 'table-booking' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'}`}>
                <CalendarDays className={`w-4 h-4 ${orderType === 'table-booking' ? 'text-orange-600' : ''}`} /> Book Table
              </button>
            )}
          </div>
        </div>

        {/* Contextual Order-Type Info Banner */}
        {orderType === 'takeaway' && (
          <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 pb-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-bold text-purple-900 text-sm">Takeaway Order</p>
                  <p className="text-xs text-purple-600">Ready in 15–20 mins • Pick up at the counter</p>
                </div>
              </div>
              <div className="ml-auto text-xs text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full font-bold">
                📍 {restaurant.distance} from you
              </div>
            </div>
          </div>
        )}
        {orderType === 'dine-in' && (
          <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 pb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <Utensils className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Dine-in Order (Table QR/Walk-in)</p>
                  <p className="text-xs text-emerald-700">Add food and pay. Food will be served to your table.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Offers Strip */}
        {restaurant.offer && (
          <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 pb-4 flex gap-3 overflow-x-auto hide-scrollbar snap-x">
            <div className="snap-start shrink-0 border border-orange-200 bg-orange-50/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
               <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black text-xs">%</div>
               <div>
                 <p className="font-bold text-slate-900 text-sm leading-tight">{restaurant.offer}</p>
                 <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">USE CODE</p>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 md:px-8 mt-6 flex flex-col md:flex-row gap-8 relative">
        
        {/* Desktop Menu Categories (Sidebar) */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Search in menu..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <nav className="flex flex-col space-y-1 pr-4 border-r border-slate-200" role="tablist" aria-label="Menu categories">
              {menuData.map((category) => (
                <button key={category.category} onClick={() => scrollToCategory(category.category)} role="tab" aria-selected={activeCategory === category.category} className={`text-left px-3 py-2 text-sm transition-all duration-200 rounded-l-lg ${activeCategory === category.category ? 'font-bold text-orange-600 border-r-2 border-orange-600 bg-orange-50/50' : 'font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  {category.category} ({category.items.length})
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Horizontal Category Bar */}
        <div className="md:hidden flex gap-2 overflow-x-auto hide-scrollbar sticky top-16 z-30 bg-slate-50 py-2 snap-x">
          {menuData.map((category) => (
            <button
              key={category.category}
              onClick={() => scrollToCategory(category.category)}
              className={`snap-start shrink-0 px-4 py-1.5 rounded-full text-sm shadow-sm transition-all ${
                activeCategory === category.category
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 font-medium hover:border-orange-300'
              }`}
            >
              {category.category}
            </button>
          ))}
        </div>

        {/* Food Items List */}
        <main id="main-content" className="flex-1 max-w-3xl">
          {menuData.map((category) => (
            <div
              key={category.category}
              data-category={category.category}
              className="mb-10 scroll-mt-36"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                {category.category} <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              </h2>

              <div className="space-y-6">
                {category.items.map((item) => {
                  const qty = getItemQty(item.id);
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative">
                       <div className="flex-1 pr-0 sm:pr-4">
                         <div className="flex items-center gap-2 mb-1.5">
                           <div className={`w-4 h-4 border ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'} rounded-sm flex items-center justify-center p-0.5`}>
                             <CircleDot className={`w-full h-full ${item.type === 'veg' ? 'text-green-500' : 'text-red-500'}`} />
                           </div>
                           {item.bestseller && (
                             <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Bestseller</span>
                           )}
                         </div>
                         <h3 className="font-bold text-slate-900 text-lg mb-1">{item.name}</h3>
                         <div className="font-bold text-slate-800 mb-2">{formatCurrencyValue(item.price)}</div>
                         <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                       </div>
                       
                       <div className="w-full sm:w-36 flex flex-col items-center gap-3 shrink-0">
                         <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden relative">
                           {(item as any).imageUrl ? (
                             <Image src={(item as any).imageUrl} alt={item.name} fill className="object-cover" />
                           ) : (
                             <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80" alt="Food" className="w-full h-full object-cover" loading="lazy" />
                           )}
                           
                           {/* ADD / Quantity Controls */}
                           {qty === 0 ? (
                             <button 
                               aria-label={`Add ${item.name} to cart`}
                               disabled={!restaurant.isOpen}
                               onClick={() => {
                                 if ((item as any).customizable) {
                                   setSelectedCustomizationItem(item);
                                 } else {
                                   addToCart({ id: item.id, name: item.name, price: item.price, type: item.type });
                                 }
                               }}
                               className={`absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-slate-200 font-bold px-6 py-1.5 rounded-lg shadow-sm uppercase text-sm transition-colors ${restaurant.isOpen ? 'text-orange-600 hover:bg-orange-50 hover:border-orange-400' : 'text-slate-400 cursor-not-allowed'}`}
                             >
                               ADD
                             </button>
                           ) : (
                             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center bg-orange-600 rounded-lg shadow-sm overflow-hidden">
                               <button
                                 aria-label={`Remove one ${item.name} from cart`}
                                 onClick={() => removeFromCart(item.id)}
                                 className="w-8 h-8 flex items-center justify-center text-white hover:bg-orange-700 transition-colors"
                               >
                                 <Minus className="w-3.5 h-3.5" />
                               </button>
                               <span className="text-white font-bold text-sm px-2" aria-label={`${qty} in cart`}>{qty}</span>
                               <button
                                 aria-label={`Add another ${item.name} to cart`}
                                 onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, type: item.type })}
                                 className="w-8 h-8 flex items-center justify-center text-white hover:bg-orange-700 transition-colors"
                               >
                                 <Plus className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           )}
                         </div>
                         {(item as any).customizable && (
                           <div className="text-[10px] text-slate-500 mt-2 text-center">Customizable</div>
                         )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </main>

      </div>

      {/* Sticky Bottom Cart Summary / Table Booking CTA */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 p-3 md:p-4">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 flex items-center justify-between">
          {orderType === 'table-booking' ? (
            <>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                   <CalendarDays className="w-5 h-5 text-orange-600" />
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 font-medium">Dine-in Experience</p>
                   <p className="font-bold text-slate-900">Reserve your table now</p>
                 </div>
              </div>
              <Link href={`/table-booking/${slug}`} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm text-sm md:text-base flex items-center gap-2">
                Book a Table <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          ) : cartCount > 0 ? (
            <>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center relative">
                   <ShoppingCart className="w-5 h-5 text-orange-600" />
                   <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 font-medium">{cartCount} item{cartCount > 1 ? 's' : ''} added</p>
                   <p className="font-bold text-slate-900">{formatCurrencyValue(cartTotal)} <span className="text-xs font-normal text-slate-500 ml-1">plus {taxLabel || 'taxes'}</span></p>
                 </div>
              </div>
              <button 
                id="btn-proceed-cart"
                onClick={handleProceed}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm text-sm md:text-base flex items-center gap-2"
              >
                Proceed ({orderType}) <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full text-center text-sm text-slate-400 font-medium py-1">
              Add items from the menu to get started
            </div>
          )}
        </div>
      </div>
      
      {/* Customization Modal */}
      <CustomizationModal 
        isOpen={!!selectedCustomizationItem}
        onClose={() => setSelectedCustomizationItem(null)}
        item={selectedCustomizationItem}
      />
    </div>
  );
}

export default function RestaurantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        {/* Loading Skeleton */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 aspect-video md:aspect-square bg-slate-200 rounded-2xl animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-slate-200 rounded-lg w-2/3 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
                <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 flex gap-8">
          <div className="hidden md:block w-64 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-slate-200 rounded animate-pulse" />)}
          </div>
          <div className="flex-1 space-y-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
                <div className="w-36 aspect-square bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <RestaurantDetailContent slug={slug} />
    </Suspense>
  );
}
