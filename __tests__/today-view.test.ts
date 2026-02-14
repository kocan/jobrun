import { getLocalDateString, getTomorrowDateString, computeStats } from '../lib/dateUtils';
import { filterJobsByDate } from '../lib/storage/jobs';
import { Job } from '../lib/types';

describe('dateUtils', () => {
  test('getLocalDateString returns YYYY-MM-DD', () => {
    const d = new Date(2026, 1, 14); // Feb 14, 2026
    expect(getLocalDateString(d)).toBe('2026-02-14');
  });

  test('getLocalDateString pads single digits', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDateString(d)).toBe('2026-01-05');
  });

  test('getTomorrowDateString returns next day', () => {
    const d = new Date(2026, 1, 14);
    expect(getTomorrowDateString(d)).toBe('2026-02-15');
  });

  test('getTomorrowDateString handles month boundary', () => {
    const d = new Date(2026, 0, 31); // Jan 31
    expect(getTomorrowDateString(d)).toBe('2026-02-01');
  });

  test('getTomorrowDateString handles year boundary', () => {
    const d = new Date(2025, 11, 31); // Dec 31
    expect(getTomorrowDateString(d)).toBe('2026-01-01');
  });
});

describe('filterJobsByDate', () => {
  const makeJob = (id: string, date: string, status: string = 'scheduled'): Job => ({
    id,
    customerId: 'c1',
    title: `Job ${id}`,
    status: status as any,
    scheduledDate: date,
    lineItems: [],
    total: 100,
    photos: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  const jobs = [
    makeJob('1', '2026-02-14'),
    makeJob('2', '2026-02-14'),
    makeJob('3', '2026-02-15'),
    makeJob('4', '2026-02-13'),
  ];

  test('filters jobs for a specific date', () => {
    expect(filterJobsByDate(jobs, '2026-02-14')).toHaveLength(2);
  });

  test('returns empty for date with no jobs', () => {
    expect(filterJobsByDate(jobs, '2026-02-20')).toHaveLength(0);
  });
});

describe('computeStats', () => {
  const makeJob = (status: string, total: number): Job => ({
    id: Math.random().toString(),
    customerId: 'c1',
    title: 'Test',
    status: status as any,
    scheduledDate: '2026-02-14',
    lineItems: [],
    total,
    photos: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  test('computes total, completed, and revenue', () => {
    const jobs = [
      makeJob('completed', 150),
      makeJob('completed', 200),
      makeJob('scheduled', 100),
      makeJob('in-progress', 75),
    ];
    const stats = computeStats(jobs);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.revenue).toBe(350);
  });

  test('handles empty jobs', () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.revenue).toBe(0);
  });

  test('only counts completed jobs in revenue', () => {
    const jobs = [makeJob('scheduled', 500), makeJob('cancelled', 300)];
    const stats = computeStats(jobs);
    expect(stats.revenue).toBe(0);
  });
});
