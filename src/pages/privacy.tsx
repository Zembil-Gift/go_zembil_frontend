const privacyCommitments = [
  {
    title: "We do not sell personal data",
    description:
      "We do not sell, rent, trade, or broker user data to advertisers, data brokers, or other third parties.",
  },
  {
    title: "Minimal collection for service operation",
    description:
      "We collect only the information needed to run accounts, payments, delivery, customer support, and security.",
  },
  {
    title: "No third-party ad profiling",
    description:
      "We do not share personal data for cross-app or cross-site behavioral advertising.",
  },
  {
    title: "Clear user controls",
    description:
      "You can request access, correction, export, or deletion of your personal data by contacting support.",
  },
];

const dataWeCollect = [
  "Account details such as your name, email, phone number, and login credentials.",
  "Order and recipient details such as delivery address, recipient contact, and order notes.",
  "Transaction records such as order totals, payment status, and payment provider references.",
  "Support and communication data when you contact us.",
  "Technical session data needed for login, security, language preference, cart flow, and app reliability.",
  "Optional location and camera data only when you choose features that need them (for example map pinning, delivery proof, or QR scanning).",
];

const whyWeUseData = [
  "Create and secure user accounts.",
  "Process orders, payments, and deliveries.",
  "Prevent fraud, abuse, and unauthorized access.",
  "Respond to support requests and service issues.",
  "Meet legal, tax, and compliance requirements.",
  "Improve platform reliability and performance.",
];

const sharingRules = [
  "Vendors and delivery partners, strictly to fulfill orders.",
  "Payment processors (for example Stripe, Chapa, and Telebirr) to process payments.",
  "Infrastructure and operational providers that help us host and secure the service.",
  "Regulators or law enforcement when legally required.",
];

const googlePlayDisclosures = [
  "This policy discloses user data practices in line with Google Play User Data and Data Safety policy requirements.",
  "Personal data is collected for core app functionality only, not for data resale.",
  "Personal data is not sold and is not shared for third-party advertising purposes.",
  "Sensitive permissions are optional and requested only when needed by an in-app action.",
  "Data in transit is protected using encryption in supported production environments.",
  "Users can request account and data deletion by emailing support@gogerami.com.",
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-eagle-green to-viridian-green text-white p-8 sm:p-10 shadow-lg">
          <p className="text-sm uppercase tracking-wide text-ethiopian-gold font-semibold mb-3">
            Privacy Policy
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Your data is not for sale</h1>
          <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-3xl">
            goGerami does not sell your personal data. We only process data that is necessary to run
            your account, complete orders, and keep the platform secure.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {privacyCommitments.map((item) => (
            <article key={item.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-charcoal mb-2">{item.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">1. Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            {dataWeCollect.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">2. How We Use Data</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            {whyWeUseData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">3. Data Sharing Rules</h2>
          <p className="text-gray-600 mb-4">
            We never sell personal data. We only share limited data in the following cases:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            {sharingRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>



        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">4. Retention and Security</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            We retain data only as long as needed for account operation, order fulfillment, support,
            and legal obligations.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We apply reasonable technical and organizational safeguards to protect personal data,
            including access controls and encrypted transport in supported production environments.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">5. Your Privacy Rights</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Access or update your account information.</li>
            <li>Request a copy/export of your personal data.</li>
            <li>Request correction or deletion of your personal data.</li>
            <li>Opt out of non-essential promotional communications.</li>
          </ul>
          <p className="text-gray-600 mt-4">
            To submit a privacy or deletion request, contact{" "}
            <a href="mailto:support@gogerami.com" className="text-viridian-green hover:underline">
              support@gogerami.com
            </a>
            .
          </p>
        </section>

        <section className="bg-eagle-green/5 rounded-2xl border border-eagle-green/20 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">6. Google Play Data Safety Disclosure</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            {googlePlayDisclosures.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-4">7. Children, International Transfers, and Updates</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Our services are not directed to children under 13, and we do not knowingly collect
            personal data from children under 13.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Depending on where you use our services, data may be processed in countries outside your
            residence with appropriate safeguards.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We may update this policy as our product, legal obligations, or platform requirements
            change. Material updates are posted on this page.
          </p>
        </section>

        <section className="bg-gray-100 rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Last updated:</strong> April 23, 2026
          </p>
        </section>
      </main>
    </div>
  );
}
