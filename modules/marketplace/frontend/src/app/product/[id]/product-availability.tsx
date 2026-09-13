'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, PackageX } from 'lucide-react';
import { useVariants } from './variant-context';
import { LOW_STOCK_THRESHOLD, type ProductAvailability } from '@/lib/marketplace/product-detail';

/**
 * "In stock" / "Only 3 left" / "Out of stock" / "Not available here".
 *
 * Read from the same stock figure the Add to Cart button is gated on, and from
 * the selected SKU when there is one, so the badge, the button and the picker
 * always agree. There is no restock-alert endpoint, so an out-of-stock
 * product says so plainly rather than offering a "Notify me" that would post
 * nowhere.
 */
export function ProductAvailabilityBadge({ initial }: { initial: ProductAvailability }) {
  const variants = useVariants();

  // A variant product's badge follows the selection; without one it reports
  // whether any SKU can be bought, which is what the server computed.
  let status = initial.status;
  let stock = initial.stock;
  if (variants && variants.axes.length > 0) {
    if (variants.selected) {
      stock = variants.availableStock;
      status =
        stock <= 0 ? 'out_of_stock' : stock <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock';
    }
  } else if (variants) {
    stock = variants.availableStock;
    if (variants.blockedReason === 'unavailable') status = 'unavailable';
    else
      status =
        stock <= 0 ? 'out_of_stock' : stock <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock';
  }

  const map = {
    in_stock: {
      icon: CheckCircle2,
      text: 'In stock',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    low_stock: {
      icon: AlertTriangle,
      text: `Only ${stock} left in stock`,
      className: 'text-orange-700 bg-orange-50 border-orange-200',
    },
    out_of_stock: {
      icon: XCircle,
      text: 'Out of stock',
      className: 'text-red-700 bg-red-50 border-red-200',
    },
    unavailable: {
      icon: PackageX,
      text: 'Not available in your market',
      className: 'text-slate-600 bg-slate-50 border-slate-200',
    },
  } as const;

  const { icon: Icon, text, className } = map[status];
  return (
    <p
      role="status"
      data-availability={status}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${className}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {text}
    </p>
  );
}
