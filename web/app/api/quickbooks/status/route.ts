import { NextResponse } from 'next/server';
import { readTokens, readSyncLog } from '../../../../lib/quickbooks';
import { requireAuth } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    // Require authentication
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const tokens = await readTokens();

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        configured: Boolean(process.env.QB_CLIENT_ID),
      });
    }

    const syncLog = await readSyncLog();
    const lastSync = syncLog.length > 0
      ? syncLog.reduce((latest, r) => (r.syncedAt > latest ? r.syncedAt : latest), syncLog[0].syncedAt)
      : null;

    return NextResponse.json({
      connected: true,
      configured: true,
      realmId: tokens.realmId,
      connectedAt: tokens.createdAt,
      lastSync,
      syncedInvoices: syncLog.filter((r) => r.type === 'invoice').length,
      syncedPayments: syncLog.filter((r) => r.type === 'payment').length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get QuickBooks status.' }, { status: 500 });
  }
}
