import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthorizationUrl } from '../../../../lib/quickbooks';

export async function GET() {
  try {
    if (!process.env.QB_CLIENT_ID || !process.env.QB_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'QuickBooks is not configured. Set QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI.' },
        { status: 500 },
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    const url = getAuthorizationUrl(state);

    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Failed to initiate QuickBooks connection.' }, { status: 500 });
  }
}
