import { getJobs, saveJobs, addJob, updateJob, deleteJob, getJobById, filterJobsByCustomer, filterJobsByStatus, filterJobsByDate, isValidStatusTransition } from '../lib/storage/jobs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, JobStatus } from '../lib/types';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    __resetStore: () => { store = {}; },
  };
});

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  customerId: 'cust-1',
  title: 'Pressure Wash Driveway',
  status: 'scheduled',
  scheduledDate: '2026-02-15',
  scheduledTime: '09:00',
  estimatedDuration: 60,
  lineItems: [],
  total: 150,
  photos: [],
  notes: 'Front and back',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  jest.clearAllMocks();
});

describe('Job Storage CRUD', () => {
  test('getJobs returns empty array initially', async () => {
    expect(await getJobs()).toEqual([]);
  });

  test('addJob stores and returns job', async () => {
    const job = makeJob();
    const result = await addJob(job);
    expect(result).toEqual(job);
    const all = await getJobs();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Pressure Wash Driveway');
  });

  test('updateJob updates existing job', async () => {
    await addJob(makeJob());
    const updated = await updateJob('job-1', { title: 'Updated Title' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.customerId).toBe('cust-1');
  });

  test('updateJob returns null for non-existent id', async () => {
    expect(await updateJob('nope', { title: 'X' })).toBeNull();
  });

  test('deleteJob removes job', async () => {
    await addJob(makeJob({ id: 'a' }));
    await addJob(makeJob({ id: 'b', title: 'Job B' }));
    expect(await deleteJob('a')).toBe(true);
    const all = await getJobs();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('b');
  });

  test('deleteJob returns false for non-existent id', async () => {
    expect(await deleteJob('nope')).toBe(false);
  });

  test('getJobById returns job or null', async () => {
    await addJob(makeJob());
    expect((await getJobById('job-1'))?.title).toBe('Pressure Wash Driveway');
    expect(await getJobById('nope')).toBeNull();
  });
});

describe('Job Filtering', () => {
  const jobs: Job[] = [
    makeJob({ id: '1', customerId: 'c1', status: 'scheduled', scheduledDate: '2026-02-15' }),
    makeJob({ id: '2', customerId: 'c1', status: 'completed', scheduledDate: '2026-02-16' }),
    makeJob({ id: '3', customerId: 'c2', status: 'scheduled', scheduledDate: '2026-02-15' }),
    makeJob({ id: '4', customerId: 'c2', status: 'in-progress', scheduledDate: '2026-02-17' }),
  ];

  test('filterJobsByCustomer', () => {
    expect(filterJobsByCustomer(jobs, 'c1')).toHaveLength(2);
    expect(filterJobsByCustomer(jobs, 'c2')).toHaveLength(2);
    expect(filterJobsByCustomer(jobs, 'c3')).toHaveLength(0);
  });

  test('filterJobsByStatus', () => {
    expect(filterJobsByStatus(jobs, 'scheduled')).toHaveLength(2);
    expect(filterJobsByStatus(jobs, 'completed')).toHaveLength(1);
    expect(filterJobsByStatus(jobs, 'in-progress')).toHaveLength(1);
    expect(filterJobsByStatus(jobs, 'cancelled')).toHaveLength(0);
  });

  test('filterJobsByDate', () => {
    expect(filterJobsByDate(jobs, '2026-02-15')).toHaveLength(2);
    expect(filterJobsByDate(jobs, '2026-02-16')).toHaveLength(1);
    expect(filterJobsByDate(jobs, '2026-02-20')).toHaveLength(0);
  });
});

describe('Status Transitions', () => {
  test('valid transitions', () => {
    expect(isValidStatusTransition('scheduled', 'in-progress')).toBe(true);
    expect(isValidStatusTransition('scheduled', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('in-progress', 'completed')).toBe(true);
    expect(isValidStatusTransition('in-progress', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('cancelled', 'scheduled')).toBe(true);
  });

  test('invalid transitions', () => {
    expect(isValidStatusTransition('scheduled', 'completed')).toBe(false);
    expect(isValidStatusTransition('completed', 'scheduled')).toBe(false);
    expect(isValidStatusTransition('completed', 'in-progress')).toBe(false);
    expect(isValidStatusTransition('completed', 'cancelled')).toBe(false);
    expect(isValidStatusTransition('cancelled', 'in-progress')).toBe(false);
  });
});
