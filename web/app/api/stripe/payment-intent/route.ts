import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured, calculateApplicationFee } from '../../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { amountCents, stripeAccountId, invoiceId, customerEmail, description } = body;

    if (!amountCents || !stripeAccountId) {
      return NextResponse.json(
        { error: 'amountCents and stripeAccountId are required' },
        { status: 400 },
      );
    }

    if (amountCents < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const applicationFee = calculateApplicationFee(amountCents);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: stripeAccountId,
      },
      receipt_email: customerEmail || undefined,
      description: description || `Invoice ${invoiceId || 'payment'}`,
      metadata: {
        invoiceId: invoiceId || '',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountCents,
      applicationFee,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
