import { describe, it, expect } from 'vitest'
import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  expandInvoiceLineItems,
  buildInvoiceShareUrl,
  buildInvoiceShareMessage,
} from '../lib/invoiceSharing'
import type { Invoice } from '../lib/types'

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: '12345678-abcd-1234-abcd-123456789abc',
    invoiceNumber: 'INV-001',
    customerId: 'cust-1',
    lineItems: [{ id: '1', name: 'Service', quantity: 1, unitPrice: 100, total: 100 }],
    subtotal: 100,
    taxRate: 0,
    taxAmount: 0,
    total: 100,
    status: 'sent',
    payments: [],
    createdAt: '2026-02-24T10:00:00Z',
    updatedAt: '2026-02-24T10:00:00Z',
    ...overrides,
  }
}

describe('buildShareableInvoiceData — edge cases', () => {
  it('handles invoice with no notes, terms, or dueDate', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'John')
    expect(data.no).toBeUndefined()
    expect(data.pt).toBeUndefined()
    expect(data.dd).toBeUndefined()
  })

  it('strips time from dueDate', () => {
    const data = buildShareableInvoiceData(makeInvoice({ dueDate: '2026-03-15T00:00:00Z' }), 'John')
    expect(data.dd).toBe('2026-03-15')
  })

  it('strips time from createdAt', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'John')
    expect(data.dt).toBe('2026-02-24')
  })

  it('includes business name when provided', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'John', 'Acme Inc')
    expect(data.bn).toBe('Acme Inc')
  })

  it('excludes business name when empty', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'John', '')
    expect(data.bn).toBeUndefined()
  })

  it('handles unicode customer name', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'José García 🏠')
    expect(data.c).toBe('José García 🏠')
  })

  it('handles multiple line items', () => {
    const inv = makeInvoice({
      lineItems: [
        { id: '1', name: 'A', quantity: 2, unitPrice: 50, total: 100 },
        { id: '2', name: 'B', quantity: 1, unitPrice: 75, total: 75 },
      ],
    })
    const data = buildShareableInvoiceData(inv, 'X')
    expect(data.li).toHaveLength(2)
    expect(data.li[0]).toEqual(['A', 2, 50])
    expect(data.li[1]).toEqual(['B', 1, 75])
  })
})

describe('encodeInvoiceData / decodeInvoiceData — edge cases', () => {
  it('round-trips unicode data', () => {
    const data = buildShareableInvoiceData(makeInvoice({ notes: 'Merci beaucoup! 🙏' }), 'André')
    const encoded = encodeInvoiceData(data)
    const decoded = decodeInvoiceData(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.c).toBe('André')
    expect(decoded!.no).toBe('Merci beaucoup! 🙏')
  })

  it('returns null for garbage input', () => {
    expect(decodeInvoiceData('not-valid-base64!!!')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeInvoiceData('')).toBeNull()
  })

  it('handles special characters in notes', () => {
    const data = buildShareableInvoiceData(makeInvoice({ notes: 'Line1\nLine2\t<script>alert("xss")</script>' }), 'Test')
    const decoded = decodeInvoiceData(encodeInvoiceData(data))
    expect(decoded!.no).toContain('<script>')  // raw data, not sanitized at this layer
  })
})

describe('expandInvoiceLineItems — edge cases', () => {
  it('handles empty array', () => {
    expect(expandInvoiceLineItems([])).toEqual([])
  })

  it('calculates total correctly with rounding', () => {
    const items = expandInvoiceLineItems([['Service', 3, 33.33]])
    expect(items[0].total).toBe(99.99)
  })

  it('handles fractional quantities', () => {
    const items = expandInvoiceLineItems([['Hourly', 1.5, 75]])
    expect(items[0].total).toBe(112.5)
  })

  it('handles zero quantity', () => {
    const items = expandInvoiceLineItems([['Free', 0, 100]])
    expect(items[0].total).toBe(0)
  })

  it('assigns sequential string IDs', () => {
    const items = expandInvoiceLineItems([['A', 1, 10], ['B', 1, 20]])
    expect(items[0].id).toBe('0')
    expect(items[1].id).toBe('1')
  })
})

describe('buildInvoiceShareUrl', () => {
  it('uses first 8 chars of id', () => {
    const url = buildInvoiceShareUrl(makeInvoice(), 'John')
    expect(url).toContain('/view/invoice/12345678')
  })

  it('contains encoded data param', () => {
    const url = buildInvoiceShareUrl(makeInvoice(), 'John')
    expect(url).toContain('?d=')
  })
})

describe('buildInvoiceShareMessage', () => {
  it('uses custom business name', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'John', 'Super Clean LLC')
    expect(msg).toContain('Super Clean LLC')
  })

  it('defaults to our company', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'John')
    expect(msg).toContain('our company')
  })

  it('does not pass business name to URL when using default', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'John')
    // Decode the URL data to verify bn is not set
    const urlMatch = msg.match(/d=([^&\s]+)/)
    expect(urlMatch).not.toBeNull()
    const decoded = decodeInvoiceData(urlMatch![1])
    expect(decoded!.bn).toBeUndefined()
  })
})
