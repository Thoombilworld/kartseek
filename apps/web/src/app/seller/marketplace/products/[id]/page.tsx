'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package,
  Edit,
  Image as ImageIcon,
  Boxes,
  Search,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SellerProductDetail } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { productPath } from '@/lib/marketplace/product-url';

/**
 * One of the seller's products, as the catalogue holds it.
 *
 * This page used to print four KPI tiles — "12,450 views", "342 orders",
 * "5.2M revenue", "4.6★" — as literals on every product a seller opened. No
 * endpoint reports per-product views, orders or revenue to sellers, so no
 * tile claims them; what is here is what `GET /seller/products/:id` returns:
 * the moderation state, the offer, the photos and the attribute values that
 * drive the storefront's specification table.
 */

const STATE: Record<
  string,
  { label: string; className: string; icon: React.ElementType; note?: string }
> = {
  APPROVED: {
    label: 'Live on the storefront',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  PENDING: {
    label: 'Awaiting review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    note: 'An admin reviews new products and content edits before they go on sale.',
  },
  CORRECTION_REQUESTED: {
    label: 'Correction requested',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: AlertTriangle,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

export function productStateOf(
  p:
    | {
        approvalStatus?: string;
        approval_status?: string;
        status?: string;
        isActive?: boolean;
        is_active?: boolean;
      }
    | null
    | undefined,
) {
  const approval = String(p?.approvalStatus ?? p?.approval_status ?? 'PENDING').toUpperCase();
  const status = String(p?.status ?? '').toUpperCase();
  if (status === 'DELETED')
    return {
      key: 'DELETED',
      label: 'Deleted',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: XCircle as React.ElementType,
    };
  if (status === 'DRAFT' && approval !== 'REJECTED')
    return {
      key: 'DRAFT',
      label: 'Draft',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: FileText as React.ElementType,
    };
  const active = p?.isActive ?? p?.is_active;
  if (approval === 'APPROVED' && active === false)
    return {
      key: 'INACTIVE',
      label: 'Approved, not on sale',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: Clock as React.ElementType,
    };
  const row = STATE[approval] ?? STATE.PENDING;
  return { key: approval, ...row };
}

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = String(params?.id ?? '');
  const { seller } = useSeller();
  const { format: money } = useSellerMoney();

  const res = useSellerData<SellerProductDetail>(
    () => sellerApi.getOwnProduct(productId) as any,
    [productId, seller.sellerId],
  );
  const product: SellerProductDetail | null = (res.data as any)?.data ?? res.data ?? null;
  const state = productStateOf(product);
  const StateIcon = state.icon;
  const listing = product?.listing ?? null;
  const images = product?.images ?? [];
  const attributes = product?.attributes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" aria-hidden="true" />
            <span className="truncate">{product?.name ?? 'Product'}</span>
          </h1>
          {product && (
            <p className="text-sm text-slate-500 mt-1">
              {[product.category?.name, product.subcategory?.name].filter(Boolean).join(' › ') ||
                'No category'}
              {product.brand?.name ? ` · ${product.brand.name}` : ''}
            </p>
          )}
        </div>
        {product && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/seller/marketplace/products/${product.id}/edit`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
              Edit details
            </Link>
            <Link
              href={`/seller/marketplace/products/${product.id}/images`}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
            >
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              Photos
            </Link>
            <Link
              href={`/seller/marketplace/products/${product.id}/variants`}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
            >
              <Boxes className="w-4 h-4" aria-hidden="true" />
              Variants
            </Link>
            <Link
              href={`/seller/marketplace/products/${product.id}/seo`}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              SEO
            </Link>
          </div>
        )}
      </div>

      <SellerDataState
        loading={res.loading}
        error={res.error}
        unavailable={res.unavailable}
        isEmpty={!product}
        feature="Product"
        onRetry={res.reload}
        emptyTitle="Product not found"
        emptyDescription="This product is not in your catalogue, or it has been removed."
      >
        {product && (
          <>
            <div
              className={`rounded-xl border p-4 flex items-start gap-3 ${state.className}`}
              data-testid="seller-product-state"
            >
              <StateIcon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-sm">{state.label}</p>
                {'note' in state && state.note && (
                  <p className="text-xs mt-0.5 opacity-80">{state.note}</p>
                )}
                {product.rejectionReason && (
                  <p className="text-xs mt-1">Reason: {product.rejectionReason}</p>
                )}
                {state.key === 'APPROVED' && (
                  <a
                    href={productPath({ id: product.id, slug: product.slug, name: product.name })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold underline mt-1 inline-flex items-center gap-1"
                  >
                    View on the storefront <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Selling price</p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {listing ? money(Number(listing.sellingPrice) || 0) : '—'}
                </p>
                {listing?.mrp && Number(listing.mrp) > Number(listing.sellingPrice) && (
                  <p className="text-xs text-slate-400 line-through">
                    {money(Number(listing.mrp))}
                  </p>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Stock</p>
                <p
                  className={`text-xl font-black mt-1 ${listing && listing.stockQuantity === 0 ? 'text-red-600' : 'text-slate-900'}`}
                >
                  {listing ? listing.stockQuantity : '—'}
                </p>
                {listing?.sellerSku && (
                  <p className="text-xs text-slate-400 font-mono truncate">{listing.sellerSku}</p>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Photos</p>
                <p className="text-xl font-black text-slate-900 mt-1">{images.length}</p>
                {images.length === 0 && <p className="text-xs text-amber-600">Add at least one</p>}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Details filled in</p>
                <p className="text-xl font-black text-slate-900 mt-1">{attributes.length}</p>
                <p className="text-xs text-slate-400">shown as specifications</p>
              </div>
            </div>

            {attributes.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3">
                  Product details on the storefront
                </h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {attributes.map((a) => (
                    <div
                      key={a.slug}
                      className="flex justify-between gap-4 py-1.5 border-b border-slate-100 text-sm"
                    >
                      <dt className="text-slate-500">{a.name}</dt>
                      <dd className="text-slate-900 font-medium text-right">
                        {a.displayValue ?? String(a.value ?? '')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {(product.short_description || product.long_description) && (
              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-2">Description</h2>
                {product.short_description && (
                  <p className="text-sm text-slate-700 mb-2">{product.short_description}</p>
                )}
                {product.long_description && (
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {product.long_description}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </SellerDataState>
    </div>
  );
}
