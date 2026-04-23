import { useTranslation } from "react-i18next";
import { Truck, Calendar, Heart } from "lucide-react";

export default function DiasporaSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-ethiopian-gold/10 via-june-bud/10 to-viridian-green/10 relative overflow-hidden border-t border-viridian-green/20">
      <div className="absolute inset-0 bg-gradient-to-r from-eagle-green/8 via-viridian-green/6 to-june-bud/8"></div>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-800">
          <div className="mb-6">
            <div className="inline-flex items-center bg-white/50 backdrop-blur-sm border border-viridian-green/20 rounded-full px-6 py-2 mb-4 shadow-md">
              <span className="text-xl mr-2">🌍</span>
              <span className="text-sm font-medium text-eagle-green">→</span>
              <span className="text-xl ml-2">🇪🇹</span>
            </div>
          </div>
          <h2 className="font-extra-bold text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight text-eagle-green">
            {t("homepage.diaspora.title")}
          </h2>
          <p className="font-light text-lg sm:text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-eagle-green/70">
            {t("homepage.diaspora.subtitle")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-md border border-viridian-green/20 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-105 transition-all duration-300">
              <Truck size={32} className="mx-auto mb-3 text-eagle-green" />
              <h3 className="font-semibold text-lg mb-2 text-eagle-green">
                {t("homepage.diaspora.freeDelivery")}
              </h3>
              <p className="text-sm text-eagle-green/70 leading-relaxed">
                {t("homepage.diaspora.freeDeliveryDesc")}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-viridian-green/20 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-105 transition-all duration-300">
              <Calendar size={32} className="mx-auto mb-3 text-eagle-green" />
              <h3 className="font-semibold text-lg mb-2 text-eagle-green">
                {t("homepage.diaspora.scheduleDelivery")}
              </h3>
              <p className="text-sm text-eagle-green/70 leading-relaxed">
                {t("homepage.diaspora.scheduleDeliveryDesc")}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-viridian-green/20 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-105 transition-all duration-300">
              <Heart size={32} className="mx-auto mb-3 text-eagle-green" />
              <h3 className="font-semibold text-lg mb-2 text-eagle-green">
                {t("homepage.diaspora.authentic")}
              </h3>
              <p className="text-sm text-eagle-green/70 leading-relaxed">
                {t("homepage.diaspora.authenticDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
