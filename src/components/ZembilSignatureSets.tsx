import { motion } from "framer-motion";

export default function ZembilSignatureSets() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-june-bud/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - exactly like reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-gotham-bold text-eagle-green mb-4 tracking-wider uppercase">
            GIFTING WITH HEART – <span className="text-viridian-green">goZEMBIL</span> SIGNATURE SETS
          </h2>
        </motion.div>

        {/* Three circular lifestyle images - responsive design */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 lg:gap-12 mb-16">
          {[
            {
              id: 1,
              image: "/attached_assets/customOrderForGoZem.png",
              alt: "Custom Orders - Personalized handcrafted gifts made with love",
              category: "Custom Orders"
            },
            {
              id: 2,
              image: "/attached_assets/BongaForestCoffeGoZem.png",
              alt: "Occasions - Traditional Ethiopian coffee ceremony and celebration gifts",
              category: "Occasions"
            },
            {
              id: 3,
              image: "/attached_assets/goZemAddeyAbeba.png",
              alt: "Cultural & Religious - Authentic Ethiopian cultural and religious items",
              category: "Cultural & Religious"
            }
          ].map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 mb-4">
                <img
                  src={item.image}
                  alt={item.alt}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-eagle-green/30 via-transparent to-viridian-green/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-june-bud/40 rounded-full transition-all duration-300" />
              </div>
              <span className="text-sm font-gotham-bold text-eagle-green/70 group-hover:text-viridian-green transition-colors duration-300 text-center">
                {item.category}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Narrative text - styled like reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          <p className="text-base sm:text-lg text-eagle-green/80 leading-relaxed font-gotham-light max-w-4xl mx-auto">
            Celebrate every occasion with heart and heritage. <span className="font-gotham-bold text-viridian-green">goZembil</span> Signature Sets feature authentic, handpicked gifts inspired by Ethiopian culture — from woven baskets and coffee to books, spices, and netela. Perfect for reconnecting families, surprising loved ones, or sending your roots in a box. Every Zembil carries a story.
          </p>
        </motion.div>
      </div>
    </section>
  );
}