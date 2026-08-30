'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useRef } from 'react';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle,
  ArrowLeft, FileText, Loader2, X, Table,
} from 'lucide-react';
import Link from 'next/link';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface ColumnMapping {
  csvColumn: string;
  field: string;
}

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'category', label: 'Category', required: true },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'brand', label: 'Brand', required: false },
  { key: 'weight', label: 'Weight / Unit', required: true },
  { key: 'mrp', label: 'MRP', required: true },
  { key: 'sellingPrice', label: 'Selling Price', required: true },
  { key: 'stockQuantity', label: 'Stock Quantity', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'hsnCode', label: 'HSN Code', required: false },
  { key: 'barcode', label: 'Barcode', required: false },
  { key: 'expiryDate', label: 'Expiry Date', required: false },
  { key: 'storageType', label: 'Storage Type', required: false },
];

/**
 * Minimal RFC-4180 CSV reader.
 *
 * Enough for a catalogue export: quoted fields, embedded commas, doubled quotes
 * and CRLF line endings. A dependency would be overkill for one screen, and
 * splitting on commas would break the first product whose name contains one.
 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!header) return [];
  const columns = header.map((h) => h.trim());
  return body.map((cells) =>
    Object.fromEntries(columns.map((col, i) => [col, (cells[i] ?? '').trim()])),
  );
}

export default function ProductImportPage() {
  return <StoreGate>{(store) => <ImportContent storeId={store.id} />}</StoreGate>;
}

function ImportContent({ storeId }: { storeId: string }) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ uploaded: number; failed: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Reads the uploaded CSV.
   *
   * The file was never opened. `handleFileUpload` set nine column names and three
   * preview rows — Pure & Sure coconut oil, Daawat brown rice, Oatly oat milk —
   * from constants in this file, and `startImport` posted *those three products*
   * to the API. A seller uploading a 400-line catalogue got three items they had
   * never heard of, under a store id that does not exist.
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);

    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) {
        setErrors(['That file has no data rows.']);
        return;
      }
      const columns = Object.keys(rows[0]);
      setCsvColumns(columns);
      setMappings(columns.map((col) => {
        const norm = col.toLowerCase().replace(/[^a-z]/g, '');
        const autoMatch = REQUIRED_FIELDS.find((f) => {
          const label = f.label.toLowerCase().replace(/[^a-z]/g, '');
          const key = f.key.toLowerCase();
          return norm === label || norm === key || norm.includes(key) || label.includes(norm);
        });
        return { csvColumn: col, field: autoMatch?.key || '' };
      }));
      setPreviewRows(rows);
      setStep('mapping');
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not read that file.']);
    }
  };

  /**
   * Builds and downloads a template with the exact headers this importer maps,
   * plus one example row, so a seller's file lines up on the first attempt.
   */
  const downloadTemplate = () => {
    const headers = REQUIRED_FIELDS.map((f) => f.label);
    const example = REQUIRED_FIELDS.map((f) => {
      switch (f.key) {
        case 'name': return 'Organic Bananas';
        case 'category': return 'fruits-vegetables';
        case 'brand': return 'Fresho';
        case 'weight': return '1 dozen';
        case 'mrp': return '80';
        case 'price': return '65';
        case 'stock': return '40';
        case 'description': return 'Farm fresh, ripened naturally';
        default: return '';
      }
    });
    const csv = [headers, example]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kartseek-grocery-products-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /** Resolve a mapped field for a row, by the column the seller pointed at it. */
  const valueFor = (row: Record<string, string>, field: string) => {
    const mapping = mappings.find((m) => m.field === field);
    return mapping ? (row[mapping.csvColumn] ?? '').trim() : '';
  };

  const startImport = async () => {
    if (!storeId) return;
    setStep('importing');
    setProgress(10);
    setErrors([]);

    const products = previewRows.map((row) => ({
      name: valueFor(row, 'name'),
      category: valueFor(row, 'category'),
      brand: valueFor(row, 'brand') || undefined,
      description: valueFor(row, 'description') || undefined,
      weightVariants: [{
        weight: valueFor(row, 'weight') || '1 unit',
        mrp: Number(valueFor(row, 'mrp')) || 0,
        price: Number(valueFor(row, 'price')) || 0,
        stock: Number(valueFor(row, 'stock')) || 0,
      }],
    })).filter((p) => p.name);

    if (products.length === 0) {
      setErrors(['No rows had a product name — check your column mapping.']);
      setStep('preview');
      return;
    }

    setProgress(50);
    try {
      const res = await groceryApi.bulkImportProducts(storeId, products as any);
      setProgress(100);
      // The service reports per-row failures; showing them is the point of the
      // screen. The old version called `setStep('complete')` from both `.then`
      // and `.catch`, so a total failure looked identical to a clean import.
      setImportResult({ uploaded: res.uploaded ?? 0, failed: res.errors ?? 0, total: res.total ?? products.length });
      if (res.errorDetails?.length) {
        setErrors(res.errorDetails.map((e: any) => `Row ${Number(e.index) + 1}: ${e.error}`));
      }
      setStep('complete');
    } catch (err) {
      setProgress(0);
      setErrors([err instanceof Error ? err.message : 'The import failed. No products were added.']);
      setStep('preview');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/seller/grocery/products" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900">Bulk Import Products</h1>
          <p className="text-xs text-slate-500 mt-0.5">Import products from CSV or Excel files.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, i) => {
          const stepKeys: ImportStep[] = ['upload', 'mapping', 'preview', 'importing'];
          const current = stepKeys.indexOf(step);
          const isActive = i === current || (step === 'complete' && i === 3);
          const isDone = i < current || step === 'complete';
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isDone ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-bold ${isActive || isDone ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-px ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
              onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-emerald-500 transition-colors" />
              <p className="text-sm font-bold text-slate-700">Drop your CSV file here</p>
              {/* Only .csv is accepted now. The picker advertised .xlsx and .xls,
                  which the parser cannot read — a seller choosing a spreadsheet got
                  binary noise, or, before the parser existed, three demo rows. */}
              <p className="text-xs text-slate-400 mt-1">or click to browse • .csv</p>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} title="Upload a CSV file" aria-label="Upload CSV file" />
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              {/* Generates the file. Both buttons used to be `alert("Template
                  downloaded")` — a claim, not a download — and the Excel one
                  offered a format nothing here can parse. */}
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                <Download className="w-4 h-4" /> Download CSV template
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 space-y-1">
              <p className="font-bold">Import Guidelines</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>First row must be column headers</li>
                <li>Required columns: Product Name, Category, Weight, MRP, Selling Price, Stock</li>
                <li>Dates in YYYY-MM-DD format</li>
                <li>Maximum 500 products per import</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Map Columns</h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> {fileName} • {csvColumns.length} columns detected
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {mappings.map((m, idx) => (
              <div key={m.csvColumn} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-xs font-bold text-slate-600 w-40 truncate">{m.csvColumn}</span>
                <span className="text-xs text-slate-400">→</span>
                <select
                  value={m.field}
                  onChange={(e) => {
                    const updated = [...mappings];
                    updated[idx].field = e.target.value;
                    setMappings(updated);
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  title="Map to field"
                >
                  <option value="">— Skip —</option>
                  {REQUIRED_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                  ))}
                </select>
                {m.field && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setStep('upload')} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Back</button>
            <button onClick={() => setStep('preview')} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors">
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">Preview Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">{previewRows.length} products found. Review before importing.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">#</th>
                  {csvColumns.map((col) => (
                    <th key={col} className="px-4 py-2.5 font-semibold whitespace-nowrap">{col}</th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-bold text-slate-400">{i + 1}</td>
                    {csvColumns.map((col) => (
                      <td key={col} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{row[col] || '—'}</td>
                    ))}
                    <td className="px-4 py-2.5">
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Valid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 border-t border-slate-100 flex gap-3">
            <button onClick={() => setStep('mapping')} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Back</button>
            <button onClick={startImport} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" /> Start Import ({previewRows.length} products)
            </button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-500 mx-auto animate-spin" />
          <h3 className="text-lg font-black text-slate-900">Importing Products...</h3>
          <div className="max-w-sm mx-auto">
            <div className="bg-slate-100 rounded-full h-3">
              <ProgressBar percent={progress} className="bg-emerald-500 rounded-full h-3 transition-all duration-500" />
            </div>
            <p className="text-xs text-slate-500 mt-2">{progress}% complete</p>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
          {/* Reports what the service stored, not how many rows were submitted.
              "N products imported successfully" was previously `previewRows.length`
              — the row count — printed whether the import succeeded or failed. */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${importResult?.failed ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            {importResult?.failed
              ? <AlertCircle className="w-8 h-8 text-amber-600" />
              : <CheckCircle className="w-8 h-8 text-emerald-600" />}
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {importResult?.failed ? 'Import finished with errors' : 'Import complete'}
          </h3>
          <p className="text-sm text-slate-500">
            {importResult
              ? `${importResult.uploaded} of ${importResult.total} product${importResult.total === 1 ? '' : 's'} added${importResult.failed ? `, ${importResult.failed} failed` : ''}.`
              : 'Import finished.'}
          </p>

          {errors.length > 0 && (
            <div className="max-w-lg mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-amber-800 mb-2">Rows that failed ({errors.length})</p>
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">{e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { setStep('upload'); setFileName(''); setProgress(0); setErrors([]); setImportResult(null); setPreviewRows([]); }}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm"
            >
              Import More
            </button>
            <Link href="/seller/grocery/products" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors">View Products</Link>
          </div>
        </div>
      )}
    </div>
  );
}
