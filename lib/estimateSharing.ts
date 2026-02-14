import { Estimate, LineItem } from './types';

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

export const SHARE_BASE_URL = 'https://jobrun.app';

export function buildShareableData(
  estimate: Estimate,
  customerName: string,
  businessName?: string,
): ShareableEstimateData {
  return {
    n: estimate.id.substring(0, 8).toUpperCase(),
    c: customerName,
    li: estimate.lineItems.map((li) => [li.name, li.quantity, li.unitPrice]),
    st: estimate.subtotal,
    tr: estimate.taxRate,
    ta: estimate.taxAmount,
    t: estimate.total,
    no: estimate.notes || undefined,
    ex: estimate.expiresAt.split('T')[0],
    dt: estimate.createdAt.split('T')[0],
    bn: businessName || undefined,
  };
}

export function encodeEstimateData(data: ShareableEstimateData): string {
  const json = JSON.stringify(data);
  // Use btoa-compatible encoding (works in RN and web)
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return encodeURIComponent(base64);
}

export function decodeEstimateData(encoded: string): ShareableEstimateData | null {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ShareableEstimateData;
  } catch {
    return null;
  }
}

export function buildShareUrl(estimate: Estimate, customerName: string, businessName?: string): string {
  const data = buildShareableData(estimate, customerName, businessName);
  const encoded = encodeEstimateData(data);
  return `${SHARE_BASE_URL}/view/estimate/${estimate.id.substring(0, 8)}?d=${encoded}`;
}

export function buildShareMessage(estimate: Estimate, customerName: string, businessName: string = 'our company'): string {
  const url = buildShareUrl(estimate, customerName, businessName !== 'our company' ? businessName : undefined);
  return `Here's your estimate from ${businessName}: ${url}`;
}

/** Reconstruct line items from compact format */
export function expandLineItems(compact: [string, number, number][]): LineItem[] {
  return compact.map(([name, quantity, unitPrice], i) => ({
    id: String(i),
    name,
    quantity,
    unitPrice,
    total: Math.round(quantity * unitPrice * 100) / 100,
  }));
}
