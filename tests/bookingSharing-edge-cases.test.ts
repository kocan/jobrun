import { describe, it, expect } from 'vitest'
import {
  buildShareableBookingData,
  encodeBookingData,
  decodeBookingData,
  buildBookingUrl,
  SHARE_BASE_URL,
  type ShareableBookingData,
} from '../lib/bookingSharing'

describe('buildShareableBookingData', () => {
  const makeService = (name: string, price: number, isActive = true) => ({
    id: `svc-${name}`,
    name,
    price,
    isActive,
    description: '',
    category: 'general',
    estimatedDuration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  it('filters out inactive services', () => {
    const services = [
      makeService('Haircut', 25, true),
      makeService('Shave', 15, false),
      makeService('Trim', 10, true),
    ]
    const result = buildShareableBookingData(services as any, 'Barber Shop')
    expect(result.sv).toHaveLength(2)
    expect(result.sv.map(s => s[0])).toEqual(['Haircut', 'Trim'])
  })

  it('omits optional fields when empty strings provided', () => {
    const result = buildShareableBookingData([], 'Shop', '', '')
    expect(result.ph).toBeUndefined()
    expect(result.em).toBeUndefined()
  })

  it('includes phone and email when provided', () => {
    const result = buildShareableBookingData([], 'Shop', '555-1234', 'a@b.com')
    expect(result.ph).toBe('555-1234')
    expect(result.em).toBe('a@b.com')
  })

  it('handles empty services array', () => {
    const result = buildShareableBookingData([], 'Empty Shop')
    expect(result.sv).toEqual([])
    expect(result.bn).toBe('Empty Shop')
  })

  it('handles services with zero price', () => {
    const services = [makeService('Free Consultation', 0)]
    const result = buildShareableBookingData(services as any, 'Shop')
    expect(result.sv[0]).toEqual(['Free Consultation', 0])
  })

  it('handles services with very large prices', () => {
    const services = [makeService('Premium', 999999.99)]
    const result = buildShareableBookingData(services as any, 'Shop')
    expect(result.sv[0][1]).toBe(999999.99)
  })

  it('handles business name with unicode', () => {
    const result = buildShareableBookingData([], '美容室 München 💇')
    expect(result.bn).toBe('美容室 München 💇')
  })
})

describe('encodeBookingData / decodeBookingData roundtrip', () => {
  it('roundtrips basic data', () => {
    const data: ShareableBookingData = {
      bn: 'Test Shop',
      sv: [['Cut', 25], ['Color', 50]],
      ph: '555-0000',
    }
    const encoded = encodeBookingData(data)
    const decoded = decodeBookingData(encoded)
    expect(decoded).toEqual(data)
  })

  it('roundtrips empty services', () => {
    const data: ShareableBookingData = { bn: 'Empty', sv: [] }
    expect(decodeBookingData(encodeBookingData(data))).toEqual(data)
  })

  it('roundtrips unicode content', () => {
    const data: ShareableBookingData = {
      bn: '日本語テスト 🎉',
      sv: [['サービス', 1000]],
    }
    expect(decodeBookingData(encodeBookingData(data))).toEqual(data)
  })

  it('decodeBookingData returns null for garbage input', () => {
    expect(decodeBookingData('not-valid-base64!!!')).toBeNull()
  })

  it('decodeBookingData returns null for empty string', () => {
    expect(decodeBookingData('')).toBeNull()
  })

  it('decodeBookingData returns null for valid base64 but invalid JSON', () => {
    const encoded = encodeURIComponent(btoa('not json'))
    expect(decodeBookingData(encoded)).toBeNull()
  })
})

describe('buildBookingUrl', () => {
  it('includes operator id and encoded data param', () => {
    const url = buildBookingUrl('op-123', [] as any, 'Shop')
    expect(url).toContain(`${SHARE_BASE_URL}/book/op-123`)
    expect(url).toContain('?d=')
  })

  it('produces a decodable URL', () => {
    const url = buildBookingUrl('op-1', [] as any, 'My Shop', '555', 'a@b.com')
    const dParam = new URL(url).searchParams.get('d')
    expect(dParam).toBeTruthy()
    const decoded = decodeBookingData(dParam!)
    expect(decoded?.bn).toBe('My Shop')
    expect(decoded?.ph).toBe('555')
    expect(decoded?.em).toBe('a@b.com')
  })

  it('SHARE_BASE_URL is https', () => {
    expect(SHARE_BASE_URL).toMatch(/^https:\/\//)
  })
})
