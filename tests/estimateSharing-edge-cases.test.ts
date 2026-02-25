import { describe, it, expect } from 'vitest'
import {
  buildShareableData,
  encodeEstimateData,
  decodeEstimateData,
  expandLineItems,
  buildShareUrl,
  buildShareMessage,
  ShareableEstimateData,
} from '../lib/estimateSharing'
import { Estimate } from '../lib/types'

const makeEstimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  id: '12345678-abcd-1234-abcd-123456789012',
  customerId: 'cust-1',
  status: 'draft',
  lineItems: [
    { id: '1', name: 'Pressure Wash', quantity: 1, unitPrice: 150, total: 150 },
  ],
  subtotal: 150,
  taxRate: 0.08,
  taxAmount: 12,
  total: 162,
  notes: '',
  expiresAt: '2026-03-01T00:00:00Z',
  createdAt: '2026-02-23T00:00:00Z',
  updatedAt: '2026-02-23T00:00:00Z',
  ...overrides,
})

describe('buildShareableData edge cases', () => {
  it('truncates id to first 8 chars uppercased', () => {
    const data = buildShareableData(makeEstimate(), 'John Doe')
    expect(data.n).toBe('12345678')
  })

  it('omits notes when empty string', () => {
    const data = buildShareableData(makeEstimate({ notes: '' }), 'John')
    expect(data.no).toBeUndefined()
  })

  it('includes notes when present', () => {
    const data = buildShareableData(makeEstimate({ notes: 'Rush job' }), 'John')
    expect(data.no).toBe('Rush job')
  })

  it('omits business name when not provided', () => {
    const data = buildShareableData(makeEstimate(), 'John')
    expect(data.bn).toBeUndefined()
  })

  it('handles unicode customer name', () => {
    const data = buildShareableData(makeEstimate(), 'José García 🏠')
    expect(data.c).toBe('José García 🏠')
  })

  it('extracts date portion from ISO datetime', () => {
    const data = buildShareableData(makeEstimate(), 'John')
    expect(data.ex).toBe('2026-03-01')
    expect(data.dt).toBe('2026-02-23')
  })

  it('handles empty line items array', () => {
    const est = makeEstimate({ lineItems: [] })
    const data = buildShareableData(est, 'John')
    expect(data.li).toEqual([])
  })
})

describe('encode/decode roundtrip edge cases', () => {
  it('roundtrips basic data', () => {
    const original: ShareableEstimateData = {
      n: '12345678',
      c: 'John',
      li: [['Service', 1, 100]],
      st: 100,
      tr: 0.08,
      ta: 8,
      t: 108,
      ex: '2026-03-01',
      dt: '2026-02-23',
    }
    const encoded = encodeEstimateData(original)
    const decoded = decodeEstimateData(encoded)
    expect(decoded).toEqual(original)
  })

  it('roundtrips unicode content', () => {
    const original: ShareableEstimateData = {
      n: 'ABCD1234',
      c: '日本語テスト 🎉',
      li: [['Ñoño Service™', 2, 50.5]],
      st: 101,
      tr: 0,
      ta: 0,
      t: 101,
      no: 'Notes with émojis 🔥',
      ex: '2026-12-31',
      dt: '2026-01-01',
    }
    const encoded = encodeEstimateData(original)
    const decoded = decodeEstimateData(encoded)
    expect(decoded).toEqual(original)
  })

  it('decodeEstimateData returns null for garbage input', () => {
    expect(decodeEstimateData('not-base64!!!')).toBeNull()
    expect(decodeEstimateData('')).toBeNull()
  })

  it('decodeEstimateData returns null for valid base64 but invalid JSON', () => {
    const encoded = encodeURIComponent(btoa('not json'))
    expect(decodeEstimateData(encoded)).toBeNull()
  })
})

describe('expandLineItems edge cases', () => {
  it('handles empty array', () => {
    expect(expandLineItems([])).toEqual([])
  })

  it('calculates total with floating point precision', () => {
    const items = expandLineItems([['Service', 3, 33.33]])
    expect(items[0].total).toBeCloseTo(99.99, 2)
  })

  it('assigns sequential string IDs', () => {
    const items = expandLineItems([['A', 1, 10], ['B', 2, 20], ['C', 3, 30]])
    expect(items.map(i => i.id)).toEqual(['0', '1', '2'])
  })

  it('handles zero quantity', () => {
    const items = expandLineItems([['Free', 0, 100]])
    expect(items[0].total).toBe(0)
  })

  it('handles zero price', () => {
    const items = expandLineItems([['Complimentary', 5, 0]])
    expect(items[0].total).toBe(0)
  })
})

describe('buildShareUrl', () => {
  it('contains estimate id prefix in URL path', () => {
    const url = buildShareUrl(makeEstimate(), 'John')
    expect(url).toContain('/view/estimate/12345678')
  })

  it('contains encoded data as query param', () => {
    const url = buildShareUrl(makeEstimate(), 'John')
    expect(url).toContain('?d=')
  })
})

describe('buildShareMessage', () => {
  it('uses default company name', () => {
    const msg = buildShareMessage(makeEstimate(), 'John')
    expect(msg).toContain('our company')
  })

  it('uses custom business name', () => {
    const msg = buildShareMessage(makeEstimate(), 'John', 'Acme LLC')
    expect(msg).toContain('Acme LLC')
  })

  it('contains a URL', () => {
    const msg = buildShareMessage(makeEstimate(), 'John')
    expect(msg).toContain('https://jobrun.app')
  })
})
