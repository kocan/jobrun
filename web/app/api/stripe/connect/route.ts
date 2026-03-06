import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured, saveStripeAccount } from '../../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { userId, email, refreshUrl, returnUrl } = body;

    if (!userId || !returnUrl) {
      return NextResponse.json(
        { error: 'userId and returnUrl are required' },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email: email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Save initial account record
    await saveStripeAccount(userId, {
      stripeAccountId: account.id,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      url: accountLink.url,
      stripeAccountId: account.id,
    });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 },
    );
  }
}
