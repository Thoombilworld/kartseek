'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GROCERY_CATEGORIES, type GroceryCategory } from '@/lib/modules/grocery-categories';

interface CategoryCascaderProps {
  value?: { parent: string; category: string; subcategory: string };
  onChange: (val: { parent: string; category: string; subcategory: string }) => void;
}

export default function CategoryCascader({ value, onChange }: CategoryCascaderProps) {
  const [parent, setParent] = useState(value?.parent || '');
  const [category, setCategory] = useState(value?.category || '');
  const [subcategory, setSubcategory] = useState(value?.subcategory || '');

  const parentCat = GROCERY_CATEGORIES.find((c) => c.id === parent);
  const catChildren = parentCat?.subcategories || [];
  const selectedCat = catChildren.find((c) => c.id === category);
  const subChildren = selectedCat?.children || [];

  const handleParentChange = (id: string) => {
    setParent(id);
    setCategory('');
    setSubcategory('');
    onChange({ parent: id, category: '', subcategory: '' });
  };

  const handleCategoryChange = (id: string) => {
    setCategory(id);
    setSubcategory('');
    onChange({ parent, category: id, subcategory: '' });
  };

  const handleSubcategoryChange = (id: string) => {
    setSubcategory(id);
    onChange({ parent, category, subcategory: id });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Parent Category */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          Department <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={parent}
            onChange={(e) => handleParentChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
            title="Select department"
          >
            <option value="">Select department...</option>
            {GROCERY_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!parent}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Select category"
          >
            <option value="">Select category...</option>
            {catChildren.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Subcategory */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="subcategory">
          Subcategory
        </label>
        <div className="relative">
          <select id="subcategory"
            value={subcategory}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!category || subChildren.length === 0}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Select subcategory"
          >
            <option value="">{subChildren.length === 0 ? 'No subcategories' : 'Select subcategory...'}</option>
            {subChildren.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Breadcrumb */}
      {parent && (
        <div className="md:col-span-3 flex items-center gap-1.5 text-xs text-slate-400 mt-1">
          <span className="font-medium">{GROCERY_CATEGORIES.find((c) => c.id === parent)?.emoji}</span>
          <span className="font-semibold text-slate-600">{parentCat?.name}</span>
          {category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-slate-600">{selectedCat?.name}</span>
            </>
          )}
          {subcategory && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-emerald-600">
                {subChildren.find((c) => c.id === subcategory)?.name}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
