import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Award, Users, Baby, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GiftRecipient {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
  subCategorySlug: string;
}

export default function GiftRecipientsSection() {
  const { t } = useTranslation();

  const giftRecipients: GiftRecipient[] = [
    {
      id: "mom",
      name: t("homepage.recipients.mom"),
      icon: Heart,
      gradient: "from-ethiopian-gold to-june-bud",
      description: "Show your love and appreciation",
      subCategorySlug: "mothers-day",
    },
    {
      id: "dad",
      name: t("homepage.recipients.dad"),
      icon: Award,
      gradient: "from-viridian-green to-eagle-green",
      description: "Celebrate his achievements",
      subCategorySlug: "fathers-day",
    },
    {
      id: "friends",
      name: t("homepage.recipients.friends"),
      icon: Users,
      gradient: "from-june-bud to-viridian-green",
      description: "Strengthen your friendship",
      subCategorySlug: "family-reunion",
    },
    {
      id: "kids",
      name: t("homepage.recipients.kids"),
      icon: Baby,
      gradient: "from-eagle-green to-ethiopian-gold",
      description: "Make them smile with joy",
      subCategorySlug: "new-baby",
    },
    {
      id: "couples",
      name: t("homepage.recipients.couples"),
      icon: Heart,
      gradient: "from-ethiopian-gold to-viridian-green",
      description: "Express your deep affection",
      subCategorySlug: "love-romance",
    },
    {
      id: "colleagues",
      name: t("homepage.recipients.colleagues"),
      icon: User,
      gradient: "from-june-bud to-eagle-green",
      description: "Build professional relationships",
      subCategorySlug: "promotion",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-ethiopian-gold/5 to-viridian-green/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-extra-bold text-3xl sm:text-4xl text-eagle-green mb-4">
            {t("homepage.recipients.title")}
          </h2>
          <p className="font-light text-xl text-eagle-green/70 max-w-2xl mx-auto">
            {t("homepage.recipients.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {giftRecipients.map((recipient) => {
            const IconComponent = recipient.icon;
            return (
              <div key={recipient.id}>
                <Link
                  to={`/gifts?category=${recipient.subCategorySlug}`}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105 border border-viridian-green/20">
                    {/* Gradient Background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${recipient.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    {/* Content */}
                    <div className="relative p-6 text-center">
                      {/* Icon Container */}
                      <div
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${recipient.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}
                      >
                        <IconComponent size={28} className="text-white" />
                      </div>

                      {/* Text Content */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-eagle-green group-hover:text-eagle-green transition-colors">
                          {recipient.name}
                        </h3>
                        <p className="text-sm text-eagle-green/70 leading-relaxed">
                          {recipient.description}
                        </p>
                      </div>

                      {/* Hover Indicator */}
                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div
                          className={`w-8 h-1 mx-auto rounded-full bg-gradient-to-r ${recipient.gradient}`}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
