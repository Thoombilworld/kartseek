/**
 * Download the rows a page is already showing as a CSV file.
 *
 * Eight "Export" buttons across the seller portal had no `onClick` — Orders,
 * Returns, Refunds, Commissions, Transactions, Inventory, Shipping and
 * Disputes. Each sits on a page that has already loaded and filtered exactly
 * the rows the seller wants, so asking the server to re-derive that list would
 * be the long way round and would need eight endpoints that do not exist.
 *
 * Deliberately client-side, and deliberately shared: eight hand-rolled CSV
 * builders would each get the quoting subtly wrong.
 */

/** Escape one cell for RFC 4180: wrap in quotes, double any quote inside. */
function cell(value: unknown): string {
  if (value == null) return '""';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  /** Column heading. */
  header: string;
  /** Value for one row. Return a primitive; formatting belongs here, not in the caller. */
  value: (row: T) => unknown;
}

/**
 * Build a CSV string from typed rows.
 *
 * CRLF line endings and a UTF-8 BOM, because the overwhelming majority of these
 * files are opened in Excel, which reads a BOM-less UTF-8 CSV as the system
 * codepage and mangles every non-ASCII name, address and currency symbol.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => cell(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(',')),
  ];
  return `﻿${lines.join('\r\n')}`;
}

/**
 * Build and download a CSV.
 *
 * `filename` gets today's date and a `.csv` suffix appended, so a seller who
 * exports weekly ends up with files that sort chronologically instead of eight
 * copies of `export (3).csv`.
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  // Without this the blob is held for the lifetime of the document; a seller
  // exporting repeatedly on one page visit leaks each file.
  URL.revokeObjectURL(url);
}
