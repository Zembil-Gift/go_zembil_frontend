import { useTranslation } from "react-i18next";
import { Truck, Calendar, Heart } from "lucide-react";

/**
 * The three diaspora value props as a single-row strip instead of three
 * icon cards. Same copy, ~1/6 the height, and it sits high on the page
 * where trust actually affects the decision to browse.
 */
export default function TrustStrip() {
  const { t } = useTranslation();

  const points = [
    {
      icon: Truck,
      label: t("homepage.diaspora.freeDelivery"),
      detail: t("homepage.diaspora.freeDeliveryDesc"),
    },
    {
      icon: Calendar,
      label: t("homepage.diaspora.scheduleDelivery"),
      detail: t("homepage.diaspora.scheduleDeliveryDesc"),
    },
    {
      icon: Heart,
      label: t("homepage.diaspora.authentic"),
      detail: t("homepage.diaspora.authenticDesc"),
    },
  ];

  return (
    <section
      aria-label={t("homepage.diaspora.title")}
      className="bg-white border-y border-eagle-green/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex gap-6 overflow-x-auto py-3 sm:py-4 md:justify-between md:overflow-visible">
          {points.map(({ icon: Icon, label, detail }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 shrink-0 md:shrink"
            >
              <Icon
                className="h-5 w-5 text-viridian-green shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-eagle-green leading-tight">
                  {label}
                </p>
                <p className="hidden sm:block text-xs text-eagle-green/60 leading-tight mt-0.5">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
