import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, JobStatus } from '../types';

const STORAGE_KEY = '@jobrun_jobs';

export async function getJobs(): Promise<Job[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveJobs(jobs: Job[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export async function addJob(job: Job): Promise<Job> {
  const jobs = await getJobs();
  jobs.push(job);
  await saveJobs(jobs);
  return job;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const jobs = await getJobs();
  const index = jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;
  jobs[index] = { ...jobs[index], ...updates, updatedAt: new Date().toISOString() };
  await saveJobs(jobs);
  return jobs[index];
}

export async function deleteJob(id: string): Promise<boolean> {
  const jobs = await getJobs();
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === jobs.length) return false;
  await saveJobs(filtered);
  return true;
}

export async function getJobById(id: string): Promise<Job | null> {
  const jobs = await getJobs();
  return jobs.find((j) => j.id === id) || null;
}

export function filterJobsByCustomer(jobs: Job[], customerId: string): Job[] {
  return jobs.filter((j) => j.customerId === customerId);
}

export function filterJobsByStatus(jobs: Job[], status: JobStatus): Job[] {
  return jobs.filter((j) => j.status === status);
}

export function filterJobsByDate(jobs: Job[], date: string): Job[] {
  return jobs.filter((j) => j.scheduledDate === date);
}

export function isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
  const transitions: Record<JobStatus, JobStatus[]> = {
    'scheduled': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': ['scheduled'],
  };
  return transitions[from]?.includes(to) ?? false;
}
