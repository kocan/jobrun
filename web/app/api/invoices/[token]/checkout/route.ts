import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getStripe, calculateApplicationFee } from '../../../../../lib/stripe';
import type { InvoiceToken } from '../../../../../lib/types';

interface RouteParams {
  params: Promise<{ token: string }>;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://jobrun.app';
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Fetch invoice token from Supabase
    const { data, error } = await supabaseAdmin
      .from('invoice_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceToken = data as InvoiceToken;

    // Check if expired
    if (new Date(invoiceToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invoice link has expired' }, { status: 410 });
    }

    // Check if already paid
    if (invoiceToken.status === 'paid') {
      return NextResponse.json({ error: 'Invoice has already been paid' }, { status: 400 });
    }

    // Check if cancelled
    if (invoiceToken.status === 'cancelled') {
      return NextResponse.json({ error: 'Invoice has been cancelled' }, { status: 410 });
    }

    // Parse request body for optional customer email
    let customerEmail = invoiceToken.customer_email;
    try {
      const body = await req.json();
      if (body.email) {
        customerEmail = body.email;
      }
    } catch {
      // No body or invalid JSON, continue with existing email
    }

    // Get operator's Stripe account ID
    // For now, we'll use the operator_id to look up their Stripe Connect account
    // In production, this would come from an operators table
    const { data: operatorData } = await supabaseAdmin
      .from('operators')
      .select('stripe_account_id')
      .eq('id', invoiceToken.operator_id)
      .single();

    const stripeAccountId = operatorData?.stripe_account_id;

    // Convert total to cents
    const amountInCents = Math.round(invoiceToken.total * 100);
    const applicationFee = stripeAccountId ? calculateApplicationFee(amountInCents) : 0;

    // Build line items for Stripe Checkout
    const lineItems = invoiceToken.line_items.map((item) => ({
      price_data: {
        currency: invoiceToken.currency,
        product_data: {
          name: item.name,
          description: item.description || undefined,
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    // Add tax as separate line item if applicable
    if (invoiceToken.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency: invoiceToken.currency,
          product_data: {
            name: `Tax (${invoiceToken.tax_rate}%)`,
            description: undefined,
          },
          unit_amount: Math.round(invoiceToken.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/invoice/${token}?payment=success`;
    const cancelUrl = `${baseUrl}/invoice/${token}?payment=cancelled`;

    // Create Stripe Checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      metadata: {
        invoice_token: token,
        invoice_number: invoiceToken.invoice_number,
        invoice_id: invoiceToken.invoice_id,
        operator_id: invoiceToken.operator_id,
      },
      payment_intent_data: stripeAccountId
        ? {
            metadata: {
              invoice_token: token,
              invoice_number: invoiceToken.invoice_number,
            },
            application_fee_amount: applicationFee,
            transfer_data: {
              destination: stripeAccountId,
            },
          }
        : {
            metadata: {
              invoice_token: token,
              invoice_number: invoiceToken.invoice_number,
            },
          },
    };

    const session = await getStripe().checkout.sessions.create(sessionParams);

    // Update the token with the session ID
    await supabaseAdmin
      .from('invoice_tokens')
      .update({
        stripe_session_id: session.id,
      })
      .eq('token', token);

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
