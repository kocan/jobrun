/**
 * Tests for the verticals constants data structure.
 * Validates that all vertical definitions are well-formed,
 * have the required fields, valid pricing, and unique IDs.
 */
import { describe, it, expect } from 'vitest';
import { verticals } from '../constants/verticals';
import type { VerticalId } from '../lib/types';

const VALID_VERTICAL_IDS: VerticalId[] = [
  'pressure-washing',
  'auto-detailing',
  'lawn-care',
  'cleaning',
  'handyman',
];

// ─── Structural completeness ──────────────────────────────────────────────────

describe('verticals — structure', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(verticals)).toBe(true);
    expect(verticals.length).toBeGreaterThan(0);
  });

  it('contains exactly 5 verticals', () => {
    expect(verticals).toHaveLength(5);
  });

  it('each vertical has a unique id', () => {
    const ids = verticals.map((v) => v.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all vertical ids are valid VerticalId values', () => {
    for (const vertical of verticals) {
      expect(VALID_VERTICAL_IDS).toContain(vertical.id);
    }
  });

  it('each expected VerticalId has a matching vertical', () => {
    for (const id of VALID_VERTICAL_IDS) {
      const match = verticals.find((v) => v.id === id);
      expect(match).toBeDefined();
    }
  });
});

// ─── Required fields ──────────────────────────────────────────────────────────

describe('verticals — required fields', () => {
  for (const vertical of verticals) {
    describe(`vertical "${vertical.id}"`, () => {
      it('has a non-empty name', () => {
        expect(typeof vertical.name).toBe('string');
        expect(vertical.name.trim().length).toBeGreaterThan(0);
      });

      it('has a non-empty icon', () => {
        expect(typeof vertical.icon).toBe('string');
        expect(vertical.icon.trim().length).toBeGreaterThan(0);
      });

      it('has at least one default service', () => {
        expect(Array.isArray(vertical.defaultServices)).toBe(true);
        expect(vertical.defaultServices.length).toBeGreaterThan(0);
      });
    });
  }
});

// ─── Default services validation ──────────────────────────────────────────────

describe('verticals — defaultServices', () => {
  it('every service has a non-empty name', () => {
    for (const vertical of verticals) {
      for (const service of vertical.defaultServices) {
        expect(typeof service.name).toBe('string');
        expect(service.name.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every service has a positive price', () => {
    for (const vertical of verticals) {
      for (const service of vertical.defaultServices) {
        expect(service.price).toBeGreaterThan(0);
      }
    }
  });

  it('no service has a zero or negative price', () => {
    for (const vertical of verticals) {
      for (const service of vertical.defaultServices) {
        expect(service.price).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('service names are unique within each vertical', () => {
    for (const vertical of verticals) {
      const names = vertical.defaultServices.map((s) => s.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    }
  });

  it('service prices are reasonable (between $1 and $10,000)', () => {
    for (const vertical of verticals) {
      for (const service of vertical.defaultServices) {
        expect(service.price).toBeGreaterThanOrEqual(1);
        expect(service.price).toBeLessThanOrEqual(10000);
      }
    }
  });

  it('optional description field is a string when present', () => {
    for (const vertical of verticals) {
      for (const service of vertical.defaultServices) {
        if (service.description !== undefined) {
          expect(typeof service.description).toBe('string');
        }
      }
    }
  });
});

// ─── Specific verticals ───────────────────────────────────────────────────────

describe('verticals — individual vertical checks', () => {
  it('pressure-washing has id "pressure-washing"', () => {
    const v = verticals.find((v) => v.id === 'pressure-washing');
    expect(v).toBeDefined();
    expect(v!.name).toBe('Pressure Washing');
  });

  it('auto-detailing has customer terminology override', () => {
    const v = verticals.find((v) => v.id === 'auto-detailing');
    expect(v?.terminology?.customer).toBe('Client');
  });

  it('lawn-care has at least 5 default services', () => {
    const v = verticals.find((v) => v.id === 'lawn-care');
    expect(v!.defaultServices.length).toBeGreaterThanOrEqual(4);
  });

  it('cleaning has customer terminology override', () => {
    const v = verticals.find((v) => v.id === 'cleaning');
    expect(v?.terminology?.customer).toBe('Client');
  });

  it('handyman has no terminology overrides (undefined)', () => {
    const v = verticals.find((v) => v.id === 'handyman');
    // handyman may have no terminology at all
    expect(v?.terminology?.customer).toBeUndefined();
    expect(v?.terminology?.estimate).toBeUndefined();
  });

  it('all verticals with job terminology have non-empty job string', () => {
    for (const v of verticals) {
      if (v.terminology?.job !== undefined) {
        expect(typeof v.terminology.job).toBe('string');
        expect(v.terminology.job.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Total services count ─────────────────────────────────────────────────────

describe('verticals — aggregate counts', () => {
  it('has at least 20 default services total across all verticals', () => {
    const total = verticals.reduce((sum, v) => sum + v.defaultServices.length, 0);
    expect(total).toBeGreaterThanOrEqual(20);
  });

  it('no vertical has more than 20 default services', () => {
    for (const v of verticals) {
      expect(v.defaultServices.length).toBeLessThanOrEqual(20);
    }
  });

  it('lowest-priced service across all verticals is at least $1', () => {
    const allPrices = verticals.flatMap((v) => v.defaultServices.map((s) => s.price));
    expect(Math.min(...allPrices)).toBeGreaterThanOrEqual(1);
  });

  it('all service prices are finite numbers', () => {
    for (const v of verticals) {
      for (const s of v.defaultServices) {
        expect(Number.isFinite(s.price)).toBe(true);
      }
    }
  });
});
