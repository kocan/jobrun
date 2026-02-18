import { describe, it, expect } from 'vitest';
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
} from '../lib/dateUtils';
import type { Job } from '../lib/types';

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'j1',
  customerId: 'c1',
  title: 'Test Job',
  status: 'scheduled',
  scheduledDate: '2026-02-18',
  lineItems: [],
  total: 100,
  photos: [],
  createdAt: '2026-02-18T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
  ...overrides,
});

describe('computeStats edge cases', () => {
  it('returns zeros for empty array', () => {
    const stats = computeStats([]);
    expect(stats).toEqual({ total: 0, completed: 0, revenue: 0 });
  });

  it('excludes non-completed jobs from revenue', () => {
    const jobs = [
      makeJob({ status: 'scheduled', total: 500 }),
      makeJob({ status: 'in-progress', total: 300 }),
      makeJob({ status: 'cancelled', total: 200 }),
      makeJob({ status: 'completed', total: 100 }),
    ];
    const stats = computeStats(jobs);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(1);
    expect(stats.revenue).toBe(100);
  });

  it('handles jobs with zero total', () => {
    const jobs = [makeJob({ status: 'completed', total: 0 })];
    expect(computeStats(jobs).revenue).toBe(0);
  });

  it('handles large revenue sums', () => {
    const jobs = Array.from({ length: 1000 }, (_, i) =>
      makeJob({ id: `j${i}`, status: 'completed', total: 9999.99 })
    );
    const stats = computeStats(jobs);
    expect(stats.completed).toBe(1000);
    expect(stats.revenue).toBeCloseTo(9999990, 0);
  });
});

describe('getLocalDateString edge cases', () => {
  it('pads single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDateString(date)).toBe('2026-01-05');
  });

  it('handles Dec 31', () => {
    const date = new Date(2026, 11, 31);
    expect(getLocalDateString(date)).toBe('2026-12-31');
  });

  it('handles Jan 1', () => {
    const date = new Date(2026, 0, 1);
    expect(getLocalDateString(date)).toBe('2026-01-01');
  });

  it('handles leap year Feb 29', () => {
    const date = new Date(2028, 1, 29);
    expect(getLocalDateString(date)).toBe('2028-02-29');
  });
});

describe('getTomorrowDateString edge cases', () => {
  it('crosses month boundary', () => {
    const date = new Date(2026, 0, 31); // Jan 31
    expect(getTomorrowDateString(date)).toBe('2026-02-01');
  });

  it('crosses year boundary', () => {
    const date = new Date(2026, 11, 31); // Dec 31
    expect(getTomorrowDateString(date)).toBe('2027-01-01');
  });

  it('handles leap year boundary', () => {
    const date = new Date(2028, 1, 28); // Feb 28 leap year
    expect(getTomorrowDateString(date)).toBe('2028-02-29');
  });

  it('non-leap year Feb 28 goes to Mar 1', () => {
    const date = new Date(2026, 1, 28);
    expect(getTomorrowDateString(date)).toBe('2026-03-01');
  });
});

describe('getWeekStart edge cases', () => {
  it('Monday returns same day', () => {
    const monday = new Date(2026, 1, 16); // Monday Feb 16
    const result = getWeekStart(monday);
    expect(result.getDate()).toBe(16);
  });

  it('Sunday returns previous Monday', () => {
    const sunday = new Date(2026, 1, 22); // Sunday Feb 22
    const result = getWeekStart(sunday);
    expect(result.getDate()).toBe(16);
  });

  it('Wednesday returns Monday of same week', () => {
    const wed = new Date(2026, 1, 18);
    const result = getWeekStart(wed);
    expect(result.getDate()).toBe(16);
  });

  it('zeroes out time', () => {
    const date = new Date(2026, 1, 18, 15, 30, 45);
    const result = getWeekStart(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe('getWeekDays', () => {
  it('always returns 7 days', () => {
    expect(getWeekDays(new Date(2026, 1, 18))).toHaveLength(7);
  });

  it('starts on Monday ends on Sunday', () => {
    const days = getWeekDays(new Date(2026, 1, 18));
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[6].getDay()).toBe(0); // Sunday
  });

  it('handles week crossing month boundary', () => {
    const days = getWeekDays(new Date(2026, 1, 28)); // Sat Feb 28
    // Week of Feb 23 (Mon) to Mar 1 (Sun)
    expect(days[0].getMonth()).toBe(1); // Feb
    expect(days[6].getMonth()).toBe(2); // Mar
  });
});

describe('formatWeekRange edge cases', () => {
  it('same month', () => {
    const monday = new Date(2026, 1, 16);
    expect(formatWeekRange(monday)).toBe('Feb 16 - 22, 2026');
  });

  it('cross-month', () => {
    const monday = new Date(2026, 1, 23);
    expect(formatWeekRange(monday)).toBe('Feb 23 - Mar 1, 2026');
  });

  it('cross-year', () => {
    const monday = new Date(2026, 11, 28);
    expect(formatWeekRange(monday)).toBe('Dec 28, 2026 - Jan 3, 2027');
  });
});

describe('formatTime12 edge cases', () => {
  it('midnight (0:00)', () => {
    expect(formatTime12('0:00')).toBe('12:00 AM');
  });

  it('noon (12:00)', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('1 AM', () => {
    expect(formatTime12('1:00')).toBe('1:00 AM');
  });

  it('11:59 PM', () => {
    expect(formatTime12('23:59')).toBe('11:59 PM');
  });

  it('single digit minutes', () => {
    expect(formatTime12('9:05')).toBe('9:05 AM');
  });

  it('1 PM', () => {
    expect(formatTime12('13:00')).toBe('1:00 PM');
  });
});

describe('groupJobsByDate', () => {
  it('returns empty object for empty array', () => {
    expect(groupJobsByDate([])).toEqual({});
  });

  it('groups multiple jobs on same date', () => {
    const jobs = [
      makeJob({ id: 'j1', scheduledDate: '2026-02-18' }),
      makeJob({ id: 'j2', scheduledDate: '2026-02-18' }),
      makeJob({ id: 'j3', scheduledDate: '2026-02-19' }),
    ];
    const groups = groupJobsByDate(jobs);
    expect(groups['2026-02-18']).toHaveLength(2);
    expect(groups['2026-02-19']).toHaveLength(1);
  });
});

describe('getJobsInRange', () => {
  const jobs = [
    makeJob({ id: 'j1', scheduledDate: '2026-02-15' }),
    makeJob({ id: 'j2', scheduledDate: '2026-02-18' }),
    makeJob({ id: 'j3', scheduledDate: '2026-02-20' }),
    makeJob({ id: 'j4', scheduledDate: '2026-02-25' }),
  ];

  it('includes boundary dates', () => {
    const result = getJobsInRange(jobs, '2026-02-18', '2026-02-20');
    expect(result).toHaveLength(2);
  });

  it('returns empty for range with no jobs', () => {
    expect(getJobsInRange(jobs, '2026-03-01', '2026-03-31')).toEqual([]);
  });

  it('returns all when range covers everything', () => {
    expect(getJobsInRange(jobs, '2026-01-01', '2026-12-31')).toHaveLength(4);
  });
});

describe('timeToMinutes edge cases', () => {
  it('midnight', () => {
    expect(timeToMinutes('0:00')).toBe(0);
  });

  it('end of day', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('noon', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  it('handles missing minutes', () => {
    // '9' → split gives ['9'], m is NaN, becomes 0
    expect(timeToMinutes('9')).toBe(540);
  });
});
