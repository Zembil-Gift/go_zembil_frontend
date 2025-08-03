import React from "react";
import { useTranslation } from "react-i18next";
import { Video, PaintbrushVertical, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Video,
      title: t('homepage.features.videoMessages.title'),
      description: t('homepage.features.videoMessages.description'),
      learnMore: t('homepage.features.videoMessages.learnMore'),
      gradient: "from-yellow to-june-bud"
    },
    {
      icon: PaintbrushVertical,
      title: t('homepage.features.customOrders.title'),
      description: t('homepage.features.customOrders.description'),
      learnMore: t('homepage.features.customOrders.learnMore'),
      gradient: "from-viridian-green to-eagle-green"
    },
    {
      icon: Star,
      title: t('homepage.features.influencerDelivery.title'),
      description: t('homepage.features.influencerDelivery.description'),
      learnMore: t('homepage.features.influencerDelivery.learnMore'),
      gradient: "from-june-bud to-viridian-green"
    }
  ];

  return (
    <section id="custom" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-eagle-green mb-4">
            {t('homepage.features.title')}
          </h2>
          <p className="font-gotham-light text-xl text-eagle-green/70 max-w-2xl mx-auto">
            {t('homepage.features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="text-center">
                <div className={`bg-gradient-to-br ${feature.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <IconComponent className="text-white" size={24} />
                </div>
                <h3 className="font-gotham-bold text-xl text-eagle-green mb-4">{feature.title}</h3>
                <p className="font-gotham-light text-eagle-green/70 mb-6">{feature.description}</p>
                <button className="text-viridian-green hover:text-june-bud font-gotham-medium transition-colors duration-200">
                  {feature.learnMore}
                </button>
              </div>
            );
          })}
        </div>

        {/* Call-to-Action */}
        <div id="track" className="bg-gradient-to-r from-eagle-green to-viridian-green rounded-2xl p-8 mt-12 text-white text-center">
          <h3 className="font-gotham-extra-bold text-2xl mb-4">{t('homepage.cta.title')}</h3>
          <p className="font-gotham-light text-lg mb-6 opacity-90">{t('homepage.cta.subtitle')}</p>
          <Button asChild className="bg-white text-eagle-green hover:bg-gray-100">
            <a href="/api/login">{t('homepage.cta.button')}</a>
          </Button>
        </div>
      </div>
    </section>
  );
} 