export type VerticalId =
  | 'pressure-washing'
  | 'auto-detailing'
  | 'lawn-care'
  | 'cleaning'
  | 'handyman';

export interface Vertical {
  id: VerticalId;
  name: string;
  icon: string;
  defaultServices: DefaultServiceTemplate[];
  terminology?: {
    job?: string;
    customer?: string;
    estimate?: string;
  };
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  verticalId?: VerticalId;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: JobStatus;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: number; // minutes
  address?: string;
  lineItems: LineItem[];
  total: number;
  notes?: string;
  photos: Photo[];
  estimateId?: string;
  invoiceId?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  serviceId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PriceBookService {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDuration: number; // minutes
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape used in vertical default configs (before hydration) */
export interface DefaultServiceTemplate {
  name: string;
  price: number;
  description?: string;
  category?: string;
  estimatedDuration?: number;
}

export type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export interface Estimate {
  id: string;
  customerId: string;
  jobId?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: EstimateStatus;
  notes?: string;
  expiresAt: string;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  jobId?: string;
  estimateId?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  paymentTerms?: string;
  dueDate?: string;
  paidAt?: string;
  shareToken?: string;
  payments: Payment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'stripe' | 'cash' | 'check' | 'other';
  stripePaymentIntentId?: string;
  notes?: string;
  paidAt: string;
}

export interface Photo {
  id: string;
  jobId: string;
  uri: string;
  type: 'before' | 'after' | 'other';
  caption?: string;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  noteText: string;
  createdAt: string;
}

export type TimelineItemType = 'job' | 'estimate' | 'invoice' | 'note';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  subtitle: string;
  date: string;
  status?: string;
  entityId: string;
}

export type CommunicationType = 'call' | 'text' | 'email' | 'note' | 'visit';

export interface CommunicationEntry {
  id: string;
  customerId: string;
  type: CommunicationType;
  summary: string;
  notes?: string;
  createdAt: string;
}
