'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface InvoiceLineItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  token: string;
  invoice_number: string;
  customer_name: string;
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
  status: string;
  paid_at?: string;
  created_at: string;
}

function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status, paidAt }: { status: string; paidAt?: string }) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
    paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
  };

  const badge = badges[status] || badges.pending;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${badge.bg} ${badge.text} font-semibold text-sm`}>
      {status === 'paid' && <span>✓</span>}
      {badge.label}
      {status === 'paid' && paidAt && (
        <span className="font-normal text-green-600">on {formatDate(paidAt)}</span>
      )}
    </div>
  );
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Check for payment result in URL
  const paymentResult = searchParams.get('payment');

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load invoice');
        }
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvoice();
    }
  }, [token]);

  const handlePayNow = async () => {
    if (!invoice) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/invoices/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start checkout');
      }

      const data = await res.json();

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-orange-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Invoice</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">This invoice link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const canPay = invoice.status === 'pending' || invoice.status === 'viewed';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        {/* Payment Success/Cancelled Banner */}
        {paymentResult === 'success' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Payment Successful!</p>
              <p className="text-green-600 text-sm">Thank you for your payment. A receipt will be sent to your email.</p>
            </div>
          </div>
        )}
        {paymentResult === 'cancelled' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">Payment Cancelled</p>
              <p className="text-yellow-600 text-sm">Your payment was not completed. You can try again below.</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-white print:bg-orange-600">
            {invoice.business_name && (
              <p className="text-lg font-semibold mb-2 opacity-90">{invoice.business_name}</p>
            )}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
                  📄
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Invoice</h1>
                  <p className="text-orange-100 text-sm mt-0.5">#{invoice.invoice_number}</p>
                </div>
              </div>
              {isPaid && (
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                  <span>✓</span> PAID
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Invoice Meta */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                  Bill To
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {invoice.customer_name}
                </p>
              </div>
              <div className="sm:text-right space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                    Invoice Date
                  </p>
                  <p className="text-gray-900 dark:text-white">{formatDate(invoice.created_at)}</p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      Due Date
                    </p>
                    <p className="text-gray-900 dark:text-white">{formatDate(invoice.due_date)}</p>
                  </div>
                )}
                {invoice.payment_terms && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      Terms
                    </p>
                    <p className="text-gray-900 dark:text-white">{invoice.payment_terms}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="pt-2">
              <StatusBadge status={invoice.status} paidAt={invoice.paid_at} />
            </div>

            {/* Line Items */}
            <div>
              <h2 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-3">
                Services
              </h2>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right hidden sm:table-cell">Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoice.line_items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{item.description}</p>
                          )}
                          <p className="text-gray-500 dark:text-gray-400 text-sm sm:hidden mt-1">
                            {item.quantity} × {formatCurrency(item.unit_price, invoice.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-center hidden sm:table-cell">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-right hidden sm:table-cell">
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium text-right">
                          {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2">
                <span>{isPaid ? 'Amount Paid' : 'Amount Due'}</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">
                  Notes
                </h2>
                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {invoice.notes}
                </p>
              </div>
            )}

            {/* Payment Actions */}
            {canPay && (
              <div className="space-y-3 print:hidden">
                <button
                  onClick={handlePayNow}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      💳 Pay Now — {formatCurrency(invoice.total, invoice.currency)}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Secure payment powered by Stripe
                </p>
              </div>
            )}

            {isPaid && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center print:hidden">
                <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                  ✓ This invoice has been paid
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                  Thank you for your payment!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 print:mt-4">
          Powered by <span className="font-semibold">JobRun</span>
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:bg-orange-600 {
            background: #ea580c !important;
          }
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
