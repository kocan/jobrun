import { NextResponse } from 'next/server';
import { deleteTokens } from '../../../../lib/quickbooks';
import { requireAuth } from '../../../../lib/supabase-server';

export async function POST() {
  try {
    // Require authentication
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    await deleteTokens();
    return NextResponse.json({ message: 'QuickBooks disconnected.' });
  } catch {
    return NextResponse.json({ error: 'Failed to disconnect QuickBooks.' }, { status: 500 });
  }
}
