'use client';

import React from 'react';
import { ProductForm } from '../product-form';

/**
 * Add a marketplace product.
 *
 * The 1,170-line form that lived here never sent anything: "Publish" slept
 * for 1.5 s and navigated back to the list, "Save draft" slept for 0.8 s, the
 * category picker was a hard-coded literal unrelated to the catalogue, and
 * images were placeholder strings. Sellers were told their product was
 * submitted while nothing was written. The shared `ProductForm` posts to
 * `POST /seller/products` and shows the server's answer.
 */
export default function AddProductPage() {
  return <ProductForm mode="create" />;
}
