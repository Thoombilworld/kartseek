'use client';
import { useModuleTitle } from '@/hooks/useModuleTitle';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, Star, MapPin, Clock, Shield, TrendingUp, Award, ChevronRight,
  Truck, Zap, Tag, ShoppingCart, Mic, Heart, Sparkles, RefreshCw,
  Flame, Timer, Package, BadgePercent, Pill, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { API_BASE_URL } from '@/lib/config/api-base';

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id:'c01',name:'Medicines',emoji:'💊',count:340 },
  { id:'c02',name:'Baby Care',emoji:'🍼',count:64 },
  { id:'c03',name:'Personal Care',emoji:'🧴',count:210 },
  { id:'c04',name:'Health Devices',emoji:'🩺',count:42 },
  { id:'c05',name:'Vitamins',emoji:'🧪',count:94 },
  { id:'c06',name:'First Aid',emoji:'🩹',count:45 },
  { id:'c07',name:'Skin Care',emoji:'🧖',count:156 },
  { id:'c08',name:'Hair Care',emoji:'💇',count:88 },
  { id:'c09',name:"Women's Health",emoji:'♀️',count:55 },
  { id:'c10',name:'Diabetic Care',emoji:'🩸',count:78 },
  { id:'c11',name:'Orthopedic',emoji:'🦴',count:34 },
  { id:'c12',name:'Elderly Care',emoji:'👴',count:29 },
  { id:'c13',name:'Wellness',emoji:'🧘',count:67 },
  { id:'c14',name:'Mother & Baby',emoji:'🤱',count:48 },
  { id:'c15',name:'Home Health',emoji:'🏥',count:22 },
  { id:'c16',name:'Prescription',emoji:'📋',count:120 },
];

const STORES = [
  { id:'ph-1', name:'HealthPlus Pharmacy',   img:'🏥', rating:4.7, distance:'0.5 km', delivery:'20 min', open:true,  verified:true,  orders:3800, offer:'15% OFF',      deliveryFee:'Free', minOrder:'₹299', cats:['c01','c02','c06','c05'], badge:'nearby'   as const },
  { id:'ph-2', name:'Apollo Pharmacy',        img:'🏪', rating:4.8, distance:'1.2 km', delivery:'30 min', open:true,  verified:true,  orders:5200, offer:'Flat ₹100 OFF', deliveryFee:'₹25',  minOrder:'₹399', cats:['c01','c03','c05','c07','c16'], badge:'featured' as const },
  { id:'ph-3', name:'MedPlus Pharmacy',       img:'💊', rating:4.6, distance:'0.8 km', delivery:'18 min', open:true,  verified:true,  orders:2400, offer:'25% OFF',       deliveryFee:'Free', minOrder:'₹199', cats:['c01','c03','c06'], badge:'fast'     as const },
  { id:'ph-4', name:'WellBeing Pharmacy',     img:'🌿', rating:4.5, distance:'1.5 km', delivery:'35 min', open:true,  verified:true,  orders:1800, offer:'Buy 2 Get 1',   deliveryFee:'₹30',  minOrder:'₹349', cats:['c13','c05','c09','c07'], badge:'top'      as const },
  { id:'ph-5', name:'LifeCare Pharmacy',      img:'❤️', rating:4.9, distance:'2.0 km', delivery:'40 min', open:true,  verified:true,  orders:4100, offer:null,            deliveryFee:'₹40',  minOrder:'₹499', cats:['c01','c04','c10','c11','c12'], badge:'top'  as const },
  { id:'ph-6', name:'PharmEasy Store',        img:'⚡', rating:4.5, distance:'1.8 km', delivery:'22 min', open:true,  verified:true,  orders:6300, offer:'20% OFF',       deliveryFee:'Free', minOrder:'₹249', cats:['c01','c02','c03','c08'], badge:'fast'     as const },
  { id:'ph-7', name:'BabyMed Pharmacy',       img:'🍼', rating:4.4, distance:'1.0 km', delivery:'25 min', open:true,  verified:true,  orders:1200, offer:'30% OFF Baby',  deliveryFee:'₹20',  minOrder:'₹299', cats:['c02','c14','c09'], badge:'nearby'   as const },
  { id:'ph-8', name:'DiaCare Hub',            img:'🩸', rating:4.6, distance:'2.5 km', delivery:'45 min', open:false, verified:true,  orders:980,  offer:null,            deliveryFee:'₹50',  minOrder:'₹499', cats:['c10','c04','c12'], badge:'featured' as const },
  { id:'ph-9', name:'Netmeds Express',        img:'🚀', rating:4.4, distance:'3.0 km', delivery:'50 min', open:true,  verified:true,  orders:3500, offer:'₹75 OFF',       deliveryFee:'₹35',  minOrder:'₹399', cats:['c01','c05','c13','c08'], badge:'featured' as const },
  { id:'ph-10',name:'VitaMax Wellness',       img:'💪', rating:4.3, distance:'2.2 km', delivery:'38 min', open:true,  verified:true,  orders:890,  offer:'BOGO Vitamins', deliveryFee:'₹25',  minOrder:'₹349', cats:['c05','c13','c04'], badge:'nearby'   as const },
  { id:'ph-11',name:'SkinFirst Pharmacy',     img:'✨', rating:4.7, distance:'1.6 km', delivery:'28 min', open:true,  verified:true,  orders:2100, offer:'20% Skin Care', deliveryFee:'Free', minOrder:'₹299', cats:['c07','c08','c03','c09'], badge:'top'      as const },
  { id:'ph-12',name:'QuickMeds',             img:'⏱️', rating:4.2, distance:'0.3 km', delivery:'12 min', open:true,  verified:true,  orders:1500, offer:null,            deliveryFee:'Free', minOrder:'₹149', cats:['c01','c06','c15'], badge:'fast'     as const },
  { id:'ph-13',name:'NaturalCare Pharmacy',  img:'🌱', rating:4.6, distance:'1.1 km', delivery:'24 min', open:true,  verified:true,  orders:1750, offer:'10% OFF',       deliveryFee:'₹15',  minOrder:'₹249', cats:['c13','c05','c03'], badge:'nearby'   as const },
  { id:'ph-14',name:'CityMed 24/7',          img:'🌙', rating:4.8, distance:'0.7 km', delivery:'15 min', open:true,  verified:true,  orders:4200, offer:'Free Delivery', deliveryFee:'Free', minOrder:'₹199', cats:['c01','c06','c16'], badge:'fast'     as const },
  { id:'ph-15',name:'FamilyCare Pharmacy',   img:'👨‍👩‍👧',rating:4.5, distance:'1.9 km', delivery:'32 min', open:true,  verified:true,  orders:2800, offer:'15% on Generics',deliveryFee:'₹20',minOrder:'₹299', cats:['c01','c02','c12','c14'], badge:'top'   as const },
];

const BRANDS = [
  { id:'b1', name:'Cipla',      emoji:'💊', tag:'India\'s #1',   color:'from-blue-500 to-blue-700',   products:340, discount:'Up to 20% OFF' },
  { id:'b2', name:'Dr. Reddy\'s',emoji:'🧪', tag:'Trusted Since 1984', color:'from-red-500 to-red-700',  products:280, discount:'Up to 15% OFF' },
  { id:'b3', name:'Sun Pharma', emoji:'☀️', tag:'Global Leader', color:'from-amber-500 to-orange-600', products:420, discount:'Up to 18% OFF' },
  { id:'b4', name:'Dabur',      emoji:'🌿', tag:'Ayurvedic Care', color:'from-green-500 to-emerald-700',products:210, discount:'Up to 25% OFF' },
  { id:'b5', name:'Himalaya',   emoji:'🏔️', tag:'Natural Wellness',color:'from-teal-500 to-cyan-700',  products:185, discount:'Up to 22% OFF' },
  { id:'b6', name:'Abbott',     emoji:'⚗️', tag:'Science of Care', color:'from-purple-500 to-violet-700',products:155, discount:'Up to 12% OFF' },
  { id:'b7', name:'Pfizer',     emoji:'🔬', tag:'Trusted Globally',color:'from-sky-500 to-blue-600',   products:120, discount:'Up to 10% OFF' },
  { id:'b8', name:'Mankind',    emoji:'💉', tag:'Making Healthcare', color:'from-rose-500 to-pink-700',  products:190, discount:'Up to 20% OFF' },
];

const FLASH_DEALS = [
  { id:'fd1', name:'Paracetamol 500mg Strip',   brand:'Dolo',     img:'💊', price:22,  mrp:32,  discount:31, stock:48  },
  { id:'fd2', name:'Vitamin D3 60K Capsules',   brand:'Calcirol', img:'☀️', price:85,  mrp:130, discount:35, stock:12  },
  { id:'fd3', name:'Cetirizine 10mg (10s)',      brand:'Zyrtec',   img:'🌬️', price:28,  mrp:40,  discount:30, stock:65  },
  { id:'fd4', name:'Betadine Antiseptic 100ml', brand:'Betadine', img:'🩹', price:95,  mrp:145, discount:34, stock:30  },
  { id:'fd5', name:'Glucon-D Orange 500g',       brand:'Glucon-D', img:'🍊', price:112, mrp:160, discount:30, stock:22  },
  { id:'fd6', name:'Volini Spray 55g',           brand:'Volini',   img:'💨', price:165, mrp:230, discount:28, stock:9   },
  { id:'fd7', name:'Dettol Hand Wash 750ml',     brand:'Dettol',   img:'🧴', price:129, mrp:189, discount:32, stock:55  },
  { id:'fd8', name:'Revital H Capsules 30s',     brand:'Revital',  img:'💪', price:210, mrp:295, discount:29, stock:17  },
];

const FEATURED_PRODUCTS = [
  { id:'fp1', name:'Omron BP Monitor HEM-7120', brand:'Omron',    img:'🩺', price:1890, mrp:2499, rx:false, badge:'Best Seller', rating:4.8 },
  { id:'fp2', name:'Accu-Chek Instant Glucometer',brand:'Accu-Chek',img:'🩸',price:1299, mrp:1799, rx:false, badge:'Top Pick',    rating:4.9 },
  { id:'fp3', name:'Ensure Nutrition Powder 400g',brand:'Ensure',  img:'🥛', price:699, mrp:899,  rx:false, badge:'Trending',    rating:4.7 },
  { id:'fp4', name:'Tynor Knee Cap L Size',       brand:'Tynor',   img:'🦴', price:345, mrp:499,  rx:false, badge:'Popular',     rating:4.6 },
  { id:'fp5', name:'Septilin Tablets 60s',        brand:'Himalaya',img:'🌿', price:125, mrp:165,  rx:false, badge:'Ayurvedic',   rating:4.5 },
  { id:'fp6', name:'Combiflam Tablets 20s',       brand:'Sanofi',  img:'💊', price:48,  mrp:62,   rx:true,  badge:'Rx Required', rating:4.7 },
  { id:'fp7', name:'Evion Vitamin E 400mg 10s',   brand:'Merck',   img:'🧪', price:38,  mrp:52,   rx:false, badge:'Immunity',    rating:4.6 },
  { id:'fp8', name:'Pudin Hara Pearl 150s',        brand:'Dabur',   img:'🌱', price:78,  mrp:105,  rx:false, badge:'Ayurvedic',   rating:4.5 },
];

const SPONSORED_PRODUCTS = [
  { id:'sp1', name:'Berocca Performance 15s',  brand:'Bayer',     img:'⚡', price:249, mrp:320, tag:'SPONSORED', color:'from-amber-400 to-orange-500' },
  { id:'sp2', name:'Centrum Silver 30s',        brand:'Pfizer',    img:'🌟', price:699, mrp:850, tag:'SPONSORED', color:'from-sky-400 to-blue-500' },
  { id:'sp3', name:'Protinex Tasty Chocolate', brand:'Danone',    img:'🍫', price:459, mrp:599, tag:'SPONSORED', color:'from-rose-400 to-pink-500' },
  { id:'sp4', name:'Liv.52 DS Tablets 60s',    brand:'Himalaya',  img:'🌿', price:185, mrp:240, tag:'SPONSORED', color:'from-emerald-400 to-teal-500' },
];

const PROMOS = [
  { title:'💊 Flat 25% OFF',  subtitle:'On all OTC medicines this week',    code:'PHARMA25', colors:'from-teal-600 to-cyan-500' },
  { title:'🚀 Free Delivery', subtitle:'Orders above ₹499 — no code needed', code:'AUTO',     colors:'from-violet-600 to-purple-400' },
  { title:'🍼 Baby Sale',     subtitle:'Up to 30% off all baby care range',  code:'BABY30',   colors:'from-pink-600 to-rose-400' },
  { title:'💉 Rx Medicines',  subtitle:'Upload prescription & save 15%',     code:'RXSAVE15', colors:'from-indigo-600 to-blue-500' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StoreCard({ store, compact = false, section = 'main' }: { store: typeof STORES[0]; compact?: boolean; section?: string }) {
  return (
    <Link
      href={`/pharmacy/stores/${store.id}`}
      data-testid={`store-card-${section}-${store.id}`}
      className={`snap-card${compact ? '-sm' : ''} bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all duration-300 group overflow-hidden`}
    >
      {/* Banner */}
      <div className={`bg-linear-to-br from-teal-50 via-cyan-50 to-blue-50 relative flex items-center justify-center ${compact ? 'h-28' : 'h-36'}`}>
        <span className={`group-hover:scale-110 transition-transform duration-300 ${compact ? 'text-5xl' : 'text-6xl'}`}>{store.img}</span>
        {store.offer && (
          <div className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />{store.offer}
          </div>
        )}
        <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${store.open ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-700'}`}>
          {store.open ? '● Open' : '● Closed'}
        </div>
        {store.verified && (
          <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-sm">
            <Shield className="w-3 h-3 text-blue-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-teal-600 transition-colors">{store.name}</h3>
          <div className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
            <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            <span className="text-[11px] font-black">{store.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mb-2">
          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{store.distance}</span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{store.delivery}</span>
          <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />{store.deliveryFee}</span>
        </div>
        {!compact && (
          <div className="flex flex-wrap gap-1 mb-2">
            {store.cats.slice(0, 3).map(cid => {
              const cat = CATEGORIES.find(c => c.id === cid);
              return cat ? (
                <span key={cid} className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                  {cat.emoji} {cat.name}
                </span>
              ) : null;
            })}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">Min: {store.minOrder}</span>
          <span className="text-[10px] font-bold text-teal-600 flex items-center gap-0.5">
            Shop <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Flash Deal countdown timer */
function FlashTimer() {
  const [time, setTime] = useState({ h: 2, m: 45, s: 30 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1.5">
      {[pad(time.h), pad(time.m), pad(time.s)].map((v, i) => (
        <React.Fragment key={i}>
          <span className="bg-white text-rose-600 font-black text-sm px-2 py-0.5 rounded-lg min-w-[32px] text-center tabular-nums">{v}</span>
          {i < 2 && <span className="text-white font-black text-sm">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;

function usePharmacyHome() {
  const [isLive, setIsLive] = React.useState(false);
  const fetchHome = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/layouts/pharmacy/homepage`, {
        signal: AbortSignal.timeout(3000),
      });
      setIsLive(res.ok);
    } catch { setIsLive(false); }
  }, []);
  React.useEffect(() => {
    fetchHome();
    const interval = setInterval(fetchHome, 5000);
    return () => clearInterval(interval);
  }, [fetchHome]);
  return { isLive, refresh: fetchHome };
}

export default function PharmacyHome() {
  useModuleTitle('pharmacy');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Recommendation Engine ──
  const { forYou, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('pharmacy', null);

  const categoryStores = useMemo(() => {
    if (!selectedCategory) return [];
    return STORES.filter(s => s.cats.includes(selectedCategory));
  }, [selectedCategory]);

  const nearbyStores   = STORES.filter(s => s.badge === 'nearby' || parseFloat(s.distance) <= 1.0);
  const fastStores     = STORES.filter(s => s.badge === 'fast');
  const topRated       = [...STORES].sort((a, b) => b.rating - a.rating);
  const featuredStores = STORES.filter(s => s.badge === 'featured');
  const trendingStores = [...STORES].sort((a, b) => b.orders - a.orders);
  const { isLive, refresh } = usePharmacyHome();

  return (
    <div className="bg-slate-50 min-h-screen pb-12">

      {/* ── Mobile Search ── */}
      <div className="md:hidden bg-linear-to-r from-teal-600 to-cyan-600 p-4 pb-6">
        <div className="relative">
          <input id="pharmacy-search-input" type="text" placeholder="Search medicines, health products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-white rounded-xl outline-none text-sm shadow-lg" />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
          <button id="pharmacy-voice-search" aria-label="Voice search" className="absolute right-3 top-2.5 p-1 rounded-full bg-teal-50 hover:bg-teal-100 transition-colors">
            <Mic className="w-4 h-4 text-teal-600" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 space-y-10 mt-4 md:mt-8 pb-mobile-nav">

        {/* Live sync badge */}
        {isLive && (
          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">Live sync active</span>
              <span className="text-emerald-500">— Data updates in real time</span>
            </div>
            <button id="pharmacy-refresh-btn" onClick={refresh} className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            1. PROMO BANNERS
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
            {PROMOS.map(promo => (
              <div key={promo.title}
                className={`snap-start shrink-0 w-[280px] md:w-[320px] bg-linear-to-br ${promo.colors} rounded-2xl p-5 text-white relative overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer`}>
                <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/5 rounded-full" />
                <h3 className="text-lg font-black mb-1">{promo.title}</h3>
                <p className="text-white/80 text-xs mb-4 leading-relaxed">{promo.subtitle}</p>
                <div className="flex items-center justify-between">
                  <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-lg text-xs font-black tracking-wider">{promo.code}</span>
                  <ArrowRight className="w-4 h-4 opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            2. SHOP BY CATEGORY
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Shop by Category</h2>
              <p className="text-sm text-slate-500 mt-0.5">Tap to filter pharmacies by product type</p>
            </div>
            {selectedCategory && (
              <button id="pharmacy-clear-cat-top" onClick={() => setSelectedCategory(null)} className="text-xs font-bold text-teal-600 hover:text-teal-700 px-3 py-1.5 bg-teal-50 rounded-lg transition-colors">
                Clear ✕
              </button>
            )}
          </div>
          <div className="cat-grid">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button key={cat.id} data-testid={`cat-${cat.id}`} onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center group ${
                    isActive ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-100' : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-sm'
                  }`}>
                  <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{cat.emoji}</span>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-teal-700' : 'text-slate-700'}`}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Category Filter Results ── */}
        {selectedCategory && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {CATEGORIES.find(c => c.id === selectedCategory)?.emoji}{' '}
                {CATEGORIES.find(c => c.id === selectedCategory)?.name} Pharmacies
                <span className="text-sm font-medium text-slate-400">({categoryStores.length})</span>
              </h2>
              <button id="pharmacy-clear-cat-filter" onClick={() => setSelectedCategory(null)} className="text-xs font-bold text-teal-600 px-3 py-1.5 bg-teal-50 rounded-lg">Clear ✕</button>
            </div>
            {categoryStores.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
                {categoryStores.map(store => <StoreCard key={store.id} store={store} section="category" />)}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <p className="text-4xl mb-2">🔍</p>
                <p className="font-semibold text-slate-600">No pharmacies for this category.</p>
                <button id="pharmacy-browse-all" onClick={() => setSelectedCategory(null)} className="mt-3 text-sm text-teal-600 font-bold hover:underline">Browse all</button>
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            3. NEARBY PHARMACIES (horizontal scroll)
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" /> Nearby Pharmacies
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Fastest delivery · closest to you</p>
            </div>
            <Link href="/pharmacy/stores?sort=nearby" className="text-sm font-semibold text-teal-600 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {nearbyStores.map(store => <StoreCard key={store.id} store={store} section="nearby" />)}
          </div>
        </section>

        {/* ══ 🧠 REORDER YOUR ESSENTIALS (recommendation engine) ══ */}
        <RecommendationCarousel
          title="Reorder Your Essentials"
          icon="💊"
          recommendations={forYou}
          module="pharmacy"
          isLoading={recoLoading}
          onCardClick={trackClick}
        />

        {/* ══ ✨ EXPLORE OTHER SERVICES ══ */}
        <CrossModulePicks
          recommendations={crossModule}
          currentModule="pharmacy"
          onCardClick={trackClick}
        />

        {/* ══════════════════════════════════════════════════════════
            4. FLASH DEALS  (countdown timer)
            ══════════════════════════════════════════════════════════ */}
        <section className="bg-linear-to-r from-rose-600 via-rose-500 to-orange-500 rounded-3xl p-5 md:p-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Flash Deals</h2>
                <p className="text-white/70 text-xs">Grab before they're gone!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-white/80" />
              <FlashTimer />
            </div>
          </div>
          {/* Cards */}
          <div className="relative z-10 flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory">
            {FLASH_DEALS.map(deal => (
              <div key={deal.id} data-testid={`flash-${deal.id}`}
                className="snap-start shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
                <div className="h-24 bg-linear-to-br from-rose-50 to-orange-50 flex items-center justify-center relative">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{deal.img}</span>
                  <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">{deal.discount}% OFF</span>
                  {deal.stock <= 15 && (
                    <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">Only {deal.stock} left!</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2 mb-0.5">{deal.name}</p>
                  <p className="text-slate-400 text-[10px] mb-1.5">{deal.brand}</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="font-black text-slate-900 text-sm">₹{deal.price}</span>
                    <span className="text-[10px] text-slate-400 line-through">₹{deal.mrp}</span>
                  </div>
                  <button aria-label={`Add ${deal.name} to cart`} className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            5. FAST DELIVERY (horizontal scroll)
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Fast Delivery
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Get medicines in under 25 minutes</p>
            </div>
            <Link href="/pharmacy/stores?sort=fast" className="text-sm font-semibold text-teal-600 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {fastStores.map(store => <StoreCard key={store.id} store={store} section="fast" />)}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            6. MEDICINE BRANDS — small banner strip
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-600" /> Top Medicine Brands
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Shop by trusted brands — exclusive discounts</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {BRANDS.map(brand => (
              <Link key={brand.id} href={`/pharmacy/brands?brand=${brand.id}`} data-testid={`brand-${brand.id}`}
                className={`snap-start shrink-0 w-[180px] bg-linear-to-br ${brand.color} rounded-2xl p-4 text-white hover:shadow-xl hover:scale-[1.03] transition-all duration-300 relative overflow-hidden group`}>
                <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">{brand.emoji}</span>
                <h3 className="font-black text-base leading-tight">{brand.name}</h3>
                <p className="text-white/70 text-[10px] mt-0.5 mb-2">{brand.tag}</p>
                <div className="bg-white/20 border border-white/30 rounded-lg px-2 py-0.5 inline-block">
                  <span className="text-[10px] font-bold">{brand.discount}</span>
                </div>
                <p className="text-white/50 text-[9px] mt-1.5">{brand.products} products</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            7. FEATURED PHARMACY PRODUCTS
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" /> Featured Products
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Hand-picked essentials for your health</p>
            </div>
            <Link href="/pharmacy/featured" className="text-sm font-semibold text-teal-600 hover:underline flex items-center gap-1">
              See All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {FEATURED_PRODUCTS.map(p => (
              <div key={p.id} data-testid={`fp-${p.id}`}
                className="snap-start shrink-0 w-[175px] bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-300 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                {/* Image */}
                <div className="h-28 bg-linear-to-br from-teal-50 to-cyan-50 flex items-center justify-center relative">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{p.img}</span>
                  <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-lg ${
                    p.badge === 'Rx Required' ? 'bg-red-100 text-red-700' :
                    p.badge === 'Best Seller' ? 'bg-amber-100 text-amber-700' :
                    p.badge === 'Trending'    ? 'bg-rose-100 text-rose-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>{p.badge}</span>
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 px-1.5 py-0.5 rounded-md">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold">{p.rating}</span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2 mb-0.5 group-hover:text-teal-600 transition-colors">{p.name}</p>
                  <p className="text-slate-400 text-[10px] mb-2">{p.brand}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-900 text-sm">₹{p.price}</span>
                      <span className="text-[10px] text-slate-400 line-through ml-1">₹{p.mrp}</span>
                    </div>
                    <button aria-label={`Add ${p.name} to cart`} className="bg-teal-100 hover:bg-teal-200 text-teal-700 text-[9px] font-black px-2 py-1.5 rounded-lg transition-colors flex items-center gap-0.5">
                      <ShoppingCart className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            8. TOP RATED STORES (horizontal scroll)
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" /> Top Rated Pharmacies
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Highest customer satisfaction scores</p>
            </div>
            <Link href="/pharmacy/stores?sort=top-rated" className="text-sm font-semibold text-teal-600 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {topRated.map(store => <StoreCard key={store.id} store={store} compact section="top" />)}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            9. SPONSORED PHARMACY SECTION
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-purple-600" /> Sponsored Products
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Specially promoted for you</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {SPONSORED_PRODUCTS.map(sp => (
              <div key={sp.id} data-testid={`sp-${sp.id}`}
                className={`snap-start shrink-0 w-[260px] bg-linear-to-br ${sp.color} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer`}>
                <div className="p-5 relative">
                  <div className="absolute top-3 right-3 bg-white/20 border border-white/30 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">{sp.tag}</div>
                  <span className="text-5xl block mb-3 group-hover:scale-110 transition-transform duration-300">{sp.img}</span>
                  <h3 className="font-black text-white text-sm leading-snug mb-1">{sp.name}</h3>
                  <p className="text-white/70 text-xs mb-3">{sp.brand}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-white text-lg">₹{sp.price}</span>
                      <span className="text-white/60 text-xs line-through ml-1.5">₹{sp.mrp}</span>
                    </div>
                    <button aria-label={`Add ${sp.name} to cart`} className="bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            10. TRENDING / ALL STORES (horizontal scroll)
            ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" /> Trending Pharmacies
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Most ordered stores this week</p>
            </div>
            <Link href="/pharmacy/stores?sort=trending" className="text-sm font-semibold text-teal-600 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {trendingStores.map(store => <StoreCard key={store.id} store={store} section="trending" />)}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            11. TRUST PILLARS
            ══════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, color: 'teal',  title: '100% Genuine',   sub: 'All medicines verified by licensed pharmacists' },
              { icon: Truck,  color: 'blue',  title: 'Fast Delivery',  sub: 'Get medicines delivered in 12–45 minutes' },
              { icon: Heart,  color: 'amber', title: '24/7 Support',   sub: 'Customer care available round the clock' },
            ].map(({ icon: Icon, color, title, sub }) => (
              <div key={title} className="flex items-start gap-3">
                <div className={`w-10 h-10 bg-${color}-50 rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{title}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            12. FAQ SECTION
            ══════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" /> Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {[
              { q:'How can I order medicines on KARTSEEK?', a:'Browse pharmacy categories, select a nearby pharmacy, add products to cart, and checkout. For prescription medicines, upload your prescription for verification.' },
              { q:'Which medicines require a prescription?', a:'Medicines marked with "Rx Required" tag require a valid doctor prescription. OTC (Over-The-Counter) medicines can be purchased without prescription.' },
              { q:'How do I upload a prescription?', a:'Click "Upload Prescription" on any Rx-required medicine. Upload images, PDFs, or take a photo. The pharmacy pharmacist verifies before processing.' },
              { q:'How do I find pharmacies near me?', a:'The pharmacy homepage shows nearby pharmacies based on your location. Filter by category, rating, delivery time, and offers.' },
              { q:'How are pharmacy delivery charges calculated?', a:'Delivery charges depend on distance and order value. Many pharmacies offer free delivery above a minimum order value.' },
            ].map((faq, i) => (
              <details key={i} className="border border-slate-100 rounded-xl group">
                <summary className="p-3.5 cursor-pointer font-semibold text-slate-800 text-sm hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-3.5 pb-3.5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            13. GEO LINKS
            ══════════════════════════════════════════════════════════ */}
        <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-3">Explore KARTSEEK Pharmacy</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name:'How It Works',        href:'/pharmacy/how-it-works' },
              { name:'Upload Prescription', href:'/pharmacy/prescription-upload' },
              { name:'Nearby Pharmacies',   href:'/pharmacy/stores' },
              { name:'Sell on KARTSEEK',    href:'/pharmacy/sell-on-kartseek' },
              { name:'Compliance Info',     href:'/pharmacy/compliance' },
              { name:'India Pharmacy',      href:'/pharmacy/country/india' },
              { name:'UAE Pharmacy',        href:'/pharmacy/country/uae' },
              { name:'UK Pharmacy',         href:'/pharmacy/country/uk' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline">{link.name} →</Link>
            ))}
          </div>
        </section>

        {/* SEO Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context":"https://schema.org","@type":"WebPage","name":"KARTSEEK Pharmacy — Online Medicine Delivery",
          "description":"Order medicines online from verified pharmacies near you.",
          "url":"https://kartseek.com/pharmacy",
        }) }} />
      </div>
    </div>
  );
}
