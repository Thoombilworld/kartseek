'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, X, Plus, Star, Check, Minus, ShoppingCart, Truck, Shield } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import { getProductById } from '@/lib/api/marketplace';
import { normaliseProductDetail } from '@/lib/marketplace/product-detail';
import { getMarketplaceDeliveryRule } from '@/lib/marketplace/delivery';
import { productPath } from '@/lib/marketplace/product-url';
import { zoneHref } from '@/lib/routes/zone-href';
import { LoadFailed } from '@/components/shared/load-failed';

type CompareProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  imageUrl?: string;
  specs: Record<string, string>;
};

/**
 * The compare tray, written by the "Add to Compare" button on the product page.
 *
 * This page used to render three hardcoded sample phones with ids 'p1'/'p2'/'p3'
 * that are not in the catalogue, so every link on it 404'd — and nothing the user
 * did could change what was compared.
 *
 * Spec rows are the union of the compared products' own attribute values
 * (`attributes` on the detail read), in the order they first appear, so a
 * pair of phones compares Display and Battery while two jackets compare
 * Material and Fit. A row a product does not carry renders '—'; a row no
 * product carries does not exist. The twelve phone keys that used to live
 * here were rendered against everything, including supplement capsules.
 */
const COMPARE_KEY = 'kartseek_compare';

export default function ComparePage() {
  const { formatCurrencyValue: fmt, country } = useRegion();
  const cart = useCartContext();
  const toast = useToast();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  // Separates "we could not load the products being compared" from "there are none".
  const [loadFailed, setLoadFailed] = useState(false);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /** The snapshot the product page wrote — ids, and a stale copy of the rest. */
    const readSnapshot = (): any[] => {
      try {
        const raw = localStorage.getItem(COMPARE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((p: any) => p?.id) : [];
      } catch {
        return [];
      }
    };

    const fromSnapshot = (p: any): CompareProduct => ({
      id: String(p.id),
      title: p.title ?? 'Product',
      brand: p.brand ?? '',
      price: Number(p.price ?? 0) || 0,
      mrp: Number(p.mrp ?? p.price ?? 0) || 0,
      rating: Number(p.rating ?? 0) || 0,
      reviews: Number(p.reviews ?? 0) || 0,
      inStock: p.inStock !== false,
      imageUrl: p.imageUrl,
      specs: p.specs && typeof p.specs === 'object' ? p.specs : {},
    });

    /**
     * Live product, by id.
     *
     * The tray is a snapshot taken whenever the shopper pressed "Add to
     * Compare", so on its own this page showed prices that may have changed
     * since, no image at all (the writer stores `imageUrl`, the old mapping
     * dropped it), and `(0)` reviews for a product with 15,600 of them. Ids are
     * the only thing worth trusting from storage; everything else comes from
     * the catalogue.
     *
     * Payable price is the buy-box listing's `sellingPrice` — `mrp` is the list
     * price and quoting it as the price would overstate what the shopper pays.
     */
    const fetchOne = async (p: any): Promise<CompareProduct> => {
      const snap = fromSnapshot(p);
      try {
        const raw = await getProductById(snap.id, country.code);
        if (!raw?.id) return snap;
        const d = normaliseProductDetail(raw, country.code);

        // One row per attribute value, keyed by the attribute's name so two
        // products from one category line up on the same row.
        const specs: Record<string, string> = {};
        for (const attr of d.attributes) specs[attr.name] = attr.displayValue;

        return {
          id: d.id,
          title: d.name || snap.title,
          brand: d.brand?.name ?? snap.brand,
          price: d.price || snap.price,
          mrp: d.listPrice || snap.mrp,
          rating: d.averageRating,
          reviews: d.reviewCount,
          inStock: d.availability.status === 'in_stock' || d.availability.status === 'low_stock',
          imageUrl: d.images[0] ?? snap.imageUrl,
          specs,
        };
      } catch {
        return snap; // offline or gateway down — the stale row still beats a blank page
      }
    };

    const snapshot = readSnapshot();
    if (snapshot.length === 0) {
      setLoaded(true);
      return;
    }
    // Render the snapshot immediately, then correct it from the catalogue, so
    // the table does not sit empty while four requests are in flight.
    setProducts(snapshot.map(fromSnapshot));

    Promise.all(snapshot.map(fetchOne))
      .then((live) => {
        if (!cancelled) setProducts(live);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [country.code]);

  const removeProduct = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((x) => x.id !== id);
      try {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // Every attribute any compared product carries, in first-seen order.
  const allSpecKeys = [...new Set(products.flatMap((p) => Object.keys(p.specs)))];
  const specRows = allSpecKeys.filter((key) => {
    if (!showDiffOnly) return true;
    const vals = products.map((p) => p.specs[key] || '—');
    return new Set(vals).size > 1;
  });
  const delivery = getMarketplaceDeliveryRule(country.code);

  if (loaded && products.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <ArrowLeft className="w-12 h-12 text-blue-300 rotate-180" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nothing to compare yet</h2>
        <p className="text-slate-500 mb-6 max-w-sm">
          Open any product and tap{' '}
          <span className="font-semibold text-slate-700">Add to Compare</span> to line it up here —
          up to four at a time.
        </p>
        <Link
          href="/"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  if (loadFailed) {
    return <LoadFailed title="We could not load the products being compared" />;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 xs:px-4 py-6 space-y-5 pb-mobile-nav">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">Compare Products</h1>
          <p className="text-sm text-slate-500">Side-by-side comparison of up to 4 products</p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showDiffOnly}
            onChange={(e) => setShowDiffOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-slate-600 font-medium">Show differences only</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          {/* Product headers */}
          <thead>
            <tr>
              <th className="w-40 p-3 text-left text-xs font-bold text-slate-400 uppercase align-top border-b border-slate-200">
                Product
              </th>
              {products.map((p) => {
                const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                return (
                  <th
                    key={p.id}
                    className="p-4 align-top text-left border-b border-slate-200 relative bg-white"
                  >
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/*
                      The product's own picture. This well rendered a shopping
                      cart glyph unconditionally, so every column looked like a
                      product with no image even though the catalogue has one.
                      The icon stays as the fallback for a product that really
                      has none.
                    */}
                    <div className="bg-slate-50 w-full h-28 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingCart className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase">{p.brand}</p>
                    <Link
                      href={zoneHref(productPath(p))}
                      className="font-bold text-sm text-slate-900 hover:text-blue-600 line-clamp-2 block mt-0.5"
                    >
                      {p.title}
                    </Link>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        {p.rating} <Star className="w-2.5 h-2.5 fill-white" />
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({p.reviews.toLocaleString()})
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-black text-slate-900">{fmt(p.price)}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 line-through">{fmt(p.mrp)}</span>
                        {disc > 0 && (
                          <span className="text-xs font-bold text-emerald-600">{disc}% off</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        cart.add({
                          id: p.id,
                          name: p.title,
                          price: Number(p.price) || 0,
                          quantity: 1,
                          brand: p.brand,
                        });
                        toast.success(`Added ${p.title} to cart`);
                      }}
                      className="w-full mt-3 bg-[#ff9f00] hover:bg-[#f39800] text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  </th>
                );
              })}
              {products.length < 4 && (
                <th className="p-4 align-top text-center border-b border-slate-200 bg-slate-50">
                  <div className="w-full h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center mb-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30">
                    <Plus className="w-6 h-6 text-slate-300" />
                    <p className="text-xs text-slate-400 mt-1">Add Product</p>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          {/* Spec rows */}
          <tbody>
            {specRows.map((key, i) => {
              const vals = products.map((p) => p.specs[key] || '—');
              const allSame = new Set(vals).size === 1;
              const bestIdx =
                key === 'Price'
                  ? vals.indexOf(Math.min(...products.map((p) => p.price)).toString())
                  : -1;
              return (
                <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-3 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">
                    {key}
                  </td>
                  {products.map((p, j) => (
                    <td
                      key={p.id}
                      className={`px-4 py-3 text-sm border-b border-slate-100 ${!allSame && showDiffOnly ? 'bg-amber-50/50' : ''}`}
                    >
                      <span className="text-slate-900 font-medium">{vals[j]}</span>
                    </td>
                  ))}
                  {products.length < 4 && <td className="border-b border-slate-100 bg-slate-50" />}
                </tr>
              );
            })}
            {/* Availability row */}
            <tr className="bg-white">
              <td className="px-3 py-3 text-xs font-bold text-slate-500 border-b border-slate-100">
                Availability
              </td>
              {products.map((p) => (
                <td key={p.id} className="px-4 py-3 border-b border-slate-100">
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${p.inStock ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {p.inStock ? (
                      <>
                        <Check className="w-3 h-3" />
                        In Stock
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3" />
                        Out of Stock
                      </>
                    )}
                  </span>
                </td>
              ))}
              {products.length < 4 && <td className="border-b border-slate-100 bg-slate-50" />}
            </tr>
            {/* Delivery row — the market's rule, the same one the cart charges. */}
            <tr className="bg-slate-50/60">
              <td className="px-3 py-3 text-xs font-bold text-slate-500">Delivery</td>
              {products.map((p) => (
                <td key={p.id} className="px-4 py-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-500" aria-hidden="true" />
                    {p.price >= delivery.freeAbove || delivery.fee === 0
                      ? 'Free delivery'
                      : `${fmt(delivery.fee)} delivery · free over ${fmt(delivery.freeAbove)}`}
                  </span>
                </td>
              ))}
              {products.length < 4 && <td className="bg-slate-50" />}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
