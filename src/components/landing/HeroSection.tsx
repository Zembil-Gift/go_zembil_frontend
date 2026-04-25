import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  resultsPanel?: ReactNode;
}

export default function HeroSection({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  resultsPanel,
}: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-eagle-green to-viridian-green text-white">
      {/* Ethiopian cultural pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10L40 30L30 50L20 30L30 10Z' fill='currentColor'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-48 sm:pb-56 lg:pb-64">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          {/* Content */}
          <div className="mb-12 lg:mb-0">
            <div className="opacity-100 translate-y-0 transition-all duration-700">
              <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
                {t("homepage.hero.title")}
                <span className="text-yellow block">
                  {t("homepage.hero.subtitle")}
                </span>
              </h1>
            </div>
            <div className="opacity-100 translate-y-0 transition-all duration-700 delay-100">
              <p className="font-light text-xl sm:text-2xl mb-8 leading-relaxed opacity-90">
                {t("homepage.hero.description")}
              </p>
            </div>

            {/* Search Bar */}
            <div className="opacity-100 translate-y-0 transition-all duration-700 delay-150">
              <div className="bg-white rounded-xl p-2 flex items-center shadow-xl max-w-md">
                <Input
                  type="text"
                  placeholder={t("homepage.hero.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSearchSubmit?.();
                    }
                  }}
                  className="flex-1 px-4 py-3 text-charcoal placeholder-gray-500 bg-transparent border-none outline-none"
                />
                <Button
                  type="button"
                  onClick={onSearchSubmit}
                  className="bg-june-bud hover:bg-viridian-green text-white px-6 py-3 rounded-lg"
                >
                  <Search size={16} />
                </Button>
              </div>

              {resultsPanel ? (
                <div className="mt-4 max-w-md">{resultsPanel}</div>
              ) : null}
            </div>

            {/* Quick Stats */}
            {/* <div className="flex items-center space-x-8 mt-8 text-sm">
              <div className="flex items-center space-x-2">
                <Truck className="text-yellow" size={16} />
                <span>{t('homepage.hero.freeDelivery')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="text-yellow" size={16} />
                <span>{t('homepage.hero.happyRecipients')}</span>
              </div>
            </div> */}
          </div>

          {/* Hero Image - Hidden on mobile */}
          <div className="opacity-100 translate-y-0 transition-all duration-700 delay-200">
            <div className="relative w-full h-full hidden lg:block">
              <img
                src="/attached_assets/landing_page_img.png"
                alt="Ethiopian Gifts - Send Love Through Meaningful Gifts"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Wave/Curve Transition — More wavy organic shape */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] translate-y-px z-0 rotate-180">
        <svg
          className="relative block w-full h-[80px] sm:h-[120px] lg:h-[180px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113,3,1200,34.81V0Z"
            className="fill-light-cream"
            fillOpacity="1"
          ></path>
        </svg>
      </div>
    </section>
  );
}
