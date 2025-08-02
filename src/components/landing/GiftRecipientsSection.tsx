import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Award, Users, Baby, User } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";

interface GiftRecipient {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  description: string;
}

export default function GiftRecipientsSection() {
  const { t } = useTranslation();

  const giftRecipients: GiftRecipient[] = [
    { 
      id: "mom", 
      name: t('homepage.recipients.mom'), 
      icon: Heart, 
      gradient: "from-pink-400 to-rose-500",
      description: "Show your love and appreciation"
    },
    { 
      id: "dad", 
      name: t('homepage.recipients.dad'), 
      icon: Award, 
      gradient: "from-blue-400 to-indigo-500",
      description: "Celebrate his achievements"
    },
    { 
      id: "friends", 
      name: t('homepage.recipients.friends'), 
      icon: Users, 
      gradient: "from-green-400 to-emerald-500",
      description: "Strengthen your friendship"
    },
    { 
      id: "kids", 
      name: t('homepage.recipients.kids'), 
      icon: Baby, 
      gradient: "from-yellow-400 to-amber-500",
      description: "Make them smile with joy"
    },
    { 
      id: "couples", 
      name: t('homepage.recipients.couples'), 
      icon: Heart, 
      gradient: "from-red-400 to-pink-500",
      description: "Express your deep affection"
    },
    { 
      id: "colleagues", 
      name: t('homepage.recipients.colleagues'), 
      icon: User, 
      gradient: "from-purple-400 to-violet-500",
      description: "Build professional relationships"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
            {t('homepage.recipients.title')}
          </h2>
          <p className="font-gotham-light text-xl text-gray-600 max-w-2xl mx-auto">
            {t('homepage.recipients.subtitle')}
          </p>
        </div>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6" staggerDelay={0.1}>
          {giftRecipients.map((recipient) => {
            const IconComponent = recipient.icon;
            return (
              <StaggerItem key={recipient.id}>
                <Link
                  to={`/gifts/${recipient.id}`}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105 border border-gray-100">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${recipient.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* Content */}
                    <div className="relative p-6 text-center">
                      {/* Icon Container */}
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${recipient.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                        <IconComponent size={28} className="text-white" />
                      </div>
                      
                      {/* Text Content */}
                      <div className="space-y-2">
                        <h3 className="font-gotham-bold text-lg text-gray-900 group-hover:text-gray-800 transition-colors">
                          {recipient.name}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {recipient.description}
                        </p>
                      </div>
                      
                      {/* Hover Indicator */}
                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className={`w-8 h-1 mx-auto rounded-full bg-gradient-to-r ${recipient.gradient}`} />
                      </div>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
} 