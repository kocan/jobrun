import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, writeTokens } from '../../../../lib/quickbooks';
import { requireAuth } from '../../../../lib/supabase-server';

const STATE_COOKIE_NAME = 'qb_oauth_state';

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const code = req.nextUrl.searchParams.get('code');
    const realmId = req.nextUrl.searchParams.get('realmId');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/settings?qb=error&reason=denied', req.url));
    }

    // Verify CSRF state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value;

    // Clear the state cookie regardless of outcome
    cookieStore.delete(STATE_COOKIE_NAME);

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL('/settings?qb=error&reason=invalid_state', req.url));
    }

    if (!code || !realmId) {
      return NextResponse.redirect(new URL('/settings?qb=error&reason=missing_params', req.url));
    }

    const tokens = await exchangeCodeForTokens(code, realmId);
    await writeTokens(tokens);

    return NextResponse.redirect(new URL('/settings?qb=connected', req.url));
  } catch {
    return NextResponse.redirect(new URL('/settings?qb=error&reason=token_exchange', req.url));
  }
}
