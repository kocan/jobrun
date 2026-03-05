import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getAuthorizationUrl } from '../../../../lib/quickbooks';
import { requireAuth } from '../../../../lib/supabase-server';

const STATE_COOKIE_NAME = 'qb_oauth_state';
const STATE_COOKIE_MAX_AGE = 600; // 10 minutes

export async function GET() {
  try {
    // Require authentication
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    if (!process.env.QB_CLIENT_ID || !process.env.QB_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'QuickBooks is not configured. Set QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI.' },
        { status: 500 },
      );
    }

    // Generate cryptographically secure state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/',
    });

    const url = getAuthorizationUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Failed to initiate QuickBooks connection.' }, { status: 500 });
  }
}
