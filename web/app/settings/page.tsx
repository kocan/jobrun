'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface QBStatus {
  connected: boolean;
  configured: boolean;
  realmId?: string;
  connectedAt?: string;
  lastSync?: string | null;
  syncedInvoices?: number;
  syncedPayments?: number;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<QBStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/quickbooks/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const qb = searchParams.get('qb');
    if (qb === 'connected') {
      setToast({ type: 'success', message: 'QuickBooks connected successfully!' });
    } else if (qb === 'error') {
      const reason = searchParams.get('reason');
      const messages: Record<string, string> = {
        denied: 'QuickBooks authorization was denied.',
        missing_params: 'Missing parameters from QuickBooks.',
        token_exchange: 'Failed to complete QuickBooks authorization.',
      };
      setToast({ type: 'error', message: messages[reason ?? ''] ?? 'QuickBooks connection failed.' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleDisconnect() {
    if (!confirm('Disconnect QuickBooks? Existing synced data in QuickBooks will not be removed.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/quickbooks/disconnect', { method: 'POST' });
      if (res.ok) {
        setStatus({ connected: false, configured: true });
        setToast({ type: 'success', message: 'QuickBooks disconnected.' });
      } else {
        setToast({ type: 'error', message: 'Failed to disconnect QuickBooks.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to disconnect QuickBooks.' });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className={`mx-auto max-w-3xl mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Integrations</h1>

        {/* QuickBooks Section */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-green-700 dark:text-green-400 font-bold text-sm">QB</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  QuickBooks Online
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sync invoices and payments to QuickBooks
                </p>
              </div>
              {/* Connection Status Indicator */}
              {!loading && status && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    status.connected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.connected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  {status.connected ? 'Connected' : 'Not connected'}
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
                Loading status...
              </div>
            ) : status?.connected ? (
              <div className="space-y-4">
                {/* Sync Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {status.syncedInvoices ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoices synced</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {status.syncedPayments ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Payments synced</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {status.lastSync
                        ? new Date(status.lastSync).toLocaleDateString()
                        : 'Never'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last sync</p>
                  </div>
                </div>

                {/* Company ID */}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Company ID: {status.realmId}
                </p>

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  aria-label="Disconnect QuickBooks"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Connect your QuickBooks Online account to automatically push invoices and payment
                  records when they are created or updated in JobRun.
                </p>
                {status?.configured ? (
                  <a
                    href="/api/quickbooks/connect"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                    aria-label="Connect to QuickBooks"
                  >
                    Connect to QuickBooks
                  </a>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    QuickBooks integration requires configuration. Set{' '}
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      QB_CLIENT_ID
                    </code>
                    ,{' '}
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      QB_CLIENT_SECRET
                    </code>
                    , and{' '}
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      QB_REDIRECT_URI
                    </code>{' '}
                    environment variables.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            <span className="text-orange-600">Job</span>Run
          </a>
          <span className="text-sm text-gray-500 dark:text-gray-400">Settings</span>
        </div>
      </nav>

      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
              Loading...
            </div>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </main>
  );
}
