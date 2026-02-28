import { getJobsForReminderDate, markReminderSent } from './db/repositories/jobs';
import { getCustomerById } from './db/repositories/customers';
import { getSettings } from './db/repositories/settings';

interface ReminderJob {
  jobId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  scheduledTime: string;
}

interface SendResult {
  jobId: string;
  success: boolean;
  error?: string;
}

interface SendResponse {
  sent: number;
  failed: number;
  results: SendResult[];
}

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Collects jobs scheduled for tomorrow that haven't had reminders sent,
 * sends SMS reminders via the web API, and marks jobs as reminder_sent.
 */
export async function sendTomorrowReminders(apiBaseUrl: string, apiKey: string): Promise<SendResponse> {
  const settings = getSettings();

  if (!settings.smsRemindersEnabled) {
    return { sent: 0, failed: 0, results: [] };
  }

  const tomorrow = getTomorrowDate();
  const jobs = getJobsForReminderDate(tomorrow);

  if (jobs.length === 0) {
    return { sent: 0, failed: 0, results: [] };
  }

  // Build reminder payloads with customer info
  const reminderJobs: ReminderJob[] = [];
  for (const job of jobs) {
    const customer = getCustomerById(job.customerId);
    if (!customer || !customer.phone) continue;

    reminderJobs.push({
      jobId: job.id,
      customerName: `${customer.firstName}`,
      customerPhone: customer.phone,
      serviceName: job.title,
      scheduledTime: job.scheduledTime ?? '',
    });
  }

  if (reminderJobs.length === 0) {
    return { sent: 0, failed: 0, results: [] };
  }

  // Call the web API to send SMS
  const response = await fetch(`${apiBaseUrl}/api/reminders/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ jobs: reminderJobs }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Reminders API error (${response.status}): ${errorBody}`);
  }

  const result: SendResponse = await response.json();

  // Mark successfully sent jobs as reminder_sent
  for (const r of result.results) {
    if (r.success) {
      markReminderSent(r.jobId);
    }
  }

  return result;
}
