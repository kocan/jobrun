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

/**
 * Get the Monday of the week containing the given date.
 * Week starts on Monday (ISO).
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Get all 7 days (Mon-Sun) of the week containing the given date.
 */
export function getWeekDays(date: Date = new Date()): Date[] {
  const monday = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Format a date range for week header, e.g. "Feb 10 - 16, 2026"
 */
export function formatWeekRange(weekStart: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);

  const startMonth = months[weekStart.getMonth()];
  const endMonth = months[end.getMonth()];
  const startDay = weekStart.getDate();
  const endDay = end.getDate();

  if (weekStart.getFullYear() !== end.getFullYear()) {
    return `${startMonth} ${startDay}, ${weekStart.getFullYear()} - ${endMonth} ${endDay}, ${end.getFullYear()}`;
  }
  if (weekStart.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay} - ${endDay}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${end.getFullYear()}`;
}

/**
 * Format time string (HH:MM or H:MM) to 12-hour format.
 */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Group jobs by their scheduledDate (YYYY-MM-DD).
 */
export function groupJobsByDate(jobs: Job[]): Record<string, Job[]> {
  const groups: Record<string, Job[]> = {};
  for (const job of jobs) {
    const date = job.scheduledDate;
    if (!groups[date]) groups[date] = [];
    groups[date].push(job);
  }
  return groups;
}

/**
 * Get jobs for a specific date range (inclusive).
 */
export function getJobsInRange(jobs: Job[], startDate: string, endDate: string): Job[] {
  return jobs.filter((j) => j.scheduledDate >= startDate && j.scheduledDate <= endDate);
}

/**
 * Parse time string to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Short day names Mon-Sun.
 */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
