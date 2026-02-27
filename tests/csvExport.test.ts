import { describe, it, expect, vi } from 'vitest'

// Mock expo modules before importing csvExport
vi.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  writeAsStringAsync: vi.fn(),
  EncodingType: { UTF8: 'utf8' },
}))
vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}))

import { customersToCSV, jobsToCSV, invoicesToCSV } from '../lib/csvExport'

function makeCustomer(overrides: Record<string, any> = {}) {
  return {
    id: 'c1', firstName: 'John', lastName: 'Doe', email: 'john@example.com',
    phone: '555-1234', address: '123 Main St', city: 'Springfield',
    state: 'IL', zip: '62701', notes: '',
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeJob(overrides: Record<string, any> = {}) {
  return {
    id: 'j1', customerId: 'c1', title: 'Pressure Wash Driveway',
    status: 'completed', scheduledDate: '2026-02-01', scheduledTime: '09:00',
    estimatedDuration: 60, total: 150, notes: '', photos: [], lineItems: [],
    createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z',
    ...overrides,
  }
}

function makeInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 'i1', customerId: 'c1', invoiceNumber: 'INV-001', status: 'paid',
    subtotal: 150, taxRate: 0.07, taxAmount: 10.5, total: 160.5,
    dueDate: '2026-02-15', paidAt: '2026-02-10T14:30:00Z',
    paymentTerms: 'net-30', notes: '', lineItems: [],
    createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z',
    ...overrides,
  }
}

describe('customersToCSV', () => {
  it('generates correct headers for empty array', () => {
    const csv = customersToCSV([])
    expect(csv).toBe('First Name,Last Name,Email,Phone,Address,City,State,Zip,Notes,Created')
  })

  it('generates a row for a basic customer', () => {
    const csv = customersToCSV([makeCustomer()] as any)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('John')
    expect(lines[1]).toContain('2026-01-15')
  })

  it('escapes commas in fields', () => {
    const csv = customersToCSV([makeCustomer({ address: '123 Main St, Apt 4' })] as any)
    expect(csv).toContain('"123 Main St, Apt 4"')
  })

  it('escapes double quotes in fields', () => {
    const csv = customersToCSV([makeCustomer({ notes: 'Called "Bob"' })] as any)
    expect(csv).toContain('"Called ""Bob"""')
  })

  it('handles newlines in notes', () => {
    const csv = customersToCSV([makeCustomer({ notes: 'Line 1\nLine 2' })] as any)
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it('handles undefined/null optional fields', () => {
    const csv = customersToCSV([makeCustomer({ email: undefined, phone: null })] as any)
    expect(csv.split('\n')).toHaveLength(2)
  })

  it('handles empty string fields', () => {
    const csv = customersToCSV([makeCustomer({ firstName: '', lastName: '' })] as any)
    expect(csv.split('\n')[1]).toMatch(/^,/)
  })

  it('handles unicode names', () => {
    const csv = customersToCSV([makeCustomer({ firstName: 'José', lastName: 'García' })] as any)
    expect(csv).toContain('José')
    expect(csv).toContain('García')
  })

  it('handles emoji in notes', () => {
    const csv = customersToCSV([makeCustomer({ notes: 'Great 👍🏽' })] as any)
    expect(csv).toContain('Great 👍🏽')
  })

  it('handles multiple customers', () => {
    const csv = customersToCSV([
      makeCustomer({ firstName: 'Alice' }),
      makeCustomer({ id: 'c2', firstName: 'Bob' }),
    ] as any)
    expect(csv.split('\n')).toHaveLength(3)
  })
})

describe('jobsToCSV', () => {
  it('generates correct headers', () => {
    const csv = jobsToCSV([], {})
    expect(csv).toContain('Title,Customer,Status')
  })

  it('maps customerId to customer name', () => {
    const csv = jobsToCSV([makeJob()] as any, { c1: 'John Doe' })
    expect(csv).toContain('John Doe')
  })

  it('handles missing customer in map gracefully', () => {
    const csv = jobsToCSV([makeJob({ customerId: 'unknown' })] as any, {})
    expect(csv.split('\n')).toHaveLength(2)
  })

  it('handles zero total', () => {
    const csv = jobsToCSV([makeJob({ total: 0 })] as any, {})
    expect(csv).toContain(',0,')
  })

  it('handles undefined optional fields', () => {
    const csv = jobsToCSV([makeJob({ scheduledTime: undefined, estimatedDuration: undefined })] as any, {})
    expect(csv.split('\n')).toHaveLength(2)
  })

  it('escapes job title with commas', () => {
    const csv = jobsToCSV([makeJob({ title: 'Wash, Wax, Detail' })] as any, {})
    expect(csv).toContain('"Wash, Wax, Detail"')
  })
})

describe('invoicesToCSV', () => {
  it('generates correct headers', () => {
    const csv = invoicesToCSV([], {})
    expect(csv).toContain('Invoice #,Customer,Status')
  })

  it('handles unpaid invoice (no paidAt)', () => {
    const csv = invoicesToCSV([makeInvoice({ paidAt: null })] as any, { c1: 'John' })
    expect(csv.split('\n')).toHaveLength(2)
  })

  it('handles zero tax rate', () => {
    const csv = invoicesToCSV([makeInvoice({ taxRate: 0, taxAmount: 0 })] as any, {})
    expect(csv).toContain(',0,0,')
  })

  it('escapes special characters in invoice number', () => {
    const csv = invoicesToCSV([makeInvoice({ invoiceNumber: 'INV-2026/001, Rev.2' })] as any, {})
    expect(csv).toContain('"INV-2026/001, Rev.2"')
  })

  it('handles negative amounts (credits)', () => {
    const csv = invoicesToCSV([makeInvoice({ subtotal: -50, total: -50 })] as any, {})
    expect(csv).toContain('-50')
  })

  it('handles very long notes', () => {
    const longNote = 'A'.repeat(5000)
    const csv = invoicesToCSV([makeInvoice({ notes: longNote })] as any, {})
    expect(csv).toContain(longNote)
  })

  it('handles undefined paidAt gracefully', () => {
    const csv = invoicesToCSV([makeInvoice({ paidAt: undefined })] as any, {})
    expect(csv.split('\n')).toHaveLength(2)
  })
})
