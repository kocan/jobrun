import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');

interface WaitlistEntry {
  email: string;
  createdAt: string;
}

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const data = await fs.readFile(WAITLIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeWaitlist(entries: WaitlistEntry[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const entries = await readWaitlist();
    if (entries.some((e) => e.email === trimmed)) {
      return NextResponse.json({ message: "You're already on the list!" });
    }

    entries.push({ email: trimmed, createdAt: new Date().toISOString() });
    await writeWaitlist(entries);

    return NextResponse.json({ message: "You're on the list! We'll notify you when JobRun launches." });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
