export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
          Book jobs. Send invoices.{' '}
          <span className="text-orange-600">Get paid.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          The all-in-one app for solo service operators. Schedule work, send estimates, collect
          payments — all from your phone.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-orange-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to run your business
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '📅', title: 'Schedule', desc: 'Book jobs and manage your calendar with a tap.' },
              { icon: '📝', title: 'Estimate', desc: 'Create professional estimates from your price book.' },
              { icon: '💰', title: 'Invoice', desc: 'Generate invoices and send them instantly.' },
              { icon: '💳', title: 'Get Paid', desc: 'Accept credit card payments on the spot.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Built for solo operators</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              '💦 Pressure Washing',
              '🚗 Auto Detailing',
              '🌿 Lawn Care',
              '🧹 Cleaning Services',
              '🔧 Handyman',
            ].map((v) => (
              <span
                key={v}
                className="px-5 py-3 bg-orange-100 text-orange-800 rounded-full font-medium"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Simple pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Free</h3>
              <p className="text-4xl font-extrabold text-gray-900 mt-4">$0</p>
              <p className="text-gray-500 mt-1">forever</p>
              <ul className="mt-6 text-left text-gray-600 space-y-2 text-sm">
                <li>✓ 10 customers</li>
                <li>✓ Basic scheduling</li>
                <li>✓ Invoice generation</li>
              </ul>
            </div>
            <div className="bg-orange-600 rounded-xl p-8 shadow-lg text-white">
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="text-4xl font-extrabold mt-4">$19</p>
              <p className="text-orange-200 mt-1">/month</p>
              <ul className="mt-6 text-left text-orange-100 space-y-2 text-sm">
                <li>✓ Unlimited customers</li>
                <li>✓ Online payments</li>
                <li>✓ Estimates &amp; price book</li>
                <li>✓ SMS reminders</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Waitlist */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900">Coming Soon</h2>
          <p className="mt-4 text-gray-600">
            Join the waitlist and be the first to know when JobRun launches.
          </p>
          <form className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="your@email.com"
              className="px-4 py-3 rounded-lg border border-gray-300 text-gray-900 flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              Join the Waitlist
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6">
          <a href="/privacy" className="hover:text-gray-900">Privacy</a>
          <a href="/terms" className="hover:text-gray-900">Terms</a>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} JobRun. All rights reserved.</p>
      </footer>
    </main>
  );
}
