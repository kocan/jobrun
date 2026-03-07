import { createSupabaseServerClient } from './supabase-server';

export interface QBTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  expiresAt: number;
  createdAt: string;
}

export interface QBSyncRecord {
  invoiceId: string;
  qbInvoiceId: string;
  syncedAt: string;
  type: 'invoice' | 'payment';
}

export async function readTokens(): Promise<QBTokens | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('qb_tokens')
      .select('access_token, refresh_token, realm_id, expires_at, created_at')
      .eq('owner_id', user.id)
      .single();

    if (error || !data) return null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      realmId: data.realm_id,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

export async function writeTokens(tokens: QBTokens): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('qb_tokens')
    .upsert({
      owner_id: user.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      realm_id: tokens.realmId,
      expires_at: tokens.expiresAt,
      created_at: tokens.createdAt,
    }, {
      onConflict: 'owner_id',
    });

  if (error) throw new Error(`Failed to save tokens: ${error.message}`);
}

export async function deleteTokens(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('qb_tokens')
    .delete()
    .eq('owner_id', user.id);

  // Also delete sync logs when disconnecting
  await supabase
    .from('qb_sync_log')
    .delete()
    .eq('owner_id', user.id);
}

export async function readSyncLog(): Promise<QBSyncRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('qb_sync_log')
      .select('invoice_id, qb_invoice_id, synced_at, type')
      .eq('owner_id', user.id)
      .order('synced_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r) => ({
      invoiceId: r.invoice_id,
      qbInvoiceId: r.qb_invoice_id,
      syncedAt: r.synced_at,
      type: r.type as 'invoice' | 'payment',
    }));
  } catch {
    return [];
  }
}

export async function writeSyncLog(records: QBSyncRecord[]): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Delete existing records and insert new ones
  await supabase
    .from('qb_sync_log')
    .delete()
    .eq('owner_id', user.id);

  if (records.length > 0) {
    const { error } = await supabase
      .from('qb_sync_log')
      .insert(records.map((r) => ({
        owner_id: user.id,
        invoice_id: r.invoiceId,
        qb_invoice_id: r.qbInvoiceId,
        synced_at: r.syncedAt,
        type: r.type,
      })));

    if (error) throw new Error(`Failed to save sync log: ${error.message}`);
  }
}

function getConfig() {
  const clientId = process.env.QB_CLIENT_ID ?? '';
  const clientSecret = process.env.QB_CLIENT_SECRET ?? '';
  const redirectUri = process.env.QB_REDIRECT_URI ?? '';
  const environment = process.env.QB_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const baseUrl =
    environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  return { clientId, clientSecret, redirectUri, environment, baseUrl };
}

export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  realmId: string,
): Promise<QBTokens> {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    realmId,
    expiresAt: Date.now() + data.expires_in * 1000,
    createdAt: new Date().toISOString(),
  };
}

export async function refreshAccessToken(tokens: QBTokens): Promise<QBTokens> {
  const { clientId, clientSecret } = getConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    realmId: tokens.realmId,
    expiresAt: Date.now() + data.expires_in * 1000,
    createdAt: tokens.createdAt,
  };
}

export async function getValidTokens(): Promise<QBTokens> {
  let tokens = await readTokens();
  if (!tokens) {
    throw new Error('QuickBooks is not connected');
  }

  // Refresh if expiring within 5 minutes
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshAccessToken(tokens);
    await writeTokens(tokens);
  }

  return tokens;
}

export async function qbApiRequest(
  tokens: QBTokens,
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}/v3/company/${tokens.realmId}/${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.accessToken}`,
    Accept: 'application/json',
  };

  const init: RequestInit = { method, headers };

  if (body) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error: ${res.status} ${text}`);
  }

  return res.json();
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  lineItems: {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: string;
  dueDate?: string;
  notes?: string;
}

export function mapInvoiceToQB(invoice: InvoiceData): Record<string, unknown> {
  const lines = invoice.lineItems.map((item, idx) => ({
    LineNum: idx + 1,
    Amount: item.total,
    DetailType: 'SalesItemLineDetail',
    Description: item.description || item.name,
    SalesItemLineDetail: {
      UnitPrice: item.unitPrice,
      Qty: item.quantity,
    },
  }));

  const qbInvoice: Record<string, unknown> = {
    DocNumber: invoice.invoiceNumber,
    Line: lines,
    CustomerRef: {
      name: invoice.customerName,
    },
  };

  if (invoice.dueDate) {
    qbInvoice.DueDate = invoice.dueDate.split('T')[0];
  }

  if (invoice.notes) {
    qbInvoice.CustomerMemo = { value: invoice.notes };
  }

  if (invoice.customerEmail) {
    qbInvoice.BillEmail = { Address: invoice.customerEmail };
  }

  if (invoice.taxRate > 0) {
    qbInvoice.TxnTaxDetail = {
      TotalTax: invoice.taxAmount,
    };
  }

  return qbInvoice;
}

export interface PaymentData {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidAt: string;
  notes?: string;
  qbInvoiceId: string;
}

export function mapPaymentToQB(payment: PaymentData): Record<string, unknown> {
  return {
    TotalAmt: payment.amount,
    TxnDate: payment.paidAt.split('T')[0],
    Line: [
      {
        Amount: payment.amount,
        LinkedTxn: [
          {
            TxnId: payment.qbInvoiceId,
            TxnType: 'Invoice',
          },
        ],
      },
    ],
    PrivateNote: payment.notes || `Payment via ${payment.method}`,
  };
}
