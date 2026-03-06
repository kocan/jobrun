import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured, getStripeAccount, saveStripeAccount } from '../../../../../lib/stripe';

export async function GET(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    const existingAccount = await getStripeAccount(userId);
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'No Stripe account found for this user' },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(existingAccount.stripeAccountId);

    // Update account status
    await saveStripeAccount(userId, {
      ...existingAccount,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      updatedAt: new Date().toISOString(),
    });

    // Determine status for redirect
    const status = account.charges_enabled ? 'connected' : 'pending';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'jobrun://';
    const redirectUrl = `${baseUrl}/settings?stripe=${status}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Stripe callback error:', error);
    return NextResponse.redirect('/settings?stripe=error');
  }
}
