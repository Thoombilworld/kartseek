'use client';

import React from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { useGroceryLocale } from '@/i18n/grocery-locale';

interface ProductProps {
  id: string;
  name: string;
  weight: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  imageUrl: string;
  inStock: boolean;
  deliveryTime: string;
}

export default function ProductCard({
  id, name, weight, price, originalPrice, discountPercentage, imageUrl, inStock, deliveryTime 
}: ProductProps) {
  const { formatPrice } = useGroceryLocale();
  // Mock state for Add to Cart
  const [quantity, setQuantity] = React.useState(0);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col hover:shadow-lg transition-shadow relative">
      {/* Discount Badge */}
      {discountPercentage && (
        <div className="absolute top-2 left-2 bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-red-100 z-10">
          {discountPercentage}% OFF
        </div>
      )}

      {/* Product image. This frame used to render a grey cart glyph and nothing
          else — `imageUrl` arrived as a prop and was dropped, so every grocery
          tile showed the same placeholder no matter what the store had uploaded. */}
      <ProductThumb
        src={imageUrl}
        alt={name}
        fallbackIcon={ShoppingCart}
        sizes={THUMB_SIZES.grid4}
        className="mb-3 rounded-lg"
      />

      {/* Product Info */}
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
          <span>{weight}</span>
          <span className="text-[10px] bg-green-50 text-green-700 px-1 py-0.5 rounded flex items-center">
             ⏱ {deliveryTime}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-2 line-clamp-2" title={name}>
          {name}
        </h3>
      </div>

      {/* Pricing & Actions */}
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="font-bold text-gray-900 leading-none mb-1">{formatPrice(price)}</div>
          {originalPrice && (
            <div className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</div>
          )}
        </div>

        {/* Add to Cart Button Logic */}
        {!inStock ? (
          <div className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Out of Stock</div>
        ) : quantity === 0 ? (
          <button 
            onClick={() => setQuantity(1)}
            className="border border-green-600 text-green-600 hover:bg-green-50 font-bold text-sm px-4 py-1 rounded-lg transition-colors shadow-sm"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-2 py-1 shadow-sm">
            <button onClick={() => setQuantity(q => q - 1)} className="p-0.5 hover:bg-green-700 rounded transition-colors"><Minus className="w-3.5 h-3.5" /></button>
            <span className="text-sm font-bold w-4 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="p-0.5 hover:bg-green-700 rounded transition-colors"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
