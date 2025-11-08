import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CakeSlice, 
  Heart, 
  GraduationCap, 
  Baby, 
  Users, 
  Home as HomeIcon,
  ArrowRight 
} from "lucide-react";

export default function Occasions() {
  const occasions = [
    {
      slug: "birthday",
      name: "Birthday",
      description: "Make every year memorable with thoughtful birthday gifts",
      icon: CakeSlice,
      gradient: "from-warm-red to-ethiopian-gold",
      stats: "50+ gifts"
    },
    {
      slug: "anniversary",
      name: "Anniversary",
      description: "Celebrate love and milestones with meaningful presents",
      icon: Heart,
      gradient: "from-warm-red to-deep-forest",
      stats: "35+ gifts"
    },
    {
      slug: "graduation",
      name: "Graduation",
      description: "Honor achievements and new beginnings",
      icon: GraduationCap,
      gradient: "from-ethiopian-gold to-amber-600",
      stats: "25+ gifts"
    },
    {
      slug: "new-baby",
      name: "New Baby",
      description: "Welcome precious little ones with blessing gifts",
      icon: Baby,
      gradient: "from-deep-forest to-ethiopian-gold",
      stats: "30+ gifts"
    },
    {
      slug: "wedding",
      name: "Wedding",
      description: "Bless new unions with traditional ceremony gifts",
      icon: Users,
      gradient: "from-ethiopian-gold to-warm-red",
      stats: "40+ gifts"
    },
    {
      slug: "housewarming",
      name: "Housewarming",
      description: "Bring prosperity and joy to new homes",
      icon: HomeIcon,
      gradient: "from-deep-forest to-ethiopian-gold",
      stats: "20+ gifts"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-ethiopian-gold">Home</Link>
            <span>›</span>
            <span className="text-ethiopian-gold">Occasions</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal mb-6">
            Special Occasions
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl">
            Every moment deserves to be celebrated. Find the perfect gift for life's 
            most meaningful occasions and create lasting memories with your loved ones.
          </p>
        </div>

        {/* Occasions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {occasions.map((occasion) => {
            const IconComponent = occasion.icon;
            
            return (
              <Link key={occasion.slug} to={`/occasions/${occasion.slug}`}>
                <Card className="group cursor-pointer border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className={`bg-gradient-to-br ${occasion.gradient} p-8 text-white relative overflow-hidden`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full border-2 border-white"></div>
                      <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <IconComponent size={48} className="flex-shrink-0" />
                        <ArrowRight size={24} className="opacity-75 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3">
                        {occasion.name}
                      </h3>
                      
                      <p className="text-white/90 leading-relaxed mb-4">
                        {occasion.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80 font-medium">
                          {occasion.stats}
                        </span>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="bg-white/20 text-white hover:bg-white/30 border-0"
                        >
                          Browse
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Feature Section */}
        <div className="mt-16 bg-white rounded-3xl shadow-lg p-8 lg:p-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal mb-4">
              Why Choose goZembil for Occasions?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We understand that every occasion is unique and deserves a special touch 
              that reflects your care and cultural connection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={32} className="text-ethiopian-gold" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Culturally Authentic</h3>
              <p className="text-gray-600">
                Every gift reflects genuine Ethiopian traditions and cultural significance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-ethiopian-gold" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Perfect Timing</h3>
              <p className="text-gray-600">
                Reliable delivery ensures your gifts arrive exactly when they're needed most.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap size={32} className="text-ethiopian-gold" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Meaningful Selection</h3>
              <p className="text-gray-600">
                Curated gifts that tell a story and create lasting emotional connections.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-deep-forest to-ethiopian-gold rounded-3xl p-8 lg:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Can't Find the Perfect Occasion?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Browse our complete gift collection or create a custom order 
              tailored to your specific celebration needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/gifts">
                <Button 
                  size="lg" 
                  className="bg-white text-deep-forest hover:bg-gray-100 min-w-[160px]"
                >
                  All Gifts
                </Button>
              </Link>
              <Link to="/custom-orders">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-deep-forest min-w-[160px]"
                >
                  Custom Orders
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}