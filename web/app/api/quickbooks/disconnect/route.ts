import { NextResponse } from 'next/server';
import { deleteTokens } from '../../../../lib/quickbooks';

export async function POST() {
  try {
    await deleteTokens();
    return NextResponse.json({ message: 'QuickBooks disconnected.' });
  } catch {
    return NextResponse.json({ error: 'Failed to disconnect QuickBooks.' }, { status: 500 });
  }
}
