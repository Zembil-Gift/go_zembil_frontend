import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Award, Users, Baby, User } from "lucide-react";

/**
 * "Find Gifts For" as a compact navigation rail rather than six large cards.
 * Same six destinations; the per-card English-only blurbs are dropped because
 * they never had Amharic translations and they cost four rows of height.
 */
export default function ShopByRecipient() {
  const { t } = useTranslation();

  const recipients = [
    { id: "mom", name: t("homepage.recipients.mom"), icon: Heart, slug: "mothers-day" },
    { id: "dad", name: t("homepage.recipients.dad"), icon: Award, slug: "fathers-day" },
    { id: "friends", name: t("homepage.recipients.friends"), icon: Users, slug: "family-reunion" },
    { id: "kids", name: t("homepage.recipients.kids"), icon: Baby, slug: "new-baby" },
    { id: "couples", name: t("homepage.recipients.couples"), icon: Heart, slug: "love-romance" },
    { id: "colleagues", name: t("homepage.recipients.colleagues"), icon: User, slug: "promotion" },
  ];

  return (
    <section className="py-6 bg-light-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-base font-bold text-eagle-green">
            {t("homepage.recipients.title")}
          </h2>
          <p className="hidden sm:block text-sm font-light text-eagle-green/60 truncate">
            {t("homepage.recipients.subtitle")}
          </p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {recipients.map(({ id, name, icon: Icon, slug }) => (
            <Link
              key={id}
              to={`/gifts?category=${slug}`}
              className="group shrink-0 inline-flex items-center gap-2 rounded-full bg-white border border-eagle-green/15 pl-2 pr-4 py-2 hover:border-viridian-green/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-viridian-green focus-visible:ring-offset-2 focus-visible:ring-offset-light-cream"
            >
              <span className="w-7 h-7 rounded-full bg-june-bud/20 flex items-center justify-center">
                <Icon
                  className="h-3.5 w-3.5 text-eagle-green"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-medium text-eagle-green whitespace-nowrap">
                {name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
