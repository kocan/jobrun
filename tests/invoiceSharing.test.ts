import { describe, it, expect } from 'vitest';
import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  expandInvoiceLineItems,
  buildInvoiceShareUrl,
  buildInvoiceShareMessage,
} from '../lib/invoiceSharing';
import { Invoice } from '../lib/types';

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  invoiceNumber: 'INV-001',
  customerId: 'c1',
  lineItems: [{ id: '1', name: 'Service', quantity: 1, unitPrice: 100, total: 100 }],
  subtotal: 100,
  taxRate: 0.1,
  taxAmount: 10,
  total: 110,
  status: 'sent',
  payments: [],
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
});

describe('buildShareableInvoiceData — edge cases', () => {
  it('maps line items to compact format', () => {
    const inv = makeInvoice();
    const data = buildShareableInvoiceData(inv, 'Customer');
    expect(data.li).toEqual([['Service', 1, 100]]);
    expect(data.t).toBe(110);
  });

  it('handles unicode customer name', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'José García 🏠');
    expect(data.c).toBe('José García 🏠');
  });

  it('handles empty notes as undefined', () => {
    const inv = makeInvoice({ notes: '' });
    const data = buildShareableInvoiceData(inv, 'C');
    expect(data.no).toBeUndefined();
  });

  it('handles missing dueDate', () => {
    const inv = makeInvoice({ dueDate: undefined });
    const data = buildShareableInvoiceData(inv, 'C');
    expect(data.dd).toBeUndefined();
  });

  it('omits businessName when not provided', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'C');
    expect(data.bn).toBeUndefined();
  });

  it('includes businessName when provided', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'C', 'Acme Inc');
    expect(data.bn).toBe('Acme Inc');
  });
});

describe('encodeInvoiceData / decodeInvoiceData — edge cases', () => {
  it('round-trips with unicode content', () => {
    const data = buildShareableInvoiceData(makeInvoice(), '日本語テスト', 'Ñoño Corp');
    const encoded = encodeInvoiceData(data);
    const decoded = decodeInvoiceData(encoded);
    expect(decoded?.c).toBe('日本語テスト');
    expect(decoded?.bn).toBe('Ñoño Corp');
  });

  it('returns null for invalid base64', () => {
    expect(decodeInvoiceData('!!!not-valid!!!')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeInvoiceData('')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const encoded = encodeURIComponent(btoa('not json'));
    expect(decodeInvoiceData(encoded)).toBeNull();
  });
});

describe('expandInvoiceLineItems — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(expandInvoiceLineItems([])).toEqual([]);
  });

  it('correctly calculates total with fractional cents', () => {
    const items = expandInvoiceLineItems([['Service', 3, 33.33]]);
    expect(items[0].total).toBe(99.99);
  });

  it('handles zero quantity', () => {
    const items = expandInvoiceLineItems([['Free', 0, 100]]);
    expect(items[0].total).toBe(0);
  });

  it('handles negative price', () => {
    const items = expandInvoiceLineItems([['Discount', 1, -50]]);
    expect(items[0].total).toBe(-50);
  });

  it('assigns sequential string IDs', () => {
    const items = expandInvoiceLineItems([['A', 1, 10], ['B', 1, 20]]);
    expect(items[0].id).toBe('0');
    expect(items[1].id).toBe('1');
  });
});

describe('buildInvoiceShareUrl — edge cases', () => {
  it('contains the invoice ID prefix', () => {
    const url = buildInvoiceShareUrl(makeInvoice(), 'Customer');
    expect(url).toContain('/view/invoice/abcdef12');
  });

  it('contains encoded data parameter', () => {
    const url = buildInvoiceShareUrl(makeInvoice(), 'Customer');
    expect(url).toContain('?d=');
  });
});

describe('buildInvoiceShareMessage — edge cases', () => {
  it('uses default company name', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'Customer');
    expect(msg).toContain('our company');
  });

  it('uses custom business name', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'Customer', 'Bob\'s Cleaning');
    expect(msg).toContain("Bob's Cleaning");
    expect(msg).not.toContain('our company');
  });

  it('includes a valid URL', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'C');
    expect(msg).toContain('https://jobrun.app/view/invoice/');
  });
});
