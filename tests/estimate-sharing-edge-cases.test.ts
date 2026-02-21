/**
 * Edge case tests for estimateSharing utilities.
 * Complements sharing.test.ts with boundary conditions:
 * - Empty line items
 * - Unicode / emoji in customer and business names
 * - Very long strings
 * - Special characters (apostrophes, angle brackets, slashes)
 * - Tax calculations with floating-point edge cases
 * - Encode/decode round-trips for exotic data
 * - decodeEstimateData with invalid/corrupt payloads
 */
import { describe, it, expect } from 'vitest';
import {
  buildShareableData,
  encodeEstimateData,
  decodeEstimateData,
  buildShareUrl,
  buildShareMessage,
  expandLineItems,
  type ShareableEstimateData,
} from '../lib/estimateSharing';
import type { Estimate, LineItem } from '../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeEstimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  customerId: 'c1',
  lineItems: [{ id: '1', name: 'Window Washing', quantity: 1, unitPrice: 150, total: 150 }],
  subtotal: 150,
  taxRate: 0.08,
  taxAmount: 12,
  total: 162,
  status: 'draft',
  expiresAt: '2026-03-01T00:00:00Z',
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
  ...overrides,
});

// ─── buildShareableData — field mapping ────────────────────────────────────────

describe('buildShareableData — field mapping', () => {
  it('maps estimate id prefix (first 8 chars, uppercased)', () => {
    const data = buildShareableData(makeEstimate(), 'Customer');
    expect(data.n).toBe('ABCDEF12');
  });

  it('maps customer name exactly', () => {
    const data = buildShareableData(makeEstimate(), 'Jane Doe');
    expect(data.c).toBe('Jane Doe');
  });

  it('includes business name when provided', () => {
    const data = buildShareableData(makeEstimate(), 'Jane', 'Acme Co');
    expect(data.bn).toBe('Acme Co');
  });

  it('omits business name when not provided', () => {
    const data = buildShareableData(makeEstimate(), 'Jane');
    expect(data.bn).toBeUndefined();
  });

  it('omits business name when empty string provided', () => {
    const data = buildShareableData(makeEstimate(), 'Jane', '');
    expect(data.bn).toBeUndefined();
  });

  it('maps expiresAt as YYYY-MM-DD', () => {
    const data = buildShareableData(makeEstimate({ expiresAt: '2026-12-31T23:59:59Z' }), 'C');
    expect(data.ex).toBe('2026-12-31');
  });

  it('maps createdAt as YYYY-MM-DD', () => {
    const data = buildShareableData(makeEstimate({ createdAt: '2026-01-15T08:30:00Z' }), 'C');
    expect(data.dt).toBe('2026-01-15');
  });

  it('maps notes when present', () => {
    const est = makeEstimate({ notes: 'Please call before arrival' });
    const data = buildShareableData(est, 'C');
    expect(data.no).toBe('Please call before arrival');
  });

  it('omits notes when empty string', () => {
    const est = makeEstimate({ notes: '' });
    const data = buildShareableData(est, 'C');
    expect(data.no).toBeUndefined();
  });

  it('omits notes when undefined', () => {
    const est = makeEstimate({ notes: undefined });
    const data = buildShareableData(est, 'C');
    expect(data.no).toBeUndefined();
  });
});

// ─── Empty line items ──────────────────────────────────────────────────────────

describe('buildShareableData — empty line items', () => {
  it('handles estimate with no line items', () => {
    const est = makeEstimate({ lineItems: [], subtotal: 0, taxAmount: 0, total: 0 });
    const data = buildShareableData(est, 'Customer');
    expect(data.li).toEqual([]);
    expect(data.t).toBe(0);
  });

  it('encodes and decodes estimate with no line items', () => {
    const est = makeEstimate({ lineItems: [], subtotal: 0, taxAmount: 0, total: 0 });
    const data = buildShareableData(est, 'C');
    const encoded = encodeEstimateData(data);
    const decoded = decodeEstimateData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.li).toEqual([]);
  });

  it('maps multiple line items to compact format', () => {
    const lineItems: LineItem[] = [
      { id: '1', name: 'Window Wash', quantity: 2, unitPrice: 75, total: 150 },
      { id: '2', name: 'Gutter Clean', quantity: 1, unitPrice: 125, total: 125 },
    ];
    const est = makeEstimate({ lineItems });
    const data = buildShareableData(est, 'C');
    expect(data.li).toEqual([
      ['Window Wash', 2, 75],
      ['Gutter Clean', 1, 125],
    ]);
  });
});

// ─── Unicode and special characters ──────────────────────────────────────────

describe('buildShareableData + encode/decode — unicode', () => {
  it('round-trips unicode customer name (Japanese)', () => {
    const data = buildShareableData(makeEstimate(), '田中太郎');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.c).toBe('田中太郎');
  });

  it('round-trips unicode customer name (Arabic)', () => {
    const data = buildShareableData(makeEstimate(), 'محمد علي');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.c).toBe('محمد علي');
  });

  it('round-trips accented customer name', () => {
    const data = buildShareableData(makeEstimate(), 'José García');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.c).toBe('José García');
  });

  it('round-trips emoji in customer name', () => {
    const data = buildShareableData(makeEstimate(), 'Customer 🏠');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.c).toBe('Customer 🏠');
  });

  it('round-trips emoji in business name', () => {
    const data = buildShareableData(makeEstimate(), 'C', 'Sparkle Clean ✨');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.bn).toBe('Sparkle Clean ✨');
  });

  it('round-trips special chars in line item name', () => {
    const lineItems: LineItem[] = [
      { id: '1', name: 'Roof & Gutter (2-story)', quantity: 1, unitPrice: 300, total: 300 },
    ];
    const est = makeEstimate({ lineItems });
    const data = buildShareableData(est, 'C');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.li[0][0]).toBe('Roof & Gutter (2-story)');
  });

  it('round-trips notes with newlines', () => {
    const est = makeEstimate({ notes: 'Line 1\nLine 2\nLine 3' });
    const data = buildShareableData(est, 'C');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.no).toBe('Line 1\nLine 2\nLine 3');
  });
});

// ─── Very long strings ────────────────────────────────────────────────────────

describe('buildShareableData + encode/decode — long strings', () => {
  it('handles a 500-character customer name without crashing', () => {
    const longName = 'A'.repeat(500);
    const data = buildShareableData(makeEstimate(), longName);
    expect(() => encodeEstimateData(data)).not.toThrow();
    const encoded = encodeEstimateData(data);
    const decoded = decodeEstimateData(encoded);
    expect(decoded!.c).toBe(longName);
  });

  it('handles 100-character line item names', () => {
    const longItemName = 'Service '.repeat(12).trim(); // ~95 chars
    const lineItems: LineItem[] = [
      { id: '1', name: longItemName, quantity: 1, unitPrice: 100, total: 100 },
    ];
    const est = makeEstimate({ lineItems });
    const data = buildShareableData(est, 'C');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.li[0][0]).toBe(longItemName);
  });

  it('handles many line items (50)', () => {
    const lineItems: LineItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `Service ${i + 1}`,
      quantity: 1,
      unitPrice: 50,
      total: 50,
    }));
    const est = makeEstimate({ lineItems });
    const data = buildShareableData(est, 'C');
    expect(data.li).toHaveLength(50);
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.li).toHaveLength(50);
  });
});

// ─── decodeEstimateData — invalid/corrupt payloads ───────────────────────────

describe('decodeEstimateData — invalid inputs', () => {
  it('returns null for empty string', () => {
    expect(decodeEstimateData('')).toBeNull();
  });

  it('returns null for random garbage', () => {
    expect(decodeEstimateData('this-is-not-base64!!!')).toBeNull();
  });

  it('returns null for valid base64 that decodes to non-JSON', () => {
    const fakeBase64 = encodeURIComponent(btoa('not json at all'));
    expect(decodeEstimateData(fakeBase64)).toBeNull();
  });

  it('returns null for truncated encoded string', () => {
    const data = buildShareableData(makeEstimate(), 'Customer');
    const full = encodeEstimateData(data);
    const truncated = full.slice(0, 10);
    expect(decodeEstimateData(truncated)).toBeNull();
  });

  it('returns null for null-ish string values', () => {
    expect(decodeEstimateData('null')).toBeNull();
    expect(decodeEstimateData('undefined')).toBeNull();
  });
});

// ─── expandLineItems — edge cases ────────────────────────────────────────────

describe('expandLineItems — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(expandLineItems([])).toEqual([]);
  });

  it('calculates total as quantity × unitPrice, rounded to 2 decimals', () => {
    const result = expandLineItems([['Service', 3, 33.333]]);
    expect(result[0].total).toBe(100); // Math.round(3 * 33.333 * 100) / 100 = 100
  });

  it('handles zero quantity', () => {
    const result = expandLineItems([['Item', 0, 100]]);
    expect(result[0].total).toBe(0);
    expect(result[0].quantity).toBe(0);
  });

  it('handles zero unitPrice', () => {
    const result = expandLineItems([['Free Item', 5, 0]]);
    expect(result[0].total).toBe(0);
    expect(result[0].unitPrice).toBe(0);
  });

  it('assigns sequential string ids starting from "0"', () => {
    const result = expandLineItems([
      ['A', 1, 10],
      ['B', 2, 20],
      ['C', 3, 30],
    ]);
    expect(result[0].id).toBe('0');
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('2');
  });

  it('handles floating-point precision in totals', () => {
    // 0.1 * 3 = 0.30000000000000004 in naive float; should be rounded to 0.3
    const result = expandLineItems([['Item', 3, 0.1]]);
    expect(result[0].total).toBe(0.3);
  });
});

// ─── buildShareUrl — URL format ───────────────────────────────────────────────

describe('buildShareUrl — URL format', () => {
  it('starts with jobrun.app base URL', () => {
    const url = buildShareUrl(makeEstimate(), 'C');
    expect(url).toMatch(/^https:\/\/jobrun\.app/);
  });

  it('contains "view/estimate" path segment', () => {
    const url = buildShareUrl(makeEstimate(), 'C');
    expect(url).toContain('/view/estimate/');
  });

  it('contains estimate id prefix (first 8 chars)', () => {
    const url = buildShareUrl(makeEstimate(), 'C');
    expect(url).toContain('abcdef12');
  });

  it('contains "?d=" query param', () => {
    const url = buildShareUrl(makeEstimate(), 'C');
    expect(url).toContain('?d=');
  });

  it('is a valid URL string', () => {
    const url = buildShareUrl(makeEstimate(), 'C');
    expect(() => new URL(url)).not.toThrow();
  });
});

// ─── buildShareMessage — message format ──────────────────────────────────────

describe('buildShareMessage — message format', () => {
  it('includes business name in message', () => {
    const msg = buildShareMessage(makeEstimate(), 'Jane', 'Sparkle Clean');
    expect(msg).toContain('Sparkle Clean');
  });

  it('defaults to "our company" when no business name given', () => {
    const msg = buildShareMessage(makeEstimate(), 'Jane');
    expect(msg).toContain('our company');
  });

  it('includes a URL in the message', () => {
    const msg = buildShareMessage(makeEstimate(), 'Jane', 'Acme');
    expect(msg).toContain('https://');
  });

  it('message starts with "Here\'s your estimate from"', () => {
    const msg = buildShareMessage(makeEstimate(), 'Jane', 'Acme');
    expect(msg).toMatch(/^Here's your estimate from/);
  });

  it('handles unicode business name in message', () => {
    const msg = buildShareMessage(makeEstimate(), 'C', '清洁服务公司');
    expect(msg).toContain('清洁服务公司');
  });
});

// ─── Tax edge cases ───────────────────────────────────────────────────────────

describe('buildShareableData — tax edge cases', () => {
  it('handles zero tax rate', () => {
    const est = makeEstimate({ taxRate: 0, taxAmount: 0, total: 150 });
    const data = buildShareableData(est, 'C');
    expect(data.tr).toBe(0);
    expect(data.ta).toBe(0);
  });

  it('handles 100% tax rate (edge)', () => {
    const est = makeEstimate({ taxRate: 1.0, taxAmount: 150, total: 300 });
    const data = buildShareableData(est, 'C');
    expect(data.tr).toBe(1.0);
    expect(data.ta).toBe(150);
  });

  it('round-trips tax values accurately', () => {
    const est = makeEstimate({ taxRate: 0.0875, taxAmount: 13.13, total: 163.13 });
    const data = buildShareableData(est, 'C');
    const decoded = decodeEstimateData(encodeEstimateData(data));
    expect(decoded!.tr).toBe(0.0875);
    expect(decoded!.ta).toBe(13.13);
  });
});
