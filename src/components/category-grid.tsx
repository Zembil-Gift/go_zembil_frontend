import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CakeSlice, 
  Heart, 
  GraduationCap, 
  Baby, 
  Cross, 
  Waves, 
  Star, 
  Egg,
  Gift,
  PaintbrushVertical,
  Coffee
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
}

export default function CategoryGrid() {
  const [activeTab, setActiveTab] = useState("occasions");

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Icon mapping for categories
  const getIconForCategory = (name: string, type: string) => {
    const nameKey = name.toLowerCase();
    
    if (type === "occasion") {
      if (nameKey.includes("birthday")) return CakeSlice;
      if (nameKey.includes("anniversary")) return Heart;
      if (nameKey.includes("graduation")) return GraduationCap;
      if (nameKey.includes("baby")) return Baby;
    }
    
    if (type === "cultural") {
      if (nameKey.includes("meskel")) return Cross;
      if (nameKey.includes("timket")) return Waves;
      if (nameKey.includes("gena")) return Star;
      if (nameKey.includes("fasika")) return Egg;
    }
    
    if (type === "emotion") {
      return Heart;
    }
    
    if (type === "custom") {
      if (nameKey.includes("portrait")) return PaintbrushVertical;
      if (nameKey.includes("embroidery")) return Gift;
      if (nameKey.includes("epoxy")) return Star;
      if (nameKey.includes("wood")) return Coffee;
      return PaintbrushVertical;
    }
    
    return Gift;
  };

  // Gradient mapping for categories
  const getGradientForCategory = (name: string, type: string) => {
    const nameKey = name.toLowerCase();
    
    if (type === "occasion") {
      if (nameKey.includes("birthday")) return "from-sunset-orange to-warm-red";
      if (nameKey.includes("anniversary")) return "from-warm-red to-deep-forest";
      if (nameKey.includes("graduation")) return "from-ethiopian-gold to-amber";
      if (nameKey.includes("baby")) return "from-sky-blue to-deep-forest";
    }
    
    if (type === "cultural") {
      if (nameKey.includes("meskel")) return "from-ethiopian-gold to-sunset-orange";
      if (nameKey.includes("timket")) return "from-sky-blue to-deep-forest";
      if (nameKey.includes("gena")) return "from-warm-red to-ethiopian-gold";
      if (nameKey.includes("fasika")) return "from-sunset-orange to-deep-forest";
    }
    
    if (type === "emotion") {
      return "from-warm-red to-sunset-orange";
    }
    
    if (type === "custom") {
      return "from-ethiopian-gold to-amber";
    }
    
    return "from-ethiopian-gold to-amber";
  };

  // Filter categories by active tab
  const getFilteredCategories = () => {
    const typeMap: { [key: string]: string } = {
      "occasions": "occasion",
      "cultural": "cultural",
      "emotions": "emotion",
      "custom": "custom"
    };
    
    return categories.filter((category: Category) => 
      category.type === typeMap[activeTab]
    );
  };

  const tabs = [
    { key: "occasions", label: "Occasions" },
    { key: "cultural", label: "Cultural & Religious" },
    { key: "emotions", label: "Emotions" },
    { key: "custom", label: "Custom Orders" },
  ];

  const filteredCategories = getFilteredCategories();

  return (
    <div>
      {/* Category Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-light-cream border border-ethiopian-gold/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              variant="ghost"
              className={`px-4 md:px-6 py-3 rounded-lg font-medium transition-all duration-200 text-xs md:text-sm ${
                activeTab === tab.key
                  ? "bg-ethiopian-gold text-deep-forest hover:bg-ethiopian-gold shadow-md"
                  : "text-soft-gray hover:bg-white hover:text-ethiopian-gold"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category: Category) => {
            const IconComponent = getIconForCategory(category.name, category.type);
            const gradient = getGradientForCategory(category.name, category.type);
            
            const linkPath = category.type === 'occasion' ? `/occasions/${category.slug}` : `/gifts/${category.slug}`;
            
            return (
              <Link key={category.id} to={linkPath}>
                <div className="group cursor-pointer">
                  <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg`}>
                    <div className="text-center">
                      <IconComponent size={28} className="mx-auto mb-3 md:mb-4" />
                      <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-xs md:text-sm opacity-90 line-clamp-2">{category.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          // Fallback when no categories are loaded - show default content for each tab
          <>
            {activeTab === "occasions" && (
              <>
                <Link to="/occasions/birthday">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-warm-red to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <CakeSlice size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Birthday</h3>
                        <p className="text-xs md:text-sm opacity-90">Celebrate another year</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/occasions/anniversary">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-warm-red to-deep-forest rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Heart size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Anniversary</h3>
                        <p className="text-xs md:text-sm opacity-90">Love & milestones</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/occasions/graduation">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <GraduationCap size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Graduation</h3>
                        <p className="text-xs md:text-sm opacity-90">Achievement celebration</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/occasions/new-baby">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-deep-forest to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Baby size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">New Baby</h3>
                        <p className="text-xs md:text-sm opacity-90">Welcome little ones</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {activeTab === "cultural" && (
              <>
                <Link to="/gifts/meskel">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-warm-red rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Cross size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Meskel</h3>
                        <p className="text-xs md:text-sm opacity-90">Finding of the True Cross</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/timket">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-deep-forest to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Waves size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Timket</h3>
                        <p className="text-xs md:text-sm opacity-90">Ethiopian Epiphany</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/gena">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-warm-red to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Star size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Gena</h3>
                        <p className="text-xs md:text-sm opacity-90">Ethiopian Christmas</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/fasika">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-deep-forest rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Egg size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Fasika</h3>
                        <p className="text-xs md:text-sm opacity-90">Ethiopian Easter</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {activeTab === "emotions" && (
              <>
                <Link to="/gifts/love">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-warm-red to-deep-forest rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Heart size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Love & Romance</h3>
                        <p className="text-xs md:text-sm opacity-90">Express your feelings</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/gratitude">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-warm-red rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Star size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Gratitude</h3>
                        <p className="text-xs md:text-sm opacity-90">Say thank you</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/comfort">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-deep-forest to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Heart size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Comfort & Support</h3>
                        <p className="text-xs md:text-sm opacity-90">Send encouragement</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/celebration">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Star size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Celebration</h3>
                        <p className="text-xs md:text-sm opacity-90">Share the joy</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {activeTab === "custom" && (
              <>
                <Link to="/gifts/custom-portrait">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-deep-forest rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <PaintbrushVertical size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Custom Portrait</h3>
                        <p className="text-xs md:text-sm opacity-90">Personalized artwork</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/custom-embroidery">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-warm-red to-ethiopian-gold rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Gift size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Embroidery</h3>
                        <p className="text-xs md:text-sm opacity-90">Traditional handwork</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/custom-wood">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-deep-forest to-warm-red rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Coffee size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Wood Crafts</h3>
                        <p className="text-xs md:text-sm opacity-90">Handmade woodwork</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/gifts/custom-jewelry">
                  <div className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-2xl p-4 md:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-center">
                        <Star size={28} className="mx-auto mb-3 md:mb-4" />
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2">Custom Jewelry</h3>
                        <p className="text-xs md:text-sm opacity-90">Unique accessories</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
