import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Closing call to action. The "Make It Extra Special" feature trio that used
 * to sit above this (video messages, custom orders, influencer delivery) was
 * removed on request.
 */
export default function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="custom" className="py-10 bg-white">
      <div className="page-shell">
        <div
          id="track"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-eagle-green to-viridian-green rounded-2xl px-6 py-5 text-white"
        >
          <div>
            <h2 className="font-extrabold text-xl">{t("homepage.cta.title")}</h2>
            <p className="font-light text-sm opacity-90 mt-0.5">
              {t("homepage.cta.subtitle")}
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-white text-eagle-green hover:bg-gray-100 rounded-full px-6"
          >
            <Link to="/shop">{t("homepage.cta.button")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
