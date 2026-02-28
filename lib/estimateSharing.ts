import { Estimate, LineItem } from './types';
import type { ShareableEstimateData } from '../shared/types';
import { encodeEstimateData } from '../shared/estimateEncoding';

// Re-export shared types and encoding functions
export type { ShareableEstimateData } from '../shared/types';
export { encodeEstimateData, decodeEstimateData } from '../shared/estimateEncoding';

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
