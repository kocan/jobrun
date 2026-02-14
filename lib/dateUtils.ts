import { Job } from './types';

/**
 * Compute summary stats for a list of jobs.
 */
export function computeStats(jobs: Job[]) {
  const total = jobs.length;
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const revenue = jobs
    .filter((j) => j.status === 'completed')
    .reduce((sum, j) => sum + j.total, 0);
  return { total, completed, revenue };
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get tomorrow's date as YYYY-MM-DD in local timezone.
 */
export function getTomorrowDateString(date: Date = new Date()): string {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
}
