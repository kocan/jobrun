import {
  computeStats,
  getLocalDateString,
  getTomorrowDateString,
  getWeekStart,
  getWeekDays,
  formatWeekRange,
  formatTime12,
  groupJobsByDate,
  getJobsInRange,
  timeToMinutes,
  DAY_NAMES,
} from '../lib/dateUtils'
import { Job } from '../lib/types'
import { describe, it, expect } from 'vitest'

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: '1',
  customerId: 'c1',
  title: 'Test',
  status: 'scheduled',
  scheduledDate: '2026-01-15',
  lineItems: [],
  total: 0,
  photos: [],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('computeStats edge cases', () => {
  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({ total: 0, completed: 0, revenue: 0 })
  })

  it('does not count non-completed jobs in revenue', () => {
    const jobs = [
      makeJob({ status: 'scheduled', total: 100 }),
      makeJob({ status: 'cancelled', total: 200 }),
    ]
    expect(computeStats(jobs)).toEqual({ total: 2, completed: 0, revenue: 0 })
  })

  it('sums revenue of completed jobs only', () => {
    const jobs = [
      makeJob({ status: 'completed', total: 150.50 }),
      makeJob({ status: 'completed', total: 49.50 }),
      makeJob({ status: 'in-progress', total: 1000 }),
    ]
    expect(computeStats(jobs)).toEqual({ total: 3, completed: 2, revenue: 200 })
  })

  it('handles zero totals', () => {
    const jobs = [makeJob({ status: 'completed', total: 0 })]
    expect(computeStats(jobs)).toEqual({ total: 1, completed: 1, revenue: 0 })
  })

  it('handles negative totals (credits)', () => {
    const jobs = [makeJob({ status: 'completed', total: -50 })]
    expect(computeStats(jobs).revenue).toBe(-50)
  })
})

describe('getLocalDateString edge cases', () => {
  it('pads month and day correctly', () => {
    expect(getLocalDateString(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('handles December 31', () => {
    expect(getLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('handles leap year Feb 29', () => {
    expect(getLocalDateString(new Date(2028, 1, 29))).toBe('2028-02-29')
  })
})

describe('getTomorrowDateString edge cases', () => {
  it('crosses month boundary', () => {
    expect(getTomorrowDateString(new Date(2026, 0, 31))).toBe('2026-02-01')
  })

  it('crosses year boundary', () => {
    expect(getTomorrowDateString(new Date(2025, 11, 31))).toBe('2026-01-01')
  })
})

describe('getWeekStart edge cases', () => {
  it('Saturday returns previous Monday', () => {
    const sat = new Date(2026, 1, 14) // Saturday
    const monday = getWeekStart(sat)
    expect(monday.getDate()).toBe(9) // Feb 9
  })

  it('does not mutate input date', () => {
    const original = new Date(2026, 1, 15)
    const originalTime = original.getTime()
    getWeekStart(original)
    expect(original.getTime()).toBe(originalTime)
  })
})

describe('getWeekDays edge cases', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays(new Date(2026, 1, 15))).toHaveLength(7)
  })

  it('first day is Monday, last is Sunday', () => {
    const days = getWeekDays(new Date(2026, 1, 15))
    expect(days[0].getDay()).toBe(1) // Monday
    expect(days[6].getDay()).toBe(0) // Sunday
  })

  it('handles week crossing month boundary', () => {
    const days = getWeekDays(new Date(2026, 0, 31)) // Sat Jan 31 — Mon is Jan 26
    expect(days[0].getMonth()).toBe(0) // Jan
    expect(days[6].getMonth()).toBe(1) // Feb 1
  })
})

describe('formatWeekRange edge cases', () => {
  it('handles cross-year range', () => {
    const dec29 = new Date(2025, 11, 29) // Monday Dec 29
    const result = formatWeekRange(dec29)
    expect(result).toContain('2025')
    expect(result).toContain('2026')
  })
})

describe('formatTime12 edge cases', () => {
  it('handles midnight (0:00)', () => {
    expect(formatTime12('0:00')).toBe('12:00 AM')
  })

  it('handles noon (12:00)', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM')
  })

  it('handles 23:59', () => {
    expect(formatTime12('23:59')).toBe('11:59 PM')
  })

  it('handles 1:00 AM', () => {
    expect(formatTime12('1:00')).toBe('1:00 AM')
  })

  it('handles single-digit minute', () => {
    expect(formatTime12('9:05')).toBe('9:05 AM')
  })
})

describe('groupJobsByDate edge cases', () => {
  it('returns empty object for empty array', () => {
    expect(groupJobsByDate([])).toEqual({})
  })

  it('groups multiple jobs on same date', () => {
    const jobs = [
      makeJob({ id: '1', scheduledDate: '2026-01-15' }),
      makeJob({ id: '2', scheduledDate: '2026-01-15' }),
      makeJob({ id: '3', scheduledDate: '2026-01-16' }),
    ]
    const groups = groupJobsByDate(jobs)
    expect(groups['2026-01-15']).toHaveLength(2)
    expect(groups['2026-01-16']).toHaveLength(1)
  })
})

describe('getJobsInRange edge cases', () => {
  it('returns empty for no jobs', () => {
    expect(getJobsInRange([], '2026-01-01', '2026-12-31')).toEqual([])
  })

  it('includes boundary dates (inclusive)', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-01-01' }),
      makeJob({ scheduledDate: '2026-01-31' }),
      makeJob({ scheduledDate: '2026-02-01' }),
    ]
    const result = getJobsInRange(jobs, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
  })

  it('returns empty when start > end', () => {
    const jobs = [makeJob({ scheduledDate: '2026-06-15' })]
    expect(getJobsInRange(jobs, '2026-12-01', '2026-01-01')).toEqual([])
  })
})

describe('timeToMinutes edge cases', () => {
  it('handles midnight', () => {
    expect(timeToMinutes('0:00')).toBe(0)
  })

  it('handles 23:59', () => {
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('handles hour only (no minutes)', () => {
    expect(timeToMinutes('14')).toBe(840)
  })

  it('handles single-digit hour', () => {
    expect(timeToMinutes('9:30')).toBe(570)
  })
})
