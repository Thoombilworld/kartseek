'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { Image as ImageIcon, Star, Trash2, ArrowLeft, ArrowRight, Plus, AlertCircle, RotateCw, Save } from 'lucide-react';

/**
 * Product images.
 *
 * `product_images` has existed all along and nothing seller-facing ever read or
 * wrote it, so this page had no backend — a seller could not put a photograph on
 * their own listing, which is the single most important thing a marketplace
 * listing needs. It is now backed by `/sellers/:id/products/:productId/images`.
 *
 * Images are referenced by URL: there is no upload pipeline in this service, and
 * a file picker that silently discarded the file would be worse than asking for
 * the URL.
 */

interface ProductImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export default function ProductImagesPage() {
  const params = useParams();
  const productId = String(params?.id ?? '');
  const { seller } = useSeller();

  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const res = useSellerData<{ data: ProductImage[] }>(
    (sellerId) => sellerApi.getProductImages(sellerId, productId) as any,
    [productId],
  );
  const images = (res.data?.data ?? []) as ProductImage[];

  const say = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const run = useCallback(async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setError(null);
    try {
      await fn();
      res.reload();
      say(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work — please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [res]);

  const add = async () => {
    if (!url.trim()) { setError('An image URL is required.'); return; }
    const ok = await run(
      () => sellerApi.addProductImage(seller.sellerId, productId, { url: url.trim(), altText: altText.trim() }),
      'Image added',
    );
    if (ok) { setUrl(''); setAltText(''); }
  };

  /** Move one place left or right and persist the whole order. */
  const move = (index: number, delta: number) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(
      () => sellerApi.reorderProductImages(seller.sellerId, productId, next.map((i) => i.id)),
      'Order saved',
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/seller/marketplace/products/${productId}`} className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1">
          ← Back to product
        </Link>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-blue-600" aria-hidden />
          Product Images
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          The primary image is what customers see in search results.
        </p>
      </div>

      {/* Add */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-900 text-sm mb-3">Add an image</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Alt text (for screen readers)"
            className="sm:w-64 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={add}
            disabled={busy}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-bold"
          >
            <Plus className="w-4 h-4" />Add
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </p>
        )}
      </div>

      {/* Gallery */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <SellerDataState
          loading={res.loading}
          error={res.error}
          unavailable={res.unavailable}
          isEmpty={images.length === 0}
          feature="Product images"
          onRetry={res.reload}
          emptyTitle="No images on this listing"
          emptyDescription="A listing without a photograph will not sell. Add at least one above."
          emptyIcon={ImageIcon}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
            {images.map((img, i) => (
              <div key={img.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="aspect-square bg-slate-50 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.altText || 'Product image'} className="w-full h-full object-contain" />
                  {img.isPrimary && (
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-white" />Primary
                    </span>
                  )}
                </div>
                <div className="p-2 space-y-2">
                  <p className="text-[11px] text-slate-500 truncate" title={img.altText}>{img.altText || '—'}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                      aria-label="Move earlier"
                      className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                    >
                      <ArrowLeft className="w-3 h-3 text-slate-500" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={busy || i === images.length - 1}
                      aria-label="Move later"
                      className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                    >
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </button>
                    {!img.isPrimary && (
                      <button
                        onClick={() => void run(() => sellerApi.setPrimaryProductImage(seller.sellerId, productId, img.id), 'Primary image updated')}
                        disabled={busy}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                        title="Make primary"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                      </button>
                    )}
                    <button
                      onClick={() => void run(() => sellerApi.deleteProductImage(seller.sellerId, productId, img.id), 'Image removed')}
                      disabled={busy}
                      className="p-1.5 rounded border border-slate-200 hover:bg-red-50 ml-auto"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SellerDataState>
      </div>

      <Spin360Panel productId={productId} sellerId={seller.sellerId} onSaved={say} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/**
 * The 360° frame sequence for this listing.
 *
 * Separate from the gallery on purpose: these frames are a rotation, not
 * photographs to browse, and mixing them into `product_images` would bury the
 * real product shots under three dozen near-identical thumbnails. The
 * storefront shows its 360° control only when a sequence is saved here, so the
 * feature never promises a rotation a product does not have.
 */
function Spin360Panel({ sellerId, productId, onSaved }: { sellerId: string; productId: string; onSaved: (m: string) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const res = useSellerData<{ data: string[] }>(
    (id) => sellerApi.getProductSpin360(id, productId) as any,
    [productId],
  );
  const frames = (res.data?.data ?? []) as string[];

  // Seed the editor from what is saved, once the first load lands.
  useEffect(() => { if (frames.length && !text) setText(frames.join("\n")); }, [frames, text]);

  const urls = text.split(/\s+/).map((u) => u.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await sellerApi.setProductSpin360(sellerId, productId, urls);
      res.reload();
      onSaved(urls.length ? `${urls.length} frames saved` : "360° view removed");
    } catch (e) {
      // The server rejects a sequence that is too short to read as a rotation,
      // and any non-http URL. Show what it said rather than a generic failure.
      setError(e instanceof Error ? e.message : "The frames could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-blue-600" aria-hidden />360° view
        </h2>
        {frames.length > 0 && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            Live · {frames.length} frames
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        One image URL per line, in rotation order. Needs at least 8 frames (24–36 is typical); leave empty to remove the 360° view.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        spellCheck={false}
        aria-label="360 degree frame URLs"
        placeholder={"https://…/spin-01.jpg\nhttps://…/spin-02.jpg"}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-bold"
        >
          <Save className="w-4 h-4" />{saving ? "Saving…" : "Save 360° frames"}
        </button>
        <span className="text-xs text-slate-400">{urls.length} URL{urls.length === 1 ? "" : "s"} entered</span>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}

      {frames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
          {frames.slice(0, 12).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`Frame ${i + 1}`} className="w-14 h-14 shrink-0 rounded border border-slate-200 object-contain bg-slate-50" />
          ))}
          {frames.length > 12 && <span className="text-xs text-slate-400 self-center shrink-0">+{frames.length - 12}</span>}
        </div>
      )}
    </div>
  );
}
