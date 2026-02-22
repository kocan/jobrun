import { describe, it, expect } from 'vitest';
import {
  computeStats,
  formatTime12,
  timeToMinutes,
  formatWeekRange,
  getWeekStart,
  getWeekDays,
  getLocalDateString,
  getTomorrowDateString,
  groupJobsByDate,
  getJobsInRange,
} from '../lib/dateUtils';
import type { Job } from '../lib/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    customerId: 'c1',
    title: 'Test Job',
    status: 'scheduled',
    scheduledDate: '2026-02-22',
    lineItems: [],
    total: 100,
    photos: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({ total: 0, completed: 0, revenue: 0 });
  });

  it('counts only completed jobs for revenue', () => {
    const jobs = [
      makeJob({ status: 'completed', total: 200 }),
      makeJob({ status: 'scheduled', total: 500 }),
      makeJob({ status: 'cancelled', total: 300 }),
    ];
    expect(computeStats(jobs)).toEqual({ total: 3, completed: 1, revenue: 200 });
  });

  it('sums revenue from multiple completed jobs', () => {
    const jobs = [
      makeJob({ status: 'completed', total: 100.50 }),
      makeJob({ status: 'completed', total: 200.25 }),
    ];
    const stats = computeStats(jobs);
    expect(stats.revenue).toBeCloseTo(300.75);
    expect(stats.completed).toBe(2);
  });

  it('handles zero-total completed jobs', () => {
    const jobs = [makeJob({ status: 'completed', total: 0 })];
    expect(computeStats(jobs)).toEqual({ total: 1, completed: 1, revenue: 0 });
  });
});

describe('formatTime12', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime12('0:00')).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('formats 1 PM', () => {
    expect(formatTime12('13:00')).toBe('1:00 PM');
  });

  it('formats 11:59 PM', () => {
    expect(formatTime12('23:59')).toBe('11:59 PM');
  });

  it('formats single-digit hour', () => {
    expect(formatTime12('9:05')).toBe('9:05 AM');
  });

  it('pads minutes', () => {
    expect(formatTime12('8:5')).toBe('8:05 AM');
  });
});

describe('timeToMinutes', () => {
  it('converts midnight to 0', () => {
    expect(timeToMinutes('0:00')).toBe(0);
  });

  it('converts 1:30 to 90', () => {
    expect(timeToMinutes('1:30')).toBe(90);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('handles hour-only string', () => {
    expect(timeToMinutes('14')).toBe(840);
  });
});

describe('formatWeekRange', () => {
  it('formats same-month week', () => {
    const mon = new Date(2026, 1, 16); // Feb 16 Mon
    expect(formatWeekRange(mon)).toBe('Feb 16 - 22, 2026');
  });

  it('formats cross-month week', () => {
    const mon = new Date(2026, 1, 23); // Feb 23 Mon
    expect(formatWeekRange(mon)).toBe('Feb 23 - Mar 1, 2026');
  });

  it('formats cross-year week', () => {
    const mon = new Date(2025, 11, 29); // Dec 29 Mon
    expect(formatWeekRange(mon)).toBe('Dec 29, 2025 - Jan 4, 2026');
  });
});

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 1, 25); // Wed Feb 25
    const mon = getWeekStart(wed);
    expect(mon.getDay()).toBe(1); // Monday
    expect(mon.getDate()).toBe(23);
  });

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 1, 23);
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(23);
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2026, 2, 1); // Sun Mar 1
    const mon = getWeekStart(sun);
    expect(mon.getDate()).toBe(23); // Feb 23
  });
});

describe('getWeekDays', () => {
  it('returns 7 days', () => {
    const days = getWeekDays(new Date(2026, 1, 22));
    expect(days).toHaveLength(7);
  });
});

describe('groupJobsByDate', () => {
  it('returns empty object for empty array', () => {
    expect(groupJobsByDate([])).toEqual({});
  });

  it('groups jobs by date', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-22' }),
      makeJob({ scheduledDate: '2026-02-22' }),
      makeJob({ scheduledDate: '2026-02-23' }),
    ];
    const groups = groupJobsByDate(jobs);
    expect(groups['2026-02-22']).toHaveLength(2);
    expect(groups['2026-02-23']).toHaveLength(1);
  });
});

describe('getJobsInRange', () => {
  it('returns empty for no matches', () => {
    const jobs = [makeJob({ scheduledDate: '2026-03-01' })];
    expect(getJobsInRange(jobs, '2026-02-01', '2026-02-28')).toEqual([]);
  });

  it('includes boundary dates', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-01' }),
      makeJob({ scheduledDate: '2026-02-28' }),
    ];
    expect(getJobsInRange(jobs, '2026-02-01', '2026-02-28')).toHaveLength(2);
  });
});
