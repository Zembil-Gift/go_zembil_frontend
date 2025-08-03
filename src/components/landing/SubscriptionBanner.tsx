import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Gift, Sparkles, Star, ArrowRight } from "lucide-react";

export default function SubscriptionBanner() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-eagle-green relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-viridian-green/20 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-june-bud/20 rounded-full blur-lg"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Subscription Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-viridian-green/20 to-june-bud/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/95 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-viridian-green to-june-bud p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Calendar size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-gotham-bold text-xl text-white">{t('homepage.subscription.title')}</h3>
                      <p className="text-white/90 font-gotham-medium text-sm">Never miss a special moment</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Star size={16} className="text-white/80 fill-current" />
                    <Star size={16} className="text-white/80 fill-current" />
                    <Star size={16} className="text-white/80 fill-current" />
                  </div>
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <Sparkles size={20} className="text-viridian-green mr-2" />
                  <span className="text-sm font-medium text-viridian-green">Exclusive Benefits</span>
                </div>
                
                <p className="font-gotham-light text-gray-700 mb-6 leading-relaxed text-lg">
                  {t('homepage.subscription.description')}
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Early access to new products</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Exclusive discounts & offers</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Personalized gift recommendations</span>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-viridian-green to-june-bud hover:from-june-bud hover:to-viridian-green text-white font-gotham-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center space-x-2 group">
                  <span>{t('homepage.subscription.button')}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Referral Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-viridian-green/20 to-june-bud/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/95 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-viridian-green to-june-bud p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Gift size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-gotham-bold text-xl text-white">{t('homepage.referral.title')}</h3>
                      <p className="text-white/90 font-gotham-medium text-sm">Share the love, earn rewards</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Star size={16} className="text-white/80 fill-current" />
                    <Star size={16} className="text-white/80 fill-current" />
                    <Star size={16} className="text-white/80 fill-current" />
                  </div>
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <Sparkles size={20} className="text-viridian-green mr-2" />
                  <span className="text-sm font-medium text-viridian-green">Rewards Program</span>
                </div>
                
                <p className="font-gotham-light text-gray-700 mb-6 leading-relaxed text-lg">
                  {t('homepage.referral.description')}
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Earn points for every referral</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Redeem for exclusive gifts</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-viridian-green rounded-full"></div>
                    <span className="text-gray-600 font-gotham-medium">Special member-only events</span>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-viridian-green to-june-bud hover:from-june-bud hover:to-viridian-green text-white font-gotham-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center space-x-2 group">
                  <span>{t('homepage.referral.button')}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 