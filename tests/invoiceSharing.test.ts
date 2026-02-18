import { describe, it, expect } from 'vitest';
import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  expandInvoiceLineItems,
  buildInvoiceShareUrl,
  buildInvoiceShareMessage,
  SHARE_BASE_URL,
} from '../lib/invoiceSharing';
import type { Invoice, LineItem } from '../lib/types';

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-12345678-abcd-efgh',
  invoiceNumber: 'INV-001',
  customerId: 'c1',
  lineItems: [
    { id: '1', name: 'Service A', quantity: 1, unitPrice: 100, total: 100 },
  ],
  subtotal: 100,
  taxRate: 0.1,
  taxAmount: 10,
  total: 110,
  status: 'sent',
  payments: [],
  createdAt: '2026-02-18T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
  ...overrides,
});

describe('invoiceSharing edge cases', () => {
  describe('buildShareableInvoiceData', () => {
    it('omits notes when empty string', () => {
      const inv = makeInvoice({ notes: '' });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.no).toBeUndefined();
    });

    it('omits paymentTerms when undefined', () => {
      const inv = makeInvoice({ paymentTerms: undefined });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.pt).toBeUndefined();
    });

    it('omits businessName when not provided', () => {
      const data = buildShareableInvoiceData(makeInvoice(), 'Test');
      expect(data.bn).toBeUndefined();
    });

    it('omits businessName when empty string', () => {
      const data = buildShareableInvoiceData(makeInvoice(), 'Test', '');
      expect(data.bn).toBeUndefined();
    });

    it('handles unicode customer names', () => {
      const data = buildShareableInvoiceData(makeInvoice(), 'José García 🏠');
      expect(data.c).toBe('José García 🏠');
    });

    it('handles zero-amount invoices', () => {
      const inv = makeInvoice({
        lineItems: [{ id: '1', name: 'Free', quantity: 1, unitPrice: 0, total: 0 }],
        subtotal: 0, taxAmount: 0, total: 0,
      });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.t).toBe(0);
      expect(data.st).toBe(0);
    });

    it('handles many line items', () => {
      const items: LineItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(i), name: `Item ${i}`, quantity: i + 1, unitPrice: 10, total: (i + 1) * 10,
      }));
      const inv = makeInvoice({ lineItems: items, subtotal: 12750, total: 12750 });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.li).toHaveLength(50);
    });

    it('extracts date portion from dueDate ISO string', () => {
      const inv = makeInvoice({ dueDate: '2026-03-15T14:30:00.000Z' });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.dd).toBe('2026-03-15');
    });

    it('handles undefined dueDate', () => {
      const inv = makeInvoice({ dueDate: undefined });
      const data = buildShareableInvoiceData(inv, 'Test');
      expect(data.dd).toBeUndefined();
    });
  });

  describe('encode/decode round-trip', () => {
    it('handles special characters in notes', () => {
      const inv = makeInvoice({ notes: 'Price: $100 & <tax> "included"' });
      const data = buildShareableInvoiceData(inv, 'Test');
      const encoded = encodeInvoiceData(data);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded?.no).toBe('Price: $100 & <tax> "included"');
    });

    it('handles emoji in business name', () => {
      const data = buildShareableInvoiceData(makeInvoice(), 'Test', '🔧 Fix-It Corp');
      const encoded = encodeInvoiceData(data);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded?.bn).toBe('🔧 Fix-It Corp');
    });

    it('handles very long notes', () => {
      const longNotes = 'A'.repeat(10000);
      const inv = makeInvoice({ notes: longNotes });
      const data = buildShareableInvoiceData(inv, 'Test');
      const encoded = encodeInvoiceData(data);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded?.no).toBe(longNotes);
    });

    it('handles line items with fractional quantities', () => {
      const inv = makeInvoice({
        lineItems: [{ id: '1', name: 'Hours', quantity: 2.5, unitPrice: 75.50, total: 188.75 }],
      });
      const data = buildShareableInvoiceData(inv, 'Test');
      const encoded = encodeInvoiceData(data);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded?.li[0]).toEqual(['Hours', 2.5, 75.50]);
    });
  });

  describe('decodeInvoiceData error handling', () => {
    it('returns null for empty string', () => {
      expect(decodeInvoiceData('')).toBeNull();
    });

    it('returns null for random unicode', () => {
      expect(decodeInvoiceData('日本語テスト')).toBeNull();
    });

    it('returns null for valid base64 of non-JSON', () => {
      const encoded = encodeURIComponent(btoa('not json'));
      expect(decodeInvoiceData(encoded)).toBeNull();
    });
  });

  describe('expandInvoiceLineItems', () => {
    it('handles empty array', () => {
      expect(expandInvoiceLineItems([])).toEqual([]);
    });

    it('correctly rounds floating point multiplication', () => {
      const items = expandInvoiceLineItems([['Service', 3, 19.99]]);
      expect(items[0].total).toBe(59.97);
    });

    it('handles zero quantity', () => {
      const items = expandInvoiceLineItems([['Free', 0, 100]]);
      expect(items[0].total).toBe(0);
    });

    it('handles negative unit price', () => {
      const items = expandInvoiceLineItems([['Discount', 1, -50]]);
      expect(items[0].total).toBe(-50);
    });

    it('assigns sequential string IDs', () => {
      const items = expandInvoiceLineItems([['A', 1, 10], ['B', 1, 20], ['C', 1, 30]]);
      expect(items.map(i => i.id)).toEqual(['0', '1', '2']);
    });
  });

  describe('buildInvoiceShareUrl', () => {
    it('uses first 8 chars of invoice ID in URL path', () => {
      const url = buildInvoiceShareUrl(makeInvoice(), 'Test');
      expect(url).toContain('/view/invoice/inv-1234');
      expect(url.startsWith(SHARE_BASE_URL)).toBe(true);
    });

    it('includes encoded data as query param', () => {
      const url = buildInvoiceShareUrl(makeInvoice(), 'Test');
      expect(url).toContain('?d=');
    });
  });

  describe('buildInvoiceShareMessage', () => {
    it('uses default company name when not provided', () => {
      const msg = buildInvoiceShareMessage(makeInvoice(), 'Test');
      expect(msg).toContain('our company');
    });

    it('uses custom business name', () => {
      const msg = buildInvoiceShareMessage(makeInvoice(), 'Test', 'ACME Corp');
      expect(msg).toContain('ACME Corp');
    });

    it('excludes business name from URL when using default', () => {
      const msg = buildInvoiceShareMessage(makeInvoice(), 'Test', 'our company');
      // When businessName is 'our company', it should not be in the URL data
      const urlPart = msg.split(': ')[1];
      const encoded = new URL(urlPart).searchParams.get('d')!;
      const decoded = decodeInvoiceData(encoded);
      expect(decoded?.bn).toBeUndefined();
    });
  });
});
