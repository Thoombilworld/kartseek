'use client';
/* cSpell:words healthplus medplus Uhuru Ngong firstaid vitaminc Reckitt bandaid Haleon Softgels Softgel bpmonitor Elevit Tynor kneesupport */
import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Star, MapPin, Clock, Shield, ChevronLeft, Search, ShoppingCart, Tag, Truck,
  Phone, RotateCcw, Minus, Plus, ArrowRight, Upload, FileText, Camera,
  X, CheckCircle, AlertTriangle, Eye, ChevronRight, Package, Pill, Heart
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const STORE_DATA: Record<string, { name:string;slug:string;address:string;rating:number;reviews:number;distance:string;delivery:string;open:boolean;phone:string;minOrder:string;deliveryFee:string;returnPolicy:string;license:string }> = {
  'ph-1': { name:'HealthPlus Pharmacy',slug:'healthplus-pharmacy',address:'123 MG Road, Mumbai',rating:4.7,reviews:1248,distance:'0.5 km',delivery:'20 min',open:true,phone:'+91 712 345 678',minOrder:'₹299',deliveryFee:'Free',returnPolicy:'7-day return on eligible items',license:'PH-2024-NAI-001' },
  'ph-2': { name:'Apollo Pharmacy',slug:'apollo-pharmacy',address:'45 FC Road, Mumbai',rating:4.8,reviews:2100,distance:'1.2 km',delivery:'30 min',open:true,phone:'+91 722 111 222',minOrder:'₹399',deliveryFee:'₹25',returnPolicy:'7-day return',license:'PH-2024-NAI-002' },
  'ph-3': { name:'MedPlus Pharmacy',slug:'medplus-pharmacy',address:'78 Western Express Highway, Mumbai',rating:4.6,reviews:890,distance:'0.8 km',delivery:'18 min',open:true,phone:'+91 733 444 555',minOrder:'₹199',deliveryFee:'Free',returnPolicy:'5-day return',license:'PH-2024-NAI-003' },
  'ph-4': { name:'WellBeing Pharmacy',slug:'wellbeing-pharmacy',address:'12 SV Road, Mumbai',rating:4.5,reviews:680,distance:'1.5 km',delivery:'35 min',open:true,phone:'+91 744 666 777',minOrder:'₹349',deliveryFee:'₹30',returnPolicy:'7-day return',license:'PH-2024-NAI-004' },
  'ph-5': { name:'LifeCare Pharmacy',slug:'lifecare-pharmacy',address:'90 Westlands, Mumbai',rating:4.9,reviews:1540,distance:'2.0 km',delivery:'40 min',open:true,phone:'+91 755 888 999',minOrder:'₹499',deliveryFee:'₹40',returnPolicy:'7-day return',license:'PH-2024-NAI-005' },
  'ph-6': { name:'PharmEasy Store',slug:'pharmeasy-store',address:'56 Link Road, Mumbai',rating:4.5,reviews:920,distance:'1.8 km',delivery:'22 min',open:true,phone:'+91 766 000 111',minOrder:'₹249',deliveryFee:'Free',returnPolicy:'5-day return',license:'PH-2024-NAI-006' },
};

const STORE_CATEGORIES = [
  { id:'all',name:'All',emoji:'📦' },
  { id:'medicines',name:'Medicines',emoji:'💊' },
  { id:'rx',name:'Prescription Medicines',emoji:'📋' },
  { id:'otc',name:'OTC Medicines',emoji:'💉' },
  { id:'baby',name:'Baby Care',emoji:'🍼' },
  { id:'personal',name:'Personal Care',emoji:'🧴' },
  { id:'devices',name:'Health Devices',emoji:'🩺' },
  { id:'vitamins',name:'Vitamins & Supplements',emoji:'🧪' },
  { id:'firstaid',name:'First Aid',emoji:'🩹' },
  { id:'skincare',name:'Skin Care',emoji:'🧖' },
  { id:'haircare',name:'Hair Care',emoji:'💇' },
  { id:'women',name:"Women's Health",emoji:'♀️' },
  { id:'diabetic',name:'Diabetic Care',emoji:'🩸' },
  { id:'ortho',name:'Orthopedic Support',emoji:'🦴' },
  { id:'elderly',name:'Elderly Care',emoji:'👴' },
  { id:'wellness',name:'Wellness Products',emoji:'🧘' },
  { id:'mother',name:'Mother & Baby',emoji:'🤱' },
  { id:'home',name:'Home Healthcare',emoji:'🏥' },
];

const PRODUCTS = [
  { id:'p1',name:'Paracetamol 500mg',brand:'Dolo',price:25,mrp:32,pack:'Strip of 15',rx:false,inStock:true,cat:'medicines',img:'/pharmacy/products/paracetamol.webp',fallbackImg:'💊',dosage:'500mg',form:'Tablet',deliveryEst:'20 min',popular:true,manufacturer:'Micro Labs' },
  { id:'p2',name:'Cetirizine 10mg',brand:'Zyrtec',price:45,mrp:55,pack:'Strip of 10',rx:false,inStock:true,cat:'otc',img:'/pharmacy/products/cetirizine.webp',fallbackImg:'💊',dosage:'10mg',form:'Tablet',deliveryEst:'20 min',popular:true,manufacturer:'UCB India' },
  { id:'p3',name:'Vitamin C 1000mg',brand:'Celin',price:65,mrp:80,pack:'Tube of 10',rx:false,inStock:true,cat:'vitamins',img:'/pharmacy/products/vitaminc.webp',fallbackImg:'🧪',dosage:'1000mg',form:'Effervescent Tab',deliveryEst:'25 min',popular:true,manufacturer:'GSK' },
  { id:'p4',name:'Amoxicillin 250mg',brand:'Amoxil',price:85,mrp:110,pack:'Strip of 10',rx:true,inStock:true,cat:'rx',img:'/pharmacy/products/amoxicillin.webp',fallbackImg:'💊',dosage:'250mg',form:'Capsule',deliveryEst:'30 min',popular:false,manufacturer:'GSK' },
  { id:'p5',name:'Metformin 500mg',brand:'Glycomet',price:32,mrp:45,pack:'Strip of 20',rx:true,inStock:false,cat:'rx',img:'/pharmacy/products/metformin.webp',fallbackImg:'💊',dosage:'500mg',form:'Tablet',deliveryEst:'—',popular:false,manufacturer:'USV Ltd' },
  { id:'p6',name:'Dettol Hand Sanitizer',brand:'Dettol',price:149,mrp:199,pack:'500ml',rx:false,inStock:true,cat:'personal',img:'/pharmacy/products/dettol.webp',fallbackImg:'🧴',dosage:'',form:'Liquid',deliveryEst:'20 min',popular:true,manufacturer:'Reckitt' },
  { id:'p7',name:'Baby Diaper Pants (L)',brand:'Pampers',price:450,mrp:550,pack:'56 Count',rx:false,inStock:true,cat:'baby',img:'/pharmacy/products/pampers.webp',fallbackImg:'🍼',dosage:'',form:'Pack',deliveryEst:'25 min',popular:false,manufacturer:'P&G' },
  { id:'p8',name:'Band-Aid Flexible Fabric',brand:'J&J',price:75,mrp:95,pack:'Box of 30',rx:false,inStock:true,cat:'firstaid',img:'/pharmacy/products/bandaid.webp',fallbackImg:'🩹',dosage:'',form:'Box',deliveryEst:'20 min',popular:false,manufacturer:'Johnson & Johnson' },
  { id:'p9',name:'Multivitamin Daily',brand:'Centrum',price:320,mrp:400,pack:'Bottle of 60',rx:false,inStock:true,cat:'vitamins',img:'/pharmacy/products/centrum.webp',fallbackImg:'🧪',dosage:'',form:'Tablet',deliveryEst:'25 min',popular:true,manufacturer:'Haleon' },
  { id:'p10',name:'CeraVe Moisturizing Cream',brand:'CeraVe',price:299,mrp:399,pack:'200ml',rx:false,inStock:true,cat:'skincare',img:'/pharmacy/products/cerave.webp',fallbackImg:'🧖',dosage:'',form:'Cream',deliveryEst:'25 min',popular:true,manufacturer:"L'Oréal" },
  { id:'p11',name:'Omega-3 Fish Oil 1000mg',brand:'HealthVit',price:280,mrp:350,pack:'60 Softgels',rx:false,inStock:true,cat:'vitamins',img:'/pharmacy/products/omega3.webp',fallbackImg:'🐟',dosage:'1000mg',form:'Softgel',deliveryEst:'25 min',popular:false,manufacturer:'HealthVit' },
  { id:'p12',name:'Digital BP Monitor',brand:'Omron',price:1800,mrp:2200,pack:'1 Unit',rx:false,inStock:true,cat:'devices',img:'/pharmacy/products/bpmonitor.webp',fallbackImg:'🩺',dosage:'',form:'Device',deliveryEst:'35 min',popular:true,manufacturer:'Omron' },
  { id:'p13',name:'Augmentin 625 Duo',brand:'GSK',price:220,mrp:280,pack:'Strip of 10',rx:true,inStock:true,cat:'rx',img:'/pharmacy/products/augmentin.webp',fallbackImg:'💊',dosage:'625mg',form:'Tablet',deliveryEst:'30 min',popular:false,manufacturer:'GSK' },
  { id:'p14',name:'Insulin Pen Needle',brand:'BD',price:350,mrp:420,pack:'Box of 50',rx:true,inStock:true,cat:'diabetic',img:'/pharmacy/products/insulin.webp',fallbackImg:'🩸',dosage:'',form:'Needles',deliveryEst:'30 min',popular:false,manufacturer:'Becton Dickinson' },
  { id:'p15',name:'Prenatal Multivitamins',brand:'Elevit',price:450,mrp:520,pack:'Bottle of 30',rx:false,inStock:true,cat:'women',img:'/pharmacy/products/prenatal.webp',fallbackImg:'♀️',dosage:'',form:'Tablet',deliveryEst:'25 min',popular:false,manufacturer:'Bayer' },
  { id:'p16',name:'Knee Support Wrap',brand:'Tynor',price:420,mrp:520,pack:'1 Pair',rx:false,inStock:true,cat:'ortho',img:'/pharmacy/products/kneesupport.webp',fallbackImg:'🦴',dosage:'',form:'Support',deliveryEst:'30 min',popular:false,manufacturer:'Tynor' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PRESCRIPTION UPLOAD MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

function PrescriptionModal({ product, onClose }: { product: typeof PRODUCTS[0]; onClose: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle'|'uploading'|'submitted'>('idle');

  const handleUpload = () => {
    setStatus('uploading');
    setTimeout(() => setStatus('submitted'), 1500);
  };
  const addFile = (type: string) => setFiles(prev => [...prev, `${type}_${Date.now()}.${type === 'camera' ? 'jpg' : type === 'pdf' ? 'pdf' : 'jpg'}`]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}><DismissOnEscape onDismiss={onClose} />
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
              <div><h3 className="font-bold text-lg">Prescription Required</h3><p className="text-white/70 text-xs">Upload your prescription for verification</p></div>
            </div>
            <button onClick={onClose} title="Close" className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {status === 'submitted' ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Prescription Uploaded</h3>
            <p className="text-sm text-slate-500 mt-2">Your prescription for <strong>{product.name}</strong> has been submitted for pharmacy verification.</p>
            <div className="mt-4 space-y-2">
              {['Prescription Uploaded','Waiting for pharmacy review','Pharmacy will verify & approve','You will receive status update'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle className={`w-3.5 h-3.5 ${i === 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={i === 0 ? 'font-bold' : ''}>{step}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Medicine Info */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div><p className="text-sm font-bold text-red-800">{product.name} — {product.dosage}</p><p className="text-xs text-red-600 mt-0.5">This medicine requires a valid prescription from a licensed doctor. The pharmacy will verify before processing.</p></div>
            </div>

            {/* Upload Options */}
            <div><p className="text-sm font-bold text-slate-900 mb-2">Upload Prescription</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addFile('image')} className="bg-slate-50 hover:bg-teal-50 border-2 border-dashed border-slate-200 hover:border-teal-300 rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
                  <Upload className="w-6 h-6 text-teal-600" /><span className="text-[10px] font-bold text-slate-600">Image Upload</span>
                </button>
                <button onClick={() => addFile('pdf')} className="bg-slate-50 hover:bg-teal-50 border-2 border-dashed border-slate-200 hover:border-teal-300 rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
                  <FileText className="w-6 h-6 text-blue-600" /><span className="text-[10px] font-bold text-slate-600">PDF Upload</span>
                </button>
                <button onClick={() => addFile('camera')} className="bg-slate-50 hover:bg-teal-50 border-2 border-dashed border-slate-200 hover:border-teal-300 rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
                  <Camera className="w-6 h-6 text-purple-600" /><span className="text-[10px] font-bold text-slate-600">Camera</span>
                </button>
              </div>
            </div>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">{files.length} file{files.length > 1 ? 's' : ''} attached</p>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-2"><CheckCircle className="w-3 h-3" />{f}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_,j) => j !== i))} title="Remove file" className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div><p className="text-xs font-bold text-slate-500 mb-1">Notes for Pharmacist (optional)</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional instructions..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
            </div>

            {/* Verification Statuses */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verification Process</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                {['Prescription Required','Uploaded','Under Review','Approved / Rejected'].map((s, i) => (
                  <React.Fragment key={s}>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${i === 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>{s}</span>
                    {i < 3 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleUpload} disabled={files.length === 0 || status === 'uploading'}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${files.length > 0 && status !== 'uploading' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {status === 'uploading' ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Submit for Verification</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function ProductCard({ p, qty, onAdd, onRemove, onRxUpload }: {
  p: typeof PRODUCTS[0]; qty: number;
  onAdd: () => void; onRemove: () => void; onRxUpload: () => void;
}) {
  const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border-2 ${p.rx ? 'border-orange-200' : p.inStock ? 'border-slate-100 hover:border-teal-200' : 'border-red-100 opacity-60'} transition-all hover:shadow-md`}>
      {/* Product Image */}
      <div className="relative h-32 bg-gradient-to-b from-slate-50 to-white rounded-t-2xl flex items-center justify-center overflow-hidden">
        {imgError ? (
          <span className="text-4xl">{p.fallbackImg}</span>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">{p.fallbackImg}</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md">{discount}% OFF</span>}
          {p.popular && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md">Popular</span>}
        </div>
        {p.rx && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
            <Pill className="w-2.5 h-2.5" /> Rx Required
          </div>
        )}
        {!p.inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-lg">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="mb-2">
          <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{p.name}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{p.brand} • {p.pack}{p.dosage && ` • ${p.dosage}`}</p>
          {p.form && <p className="text-[10px] text-slate-400 mt-0.5">{p.form}{p.manufacturer && ` — ${p.manufacturer}`}</p>}
        </div>

        {/* Rx Warning */}
        {p.rx && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-700 font-medium leading-tight">Prescription Required — Upload before checkout. Pharmacy verification needed.</p>
          </div>
        )}

        {/* Price & Delivery */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-black text-slate-900 text-base">₹{p.price}</span>
            <span className="text-[10px] text-slate-400 line-through ml-1">₹{p.mrp}</span>
          </div>
          {p.inStock && <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{p.deliveryEst}</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!p.inStock ? (
            <span className="flex-1 text-center text-xs font-bold text-red-600 bg-red-50 py-2 rounded-xl">Unavailable</span>
          ) : p.rx ? (
            <button onClick={onRxUpload} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <Upload className="w-3 h-3" /> Upload Prescription
            </button>
          ) : qty > 0 ? (
            <div className="flex-1 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-2 py-1">
              <button onClick={onRemove} title="Remove one" className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
              <span className="text-sm font-black text-teal-700">{qty}</span>
              <button onClick={onAdd} title="Add one" className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={onAdd} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <ShoppingCart className="w-3 h-3" /> Add to Cart
            </button>
          )}
          <Link href={`/pharmacy/product/${p.id}`} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" title="View Details">
            <Eye className="w-4 h-4 text-slate-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ SECTION (AEO)
   ═══════════════════════════════════════════════════════════════════════════ */

const STORE_FAQS = [
  { q:'How can I order medicines from this pharmacy?', a:'Browse products by category, add items to cart, and checkout. For prescription medicines, upload your prescription and wait for pharmacy verification before the order is processed.' },
  { q:'Which medicines require a prescription?', a:'Medicines marked with an "Rx Required" tag require a valid prescription from a licensed doctor. You can upload your prescription as an image or PDF during checkout.' },
  { q:'How do I upload a prescription?', a:'Click the "Upload Prescription" button on any Rx-required medicine. You can upload images, PDFs, or take a photo directly from your mobile camera. The pharmacy will verify your prescription before processing the order.' },
  { q:'Who verifies my prescription?', a:'Your prescription is verified by a licensed pharmacist at the pharmacy store. They check the validity, dosage, and doctor details before approving the order.' },
  { q:'How are delivery charges calculated?', a:'Delivery charges depend on your distance from the pharmacy and order value. Many pharmacies offer free delivery above a minimum order value.' },
  { q:'Can I return pharmacy products?', a:'Eligible non-prescription products can be returned as per the pharmacy\'s return policy. Prescription medicines are typically non-returnable for safety reasons.' },
];

function FaqSection({ faqs }: { faqs: typeof STORE_FAQS }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-teal-600" /> Frequently Asked Questions</h2>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-800">{faq.q}</span>
              <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open === i ? 'rotate-90' : ''}`} />
            </button>
            {open === i && <div className="px-3.5 pb-3.5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>}
          </div>
        ))}
      </div>

      {/* FAQ Schema (JSON-LD) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"FAQPage",
        "mainEntity": faqs.map(f => ({ "@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a} }))
      }) }} />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BREADCRUMBS
   ═══════════════════════════════════════════════════════════════════════════ */

function Breadcrumbs({ items }: { items: { name:string; href:string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          {i < items.length - 1 ? (
            <Link href={item.href} className="hover:text-teal-600 transition-colors font-medium">{item.name}</Link>
          ) : (
            <span className="text-slate-700 font-semibold">{item.name}</span>
          )}
        </React.Fragment>
      ))}

      {/* Breadcrumb Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"BreadcrumbList",
        "itemListElement": items.map((item, i) => ({ "@type":"ListItem","position":i+1,"name":item.name,"item":`https://kartseek.com${item.href}` }))
      }) }} />
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PharmacyStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const store = STORE_DATA[id] || STORE_DATA['ph-1'];
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [rxModal, setRxModal] = useState<typeof PRODUCTS[0] | null>(null);

  const filtered = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesCat = selectedCat === 'all' || p.cat === selectedCat;
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCat, search]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = PRODUCTS.find(pr => pr.id === id);
    return s + (p ? p.price * qty : 0);
  }, 0);

  const addToCart = useCallback((id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 })), []);
  const removeFromCart = useCallback((id: string) => setCart(prev => {
    const next = { ...prev };
    if (next[id] > 1) next[id]--;
    else delete next[id];
    return next;
  }), []);

  const selectedCatObj = STORE_CATEGORIES.find(c => c.id === selectedCat);

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-5 pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { name:'Home', href:'/' },
        { name:'Pharmacy', href:'/pharmacy' },
        { name:'Stores', href:'/pharmacy/stores' },
        { name:store.name, href:`/pharmacy/stores/${id}` },
      ]} />

      {/* ── Store Header ── */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-md" role="img" aria-label={`${store.name} logo`}>💊</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
              <Shield className="w-5 h-5 text-blue-200" aria-label="Verified pharmacy" />
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${store.open ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-200'}`}>
                {store.open ? '● Open Now' : '● Closed'}
              </span>
            </div>
            <p className="text-white/60 text-sm mb-3">{store.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-lg"><Star className="w-4 h-4 text-amber-300 fill-amber-300" /><span className="font-bold">{store.rating}</span><span className="text-white/60">({store.reviews.toLocaleString()})</span></span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-white/60" />{store.distance}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-white/60" />{store.delivery}</span>
              <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-white/60" />{store.deliveryFee}</span>
              <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-white/60" />{store.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Store Info Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-xs text-slate-400 font-medium">Min Order</p><p className="font-bold text-slate-900 text-lg mt-1">{store.minOrder}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-xs text-slate-400 font-medium">Delivery Fee</p><p className="font-bold text-slate-900 text-lg mt-1">{store.deliveryFee}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-xs text-slate-400 font-medium">Delivery Time</p><p className="font-bold text-teal-600 text-lg mt-1">{store.delivery}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-xs text-slate-400 font-medium">Return Policy</p><p className="font-bold text-slate-900 text-sm mt-1 flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5 text-blue-500" />{store.returnPolicy}</p></div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search medicines, health products in this pharmacy..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" />
      </div>

      {/* ══════════════════════════════════════════════════════════
         CATEGORY SECTION — TOP OF PRODUCT AREA
         ══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-teal-600" /> Shop by Category</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {STORE_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                selectedCat === cat.id
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:bg-teal-50'
              }`}>
              <span>{cat.emoji}</span> {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         VERTICAL PRODUCT LIST
         ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            {selectedCat !== 'all' && <p className="text-xs text-teal-600 font-bold flex items-center gap-1"><span className="text-base">{selectedCatObj?.emoji}</span> {selectedCatObj?.name}</p>}
            <p className="text-sm text-slate-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''} {selectedCat !== 'all' ? `in ${selectedCatObj?.name}` : 'available'}</p>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                p={p}
                qty={cart[p.id] || 0}
                onAdd={() => addToCart(p.id)}
                onRemove={() => removeFromCart(p.id)}
                onRxUpload={() => setRxModal(p)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <span className="text-5xl mb-4 block">🔍</span>
            <p className="font-bold text-slate-900 text-lg">No products found</p>
            <p className="text-sm text-slate-500 mt-1">Try a different category or search term</p>
            <button onClick={() => { setSelectedCat('all'); setSearch(''); }} className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors">Browse All</button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
         FAQ SECTION (AEO)
         ══════════════════════════════════════════════════════════ */}
      <FaqSection faqs={STORE_FAQS} />

      {/* ══════════════════════════════════════════════════════════
         SCHEMA MARKUP (SEO)
         ══════════════════════════════════════════════════════════ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org",
        "@type":"LocalBusiness",
        "name":store.name,
        "image":"https://kartseek.com/pharmacy/store-default.jpg",
        "address":{"@type":"PostalAddress","streetAddress":store.address},
        "telephone":store.phone,
        "aggregateRating":{"@type":"AggregateRating","ratingValue":store.rating,"reviewCount":store.reviews},
        "openingHours":"Mo-Su 08:00-22:00",
        "priceRange":"₹",
        "url":`https://kartseek.com/pharmacy/stores/${id}`
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"ItemList",
        "itemListElement": PRODUCTS.slice(0, 8).map((p, i) => ({
          "@type":"ListItem","position":i+1,
          "item":{"@type":"Product","name":p.name,"brand":{"@type":"Brand","name":p.brand},"offers":{"@type":"Offer","price":p.price,"priceCurrency":"INR","availability":p.inStock?"https://schema.org/InStock":"https://schema.org/OutOfStock"}}
        }))
      }) }} />

      {/* ── Sticky Cart Bar ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:px-0">
          <div className="max-w-6xl mx-auto">
            <Link href="/cart" className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="font-black">{cartCount}</span>
                  <span className="text-xs opacity-80 ml-1">item{cartCount !== 1 ? 's' : ''}</span>
                </div>
                <span className="font-bold">₹{cartTotal.toLocaleString()}</span>
              </div>
              <span className="flex items-center gap-2 font-bold text-sm">
                View Cart <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Prescription Upload Modal ── */}
      {rxModal && <PrescriptionModal product={rxModal} onClose={() => setRxModal(null)} />}
    </div>
  );
}
