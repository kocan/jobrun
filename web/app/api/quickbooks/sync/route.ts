import { NextRequest, NextResponse } from 'next/server';
import {
  getValidTokens,
  qbApiRequest,
  mapInvoiceToQB,
  mapPaymentToQB,
  readSyncLog,
  writeSyncLog,
  type InvoiceData,
  type PaymentData,
} from '../../../../lib/quickbooks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === 'invoice') {
      return await syncInvoice(body.invoice);
    }

    if (type === 'payment') {
      return await syncPayment(body.payment);
    }

    return NextResponse.json({ error: 'Invalid sync type. Use "invoice" or "payment".' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed.';

    if (message === 'QuickBooks is not connected') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function syncInvoice(invoice: InvoiceData) {
  if (!invoice?.id || !invoice?.invoiceNumber || !invoice?.lineItems?.length) {
    return NextResponse.json(
      { error: 'Invoice must include id, invoiceNumber, and at least one lineItem.' },
      { status: 400 },
    );
  }

  const tokens = await getValidTokens();
  const syncLog = await readSyncLog();

  const existing = syncLog.find((r) => r.invoiceId === invoice.id && r.type === 'invoice');
  const qbInvoice = mapInvoiceToQB(invoice);

  let result: Record<string, unknown>;

  if (existing) {
    // Update existing QB invoice — fetch current to get SyncToken
    const current = (await qbApiRequest(
      tokens,
      'GET',
      `invoice/${existing.qbInvoiceId}`,
    )) as { Invoice: { SyncToken: string } };

    result = (await qbApiRequest(tokens, 'POST', 'invoice', {
      ...qbInvoice,
      Id: existing.qbInvoiceId,
      SyncToken: current.Invoice.SyncToken,
      sparse: true,
    })) as Record<string, unknown>;
  } else {
    result = (await qbApiRequest(tokens, 'POST', 'invoice', qbInvoice)) as Record<string, unknown>;
  }

  const createdInvoice = result.Invoice as { Id: string } | undefined;
  const qbInvoiceId = createdInvoice?.Id ?? existing?.qbInvoiceId ?? '';

  if (!existing && qbInvoiceId) {
    syncLog.push({
      invoiceId: invoice.id,
      qbInvoiceId,
      syncedAt: new Date().toISOString(),
      type: 'invoice',
    });
  } else if (existing) {
    existing.syncedAt = new Date().toISOString();
  }

  await writeSyncLog(syncLog);

  return NextResponse.json({
    message: existing ? 'Invoice updated in QuickBooks.' : 'Invoice created in QuickBooks.',
    qbInvoiceId,
  });
}

async function syncPayment(payment: PaymentData) {
  if (!payment?.invoiceId || !payment?.amount || !payment?.qbInvoiceId) {
    return NextResponse.json(
      { error: 'Payment must include invoiceId, amount, and qbInvoiceId.' },
      { status: 400 },
    );
  }

  const tokens = await getValidTokens();
  const qbPayment = mapPaymentToQB(payment);

  const result = (await qbApiRequest(tokens, 'POST', 'payment', qbPayment)) as Record<string, unknown>;
  const createdPayment = result.Payment as { Id: string } | undefined;

  const syncLog = await readSyncLog();
  syncLog.push({
    invoiceId: payment.invoiceId,
    qbInvoiceId: createdPayment?.Id ?? '',
    syncedAt: new Date().toISOString(),
    type: 'payment',
  });
  await writeSyncLog(syncLog);

  return NextResponse.json({
    message: 'Payment recorded in QuickBooks.',
    qbPaymentId: createdPayment?.Id,
  });
}
