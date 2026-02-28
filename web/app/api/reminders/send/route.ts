import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

interface ReminderJob {
  jobId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  scheduledTime: string;
}

interface SendRequest {
  jobs: ReminderJob[];
}

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function formatTime(time: string): string {
  // Convert "HH:MM" (24h) to "h:MM AM/PM"
  const [hoursStr, minutes] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return time;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function buildMessage(customerName: string, serviceName: string, scheduledTime: string): string {
  const time = scheduledTime ? formatTime(scheduledTime) : 'a scheduled time';
  return `Hi ${customerName}, reminder: your ${serviceName} appointment is tomorrow at ${time}. Reply STOP to opt out.`;
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.REMINDERS_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as SendRequest;

    if (!body.jobs || !Array.isArray(body.jobs) || body.jobs.length === 0) {
      return NextResponse.json({ error: 'No jobs provided.' }, { status: 400 });
    }

    const accountSid = getEnvOrThrow('TWILIO_ACCOUNT_SID');
    const authToken = getEnvOrThrow('TWILIO_AUTH_TOKEN');
    const fromNumber = getEnvOrThrow('TWILIO_PHONE_NUMBER');

    const client = twilio(accountSid, authToken);

    const results: { jobId: string; success: boolean; error?: string }[] = [];

    for (const job of body.jobs) {
      if (!job.customerPhone || !job.customerName || !job.jobId) {
        results.push({ jobId: job.jobId, success: false, error: 'Missing required fields' });
        continue;
      }

      const message = buildMessage(job.customerName, job.serviceName, job.scheduledTime);

      try {
        await client.messages.create({
          body: message,
          from: fromNumber,
          to: job.customerPhone,
        });
        results.push({ jobId: job.jobId, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ jobId: job.jobId, success: false, error: errorMessage });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ sent, failed, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
