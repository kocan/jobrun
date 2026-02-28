import { Invoice, LineItem } from './types';
import type { ShareableInvoiceData } from '../shared/types';
import { encodeInvoiceData } from '../shared/invoiceEncoding';

// Re-export shared types and encoding functions
export type { ShareableInvoiceData } from '../shared/types';
export { encodeInvoiceData, decodeInvoiceData } from '../shared/invoiceEncoding';

export const SHARE_BASE_URL = 'https://jobrun.app';

export function buildShareableInvoiceData(
  invoice: Invoice,
  customerName: string,
  businessName?: string,
): ShareableInvoiceData {
  return {
    n: invoice.invoiceNumber,
    c: customerName,
    li: invoice.lineItems.map((li) => [li.name, li.quantity, li.unitPrice]),
    st: invoice.subtotal,
    tr: invoice.taxRate,
    ta: invoice.taxAmount,
    t: invoice.total,
    no: invoice.notes || undefined,
    pt: invoice.paymentTerms || undefined,
    dd: invoice.dueDate?.split('T')[0],
    dt: invoice.createdAt.split('T')[0],
    s: invoice.status,
    bn: businessName || undefined,
  };
}

export function buildInvoiceShareUrl(invoice: Invoice, customerName: string, businessName?: string): string {
  const data = buildShareableInvoiceData(invoice, customerName, businessName);
  const encoded = encodeInvoiceData(data);
  return `${SHARE_BASE_URL}/view/invoice/${invoice.id.substring(0, 8)}?d=${encoded}`;
}

export function buildInvoiceShareMessage(invoice: Invoice, customerName: string, businessName: string = 'our company'): string {
  const url = buildInvoiceShareUrl(invoice, customerName, businessName !== 'our company' ? businessName : undefined);
  return `Here's your invoice from ${businessName}: ${url}`;
}

/** Reconstruct line items from compact format */
export function expandInvoiceLineItems(compact: [string, number, number][]): LineItem[] {
  return compact.map(([name, quantity, unitPrice], i) => ({
    id: String(i),
    name,
    quantity,
    unitPrice,
    total: Math.round(quantity * unitPrice * 100) / 100,
  }));
}
