'use client';

import React, { useState, useEffect } from 'react';
import { X, CircleDot, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  default?: boolean;
}

interface CustomizationGroup {
  id: string;
  title: string;
  required: boolean;
  multiSelect?: boolean;
  options: CustomizationOption[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  type: string;
  imageUrl?: string;
  customizable?: boolean;
  customizations?: CustomizationGroup[];
}

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export default function CustomizationModal({ isOpen, onClose, item }: CustomizationModalProps) {
  // Store selected options by group ID
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen && item?.customizations) {
      const initialSelections: Record<string, string[]> = {};
      item.customizations.forEach(group => {
        const defaultOptions = group.options.filter(o => o.default).map(o => o.id);
        if (defaultOptions.length > 0) {
          initialSelections[group.id] = defaultOptions;
        } else if (group.required && !group.multiSelect && group.options.length > 0) {
           initialSelections[group.id] = [group.options[0].id]; // Select first if required
        } else {
          initialSelections[group.id] = [];
        }
      });
      setSelections(initialSelections);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleOptionToggle = (groupId: string, optionId: string, multiSelect: boolean) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      if (!multiSelect) {
        return { ...prev, [groupId]: [optionId] };
      }
      
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  // Calculate total price
  let totalPrice = item.price;
  if (item.customizations) {
    item.customizations.forEach(group => {
      const selectedIds = selections[group.id] || [];
      selectedIds.forEach(optId => {
        const option = group.options.find(o => o.id === optId);
        if (option) totalPrice += option.price;
      });
    });
  }

  // Check if all required groups are satisfied
  let isValid = true;
  if (item.customizations) {
    item.customizations.forEach(group => {
      if (group.required) {
        const selectedIds = selections[group.id] || [];
        if (selectedIds.length === 0) isValid = false;
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      ><DismissOnEscape onDismiss={onClose} /></div>
      
      {/* Modal */}
      <div className="fixed bottom-0 md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 w-full md:w-[480px] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl z-[101] flex flex-col max-h-[90vh] overflow-hidden animate-slide-up md:animate-fade-in">
        
        {/* Header Image */}
        <div className="relative w-full h-48 sm:h-56 bg-slate-100 shrink-0">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
          ) : (
            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80" alt="Food" className="w-full h-full object-cover" />
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur text-slate-900 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
           aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
          <div className="p-5 md:p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 border ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'} rounded-sm flex items-center justify-center p-0.5`}>
                <CircleDot className={`w-full h-full ${item.type === 'veg' ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">{item.name}</h2>
            </div>
            <p className="text-slate-500 text-sm">{item.description}</p>
          </div>

          {/* Customizations */}
          {item.customizations?.map((group) => (
            <div key={group.id} className="p-5 md:p-6 border-b border-slate-100 last:border-b-0 bg-slate-50/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{group.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {group.required ? 'Required • Choose 1' : `Optional • Choose ${group.multiSelect ? 'multiple' : '1'}`}
                  </p>
                </div>
                {group.required && (
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Required</span>
                )}
              </div>

              <div className="space-y-3">
                {group.options.map(option => {
                  const isSelected = (selections[group.id] || []).includes(option.id);
                  return (
                    /*
                      A <label> with nothing to label. The tick marks below are
                      CheckSquare/CheckCircle2 icons, not inputs — there was no
                      checkbox or radio anywhere in this group, so the label had
                      no control to forward a click to, could not be focused, and
                      announced no selected state.

                      A button carrying the matching ARIA role reports both the
                      role and whether it is checked, and keeps the icons as the
                      visual. `type="button"` matters: this sits inside the
                      modal's form and would otherwise submit it.
                    */
                    <button
                      type="button"
                      key={option.id}
                      role={group.multiSelect ? 'checkbox' : 'radio'}
                      aria-checked={isSelected}
                      className={`w-full text-left flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      onClick={() => handleOptionToggle(group.id, option.id, !!group.multiSelect)}
                    >
                      <div className="flex items-center gap-3">
                        {group.multiSelect ? (
                          isSelected ? <CheckSquare className="w-5 h-5 text-orange-500" /> : <Square className="w-5 h-5 text-slate-300" />
                        ) : (
                          isSelected ? <CheckCircle2 className="w-5 h-5 text-orange-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}
                        <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{option.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-600">
                        {option.price > 0 ? `+₹${option.price}` : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Amount</span>
              <span className="text-2xl font-black text-slate-900">₹{totalPrice}</span>
            </div>
            <button 
              disabled={!isValid}
              onClick={() => {
                // Here we would typically dispatch to cart
                onClose();
              }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-white shadow-sm transition-all text-center ${isValid ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              Add Item to Cart
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
