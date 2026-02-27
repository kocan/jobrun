'use client';

import { useState, FormEvent } from 'react';

function WaitlistForm({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const emailFieldId = 'waitlist-email';
  const waitlistFeedbackId = 'waitlist-feedback';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error || 'Something went wrong.');
      } else {
        setState('success');
        setMessage(data.message);
        setEmail('');
      }
    } catch {
      setState('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (state === 'success') {
    return (
      <div className={`flex items-center gap-2 justify-center ${className}`}>
        <span className="text-2xl">🎉</span>
        <p className="text-green-700 font-semibold">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col sm:flex-row gap-3 justify-center ${className}`}
      aria-label="Join the waitlist form"
    >
      <label htmlFor={emailFieldId} className="sr-only">Email address</label>
      <input
        id={emailFieldId}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="px-4 py-3 rounded-lg border border-gray-300 text-gray-900 bg-white flex-1 max-w-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
        required
        aria-required="true"
        aria-label="Email address"
        aria-invalid={state === 'error'}
        aria-describedby={state === 'error' ? waitlistFeedbackId : undefined}
        disabled={state === 'loading'}
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        aria-label="Join the waitlist"
        className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        {state === 'loading' ? 'Joining...' : 'Join the Waitlist'}
      </button>
      {state === 'error' && (
        <p id={waitlistFeedbackId} role="alert" className="text-red-600 dark:text-red-400 text-sm mt-1 sm:mt-0 sm:self-center">
          {message}
        </p>
      )}
    </form>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <span className="text-orange-600">Job</span>Run
        </span>
        <a
          href="#waitlist"
          className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          Join Waitlist
        </a>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">
              Coming Soon
            </p>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              Book jobs.
              <br />
              Send invoices.
              <br />
              <span className="text-orange-600">Get paid.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-lg">
              The all-in-one app for solo service operators. Schedule work, send estimates, collect
              payments — all from your phone.
            </p>
            <div className="mt-8">
              <WaitlistForm />
            </div>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              Join 100+ solo operators already on the waitlist.
            </p>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />
              <div className="w-full h-full bg-gradient-to-br from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-[2.25rem] overflow-hidden flex flex-col">
                <div className="bg-orange-600 text-white px-5 pt-10 pb-4">
                  <p className="text-xs opacity-75">Today</p>
                  <p className="text-lg font-bold">3 Jobs Scheduled</p>
                </div>
                <div className="flex-1 px-4 py-3 space-y-3">
                  {[
                    { time: '9:00 AM', job: 'Driveway Wash', customer: 'M. Johnson', price: '$185' },
                    { time: '11:30 AM', job: 'House Wash', customer: 'S. Williams', price: '$350' },
                    { time: '2:00 PM', job: 'Deck Cleaning', customer: 'R. Davis', price: '$225' },
                  ].map((j) => (
                    <div key={j.time} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-400">{j.time}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{j.job}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{j.customer}</p>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{j.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="bg-orange-600 text-white text-center py-2.5 rounded-xl text-sm font-semibold">
                    + New Job
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-orange-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
            Everything you need to run your business
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Stop juggling spreadsheets, texts, and paper invoices. JobRun handles it all.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '📅', title: 'Schedule', desc: 'Book jobs and manage your calendar. Drag, drop, done.' },
              { icon: '📝', title: 'Estimate', desc: 'Build professional estimates from your price book in seconds.' },
              { icon: '💰', title: 'Invoice', desc: 'One-tap invoicing. Send via text or email instantly.' },
              { icon: '💳', title: 'Get Paid', desc: 'Accept cards on-site or send a payment link. Money hits your bank fast.' },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Built for solo operators</h2>
          <p className="text-gray-500 dark:text-gray-300 mb-10">
            If you run a service business from your truck, JobRun was made for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: '💦', label: 'Pressure Washing' },
              { icon: '🚗', label: 'Auto Detailing' },
              { icon: '🌿', label: 'Lawn Care' },
              { icon: '🧹', label: 'Cleaning Services' },
              { icon: '🔧', label: 'Handyman' },
            ].map((v) => (
              <span
                key={v.label}
                className="px-6 py-3 bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200 rounded-full font-medium text-sm hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors"
              >
                {v.icon} {v.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Simple, honest pricing</h2>
          <p className="text-gray-500 dark:text-gray-300 mb-12">Start free. Upgrade when you&apos;re ready.</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Free</h3>
              <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mt-4">$0</p>
              <p className="text-gray-500 dark:text-gray-300 mt-1">forever</p>
              <ul className="mt-6 text-left text-gray-600 dark:text-gray-300 space-y-3 text-sm">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> 10 customers</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Basic scheduling</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Invoice generation</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Price book</li>
              </ul>
            </div>
            <div className="bg-orange-600 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-orange-500 text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="text-4xl font-extrabold mt-4">$19</p>
              <p className="text-orange-200 mt-1">/month</p>
              <ul className="mt-6 text-left text-orange-100 space-y-3 text-sm">
                <li className="flex items-center gap-2"><span>✓</span> Unlimited customers</li>
                <li className="flex items-center gap-2"><span>✓</span> Online payments</li>
                <li className="flex items-center gap-2"><span>✓</span> Estimates &amp; price book</li>
                <li className="flex items-center gap-2"><span>✓</span> SMS reminders</li>
                <li className="flex items-center gap-2"><span>✓</span> Priority support</li>
                <li className="flex items-center gap-2"><span>✓</span> Custom branding</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'When does JobRun launch?',
                a: "We're targeting early 2026. Join the waitlist to get early access and help shape the product.",
              },
              {
                q: 'Do I need any special equipment?',
                a: 'Nope. JobRun works on any smartphone — iPhone or Android. No card readers or extra hardware needed to start.',
              },
              {
                q: 'How do payments work?',
                a: 'Send your customer a payment link via text or email. They pay with a credit card, and the money goes straight to your bank account.',
              },
              {
                q: 'Can I use JobRun with a team?',
                a: "JobRun is built for solo operators right now, but team features are on the roadmap. We'll grow with you.",
              },
              {
                q: 'Is my data safe?',
                a: 'Absolutely. We use industry-standard encryption and never sell your data. Your customer list is yours.',
              },
              {
                q: 'What does the free plan include?',
                a: 'Up to 10 customers, basic scheduling, invoicing, and a price book. Everything you need to get started.',
              },
            ].map((faq) => (
              <details key={faq.q} className="group border-b border-gray-200 dark:border-gray-700 pb-4">
                <summary className="flex items-center justify-between cursor-pointer py-2 text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 transition-colors">
                  {faq.q}
                  <span className="text-gray-400 dark:text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section id="waitlist" className="px-6 py-24 bg-orange-600 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to simplify your business?</h2>
          <p className="mt-4 text-orange-100 text-lg">
            Join the waitlist and be the first to know when JobRun launches.
          </p>
          <div className="mt-8">
            <WaitlistForm className="[&_input]:border-orange-400 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder-orange-200 [&_button]:bg-white [&_button]:text-orange-600 [&_button]:hover:bg-orange-50 [&_.text-green-700]:text-white" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 bg-gray-900 text-gray-400 dark:bg-gray-950 dark:text-gray-300">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-lg font-bold text-white">
              <span className="text-orange-500">Job</span>Run
            </span>
            <p className="text-sm mt-1">Run your service business from your phone.</p>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@jobrun.app" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-800 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} JobRun. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
