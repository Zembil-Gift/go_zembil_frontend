import React from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  content: string;
  name: string;
  location: string;
  rating: number;
}

export default function TestimonialsSection() {
  const { t } = useTranslation();

  const testimonials: Testimonial[] = [
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
  );
} 