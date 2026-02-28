import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

interface BookingEntry {
  id: string;
  operatorId: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  status: 'pending';
  createdAt: string;
}

async function readBookings(): Promise<BookingEntry[]> {
  try {
    const data = await fs.readFile(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeBookings(entries: BookingEntry[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(entries, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operatorId, businessName, customerName, customerPhone, customerEmail, serviceType, preferredDate, preferredTime, notes } = body;

    if (!operatorId || typeof operatorId !== 'string') {
      return NextResponse.json({ error: 'Invalid operator.' }, { status: 400 });
    }
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length === 0) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    if (!customerEmail || typeof customerEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    const trimmedEmail = customerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!serviceType || typeof serviceType !== 'string') {
      return NextResponse.json({ error: 'Please select a service.' }, { status: 400 });
    }
    if (!preferredDate || typeof preferredDate !== 'string') {
      return NextResponse.json({ error: 'Preferred date is required.' }, { status: 400 });
    }

    const entry: BookingEntry = {
      id: generateId(),
      operatorId: operatorId.trim(),
      businessName: typeof businessName === 'string' ? businessName.trim() : '',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: trimmedEmail,
      serviceType: serviceType.trim(),
      preferredDate: preferredDate.trim(),
      preferredTime: typeof preferredTime === 'string' ? preferredTime.trim() : '',
      notes: typeof notes === 'string' ? notes.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const entries = await readBookings();
    entries.push(entry);
    await writeBookings(entries);

    return NextResponse.json({ message: 'Booking request submitted!', id: entry.id });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
