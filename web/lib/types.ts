// Web-specific types for JobRun

export type InvoicePaymentStatus = 'pending' | 'viewed' | 'paid' | 'expired' | 'cancelled';

export interface InvoiceToken {
  id: string;
  token: string;
  invoice_id: string;
  operator_id: string;

  // Invoice snapshot
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  business_name?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  due_date?: string;
  currency: string;

  // Payment tracking
  status: InvoicePaymentStatus;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;

  // Timestamps
  viewed_at?: string;
  paid_at?: string;
  created_at: string;
  expires_at: string;
}

export interface InvoiceLineItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CreateInvoiceShareRequest {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  business_name?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  due_date?: string;
  operator_id: string;
  stripe_account_id: string;
}

export interface CreateInvoiceShareResponse {
  token: string;
  share_url: string;
  expires_at: string;
}
