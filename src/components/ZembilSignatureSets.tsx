import { motion } from "framer-motion";

export default function ZembilSignatureSets() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - exactly like reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-wider uppercase">
            GIFTING WITH HEART – ZEMBIL SIGNATURE SETS
          </h2>
        </motion.div>

        {/* Three circular lifestyle images - exactly like reference */}
        <div className="flex justify-center items-center gap-8 mb-16">
          {[
            {
              id: 1,
              image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
              alt: "Ethiopian traditional coffee ceremony with hands preparing coffee beans"
            },
            {
              id: 2,
              image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
              alt: "Traditional Ethiopian textiles and jewelry being worn"
            },
            {
              id: 3,
              image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
              alt: "Hands showcasing Ethiopian handcrafted jewelry and accessories"
            }
          ].map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative w-48 h-48 rounded-full overflow-hidden group shadow-lg"
            >
              <img
                src={item.image}
                alt={item.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
          <p className="text-base text-gray-600 leading-relaxed font-light">
            Celebrate every occasion with heart and heritage. goZembil Signature Sets feature authentic, handpicked gifts inspired by Ethiopian culture — from woven baskets and coffee to books, spices, and netela. Perfect for reconnecting families, surprising loved ones, or sending your roots in a box. Every Zembil carries a story.
          </p>
        </motion.div>
      </div>
    </section>
  );
}