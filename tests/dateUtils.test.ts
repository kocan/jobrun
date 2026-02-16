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
  DAY_NAMES,
} from '../lib/dateUtils';
import type { Job } from '../lib/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    customerId: 'c1',
    title: 'Test Job',
    status: 'scheduled',
    scheduledDate: '2026-02-16',
    lineItems: [],
    total: 100,
    photos: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('returns zero stats for empty array', () => {
    expect(computeStats([])).toEqual({ total: 0, completed: 0, revenue: 0 });
  });

  it('counts completed jobs and sums revenue', () => {
    const jobs = [
      makeJob({ status: 'completed', total: 200 }),
      makeJob({ status: 'completed', total: 300 }),
      makeJob({ status: 'scheduled', total: 100 }),
    ];
    expect(computeStats(jobs)).toEqual({ total: 3, completed: 2, revenue: 500 });
  });
});

describe('getLocalDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 1, 14); // Feb 14, 2026
    expect(getLocalDateString(d)).toBe('2026-02-14');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDateString(d)).toBe('2026-01-05');
  });
});

describe('getTomorrowDateString', () => {
  it('returns next day', () => {
    const d = new Date(2026, 1, 14);
    expect(getTomorrowDateString(d)).toBe('2026-02-15');
  });
});

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 1, 18); // Wed Feb 18
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(getLocalDateString(monday)).toBe('2026-02-16');
  });

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 1, 16);
    expect(getLocalDateString(getWeekStart(mon))).toBe('2026-02-16');
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2026, 1, 22); // Sunday
    expect(getLocalDateString(getWeekStart(sun))).toBe('2026-02-16');
  });
});

describe('getWeekDays', () => {
  it('returns 7 days starting from Monday', () => {
    const days = getWeekDays(new Date(2026, 1, 18));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[6].getDay()).toBe(0); // Sunday
  });
});

describe('formatWeekRange', () => {
  it('formats same-month range', () => {
    const mon = new Date(2026, 1, 16);
    expect(formatWeekRange(mon)).toBe('Feb 16 - 22, 2026');
  });

  it('formats cross-month range', () => {
    const mon = new Date(2026, 0, 26); // Jan 26, ends Feb 1
    expect(formatWeekRange(mon)).toBe('Jan 26 - Feb 1, 2026');
  });
});

describe('formatTime12', () => {
  it('converts 24h to 12h format', () => {
    expect(formatTime12('13:30')).toBe('1:30 PM');
    expect(formatTime12('0:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('9:00')).toBe('9:00 AM');
  });
});

describe('groupJobsByDate', () => {
  it('groups jobs by scheduledDate', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-16' }),
      makeJob({ scheduledDate: '2026-02-16' }),
      makeJob({ scheduledDate: '2026-02-17' }),
    ];
    const groups = groupJobsByDate(jobs);
    expect(groups['2026-02-16']).toHaveLength(2);
    expect(groups['2026-02-17']).toHaveLength(1);
  });
});

describe('getJobsInRange', () => {
  it('filters jobs within date range', () => {
    const jobs = [
      makeJob({ scheduledDate: '2026-02-14' }),
      makeJob({ scheduledDate: '2026-02-16' }),
      makeJob({ scheduledDate: '2026-02-18' }),
    ];
    const result = getJobsInRange(jobs, '2026-02-15', '2026-02-17');
    expect(result).toHaveLength(1);
    expect(result[0].scheduledDate).toBe('2026-02-16');
  });
});

describe('timeToMinutes', () => {
  it('converts time string to minutes', () => {
    expect(timeToMinutes('0:00')).toBe(0);
    expect(timeToMinutes('1:30')).toBe(90);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('DAY_NAMES', () => {
  it('has 7 entries Mon-Sun', () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe('Mon');
    expect(DAY_NAMES[6]).toBe('Sun');
  });
});
