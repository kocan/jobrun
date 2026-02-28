import { VerticalId } from '../types';

export interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  vertical_id: VerticalId | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobRow {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  estimated_duration: number | null;
  address: string | null;
  total: number;
  notes: string | null;
  photos: string;
  estimate_id: string | null;
  invoice_id: string | null;
  reminder_sent: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobLineItemRow {
  id: string;
  job_id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface EstimateRow {
  id: string;
  customer_id: string;
  job_id: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  notes: string | null;
  expires_at: string;
  share_token: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EstimateLineItemRow {
  id: string;
  estimate_id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  estimate_id: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  payment_terms: string | null;
  due_date: string | null;
  paid_at: string | null;
  share_token: string | null;
  payments: string;
  notes: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceLineItemRow {
  id: string;
  invoice_id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface PriceBookServiceRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimated_duration: number;
  category: string;
  is_active: number;
  sort_order: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SettingsRow {
  key: string;
  value: string;
}
