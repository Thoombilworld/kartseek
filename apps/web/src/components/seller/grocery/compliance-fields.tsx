'use client';
import React from 'react';
import { Globe, AlertCircle, Shield } from 'lucide-react';
import { COUNTRY_COMPLIANCE, type CountryComplianceConfig } from '@/lib/seller/country-compliance';
import type { SellerCountryCode } from '@/lib/seller/types';

interface ComplianceFieldsProps {
  countryCode: string;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const EU14_ALLERGENS = [
  'Celery', 'Cereals containing gluten', 'Crustaceans', 'Eggs', 'Fish',
  'Lupin', 'Milk', 'Molluscs', 'Mustard', 'Tree nuts', 'Peanuts',
  'Sesame seeds', 'Soybeans', 'Sulphur dioxide/sulphites',
];

export default function ComplianceFields({ countryCode, values, onChange }: ComplianceFieldsProps) {
  const config = COUNTRY_COMPLIANCE[countryCode as SellerCountryCode];

  if (!config) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">Country not configured</p>
          <p className="text-xs text-amber-600">Compliance fields for country code &quot;{countryCode}&quot; are not yet available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Country indicator */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
        <Globe className="w-5 h-5 text-slate-500" />
        <div>
          <p className="text-sm font-bold text-slate-900">{config.name} Compliance</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {config.taxLabel}: {config.taxRate}%
          </p>
        </div>
        <Shield className="w-5 h-5 text-emerald-500 ml-auto" />
      </div>

      {/* Tax fields */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Tax & Registration</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax rate */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{config.taxLabel} Rate *</label>
            <select
              value={values['taxRate'] || ''}
              onChange={(e) => onChange('taxRate', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              title={`${config.taxLabel} rate`}
            >
              <option value="">Select rate...</option>
              {config.taxRate > 0 && <option value={config.taxRate}>{config.taxRate}%</option>}
              <option value="0">0% (Exempt)</option>
            </select>
          </div>

          {/* Dynamic registration fields */}
          {config.registrationFields.map((field) => (<div key={field.key}>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* India-specific: GST breakdown */}
      {countryCode === 'IN' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-2">GST Breakdown (Auto-calculated)</p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white rounded-lg p-2 border border-blue-100">
              <p className="text-slate-400 mb-0.5">CGST</p>
              <p className="font-bold text-slate-900">{values['taxRate'] ? `${parseFloat(values['taxRate']) / 2}%` : '—'}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-100">
              <p className="text-slate-400 mb-0.5">SGST</p>
              <p className="font-bold text-slate-900">{values['taxRate'] ? `${parseFloat(values['taxRate']) / 2}%` : '—'}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-100">
              <p className="text-slate-400 mb-0.5">IGST</p>
              <p className="font-bold text-slate-900">{values['taxRate'] ? `${values['taxRate']}%` : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* UK allergens */}
      {countryCode === 'GB' && (
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">EU14 Allergen Declaration</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {EU14_ALLERGENS.map((allergen) => (
              <label key={allergen} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(values['allergens'] || '').split(',').includes(allergen)}
                  onChange={(e) => {
                    const current = (values['allergens'] || '').split(',').filter(Boolean);
                    if (e.target.checked) {
                      onChange('allergens', [...current, allergen].join(','));
                    } else {
                      onChange('allergens', current.filter((a) => a !== allergen).join(','));
                    }
                  }}
                  className="w-3.5 h-3.5 text-emerald-600 rounded"
                />
                <span className="text-xs font-medium text-slate-700">{allergen}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition info */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Nutritional Information</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Calories (kcal)', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)', 'Sodium (mg)', 'Sugar (g)', 'Cholesterol (mg)'].map((label) => {
            const key = label.toLowerCase().replace(/[^a-z]/g, '_');
            return (<div key={key}>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={values[`nutrition_${key}`] || ''}
                  onChange={(e) => onChange(`nutrition_${key}`, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Per 100g serving. Leave blank if not applicable.</p>
      </div>

      {/* Additional fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="ingredients">Ingredients</label>
          <textarea id="ingredients"
            rows={2}
            value={values['ingredients'] || ''}
            onChange={(e) => onChange('ingredients', e.target.value)}
            placeholder="List all ingredients separated by commas..."
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="storage-instructions">Storage Instructions</label>
          <textarea id="storage-instructions"
            rows={2}
            value={values['storageInstructions'] || ''}
            onChange={(e) => onChange('storageInstructions', e.target.value)}
            placeholder="e.g. Store in a cool, dry place..."
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="country-of-origin">Country of Origin</label>
          <input id="country-of-origin"
            type="text"
            value={values['countryOfOrigin'] || ''}
            onChange={(e) => onChange('countryOfOrigin', e.target.value)}
            placeholder="e.g. India"
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="manufacturer-name">Manufacturer Name</label>
          <input id="manufacturer-name"
            type="text"
            value={values['manufacturer'] || ''}
            onChange={(e) => onChange('manufacturer', e.target.value)}
            placeholder="e.g. ABC Foods Pvt. Ltd."
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
