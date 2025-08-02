import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SubscriptionBanner() {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-gradient-to-r from-deep-forest via-teal-800 to-deep-forest relative">
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Card className="bg-white bg-opacity-95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-ethiopian-gold rounded-full flex items-center justify-center mr-4">
                  <Calendar size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-gotham-bold text-2xl text-charcoal">{t('homepage.subscription.title')}</h3>
                  <p className="text-green-600 font-gotham-medium">{t('homepage.subscription.subtitle')}</p>
                </div>
              </div>
              <p className="font-gotham-light text-gray-600 mb-6 leading-relaxed">
                {t('homepage.subscription.description')}
              </p>
              <Button className="bg-ethiopian-gold hover:bg-amber text-white w-full font-semibold py-3">
                {t('homepage.subscription.button')}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white bg-opacity-95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-warm-red rounded-full flex items-center justify-center mr-4">
                  <Gift size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-gotham-bold text-2xl text-charcoal">{t('homepage.referral.title')}</h3>
                  <p className="text-warm-red font-gotham-medium">{t('homepage.referral.subtitle')}</p>
                </div>
              </div>
              <p className="font-gotham-light text-gray-600 mb-6 leading-relaxed">
                {t('homepage.referral.description')}
              </p>
              <Button className="bg-warm-red hover:bg-red-600 text-white w-full font-semibold py-3">
                {t('homepage.referral.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
} 