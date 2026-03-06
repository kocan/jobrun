import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import type { InvoiceToken } from '../../../../lib/types';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    // Check if cancelled
    if (invoiceToken.status === 'cancelled') {
      return NextResponse.json({ error: 'Invoice has been cancelled' }, { status: 410 });
    }

    // Mark as viewed if first view
    if (invoiceToken.status === 'pending' && !invoiceToken.viewed_at) {
      await supabaseAdmin
        .from('invoice_tokens')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('token', token);

      invoiceToken.status = 'viewed';
      invoiceToken.viewed_at = new Date().toISOString();
    }

    // Return invoice data (safe for public viewing)
    return NextResponse.json({
      token: invoiceToken.token,
      invoice_number: invoiceToken.invoice_number,
      customer_name: invoiceToken.customer_name,
      business_name: invoiceToken.business_name,
      line_items: invoiceToken.line_items,
      subtotal: invoiceToken.subtotal,
      tax_rate: invoiceToken.tax_rate,
      tax_amount: invoiceToken.tax_amount,
      total: invoiceToken.total,
      notes: invoiceToken.notes,
      payment_terms: invoiceToken.payment_terms,
      due_date: invoiceToken.due_date,
      currency: invoiceToken.currency,
      status: invoiceToken.status,
      paid_at: invoiceToken.paid_at,
      created_at: invoiceToken.created_at,
    });
  } catch (err) {
    console.error('Error fetching invoice:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
