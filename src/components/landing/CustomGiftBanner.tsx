import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CustomGiftsBanner() {
  const { t } = useTranslation();

  return (
    <section className="w-full bg-eagle-green py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h2 className="font-gotham-bold text-3xl md:text-4xl lg:text-5xl text-white mb-6 leading-tight">
              GIFTS FOR EVERY BUDGET
            </h2>
            <p className="font-gotham-light text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Thoughtful gifts for every budget - find the perfect surprise for your loved ones.
            </p>
            <Link 
              to="/custom-orders"
              className="inline-flex items-center space-x-2 bg-white text-eagle-green font-gotham-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-105 group"
            >
              <span>Explore Custom Gifts</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          {/* Product Images Grid */}
          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            {/* Personalized Keychains */}
            <div className="text-center">
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-square bg-gray-100 rounded-xl mb-3 flex items-center justify-center">
                  <div className="w-16 h-16 bg-eagle-green/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔑</span>
                  </div>
                </div>
              </div>
              <h3 className="font-gotham-bold text-white text-sm md:text-base mb-1">Personalized</h3>
              <p className="font-gotham-medium text-white/80 text-xs md:text-sm">Keychains</p>
            </div>

            {/* Personalized Cozy Throws */}
            <div className="text-center">
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-square bg-gray-100 rounded-xl mb-3 flex items-center justify-center">
                  <div className="w-16 h-16 bg-eagle-green/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🧸</span>
                  </div>
                </div>
              </div>
              <h3 className="font-gotham-bold text-white text-sm md:text-base mb-1">Personalized</h3>
              <p className="font-gotham-medium text-white/80 text-xs md:text-sm">Cozy Throws</p>
            </div>

            {/* Personalized Plush Robes */}
            <div className="text-center">
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-square bg-gray-100 rounded-xl mb-3 flex items-center justify-center">
                  <div className="w-16 h-16 bg-eagle-green/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👘</span>
                  </div>
                </div>
              </div>
              <h3 className="font-gotham-bold text-white text-sm md:text-base mb-1">Personalized</h3>
              <p className="font-gotham-medium text-white/80 text-xs md:text-sm">Plush Robes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 