/** Compact estimate payload for URL sharing (no backend needed) */
export interface ShareableEstimateData {
  /** estimate number (id prefix) */
  n: string;
  /** customer name */
  c: string;
  /** line items: [name, qty, unitPrice][] */
  li: [string, number, number][];
  /** subtotal */
  st: number;
  /** tax rate */
  tr: number;
  /** tax amount */
  ta: number;
  /** total */
  t: number;
  /** notes */
  no?: string;
  /** expires at (YYYY-MM-DD) */
  ex: string;
  /** created at (YYYY-MM-DD) */
  dt: string;
  /** business name */
  bn?: string;
}

/** Compact invoice payload for URL sharing (no backend needed) */
export interface ShareableInvoiceData {
  /** invoice number */
  n: string;
  /** customer name */
  c: string;
  /** line items: [name, qty, unitPrice][] */
  li: [string, number, number][];
  /** subtotal */
  st: number;
  /** tax rate */
  tr: number;
  /** tax amount */
  ta: number;
  /** total */
  t: number;
  /** notes */
  no?: string;
  /** payment terms */
  pt?: string;
  /** due date (YYYY-MM-DD) */
  dd?: string;
  /** created at (YYYY-MM-DD) */
  dt: string;
  /** status */
  s: string;
  /** business name */
  bn?: string;
}
