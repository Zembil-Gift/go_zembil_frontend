import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselSlide {
  id: number;
  image: string;
  alt: string;
  title?: string;
  description?: string;
}

const slides: CarouselSlide[] = [
  {
    id: 1,
    image: "/attached_assets/goZe1_1752988502434.png",
    alt: "Traditional Ethiopian coffee ceremony set with woven baskets and cultural items",
    title: "Authentic Ethiopian Gifts",
    description: "Traditional handcrafted items that tell a story"
  },
  {
    id: 2,
    image: "/attached_assets/goZem3_1752988506245.png", 
    alt: "Diaspora connection illustration showing Washington D.C. to Addis Ababa gift delivery",
    title: "Diaspora Connection",
    description: "Bridging hearts across continents with meaningful gifts"
  },
  {
    id: 3,
    image: "/attached_assets/goZem2_1752988521788.png",
    alt: "Happy Ethiopian family receiving goZembil gift delivery",
    title: "Gifting with Heart",
    description: "Bringing smiles and connection to families everywhere"
  }
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div 
      className="relative w-full h-full bg-gradient-to-br from-green-100 via-yellow-50 to-amber-100 rounded-2xl overflow-hidden shadow-lg border border-green-200/50"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Image Container */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].alt}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} className="text-gray-700" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
          aria-label="Next slide"
        >
          <ChevronRight size={18} className="text-gray-700" />
        </Button>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-white shadow-md scale-110"
                  : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Optional slide title overlay (can be enabled if needed) */}
        {false && slides[currentSlide].title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute bottom-16 left-6 right-6"
          >
            <h3 className="text-white text-xl font-semibold mb-2 drop-shadow-lg">
              {slides[currentSlide].title}
            </h3>
            <p className="text-white/90 text-sm drop-shadow-md">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        )}
      </div>

      {/* Hover group class for navigation arrows */}
      <div className="absolute inset-0 group" />
    </div>
  );
}