
import { useTranslation } from "react-i18next";
export default function Terms() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-charcoal mb-8">{t("Terms of Service")}</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("1. Agreement to Terms")}</h2>
              <p>
                {t("By accessing and using Gerami's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("2. Service Description")}</h2>
              <p>
                {t("Gerami is a gift delivery platform that connects customers worldwide with Ethiopian vendors to facilitate the delivery of gifts and products within Ethiopia. We act as an intermediary between buyers and sellers.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("3. User Responsibilities")}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("Provide accurate and complete information when placing orders")}</li>
                <li>{t("Ensure delivery addresses are correct and accessible")}</li>
                <li>{t("Comply with all applicable laws and regulations")}</li>
                <li>{t("Respect our community guidelines and treat all users with courtesy")}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("4. Orders and Payment")}</h2>
              <p>
                {t("All orders are subject to acceptance by our vendors. Prices are quoted in Ethiopian Birr (ETB) and US Dollars (USD). Payment processing is handled securely through our trusted payment partners.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("5. Delivery Policy")}</h2>
              <p>
                {t("We strive to deliver all orders within the estimated timeframe. However, delivery times may vary due to factors beyond our control, including weather conditions, local circumstances, and vendor availability.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("6. Return and Refund Policy")}</h2>
              <p>
                {t("Due to the nature of our service and products, returns are generally not accepted. However, we will work with customers to resolve any issues with damaged or significantly misdescribed items.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("7. Limitation of Liability")}</h2>
              <p>
                {t("Gerami's liability is limited to the amount paid for the specific order in question. We are not responsible for indirect, incidental, or consequential damages.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("8. Privacy")}</h2>
              <p>
                {t("Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.")}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("9. Modifications")}</h2>
              <p>
                {t("Gerami reserves the right to modify these terms at any time. Changes will be effective immediately upon posting on our website.")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-charcoal mb-4">{t("10. Contact Information")}</h2>
              <p>
                {t("If you have any questions about these Terms of Service, please contact us at support@Gerami.com or through our contact form.")}
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{t("Last updated:")}</strong> {t("July 16, 2025")}
            </p>
          </div>
        </div>
      </main>

      
    </div>
  );
}