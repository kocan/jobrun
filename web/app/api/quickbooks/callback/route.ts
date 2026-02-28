import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, writeTokens } from '../../../../lib/quickbooks';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const realmId = req.nextUrl.searchParams.get('realmId');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/settings?qb=error&reason=denied', req.url));
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
