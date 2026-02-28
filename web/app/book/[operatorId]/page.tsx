'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useState, useMemo } from 'react';

interface ShareableBookingData {
  bn: string;
  sv: [string, number][];
  ph?: string;
  em?: string;
}

function decodeBookingData(encoded: string): ShareableBookingData | null {
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

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const operatorId = params.operatorId as string;
  const encoded = searchParams.get('d');

  const data = useMemo(() => {
    if (!encoded) return null;
    return decodeBookingData(encoded);
  }, [encoded]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    date: '',
    time: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Invalid Booking Link</h1>
          <p className="text-gray-600 dark:text-gray-400">This booking link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return; }
    if (!form.email.trim()) { setError('Please enter your email.'); return; }
    if (!form.service) { setError('Please select a service.'); return; }
    if (!form.date) { setError('Please select a preferred date.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId,
          businessName: data.bn,
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim(),
          serviceType: form.service,
          preferredDate: form.date,
          preferredTime: form.time,
          notes: form.notes.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-xl mx-auto p-4 sm:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                &#x2713;
              </div>
              <h1 className="text-2xl font-bold">Booking Request Sent!</h1>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-gray-700 dark:text-gray-300 text-lg">
                Thank you, <span className="font-semibold">{form.name}</span>!
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Your appointment request has been submitted to <span className="font-semibold">{data.bn}</span>.
                They will contact you to confirm the details.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Service</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{form.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {form.time && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Time</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{form.time}</span>
                  </div>
                )}
              </div>
              {data.ph && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Questions? Call <a href={`tel:${data.ph}`} className="text-orange-600 hover:underline font-medium">{data.ph}</a>
                </p>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            Powered by <span className="font-semibold">JobRun</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl">
                &#128197;
              </div>
              <h1 className="text-2xl font-bold">Book an Appointment</h1>
            </div>
            <p className="text-orange-100 text-sm mt-2">{data.bn}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="John Smith"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Service Type */}
            <div>
              <label htmlFor="service" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                id="service"
                name="service"
                required
                value={form.service}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="">Select a service...</option>
                {data.sv.map(([name, price], i) => (
                  <option key={i} value={name}>
                    {name} — {formatCurrency(price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={getTomorrowDate()}
                  value={form.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Time
                </label>
                <input
                  id="time"
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                placeholder="Any details about the job, special requests, etc."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              {submitting ? 'Submitting...' : 'Request Appointment'}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              This is a request — {data.bn} will confirm your appointment.
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by <span className="font-semibold">JobRun</span>
        </p>
      </div>
    </div>
  );
}
