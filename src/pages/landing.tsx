import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Gift, Coffee, Star, Truck, Search, Menu, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Video, PaintbrushVertical, ShoppingBag, User, CakeSlice, GraduationCap, Baby, Cross, Waves, Egg, ChevronLeft, ChevronRight, Moon, Sun, TreePine, Flower2, Crown, Mountain, PartyPopper, Home as HomeIcon, Users, Award, Sparkles, Smile, HelpingHand, ThumbsUp, Palette, Shirt, Music, Camera, Calendar } from "lucide-react";
import { formatDualCurrency } from "@/lib/currency";
import AnimatedBlackboard from "@/components/animated-blackboard";
import LiveChatButton from "@/components/live-chat-button";
import ProductCard from "@/components/ProductCard";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";
import { MockApiService } from "@/services/mockApiService";


export default function Landing() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("occasions");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");
  const [userCountry, setUserCountry] = useState("US"); // Auto-detected
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch categories and featured products using mock data
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => MockApiService.getCategories(),
  });

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["/api/products/featured?limit=4"],
    queryFn: () => MockApiService.getFeaturedProducts(4),
  });

  // Budget filter options
  const budgetRanges = [
    { id: "all", label: t('homepage.trending.allPrices'), min: 0, max: Infinity },
    { id: "under-10", label: t('homepage.trending.under10'), min: 0, max: 10 },
    { id: "10-25", label: t('homepage.trending.10to25'), min: 10, max: 25 },
    { id: "25-50", label: t('homepage.trending.25to50'), min: 25, max: 50 },
    { id: "50-100", label: t('homepage.trending.50to100'), min: 50, max: 100 },
    { id: "over-100", label: t('homepage.trending.over100'), min: 100, max: Infinity }
  ];

  // Gift recipients data
  const giftRecipients = [
    { id: "mom", name: t('homepage.recipients.mom'), icon: Heart, color: "bg-pink-100 text-pink-600" },
    { id: "dad", name: t('homepage.recipients.dad'), icon: Award, color: "bg-blue-100 text-blue-600" },
    { id: "friends", name: t('homepage.recipients.friends'), icon: Users, color: "bg-green-100 text-green-600" },
    { id: "kids", name: t('homepage.recipients.kids'), icon: Baby, color: "bg-yellow-100 text-yellow-600" },
    { id: "couples", name: t('homepage.recipients.couples'), icon: Heart, color: "bg-red-100 text-red-600" },
    { id: "colleagues", name: t('homepage.recipients.colleagues'), icon: User, color: "bg-gray-100 text-gray-600" }
  ];

  // Auto-detect user location (simplified)
  useEffect(() => {
    // In real implementation, use geolocation API or IP-based detection
    const detectLocation = () => {
      setUserCountry("US"); // Default to US for diaspora targeting
    };
    detectLocation();
  }, []);

  // Fetch trending gifts using mock data
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ["/api/products?isTrending=true&limit=12"],
    queryFn: () => MockApiService.getTrendingProducts(12),
  });

  // Use real products or fallback to featured products, duplicate for infinite scroll
  const trendingGifts = trendingProducts || featuredProducts || [];
  const duplicatedGifts = [...trendingGifts, ...trendingGifts];

  const [translateX, setTranslateX] = useState(0);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [categoryTranslateX, setCategoryTranslateX] = useState(0);
  const cardWidth = 320; // Card width + gap
  const itemsToShow = 4;

  // Manual navigation functions (no auto-scroll)
  const scrollLeft = () => {
    setTranslateX(prev => {
      const newTranslateX = prev + cardWidth;
      // If we've scrolled to the beginning, jump to the end of the first set
      if (newTranslateX > 0) {
        return -(cardWidth * (trendingGifts.length - itemsToShow));
      }
      return newTranslateX;
    });
  };

  const scrollRight = () => {
    setTranslateX(prev => {
      const newTranslateX = prev - cardWidth;
      // Reset when we've scrolled through one full set
      if (Math.abs(newTranslateX) >= cardWidth * trendingGifts.length) {
        return 0;
      }
      return newTranslateX;
    });
  };

  // Category carousel navigation functions
  const scrollCategoryLeft = () => {
    setCategoryTranslateX(prev => {
      const newTranslateX = prev + cardWidth;
      const maxTranslateX = 0;
      return Math.min(newTranslateX, maxTranslateX);
    });
  };

  const scrollCategoryRight = () => {
    setCategoryTranslateX(prev => {
      const newTranslateX = prev - cardWidth;
      const minTranslateX = -(cardWidth * (getCategoryContent().length - itemsToShow));
      return Math.max(newTranslateX, minTranslateX);
    });
  };

  const getBadgeColor = (badge: string) => {
    switch (badge.toLowerCase()) {
      case "bestseller": return "bg-amber-500 text-white";
      case "new": return "bg-emerald-500 text-white";
      case "trending": return "bg-blue-500 text-white";
      case "discount": return "bg-red-500 text-white";
      case "popular": return "bg-blue-500 text-white";
      case "featured": return "bg-purple-500 text-white";
      case "limited": return "bg-red-500 text-white";
      case "gift set": return "bg-pink-500 text-white";
      case "handmade": return "bg-amber-600 text-white";
      case "premium": return "bg-indigo-600 text-white";
      default: return "bg-amber-500 text-white";
    }
  };

  const occasionCategories = [
    { icon: CakeSlice, name: t('occasions.birthday'), description: t('occasions.birthdayDesc'), gradient: "from-warm-red to-ethiopian-gold" },
    { icon: Heart, name: t('occasions.anniversary'), description: t('occasions.anniversaryDesc'), gradient: "from-warm-red to-deep-forest" },
    { icon: GraduationCap, name: t('occasions.graduation'), description: t('occasions.graduationDesc'), gradient: "from-ethiopian-gold to-amber-600" },
    { icon: Baby, name: t('occasions.newBaby'), description: t('occasions.newBabyDesc'), gradient: "from-deep-forest to-ethiopian-gold" },
    { icon: PartyPopper, name: t('occasions.wedding'), description: t('occasions.weddingDesc'), gradient: "from-pink-500 to-rose-600" },
    { icon: HomeIcon, name: t('occasions.housewarming'), description: t('occasions.housewarmingDesc'), gradient: "from-blue-500 to-indigo-600" },
    { icon: Users, name: t('occasions.familyReunion'), description: t('occasions.familyReunionDesc'), gradient: "from-green-500 to-teal-600" },
    { icon: Award, name: t('occasions.promotion'), description: t('occasions.promotionDesc'), gradient: "from-purple-500 to-violet-600" },
    { icon: Sparkles, name: t('occasions.retirement'), description: t('occasions.retirementDesc'), gradient: "from-orange-500 to-red-600" },
    { icon: Star, name: t('occasions.firstDaySchool'), description: t('occasions.firstDaySchoolDesc'), gradient: "from-cyan-500 to-blue-600" },
    { icon: Gift, name: t('occasions.engagement'), description: t('occasions.engagementDesc'), gradient: "from-rose-500 to-pink-600" },
    { icon: Coffee, name: t('occasions.jobInterview'), description: t('occasions.jobInterviewDesc'), gradient: "from-amber-600 to-yellow-600" }
  ];

  const culturalCategories = [
    { icon: Cross, name: t('cultural.meskel'), description: t('cultural.meskelDesc'), gradient: "from-ethiopian-gold to-warm-red" },
    { icon: Waves, name: t('cultural.timket'), description: t('cultural.timketDesc'), gradient: "from-blue-500 to-teal-500" },
    { icon: Star, name: t('cultural.gena'), description: t('cultural.genaDesc'), gradient: "from-warm-red to-ethiopian-gold" },
    { icon: Egg, name: t('cultural.fasika'), description: t('cultural.fasikaDesc'), gradient: "from-orange-400 to-amber-500" },
    { icon: Sun, name: t('cultural.enkutatash'), description: t('cultural.enkutatashDesc'), gradient: "from-yellow-400 to-orange-500" },
    { icon: Moon, name: t('cultural.eidFitr'), description: t('cultural.eidFitrDesc'), gradient: "from-green-500 to-emerald-600" },
    { icon: Mountain, name: t('cultural.eidAdha'), description: t('cultural.eidAdhaDesc'), gradient: "from-purple-500 to-indigo-600" },
    { icon: TreePine, name: t('cultural.irreechaa'), description: t('cultural.irreechaaDesc'), gradient: "from-green-600 to-lime-500" },
    { icon: Flower2, name: t('cultural.ashenda'), description: t('cultural.ashendaDesc'), gradient: "from-pink-500 to-rose-500" },
    { icon: Crown, name: t('cultural.adwaVictory'), description: t('cultural.adwaVictoryDesc'), gradient: "from-red-600 to-yellow-500" },
    { icon: Coffee, name: t('cultural.bunn'), description: t('cultural.bunnDesc'), gradient: "from-amber-700 to-orange-600" },
    { icon: Heart, name: t('cultural.sigd'), description: t('cultural.sigdDesc'), gradient: "from-blue-600 to-purple-600" }
  ];

  const emotionCategories = [
    { icon: Heart, name: t('emotions.loveRomance'), description: t('emotions.loveRomanceDesc'), gradient: "from-warm-red to-deep-forest" },
    { icon: Star, name: t('emotions.gratitude'), description: t('emotions.gratitudeDesc'), gradient: "from-ethiopian-gold to-warm-red" },
    { icon: HelpingHand, name: t('emotions.comfortSupport'), description: t('emotions.comfortSupportDesc'), gradient: "from-deep-forest to-ethiopian-gold" },
    { icon: Sparkles, name: t('emotions.celebration'), description: t('emotions.celebrationDesc'), gradient: "from-ethiopian-gold to-amber-600" },
    { icon: Smile, name: t('emotions.missYou'), description: t('emotions.missYouDesc'), gradient: "from-purple-500 to-pink-500" },
    { icon: ThumbsUp, name: t('emotions.congratulations'), description: t('emotions.congratulationsDesc'), gradient: "from-green-500 to-emerald-600" },
    { icon: Heart, name: t('emotions.getWellSoon'), description: t('emotions.getWellSoonDesc'), gradient: "from-blue-500 to-teal-500" },
    { icon: Gift, name: t('emotions.thinkingOfYou'), description: t('emotions.thinkingOfYouDesc'), gradient: "from-orange-400 to-amber-500" },
    { icon: Star, name: t('emotions.goodLuck'), description: t('emotions.goodLuckDesc'), gradient: "from-indigo-500 to-purple-600" },
    { icon: Sparkles, name: t('emotions.imSorry'), description: t('emotions.imSorryDesc'), gradient: "from-rose-500 to-red-500" },
    { icon: Coffee, name: t('emotions.justBecause'), description: t('emotions.justBecauseDesc'), gradient: "from-yellow-500 to-orange-500" },
    { icon: Heart, name: t('emotions.encouragement'), description: t('emotions.encouragementDesc'), gradient: "from-cyan-500 to-blue-600" }
  ];

  const customCategories = [
    { icon: PaintbrushVertical, name: t('custom.customPortrait'), description: t('custom.customPortraitDesc'), gradient: "from-ethiopian-gold to-deep-forest" },
    { icon: Shirt, name: t('custom.embroidery'), description: t('custom.embroideryDesc'), gradient: "from-warm-red to-ethiopian-gold" },
    { icon: Coffee, name: t('custom.woodCrafts'), description: t('custom.woodCraftsDesc'), gradient: "from-deep-forest to-warm-red" },
    { icon: Star, name: t('custom.customJewelry'), description: t('custom.customJewelryDesc'), gradient: "from-ethiopian-gold to-amber-600" },
    { icon: Palette, name: t('custom.paintedCeramics'), description: t('custom.paintedCeramicsDesc'), gradient: "from-blue-500 to-teal-600" },
    { icon: Gift, name: t('custom.personalizedBaskets'), description: t('custom.personalizedBasketsDesc'), gradient: "from-green-500 to-lime-600" },
    { icon: Music, name: t('custom.customSongs'), description: t('custom.customSongsDesc'), gradient: "from-purple-500 to-violet-600" },
    { icon: Camera, name: t('custom.photoAlbums'), description: t('custom.photoAlbumsDesc'), gradient: "from-orange-500 to-amber-600" },
    { icon: Heart, name: t('custom.loveLetters'), description: t('custom.loveLettersDesc'), gradient: "from-pink-500 to-rose-600" },
    { icon: Sparkles, name: t('custom.leatherGoods'), description: t('custom.leatherGoodsDesc'), gradient: "from-amber-700 to-orange-600" },
    { icon: Crown, name: t('custom.traditionalCrowns'), description: t('custom.traditionalCrownsDesc'), gradient: "from-yellow-500 to-gold" },
    { icon: Coffee, name: t('custom.coffeeAccessories'), description: t('custom.coffeeAccessoriesDesc'), gradient: "from-brown-600 to-amber-600" }
  ];

  const getCategoryContent = () => {
    switch (activeCategory) {
      case "cultural": return culturalCategories;
      case "emotions": return emotionCategories;
      case "custom": return customCategories;
      default: return occasionCategories;
    }
  };

  const testimonials = [
    {
      content: "Sending my grandmother her favorite coffee from home made her cry tears of joy. The video message feature let me see her reaction - it was priceless. Zembil brought us closer despite the distance.",
      name: "Sarah M.",
      location: "Toronto, Canada",
      rating: 5,
    },
    {
      content: "The custom embroidered Habesha kemis arrived perfectly on time for my daughter's graduation. The quality was exceptional and the personal touch made it extra meaningful.",
      name: "Michael T.",
      location: "Washington, DC",
      rating: 5,
    },
    {
      content: "Being able to send authentic berbere spices to my family during the holidays made them feel like I was cooking with them. The delivery was fast and everything arrived fresh.",
      name: "Hanan A.",
      location: "London, UK",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-light-cream">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-deep-forest to-ethiopian-gold text-white">
        {/* Ethiopian cultural pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10L40 30L30 50L20 30L30 10Z' fill='currentColor'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            {/* Content */}
            <div className="mb-12 lg:mb-0">
              <FadeIn delay={0.2} duration={0.8}>
                <h1 className="font-gotham-extra-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
                  {t('homepage.hero.title')}
                  <span className="text-amber block">{t('homepage.hero.subtitle')}</span>
                </h1>
              </FadeIn>
              <FadeIn delay={0.4} duration={0.8}>
                <p className="font-gotham-light text-xl sm:text-2xl mb-8 leading-relaxed opacity-90">
                  {t('homepage.hero.description')}
                </p>
              </FadeIn>
              
              {/* Search Bar */}
              <FadeIn delay={0.6} duration={0.8}>
                <div className="bg-white rounded-xl p-2 flex items-center shadow-xl max-w-md">
                  <Input 
                    type="text" 
                    placeholder={t('homepage.hero.searchPlaceholder')} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-3 text-charcoal placeholder-gray-500 bg-transparent border-none outline-none"
                  />
                  <Button className="bg-ethiopian-gold hover:bg-amber text-white px-6 py-3 rounded-lg">
                    <Search size={16} />
                  </Button>
                </div>
              </FadeIn>
              
              {/* Quick Stats */}
              <div className="flex items-center space-x-8 mt-8 text-sm">
                <div className="flex items-center space-x-2">
                  <Truck className="text-amber" size={16} />
                  <span>{t('homepage.hero.freeDelivery')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="text-amber" size={16} />
                  <span>{t('homepage.hero.happyRecipients')}</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <FadeIn delay={0.6} duration={0.8}>
              <div className="relative w-full h-full">
                <img 
                  src="/attached_assets/landing_page_img.png" 
                  alt="Ethiopian Gifts - Send Love Through Meaningful Gifts" 
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section id="occasions" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn delay={0.2} duration={0.8}>
            <div className="text-center mb-12">
              <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
                {t('homepage.categories.title')}
              </h2>
              <p className="font-gotham-light text-xl text-gray-600 max-w-2xl mx-auto">
                {t('homepage.categories.subtitle')}
              </p>
            </div>
          </FadeIn>

          {/* Category Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-light-cream border border-yellow-400/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm">
              {[
                { key: "occasions", label: t('homepage.categories.occasions') },
                { key: "cultural", label: t('homepage.categories.cultural') },
                { key: "emotions", label: t('homepage.categories.emotions') },
                { key: "custom", label: t('homepage.categories.custom') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`px-4 md:px-6 py-3 rounded-lg font-medium transition-all duration-200 text-xs md:text-sm ${
                    activeCategory === tab.key
                      ? "bg-yellow-400 text-green-800 hover:bg-yellow-400 shadow-md"
                      : "text-gray-600 hover:bg-white hover:text-yellow-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Content - All sections now use horizontal carousel */}
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex gap-4 md:gap-6 animate-scroll-horizontal"
                style={{
                  width: `${getCategoryContent().length * 320}px`,
                  animation: `scroll-horizontal ${Math.max(20, getCategoryContent().length * 2)}s linear infinite`
                }}
              >
                {[...getCategoryContent(), ...getCategoryContent()].map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <Link 
                      key={`${category.name}-${index}`} 
                      to={`/gifts/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex-shrink-0"
                    >
                      <div className="group cursor-pointer w-72">
                        <div className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg h-40 flex flex-col justify-center`}>
                          <div className="text-center">
                            <IconComponent size={32} className="mx-auto mb-4" />
                            <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                            <p className="text-sm opacity-90">{category.description}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Trending Gifts Carousel */}
      <section id="gifts" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
                {t('homepage.trending.title')}
              </h2>
              <p className="font-gotham-light text-xl text-gray-600">
                {t('homepage.trending.subtitle')}
              </p>
            </div>
            <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white">
              <Link to="/gifts">{t('homepage.trending.viewAll')}</Link>
            </Button>
          </div>

          {/* Budget Filter */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm font-medium text-gray-700">{t('homepage.trending.budget')}</span>
              <div className="flex flex-wrap gap-2">
                {budgetRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setSelectedBudget(range.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedBudget === range.id
                        ? "bg-ethiopian-gold text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Infinite Scroll Carousel Container with Navigation */}
          <div className="relative overflow-hidden group">
            {/* Left Navigation Arrow */}
            <button
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              aria-label="Previous gifts"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>

            {/* Right Navigation Arrow */}
            <button
              onClick={scrollRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              aria-label="Next gifts"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>

            <div 
              className="flex gap-6 transition-transform duration-300 ease-out"
              style={{ 
                transform: `translateX(${translateX}px)`,
                width: 'fit-content'
              }}
            >
              {duplicatedGifts.map((product, index) => (
                <div key={`${product.id}-${index}`} className="flex-shrink-0 w-72">
                  <ProductCard 
                    product={product}
                    className="w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile View All Button */}
          <div className="text-center mt-6 md:hidden">
            <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white">
              <Link to="/gifts">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Find Gifts For Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
              {t('homepage.recipients.title')}
            </h2>
            <p className="font-gotham-light text-xl text-gray-600">
              {t('homepage.recipients.subtitle')}
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6" staggerDelay={0.1}>
            {giftRecipients.map((recipient) => {
              const IconComponent = recipient.icon;
              return (
                <StaggerItem key={recipient.id}>
                  <Link
                    to={`/gifts?recipient=${recipient.id}`}
                    className="group"
                  >
                    <Card className="text-center p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                      <CardContent className="p-0">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${recipient.color}`}>
                          <IconComponent size={24} />
                        </div>
                        <h3 className="font-semibold text-charcoal mb-2">{recipient.name}</h3>
                        <p className="text-sm text-gray-500">{t('homepage.recipients.perfectFor')} {recipient.name.toLowerCase()}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Global Diaspora & Personalized Message */}
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



      {/* Subscription & Loyalty Banner */}
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

      {/* Personalization Features */}
      <section id="custom" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
              {t('homepage.features.title')}
            </h2>
            <p className="font-gotham-light text-xl text-gray-600 max-w-2xl mx-auto">
              {t('homepage.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Video Messages */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-warm-red to-sunset-orange w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Video className="text-white" size={24} />
              </div>
              <h3 className="font-gotham-bold text-xl text-charcoal mb-4">{t('homepage.features.videoMessages.title')}</h3>
              <p className="font-gotham-light text-gray-600 mb-6">{t('homepage.features.videoMessages.description')}</p>
              <button className="text-ethiopian-gold hover:text-amber font-gotham-medium transition-colors duration-200">
                {t('homepage.features.videoMessages.learnMore')}
              </button>
            </div>

            {/* Custom Requests */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-ethiopian-gold to-amber w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <PaintbrushVertical className="text-white" size={24} />
              </div>
              <h3 className="font-gotham-bold text-xl text-charcoal mb-4">{t('homepage.features.customOrders.title')}</h3>
              <p className="font-gotham-light text-gray-600 mb-6">{t('homepage.features.customOrders.description')}</p>
              <button className="text-ethiopian-gold hover:text-amber font-gotham-medium transition-colors duration-200">
                {t('homepage.features.customOrders.learnMore')}
              </button>
            </div>

            {/* Premium Delivery */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-deep-forest to-sky-blue w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Star className="text-white" size={24} />
              </div>
              <h3 className="font-gotham-bold text-xl text-charcoal mb-4">{t('homepage.features.influencerDelivery.title')}</h3>
              <p className="font-gotham-light text-gray-600 mb-6">{t('homepage.features.influencerDelivery.description')}</p>
              <button className="text-ethiopian-gold hover:text-amber font-gotham-medium transition-colors duration-200">
                {t('homepage.features.influencerDelivery.learnMore')}
              </button>
            </div>
          </div>

          {/* Call-to-Action */}
          <div id="track" className="bg-gradient-to-r from-deep-forest to-ethiopian-gold rounded-2xl p-8 mt-12 text-white text-center">
            <h3 className="font-gotham-extra-bold text-2xl mb-4">{t('homepage.cta.title')}</h3>
            <p className="font-gotham-light text-lg mb-6 opacity-90">{t('homepage.cta.subtitle')}</p>
            <Button asChild className="bg-white text-deep-forest hover:bg-gray-100">
              <a href="/api/login">{t('homepage.cta.button')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-light-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl font-bold text-soft-gray mb-4">
              {t('homepage.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('homepage.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 shadow-lg">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    <div className="flex text-ethiopian-gold">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                    <div>
                      <h4 className="font-semibold text-soft-gray">{testimonial.name}</h4>
                      <p className="text-gray-600 text-sm">{testimonial.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Chat Button */}
      <LiveChatButton />
    </div>
  );
}
