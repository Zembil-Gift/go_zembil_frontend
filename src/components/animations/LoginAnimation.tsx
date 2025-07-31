import { motion } from "framer-motion";
import GiftingHeartAnimation from "./GiftingHeartAnimation";

interface LoginAnimationProps {
  className?: string;
}

export default function LoginAnimation({ className = "" }: LoginAnimationProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-cream to-gray-50 ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 5L30 20L20 35L10 20L20 5Z' fill='%23FDCB2D'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>

      {/* Main Animation Container */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Welcome Message */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-2">
            Welcome to goZembil
          </h2>
          <p className="text-lg text-warm-gold font-medium">
            Gifting with Heart
          </p>
        </motion.div>

        {/* Central Animation */}
        <GiftingHeartAnimation 
          size="medium" 
          showText={false}
          className="mb-8"
        />

        {/* Loading Animation */}
        <motion.div
          className="flex items-center justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <motion.div
            className="w-3 h-3 bg-ethiopian-gold rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-3 h-3 bg-warm-red rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-3 h-3 bg-deep-forest rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </motion.div>

        <motion.p
          className="text-gray-500 mt-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          Connecting hearts across distances...
        </motion.p>
      </motion.div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-8 h-8 bg-ethiopian-gold rounded-full opacity-20"
        animate={{ 
          y: [0, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-32 right-16 w-6 h-6 bg-warm-red rounded-full opacity-20"
        animate={{ 
          y: [0, 10, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-4 h-4 bg-deep-forest rounded-full opacity-20"
        animate={{ 
          y: [0, -8, 0],
          x: [0, 5, 0],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </div>
  );
}