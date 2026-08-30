'use client';

import React from 'react';
import { Check, Palette, Ruler } from 'lucide-react';
import { useVariants, type VariantAxis } from './variant-context';

/**
 * The product page's variant pickers.
 *
 * Replaces two competing selectors that both used to render here: one that
 * fetched its own copy of the variants and crashed on the response shape, and
 * one inside the action buttons that drove nothing but a stringified label.
 * This one reads the shared selection, so picking a colour moves the gallery,
 * the price and what goes in the cart at the same time.
 *
 * Colour axes render as swatches painted with the fill the category's attribute
 * schema declares — the point of item six: choosing "Midnight Black" must show
 * midnight black, not a generic chip.
 */
export function VariantPicker() {
  const variants = useVariants();
  if (!variants || variants.axes.length === 0) return null;

  const { axes, selection, select, selected, isAvailable, exists, fillFor } = variants;

  return (
    <div className="space-y-5">
      {axes.map((axis) => (
        <div key={axis.name}>
          <h4 className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
            {axis.isColour
              ? <Palette className="w-4 h-4 text-purple-500" />
              : <Ruler className="w-4 h-4 text-blue-500" />}
            {axis.attribute?.name ?? axis.name}:{' '}
            <span className="text-blue-600 font-semibold">{selection[axis.name] ?? 'Select'}</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            {axis.values.map((value) => {
              const isSelected = selection[axis.name] === value;
              // Two different kinds of "no": a combination that is simply not
              // stocked right now, and one that is not made at all. Both are
              // shown, because hiding them makes the grid look shorter for some
              // shoppers than others, but only the first is clickable.
              const available = isAvailable(axis.name, value);
              const real = exists(axis.name, value);

              if (axis.isColour) {
                const fill = fillFor(axis, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => real && select(axis.name, value)}
                    disabled={!real}
                    title={available ? value : `${value} — unavailable in this combination`}
                    aria-label={value}
                    aria-pressed={isSelected}
                    className={`relative w-11 h-11 rounded-full border-2 transition-all duration-200 shrink-0 ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-200 scale-105'
                        : 'border-slate-200 hover:border-slate-400'
                    } ${available ? '' : 'opacity-45'}`}
                  >
                    <span
                      className="absolute inset-1 rounded-full border border-black/10"
                      // A colour the schema does not name renders as a neutral
                      // chip with its name beneath rather than an invented fill.
                      style={{ backgroundColor: fill ?? '#e2e8f0' }}
                    />
                    {isSelected && (
                      <Check
                        className={`absolute inset-0 m-auto w-4 h-4 drop-shadow ${
                          fill && isDark(fill) ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                    )}
                    {!available && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-px bg-slate-400 rotate-45" />
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => real && select(axis.name, value)}
                  disabled={!real}
                  aria-pressed={isSelected}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : available
                        ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                        : 'border-slate-100 bg-slate-50 text-slate-400 line-through'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>

          {/* Names the swatches, which are otherwise unlabelled for anyone who
              cannot distinguish them — and for the shades a schema has no hex
              for, where the chip is neutral. */}
          {axis.isColour && selection[axis.name] && (
            <p className="text-xs text-slate-500 mt-2">{selection[axis.name]}</p>
          )}
        </div>
      ))}

      {selected && selected.stock > 0 && selected.stock <= 5 && (
        <p className="text-xs font-semibold text-orange-600">
          Only {selected.stock} left in stock
        </p>
      )}

      {selected && selected.stock === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium">
          {selected.name || 'This option'} is currently out of stock
        </div>
      )}

      {/* A selection that matches no SKU is reachable only when the catalogue
          has gaps in its matrix; saying so beats a silently dead Add to Cart. */}
      {!selected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">
          This combination is not offered. Pick a different option to continue.
        </div>
      )}
    </div>
  );
}

/** Whether a hex is dark enough that a tick mark on it must be white. */
function isDark(hex: string): boolean {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return false;
  // Rec. 709 luma — the same weighting browsers use for greyscale.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
}
