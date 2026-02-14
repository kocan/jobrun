import {
  buildShareableData,
  encodeEstimateData,
  decodeEstimateData,
  buildShareUrl,
  buildShareMessage,
  expandLineItems,
  SHARE_BASE_URL,
  ShareableEstimateData,
} from '../lib/estimateSharing';
import { Estimate } from '../lib/types';

const mockEstimate: Estimate = {
  id: 'abcd1234-5678-9012-3456-789012345678',
  customerId: 'cust-1',
  lineItems: [
    { id: 'li1', name: 'Driveway Wash', quantity: 1, unitPrice: 150, total: 150 },
    { id: 'li2', name: 'House Wash', quantity: 2, unitPrice: 300, total: 600 },
  ],
  subtotal: 750,
  taxRate: 8,
  taxAmount: 60,
  total: 810,
  status: 'draft',
  notes: 'Valid for 30 days',
  expiresAt: '2026-03-15',
  createdAt: '2026-02-14T12:00:00.000Z',
  updatedAt: '2026-02-14T12:00:00.000Z',
};

describe('estimateSharing', () => {
  describe('buildShareableData', () => {
    it('creates compact payload from estimate', () => {
      const data = buildShareableData(mockEstimate, 'John Doe');
      expect(data.n).toBe('ABCD1234');
      expect(data.c).toBe('John Doe');
      expect(data.li).toEqual([
        ['Driveway Wash', 1, 150],
        ['House Wash', 2, 300],
      ]);
      expect(data.st).toBe(750);
      expect(data.tr).toBe(8);
      expect(data.ta).toBe(60);
      expect(data.t).toBe(810);
      expect(data.no).toBe('Valid for 30 days');
      expect(data.ex).toBe('2026-03-15');
      expect(data.dt).toBe('2026-02-14');
    });

    it('omits notes when empty', () => {
      const est = { ...mockEstimate, notes: undefined };
      const data = buildShareableData(est, 'Jane');
      expect(data.no).toBeUndefined();
    });
  });

  describe('encode/decode roundtrip', () => {
    it('roundtrips correctly', () => {
      const original: ShareableEstimateData = {
        n: 'ABCD1234',
        c: 'John Doe',
        li: [['Wash', 1, 100]],
        st: 100,
        tr: 0,
        ta: 0,
        t: 100,
        ex: '2026-03-15',
        dt: '2026-02-14',
      };
      const encoded = encodeEstimateData(original);
      const decoded = decodeEstimateData(encoded);
      expect(decoded).toEqual(original);
    });

    it('handles unicode characters', () => {
      const original: ShareableEstimateData = {
        n: 'TEST1234',
        c: 'José García',
        li: [['Limpieza básica', 1, 50]],
        st: 50, tr: 0, ta: 0, t: 50,
        ex: '2026-03-15', dt: '2026-02-14',
      };
      const encoded = encodeEstimateData(original);
      const decoded = decodeEstimateData(encoded);
      expect(decoded).toEqual(original);
    });

    it('returns null for invalid data', () => {
      expect(decodeEstimateData('not-valid-base64!!!')).toBeNull();
      expect(decodeEstimateData('')).toBeNull();
    });
  });

  describe('buildShareUrl', () => {
    it('builds URL with encoded data param', () => {
      const url = buildShareUrl(mockEstimate, 'John Doe');
      expect(url).toContain(SHARE_BASE_URL);
      expect(url).toContain('/view/estimate/abcd1234');
      expect(url).toContain('?d=');

      // Extract and verify the data roundtrips
      const dParam = url.split('?d=')[1];
      const decoded = decodeEstimateData(dParam);
      expect(decoded).not.toBeNull();
      expect(decoded!.c).toBe('John Doe');
      expect(decoded!.t).toBe(810);
    });
  });

  describe('buildShareMessage', () => {
    it('includes business name and URL', () => {
      const msg = buildShareMessage(mockEstimate, 'John Doe', 'Sparkle Wash Co');
      expect(msg).toContain("Here's your estimate from Sparkle Wash Co:");
      expect(msg).toContain(SHARE_BASE_URL);
    });

    it('uses default business name', () => {
      const msg = buildShareMessage(mockEstimate, 'John Doe');
      expect(msg).toContain('our company');
    });
  });

  describe('expandLineItems', () => {
    it('expands compact format to LineItem array', () => {
      const items = expandLineItems([
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
