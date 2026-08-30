'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Store, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';

/**
 * Order invoice.
 *
 * This page rendered a constant called `INVOICE`: invoice number INV-GRC-2847,
 * a store address and **GSTIN** (`29AABCT1234F1ZP`), a named customer, five line
 * items with HSN codes, CGST/SGST of 13.50 each, and a payment transaction id —
 * none of it connected to the order in the URL, and all of it printable. A
 * document that looks like a tax invoice and contains an invented tax number is
 * the single most consequential fabrication in this module, so it is gone.
 *
 * What is shown now is what the platform actually knows: the real order, its real
 * line items and totals, and its real payment method. Tax is presented as the
 * single line the order carries, not split into CGST/SGST the platform does not
 * compute, and the document is labelled a receipt rather than a tax invoice —
 * KARTSEEK does not hold the seller's tax registration, so it cannot issue one on
 * their behalf.
 */
export default function OrderInvoicePage() {
  return (
    <AuthGate reason="Sign in to view this receipt.">
      <InvoiceContent />
    </AuthGate>
  );
}

interface OrderLine { productId: string; name: string; weight: string; price: number; quantity: number }
interface OrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: OrderLine[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  taxAmount?: number;
  taxRate?: number;
  taxName?: string;
  paymentMethod: string;
  status: string;
  deliveryAddress?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
  store?: { name?: string; address?: string; phone?: string };
}

function InvoiceContent() {
  const params = useParams();
  const orderId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  const { formatPrice, config, taxLabel, tr } = useGroceryLocale();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    groceryApi.getOrderById(orderId)
      .then((o: any) => { if (!cancelled) setOrder(o as OrderRecord); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this order'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-800 mb-1">{tr('Receipt unavailable')}</h1>
        <p className="text-sm text-slate-500 mb-6">{error ?? 'This order could not be found.'}</p>
        <Link href="/grocery/orders" className="inline-flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700">{tr('Back to orders')}</Link>
      </div>
    );
  }

  const items = order.items ?? [];
  const subtotal = Number(order.itemTotal ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const discount = Number(order.discount ?? 0);
  const total = Number(order.grandTotal ?? 0);
  /*
   * The tax the order recorded, not a figure this page works out.
   *
   * This used to derive it as `total - (subtotal + deliveryFee - discount)`,
   * which is exactly zero whenever tax is inclusive — as it is in every market
   * KARTSEEK serves — so a 15% VAT sale in Riyadh printed "VAT 0.00". Orders now
   * carry `taxAmount`, `taxRate` and `taxName`, captured at the rate in force
   * when the order was placed. The subtraction is kept only as a fallback for
   * rows written before those columns existed.
   */
  const recordedTax = Number(order.taxAmount ?? NaN);
  const tax = Number.isFinite(recordedTax)
    ? recordedTax
    : Math.max(0, Math.round((total - (subtotal + deliveryFee - discount)) * 100) / 100);
  // Inclusive tax is already inside the line prices, so showing it as a separate
  // addend would overstate the total. It is stated as "of which".
  const taxIsInclusive = Number.isFinite(recordedTax) && recordedTax > 0;
  const orderTaxLabel = (order.taxName as string | undefined) || taxLabel;

  const addr = order.deliveryAddress;
  const customerAddress = [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href={`/grocery/orders/${orderId}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to order')}</Link>
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
            <Printer className="w-4 h-4" />{tr('Print')}</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div ref={printRef} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm print:shadow-none print:border-none print:rounded-none">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200 gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{tr('Receipt')}</h1>
              <p className="text-sm text-slate-500 mt-1">Order {order.orderNumber}</p>
              <p className="text-xs text-slate-400">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-green-700">{tr('KARTSEEK Grocery')}</p>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{order.status?.toLowerCase().replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('Sold by')}</p>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400" />{order.store?.name ?? 'Store'}
              </p>
              {order.store?.address && (
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />{order.store.address}
                </p>
              )}
              {order.store?.phone && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />{order.store.phone}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('Delivered to')}</p>
              <p className="text-xs text-slate-600">{customerAddress || '—'}</p>
            </div>
          </div>

          {/* Lines. HSN codes are gone — grocery_items has no HSN column, so every
              code on the old document was invented. */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left py-2 font-semibold">{tr('Item')}</th>
                <th className="text-center py-2 font-semibold">Qty</th>
                <th className="text-right py-2 font-semibold">{tr('Rate')}</th>
                <th className="text-right py-2 font-semibold">{tr('Amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={`${item.productId}-${i}`}>
                  <td className="py-2.5 text-slate-800">
                    {item.name}
                    {item.weight && <span className="text-slate-400"> ({item.weight})</span>}
                  </td>
                  <td className="py-2.5 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-slate-600">{formatPrice(Number(item.price))}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">
                    {formatPrice(Number(item.price) * Number(item.quantity))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>{tr('Subtotal')}</span><span>{formatPrice(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600"><span>{tr('Discount')}</span><span>−{formatPrice(discount)}</span></div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>{tr('Delivery')}</span>
              <span>{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}</span>
            </div>
            {/* One line, named by the market the shop trades in. The old document
                split a fixed 27.00 into CGST 13.50 / SGST 13.50 — an India-only
                split the platform does not calculate and which is simply wrong in
                the Gulf and the UK.

                Inclusive tax sits *inside* the total, so it is stated after it as
                "of which", never added to it. Listing it above the total as a
                separate addend would imply the customer paid total + tax. */}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
              <span>{tr('Total')}</span><span>{formatPrice(total)}</span>
            </div>
            {taxIsInclusive ? (
              <div className="flex justify-between text-xs text-slate-500">
                <span>{tr('of which')} {orderTaxLabel} ({order.taxRate}%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
            ) : tax > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>{orderTaxLabel}</span><span>{formatPrice(tax)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>{tr('Paid by')}</span><span>{order.paymentMethod}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-8 pt-4 border-t border-slate-100 leading-relaxed">
            This is a payment receipt, not a tax invoice. {config.tax.name} shown is the amount charged on this order.
            For a tax invoice bearing the seller&apos;s registration details, please contact the store directly.
          </p>
        </div>
      </div>
    </div>
  );
}
