import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';
import type { CreateInvoiceShareRequest, CreateInvoiceShareResponse } from '../../../../lib/types';

function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://jobrun.app';
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key for mobile app requests
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.INVOICE_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as CreateInvoiceShareRequest;

    // Validate required fields
    if (!body.invoice_id || !body.invoice_number || !body.customer_name || !body.operator_id) {
      return NextResponse.json(
        { error: 'Missing required fields: invoice_id, invoice_number, customer_name, operator_id' },
        { status: 400 }
      );
    }

    if (!body.line_items || body.line_items.length === 0) {
      return NextResponse.json({ error: 'Invoice must have at least one line item' }, { status: 400 });
    }

    if (typeof body.total !== 'number' || body.total <= 0) {
      return NextResponse.json({ error: 'Invoice total must be greater than 0' }, { status: 400 });
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    // Insert token record
    const { data, error } = await supabaseAdmin
      .from('invoice_tokens')
      .insert({
        token,
        invoice_id: body.invoice_id,
        operator_id: body.operator_id,
        invoice_number: body.invoice_number,
        customer_name: body.customer_name,
        customer_email: body.customer_email || null,
        business_name: body.business_name || null,
        line_items: body.line_items,
        subtotal: body.subtotal,
        tax_rate: body.tax_rate || 0,
        tax_amount: body.tax_amount || 0,
        total: body.total,
        notes: body.notes || null,
        payment_terms: body.payment_terms || null,
        due_date: body.due_date || null,
        currency: 'usd',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
    }

    const shareUrl = `${getBaseUrl()}/invoice/${token}`;

    const response: CreateInvoiceShareResponse = {
      token,
      share_url: shareUrl,
      expires_at: data.expires_at,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('Error creating invoice share:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
