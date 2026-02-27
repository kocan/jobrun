export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-6 text-gray-600">
        Terms of service will be published before launch. By using JobRun, you agree to use the
        platform responsibly and in accordance with applicable laws.
      </p>
      <p className="mt-4 text-gray-600">
        Questions? Contact us at{' '}
        <a href="mailto:hello@jobrun.app" className="text-orange-600 hover:underline">
          hello@jobrun.app
        </a>
      </p>
    </main>
  );
}
