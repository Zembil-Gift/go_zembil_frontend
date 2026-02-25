import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignService, EventCampaign } from '@/services/campaignService';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl px-3 py-3 sm:px-5 sm:py-4 min-w-[60px] sm:min-w-[80px] border border-white/20 shadow-2xl transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-105 hover:shadow-ethiopian-gold/10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/timer:opacity-100 transition-opacity duration-500" />
        <span className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-bebas tracking-wider font-bold text-white tabular-nums leading-none drop-shadow-lg">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-white/90 mt-2 uppercase tracking-[0.2em] drop-shadow-md">
        {label}
      </span>
    </div>
  );
}



function CampaignSlide({ campaign, isActive }: { campaign: EventCampaign; isActive: boolean }) {
  const navigate = useNavigate();
  const countdown = useCountdown(campaign.endDateTime);

  if (countdown.total <= 0) return null;

  return (
    <div className="relative w-full h-[550px] sm:h-[600px] md:h-[650px] lg:h-[720px] overflow-hidden group">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={campaign.imageUrl || ''}
          alt={campaign.name}
          className={cn(
            "w-full h-full object-cover transition-transform duration-[10s] ease-linear will-change-transform",
            isActive ? "scale-110" : "scale-100"
          )}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80" />

      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="absolute inset-0 z-30 flex flex-col justify-end px-5 sm:px-10 md:px-16 lg:px-24 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-16 sm:pb-20 md:pb-24 lg:pb-12">
        <div className={cn(
          "max-w-4xl pt-3 sm:pt-4 md:pt-6 transition-all duration-1000 ease-out transform",
          isActive ? "opacity-100 translate-y-0 delay-300" : "opacity-0 translate-y-8"
        )}>
        

          <h2 className="pt-1 sm:pt-2 lg:pt-3 text-[clamp(1.75rem,6vw,4.75rem)] font-serif font-bold text-white leading-[1.05] sm:leading-[1.08] tracking-tight mb-4 sm:mb-7 drop-shadow-2xl max-w-[20ch] break-words">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
              {campaign.name}
            </span>
          </h2>

          {campaign.description && (
            <p className="hidden sm:block text-lg sm:text-xl text-gray-200 mb-10 max-w-2xl leading-relaxed font-light border-l-4 border-ethiopian-gold pl-6">
              {campaign.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-5 sm:mb-10">
            <CountdownUnit value={countdown.days} label="Days" />
            <span className="text-3xl sm:text-4xl font-light text-white/40 pb-6">:</span>
            <CountdownUnit value={countdown.hours} label="Hours" />
            <span className="text-3xl sm:text-4xl font-light text-white/40 pb-6">:</span>
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <span className="text-3xl sm:text-4xl font-light text-white/40 pb-6">:</span>
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>

          <div className="relative z-40 inline-block rounded-full bg-black/40 backdrop-blur-sm p-1.5">
            <button
              onClick={() => navigate(`/gifts?category=${campaign.subCategorySlug}`)}
              className="group/btn relative inline-flex items-center gap-3 sm:gap-4 bg-white hover:bg-ethiopian-gold text-charcoal text-base sm:text-xl font-bold px-6 sm:px-10 py-3.5 sm:py-5 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(253,203,45,0.6)] overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                Shop The Collection
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover/btn:translate-x-2" />
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

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignService.getActiveCampaigns(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const liveCampaigns = campaigns.filter((c) => {
    return new Date(c.endDateTime).getTime() > Date.now() && !!c.imageUrl;
  });

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
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + liveCampaigns.length) % liveCampaigns.length);
  const goNext = () => setCurrentSlide((prev) => (prev + 1) % liveCampaigns.length);

  return (
    <section
      className="w-full relative z-10 -mt-24 sm:-mt-32 lg:-mt-40 mb-16 px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl bg-charcoal ring-4 ring-white/10">

          <div className="relative h-[550px] sm:h-[600px] md:h-[650px] lg:h-[720px]">
            {liveCampaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className={cn(
                  "absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out",
                  index === currentSlide ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <CampaignSlide campaign={campaign} isActive={index === currentSlide} />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 z-50 flex justify-between items-end bg-gradient-to-t from-black/80 to-transparent pointer-events-none">

            <div className="flex gap-3 pointer-events-auto">
              {liveCampaigns.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentSlide ? "w-12 bg-ethiopian-gold" : "w-4 bg-white/30 hover:bg-white/60"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-4 pointer-events-auto">
              <button
                onClick={goPrev}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-charcoal hover:scale-110 transition-all duration-300 group"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={goNext}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-charcoal hover:scale-110 transition-all duration-300 group"
              >
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
