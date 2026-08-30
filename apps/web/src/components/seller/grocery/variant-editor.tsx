'use client';
import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface VariantRow {
  id: string;
  weight: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  barcode?: string;
}

interface VariantEditorProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'dozen', 'pair'];

export default function VariantEditor({ variants, onChange }: VariantEditorProps) {

  const addVariant = () => {
    onChange([
      ...variants,
      {
        id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        weight: '',
        unit: 'g',
        mrp: 0,
        sellingPrice: 0,
        stockQuantity: 0,
        minStockAlert: 0,
      },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof VariantRow, value: string | number) => {
    onChange(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  return (
    <div className="space-y-3">
      {variants.map((variant, idx) => {
        const discount = variant.mrp > 0 ? Math.round(((variant.mrp - variant.sellingPrice) / variant.mrp) * 100) : 0;
        return (
          <div
            key={variant.id}
            className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 group hover:border-emerald-200 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
              <span className="text-xs font-bold text-slate-500">Variant {idx + 1}</span>
              {discount > 0 && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {discount}% OFF
                </span>
              )}
              {variants.length > 1 && (
                <button
                  onClick={() => removeVariant(variant.id)}
                  className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove variant"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
              {/* Weight */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="weight-qty">Weight / Qty</label>
                <input id="weight-qty"
                  type="text"
                  value={variant.weight}
                  onChange={(e) => updateVariant(variant.id, 'weight', e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="unit">Unit</label>
                <select id="unit"
                  value={variant.unit}
                  onChange={(e) => updateVariant(variant.id, 'unit', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                  title="Unit"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* MRP */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="mrp">MRP (₹)</label>
                <input id="mrp"
                  type="number"
                  value={variant.mrp || ''}
                  onChange={(e) => updateVariant(variant.id, 'mrp', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="selling-price">Selling Price (₹)</label>
                <input id="selling-price"
                  type="number"
                  value={variant.sellingPrice || ''}
                  onChange={(e) => updateVariant(variant.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="stock-qty">Stock Qty</label>
                <input id="stock-qty"
                  type="number"
                  value={variant.stockQuantity || ''}
                  onChange={(e) => updateVariant(variant.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Min Alert */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="min-alert">Min Alert</label>
                <input id="min-alert"
                  type="number"
                  value={variant.minStockAlert || ''}
                  onChange={(e) => updateVariant(variant.id, 'minStockAlert', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={addVariant}
        type="button"
        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm font-bold text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Add Weight Variant
      </button>
    </div>
  );
}
