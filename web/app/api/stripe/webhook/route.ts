import { NextRequest, NextResponse } from 'next/server';
import { stripe, getStripeWebhookSecret } from '../../../../lib/stripe';
import { supabaseAdmin } from '../../../../lib/supabase';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = getStripeWebhookSecret();
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      default:
        // Ignore other events
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    const message = err instanceof Error ? err.message : 'Webhook handler failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceToken = session.metadata?.invoice_token;

  if (!invoiceToken) {
    console.error('No invoice_token in session metadata');
    return;
  }

  // Update invoice token status to paid
  const { error } = await supabaseAdmin
    .from('invoice_tokens')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq('token', invoiceToken);

  if (error) {
    console.error('Failed to update invoice token:', error);
    throw new Error('Failed to update invoice status');
  }

  console.log(`Invoice ${invoiceToken} marked as paid`);

  // Optionally notify the operator (via webhook, email, push notification, etc.)
  // This could be implemented with a separate notification service
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const invoiceToken = paymentIntent.metadata?.invoice_token;

  if (!invoiceToken) {
    // This payment might not be from an invoice checkout
    return;
  }

  // Double-check the invoice is marked as paid
  const { data } = await supabaseAdmin
    .from('invoice_tokens')
    .select('status')
    .eq('token', invoiceToken)
    .single();

  if (data && data.status !== 'paid') {
    await supabaseAdmin
      .from('invoice_tokens')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('token', invoiceToken);

    console.log(`Invoice ${invoiceToken} marked as paid via payment_intent.succeeded`);
  }
}
