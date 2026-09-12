'use client';
import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  X,
  Plus,
  Printer,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB' };

type Invoice = {
  id: string;
  orderId: string;
  seller: string;
  sellerGstin: string;
  buyer: string;
  buyerGstin: string;
  country: string;
  invoiceDate: string;
  dueDate: string;
  items: {
    name: string;
    hsn: string;
    qty: number;
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  status: 'Generated' | 'Sent' | 'Acknowledged' | 'Overdue' | 'Cancelled';
  type: 'B2B' | 'B2C' | 'Credit Note' | 'Debit Note';
  eWayBill?: string;
  irn?: string;
};

const INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001',
    orderId: 'ORD-8890',
    seller: 'Apple India Store',
    sellerGstin: '29AABCU9603R1ZM',
    buyer: 'Rohit Sharma',
    buyerGstin: '',
    country: 'India',
    invoiceDate: '2026-06-06',
    dueDate: '2026-06-20',
    items: [
      {
        name: 'iPhone 15 Pro',
        hsn: '8517',
        qty: 1,
        rate: 114322,
        taxableValue: 114322,
        cgst: 10289,
        sgst: 10289,
        igst: 0,
        total: 134900,
      },
    ],
    subtotal: 114322,
    totalTax: 20578,
    grandTotal: 134900,
    status: 'Generated',
    type: 'B2C',
    irn: 'IRN-AF82B4',
  },
  {
    id: 'INV-2026-002',
    orderId: 'ORD-8885',
    seller: 'Samsung Store',
    sellerGstin: '27AABCS1429B1ZK',
    buyer: 'TechGiant Store',
    buyerGstin: '29AADCG3456R1ZP',
    country: 'India',
    invoiceDate: '2026-06-05',
    dueDate: '2026-06-19',
    items: [
      {
        name: 'Galaxy S24 Ultra',
        hsn: '8517',
        qty: 5,
        rate: 67796,
        taxableValue: 338980,
        cgst: 30508,
        sgst: 30508,
        igst: 0,
        total: 399996,
      },
    ],
    subtotal: 338980,
    totalTax: 61016,
    grandTotal: 399996,
    status: 'Sent',
    type: 'B2B',
    irn: 'IRN-CD93E7',
    eWayBill: 'EWB-1234567890',
  },
  {
    id: 'INV-2026-003',
    orderId: 'ORD-8880',
    seller: 'Nike Official',
    sellerGstin: '07AABCN4567D1Z3',
    buyer: 'Sneha Nair',
    buyerGstin: '',
    country: 'India',
    invoiceDate: '2026-06-04',
    dueDate: '2026-06-18',
    items: [
      {
        name: 'Air Jordan 1 Retro',
        hsn: '6402',
        qty: 2,
        rate: 14403,
        taxableValue: 28806,
        cgst: 2592,
        sgst: 2592,
        igst: 0,
        total: 33990,
      },
    ],
    subtotal: 28806,
    totalTax: 5184,
    grandTotal: 33990,
    status: 'Acknowledged',
    type: 'B2C',
    irn: 'IRN-EF04A1',
  },
  {
    id: 'CN-2026-001',
    orderId: 'ORD-8870',
    seller: 'Heritage Silk House',
    sellerGstin: '33AABCH7890E1ZQ',
    buyer: 'Priya Menon',
    buyerGstin: '',
    country: 'India',
    invoiceDate: '2026-06-03',
    dueDate: '2026-06-17',
    items: [
      {
        name: 'Silk Saree — Returned',
        hsn: '6204',
        qty: 1,
        rate: 7627,
        taxableValue: 7627,
        cgst: 686,
        sgst: 686,
        igst: 0,
        total: 8999,
      },
    ],
    subtotal: 7627,
    totalTax: 1372,
    grandTotal: 8999,
    status: 'Generated',
    type: 'Credit Note',
  },
  {
    id: 'INV-2026-004',
    orderId: 'ORD-8878',
    seller: 'Gulf Electronics FZE',
    sellerGstin: '',
    buyer: 'Ahmed Al-Farsi',
    buyerGstin: '',
    country: 'UAE',
    invoiceDate: '2026-06-02',
    dueDate: '2026-06-16',
    items: [
      {
        name: 'Dyson V15 Detect',
        hsn: '8508',
        qty: 1,
        rate: 49524,
        taxableValue: 49524,
        cgst: 0,
        sgst: 0,
        igst: 2476,
        total: 52000,
      },
    ],
    subtotal: 49524,
    totalTax: 2476,
    grandTotal: 52000,
    status: 'Sent',
    type: 'B2C',
  },
];

const STATUS_STYLES: Record<string, string> = {
  Generated: 'bg-blue-50 text-blue-700',
  Sent: 'bg-emerald-50 text-emerald-700',
  Acknowledged: 'bg-purple-50 text-purple-700',
  Overdue: 'bg-red-50 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-500',
};
const TYPE_STYLES: Record<string, string> = {
  B2B: 'bg-indigo-50 text-indigo-700',
  B2C: 'bg-blue-50 text-blue-700',
  'Credit Note': 'bg-red-50 text-red-700',
  'Debit Note': 'bg-amber-50 text-amber-700',
};

function InvoiceDrawer({
  inv: i,
  onClose,
  fmt,
}: {
  inv: Invoice;
  onClose: () => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{i.id}</h2>
            <p className="text-xs text-slate-500">
              {i.invoiceDate} · Order: {i.orderId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[i.status]}`}
            >
              {i.status}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_STYLES[i.type]}`}>
              {i.type}
            </span>
            {i.irn && (
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                IRN: {i.irn}
              </span>
            )}
            {i.eWayBill && (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
                E-Way: {i.eWayBill}
              </span>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Invoice Total</p>
            <p className="text-3xl font-black mt-1">{fmt(i.grandTotal)}</p>
            <p className="text-xs opacity-60 mt-1">
              Tax: {fmt(i.totalTax)} · Taxable: {fmt(i.subtotal)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Seller</p>
              <p className="text-xs font-bold text-slate-900">{i.seller}</p>
              {i.sellerGstin && (
                <p className="text-[10px] text-slate-400 font-mono">{i.sellerGstin}</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Buyer</p>
              <p className="text-xs font-bold text-slate-900">{i.buyer}</p>
              {i.buyerGstin && (
                <p className="text-[10px] text-slate-400 font-mono">{i.buyerGstin}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Line Items</h3>
            <div className="bg-slate-50 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-slate-500">Item</th>
                    <th className="px-3 py-2 text-center text-slate-500">HSN</th>
                    <th className="px-3 py-2 text-center text-slate-500">Qty</th>
                    <th className="px-3 py-2 text-right text-slate-500">Taxable</th>
                    <th className="px-3 py-2 text-right text-slate-500">Tax</th>
                    <th className="px-3 py-2 text-right text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {i.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 text-center font-mono text-blue-700">{item.hsn}</td>
                      <td className="px-3 py-2 text-center">{item.qty}</td>
                      <td className="px-3 py-2 text-right">{fmt(item.taxableValue)}</td>
                      <td className="px-3 py-2 text-right text-amber-600">
                        {fmt(item.cgst + item.sgst + item.igst)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-bold">{fmt(i.subtotal)}</span>
            </div>
            {i.items[0]?.cgst > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">CGST</span>
                <span className="font-bold text-blue-600">
                  {fmt(i.items.reduce((a, t) => a + t.cgst, 0))}
                </span>
              </div>
            )}
            {i.items[0]?.sgst > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">SGST</span>
                <span className="font-bold text-purple-600">
                  {fmt(i.items.reduce((a, t) => a + t.sgst, 0))}
                </span>
              </div>
            )}
            {i.items[0]?.igst > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">IGST/VAT</span>
                <span className="font-bold text-indigo-600">
                  {fmt(i.items.reduce((a, t) => a + t.igst, 0))}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="text-sm font-bold">Grand Total</span>
              <span className="text-sm font-black text-emerald-700">{fmt(i.grandTotal)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GstInvoicingPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
  } = useAdminData(() => adminMarketplaceApi.getOrders({ country }), [country]);
  const { filtered: regionFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(INVOICES);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((i) => {
    if (filter !== 'all' && i.type !== filter && i.status !== filter) return false;
    if (
      search &&
      !i.id.toLowerCase().includes(search.toLowerCase()) &&
      !i.seller.toLowerCase().includes(search.toLowerCase()) &&
      !i.buyer.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalTax = regionFiltered.reduce((a, i) => a + i.totalTax, 0);
  const totalValue = regionFiltered.reduce((a, i) => a + i.grandTotal, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">GST / Tax Invoicing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tax invoices, credit notes, e-way bills, and IRN management
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Total Invoiced</p>
          <p className="text-2xl font-black mt-1">{fmt(totalValue)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Tax Collected</p>
          <p className="text-xl font-black text-amber-600">{fmt(totalTax)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500">B2B Invoices</p>
          <p className="text-xl font-black text-indigo-600">
            {regionFiltered.filter((i) => i.type === 'B2B').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500">Credit Notes</p>
          <p className="text-xl font-black text-red-600">
            {regionFiltered.filter((i) => i.type === 'Credit Note').length}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice, seller, or buyer..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'B2B', 'B2C', 'Credit Note', 'Generated', 'Sent', 'Acknowledged'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Invoice</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">
                Seller / Buyer
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Taxable</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Tax</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <MarketplaceEmptyState title="No invoices found" icon={FileText} />
                </td>
              </tr>
            ) : (
              paged.map((i) => (
                <tr
                  key={i.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(i)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelected(i))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-xs">{i.id}</p>
                    <p className="text-[10px] text-slate-400">
                      {i.invoiceDate} · {i.orderId}
                    </p>
                    {i.irn && <p className="text-[10px] text-blue-600 font-mono">IRN: {i.irn}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-bold text-slate-900">{i.seller}</p>
                    <p className="text-[10px] text-slate-400">
                      → {i.buyer} ·{' '}
                      <CountryFlag code={COUNTRY_TO_CODE[i.country] || 'IN'} size="sm" />
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[i.type]}`}
                    >
                      {i.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-600">
                    {fmt(i.subtotal)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs font-bold text-amber-600">
                    {fmt(i.totalTax)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmt(i.grandTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[i.status]}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelected(i)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} invoices</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selected && <InvoiceDrawer inv={selected} onClose={() => setSelected(null)} fmt={fmt} />}
      <AdminToast toast={toast} />
    </div>
  );
}
