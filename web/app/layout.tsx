import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobRun — Book jobs, send invoices, get paid',
  description: 'Field service management built for solo operators. Pressure washing, auto detailing, lawn care, cleaning, and handyman businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
