import {
  buildShareableData,
  encodeEstimateData,
  decodeEstimateData,
  expandLineItems,
  buildShareUrl,
  buildShareMessage,
} from '../lib/estimateSharing'
import {
  buildShareableInvoiceData,
  encodeInvoiceData,
  decodeInvoiceData,
  expandInvoiceLineItems,
  buildInvoiceShareUrl,
  buildInvoiceShareMessage,
} from '../lib/invoiceSharing'
import { Estimate, Invoice } from '../lib/types'
import { describe, it, expect } from 'vitest'

const makeEstimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  customerId: 'c1',
  lineItems: [{ id: '1', name: 'Pressure Wash', quantity: 1, unitPrice: 150, total: 150 }],
  subtotal: 150,
  taxRate: 0.08,
  taxAmount: 12,
  total: 162,
  status: 'draft',
  expiresAt: '2026-03-01T00:00:00Z',
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
  ...overrides,
})

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv12345-6789-abcd-ef01-234567890abc',
  invoiceNumber: 'INV-001',
  customerId: 'c1',
  lineItems: [{ id: '1', name: 'Lawn Mowing', quantity: 2, unitPrice: 75, total: 150 }],
  subtotal: 150,
  taxRate: 0.1,
  taxAmount: 15,
  total: 165,
  status: 'sent',
  payments: [],
  createdAt: '2026-02-15T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
  ...overrides,
})

describe('estimateSharing edge cases', () => {
  it('builds shareable data with unicode customer name', () => {
    const data = buildShareableData(makeEstimate(), 'José García', 'Acme™')
    expect(data.c).toBe('José García')
    expect(data.bn).toBe('Acme™')
  })

  it('omits notes when empty', () => {
    const data = buildShareableData(makeEstimate({ notes: '' }), 'John')
    expect(data.no).toBeUndefined()
  })

  it('omits businessName when not provided', () => {
    const data = buildShareableData(makeEstimate(), 'John')
    expect(data.bn).toBeUndefined()
  })

  it('encodes and decodes unicode round-trip', () => {
    const data = buildShareableData(makeEstimate(), '日本太郎', '株式会社')
    const encoded = encodeEstimateData(data)
    const decoded = decodeEstimateData(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.c).toBe('日本太郎')
    expect(decoded!.bn).toBe('株式会社')
  })

  it('decodeEstimateData returns null for empty string', () => {
    expect(decodeEstimateData('')).toBeNull()
  })

  it('decodeEstimateData returns null for invalid base64', () => {
    expect(decodeEstimateData('not-valid!!!')).toBeNull()
  })

  it('expandLineItems handles empty array', () => {
    expect(expandLineItems([])).toEqual([])
  })

  it('expandLineItems calculates total correctly with floating point', () => {
    const items = expandLineItems([['Widget', 3, 9.99]])
    expect(items[0].total).toBe(29.97) // 3 * 9.99 = 29.97
    expect(items[0].id).toBe('0')
  })

  it('expandLineItems handles zero quantity', () => {
    const items = expandLineItems([['Free Item', 0, 100]])
    expect(items[0].total).toBe(0)
  })

  it('expandLineItems handles negative unit price', () => {
    const items = expandLineItems([['Discount', 1, -50]])
    expect(items[0].total).toBe(-50)
  })

  it('buildShareUrl contains estimate id prefix', () => {
    const url = buildShareUrl(makeEstimate(), 'John')
    expect(url).toContain('abcdef12')
    expect(url).toContain('jobrun.app')
  })

  it('buildShareMessage includes business name', () => {
    const msg = buildShareMessage(makeEstimate(), 'John', 'Kris Cleaning')
    expect(msg).toContain('Kris Cleaning')
    expect(msg).toContain('jobrun.app')
  })

  it('buildShareMessage defaults to "our company"', () => {
    const msg = buildShareMessage(makeEstimate(), 'John')
    expect(msg).toContain('our company')
  })
})

describe('invoiceSharing edge cases', () => {
  it('builds shareable data with all optional fields', () => {
    const inv = makeInvoice({
      notes: 'Thank you!',
      paymentTerms: 'Net 30',
      dueDate: '2026-03-15T00:00:00Z',
    })
    const data = buildShareableInvoiceData(inv, 'John', 'My Biz')
    expect(data.no).toBe('Thank you!')
    expect(data.pt).toBe('Net 30')
    expect(data.dd).toBe('2026-03-15')
    expect(data.bn).toBe('My Biz')
  })

  it('omits optional fields when not present', () => {
    const data = buildShareableInvoiceData(makeInvoice(), 'John')
    expect(data.no).toBeUndefined()
    expect(data.pt).toBeUndefined()
    expect(data.bn).toBeUndefined()
  })

  it('encode/decode round-trip with special characters', () => {
    const inv = makeInvoice({ notes: 'Price: $100 & 10% off <special>' })
    const data = buildShareableInvoiceData(inv, 'O\'Brien & Sons')
    const encoded = encodeInvoiceData(data)
    const decoded = decodeInvoiceData(encoded)
    expect(decoded!.no).toBe('Price: $100 & 10% off <special>')
    expect(decoded!.c).toBe('O\'Brien & Sons')
  })

  it('decodeInvoiceData returns null for garbage', () => {
    expect(decodeInvoiceData('zz!!@@')).toBeNull()
  })

  it('expandInvoiceLineItems handles floating point precision', () => {
    const items = expandInvoiceLineItems([['Service', 7, 14.99]])
    // 7 * 14.99 = 104.93
    expect(items[0].total).toBe(104.93)
  })

  it('buildInvoiceShareUrl contains invoice id prefix', () => {
    const url = buildInvoiceShareUrl(makeInvoice(), 'John')
    expect(url).toContain('inv12345')
    expect(url).toContain('view/invoice')
  })

  it('buildInvoiceShareMessage defaults business name', () => {
    const msg = buildInvoiceShareMessage(makeInvoice(), 'John')
    expect(msg).toContain('our company')
  })
})
