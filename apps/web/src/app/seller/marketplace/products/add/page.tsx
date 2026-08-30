'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle, Save, ArrowLeft, CheckCircle2, AlertCircle,
  Package, Image, DollarSign, Truck, Shield, Eye,
  Upload, Video, Gauge, X, GripVertical, Star,
  Info,
} from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'info' | 'images' | 'pricing' | 'shipping' | 'compliance' | 'review';

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
  shortDesc: string;
  longDesc: string;
  department: string;
  category: string;
  subcategory: string;
  material: string;
  color: string;
  size: string;
  style: string;
  features: string;
  condition: string;
  listingType: string;
  // Images & Media
  images: string[];
  videoUrl: string;
  // Pricing & Offer
  price: string;
  msrp: string;
  taxPercentage: string;
  hsnCode: string;
  sku: string;
  bulkPricing: boolean;
  // Shipping & Inventory
  hasVariants: boolean;
  variantData: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  freeShipping: boolean;
  shippingClass: string;
  stock: string;
  lowStockThreshold: string;
  warrantyType: string;
  warrantyDuration: string;
  warrantyPolicy: string;
  returnable: boolean;
  returnWindow: string;
  // Compliance & SEO
  countryOfOrigin: string;
  manufacturer: string;
  certifications: string;
  warnings: string;
  metaTitle: string;
  metaDesc: string;
  keywords: string;
  slug: string;
  // Ads
  sponsored: boolean;
  adBudget: string;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { id: 'info', label: 'Product Info', icon: Package, requiredFields: ['name', 'brand', 'longDesc', 'department', 'category'] },
  { id: 'images', label: 'Images', icon: Image, requiredFields: [] },
  { id: 'pricing', label: 'Pricing', icon: DollarSign, requiredFields: ['price', 'taxPercentage', 'hsnCode', 'sku'] },
  { id: 'shipping', label: 'Shipping', icon: Truck, requiredFields: ['weight', 'stock'] },
  { id: 'compliance', label: 'Compliance & SEO', icon: Shield, requiredFields: ['countryOfOrigin'] },
  { id: 'review', label: 'Review', icon: Eye, requiredFields: [] },
];

// ─── Initial form data ────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  name: '', brand: '', shortDesc: '', longDesc: '',
  department: '', category: '', subcategory: '',
  material: '', color: '', size: '', style: '', features: '',
  condition: 'New', listingType: 'Simple',
  images: [], videoUrl: '',
  price: '', msrp: '', taxPercentage: '', hsnCode: '', sku: '', bulkPricing: false,
  hasVariants: false, variantData: '',
  weight: '', length: '', width: '', height: '',
  freeShipping: false, shippingClass: '', stock: '', lowStockThreshold: '5',
  warrantyType: 'None', warrantyDuration: '', warrantyPolicy: '',
  returnable: true, returnWindow: '7',
  countryOfOrigin: '', manufacturer: '', certifications: '', warnings: '',
  metaTitle: '', metaDesc: '', keywords: '', slug: '',
  sponsored: false, adBudget: '',
};

// ─── Dynamic Classification Hierarchy ─────────────────────────────────────────

const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  'Electronics': {
    'Audio & Headphones': ['Over-Ear Headphones', 'Earbuds & In-Ear', 'Bluetooth Speakers', 'Sound Bars', 'Home Audio Systems', 'Microphones', 'DJ Equipment'],
    'Mobile Phones': ['Smartphones', 'Feature Phones', 'Phone Cases & Covers', 'Screen Protectors', 'Phone Chargers', 'Phone Mounts & Holders'],
    'Laptops & Computers': ['Laptops', 'Desktops', 'Monitors', 'Computer Accessories', 'Keyboards & Mice', 'Laptop Bags & Sleeves'],
    'Cameras & Photography': ['DSLR Cameras', 'Mirrorless Cameras', 'Action Cameras', 'Camera Lenses', 'Tripods & Supports', 'Camera Bags'],
    'Wearables': ['Smartwatches', 'Fitness Trackers', 'Smart Glasses', 'VR Headsets'],
    'TVs & Displays': ['LED TVs', 'OLED TVs', 'QLED TVs', 'Smart TVs', 'Projectors', 'TV Accessories'],
    'Gaming': ['Consoles', 'Gaming Laptops', 'Controllers & Gamepads', 'Gaming Headsets', 'Gaming Monitors', 'Video Games'],
    'Accessories': ['Cables & Adapters', 'Power Banks', 'USB Hubs', 'Storage Devices', 'Charging Stations'],
  },
  'Fashion': {
    'Men\'s Clothing': ['T-Shirts & Polos', 'Shirts', 'Jeans & Trousers', 'Jackets & Coats', 'Kurtas & Ethnic', 'Shorts & 3/4ths', 'Suits & Blazers'],
    'Women\'s Clothing': ['Dresses', 'Tops & Tunics', 'Sarees', 'Kurtas & Kurtis', 'Jeans & Jeggings', 'Skirts', 'Lehenga & Anarkali'],
    'Kids\' Clothing': ['Boys\' Clothing', 'Girls\' Clothing', 'Baby Clothing', 'School Uniforms', 'Ethnic Wear'],
    'Footwear': ['Sneakers', 'Formal Shoes', 'Sandals & Slippers', 'Sports Shoes', 'Boots', 'Heels & Wedges'],
    'Bags & Luggage': ['Backpacks', 'Handbags', 'Wallets', 'Travel Luggage', 'Laptop Bags', 'Duffel Bags'],
    'Jewellery & Watches': ['Watches', 'Necklaces', 'Rings', 'Bracelets', 'Earrings', 'Sunglasses'],
  },
  'Home & Garden': {
    'Furniture': ['Sofas & Couches', 'Beds & Mattresses', 'Tables', 'Chairs', 'Wardrobes', 'TV Units & Stands'],
    'Kitchen & Dining': ['Cookware', 'Kitchen Appliances', 'Dinnerware', 'Glassware', 'Storage & Organisation', 'Kitchen Tools'],
    'Home Décor': ['Wall Art & Frames', 'Candles & Holders', 'Cushions & Throws', 'Rugs & Carpets', 'Mirrors', 'Artificial Plants'],
    'Lighting': ['Ceiling Lights', 'Table & Desk Lamps', 'LED Strip Lights', 'Floor Lamps', 'Outdoor Lighting', 'Smart Lights'],
    'Garden & Outdoors': ['Planters & Pots', 'Garden Tools', 'Seeds & Bulbs', 'Outdoor Furniture', 'BBQ & Grills'],
    'Bed & Bath': ['Bed Sheets & Linen', 'Towels', 'Pillows & Cushions', 'Blankets & Quilts', 'Bathroom Accessories'],
  },
  'Health & Beauty': {
    'Skincare': ['Moisturisers', 'Sunscreen', 'Face Wash & Cleansers', 'Serums', 'Face Masks', 'Eye Cream'],
    'Hair Care': ['Shampoo & Conditioner', 'Hair Oil', 'Hair Styling', 'Hair Colour', 'Hair Tools'],
    'Makeup': ['Foundation & Primer', 'Lipstick & Lip Care', 'Eye Makeup', 'Blush & Highlighter', 'Nail Polish'],
    'Fragrances': ['Men\'s Perfume', 'Women\'s Perfume', 'Deodorants', 'Body Mists'],
    'Health Devices': ['BP Monitors', 'Thermometers', 'Pulse Oximeters', 'Glucometers', 'Weighing Scales'],
    'Personal Care': ['Electric Shavers', 'Trimmers', 'Oral Care', 'Feminine Hygiene'],
  },
  'Sports & Outdoors': {
    'Fitness Equipment': ['Dumbbells & Weights', 'Treadmills', 'Yoga Mats', 'Resistance Bands', 'Exercise Bikes', 'Pull-Up Bars'],
    'Team Sports': ['Cricket', 'Football', 'Basketball', 'Badminton', 'Tennis', 'Volleyball'],
    'Cycling': ['Bicycles', 'Helmets', 'Cycling Apparel', 'Bicycle Accessories', 'E-Bikes'],
    'Camping & Hiking': ['Tents', 'Sleeping Bags', 'Backpacks', 'Trekking Poles', 'Camping Cookware'],
    'Sportswear': ['Sports Shoes', 'Track Pants', 'Gym T-Shirts', 'Sports Bras', 'Compression Wear'],
    'Water Sports': ['Swimming Goggles', 'Snorkelling Gear', 'Surfboards', 'Kayaks', 'Life Jackets'],
  },
  'Toys & Baby': {
    'Toys': ['Action Figures', 'Building Blocks', 'Board Games', 'Soft Toys', 'RC Cars & Drones', 'Educational Toys'],
    'Baby Care': ['Diapers & Wipes', 'Baby Feeding', 'Baby Clothing', 'Strollers & Prams', 'Car Seats', 'Baby Monitors'],
    'Learning & STEM': ['Science Kits', 'Coding Toys', 'Puzzles', 'Art & Craft Kits', 'Globes & Maps'],
    'Outdoor Play': ['Slides & Swings', 'Bicycles & Scooters', 'Trampolines', 'Water Toys'],
  },
  'Automotive': {
    'Car Accessories': ['Car Electronics', 'Seat Covers', 'Car Fragrances', 'Phone Holders', 'Dash Cams', 'Steering Covers'],
    'Bike Accessories': ['Helmets', 'Riding Gear', 'Bike Covers', 'Mirrors', 'Mobile Mounts'],
    'Tyres & Wheels': ['Car Tyres', 'Bike Tyres', 'Alloy Wheels', 'Tyre Inflators'],
    'Car Care': ['Car Wash & Polish', 'Wax & Coatings', 'Interior Cleaners', 'Microfibre Cloths'],
    'Tools & Maintenance': ['Tool Kits', 'Jump Starters', 'Air Compressors', 'Oil & Fluids'],
  },
  'Books & Stationery': {
    'Books': ['Fiction', 'Non-Fiction', 'Academic & Textbooks', 'Children\'s Books', 'Comics & Manga', 'Self-Help & Motivational'],
    'Stationery': ['Pens & Pencils', 'Notebooks & Diaries', 'Art Supplies', 'Desk Organisers', 'Sticky Notes & Tapes'],
    'Office Supplies': ['Printers & Ink', 'Paper & Printing', 'Filing & Storage', 'Staplers & Punches', 'Whiteboards'],
    'Musical Instruments': ['Guitars', 'Keyboards & Pianos', 'Drums & Percussion', 'Wind Instruments', 'Instrument Accessories'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function MarketplaceAddProductPage() {
  const { seller } = useSeller();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  // ── Dynamic Category Hierarchy ──────────────────────────────────────────

  const departments = useMemo(() => Object.keys(CATEGORY_TREE), []);

  const categoryOptions = useMemo(() => {
    if (!formData.department || !CATEGORY_TREE[formData.department]) return [];
    return Object.keys(CATEGORY_TREE[formData.department]);
  }, [formData.department]);

  const subcategoryOptions = useMemo(() => {
    if (!formData.department || !formData.category) return [];
    const cats = CATEGORY_TREE[formData.department];
    if (!cats || !cats[formData.category]) return [];
    return cats[formData.category];
  }, [formData.department, formData.category]);

  const handleDepartmentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, department: e.target.value, category: '', subcategory: '' }));
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, category: e.target.value, subcategory: '' }));
  }, []);

  // ── Field change handlers ────────────────────────────────────────────────

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
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

  // ── Validation helpers ───────────────────────────────────────────────────

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
        // Images: check if at least 1 image
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

  // ── Listing quality score ────────────────────────────────────────────────

  const qualityScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;

    // Required fields (50 points)
    const allRequired = TABS.flatMap(t => t.requiredFields);
    const filledRequired = allRequired.filter(f => {
      const v = formData[f]; return v !== '' && v !== undefined && v !== null;
    });
    score += (filledRequired.length / Math.max(allRequired.length, 1)) * 50;

    // Images (15 points)
    score += Math.min(formData.images.length / 3, 1) * 15;

    // Optional enrichment fields (35 points)
    const enrichment: (keyof FormData)[] = [
      'shortDesc', 'material', 'color', 'size', 'style', 'features',
      'msrp', 'videoUrl', 'metaTitle', 'metaDesc', 'keywords', 'slug',
      'manufacturer', 'certifications',
    ];
    const filledEnrich = enrichment.filter(f => {
      const v = formData[f]; return v !== '' && v !== undefined && v !== null;
    });
    score += (filledEnrich.length / enrichment.length) * 35;

    return Math.round(Math.min(score, maxScore));
  }, [formData]);

  const qualityColor = qualityScore >= 80 ? 'text-emerald-600' : qualityScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const qualityBg = qualityScore >= 80 ? 'bg-emerald-500' : qualityScore >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const qualityLabel = qualityScore >= 80 ? 'Excellent' : qualityScore >= 50 ? 'Good' : 'Needs Work';

  // ── Draft save ───────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    setDraftSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setDraftSaving(false);
  };

  // ── Publish ──────────────────────────────────────────────────────────────

  const canPublish = tabCompletion.info.complete && tabCompletion.pricing.complete
    && tabCompletion.shipping.complete && tabCompletion.compliance.complete
    && formData.images.length > 0;

  const handlePublish = async () => {
    if (!canPublish) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1500));
    setSaving(false);
    router.push('/seller/marketplace/products');
  };

  // ── Add placeholder image ────────────────────────────────────────────────

  const addImage = () => {
    if (formData.images.length >= 8) return;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, `product_image_${prev.images.length + 1}`],
    }));
  };

  const removeImage = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

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
              <PlusCircle className="w-7 h-7 text-indigo-600" />Add Marketplace Product
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Complete all sections to list your product</p>
          </div>
        </div>

        {/* Quality Score + Save Draft (always visible) */}
        <div className="flex items-center gap-4">
          {/* Listing Quality Score */}
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

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={draftSaving}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {draftSaving ? 'Saving...' : 'Save Draft'}
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
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2.5 px-5 py-3.5 text-sm font-bold whitespace-nowrap
                  border-b-[3px] transition-all relative flex-1 justify-center
                  ${isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {/* Completion badge */}
                {isComplete && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {isPartial && (
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                )}
                {!isComplete && !isPartial && comp.total > 0 && (
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 animate-in fade-in duration-200">

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 1: Product Info                                            */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-8">
            {/* Section: Basic Details */}
            <section>
              <SectionHeader icon={Package} title="Basic Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                <div className="lg:col-span-2">
                  <Field label="Product Name" name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('name')} placeholder="e.g. Wireless Noise-Cancelling Headphones" />
                </div>
                <Field label="Brand" name="brand" value={formData.brand} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('brand')} placeholder="e.g. Sony" />
                <div className="lg:col-span-3">
                  <Field label="Short Description" name="shortDesc" value={formData.shortDesc} onChange={handleChange} onBlur={handleBlur} placeholder="Brief summary (max 150 chars)" />
                </div>
                <div className="lg:col-span-3">
                  <FieldTextarea label="Long Description" name="longDesc" value={formData.longDesc} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('longDesc')} placeholder="Detailed product information, specifications, and features..." rows={5} />
                </div>
              </div>
            </section>

            {/* Section: Category & Classification */}
            <section>
              <SectionHeader icon={Package} title="Category & Classification" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <FieldSelect label="Department" name="department" value={formData.department} onChange={handleDepartmentChange} onBlur={handleBlur} required invalid={isFieldInvalid('department')} options={departments} />
                <FieldSelect label="Category" name="category" value={formData.category} onChange={handleCategoryChange} onBlur={handleBlur} required invalid={isFieldInvalid('category')} options={categoryOptions} disabled={!formData.department} />
                <FieldSelect label="Subcategory" name="subcategory" value={formData.subcategory} onChange={handleChange} onBlur={handleBlur} options={subcategoryOptions} disabled={!formData.category} />
              </div>
              {/* Breadcrumb Preview */}
              {formData.department && (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Path:</span>
                  <span className="font-semibold text-indigo-600">{formData.department}</span>
                  {formData.category && <><span className="text-slate-300">›</span><span className="font-semibold text-indigo-600">{formData.category}</span></>}
                  {formData.subcategory && <><span className="text-slate-300">›</span><span className="font-semibold text-indigo-600">{formData.subcategory}</span></>}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <SegmentedControl
                  label="Product Condition"
                  value={formData.condition}
                  options={['New', 'Refurbished', 'Used']}
                  onChange={(v) => setFormData(prev => ({ ...prev, condition: v }))}
                />
                <SegmentedControl
                  label="Listing Type"
                  value={formData.listingType}
                  options={['Simple', 'Bundle', 'Digital']}
                  onChange={(v) => setFormData(prev => ({ ...prev, listingType: v }))}
                />
              </div>
            </section>

            {/* Section: Attributes & Features */}
            <section>
              <SectionHeader icon={Star} title="Attributes & Key Features" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                <Field label="Material" name="material" value={formData.material} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Leather, Aluminum" />
                <Field label="Color Family" name="color" value={formData.color} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Black, Silver" />
                <Field label="Size / Dimensions" name="size" value={formData.size} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. One Size, XL" />
                <Field label="Style / Model" name="style" value={formData.style} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 2024 Edition" />
              </div>
              <div className="mt-5">
                <FieldTextarea label="Key Features (Bullet Points)" name="features" value={formData.features} onChange={handleChange} onBlur={handleBlur} placeholder={"- Active Noise Cancellation\n- 30 hours battery life\n- Quick charge (10 min = 5 hrs)\n- Hi-Res Audio certified"} rows={5} />
                <p className="text-xs text-slate-400 mt-1.5">Use one bullet point per line. Up to 5 key selling points.</p>
              </div>
            </section>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 2: Images & Media                                          */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <SectionHeader icon={Image} title="Product Images" />

            {/* Guidelines banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-blue-800 mb-1">Image Guidelines</p>
                <ul className="text-blue-700 space-y-0.5 text-xs leading-relaxed">
                  <li>• White or neutral background recommended</li>
                  <li>• Minimum resolution: <b>1000 × 1000 px</b></li>
                  <li>• The first image will be your <b>main listing image</b></li>
                  <li>• No watermarks, logos, or promotional text overlays</li>
                  <li>• Upload at least <b>3 images</b> for best listing quality</li>
                </ul>
              </div>
            </div>

            {/* Upload area */}
            <button
              type="button"
              onClick={addImage}
              disabled={formData.images.length >= 8}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto group-hover:text-indigo-400 transition-colors" />
              <p className="text-sm font-bold text-slate-500 mt-3 group-hover:text-indigo-600">Click to upload product images</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB each · Max 8 images · {formData.images.length}/8 uploaded</p>
            </button>

            {/* Image grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center bg-slate-50 group ${i === 0 ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                    <div className="flex flex-col items-center gap-1">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <Image className="w-6 h-6 text-slate-300" />
                    </div>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">Main</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video URL */}
            <div className="pt-4 border-t border-slate-100">
              <SectionHeader icon={Video} title="Product Video (Optional)" />
              <div className="mt-4">
                <Field label="Video URL" name="videoUrl" value={formData.videoUrl} onChange={handleChange} onBlur={handleBlur} placeholder="https://youtube.com/watch?v=..." />
                <p className="text-xs text-slate-400 mt-1.5">YouTube or Vimeo link. Videos increase conversion by up to 73%.</p>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 3: Pricing & Offer                                         */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            {/* Section: Pricing */}
            <section>
              <SectionHeader icon={DollarSign} title="Pricing" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <FieldCurrency label="Selling Price" name="price" value={formData.price} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('price')} />
                <FieldCurrency label="MSRP (Original Price)" name="msrp" value={formData.msrp} onChange={handleChange} onBlur={handleBlur} />
                <Field label="SKU" name="sku" value={formData.sku} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('sku')} placeholder="e.g. SKU-ELEC-WH-001" />
              </div>

              {/* Discount preview */}
              {formData.price && formData.msrp && parseFloat(formData.msrp) > parseFloat(formData.price) && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-700">
                    {((1 - parseFloat(formData.price) / parseFloat(formData.msrp)) * 100).toFixed(1)}% discount
                  </span>
                  <span className="text-xs text-emerald-600">
                    — Customer saves {(parseFloat(formData.msrp) - parseFloat(formData.price)).toLocaleString()}
                  </span>
                </div>
              )}
            </section>

            {/* Section: Tax & HSN */}
            <section>
              <SectionHeader icon={Shield} title="Tax & Classification" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <FieldSelect label="Tax / GST %" name="taxPercentage" value={formData.taxPercentage} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('taxPercentage')} options={[
                  { value: '0', label: '0% (Exempt)' },
                  { value: '5', label: '5%' },
                  { value: '12', label: '12%' },
                  { value: '16', label: '16% (Standard VAT)' },
                  { value: '18', label: '18%' },
                  { value: '28', label: '28%' },
                ]} />
                <Field label="HSN / SAC Code" name="hsnCode" value={formData.hsnCode} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('hsnCode')} placeholder="e.g. 85183000" />
              </div>
              <p className="text-xs text-slate-400 mt-2">HSN code is required for tax invoicing and cross-border shipping.</p>
            </section>

            {/* Section: Bulk Pricing */}
            <section>
              <ToggleRow
                label="Enable Bulk Pricing / Wholesale"
                description="Offer discounts for large quantity orders"
                checked={formData.bulkPricing}
                onToggle={() => handleToggle('bulkPricing')}
              />
            </section>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 4: Shipping & Inventory                                    */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'shipping' && (
          <div className="space-y-8">
            {/* Section: Inventory */}
            <section>
              <SectionHeader icon={Package} title="Inventory" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Field label="Stock Quantity" name="stock" value={formData.stock} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('stock')} type="number" placeholder="0" />
                <Field label="Low Stock Alert Threshold" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="5" />
              </div>
            </section>

            {/* Section: Variants */}
            <section>
              <ToggleRow
                label="This product has variants"
                description="e.g. Different colors, sizes, or configurations"
                checked={formData.hasVariants}
                onToggle={() => handleToggle('hasVariants')}
              />
              {formData.hasVariants && (
                <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <FieldTextarea label="Define Variants" name="variantData" value={formData.variantData} onChange={handleChange} onBlur={handleBlur} rows={4} placeholder={"Color: Black, Silver, White\nSize: S, M, L, XL"} />
                  <p className="text-xs text-slate-400 mt-2">A variant matrix will be generated for specific pricing and SKUs per variant.</p>
                </div>
              )}
            </section>

            {/* Section: Shipping */}
            <section>
              <SectionHeader icon={Truck} title="Shipping & Packaging" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-4">
                <Field label="Weight (kg)" name="weight" value={formData.weight} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('weight')} type="number" step="0.01" placeholder="0.0" />
                <Field label="Length (cm)" name="length" value={formData.length} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="0" />
                <Field label="Width (cm)" name="width" value={formData.width} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="0" />
                <Field label="Height (cm)" name="height" value={formData.height} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="0" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <FieldSelect label="Shipping Class" name="shippingClass" value={formData.shippingClass} onChange={handleChange} onBlur={handleBlur} options={['Standard Shipping', 'Heavy / Bulky Item', 'Fragile', 'Cold Chain / Refrigerated', 'Hazardous Material']} />
                <div className="flex items-end">
                  <ToggleRow
                    label="Free Shipping"
                    description="Absorb shipping costs for the customer"
                    checked={formData.freeShipping}
                    onToggle={() => handleToggle('freeShipping')}
                  />
                </div>
              </div>
            </section>

            {/* Section: Warranty */}
            <section>
              <SectionHeader icon={Shield} title="Warranty & Returns" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                <FieldSelect label="Warranty Type" name="warrantyType" value={formData.warrantyType} onChange={handleChange} onBlur={handleBlur} options={['None', 'Manufacturer Warranty', 'Seller Warranty', 'Third-Party Warranty']} />
                <Field label="Warranty Duration (Months)" name="warrantyDuration" value={formData.warrantyDuration} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="e.g. 12" disabled={formData.warrantyType === 'None'} />
                <Field label="Return Window (Days)" name="returnWindow" value={formData.returnWindow} onChange={handleChange} onBlur={handleBlur} type="number" placeholder="7" disabled={!formData.returnable} />
              </div>
              <div className="mt-4">
                <ToggleRow
                  label="Returnable Product"
                  description="Allow customers to return this product"
                  checked={formData.returnable}
                  onToggle={() => handleToggle('returnable')}
                />
              </div>
              {formData.warrantyType !== 'None' && (
                <div className="mt-4">
                  <FieldTextarea label="Warranty Policy Summary" name="warrantyPolicy" value={formData.warrantyPolicy} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="What does the warranty cover?" />
                </div>
              )}
            </section>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 5: Compliance & SEO                                        */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'compliance' && (
          <div className="space-y-8">
            {/* Section: Compliance */}
            <section>
              <SectionHeader icon={Shield} title="Compliance & Safety" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Field label="Country of Origin" name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} onBlur={handleBlur} required invalid={isFieldInvalid('countryOfOrigin')} placeholder="e.g. India, China, USA" />
                <Field label="Manufacturer / Packer / Importer" name="manufacturer" value={formData.manufacturer} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Sony India Pvt. Ltd." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <Field label="Certifications (CE, FCC, FDA, ISO)" name="certifications" value={formData.certifications} onChange={handleChange} onBlur={handleBlur} placeholder="Comma-separated list" />
                <Field label="Safety Warnings" name="warnings" value={formData.warnings} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Not suitable for children under 3 years." />
              </div>
            </section>

            {/* Section: SEO */}
            <section>
              <SectionHeader icon={Eye} title="Search Engine Optimization (SEO)" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Field label="Meta Title" name="metaTitle" value={formData.metaTitle} onChange={handleChange} onBlur={handleBlur} placeholder="Keep it under 60 characters" />
                <Field label="URL Slug" name="slug" value={formData.slug} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. sony-wh-1000xm5-headphones" />
              </div>
              <div className="mt-5">
                <FieldTextarea label="Meta Description" name="metaDesc" value={formData.metaDesc} onChange={handleChange} onBlur={handleBlur} rows={2} placeholder="Summary for Google Search results (max 160 chars)..." />
              </div>
              <div className="mt-5">
                <Field label="Keywords & Search Tags" name="keywords" value={formData.keywords} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. headphones, noise cancelling, wireless audio, sony" />
                <p className="text-xs text-slate-400 mt-1.5">Separate keywords with commas. These help customers find your product in search.</p>
              </div>

              {/* Google Preview */}
              <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Search Preview</p>
                <p className="text-lg font-semibold text-[#1a0dab] leading-tight">{formData.metaTitle || formData.name || 'Product Title'}</p>
                <p className="text-sm text-[#006621] mt-0.5">kartseek.com/marketplace/{formData.slug || 'product-slug'}</p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{formData.metaDesc || 'Meta description will appear here. Write a compelling summary to improve click-through rates.'}</p>
              </div>
            </section>

            {/* Section: Advertising */}
            <section>
              <div className="p-5 border border-indigo-100 bg-indigo-50/50 rounded-xl">
                <ToggleRow
                  label="Boost Product Visibility (Sponsored Ads)"
                  description="Appear at the top of search results. You only pay when customers click."
                  checked={formData.sponsored}
                  onToggle={() => handleToggle('sponsored')}
                />
                {formData.sponsored && (
                  <div className="mt-4 pt-4 border-t border-indigo-100">
                    <FieldCurrency label="Daily Ad Budget" name="adBudget" value={formData.adBudget} onChange={handleChange} onBlur={handleBlur} />
                    <p className="text-xs text-indigo-500 mt-1.5">Campaigns auto-pause at the daily budget limit.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* TAB 6: Review & Publish                                        */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Completion checklist */}
            <div className={`p-5 rounded-xl border ${canPublish ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                {canPublish
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  : <AlertCircle className="w-6 h-6 text-amber-500" />
                }
                <span className={`text-lg font-black ${canPublish ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {canPublish ? 'Ready to Publish!' : 'Some sections need attention'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TABS.filter(t => t.id !== 'review').map(tab => {
                  const comp = tabCompletion[tab.id];
                  const ok = tab.id === 'images' ? formData.images.length > 0 : comp.complete;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-2 text-sm text-left hover:underline"
                    >
                      {ok
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                      }
                      <span className={ok ? 'text-slate-700 font-medium' : 'text-slate-400'}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality Score (large) */}
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
                <p className="text-sm text-slate-500 mt-0.5">Fill optional fields like features, images, and SEO to improve your score.</p>
              </div>
            </div>

            {/* Review cards */}
            <ReviewCard title="Product Info" tab="info" setActiveTab={setActiveTab} rows={[
              ['Product Name', formData.name],
              ['Brand', formData.brand],
              ['Department', formData.department],
              ['Category', `${formData.category}${formData.subcategory ? ` > ${formData.subcategory}` : ''}`],
              ['Condition', formData.condition],
              ['Listing Type', formData.listingType],
            ]} />

            <ReviewCard title="Images & Media" tab="images" setActiveTab={setActiveTab} rows={[
              ['Images Uploaded', `${formData.images.length} image(s)`],
              ['Video URL', formData.videoUrl || '—'],
            ]} />

            <ReviewCard title="Pricing & Offer" tab="pricing" setActiveTab={setActiveTab} rows={[
              ['Selling Price', formData.price ? `${formData.price}` : '—'],
              ['MSRP', formData.msrp ? `${formData.msrp}` : '—'],
              ['Tax / GST', formData.taxPercentage ? `${formData.taxPercentage}%` : '—'],
              ['HSN Code', formData.hsnCode || '—'],
              ['SKU', formData.sku || '—'],
            ]} />

            <ReviewCard title="Shipping & Inventory" tab="shipping" setActiveTab={setActiveTab} rows={[
              ['Stock', formData.stock || '—'],
              ['Weight', formData.weight ? `${formData.weight} kg` : '—'],
              ['Shipping', formData.freeShipping ? 'Free Shipping' : (formData.shippingClass || 'Standard')],
              ['Variants', formData.hasVariants ? 'Multi-variant' : 'Single variant'],
              ['Warranty', formData.warrantyType],
              ['Returnable', formData.returnable ? `Yes (${formData.returnWindow} days)` : 'No'],
            ]} />

            <ReviewCard title="Compliance & SEO" tab="compliance" setActiveTab={setActiveTab} rows={[
              ['Country of Origin', formData.countryOfOrigin || '—'],
              ['Manufacturer', formData.manufacturer || '—'],
              ['SEO Title', formData.metaTitle || '—'],
              ['Keywords', formData.keywords || '—'],
              ['Advertising', formData.sponsored ? `Sponsored (${formData.adBudget || '0'}/day)` : 'Organic'],
            ]} />

            {/* Publish button */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                {canPublish
                  ? 'All required sections are complete. Your product will be submitted for review.'
                  : 'Please complete all required sections before publishing.'}
              </p>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish || saving}
                className="flex items-center gap-2 bg-emerald-600 text-white px-10 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Publishing Product...' : 'Publish Product'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reusable sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
      <Icon className="w-4.5 h-4.5 text-indigo-500" />
      {title}
    </h3>
  );
}

// ── Text Field ────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  type?: string;
  step?: string;
  disabled?: boolean;
}

function Field({ label, name, value, onChange, onBlur, required, invalid, placeholder, type = 'text', step, disabled }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        step={step}
        disabled={disabled}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50
          ${invalid
            ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
      />
      {invalid && (
        <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{label} is required
        </p>
      )}
    </div>
  );
}

// ── Currency Field ────────────────────────────────────────────────────────────

function FieldCurrency({ label, name, value, onChange, onBlur, required, invalid }: Omit<FieldProps, 'type'>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400"></span>
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          placeholder="0"
          className={`w-full border rounded-lg pl-12 pr-4 py-2.5 text-sm outline-none transition-colors
            ${invalid
              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
              : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
        />
      </div>
      {invalid && (
        <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{label} is required
        </p>
      )}
    </div>
  );
}

// ── Textarea Field ────────────────────────────────────────────────────────────

interface FieldTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  rows?: number;
}

function FieldTextarea({ label, name, value, onChange, onBlur, required, invalid, placeholder, rows = 4 }: FieldTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm resize-none outline-none transition-colors
          ${invalid
            ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
      />
      {invalid && (
        <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{label} is required
        </p>
      )}
    </div>
  );
}

// ── Select Field ──────────────────────────────────────────────────────────────

interface FieldSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  options: (string | { value: string; label: string })[];
}

function FieldSelect({ label, name, value, onChange, onBlur, required, invalid, disabled, options }: FieldSelectProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50
          ${invalid
            ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
      >
        <option value="">{disabled ? 'Select above first...' : 'Select...'}</option>
        {options.map(opt =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      {invalid && (
        <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{label} is required
        </p>
      )}
    </div>
  );
}

// ── Segmented Control ─────────────────────────────────────────────────────────

function SegmentedControl({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div className="flex bg-slate-100 rounded-lg p-1">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
              value === opt
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onToggle }: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
      <div>
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ title, tab, setActiveTab, rows }: {
  title: string;
  tab: TabId;
  setActiveTab: (t: TabId) => void;
  rows: [string, string][];
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <button
          type="button"
          onClick={() => setActiveTab(tab)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          Edit →
        </button>
      </div>
      <div className="px-5 py-3 divide-y divide-slate-100">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-start py-2.5 text-sm">
            <span className="w-40 text-slate-400 font-medium shrink-0">{label}</span>
            <span className={`font-semibold ${value && value !== '—' ? 'text-slate-800' : 'text-slate-300'}`}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
