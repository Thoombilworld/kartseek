'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle, Save, ArrowLeft, CheckCircle2, AlertCircle,
  UtensilsCrossed, Image, DollarSign, Flame, Shield, Eye,
  Upload, Gauge, X, GripVertical, Leaf, Clock,
  Info, Barcode, Tag, Scale, Heart, Plus, Minus,
  ChefHat, ThermometerSun, Wheat, Egg, Fish, Beef, Salad,
  Sparkles, Zap, Star, BadgePercent, Package,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'details' | 'images' | 'pricing' | 'customization' | 'nutrition' | 'review';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  requiredFields: (keyof FormData)[];
}

interface Addon {
  name: string;
  price: string;
}

interface Variant {
  name: string;
  price: string;
}

interface FormData {
  // Item Details
  name: string;
  shortDesc: string;
  longDesc: string;
  category: string;
  subcategory: string;
  cuisine: string;
  foodType: string; // Veg / Non-Veg / Egg
  spiceLevel: string; // Mild / Medium / Hot / Extra Hot
  prepTime: string;
  servingSize: string;
  servesCount: string;
  isChefSpecial: boolean;
  isBestseller: boolean;
  isNewItem: boolean;
  // Images
  images: string[];
  // Pricing
  basePrice: string;
  packagingCharge: string;
  taxRate: string;
  gstInclusive: boolean;
  discountPercent: string;
  availableForDelivery: boolean;
  availableForDineIn: boolean;
  availableForTakeaway: boolean;
  // Customization
  variants: Variant[];
  addons: Addon[];
  // Nutrition & Compliance
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  allergens: string;
  ingredients: string;
  fssaiLicense: string;
  isJainFriendly: boolean;
  isGlutenFree: boolean;
  isNutFree: boolean;
  // Availability
  isAvailable: boolean;
  availableFrom: string;
  availableTo: string;
  availableDays: string[];
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { id: 'details', label: 'Item Details', icon: UtensilsCrossed, requiredFields: ['name', 'category', 'foodType', 'prepTime'] },
  { id: 'images', label: 'Images', icon: Image, requiredFields: [] },
  { id: 'pricing', label: 'Pricing', icon: DollarSign, requiredFields: ['basePrice'] },
  { id: 'customization', label: 'Customization', icon: Sparkles, requiredFields: [] },
  { id: 'nutrition', label: 'Nutrition & Info', icon: Heart, requiredFields: [] },
  { id: 'review', label: 'Review', icon: Eye, requiredFields: [] },
];

// ─── Initial form data ────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  name: '', shortDesc: '', longDesc: '',
  category: '', subcategory: '', cuisine: '',
  foodType: 'Veg', spiceLevel: 'Medium',
  prepTime: '', servingSize: '', servesCount: '1',
  isChefSpecial: false, isBestseller: false, isNewItem: true,
  images: [],
  basePrice: '', packagingCharge: '', taxRate: '5',
  gstInclusive: true, discountPercent: '',
  availableForDelivery: true, availableForDineIn: true, availableForTakeaway: true,
  variants: [],
  addons: [],
  calories: '', protein: '', carbs: '', fat: '', fiber: '',
  allergens: '', ingredients: '', fssaiLicense: '',
  isJainFriendly: false, isGlutenFree: false, isNutFree: false,
  isAvailable: true, availableFrom: '09:00', availableTo: '23:00',
  availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AddMenuItemPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouchedFields(prev => new Set(prev).add(e.target.name));
  }, []);

  const handleToggle = useCallback((name: keyof FormData) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // ── Variants & Addons ────────────────────────────────────────────────────

  const addVariant = () => setFormData(prev => ({ ...prev, variants: [...prev.variants, { name: '', price: '' }] }));
  const removeVariant = (i: number) => setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== i) }));
  const updateVariant = (i: number, field: keyof Variant, value: string) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v) }));
  };

  const addAddon = () => setFormData(prev => ({ ...prev, addons: [...prev.addons, { name: '', price: '' }] }));
  const removeAddon = (i: number) => setFormData(prev => ({ ...prev, addons: prev.addons.filter((_, idx) => idx !== i) }));
  const updateAddon = (i: number, field: keyof Addon, value: string) => {
    setFormData(prev => ({ ...prev, addons: prev.addons.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };

  // ── Day toggles ──────────────────────────────────────────────────────────

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day) ? prev.availableDays.filter(d => d !== day) : [...prev.availableDays, day],
    }));
  };

  // ── Validation ───────────────────────────────────────────────────────────

  const isFieldRequired = useCallback((field: string): boolean => {
    return TABS.some(t => (t.requiredFields as string[]).includes(field));
  }, []);

  const isFieldInvalid = useCallback((field: string): boolean => {
    if (!touchedFields.has(field)) return false;
    if (!isFieldRequired(field)) return false;
    const val = formData[field as keyof FormData];
    return val === '' || val === undefined || val === null;
  }, [touchedFields, formData, isFieldRequired]);

  const tabCompletion = useMemo(() => {
    const result: Record<TabId, { filled: number; total: number; complete: boolean }> = {} as Record<TabId, { filled: number; total: number; complete: boolean }>;
    for (const tab of TABS) {
      const total = tab.requiredFields.length;
      if (total === 0) {
        if (tab.id === 'images') {
          const filled = formData.images.length > 0 ? 1 : 0;
          result[tab.id] = { filled, total: 1, complete: filled > 0 };
        } else {
          result[tab.id] = { filled: 0, total: 0, complete: true };
        }
        continue;
      }
      const filled = tab.requiredFields.filter(f => {
        const val = formData[f]; return val !== '' && val !== undefined && val !== null;
      }).length;
      result[tab.id] = { filled, total, complete: filled === total };
    }
    return result;
  }, [formData]);

  // ── Quality score ────────────────────────────────────────────────────────

  const qualityScore = useMemo(() => {
    let score = 0;
    const allReq = TABS.flatMap(t => t.requiredFields);
    const filledReq = allReq.filter(f => { const v = formData[f]; return v !== '' && v !== undefined && v !== null; });
    score += (filledReq.length / Math.max(allReq.length, 1)) * 40;
    score += Math.min(formData.images.length / 2, 1) * 25;
    const enrich: (keyof FormData)[] = ['shortDesc', 'longDesc', 'cuisine', 'servingSize', 'servesCount', 'calories', 'protein', 'ingredients', 'allergens'];
    const filledEnrich = enrich.filter(f => { const v = formData[f]; return v !== '' && v !== undefined && v !== null; });
    score += (filledEnrich.length / enrich.length) * 20;
    if (formData.variants.length > 0) score += 8;
    if (formData.addons.length > 0) score += 7;
    return Math.round(Math.min(score, 100));
  }, [formData]);

  const qualityColor = qualityScore >= 80 ? 'text-emerald-600' : qualityScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const qualityBg = qualityScore >= 80 ? 'bg-emerald-500' : qualityScore >= 50 ? 'bg-amber-500' : 'bg-red-500';

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSaveDraft = async () => { setDraftSaving(true); await new Promise(r => setTimeout(r, 800)); setDraftSaving(false); };

  const canPublish = tabCompletion.details.complete && tabCompletion.pricing.complete && formData.images.length > 0;

  const handlePublish = async () => {
    if (!canPublish) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1500));
    setSaving(false);
    router.push('/seller/restaurant/menu');
  };

  const addImage = () => { if (formData.images.length >= 5) return; setFormData(prev => ({ ...prev, images: [...prev.images, `food_img_${prev.images.length + 1}`] })); };
  const removeImage = (idx: number) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) })); };

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/seller/restaurant/menu" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-7 h-7 text-orange-500" />Add Menu Item
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Add a new dish to your restaurant menu</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            <Gauge className={`w-5 h-5 ${qualityColor}`} />
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quality</span>
                <span className={`text-lg font-black ${qualityColor}`}>{qualityScore}%</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-0.5">
                <div className={`h-full rounded-full transition-all duration-500 ${qualityBg}`} style={{ width: `${qualityScore}%` }} />
              </div>
            </div>
          </div>
          <button type="button" onClick={handleSaveDraft} disabled={draftSaving} className="flex items-center gap-2 px-5 py-2.5 border-2 border-orange-200 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />{draftSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const comp = tabCompletion[tab.id];
            const isComplete = comp.complete && comp.total > 0;
            const isPartial = comp.filled > 0 && !comp.complete;
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2.5 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-[3px] transition-all relative flex-1 justify-center ${isActive ? 'border-orange-500 text-orange-700 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {isPartial && <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-amber-500" /></div>}
                {!isComplete && !isPartial && comp.total > 0 && <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-slate-300" /></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 animate-in fade-in duration-200">

        {/* ═══════════════ TAB 1: Item Details ═══════════════ */}
        {activeTab === 'details' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={UtensilsCrossed} title="Basic Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                <div className="lg:col-span-2">
                  <Field label="Dish Name" name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('name')} placeholder="e.g. Chicken Biryani, Paneer Tikka" />
                </div>
                <Field label="Preparation Time (min)" name="prepTime" value={formData.prepTime} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('prepTime')} type="number" placeholder="e.g. 20" icon={<Clock className="w-4 h-4 text-slate-400" />} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <Field label="Short Description" name="shortDesc" value={formData.shortDesc} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Aromatic basmati rice with spiced chicken" />
                <Field label="Serving Size" name="servingSize" value={formData.servingSize} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 350g, 250ml, 1 plate" />
              </div>
              <div className="mt-5">
                <FieldTextarea label="Full Description" name="longDesc" value={formData.longDesc} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="Detailed description including cooking style, key ingredients, and what makes it special..." />
              </div>
            </section>

            <section>
              <SectionHeader icon={Tag} title="Category & Cuisine" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <FieldSelect label="Menu Category" name="category" value={formData.category} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('category')} options={['Starters', 'Soups', 'Salads', 'Main Course', 'Biryani & Rice', 'Bread & Roti', 'Pizza', 'Pasta', 'Burgers', 'Rolls & Wraps', 'Chinese', 'South Indian', 'Desserts', 'Beverages', 'Shakes & Smoothies', 'Ice Cream', 'Combo Meals', 'Kids Menu', 'Breakfast', 'Snacks']} />
                <FieldSelect label="Sub-category" name="subcategory" value={formData.subcategory} onChange={handleChange} onBlur={handleBlur} options={['Appetizer', 'Tandoori', 'Fried', 'Grilled', 'Curry', 'Dry', 'Gravy', 'Baked', 'Steamed', 'Chilled']} />
                <FieldSelect label="Cuisine" name="cuisine" value={formData.cuisine} onChange={handleChange} onBlur={handleBlur} options={['North Indian', 'South Indian', 'Mughlai', 'Chinese', 'Indo-Chinese', 'Continental', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American', 'Mediterranean', 'Street Food', 'Bakery', 'Other']} />
              </div>
              <div className="mt-5">
                <Field label="Serves (people)" name="servesCount" value={formData.servesCount} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="1" />
              </div>
            </section>

            <section>
              <SectionHeader icon={Leaf} title="Food Type & Spice Level" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <SegmentedControl label="Food Type" value={formData.foodType} options={['Veg', 'Non-Veg', 'Egg']} onChange={(v) => setFormData(prev => ({ ...prev, foodType: v }))} required invalid={isFieldInvalid('foodType')} colors={{ 'Veg': 'bg-emerald-600', 'Non-Veg': 'bg-red-600', 'Egg': 'bg-amber-600' }} />
                <SegmentedControl label="Spice Level" value={formData.spiceLevel} options={['Mild', 'Medium', 'Hot', 'Extra Hot']} onChange={(v) => setFormData(prev => ({ ...prev, spiceLevel: v }))} colors={{ 'Mild': 'bg-green-500', 'Medium': 'bg-yellow-500', 'Hot': 'bg-orange-600', 'Extra Hot': 'bg-red-600' }} />
              </div>
            </section>

            <section>
              <SectionHeader icon={Star} title="Item Badges" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ToggleRow label="Chef's Special" description="Highlight as chef's recommendation" checked={formData.isChefSpecial} onToggle={() => handleToggle('isChefSpecial')} icon={<ChefHat className="w-4 h-4 text-orange-500" />} />
                <ToggleRow label="Bestseller" description="Mark as top-selling item" checked={formData.isBestseller} onToggle={() => handleToggle('isBestseller')} icon={<Star className="w-4 h-4 text-amber-500" />} />
                <ToggleRow label="New Item" description="Show 'NEW' badge on listing" checked={formData.isNewItem} onToggle={() => handleToggle('isNewItem')} icon={<Zap className="w-4 h-4 text-blue-500" />} />
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ TAB 2: Images ═══════════════ */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <SectionHeader icon={Image} title="Dish Photos" />
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-orange-800 mb-1">Photo Guidelines (Swiggy/Zomato Standards)</p>
                <ul className="text-orange-700 space-y-0.5 text-xs leading-relaxed">
                  <li>• Use <b>natural lighting</b> — avoid flash and artificial shadows</li>
                  <li>• Show the <b>actual dish</b> as served to customer (no stock photos)</li>
                  <li>• <b>Top-down or 45° angle</b> shots work best</li>
                  <li>• Minimum resolution: <b>800 × 800 px</b>, square or landscape</li>
                  <li>• First image is the <b>main listing photo</b> seen by customers</li>
                </ul>
              </div>
            </div>
            <button type="button" onClick={addImage} disabled={formData.images.length >= 5} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 hover:border-orange-300 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
              <Upload className="w-10 h-10 text-slate-300 mx-auto group-hover:text-orange-400 transition-colors" />
              <p className="text-sm font-bold text-slate-500 mt-3 group-hover:text-orange-600">Upload dish photos</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB · Max 5 photos · {formData.images.length}/5 uploaded</p>
            </button>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {formData.images.map((_, i) => (
                  <div key={i} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center bg-slate-50 group ${i === 0 ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                    <div className="flex flex-col items-center gap-1">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <Image className="w-6 h-6 text-slate-300" />
                    </div>
                    {i === 0 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">Main</span>}
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TAB 3: Pricing ═══════════════ */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={DollarSign} title="Price & Charges" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                <FieldCurrency label="Base Price" name="basePrice" value={formData.basePrice} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('basePrice')} />
                <FieldCurrency label="Packaging Charge" name="packagingCharge" value={formData.packagingCharge} onChange={handleChange} onBlur={handleBlur} />
                <FieldSelect label="GST Rate" name="taxRate" value={formData.taxRate} onChange={handleChange} onBlur={handleBlur} options={[
                  { value: '5', label: '5% (Food & Beverages)' },
                  { value: '12', label: '12% (AC Dining)' },
                  { value: '18', label: '18% (Alcohol / Premium)' },
                ]} />
                <Field label="Discount %" name="discountPercent" value={formData.discountPercent} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 10" icon={<BadgePercent className="w-4 h-4 text-slate-400" />} />
              </div>

              {/* Price preview */}
              {formData.basePrice && (
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <DollarSign className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-700">
                      Customer pays: {(
                        parseFloat(formData.basePrice) +
                        (formData.packagingCharge ? parseFloat(formData.packagingCharge) : 0) +
                        (formData.gstInclusive ? 0 : parseFloat(formData.basePrice) * parseFloat(formData.taxRate) / 100) -
                        (formData.discountPercent ? parseFloat(formData.basePrice) * parseFloat(formData.discountPercent) / 100 : 0)
                      ).toFixed(0)}
                    </span>
                    <span className="text-xs text-orange-600">(incl. packaging{formData.gstInclusive ? '' : ' + GST'}{formData.discountPercent ? ' − discount' : ''})</span>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <ToggleRow label="Price is GST-inclusive" description="Base price already includes GST" checked={formData.gstInclusive} onToggle={() => handleToggle('gstInclusive')} />
              </div>
            </section>

            <section>
              <SectionHeader icon={Package} title="Availability Channels" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ToggleRow label="Delivery" description="Available for online delivery orders" checked={formData.availableForDelivery} onToggle={() => handleToggle('availableForDelivery')} icon={<Flame className="w-4 h-4 text-orange-500" />} />
                <ToggleRow label="Dine-in" description="Available for dine-in customers" checked={formData.availableForDineIn} onToggle={() => handleToggle('availableForDineIn')} icon={<UtensilsCrossed className="w-4 h-4 text-blue-500" />} />
                <ToggleRow label="Takeaway" description="Available for pickup / takeaway" checked={formData.availableForTakeaway} onToggle={() => handleToggle('availableForTakeaway')} icon={<Package className="w-4 h-4 text-emerald-500" />} />
              </div>
            </section>

            <section>
              <SectionHeader icon={Clock} title="Serving Hours" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Field label="Available From" name="availableFrom" value={formData.availableFrom} onChange={handleChange} onBlur={handleBlur} type="time" />
                <Field label="Available To" name="availableTo" value={formData.availableTo} onChange={handleChange} onBlur={handleBlur} type="time" />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${formData.availableDays.includes(day) ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ TAB 4: Customization ═══════════════ */}
        {activeTab === 'customization' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <SectionHeader icon={Sparkles} title="Size / Portion Variants" />
                <button type="button" onClick={addVariant} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-200">
                  <Plus className="w-3.5 h-3.5" />Add Variant
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Define different sizes or portions (e.g. Half, Full, Family). Each variant can have its own price.</p>
              {formData.variants.length === 0 && (
                <div className="mt-4 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <Scale className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-400 mt-2">No variants added yet</p>
                  <button type="button" onClick={addVariant} className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-800">+ Add your first variant</button>
                </div>
              )}
              {formData.variants.length > 0 && (
                <div className="space-y-3 mt-4">
                  {formData.variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="text-xs font-bold text-slate-400 w-6">{i + 1}.</span>
                      <input type="text" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} placeholder="e.g. Half, Full, Family" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-2 text-sm font-medium text-slate-400"></span>
                        <input type="number" value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-lg pl-12 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                      </div>
                      <button type="button" onClick={() => removeVariant(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <SectionHeader icon={Plus} title="Add-ons / Extras" />
                <button type="button" onClick={addAddon} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-200">
                  <Plus className="w-3.5 h-3.5" />Add Addon
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Extra toppings, sides, or upgrades customers can add (e.g. Extra Cheese, Raita, Cold Drink).</p>
              {formData.addons.length === 0 && (
                <div className="mt-4 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <Plus className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-400 mt-2">No add-ons yet</p>
                  <button type="button" onClick={addAddon} className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-800">+ Add your first add-on</button>
                </div>
              )}
              {formData.addons.length > 0 && (
                <div className="space-y-3 mt-4">
                  {formData.addons.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="text-xs font-bold text-slate-400 w-6">{i + 1}.</span>
                      <input type="text" value={a.name} onChange={(e) => updateAddon(i, 'name', e.target.value)} placeholder="e.g. Extra Cheese, Raita, Gulab Jamun" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-2 text-sm font-medium text-slate-400"></span>
                        <input type="number" value={a.price} onChange={(e) => updateAddon(i, 'price', e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-lg pl-12 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                      </div>
                      <button type="button" onClick={() => removeAddon(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════ TAB 5: Nutrition & Info ═══════════════ */}
        {activeTab === 'nutrition' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={Heart} title="Nutrition Information (per serving)" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mt-4">
                <Field label="Calories (kcal)" name="calories" value={formData.calories} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 450" />
                <Field label="Protein (g)" name="protein" value={formData.protein} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 25" />
                <Field label="Carbs (g)" name="carbs" value={formData.carbs} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 55" />
                <Field label="Fat (g)" name="fat" value={formData.fat} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 12" />
                <Field label="Fiber (g)" name="fiber" value={formData.fiber} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 3" />
              </div>
            </section>

            <section>
              <SectionHeader icon={Wheat} title="Ingredients & Allergens" />
              <div className="space-y-5 mt-4">
                <FieldTextarea label="Key Ingredients" name="ingredients" value={formData.ingredients} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="e.g. Basmati rice, Chicken (bone-in), Yogurt, Onions, Biryani masala, Saffron, Mint, Ghee..." />
                <FieldTextarea label="Allergen Information" name="allergens" value={formData.allergens} onChange={handleChange} onBlur={handleBlur} rows={2} placeholder="e.g. Contains Dairy, Nuts, Gluten. May contain traces of Shellfish." />
              </div>
            </section>

            <section>
              <SectionHeader icon={Shield} title="Dietary Labels & Compliance" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ToggleRow label="Jain-Friendly" description="No onion, garlic, root vegetables" checked={formData.isJainFriendly} onToggle={() => handleToggle('isJainFriendly')} icon={<Leaf className="w-4 h-4 text-emerald-500" />} />
                <ToggleRow label="Gluten-Free" description="Contains no gluten ingredients" checked={formData.isGlutenFree} onToggle={() => handleToggle('isGlutenFree')} icon={<Wheat className="w-4 h-4 text-amber-500" />} />
                <ToggleRow label="Nut-Free" description="Safe for nut allergies" checked={formData.isNutFree} onToggle={() => handleToggle('isNutFree')} icon={<Heart className="w-4 h-4 text-red-400" />} />
              </div>
              <div className="mt-5">
                <Field label="FSSAI License Number" name="fssaiLicense" value={formData.fssaiLicense} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 10020021000123 (required for food aggregator platforms)" />
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ TAB 6: Review ═══════════════ */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Completion checklist */}
            <div className={`p-5 rounded-xl border ${canPublish ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                {canPublish ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-amber-500" />}
                <span className={`text-lg font-black ${canPublish ? 'text-emerald-700' : 'text-amber-700'}`}>{canPublish ? 'Ready to Publish!' : 'Complete required sections'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TABS.filter(t => t.id !== 'review').map(tab => {
                  const comp = tabCompletion[tab.id];
                  const ok = tab.id === 'images' ? formData.images.length > 0 : comp.complete;
                  return (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className="flex items-center gap-2 text-sm text-left hover:underline">
                      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                      <span className={ok ? 'text-slate-700 font-medium' : 'text-slate-400'}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality Score */}
            <div className="flex items-center justify-center gap-6 p-6 bg-white border border-slate-200 rounded-xl">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={qualityScore >= 80 ? '#22c55e' : qualityScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${qualityScore} ${100 - qualityScore}`} strokeLinecap="round" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-black ${qualityColor}`}>{qualityScore}</span>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Menu Item Quality: <span className={qualityColor}>{qualityScore >= 80 ? 'Excellent' : qualityScore >= 50 ? 'Good' : 'Needs Work'}</span></p>
                <p className="text-sm text-slate-500 mt-0.5">Add photos, nutrition info, and variants to boost your score.</p>
              </div>
            </div>

            {/* Review cards */}
            <ReviewCard title="Item Details" tab="details" setActiveTab={setActiveTab} rows={[
              ['Dish Name', formData.name], ['Category', `${formData.category}${formData.subcategory ? ` > ${formData.subcategory}` : ''}`],
              ['Cuisine', formData.cuisine || '—'], ['Food Type', formData.foodType],
              ['Spice Level', formData.spiceLevel], ['Prep Time', formData.prepTime ? `${formData.prepTime} min` : '—'],
              ['Serves', formData.servesCount || '1'], ['Badges', [formData.isChefSpecial && "Chef's Special", formData.isBestseller && 'Bestseller', formData.isNewItem && 'New'].filter(Boolean).join(', ') || '—'],
            ]} />
            <ReviewCard title="Images" tab="images" setActiveTab={setActiveTab} rows={[
              ['Photos', `${formData.images.length} uploaded`],
            ]} />
            <ReviewCard title="Pricing" tab="pricing" setActiveTab={setActiveTab} rows={[
              ['Base Price', formData.basePrice ? `${formData.basePrice}` : '—'],
              ['Packaging', formData.packagingCharge ? `${formData.packagingCharge}` : '—'],
              ['GST', `${formData.taxRate}%${formData.gstInclusive ? ' (inclusive)' : ''}`],
              ['Discount', formData.discountPercent ? `${formData.discountPercent}%` : '—'],
              ['Channels', [formData.availableForDelivery && 'Delivery', formData.availableForDineIn && 'Dine-in', formData.availableForTakeaway && 'Takeaway'].filter(Boolean).join(', ')],
              ['Hours', `${formData.availableFrom} – ${formData.availableTo}`],
            ]} />
            <ReviewCard title="Customization" tab="customization" setActiveTab={setActiveTab} rows={[
              ['Variants', formData.variants.length > 0 ? formData.variants.map(v => `${v.name} (${v.price})`).join(', ') : 'None'],
              ['Add-ons', formData.addons.length > 0 ? formData.addons.map(a => `${a.name} (+${a.price})`).join(', ') : 'None'],
            ]} />
            <ReviewCard title="Nutrition & Info" tab="nutrition" setActiveTab={setActiveTab} rows={[
              ['Calories', formData.calories ? `${formData.calories} kcal` : '—'],
              ['Macros', formData.protein ? `P: ${formData.protein}g · C: ${formData.carbs}g · F: ${formData.fat}g` : '—'],
              ['Allergens', formData.allergens || '—'],
              ['Dietary', [formData.isJainFriendly && 'Jain', formData.isGlutenFree && 'GF', formData.isNutFree && 'Nut-Free'].filter(Boolean).join(', ') || '—'],
              ['FSSAI', formData.fssaiLicense || '—'],
            ]} />

            {/* Publish */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">{canPublish ? 'Your menu item will be visible to customers after publishing.' : 'Complete required sections first.'}</p>
              <button type="button" onClick={handlePublish} disabled={!canPublish || saving} className="flex items-center gap-2 bg-orange-500 text-white px-10 py-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-5 h-5" />{saving ? 'Publishing...' : 'Publish Item'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100"><Icon className="w-4.5 h-4.5 text-orange-500" />{title}</h3>;
}

interface FieldProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean; invalid?: boolean; placeholder?: string;
  type?: string; icon?: React.ReactNode;
}

function Field({ label, name, value, onChange, onBlur, required, invalid, placeholder, type = 'text', icon }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5">{icon}</span>}
        <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder}
          className={`w-full border rounded-lg py-2.5 text-sm outline-none transition-colors ${icon ? 'pl-10 pr-4' : 'px-4'} ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`} />
      </div>
      {invalid && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{label} is required</p>}
    </div>
  );
}

function FieldCurrency({ label, name, value, onChange, onBlur, required, invalid }: Omit<FieldProps, 'type'>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400"></span>
        <input type="number" name={name} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder="0"
          className={`w-full border rounded-lg pl-12 pr-4 py-2.5 text-sm outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`} />
      </div>
      {invalid && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{label} is required</p>}
    </div>
  );
}

interface FieldTextareaProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  required?: boolean; invalid?: boolean; placeholder?: string; rows?: number;
}

function FieldTextarea({ label, name, value, onChange, onBlur, required, invalid, placeholder, rows = 4 }: FieldTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <textarea name={name} value={value} onChange={onChange} onBlur={onBlur} required={required} rows={rows} placeholder={placeholder}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm resize-none outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`} />
      {invalid && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{label} is required</p>}
    </div>
  );
}

interface FieldSelectProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  required?: boolean; invalid?: boolean;
  options: (string | { value: string; label: string })[];
}

function FieldSelect({ label, name, value, onChange, onBlur, required, invalid, options }: FieldSelectProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <select name={name} value={value} onChange={onChange} onBlur={onBlur} required={required}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`}>
        <option value="">Select...</option>
        {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {invalid && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{label} is required</p>}
    </div>
  );
}

function SegmentedControl({ label, value, options, onChange, colors, required, invalid }: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void;
  colors?: Record<string, string>;
  required?: boolean; invalid?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className={`flex bg-slate-100 rounded-lg p-1 ${invalid ? 'ring-2 ring-red-400' : ''}`}>
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${value === opt ? `${colors?.[opt] || 'bg-orange-500'} text-white shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onToggle, icon }: {
  label: string; description: string; checked: boolean; onToggle: () => void; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <span className="block text-sm font-bold text-slate-700">{label}</span>
          <span className="block text-xs text-slate-500">{description}</span>
        </div>
      </div>
      <button type="button" onClick={onToggle} className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none shrink-0 ${checked ? 'bg-orange-500' : 'bg-slate-200'}`}>
        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function ReviewCard({ title, tab, setActiveTab, rows }: {
  title: string; tab: TabId; setActiveTab: (t: TabId) => void; rows: [string, string][];
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <button type="button" onClick={() => setActiveTab(tab)} className="text-xs font-bold text-orange-600 hover:text-orange-800 hover:underline">Edit →</button>
      </div>
      <div className="px-5 py-3 divide-y divide-slate-100">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-start py-2.5 text-sm">
            <span className="w-40 text-slate-400 font-medium shrink-0">{label}</span>
            <span className={`font-semibold ${value && value !== '—' && value !== 'None' ? 'text-slate-800' : 'text-slate-300'}`}>{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
