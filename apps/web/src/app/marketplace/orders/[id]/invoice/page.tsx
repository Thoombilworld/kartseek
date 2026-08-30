'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileWarning } from 'lucide-react';
import { api, ApiError } from '@/lib/api-endpoints';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { formatDate } from '@/lib/utils';
import { getSellerTaxIdLabel } from '@/lib/localization';

interface InvoiceLine {
  sno: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** The supplying merchant, as a tax invoice must identify them. */
interface InvoiceSeller {
  id: string | null;
  name: string | null;
  storeSlug: string | null;
  address: Record<string, string | undefined> | null;
  /** GST number in India, CR number in Qatar, TRN in the UAE — labelled by region. */
  taxId: string | null;
  email: string | null;
  phone: string | null;
  regionCode: string | null;
}

interface Invoice {
  invoiceNumber: string;
  seller?: InvoiceSeller | null;
  orderId: string;
  orderDate: string | null;
  invoiceDate: string;
  buyerName: string;
  buyerAddress: Record<string, string | undefined>;
  sellerName: string;
  sellerGstin?: string;
  items: InvoiceLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  /** "VAT", "GST", "Sales Tax" — or null where the market levies none. */
  taxLabel?: string | null;
  regionCode?: string | null;
}

/** Join the address parts the checkout actually stores, skipping the blanks. */
function addressLines(addr: Record<string, string | undefined> | undefined): string[] {
  if (!addr) return [];
  const line = addr.line ?? addr.line1 ?? addr.address;
  const locality = [addr.city, addr.state, addr.pin ?? addr.pincode ?? addr.postalCode]
    .filter(Boolean).join(', ');
  return [line, locality, addr.country].filter((v): v is string => Boolean(v && v.trim()));
}

export default function InvoicePage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { isAuthenticated, isHydrated } = useAuth();
  const { formatCurrencyValue, country } = useRegion();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Load the invoice.
   *
   * The bare `fetch` this replaces sent no `Authorization` header and never
   * checked `res.ok`, so a 401 body was handed straight to `setInvoice` — a
   * truthy object — and the page rendered a "TAX INVOICE" with every field
   * `undefined` instead of saying anything was wrong. It also skipped the
   * gateway's `{ success, data }` envelope, so even a successful response left
   * every field blank. `api.get` handles the header, the status and the
   * envelope.
   */
  useEffect(() => {
    if (!orderId || !isHydrated) return;
    if (!isAuthenticated) {
      setError('Please sign in to view this invoice.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get<Invoice>(`/marketplace/orders/${orderId}/invoice`)
      .then((data) => { if (!cancelled) { setInvoice(data); setError(''); } })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404
          ? 'Invoice not found. This order may not exist, or it is not on your account.'
          : 'We could not load this invoice right now. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId, isAuthenticated, isHydrated]);

  const buyerLines = addressLines(invoice?.buyerAddress);

  /**
   * Seller identity for the document.
   *
   * The tax-registration *label* comes from the seller's own region, not the
   * viewer's: an Indian merchant's GSTIN is still a GSTIN when the invoice is
   * read in Doha. Falls back to the invoice's currency region, then to the
   * viewer's, so a seller row missing `regionCode` still gets a sensible label
   * rather than none.
   */
  const seller = invoice?.seller ?? null;
  const sellerName = seller?.name ?? invoice?.sellerName ?? 'Seller';
  const sellerLines = addressLines(seller?.address ?? undefined);
  const sellerTaxId = seller?.taxId ?? invoice?.sellerGstin ?? null;
  // Not `invoice.currency` — that is a currency code (QAR), not a region, and
  // asking for the tax label of "QAR" yields nothing.
  const taxRegion = seller?.regionCode ?? country.code;
  const taxIdLabel = getSellerTaxIdLabel(taxRegion) ?? 'Tax registration';

  return (
    /* A tax invoice is a document people print and file, so it is laid out on
       white with print rules that drop the chrome — the previous dark gradient
       rendered as a wall of ink and made the figures unreadable on paper. */
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href="/marketplace/orders"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <button
            onClick={() => window.print()}
            disabled={!invoice}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Print / Download
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4 animate-pulse">
            <div className="h-6 w-40 bg-slate-200 rounded-sm" />
            <div className="h-3 w-64 bg-slate-100 rounded-sm" />
            <div className="h-32 bg-slate-100 rounded-sm" />
            <div className="h-24 bg-slate-100 rounded-sm" />
          </div>
        ) : error || !invoice ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <FileWarning className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">{error || 'Invoice not found'}</p>
          </div>
        ) : (
          <article className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:rounded-none print:p-0 text-slate-900">
            {/* Header */}
            <header className="flex flex-wrap justify-between gap-6 pb-6 mb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">TAX INVOICE</h1>
                <dl className="mt-2 text-sm text-slate-600 space-y-0.5">
                  <div className="flex gap-2"><dt className="text-slate-400">Invoice</dt><dd className="font-mono">{invoice.invoiceNumber}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Order</dt><dd className="font-mono">{invoice.orderId}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Order date</dt><dd>{formatDate(invoice.orderDate)}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Invoice date</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
                </dl>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{sellerName}</p>
                {/* A tax registration is a legal assertion, so it prints only
                    when the API supplies a real one — and under the name its own
                    jurisdiction uses. The hardcoded "GSTIN" that stood here was
                    wrong everywhere outside India: Qatar issues a Commercial
                    Registration number, the UAE a TRN. `getSellerTaxIdLabel`
                    resolves it from the seller's own region. */}
                {sellerTaxId && (
                  <p className="text-sm text-slate-500 mt-0.5">{taxIdLabel}: {sellerTaxId}</p>
                )}
              </div>
            </header>

            {/* Buyer / Seller */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Bill To</h2>
                <p className="font-semibold">{invoice.buyerName}</p>
                {buyerLines.length > 0
                  ? buyerLines.map((l) => <p key={l} className="text-sm text-slate-600">{l}</p>)
                  : <p className="text-sm text-slate-400 italic">No address recorded on this order.</p>}
              </section>
              <section className="sm:text-right">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Sold By</h2>
                {/* The supplying merchant in full. This was a single line — the
                    trading name and nothing else — which is not enough for the
                    document to function as an invoice: the buyer cannot tell who
                    they contracted with, where that party is registered, or how
                    to reach them. */}
                <p className="font-semibold">{sellerName}</p>
                {sellerLines.map((l) => <p key={l} className="text-sm text-slate-600">{l}</p>)}
                {sellerTaxId && (
                  <p className="text-sm text-slate-600 mt-1">{taxIdLabel}: {sellerTaxId}</p>
                )}
                {seller?.email && <p className="text-sm text-slate-500">{seller.email}</p>}
                {seller?.phone && <p className="text-sm text-slate-500">{seller.phone}</p>}
                {!seller && (
                  <p className="text-sm text-slate-400 italic">
                    Seller details unavailable for this order.
                  </p>
                )}
              </section>
            </div>

            {/* Items */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    <th scope="col" className="py-2 pr-2 font-semibold text-xs uppercase tracking-wide text-slate-400 w-8">#</th>
                    <th scope="col" className="py-2 px-2 font-semibold text-xs uppercase tracking-wide text-slate-400">Item</th>
                    <th scope="col" className="py-2 px-2 font-semibold text-xs uppercase tracking-wide text-slate-400 text-right">Qty</th>
                    <th scope="col" className="py-2 px-2 font-semibold text-xs uppercase tracking-wide text-slate-400 text-right">Unit Price</th>
                    <th scope="col" className="py-2 pl-2 font-semibold text-xs uppercase tracking-wide text-slate-400 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item) => (
                    <tr key={item.sno} className="border-b border-slate-100">
                      <td className="py-2.5 pr-2 text-slate-400">{item.sno}</td>
                      <td className="py-2.5 px-2">{item.name}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{formatCurrencyValue(item.unitPrice)}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold tabular-nums">{formatCurrencyValue(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="ml-auto w-full sm:w-72 border-t-2 border-slate-200 pt-3">
              {/* Only rows the order actually carries. The fixed "CGST (9%)" /
                  "SGST (9%)" pair that used to sit here printed an Indian tax
                  split onto every invoice regardless of the market the order was
                  placed in, and the figures behind it were recomputed at a flat
                  18% rather than taken from what the customer was charged. */}
              {[
                { label: 'Subtotal', value: invoice.subtotal },
                { label: 'Delivery', value: invoice.deliveryFee },
                { label: 'Discount', value: invoice.discount ? -invoice.discount : 0 },
                // Named by the jurisdiction that charged it. A generic "Tax"
                // heading is wrong on a VAT invoice, which has to identify the
                // tax by name to be a valid document.
                { label: invoice.taxLabel || 'Tax', value: invoice.taxAmount },
              ].filter((row) => Number(row.value)).map((row) => (
                <div key={row.label} className="flex justify-between py-1 text-sm text-slate-600">
                  <span>{row.label}</span>
                  <span className="tabular-nums">{formatCurrencyValue(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 mt-2 pt-3 text-lg font-black">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatCurrencyValue(invoice.grandTotal)}</span>
              </div>
            </div>

            <p className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              This is a computer-generated invoice and does not require a signature.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
