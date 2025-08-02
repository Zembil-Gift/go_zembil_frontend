import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Truck, Calendar, Heart } from "lucide-react";

export default function DiasporaSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-orange-50 via-amber-100 to-rose-200 relative overflow-hidden border-t border-orange-200">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-900/8 via-orange-900/6 to-rose-900/8"></div>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center text-gray-800"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        >
          <div className="mb-6">
            <motion.div 
              className="inline-flex items-center bg-white/50 backdrop-blur-sm border border-orange-200 rounded-full px-6 py-2 mb-4 shadow-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <span className="text-xl mr-2">🌍</span>
              <span className="text-sm font-medium text-deep-forest">→</span>
              <span className="text-xl ml-2">🇪🇹</span>
            </motion.div>
          </div>
          <motion.h2 
            className="font-gotham-extra-bold text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight text-deep-forest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            {t('homepage.diaspora.title')}
          </motion.h2>
          <motion.p 
            className="font-gotham-light text-lg sm:text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
          >
            {t('homepage.diaspora.subtitle')}
          </motion.p>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.6 }}
          >
            <motion.div 
              className="bg-white/60 backdrop-blur-md border border-orange-200/70 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-400"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <Truck size={32} className="mx-auto mb-3 text-deep-forest" />
              <h3 className="font-semibold text-lg mb-2 text-deep-forest">{t('homepage.diaspora.freeDelivery')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t('homepage.diaspora.freeDeliveryDesc')}</p>
            </motion.div>
            <motion.div 
              className="bg-white/60 backdrop-blur-md border border-orange-200/70 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-400"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2 }}
            >
              <Calendar size={32} className="mx-auto mb-3 text-deep-forest" />
              <h3 className="font-semibold text-lg mb-2 text-deep-forest">{t('homepage.diaspora.scheduleDelivery')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t('homepage.diaspora.scheduleDeliveryDesc')}</p>
            </motion.div>
            <motion.div 
              className="bg-white/60 backdrop-blur-md border border-orange-200/70 rounded-xl p-6 text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-400"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.2 }}
            >
              <Heart size={32} className="mx-auto mb-3 text-deep-forest" />
              <h3 className="font-semibold text-lg mb-2 text-deep-forest">{t('homepage.diaspora.authentic')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t('homepage.diaspora.authenticDesc')}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
} 