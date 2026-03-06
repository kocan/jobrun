import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured, getStripeAccount, saveStripeAccount } from '../../../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        status: 'not_configured',
      });
    }

    const body = await request.json();
    const { userId, stripeAccountId } = body;

    if (!userId && !stripeAccountId) {
      return NextResponse.json(
        { error: 'userId or stripeAccountId is required' },
        { status: 400 },
      );
    }

    let accountRecord = await getStripeAccount(userId);
    const accountId = stripeAccountId || accountRecord?.stripeAccountId;

    if (!accountId) {
      return NextResponse.json({
        configured: true,
        connected: false,
        status: 'not_connected',
      });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);

    // Update local record if userId is provided
    if (userId && accountRecord) {
      accountRecord = {
        ...accountRecord,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        updatedAt: new Date().toISOString(),
      };
      await saveStripeAccount(userId, accountRecord);
    }

    // Determine status
    let status: 'not_connected' | 'pending' | 'connected' | 'restricted' = 'not_connected';
    if (account.details_submitted && account.charges_enabled) {
      status = 'connected';
    } else if (account.details_submitted) {
      status = 'restricted';
    } else if (accountId) {
      status = 'pending';
    }

    return NextResponse.json({
      configured: true,
      connected: account.charges_enabled,
      status,
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error('Stripe status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe account status' },
      { status: 500 },
    );
  }
}
