import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobRun — Book jobs, send invoices, get paid',
  description:
    'The all-in-one app for solo service operators. Schedule work, send estimates, collect payments — all from your phone. Built for pressure washing, auto detailing, lawn care, cleaning, and handyman businesses.',
  keywords: [
    'field service management',
    'invoicing app',
    'solo operator',
    'pressure washing software',
    'auto detailing app',
    'lawn care scheduling',
    'handyman invoicing',
  ],
  openGraph: {
    title: 'JobRun — Book jobs, send invoices, get paid',
    description:
      'The all-in-one app for solo service operators. Schedule, estimate, invoice, and get paid from your phone.',
    url: 'https://jobrun.app',
    siteName: 'JobRun',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobRun — Book jobs, send invoices, get paid',
    description:
      'The all-in-one app for solo service operators. Schedule, estimate, invoice, and get paid from your phone.',
  },
  metadataBase: new URL('https://jobrun.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
