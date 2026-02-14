'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

interface ShareableEstimateData {
  n: string;
  c: string;
  li: [string, number, number][];
  st: number;
  tr: number;
  ta: number;
  t: number;
  no?: string;
  ex: string;
  dt: string;
}

function decodeEstimateData(encoded: string): ShareableEstimateData | null {
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

export default function CustomerEstimateView() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get('d');
  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);

  const data = useMemo(() => {
    if (!encoded) return null;
    return decodeEstimateData(encoded);
  }, [encoded]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Estimate Link</h1>
          <p className="text-gray-600">This estimate link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
          {/* Business Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-white print:bg-orange-600">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl">📋</div>
              <h1 className="text-2xl font-bold">Estimate</h1>
            </div>
            <p className="text-orange-100 text-sm mt-1">#{data.n}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Meta */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Prepared For</p>
                <p className="text-lg font-semibold text-gray-900">{data.c}</p>
              </div>
              <div className="sm:text-right">
                <div className="mb-2">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Date</p>
                  <p className="text-gray-900">{formatDate(data.dt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Valid Until</p>
                  <p className="text-gray-900">{formatDate(data.ex)}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Services</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.li.map(([name, qty, price], i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-900 font-medium">{name}</td>
                        <td className="px-4 py-3 text-gray-600 text-center">{qty}</td>
                        <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(price)}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium text-right">{formatCurrency(qty * price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(data.st)}</span>
              </div>
              {data.tr > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({data.tr}%)</span>
                  <span>{formatCurrency(data.ta)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-300 pt-2">
                <span>Total</span>
                <span>{formatCurrency(data.t)}</span>
              </div>
            </div>

            {/* Notes */}
            {data.no && (
              <div>
                <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Notes & Terms</h2>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 rounded-lg p-4">{data.no}</p>
              </div>
            )}

            {/* Action Buttons */}
            {actionTaken ? (
              <div className={`rounded-lg p-6 text-center ${actionTaken === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-lg font-semibold ${actionTaken === 'accepted' ? 'text-green-800' : 'text-red-800'}`}>
                  {actionTaken === 'accepted' ? '✓ Estimate Accepted' : '✕ Estimate Declined'}
                </p>
                <p className={`text-sm mt-1 ${actionTaken === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                  {actionTaken === 'accepted'
                    ? "Thank you! We'll be in touch to schedule your service."
                    : 'Thank you for letting us know. Feel free to reach out if you change your mind.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                <button
                  onClick={() => setActionTaken('accepted')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  ✓ Accept Estimate
                </button>
                <button
                  onClick={() => setActionTaken('declined')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  ✕ Decline
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 print:mt-4">
          Powered by <span className="font-semibold">JobRun</span>
        </p>
      </div>

      {/* Print Styles */}
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
