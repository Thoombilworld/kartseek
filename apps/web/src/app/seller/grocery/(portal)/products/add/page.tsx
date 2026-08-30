'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import {
  PlusCircle, Save, ArrowLeft, CheckCircle2, AlertCircle,
  Package, Image, DollarSign, Truck, Shield, Eye,
  Upload, Gauge, X, GripVertical, Leaf, Snowflake,
  Info, Clock, Barcode, Apple, Tag, Scale,
  ThermometerSun, Heart, ShieldCheck,
} from 'lucide-react';
import { useGroceryCatalogTree } from '@/lib/hooks/use-grocery-catalog-tree';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'info' | 'images' | 'pricing' | 'storage' | 'compliance' | 'review';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  requiredFields: (keyof FormData)[];
}

interface FormData {
  // Product Info
  name: string;
  brand: string;
  barcode: string;
  shortDesc: string;
  longDesc: string;
  department: string;
  category: string;
  subcategory: string;
  unit: string;
  packSize: string;
  variantLabel: string;
  isOrganic: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  dietaryType: string;
  // Images
  images: string[];
  // Pricing & Inventory
  price: string;
  mrp: string;
  costPrice: string;
  taxRate: string;
  hsnCode: string;
  stock: string;
  lowStockThreshold: string;
  minOrderQty: string;
  maxOrderQty: string;
  bulkDiscount: boolean;
  // Storage & Shelf Life
  isPerishable: boolean;
  storageType: string;
  shelfLife: string;
  shelfLifeUnit: string;
  mfgDate: string;
  expiryDate: string;
  batchNumber: string;
  weight: string;
  freeDelivery: boolean;
  deliverySlot: string;
  // Compliance & Labeling
  fssaiLicense: string;
  fssaiExpiry: string;
  ingredients: string;
  allergens: string;
  nutritionInfo: string;
  countryOfOrigin: string;
  manufacturer: string;
  customerCareContact: string;
  // Flags
  isReturnable: boolean;
  returnWindow: string;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { id: 'info', label: 'Product Info', icon: Package, requiredFields: ['name', 'department', 'category', 'unit', 'packSize'] },
  { id: 'images', label: 'Images', icon: Image, requiredFields: [] },
  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign, requiredFields: ['price', 'hsnCode', 'stock'] },
  { id: 'storage', label: 'Storage & Delivery', icon: Truck, requiredFields: ['storageType', 'shelfLife'] },
  { id: 'compliance', label: 'Compliance', icon: Shield, requiredFields: ['fssaiLicense', 'countryOfOrigin'] },
  { id: 'review', label: 'Review', icon: Eye, requiredFields: [] },
];

// ─── HSN Code Mapping (Category → HSN + suggested GST rate) ───────────────────

const HSN_MAP: Record<string, { hsn: string; gst: string; label: string }> = {
  'Milk':               { hsn: '0401', gst: '0',  label: 'Fresh milk (0401) — 0% GST' },
  'Cheese':             { hsn: '0406', gst: '12', label: 'Cheese (0406) — 12% GST' },
  'Yogurt':             { hsn: '0403', gst: '5',  label: 'Curd / Yogurt (0403) — 5% GST' },
  'Butter & Ghee':      { hsn: '0405', gst: '12', label: 'Butter / Ghee (0405) — 12% GST' },
  'Eggs':               { hsn: '0407', gst: '0',  label: 'Fresh eggs (0407) — 0% GST' },
  'Bread':              { hsn: '1905', gst: '0',  label: 'Bread (1905) — 0% GST' },
  'Fruits':             { hsn: '0803', gst: '0',  label: 'Fresh fruits (0803) — 0% GST' },
  'Vegetables':         { hsn: '0709', gst: '0',  label: 'Fresh vegetables (0709) — 0% GST' },
  'Rice & Grains':      { hsn: '1006', gst: '5',  label: 'Rice & grains (1006) — 5% GST (packaged)' },
  'Oil & Cooking':      { hsn: '1508', gst: '5',  label: 'Cooking oil (1508) — 5% GST' },
  'Spices':             { hsn: '0910', gst: '5',  label: 'Spices (0910) — 5% GST' },
  'Tea & Coffee':       { hsn: '0902', gst: '5',  label: 'Tea & coffee (0902) — 5% GST' },
  'Juice':              { hsn: '2009', gst: '12', label: 'Fruit juice (2009) — 12% GST' },
  'Water':              { hsn: '2201', gst: '18', label: 'Mineral / packaged water (2201) — 18% GST' },
  'Soft Drinks':        { hsn: '2202', gst: '28', label: 'Aerated drinks (2202) — 28% GST' },
};

// ─── Initial form data ────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  name: '', brand: '', barcode: '', shortDesc: '', longDesc: '',
  department: '', category: '', subcategory: '',
  unit: '', packSize: '', variantLabel: '',
  isOrganic: false, isVegan: false, isGlutenFree: false, dietaryType: 'Non-Veg',
  images: [],
  price: '', mrp: '', costPrice: '', taxRate: '', hsnCode: '', stock: '',
  lowStockThreshold: '10', minOrderQty: '1', maxOrderQty: '10',
  bulkDiscount: false,
  isPerishable: false, storageType: '', shelfLife: '', shelfLifeUnit: 'Days',
  mfgDate: '', expiryDate: '', batchNumber: '',
  weight: '', freeDelivery: false, deliverySlot: '',
  fssaiLicense: '', fssaiExpiry: '',
  ingredients: '', allergens: '', nutritionInfo: '',
  countryOfOrigin: '', manufacturer: '', customerCareContact: '',
  isReturnable: false, returnWindow: '0',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AddGroceryProductPage() {
  return <StoreGate>{(store) => <AddProductForm storeId={store.id} />}</StoreGate>;
}

function AddProductForm({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  // Departments, categories and sub-categories all come from one tree, so the
  // three selects cannot disagree with each other or with the catalogue.
  const catalog = useGroceryCatalogTree();
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    // HSN and GST follow the category. Applied here, in the same update as the
    // category itself, rather than in an effect watching `formData.category`:
    // as an effect it landed a render later, so submitting immediately after
    // picking a category could post the previous category's tax rate — and
    // re-picking a category the seller had already chosen did not restore the
    // suggestion, because the dependency had not changed.
    // Cascading selects: changing a rung invalidates everything under it, so
    // the form can never post "Beverages > Leafy Greens" — a pair the API now
    // rejects outright.
    if (name === 'department') {
      setFormData((prev) => ({ ...prev, department: value, category: '', subcategory: '' }));
      return;
    }
    if (name === 'category') {
      setFormData((prev) => ({ ...prev, category: value, subcategory: '' }));
      return;
    }

    const mapping = name === 'category' ? HSN_MAP[value] : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(mapping ? { hsnCode: mapping.hsn, taxRate: mapping.gst } : {}),
    }));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouchedFields(prev => new Set(prev).add(e.target.name));
  }, []);

  const handleToggle = useCallback((name: keyof FormData) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

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
        const val = formData[f];
        return val !== '' && val !== undefined && val !== null;
      }).length;
      result[tab.id] = { filled, total, complete: filled === total };
    }
    return result;
  }, [formData]);

  // ── Quality score ────────────────────────────────────────────────────────

  const qualityScore = useMemo(() => {
    let score = 0;
    // Required fields (45 points)
    const allReq = TABS.flatMap(t => t.requiredFields);
    const filledReq = allReq.filter(f => { const v = formData[f]; return v !== '' && v !== undefined && v !== null; });
    score += (filledReq.length / Math.max(allReq.length, 1)) * 45;
    // Images (20 points)
    score += Math.min(formData.images.length / 3, 1) * 20;
    // Enrichment (35 points)
    const enrich: (keyof FormData)[] = [
      'brand', 'barcode', 'shortDesc', 'longDesc', 'variantLabel',
      'mrp', 'costPrice', 'taxRate', 'ingredients', 'allergens',
      'nutritionInfo', 'manufacturer', 'batchNumber', 'mfgDate', 'expiryDate',
    ];
    const filledEnrich = enrich.filter(f => { const v = formData[f]; return v !== '' && v !== undefined && v !== null; });
    score += (filledEnrich.length / enrich.length) * 35;
    return Math.round(Math.min(score, 100));
  }, [formData]);

  const qualityColor = qualityScore >= 80 ? 'text-emerald-600' : qualityScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const qualityBg = qualityScore >= 80 ? 'bg-emerald-500' : qualityScore >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const qualityLabel = qualityScore >= 80 ? 'Excellent' : qualityScore >= 50 ? 'Good' : 'Needs Work';

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Publish the product.
   *
   * The old handler was `await new Promise(r => setTimeout(r, 1500))` followed by a
   * redirect — a seller filled in every one of the six tabs, watched a spinner, was
   * returned to a Products list, and nothing had been created. Save Draft was the
   * same trick with an 800ms timer, so it is gone: the API has no draft state, and
   * a button that pretends to save one is worse than no button.
   *
   * Only the fields `grocery_items` actually has are sent; the rest of the form
   * (HSN, FSSAI, batch, nutrition) has no column yet and is carried in
   * `description` rather than dropped silently.
   */
  const canPublish = tabCompletion.info.complete && tabCompletion.pricing.complete
    && tabCompletion.storage.complete && tabCompletion.compliance.complete;

  const handlePublish = async () => {
    if (!canPublish || !storeId) return;
    setSaving(true);
    setPublishError(null);
    try {
      const compliance = [
        formData.ingredients && `Ingredients: ${formData.ingredients}`,
        formData.allergens && `Allergens: ${formData.allergens}`,
        formData.nutritionInfo && `Nutrition: ${formData.nutritionInfo}`,
        formData.countryOfOrigin && `Origin: ${formData.countryOfOrigin}`,
        formData.manufacturer && `Manufacturer: ${formData.manufacturer}`,
        formData.fssaiLicense && `FSSAI: ${formData.fssaiLicense}`,
        formData.storageType && `Storage: ${formData.storageType}`,
        formData.shelfLife && `Shelf life: ${formData.shelfLife} ${formData.shelfLifeUnit}`,
      ].filter(Boolean).join('\n');

      await groceryApi.createProduct(storeId, {
        name: formData.name.trim(),
        description: [formData.longDesc || formData.shortDesc, compliance].filter(Boolean).join('\n\n'),
        // The category id (a slug like `beverages`), never the department — a
        // department is not a place a product can live, and the API says so.
        category: formData.category,
        subCategory: formData.subcategory || undefined,
        brand: formData.brand || undefined,
        barcode: formData.barcode || undefined,
        imageUrl: formData.images[0] || undefined,
        weightVariants: [{
          weight: [formData.packSize, formData.unit].filter(Boolean).join(' ') || '1 unit',
          price: Number(formData.price) || 0,
          mrp: Number(formData.mrp) || Number(formData.price) || 0,
          stock: Number(formData.stock) || 0,
        }],
      } as any);
      router.push('/seller/grocery/products');
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Could not publish this product. Please try again.');
      setSaving(false);
    }
  };

  /**
   * Images are not uploaded anywhere yet — there is no upload endpoint for grocery
   * — so this takes a URL rather than minting `grocery_img_1`, a string that was
   * never a usable image reference and would have rendered as a broken tile.
   */
  const addImage = () => {
    if (formData.images.length >= 6) return;
    const url = window.prompt('Paste an image URL for this product');
    if (!url?.trim()) return;
    setFormData(prev => ({ ...prev, images: [...prev.images, url.trim()] }));
  };
  const removeImage = (idx: number) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) })); };

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="./" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-7 h-7 text-emerald-600" />Add Grocery Product
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Fill in all sections to list your grocery product</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Quality Score */}
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
          {/* Save Draft is gone: `grocery_items` has no draft state, so the button
              could only ever have run a timer and claimed success — which is what
              it did. Publishing is the one action that stores anything. */}
        </div>
      </div>

      {publishError && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{publishError}</p>
        </div>
      )}

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
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2.5 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-[3px] transition-all relative flex-1 justify-center ${isActive ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: Product Info                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <div className="space-y-8">
            {/* Basic Details */}
            <section>
              <SectionHeader icon={Apple} title="Basic Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                <div className="lg:col-span-2">
                  <Field label="Product Name" name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('name')} placeholder="e.g. Fresh Whole Milk 500ml" />
                </div>
                <Field label="Brand" name="brand" value={formData.brand} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Brookside" />
                <Field label="Barcode / EAN" name="barcode" value={formData.barcode} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 6161102003412" icon={<Barcode className="w-4 h-4 text-slate-400" />} />
                <Field label="Pack Size / Quantity" name="packSize" value={formData.packSize} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('packSize')} placeholder="e.g. 500ml, 1kg, 6 pack" />
                <Field label="Variant Label" name="variantLabel" value={formData.variantLabel} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Low Fat, Sugar Free" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <Field label="Short Description" name="shortDesc" value={formData.shortDesc} onChange={handleChange} onBlur={handleBlur} placeholder="Brief summary for search results" />
                <div className="md:col-span-1">
                  <FieldTextarea label="Full Description" name="longDesc" value={formData.longDesc} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="Complete product details, usage, and storage info..." />
                </div>
              </div>
            </section>

            {/* Classification */}
            <section>
              <SectionHeader icon={Tag} title="Category & Classification" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <FieldSelect label="Department" name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('department')}
                  options={catalog.departments.map((d) => ({ value: d.id, label: `${d.emoji ?? ''} ${d.name}`.trim() }))} />
                <FieldSelect label="Category" name="category" value={formData.category} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('category')}
                  options={catalog.categoriesOf(formData.department).map((c) => ({ value: c.id, label: c.name }))} />
                {/* Sub-category values are the display names products already store,
                    so the option value is the name rather than the node id. */}
                <FieldSelect label="Subcategory" name="subcategory" value={formData.subcategory} onChange={handleChange} onBlur={handleBlur}
                  options={catalog.subcategoriesOf(formData.category).map((sc) => ({ value: sc.name, label: sc.name }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <FieldSelect label="Selling Unit" name="unit" value={formData.unit} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('unit')} options={['Piece', 'Kg', 'Gram', 'Litre', 'ml', 'Pack', 'Dozen', 'Bundle', 'Box', 'Bottle', 'Can', 'Pouch', 'Sachet']} />
                <SegmentedControl label="Dietary Type" value={formData.dietaryType} options={['Veg', 'Non-Veg', 'Egg']} onChange={(v) => setFormData(prev => ({ ...prev, dietaryType: v }))} colors={{ 'Veg': 'bg-emerald-600', 'Non-Veg': 'bg-red-600', 'Egg': 'bg-amber-600' }} />
              </div>
            </section>

            {/* Diet & Tags */}
            <section>
              <SectionHeader icon={Heart} title="Dietary Tags" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ToggleRow label="Organic" description="100% certified organic product" checked={formData.isOrganic} onToggle={() => handleToggle('isOrganic')} icon={<Leaf className="w-4 h-4 text-emerald-500" />} />
                <ToggleRow label="Vegan" description="Contains no animal products" checked={formData.isVegan} onToggle={() => handleToggle('isVegan')} icon={<Leaf className="w-4 h-4 text-green-500" />} />
                <ToggleRow label="Gluten-Free" description="No gluten ingredients" checked={formData.isGlutenFree} onToggle={() => handleToggle('isGlutenFree')} icon={<ShieldCheck className="w-4 h-4 text-blue-500" />} />
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: Images                                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <SectionHeader icon={Image} title="Product Images" />
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-emerald-800 mb-1">Image Guidelines for Grocery</p>
                <ul className="text-emerald-700 space-y-0.5 text-xs leading-relaxed">
                  <li>• White or light background recommended</li>
                  <li>• Show the <b>front label</b> clearly (ingredients, branding)</li>
                  <li>• Include a <b>back label</b> photo showing nutrition facts</li>
                  <li>• Minimum resolution: <b>800 × 800 px</b></li>
                  <li>• Upload at least <b>2 images</b> (front + back)</li>
                </ul>
              </div>
            </div>
            <button type="button" onClick={addImage} disabled={formData.images.length >= 6} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 hover:border-emerald-300 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
              <Upload className="w-10 h-10 text-slate-300 mx-auto group-hover:text-emerald-400 transition-colors" />
              <p className="text-sm font-bold text-slate-500 mt-3 group-hover:text-emerald-600">Click to upload product images</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB each · Max 6 images · {formData.images.length}/6 uploaded</p>
            </button>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {formData.images.map((_, i) => (
                  <div key={i} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center bg-slate-50 group ${i === 0 ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                    <div className="flex flex-col items-center gap-1">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <Image className="w-6 h-6 text-slate-300" />
                    </div>
                    {i === 0 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">Front</span>}
                    {i === 1 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black bg-slate-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">Back</span>}
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: Pricing & Stock                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={DollarSign} title="Pricing" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                <FieldCurrency label="Selling Price" name="price" value={formData.price} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('price')} />
                <FieldCurrency label="MRP (Max Retail Price)" name="mrp" value={formData.mrp} onChange={handleChange} onBlur={handleBlur} />
                <FieldCurrency label="Cost Price (Internal)" name="costPrice" value={formData.costPrice} onChange={handleChange} onBlur={handleBlur} />
                <FieldSelect label="Tax Rate" name="taxRate" value={formData.taxRate} onChange={handleChange} onBlur={handleBlur} options={[
                  { value: '0', label: '0% (Essential)' },
                  { value: '5', label: '5% (Packaged food)' },
                  { value: '12', label: '12%' },
                  { value: '18', label: '18%' },
                  { value: '28', label: '28% (Aerated drinks)' },
                ]} />
              </div>

              {/* HSN Code + Auto-suggest */}
              <div className="mt-5">
                <SectionHeader icon={Barcode} title="HSN / SAC Code" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <Field label="HSN Code" name="hsnCode" value={formData.hsnCode} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('hsnCode')} placeholder="e.g. 0401" icon={<Barcode className="w-4 h-4 text-slate-400" />} />
                  <div className="flex items-end">
                    {formData.category && HSN_MAP[formData.category] ? (
                      <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-700">Auto-suggested from category</p>
                            <p className="text-sm text-emerald-600 mt-0.5">{HSN_MAP[formData.category].label}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500">Select a product category to get an auto-suggested HSN code and GST rate.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">HSN code is mandatory for GST invoicing. Use the <a href="https://services.gst.gov.in/services/searchhsnsac" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-700">GST Portal HSN Finder</a> to verify your code.</p>
              </div>

              {/* Discount + Margin preview */}
              {formData.price && (formData.mrp || formData.costPrice) && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {formData.mrp && parseFloat(formData.mrp) > parseFloat(formData.price) && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{((1 - parseFloat(formData.price) / parseFloat(formData.mrp)) * 100).toFixed(1)}% off MRP</span>
                      <span className="text-xs text-emerald-600">— Save {(parseFloat(formData.mrp) - parseFloat(formData.price)).toLocaleString()}</span>
                    </div>
                  )}
                  {formData.costPrice && parseFloat(formData.price) > parseFloat(formData.costPrice) && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-blue-700">{((parseFloat(formData.price) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice) * 100).toFixed(1)}% margin</span>
                      <span className="text-xs text-blue-600">— {(parseFloat(formData.price) - parseFloat(formData.costPrice)).toLocaleString()} profit/unit</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <SectionHeader icon={Scale} title="Inventory & Limits" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                <Field label="Stock Quantity" name="stock" value={formData.stock} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('stock')} type="number" placeholder="0" />
                <Field label="Low Stock Alert" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="10" />
                <Field label="Min Order Qty" name="minOrderQty" value={formData.minOrderQty} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="1" />
                <Field label="Max Order Qty" name="maxOrderQty" value={formData.maxOrderQty} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="10" />
              </div>
              <div className="mt-4">
                <ToggleRow label="Enable Bulk Discount" description="Offer discounts on larger order quantities" checked={formData.bulkDiscount} onToggle={() => handleToggle('bulkDiscount')} />
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: Storage & Delivery                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'storage' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={ThermometerSun} title="Storage Requirements" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                <FieldSelect label="Storage Type" name="storageType" value={formData.storageType} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('storageType')} options={['Ambient / Room Temperature', 'Refrigerated (2–8°C)', 'Frozen (−18°C)', 'Cool & Dry Place', 'Keep Away from Sunlight']} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Field label="Shelf Life" name="shelfLife" value={formData.shelfLife} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('shelfLife')} type="number" placeholder="e.g. 7" />
                  </div>
                  <div className="w-28">
                    <FieldSelect label="Unit" name="shelfLifeUnit" value={formData.shelfLifeUnit} onChange={handleChange} onBlur={handleBlur} options={['Days', 'Weeks', 'Months', 'Years']} />
                  </div>
                </div>
                <Field label="Batch Number" name="batchNumber" value={formData.batchNumber} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. BATCH-2024-001" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <Field label="Manufacturing Date" name="mfgDate" value={formData.mfgDate} onChange={handleChange} onBlur={handleBlur} type="date" />
                <Field label="Expiry / Best Before Date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} onBlur={handleBlur} type="date" />
              </div>
              <div className="mt-4">
                <ToggleRow label="Perishable Product" description="Requires cold chain or special handling during delivery" checked={formData.isPerishable} onToggle={() => handleToggle('isPerishable')} icon={<Snowflake className="w-4 h-4 text-blue-500" />} />
              </div>
            </section>

            <section>
              <SectionHeader icon={Truck} title="Delivery & Weight" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <Field label="Product Weight" name="weight" value={formData.weight} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 500g, 1kg, 1L" />
                <FieldSelect label="Delivery Slot Preference" name="deliverySlot" value={formData.deliverySlot} onChange={handleChange} onBlur={handleBlur} options={['Any Slot', 'Morning (6am–10am)', 'Afternoon (12pm–4pm)', 'Evening (5pm–9pm)', 'Express (Under 30 min)']} />
                <div className="flex items-end">
                  <ToggleRow label="Free Delivery" description="Absorb delivery costs" checked={formData.freeDelivery} onToggle={() => handleToggle('freeDelivery')} />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: Compliance                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'compliance' && (
          <div className="space-y-8">
            <section>
              <SectionHeader icon={Shield} title="FSSAI & Regulatory" />
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">FSSAI license number is <b>mandatory</b> for selling food products in India. For other regions, provide applicable food safety certifications.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="FSSAI License Number" name="fssaiLicense" value={formData.fssaiLicense} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('fssaiLicense')} placeholder="e.g. 10020021000123" />
                <Field label="FSSAI License Expiry" name="fssaiExpiry" value={formData.fssaiExpiry} onChange={handleChange} onBlur={handleBlur} type="date" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <Field label="Country of Origin" name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('countryOfOrigin')} placeholder="e.g. India, India" />
                <Field label="Manufacturer / Packer" name="manufacturer" value={formData.manufacturer} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Brookside Dairy Ltd." />
              </div>
              <div className="mt-5">
                <Field label="Customer Care Contact" name="customerCareContact" value={formData.customerCareContact} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. support@brand.com or +91-XXX-XXXX" />
              </div>
            </section>

            <section>
              <SectionHeader icon={Apple} title="Ingredients & Nutrition" />
              <div className="space-y-5 mt-4">
                <FieldTextarea label="Ingredients List" name="ingredients" value={formData.ingredients} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="List all ingredients in descending order of weight. e.g. Whole Milk, Sugar, Stabilizer (E412)..." />
                <FieldTextarea label="Allergen Information" name="allergens" value={formData.allergens} onChange={handleChange} onBlur={handleBlur} rows={2} placeholder="e.g. Contains Milk, Soy. May contain traces of Nuts." />
                <FieldTextarea label="Nutritional Information (per serving)" name="nutritionInfo" value={formData.nutritionInfo} onChange={handleChange} onBlur={handleBlur} rows={4} placeholder={"Energy: 250 kcal\nProtein: 8g\nCarbohydrates: 12g\nFat: 3.5g\nSugar: 5g\nSodium: 120mg"} />
              </div>
            </section>

            <section>
              <ToggleRow label="Returnable / Replaceable" description="Allow customers to return or get a replacement for damaged/expired items" checked={formData.isReturnable} onToggle={() => handleToggle('isReturnable')} />
              {formData.isReturnable && (
                <div className="mt-4">
                  <Field label="Return Window (Days)" name="returnWindow" value={formData.returnWindow} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 2" />
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 6: Review                                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Completion checklist */}
            <div className={`p-5 rounded-xl border ${canPublish ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                {canPublish ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-amber-500" />}
                <span className={`text-lg font-black ${canPublish ? 'text-emerald-700' : 'text-amber-700'}`}>{canPublish ? 'Ready to Publish!' : 'Some sections need attention'}</span>
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
                <p className="text-lg font-bold text-slate-900">Listing Quality: <span className={qualityColor}>{qualityLabel}</span></p>
                <p className="text-sm text-slate-500 mt-0.5">Add images, ingredients, and nutrition info to improve your score.</p>
              </div>
            </div>

            {/* Review cards */}
            <ReviewCard title="Product Info" tab="info" setActiveTab={setActiveTab} rows={[
              ['Product Name', formData.name], ['Brand', formData.brand || '—'],
              ['Department', formData.department], ['Category', `${formData.category}${formData.subcategory ? ` > ${formData.subcategory}` : ''}`],
              ['Pack Size', formData.packSize || '—'], ['Unit', formData.unit || '—'],
              ['Dietary', formData.dietaryType], ['Tags', [formData.isOrganic && 'Organic', formData.isVegan && 'Vegan', formData.isGlutenFree && 'Gluten-Free'].filter(Boolean).join(', ') || '—'],
            ]} />
            <ReviewCard title="Images" tab="images" setActiveTab={setActiveTab} rows={[
              ['Images', `${formData.images.length} uploaded`],
            ]} />
            <ReviewCard title="Pricing & Stock" tab="pricing" setActiveTab={setActiveTab} rows={[
              ['Selling Price', formData.price ? `${formData.price}` : '—'],
              ['MRP', formData.mrp ? `${formData.mrp}` : '—'],
              ['HSN Code', formData.hsnCode || '—'],
              ['Tax Rate', formData.taxRate ? `${formData.taxRate}% GST` : '—'],
              ['Stock', formData.stock || '—'],
              ['Order Limits', `Min: ${formData.minOrderQty}, Max: ${formData.maxOrderQty}`],
            ]} />
            <ReviewCard title="Storage & Delivery" tab="storage" setActiveTab={setActiveTab} rows={[
              ['Storage', formData.storageType || '—'],
              ['Shelf Life', formData.shelfLife ? `${formData.shelfLife} ${formData.shelfLifeUnit}` : '—'],
              ['Perishable', formData.isPerishable ? 'Yes — Cold Chain' : 'No'],
              ['Expiry', formData.expiryDate || '—'],
              ['Delivery', formData.freeDelivery ? 'Free Delivery' : (formData.deliverySlot || 'Standard')],
            ]} />
            <ReviewCard title="Compliance" tab="compliance" setActiveTab={setActiveTab} rows={[
              ['FSSAI License', formData.fssaiLicense || '—'],
              ['Country of Origin', formData.countryOfOrigin || '—'],
              ['Ingredients', formData.ingredients ? 'Provided' : '—'],
              ['Allergens', formData.allergens || '—'],
              ['Returnable', formData.isReturnable ? `Yes (${formData.returnWindow} days)` : 'No'],
            ]} />

            {/* Publish */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">{canPublish ? 'All required sections are complete. Your product will go live after review.' : 'Please complete all required sections before publishing.'}</p>
              <button type="button" onClick={handlePublish} disabled={!canPublish || saving} className="flex items-center gap-2 bg-emerald-600 text-white px-10 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-5 h-5" />{saving ? 'Publishing...' : 'Publish Product'}
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
  return <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100"><Icon className="w-4.5 h-4.5 text-emerald-500" />{title}</h3>;
}

interface FieldProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean; invalid?: boolean; placeholder?: string;
  type?: string; step?: string; disabled?: boolean;
  icon?: React.ReactNode;
}

function Field({ label, name, value, onChange, onBlur, required, invalid, placeholder, type = 'text', step, disabled, icon }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5">{icon}</span>}
        <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} step={step} disabled={disabled}
          className={`w-full border rounded-lg py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50 ${icon ? 'pl-10 pr-4' : 'px-4'} ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}
        />
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
          className={`w-full border rounded-lg pl-12 pr-4 py-2.5 text-sm outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}
        />
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
        className={`w-full border rounded-lg px-4 py-2.5 text-sm resize-none outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}
      />
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
        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${invalid ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}>
        <option value="">Select...</option>
        {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {invalid && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{label} is required</p>}
    </div>
  );
}

function SegmentedControl({ label, value, options, onChange, colors }: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void;
  colors?: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div className="flex bg-slate-100 rounded-lg p-1">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${value === opt ? `${colors?.[opt] || 'bg-emerald-600'} text-white shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
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
      <button type="button" onClick={onToggle} className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none shrink-0 ${checked ? 'bg-emerald-600' : 'bg-slate-200'}`}>
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
        <button type="button" onClick={() => setActiveTab(tab)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline">Edit →</button>
      </div>
      <div className="px-5 py-3 divide-y divide-slate-100">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-start py-2.5 text-sm">
            <span className="w-40 text-slate-400 font-medium shrink-0">{label}</span>
            <span className={`font-semibold ${value && value !== '—' ? 'text-slate-800' : 'text-slate-300'}`}>{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
