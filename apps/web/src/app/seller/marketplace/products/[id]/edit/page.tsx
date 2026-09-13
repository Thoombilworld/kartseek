'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SellerProductDetail } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { ProductForm } from '../../product-form';

/**
 * Edit one of the seller's products.
 *
 * Prefilled from `GET /seller/products/:id` — the catalogue fields, the
 * category, the brand and the product's attribute values — and saved through
 * `PUT /seller/products/:id`. The form that lived here rendered four empty
 * inputs and a Save button whose only effect was a 1.5-second spinner.
 */
export default function EditProductPage() {
  const params = useParams();
  const productId = String(params?.id ?? '');
  const { seller } = useSeller();

  const res = useSellerData<SellerProductDetail>(
    () => sellerApi.getOwnProduct(productId) as any,
    [productId, seller.sellerId],
  );
  const product: SellerProductDetail | null = (res.data as any)?.data ?? res.data ?? null;

  return (
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
      {product && <ProductForm key={product.id} mode="edit" product={product} />}
    </SellerDataState>
  );
}
