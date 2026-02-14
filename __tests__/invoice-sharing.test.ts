import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  buildInvoiceShareUrl,
  buildInvoiceShareMessage,
  expandInvoiceLineItems,
  SHARE_BASE_URL,
  ShareableInvoiceData,
} from '../lib/invoiceSharing';
import { Invoice } from '../lib/types';

const mockInvoice: Invoice = {
  id: 'abcd1234-5678-9012-3456-789012345678',
  invoiceNumber: 'INV-0042',
  customerId: 'cust-1',
  lineItems: [
    { id: 'li1', name: 'Driveway Wash', quantity: 1, unitPrice: 150, total: 150 },
    { id: 'li2', name: 'House Wash', quantity: 2, unitPrice: 300, total: 600 },
  ],
  subtotal: 750,
  taxRate: 8,
  taxAmount: 60,
  total: 810,
  status: 'sent',
  paymentTerms: 'Net 30',
  dueDate: '2026-03-16',
  payments: [],
  notes: 'Thank you for your business',
  createdAt: '2026-02-14T12:00:00.000Z',
  updatedAt: '2026-02-14T12:00:00.000Z',
};

describe('invoiceSharing', () => {
  describe('buildShareableInvoiceData', () => {
    it('creates compact payload from invoice', () => {
      const data = buildShareableInvoiceData(mockInvoice, 'John Doe');
      expect(data.n).toBe('INV-0042');
      expect(data.c).toBe('John Doe');
      expect(data.li).toEqual([
        ['Driveway Wash', 1, 150],
        ['House Wash', 2, 300],
      ]);
      expect(data.st).toBe(750);
      expect(data.tr).toBe(8);
      expect(data.ta).toBe(60);
      expect(data.t).toBe(810);
      expect(data.no).toBe('Thank you for your business');
      expect(data.pt).toBe('Net 30');
      expect(data.dd).toBe('2026-03-16');
      expect(data.dt).toBe('2026-02-14');
      expect(data.s).toBe('sent');
    });

    it('omits notes when empty', () => {
      const inv = { ...mockInvoice, notes: undefined };
      const data = buildShareableInvoiceData(inv, 'Jane');
      expect(data.no).toBeUndefined();
    });
  });

  describe('encode/decode roundtrip', () => {
    it('roundtrips correctly', () => {
      const original: ShareableInvoiceData = {
        n: 'INV-0001',
        c: 'John Doe',
        li: [['Wash', 1, 100]],
        st: 100, tr: 0, ta: 0, t: 100,
        dt: '2026-02-14', s: 'sent',
      };
      const encoded = encodeInvoiceData(original);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded).toEqual(original);
    });

    it('handles unicode characters', () => {
      const original: ShareableInvoiceData = {
        n: 'INV-0001',
        c: 'José García',
        li: [['Limpieza básica', 1, 50]],
        st: 50, tr: 0, ta: 0, t: 50,
        dt: '2026-02-14', s: 'draft',
      };
      const encoded = encodeInvoiceData(original);
      const decoded = decodeInvoiceData(encoded);
      expect(decoded).toEqual(original);
    });

    it('returns null for invalid data', () => {
      expect(decodeInvoiceData('not-valid-base64!!!')).toBeNull();
      expect(decodeInvoiceData('')).toBeNull();
    });
  });

  describe('buildInvoiceShareUrl', () => {
    it('builds URL with encoded data param', () => {
      const url = buildInvoiceShareUrl(mockInvoice, 'John Doe');
      expect(url).toContain(SHARE_BASE_URL);
      expect(url).toContain('/view/invoice/abcd1234');
      expect(url).toContain('?d=');

      const dParam = url.split('?d=')[1];
      const decoded = decodeInvoiceData(dParam);
      expect(decoded).not.toBeNull();
      expect(decoded!.c).toBe('John Doe');
      expect(decoded!.t).toBe(810);
      expect(decoded!.n).toBe('INV-0042');
    });
  });

  describe('buildInvoiceShareMessage', () => {
    it('includes business name and URL', () => {
      const msg = buildInvoiceShareMessage(mockInvoice, 'John Doe', 'Sparkle Wash Co');
      expect(msg).toContain("Here's your invoice from Sparkle Wash Co:");
      expect(msg).toContain(SHARE_BASE_URL);
    });

    it('uses default business name', () => {
      const msg = buildInvoiceShareMessage(mockInvoice, 'John Doe');
      expect(msg).toContain('our company');
    });
  });

  describe('expandInvoiceLineItems', () => {
    it('expands compact format to LineItem array', () => {
      const items = expandInvoiceLineItems([
        ['Driveway Wash', 1, 150],
        ['House Wash', 2, 300],
      ]);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: '0',
        name: 'Driveway Wash',
        quantity: 1,
        unitPrice: 150,
        total: 150,
      });
      expect(items[1].total).toBe(600);
    });
  });
});
