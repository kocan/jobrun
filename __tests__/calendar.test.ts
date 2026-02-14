import {
  getWeekStart,
  getWeekDays,
  formatWeekRange,
  formatTime12,
  groupJobsByDate,
  getJobsInRange,
  timeToMinutes,
  getLocalDateString,
  DAY_NAMES,
} from '../lib/dateUtils';
import { Job } from '../lib/types';

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: '1',
  customerId: 'c1',
  title: 'Test Job',
  status: 'scheduled',
  scheduledDate: '2026-02-10',
  scheduledTime: '09:00',
  estimatedDuration: 60,
  lineItems: [],
  total: 100,
  photos: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('Week date range calculation', () => {
  test('getWeekStart returns Monday for a Wednesday', () => {
    // 2026-02-11 is a Wednesday
    const wed = new Date(2026, 1, 11);
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(9);
  });

  test('getWeekStart returns Monday for a Monday', () => {
    const mon = new Date(2026, 1, 9);
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(9);
  });

  test('getWeekStart returns Monday for a Sunday', () => {
    // 2026-02-15 is a Sunday
    const sun = new Date(2026, 1, 15);
    const monday = getWeekStart(sun);
    expect(monday.getDate()).toBe(9);
  });

  test('getWeekDays returns 7 days starting Monday', () => {
    const days = getWeekDays(new Date(2026, 1, 12));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[6].getDay()).toBe(0); // Sunday
  });

  test('formatWeekRange same month', () => {
    const monday = new Date(2026, 1, 9);
    expect(formatWeekRange(monday)).toBe('Feb 9 - 15, 2026');
  });

  test('formatWeekRange cross month', () => {
    const monday = new Date(2026, 1, 23);
    expect(formatWeekRange(monday)).toBe('Feb 23 - Mar 1, 2026');
  });
});

describe('Job grouping by date', () => {
  test('groups jobs correctly', () => {
    const jobs = [
      makeJob({ id: '1', scheduledDate: '2026-02-10' }),
      makeJob({ id: '2', scheduledDate: '2026-02-10' }),
      makeJob({ id: '3', scheduledDate: '2026-02-12' }),
    ];
    const groups = groupJobsByDate(jobs);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups['2026-02-10']).toHaveLength(2);
    expect(groups['2026-02-12']).toHaveLength(1);
  });

  test('empty array returns empty groups', () => {
    expect(groupJobsByDate([])).toEqual({});
  });
});

describe('Navigation helpers', () => {
  test('getJobsInRange filters correctly', () => {
    const jobs = [
      makeJob({ id: '1', scheduledDate: '2026-02-09' }),
      makeJob({ id: '2', scheduledDate: '2026-02-10' }),
      makeJob({ id: '3', scheduledDate: '2026-02-15' }),
      makeJob({ id: '4', scheduledDate: '2026-02-16' }),
    ];
    const result = getJobsInRange(jobs, '2026-02-10', '2026-02-15');
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.id)).toEqual(['2', '3']);
  });

  test('timeToMinutes parses correctly', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('0:00')).toBe(0);
    expect(timeToMinutes('13:15')).toBe(795);
  });

  test('formatTime12 converts correctly', () => {
    expect(formatTime12('09:00')).toBe('9:00 AM');
    expect(formatTime12('13:30')).toBe('1:30 PM');
    expect(formatTime12('0:00')).toBe('12:00 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  test('DAY_NAMES has 7 entries starting with Mon', () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe('Mon');
    expect(DAY_NAMES[6]).toBe('Sun');
  });
});
