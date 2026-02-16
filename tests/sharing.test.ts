import { describe, it, expect } from 'vitest';
import {
  buildShareableData,
  encodeEstimateData,
  decodeEstimateData,
  expandLineItems,
  SHARE_BASE_URL,
} from '../lib/estimateSharing';
import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  expandInvoiceLineItems,
} from '../lib/invoiceSharing';
import type { Estimate, Invoice, LineItem } from '../lib/types';

const lineItems: LineItem[] = [
  { id: '1', name: 'Pressure Wash', quantity: 1, unitPrice: 150, total: 150 },
  { id: '2', name: 'Sealing', quantity: 2, unitPrice: 75, total: 150 },
];

const estimate: Estimate = {
  id: 'est-12345678-abcd',
  customerId: 'c1',
  lineItems,
  subtotal: 300,
  taxRate: 0.08,
  taxAmount: 24,
  total: 324,
  notes: 'Test note',
  status: 'sent',
  expiresAt: '2026-03-01T00:00:00Z',
  createdAt: '2026-02-16T00:00:00Z',
  updatedAt: '2026-02-16T00:00:00Z',
};

describe('estimateSharing', () => {
  it('buildShareableData creates compact format', () => {
    const data = buildShareableData(estimate, 'John Doe', 'ACME');
    expect(data.n).toBe('EST-1234');
    expect(data.c).toBe('John Doe');
    expect(data.li).toHaveLength(2);
    expect(data.li[0]).toEqual(['Pressure Wash', 1, 150]);
    expect(data.t).toBe(324);
    expect(data.bn).toBe('ACME');
  });

  it('encode then decode round-trips', () => {
    const data = buildShareableData(estimate, 'Jane', 'Biz');
    const encoded = encodeEstimateData(data);
    const decoded = decodeEstimateData(encoded);
    expect(decoded).toEqual(data);
  });

  it('decodeEstimateData returns null for garbage', () => {
    expect(decodeEstimateData('not-valid-base64!!!')).toBeNull();
  });

  it('expandLineItems reconstructs from compact format', () => {
    const compact: [string, number, number][] = [['Mowing', 1, 50]];
    const items = expandLineItems(compact);
    expect(items[0].name).toBe('Mowing');
    expect(items[0].total).toBe(50);
    expect(items[0].id).toBe('0');
  });
});

const invoice: Invoice = {
  id: 'inv-12345678-abcd',
  customerId: 'c1',
  jobId: 'j1',
  invoiceNumber: 'INV-001',
  lineItems,
  subtotal: 300,
  taxRate: 0.08,
  taxAmount: 24,
  total: 324,
  status: 'sent',
  paymentTerms: 'Net 30',
  dueDate: '2026-03-16T00:00:00Z',
  createdAt: '2026-02-16T00:00:00Z',
  updatedAt: '2026-02-16T00:00:00Z',
};

describe('invoiceSharing', () => {
  it('buildShareableInvoiceData creates compact format', () => {
    const data = buildShareableInvoiceData(invoice, 'John Doe', 'ACME');
    expect(data.n).toBe('INV-001');
    expect(data.c).toBe('John Doe');
    expect(data.t).toBe(324);
    expect(data.pt).toBe('Net 30');
    expect(data.dd).toBe('2026-03-16');
  });

  it('encode then decode round-trips', () => {
    const data = buildShareableInvoiceData(invoice, 'Jane');
    const encoded = encodeInvoiceData(data);
    const decoded = decodeInvoiceData(encoded);
    expect(decoded).toEqual(data);
  });

  it('decodeInvoiceData returns null for garbage', () => {
    expect(decodeInvoiceData('garbage!')).toBeNull();
  });

  it('expandInvoiceLineItems reconstructs correctly', () => {
    const compact: [string, number, number][] = [['Service', 2, 100]];
    const items = expandInvoiceLineItems(compact);
    expect(items[0].total).toBe(200);
    expect(items[0].quantity).toBe(2);
  });
});
