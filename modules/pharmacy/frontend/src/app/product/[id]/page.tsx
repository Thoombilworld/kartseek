'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, ShoppingCart, Star, Heart, Share2, Shield, Truck, Clock,
  ChevronRight, Plus, Minus, Upload, FileText, X, CheckCircle, Info, Eye
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT DATABASE (mirrors the store detail page products)
   ═══════════════════════════════════════════════════════════════════════════ */

const ALL_PRODUCTS: Record<string, {
  id: string; name: string; brand: string; price: number; mrp: number; pack: string;
  rx: boolean; inStock: boolean; cat: string; fallbackImg: string; dosage: string;
  form: string; deliveryEst: string; popular: boolean; manufacturer: string;
  description: string; uses: string[]; sideEffects: string[]; directions: string;
  storage: string; warnings: string[];
}> = {
  p1: { id:'p1',name:'Paracetamol 500mg',brand:'Dolo',price:25,mrp:32,pack:'Strip of 15',rx:false,inStock:true,cat:'Medicines',fallbackImg:'💊',dosage:'500mg',form:'Tablet',deliveryEst:'20 min',popular:true,manufacturer:'Micro Labs',
    description:'Paracetamol 500mg is used for the treatment of mild to moderate pain and fever. It works by blocking the release of certain chemical messengers that cause pain and fever.',
    uses:['Headache','Toothache','Body pain','Fever','Cold and Flu'],
    sideEffects:['Nausea','Allergic reaction (rare)','Liver damage (overdose)'],
    directions:'Take 1-2 tablets every 4-6 hours as needed. Do not exceed 8 tablets in 24 hours.',
    storage:'Store below 25°C in a dry place, protected from light.',
    warnings:['Do not exceed recommended dose','Avoid alcohol','Consult doctor if symptoms persist']
  },
  p2: { id:'p2',name:'Cetirizine 10mg',brand:'Zyrtec',price:45,mrp:55,pack:'Strip of 10',rx:false,inStock:true,cat:'OTC Medicines',fallbackImg:'💊',dosage:'10mg',form:'Tablet',deliveryEst:'20 min',popular:true,manufacturer:'UCB India',
    description:'Cetirizine is an antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, itching, and sneezing. It works by blocking histamine in the body.',
    uses:['Allergic rhinitis','Hay fever','Urticaria (hives)','Itching','Watery eyes'],
    sideEffects:['Drowsiness','Dry mouth','Headache','Fatigue'],
    directions:'Take 1 tablet once daily, preferably at bedtime.',
    storage:'Store below 25°C.',
    warnings:['May cause drowsiness','Avoid driving after consumption','Not for children under 6 years']
  },
  p3: { id:'p3',name:'Vitamin C 1000mg',brand:'Celin',price:65,mrp:80,pack:'Tube of 10',rx:false,inStock:true,cat:'Vitamins & Supplements',fallbackImg:'🧪',dosage:'1000mg',form:'Effervescent Tablet',deliveryEst:'25 min',popular:true,manufacturer:'GSK',
    description:'Vitamin C 1000mg effervescent tablets help boost immunity, support collagen formation, and act as a powerful antioxidant. Dissolve in water for a refreshing orange-flavored drink.',
    uses:['Immunity boost','Antioxidant protection','Collagen synthesis','Iron absorption','Skin health'],
    sideEffects:['Stomach upset (high dose)','Diarrhea (high dose)'],
    directions:'Dissolve 1 tablet in a glass of water. Take once daily.',
    storage:'Store in a cool, dry place. Keep tube tightly closed.',
    warnings:['Do not exceed 2000mg daily','Consult doctor if pregnant']
  },
  p4: { id:'p4',name:'Amoxicillin 250mg',brand:'Amoxil',price:85,mrp:110,pack:'Strip of 10',rx:true,inStock:true,cat:'Prescription Medicines',fallbackImg:'💊',dosage:'250mg',form:'Capsule',deliveryEst:'30 min',popular:false,manufacturer:'GSK',
    description:'Amoxicillin is a penicillin-type antibiotic used to treat a wide variety of bacterial infections. It works by stopping the growth of bacteria.',
    uses:['Respiratory tract infections','Ear infections','Urinary tract infections','Skin infections','Dental infections'],
    sideEffects:['Diarrhea','Nausea','Vomiting','Skin rash','Allergic reactions'],
    directions:'Take as directed by your doctor. Complete the full course of treatment.',
    storage:'Store below 25°C in a dry place.',
    warnings:['Prescription required','Complete full course','Inform doctor of penicillin allergy','Not for viral infections']
  },
  p5: { id:'p5',name:'Metformin 500mg',brand:'Glycomet',price:32,mrp:45,pack:'Strip of 20',rx:true,inStock:false,cat:'Prescription Medicines',fallbackImg:'💊',dosage:'500mg',form:'Tablet',deliveryEst:'—',popular:false,manufacturer:'USV Ltd',
    description:'Metformin is used to treat type 2 diabetes. It helps control blood sugar levels by improving the way your body handles insulin.',
    uses:['Type 2 diabetes','Blood sugar control','Insulin resistance','PCOS (off-label)'],
    sideEffects:['Nausea','Diarrhea','Stomach pain','Metallic taste','Lactic acidosis (rare)'],
    directions:'Take with meals as directed by your doctor. Do not crush or chew.',
    storage:'Store below 30°C.',
    warnings:['Prescription required','Regular blood sugar monitoring needed','Avoid alcohol','Inform doctor before surgery']
  },
  p6: { id:'p6',name:'Dettol Hand Sanitizer',brand:'Dettol',price:149,mrp:199,pack:'500ml',rx:false,inStock:true,cat:'Personal Care',fallbackImg:'🧴',dosage:'',form:'Liquid',deliveryEst:'20 min',popular:true,manufacturer:'Reckitt',
    description:'Dettol Hand Sanitizer kills 99.9% of germs instantly without water. Enriched with skin-friendly ingredients for everyday hand hygiene.',
    uses:['Hand hygiene','Germ protection','On-the-go cleaning'],
    sideEffects:['Skin dryness (prolonged use)'],
    directions:'Apply a coin-sized amount on palms and rub hands together until dry.',
    storage:'Store at room temperature. Keep away from fire.',
    warnings:['For external use only','Keep away from eyes','Flammable']
  },
  p7: { id:'p7',name:'Baby Diaper Pants (L)',brand:'Pampers',price:450,mrp:550,pack:'56 Count',rx:false,inStock:true,cat:'Baby Care',fallbackImg:'🍼',dosage:'',form:'Pack',deliveryEst:'25 min',popular:false,manufacturer:'P&G',
    description:'Pampers Baby Diaper Pants with up to 12 hours of dryness. Soft cottony feel with magic gel technology that locks wetness away.',
    uses:['Baby hygiene','Overnight protection','Active baby comfort'],
    sideEffects:['Skin irritation (if allergic)'],
    directions:'Pull up like pants. Tear sides to remove.',
    storage:'Store in a dry place.',
    warnings:['Keep away from baby\'s reach when not in use','Dispose responsibly']
  },
  p8: { id:'p8',name:'Band-Aid Flexible Fabric',brand:'J&J',price:75,mrp:95,pack:'Box of 30',rx:false,inStock:true,cat:'First Aid',fallbackImg:'🩹',dosage:'',form:'Box',deliveryEst:'20 min',popular:false,manufacturer:'Johnson & Johnson',
    description:'Band-Aid Flexible Fabric bandages with Quiltvent technology for superior breathability and comfortable wound protection.',
    uses:['Minor cuts','Scrapes','Wound protection','First aid'],
    sideEffects:['Skin irritation (adhesive allergy)'],
    directions:'Clean wound area. Apply bandage over wound. Change daily or when wet.',
    storage:'Store in a cool, dry place.',
    warnings:['For external use only','Not for deep wounds','Consult doctor for serious injuries']
  },
  p9: { id:'p9',name:'Multivitamin Daily',brand:'Centrum',price:320,mrp:400,pack:'Bottle of 60',rx:false,inStock:true,cat:'Vitamins & Supplements',fallbackImg:'🧪',dosage:'',form:'Tablet',deliveryEst:'25 min',popular:true,manufacturer:'Haleon',
    description:'Centrum Multivitamin provides a balanced formula of 23 essential vitamins and minerals to support overall health, energy, and immunity.',
    uses:['Daily nutrition','Energy support','Immunity','Bone health','Eye health'],
    sideEffects:['Stomach upset (if taken on empty stomach)','Constipation'],
    directions:'Take 1 tablet daily with food.',
    storage:'Store below 25°C.',
    warnings:['Do not exceed recommended dose','Keep out of reach of children']
  },
  p10: { id:'p10',name:'CeraVe Moisturizing Cream',brand:'CeraVe',price:299,mrp:399,pack:'200ml',rx:false,inStock:true,cat:'Skin Care',fallbackImg:'🧖',dosage:'',form:'Cream',deliveryEst:'25 min',popular:true,manufacturer:"L'Oréal",
    description:'CeraVe Moisturizing Cream with 3 essential ceramides and hyaluronic acid. Developed with dermatologists for dry to very dry skin.',
    uses:['Daily moisturizing','Dry skin relief','Skin barrier repair','Eczema care'],
    sideEffects:['Skin reaction (rare, if allergic)'],
    directions:'Apply liberally as often as needed. For face and body.',
    storage:'Store at room temperature.',
    warnings:['For external use only','Discontinue if irritation occurs']
  },
  p11: { id:'p11',name:'Omega-3 Fish Oil 1000mg',brand:'HealthVit',price:280,mrp:350,pack:'60 Softgels',rx:false,inStock:true,cat:'Vitamins & Supplements',fallbackImg:'🐟',dosage:'1000mg',form:'Softgel',deliveryEst:'25 min',popular:false,manufacturer:'HealthVit',
    description:'Pure Omega-3 Fish Oil softgels with EPA and DHA for heart health, brain function, and joint support.',
    uses:['Heart health','Brain function','Joint support','Eye health','Cholesterol management'],
    sideEffects:['Fishy aftertaste','Stomach upset','Bloating'],
    directions:'Take 1-2 softgels daily with meals.',
    storage:'Store in a cool, dry place. Refrigerate after opening.',
    warnings:['Consult doctor if on blood thinners','Not for fish allergy']
  },
  p12: { id:'p12',name:'Digital BP Monitor',brand:'Omron',price:1800,mrp:2200,pack:'1 Unit',rx:false,inStock:true,cat:'Health Devices',fallbackImg:'🩺',dosage:'',form:'Device',deliveryEst:'35 min',popular:true,manufacturer:'Omron',
    description:'Omron Digital Blood Pressure Monitor with IntelliSense technology for accurate and comfortable BP measurement at home.',
    uses:['Blood pressure monitoring','Hypertension tracking','Heart health','Home health'],
    sideEffects:[],
    directions:'Wrap cuff around upper arm. Press Start. Wait for reading.',
    storage:'Store in a dry place. Avoid extreme temperatures.',
    warnings:['For home use only','Not a substitute for medical advice','Calibrate annually']
  },
  p13: { id:'p13',name:'Augmentin 625 Duo',brand:'GSK',price:220,mrp:280,pack:'Strip of 10',rx:true,inStock:true,cat:'Prescription Medicines',fallbackImg:'💊',dosage:'625mg',form:'Tablet',deliveryEst:'30 min',popular:false,manufacturer:'GSK',
    description:'Augmentin 625 Duo Tablet is a combination of Amoxicillin and Clavulanic Acid. Used to treat various bacterial infections.',
    uses:['Respiratory tract infections','Urinary tract infections','Skin infections','Dental infections','Ear infections'],
    sideEffects:['Diarrhea','Nausea','Vomiting','Skin rash','Allergic reactions'],
    directions:'Take as directed by your doctor. Complete the full course.',
    storage:'Store below 25°C in a dry place, protected from light.',
    warnings:['Prescription required','Complete full course','Inform doctor of penicillin allergy']
  },
  p14: { id:'p14',name:'Insulin Pen Needle',brand:'BD',price:350,mrp:420,pack:'Box of 50',rx:true,inStock:true,cat:'Diabetic Care',fallbackImg:'🩸',dosage:'',form:'Needles',deliveryEst:'30 min',popular:false,manufacturer:'Becton Dickinson',
    description:'BD Insulin Pen Needles with ultra-thin wall technology for comfortable and precise insulin delivery.',
    uses:['Insulin injection','Diabetes management'],
    sideEffects:['Injection site reaction','Bruising'],
    directions:'Attach to insulin pen. Inject as directed by healthcare provider.',
    storage:'Store at room temperature. Do not reuse needles.',
    warnings:['Prescription required','Single use only','Dispose in sharps container']
  },
  p15: { id:'p15',name:'Prenatal Multivitamins',brand:'Elevit',price:450,mrp:520,pack:'Bottle of 30',rx:false,inStock:true,cat:"Women's Health",fallbackImg:'♀️',dosage:'',form:'Tablet',deliveryEst:'25 min',popular:false,manufacturer:'Bayer',
    description:'Elevit Prenatal Multivitamin provides key nutrients including Folic Acid, Iron, and DHA for healthy pregnancy and fetal development.',
    uses:['Prenatal nutrition','Folic acid supplementation','Iron supplementation','Healthy pregnancy','Fetal development'],
    sideEffects:['Nausea','Constipation','Dark stools (iron)'],
    directions:'Take 1 tablet daily with food. Start before conception and continue through pregnancy.',
    storage:'Store below 25°C.',
    warnings:['Consult doctor before use','Not a substitute for balanced diet']
  },
  p16: { id:'p16',name:'Knee Support Wrap',brand:'Tynor',price:420,mrp:520,pack:'1 Pair',rx:false,inStock:true,cat:'Orthopedic Support',fallbackImg:'🦴',dosage:'',form:'Support',deliveryEst:'30 min',popular:false,manufacturer:'Tynor',
    description:'Tynor Knee Support provides compression and warmth to the knee joint. Ideal for mild knee pain, sprains, and post-exercise recovery.',
    uses:['Knee pain relief','Joint support','Sports recovery','Arthritis support','Post-surgery rehabilitation'],
    sideEffects:['Skin irritation (prolonged use)'],
    directions:'Slide over the knee. Adjust for comfortable fit. Remove if circulation is restricted.',
    storage:'Wash with mild soap. Air dry.',
    warnings:['Not for open wounds','Consult doctor for severe pain','Size accordingly']
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const product = ALL_PRODUCTS[productId];

  const [qty, setQty] = useState(0);
  const [wishlist, setWishlist] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">💊</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h1>
        <p className="text-slate-500 mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/" className="text-teal-600 font-bold hover:underline">← Back to Pharmacy</Link>
      </div>
    );
  }

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-teal-600 transition-colors">Pharmacy</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-400">{product.cat}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-800 font-semibold">{product.name}</span>
      </nav>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Image Area */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 aspect-square flex items-center justify-center relative overflow-hidden">
            <span className="text-8xl">{product.fallbackImg}</span>
            {product.rx && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">Rx Required</span>
            )}
            {product.popular && (
              <span className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-lg">⭐ Popular</span>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <span className="bg-red-100 text-red-700 font-bold text-sm px-4 py-2 rounded-xl">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setWishlist(!wishlist)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                wishlist ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${wishlist ? 'fill-red-500' : ''}`} />
              {wishlist ? 'Wishlisted' : 'Wishlist'}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-bold transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{product.cat}</span>
              {product.rx && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Prescription Required</span>}
              {product.form && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{product.form}</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{product.name}</h1>
            <p className="text-sm text-slate-500 mt-1">by <span className="font-semibold text-slate-700">{product.brand}</span> • {product.manufacturer}</p>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">₹{product.price}</span>
              <span className="text-lg text-slate-400 line-through">₹{product.mrp}</span>
              <span className="bg-emerald-100 text-emerald-700 text-sm font-black px-2.5 py-0.5 rounded-lg">{discount}% OFF</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{product.pack} • Inclusive of all taxes</p>

            {/* Add to Cart / Rx */}
            <div className="mt-4 flex items-center gap-3">
              {!product.inStock ? (
                <div className="flex-1 bg-red-50 text-red-600 font-bold text-center py-3 rounded-xl border border-red-200">Out of Stock</div>
              ) : product.rx ? (
                <button onClick={() => setShowRxModal(true)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Upload Prescription to Order
                </button>
              ) : qty > 0 ? (
                <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
                  <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 h-9 flex items-center justify-center text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"><Minus className="w-5 h-5" /></button>
                  <span className="text-lg font-black text-teal-700 min-w-[2ch] text-center">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
              ) : (
                <button onClick={() => setQty(1)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <Truck className="w-5 h-5 text-teal-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-900">{product.deliveryEst}</p>
              <p className="text-[10px] text-slate-500">Delivery</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <Shield className="w-5 h-5 text-teal-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-900">100% Genuine</p>
              <p className="text-[10px] text-slate-500">Verified</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <Clock className="w-5 h-5 text-teal-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-900">Easy Returns</p>
              <p className="text-[10px] text-slate-500">7-day policy</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-2">Description</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Product Details Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Product Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Brand', product.brand],
                ['Manufacturer', product.manufacturer],
                ['Form', product.form],
                ['Pack Size', product.pack],
                ...(product.dosage ? [['Dosage', product.dosage]] : []),
                ['Category', product.cat],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
                  <p className="font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Uses */}
          {product.uses.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">Uses</h2>
              <div className="flex flex-wrap gap-2">
                {product.uses.map(u => (
                  <span key={u} className="bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-100">{u}</span>
                ))}
              </div>
            </div>
          )}

          {/* Side Effects */}
          {product.sideEffects.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">Side Effects</h2>
              <ul className="space-y-1.5">
                {product.sideEffects.map(s => (
                  <li key={s} className="text-sm text-slate-600 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Directions & Storage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-2">Directions for Use</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{product.directions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-2">Storage</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{product.storage}</p>
            </div>
          </div>

          {/* Warnings */}
          {product.warnings.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">⚠️ Warnings</h2>
              <ul className="space-y-1.5">
                {product.warnings.map(w => (
                  <li key={w} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SEO Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"Product","name":product.name,"brand":{"@type":"Brand","name":product.brand},
        "description":product.description,"sku":product.id,
        "offers":{"@type":"Offer","price":product.price,"priceCurrency":"INR","availability":product.inStock?"https://schema.org/InStock":"https://schema.org/OutOfStock"},
        "category":product.cat
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
          {"@type":"ListItem","position":1,"name":"Pharmacy","item":"https://kartseek.com/pharmacy"},
          {"@type":"ListItem","position":2,"name":product.cat,"item":`https://kartseek.com/pharmacy?category=${product.cat}`},
          {"@type":"ListItem","position":3,"name":product.name,"item":`https://kartseek.com/pharmacy/product/${product.id}`}
        ]
      }) }} />

      {/* Prescription Upload Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRxModal(false)}><DismissOnEscape onDismiss={() => setShowRxModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                  <div><h3 className="font-bold text-lg">Prescription Required</h3><p className="text-white/70 text-xs">{product.name} requires a valid prescription</p></div>
                </div>
                <button onClick={() => setShowRxModal(false)} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-700 font-medium">This medicine requires a valid doctor&apos;s prescription. Upload your prescription and a licensed pharmacist will verify it.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{icon:'📷',label:'Camera'},{icon:'🖼️',label:'Image'},{icon:'📄',label:'PDF'}].map(m => (
                  <button key={m.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center hover:bg-slate-100 transition-colors">
                    <span className="text-2xl block mb-1">{m.icon}</span>
                    <span className="text-xs font-bold text-slate-700">{m.label}</span>
                  </button>
                ))}
              </div>
              <textarea placeholder="Add notes for the pharmacist (optional)..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:ring-2 focus:ring-orange-500 outline-none" />
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Submit for Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
