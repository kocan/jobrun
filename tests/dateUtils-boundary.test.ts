import { describe, it, expect } from 'vitest';
import {
  computeStats,
  formatTime12,
  timeToMinutes,
  formatWeekRange,
  getWeekStart,
  getLocalDateString,
  getTomorrowDateString,
  getJobsInRange,
  groupJobsByDate,
} from '../lib/dateUtils';
import { Job } from '../lib/types';

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: '1', customerId: 'c1', title: 'Test', status: 'scheduled',
  scheduledDate: '2026-02-10', scheduledTime: '09:00', estimatedDuration: 60,
  lineItems: [], total: 100, photos: [],
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('computeStats boundary cases', () => {
  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({ total: 0, completed: 0, revenue: 0 });
  });

  it('ignores non-completed jobs in revenue', () => {
    const jobs = [
      makeJob({ status: 'scheduled', total: 500 }),
      makeJob({ id: '2', status: 'cancelled', total: 300 }),
      makeJob({ id: '3', status: 'in-progress', total: 200 }),
    ];
    const stats = computeStats(jobs);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(0);
    expect(stats.revenue).toBe(0);
  });

  it('sums revenue correctly with decimals', () => {
    const jobs = [
      makeJob({ status: 'completed', total: 99.99 }),
      makeJob({ id: '2', status: 'completed', total: 0.01 }),
    ];
    expect(computeStats(jobs).revenue).toBeCloseTo(100.0);
  });

  it('handles zero-dollar completed jobs', () => {
    const jobs = [makeJob({ status: 'completed', total: 0 })];
    const stats = computeStats(jobs);
    expect(stats.completed).toBe(1);
    expect(stats.revenue).toBe(0);
  });

  it('handles negative totals (credits)', () => {
    const jobs = [makeJob({ status: 'completed', total: -50 })];
    expect(computeStats(jobs).revenue).toBe(-50);
  });
});

describe('formatTime12 edge cases', () => {
  it('midnight → 12:00 AM', () => {
    expect(formatTime12('0:00')).toBe('12:00 AM');
  });

  it('00:00 → 12:00 AM', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM');
  });

  it('noon → 12:00 PM', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('23:59 → 11:59 PM', () => {
    expect(formatTime12('23:59')).toBe('11:59 PM');
  });

  it('1:05 → 1:05 AM', () => {
    expect(formatTime12('1:05')).toBe('1:05 AM');
  });

  it('13:00 → 1:00 PM', () => {
    expect(formatTime12('13:00')).toBe('1:00 PM');
  });
});

describe('timeToMinutes edge cases', () => {
  it('midnight → 0', () => {
    expect(timeToMinutes('0:00')).toBe(0);
  });

  it('23:59 → 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('handles no minutes part', () => {
    expect(timeToMinutes('9')).toBe(540);
  });
});

describe('formatWeekRange cross-boundary', () => {
  it('handles week crossing month boundary', () => {
    // Mon Jan 26 - Sun Feb 1, 2026
    const mon = new Date(2026, 0, 26); // Jan 26
    const result = formatWeekRange(mon);
    expect(result).toBe('Jan 26 - Feb 1, 2026');
  });

  it('handles week crossing year boundary', () => {
    // Mon Dec 28, 2026 - Sun Jan 3, 2027
    const mon = new Date(2026, 11, 28);
    const result = formatWeekRange(mon);
    expect(result).toBe('Dec 28, 2026 - Jan 3, 2027');
  });

  it('handles week within same month', () => {
    const mon = new Date(2026, 1, 2); // Feb 2
    const result = formatWeekRange(mon);
    expect(result).toBe('Feb 2 - 8, 2026');
  });
});

describe('getWeekStart edge cases', () => {
  it('Sunday returns previous Monday', () => {
    const sun = new Date(2026, 1, 1); // Feb 1 is a Sunday
    const ws = getWeekStart(sun);
    expect(ws.getDate()).toBe(26); // Jan 26
    expect(ws.getMonth()).toBe(0);
  });

  it('Monday returns itself', () => {
    const mon = new Date(2026, 1, 2); // Feb 2 is a Monday
    const ws = getWeekStart(mon);
    expect(ws.getDate()).toBe(2);
    expect(ws.getMonth()).toBe(1);
  });
});

describe('getLocalDateString edge cases', () => {
  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDateString(d)).toBe('2026-01-05');
  });

  it('handles Dec 31', () => {
    const d = new Date(2026, 11, 31);
    expect(getLocalDateString(d)).toBe('2026-12-31');
  });
});

describe('getTomorrowDateString', () => {
  it('rolls over month boundary', () => {
    const jan31 = new Date(2026, 0, 31);
    expect(getTomorrowDateString(jan31)).toBe('2026-02-01');
  });

  it('rolls over year boundary', () => {
    const dec31 = new Date(2026, 11, 31);
    expect(getTomorrowDateString(dec31)).toBe('2027-01-01');
  });

  it('handles leap year', () => {
    const feb28 = new Date(2028, 1, 28); // 2028 is leap year
    expect(getTomorrowDateString(feb28)).toBe('2028-02-29');
  });

  it('handles non-leap year Feb 28', () => {
    const feb28 = new Date(2026, 1, 28);
    expect(getTomorrowDateString(feb28)).toBe('2026-03-01');
  });
});

describe('getJobsInRange edge cases', () => {
  it('returns empty for no jobs', () => {
    expect(getJobsInRange([], '2026-01-01', '2026-12-31')).toEqual([]);
  });

  it('includes jobs on boundary dates (inclusive)', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-01' }),
      makeJob({ id: '2', scheduledDate: '2026-02-28' }),
    ];
    const result = getJobsInRange(jobs, '2026-02-01', '2026-02-28');
    expect(result).toHaveLength(2);
  });

  it('excludes jobs outside range', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-01-31' }),
      makeJob({ id: '2', scheduledDate: '2026-03-01' }),
    ];
    const result = getJobsInRange(jobs, '2026-02-01', '2026-02-28');
    expect(result).toHaveLength(0);
  });

  it('handles single-day range', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-15' }),
      makeJob({ id: '2', scheduledDate: '2026-02-16' }),
    ];
    const result = getJobsInRange(jobs, '2026-02-15', '2026-02-15');
    expect(result).toHaveLength(1);
  });
});

describe('groupJobsByDate edge cases', () => {
  it('returns empty object for empty array', () => {
    expect(groupJobsByDate([])).toEqual({});
  });

  it('groups multiple jobs on same date', () => {
    const jobs = [
      makeJob({ id: '1', scheduledDate: '2026-02-10' }),
      makeJob({ id: '2', scheduledDate: '2026-02-10' }),
      makeJob({ id: '3', scheduledDate: '2026-02-11' }),
    ];
    const grouped = groupJobsByDate(jobs);
    expect(grouped['2026-02-10']).toHaveLength(2);
    expect(grouped['2026-02-11']).toHaveLength(1);
  });
});
