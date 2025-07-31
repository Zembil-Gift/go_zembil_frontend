import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import GoZembilLogo from "@/components/GoZembilLogo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, Users, Truck, Star, ArrowRight } from "lucide-react";
import FadeIn from "@/components/animations/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";

export default function About() {
  const founders = [
    {
      name: "Rekik",
      location: "USA",
      description: "Tech enthusiast"
    },
    {
      name: "Amanuel", 
      location: "USA",
      description: "Tech enthusiast"
    },
    {
      name: "Abel",
      location: "Addis Ababa",
      description: "Co-founder"
    }
  ];

  const values = [
    {
      icon: Heart,
      title: "Cultural Authenticity",
      description: "Every product reflects genuine Ethiopian traditions, crafted by local artisans who understand the cultural significance behind each piece."
    },
    {
      icon: Users,
      title: "Community Connection",
      description: "We bridge distances by strengthening bonds between Ethiopian diaspora communities and their loved ones back home."
    },
    {
      icon: Truck,
      title: "Reliable Delivery",
      description: "Our trusted network ensures your heartfelt gifts arrive safely and on time, carrying your love across any distance."
    },
    {
      icon: Star,
      title: "Quality Assurance",
      description: "Each item is carefully selected and quality-checked to ensure it meets our high standards for cultural significance and craftsmanship."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <FadeIn duration={0.8} className="text-center mb-16">
          <div className="flex flex-col items-center mb-6">
            <GoZembilLogo size="xl" className="mb-4" />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Connecting hearts across distances through meaningful Ethiopian gifts, 
            one zembil at a time.
          </p>
        </FadeIn>

        {/* What is a Zembil Section */}
        <FadeIn delay={0.2} duration={0.8} className="mb-16">
          <Card className="bg-gradient-to-r from-ethiopian-gold/10 to-deep-forest/10 border-0 shadow-lg">
            <CardContent className="p-8 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-ethiopian-gold text-white mb-4">Cultural Heritage</Badge>
                  <h2 className="text-3xl font-bold text-charcoal mb-6">
                    What is a Zembil?
                  </h2>
                  <div className="space-y-4 text-gray-600 leading-relaxed">
                    <p>
                      A <strong className="text-charcoal">zembil</strong> (ዘንቢል) is a traditional Ethiopian woven basket, 
                      handcrafted from natural materials like grass and palm leaves. For centuries, 
                      these beautiful baskets have been an integral part of Ethiopian culture.
                    </p>
                    <p>
                      More than just a container, the zembil represents <strong className="text-charcoal">sustainability</strong>, 
                      <strong className="text-charcoal"> community</strong>, and <strong className="text-charcoal">cultural heritage</strong>. 
                      Ethiopian families use zembils for everything from storing precious grains to carrying gifts to neighbors, 
                      symbolizing the interconnectedness of community life.
                    </p>
                    <p>
                      At <span className="text-deep-forest font-bold">go</span><span className="text-zembil-brown font-bold">Zembil</span>, we've chosen this name to honor the tradition of sharing and caring that 
                      the zembil represents. Just as these baskets carry life's essentials, we carry your 
                      love and thoughtfulness to your family and friends in Ethiopia.
                    </p>
                    <div className="mt-6 p-4 bg-gradient-to-r from-go-green/10 to-zembil-beige/10 rounded-lg">
                      <p className="text-center font-medium italic" style={{ color: '#CD853F' }}>
                        "Gifting with Heart"
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-ethiopian-gold to-deep-forest rounded-2xl p-8 flex items-center justify-center">
                    <svg 
                      viewBox="0 0 200 200" 
                      className="w-full h-full text-white"
                      fill="currentColor"
                    >
                      {/* Stylized zembil basket SVG */}
                      <path d="M100 20C80 20 60 30 50 50L50 150C50 170 70 180 100 180C130 180 150 170 150 150L150 50C140 30 120 20 100 20Z" 
                            opacity="0.3"/>
                      <path d="M60 60L140 60M60 80L140 80M60 100L140 100M60 120L140 120M60 140L140 140" 
                            stroke="currentColor" strokeWidth="3" fill="none"/>
                      <circle cx="100" cy="40" r="8" opacity="0.8"/>
                      <text x="100" y="195" textAnchor="middle" fontSize="12" opacity="0.8">ዘንቢል</text>
                    </svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Our Story Section */}
        <FadeIn delay={0.4} duration={0.8} className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-charcoal mb-6">Our Story</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Born from the longing to stay connected with home
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart size={32} className="text-ethiopian-gold" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-3">The Need</h3>
                <p className="text-gray-600">
                  Ethiopian diaspora communities struggled to send authentic, meaningful gifts 
                  to their loved ones back home, missing important occasions and celebrations.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift size={32} className="text-ethiopian-gold" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-3">The Solution</h3>
                <p className="text-gray-600">
                  We created a platform that bridges this gap, offering curated Ethiopian cultural 
                  items, custom handmade pieces, and reliable delivery services.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-ethiopian-gold" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-3">The Impact</h3>
                <p className="text-gray-600">
                  Today, we've reconnected thousands of families and friends, helping maintain 
                  cultural traditions and emotional bonds across continents.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Our Values Section */}
        <FadeIn delay={0.6} duration={0.8} className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal mb-6">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8" staggerDelay={0.1}>
            {values.map((value, index) => (
              <StaggerItem key={value.title}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <value.icon size={24} className="text-ethiopian-gold" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-charcoal mb-3">{value.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>

        {/* Team Section */}
        <FadeIn delay={0.8} duration={0.8} className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal mb-6">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Passionate individuals dedicated to preserving Ethiopian culture
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="text-center hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
                <CardContent className="p-8 lg:p-12">
                  {/* Team Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-ethiopian-gold/20 to-deep-forest/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Users size={32} className="text-deep-forest" />
                  </div>
                  
                  {/* Founders */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {founders.map((founder, index) => (
                      <motion.div
                        key={founder.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        className="text-center"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-ethiopian-gold/10 to-deep-forest/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl font-bold text-deep-forest">{founder.name[0]}</span>
                        </div>
                        <h3 className="text-xl font-bold text-charcoal mb-1">{founder.name}</h3>
                        <p className="text-ethiopian-gold font-medium mb-2">{founder.description}</p>
                        <p className="text-gray-600 text-sm">{founder.location}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Team Description */}
                  <div className="bg-gradient-to-r from-ethiopian-gold/5 to-deep-forest/5 rounded-2xl p-6 border border-ethiopian-gold/10">
                    <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                      We are three passionate friends and first-time startup founders, building a platform that connects diaspora communities with home. More innovative ideas coming soon!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </FadeIn>

        {/* CTA Section */}
        <FadeIn delay={1.0} duration={0.8} className="text-center">
          <Card className="bg-gradient-to-r from-ethiopian-gold to-deep-forest text-white border-0">
            <CardContent className="p-8 lg:p-12">
              <h2 className="text-3xl font-bold mb-6">Ready to Send Love?</h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Join thousands of families who trust <span className="text-white font-bold">go</span><span className="text-white font-bold">Zembil</span> to deliver their most heartfelt gifts 
                and maintain their cultural connections.
              </p>
              <Link 
                to="/gifts"
                className="inline-flex items-center bg-white text-charcoal px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Shopping
                <ArrowRight size={20} className="ml-2" />
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </main>
    </div>
  );
}