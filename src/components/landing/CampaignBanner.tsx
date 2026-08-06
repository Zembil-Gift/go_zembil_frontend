import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  campaignService,
  TargetRole,
} from "@/services/campaignService";
import { freeGiftService } from "@/services/freeGiftService";
import { cashbackService } from "@/services/cashbackService";
import { formatPrice, fromMinorUnits, fetchCurrencies } from "@/lib/currency";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

/**
 * What the carousel renders. Event campaigns and free-gift tiers both
 * normalize into this, so they share one polished slide.
 */
interface Slide {
  key: string;
  name: string;
  description?: string | null;
  /** One or more backgrounds; more than one cycles every ROTATE_MS. */
  imageUrls: string[];
  badge?: string | null;
  /** Omitted by free gifts, which may run open-ended — no countdown shown. */
  endDateTime?: string | null;
  ctaText: string;
  href: string;
}

/** How long each background image of a multi-image slide stays up. */
const ROTATE_MS = 15_000;

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function useCountdown(endDateTime: string): TimeRemaining {
  const calculate = useCallback((): TimeRemaining => {
    const end = new Date(endDateTime).getTime();
    const now = Date.now();
    const total = Math.max(0, end - now);

    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      seconds: Math.floor((total / 1000) % 60),
      total,
    };
  }, [endDateTime]);

  const [remaining, setRemaining] = useState<TimeRemaining>(calculate);

  useEffect(() => {
    const interval = setInterval(() => setRemaining(calculate()), 1000);
    return () => clearInterval(interval);
  }, [calculate]);

  return remaining;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center group/timer">
      <div className="relative overflow-hidden bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 min-w-[46px] sm:min-w-[56px] border border-white/20 shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-105 hover:shadow-ethiopian-gold/10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/timer:opacity-100 transition-opacity duration-500" />
        <span className="relative z-10 text-xl sm:text-2xl font-bebas tracking-wider font-bold text-white tabular-nums leading-none drop-shadow-lg">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-bold text-white/90 mt-1.5 uppercase tracking-[0.2em] drop-shadow-md">
        {label}
      </span>
    </div>
  );
}

/** Split out so the countdown hook only runs for slides that have a deadline. */
function Countdown({ endDateTime }: { endDateTime: string }) {
  const { t } = useTranslation();
  const countdown = useCountdown(endDateTime);

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-4 sm:mb-6">
      <CountdownUnit value={countdown.days} label={t("Days")} />
      <span className="text-xl sm:text-2xl font-light text-white/40 pb-5">
        :
      </span>
      <CountdownUnit value={countdown.hours} label={t("Hours")} />
      <span className="text-xl sm:text-2xl font-light text-white/40 pb-5">
        :
      </span>
      <CountdownUnit value={countdown.minutes} label={t("Mins")} />
      <span className="text-xl sm:text-2xl font-light text-white/40 pb-5">
        :
      </span>
      <CountdownUnit value={countdown.seconds} label={t("Secs")} />
    </div>
  );
}

function CampaignSlide({
  slide,
  isActive,
}: {
  slide: Slide;
  isActive: boolean;
}) {
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);

  // Campaigns with several banners cycle through them in place; the slide itself
  // stays put, so a single-campaign home page still moves.
  useEffect(() => {
    // A refetch can shorten the list under us; start over rather than land on a
    // gap where no image is the visible one.
    setImageIndex(0);
    if (slide.imageUrls.length <= 1) return;
    const interval = setInterval(
      () => setImageIndex((prev) => (prev + 1) % slide.imageUrls.length),
      ROTATE_MS
    );
    return () => clearInterval(interval);
  }, [slide.imageUrls.length]);

  return (
    <div className="relative w-full min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] group bg-charcoal overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {slide.imageUrls.map((url, index) => (
          <img
            key={url}
            src={url}
            alt={slide.name}
            // Slow zoom as before, plus a one-second crossfade between images.
            style={{ transition: "transform 10s linear, opacity 1s ease-in-out" }}
            className={cn(
              "absolute inset-0 w-full h-full object-cover will-change-transform",
              isActive ? "scale-110" : "scale-100",
              index === imageIndex ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80" />

      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="relative z-30 flex flex-col justify-end min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] px-5 sm:px-8 md:px-12 lg:px-16 pt-6 sm:pt-8 pb-20 sm:pb-24">
        <div
          className={cn(
            "max-w-2xl transition-all duration-1000 ease-out transform",
            isActive
              ? "opacity-100 translate-y-0 delay-300"
              : "opacity-0 translate-y-8"
          )}
        >
          {slide.badge && (
            <span className="inline-block px-2.5 py-0.5 mb-3 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-ethiopian-gold/20 text-ethiopian-gold border border-ethiopian-gold/30">
              {slide.badge}
            </span>
          )}

          <h2 className="text-[clamp(1.5rem,3.5vw,2.75rem)] font-serif font-bold text-white leading-[1.1] tracking-tight mb-3 drop-shadow-2xl max-w-[20ch] break-words line-clamp-2">
            {slide.name}
          </h2>

          {slide.description && (
            <p className="hidden sm:block text-sm sm:text-base text-gray-200 mb-5 max-w-xl leading-relaxed font-light border-l-2 border-ethiopian-gold pl-4 line-clamp-2">
              {slide.description}
            </p>
          )}

          {slide.endDateTime && <Countdown endDateTime={slide.endDateTime} />}

          <div className="relative z-40 inline-block rounded-full bg-black/40 backdrop-blur-sm p-1 shadow-[0_0_30px_8px_rgba(0,0,0,0.35)]">
            <button
              onClick={() => navigate(slide.href)}
              className="group/btn relative inline-flex items-center gap-2 sm:gap-3 bg-white hover:bg-ethiopian-gold text-charcoal text-sm sm:text-base font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(253,203,45,0.6)] overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {slide.ctaText}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover/btn:translate-x-2" />
              </span>

              <div className="absolute inset-0 -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { user, isInitialized } = useAuth();

  const campaignRole: TargetRole =
    user?.role?.toUpperCase() === "VENDOR" ? "VENDOR" : "CUSTOMER";

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", "active", "role", campaignRole],
    queryFn: () => campaignService.getActiveCampaignsByRole(campaignRole),
    enabled: isInitialized,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: giftTiers = [] } = useQuery({
    queryKey: ["free-gift"],
    queryFn: () => freeGiftService.getFreeGiftTiers(),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: cashbackCampaigns = [] } = useQuery({
    queryKey: ["cashback"],
    queryFn: () => cashbackService.getCampaigns(),
    staleTime: 60_000,
    retry: 1,
  });

  // Campaigns no longer carry a currency; display amounts in the store default.
  const { data: currencyMap } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => fetchCurrencies(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const defaultCurrency =
    [...(currencyMap?.values() ?? [])].find((c) => c.isDefault)?.code ?? "USD";

  const campaignSlides: Slide[] = campaigns
    .filter((c) => new Date(c.endDateTime).getTime() > Date.now() && !!c.imageUrl)
    .map((c) => ({
      key: `campaign-${c.id}`,
      name: c.name,
      description: c.description,
      imageUrls: [c.imageUrl!],
      badge:
        c.campaignType === "PRODUCT_EVENT"
          ? null
          : c.campaignType === "VENDOR_PARTICIPATION"
            ? "Vendor Campaign"
            : "Join & Win",
      endDateTime: c.endDateTime,
      ctaText: c.ctaText || "View Campaign",
      href: `/campaigns/${c.id}`,
    }));

  // Free gifts share the slide but carry their own hook: spend X, get it free.
  const giftSlides: Slide[] = giftTiers
    .filter((t) => t.activeNow && !!t.imageUrl)
    .sort((a, b) => a.thresholdAmountMinor - b.thresholdAmountMinor)
    .map((t) => ({
      key: `gift-${t.id}`,
      name: t.giftProductName ?? t.code,
      description:
        t.description ??
        `Spend ${formatPrice(
          fromMinorUnits(t.thresholdAmountMinor, t.currencyCode),
          t.currencyCode
        )} and this is yours, free.`,
      imageUrls: [t.imageUrl!],
      badge: "Free Gift",
      endDateTime: t.endsAt,
      ctaText: "Start shopping",
      href: "/shop",
    }));

  // Cashback shares the slide too: spend anything, get a percent back as credit.
  const cashbackSlides: Slide[] = cashbackCampaigns
    .filter((c) => c.activeNow && c.imageUrls?.length > 0)
    .sort((a, b) => b.percent - a.percent)
    .map((c) => ({
      key: `cashback-${c.id}`,
      name: c.code,
      description:
        c.description ??
        (c.minOrderSubtotalMinor > 0
          ? `Spend ${formatPrice(
              fromMinorUnits(c.minOrderSubtotalMinor, defaultCurrency),
              defaultCurrency
            )} and get ${c.percent}% back as wallet credit.`
          : `Get ${c.percent}% of every order back as wallet credit.`),
      imageUrls: c.imageUrls,
      badge: `${c.percent}% Back`,
      endDateTime: c.endsAt,
      ctaText: "Start shopping",
      href: "/shop",
    }));

  const liveCampaigns = [...campaignSlides, ...giftSlides, ...cashbackSlides];

  useEffect(() => {
    if (liveCampaigns.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % liveCampaigns.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [liveCampaigns.length, isPaused]);

  useEffect(() => {
    if (currentSlide >= liveCampaigns.length && liveCampaigns.length > 0) {
      setCurrentSlide(0);
    }
  }, [liveCampaigns.length, currentSlide]);

  if (liveCampaigns.length === 0) return null;

  const goTo = (index: number) => setCurrentSlide(index);
  const goPrev = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + liveCampaigns.length) % liveCampaigns.length
    );
  const goNext = () =>
    setCurrentSlide((prev) => (prev + 1) % liveCampaigns.length);

  return (
    <section
      // The negative top margin this used to carry existed to tuck the banner
      // under the hero's wave. The hero is gone, so it only bled into the navbar.
      className="page-shell relative z-10 mt-4 sm:mt-6 mb-8 sm:mb-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-charcoal ring-1 ring-eagle-green/10">
          <div className="relative bg-charcoal overflow-hidden">
            {liveCampaigns.map((slide, index) => (
              <div
                key={slide.key}
                className={cn(
                  "w-full transition-opacity duration-700 ease-in-out",
                  index === currentSlide
                    ? "relative opacity-100 pointer-events-auto z-10"
                    : "absolute inset-0 opacity-0 pointer-events-none z-0"
                )}
              >
                <CampaignSlide slide={slide} isActive={index === currentSlide} />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 z-50 flex justify-between items-end bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              {liveCampaigns.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentSlide
                      ? "w-8 bg-ethiopian-gold"
                      : "w-3 bg-white/30 hover:bg-white/60"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={goPrev}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-charcoal hover:scale-110 transition-all duration-300 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={goNext}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-charcoal hover:scale-110 transition-all duration-300 group"
              >
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
