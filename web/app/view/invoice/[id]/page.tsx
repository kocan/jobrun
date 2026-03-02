'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

interface ShareableInvoiceData {
  n: string;
  c: string;
  li: [string, number, number][];
  st: number;
  tr: number;
  ta: number;
  t: number;
  no?: string;
  pt?: string;
  dd?: string;
  dt: string;
  s: string;
  bn?: string;
}

function decodeInvoiceData(encoded: string): ShareableInvoiceData | null {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CustomerInvoiceView() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get('d');
  const [payClicked, setPayClicked] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const data = useMemo(() => {
    if (!encoded) return null;
    return decodeInvoiceData(encoded);
  }, [encoded]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invoice Link</h1>
          <p className="text-gray-600">This invoice link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const isPaid = data.s === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-white print:bg-orange-600">
            {data.bn && <p className="text-lg font-semibold mb-2">{data.bn}</p>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl">📄</div>
                <div>
                  <h1 className="text-2xl font-bold">Invoice</h1>
                  <p className="text-orange-100 text-sm mt-0.5">#{data.n}</p>
                </div>
              </div>
              {isPaid && (
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm">
                  ✓ PAID
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Meta */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Bill To</p>
                <p className="text-lg font-semibold text-gray-900">{data.c}</p>
              </div>
              <div className="sm:text-right">
                <div className="mb-2">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Invoice Date</p>
                  <p className="text-gray-900">{formatDate(data.dt)}</p>
                </div>
                {data.dd && (
                  <div className="mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Due Date</p>
                    <p className="text-gray-900">{formatDate(data.dd)}</p>
                  </div>
                )}
                {data.pt && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Terms</p>
                    <p className="text-gray-900">{data.pt}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Services</h2>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.li.map(([name, qty, price], i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-center">{qty}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-right">{formatCurrency(price)}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium text-right">{formatCurrency(qty * price)}</td>
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
                <span>{formatCurrency(data.st)}</span>
              </div>
              {data.tr > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Tax ({data.tr}%)</span>
                  <span>{formatCurrency(data.ta)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-300 pt-2">
                <span>Amount Due</span>
                <span>{formatCurrency(data.t)}</span>
              </div>
            </div>

            {/* Notes */}
            {data.no && (
              <div>
                <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Notes</h2>
                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-gray-700 rounded-lg p-4">{data.no}</p>
              </div>
            )}

            {/* Pay Now / Actions */}
            {!isPaid && (
              <div className="space-y-3 print:hidden">
                {payClicked ? (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                    <p className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">📞 Pay by Phone</p>
                    <p className="text-blue-600 dark:text-blue-300 text-sm">
                      Call or text to arrange payment. Online payments coming soon.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setPayClicked(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
                  >
                    💳 Pay Now — {formatCurrency(data.t)}
                  </button>
                )}
                <button
                  onClick={() => setShowContact(!showContact)}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
                >
                  Already paid? Contact us
                </button>
                {showContact && (
                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center text-sm text-gray-600 dark:text-gray-300">
                    <p>If you&apos;ve already paid this invoice, please contact us and we&apos;ll update our records.</p>
                  </div>
                )}
              </div>
            )}

            {isPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center print:hidden">
                <p className="text-lg font-semibold text-green-800">✓ This invoice has been paid</p>
                <p className="text-green-600 text-sm mt-1">Thank you for your payment!</p>
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
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:bg-orange-600 { background: #ea580c !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
