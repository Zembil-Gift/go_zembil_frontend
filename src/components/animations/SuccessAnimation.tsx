import { motion } from "framer-motion";
import { CheckCircle, Heart, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import GiftingHeartAnimation from "./GiftingHeartAnimation";

interface SuccessAnimationProps {
  title?: string;
  message?: string;
  showContinueButton?: boolean;
  continueLink?: string;
  className?: string;
}

export default function SuccessAnimation({ 
  title = "Order Successful!",
  message = "Your gift has been sent with love",
  showContinueButton = true,
  continueLink = "/",
  className = ""
}: SuccessAnimationProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 relative overflow-hidden ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 10L35 25L25 40L15 25L25 10Z' fill='%2322C55E'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>

      {/* Success Animation Container */}
      <motion.div
        className="text-center relative z-10 max-w-2xl mx-auto px-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Success Icon with Animation */}
        <motion.div
          className="mb-8 relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <div className="relative inline-block">
            {/* Outer glow effect */}
            <motion.div
              className="absolute inset-0 bg-green-400 rounded-full opacity-20 scale-150"
              animate={{ scale: [1.5, 1.8, 1.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Main success icon */}
            <CheckCircle 
              size={80} 
              className="text-green-500 relative z-10" 
            />
            
            {/* Sparkle effects around the icon */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 60}deg) translateX(60px)`
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ 
                  delay: 1 + i * 0.1, 
                  duration: 1.5, 
                  repeat: Infinity, 
                  repeatDelay: 2 
                }}
              >
                <Sparkles size={16} className="text-yellow-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6">
            {message}
          </p>
          <div className="flex items-center justify-center space-x-2 text-warm-gold">
            <Heart size={20} className="text-warm-red" />
            <span className="font-medium">Gifting with Heart</span>
            <Heart size={20} className="text-warm-red" />
          </div>
        </motion.div>

        {/* Celebration Animation */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <GiftingHeartAnimation 
            size="medium" 
            showText={false}
            className="max-w-md mx-auto"
          />
        </motion.div>

        {/* Action Buttons */}
        {showContinueButton && (
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-ethiopian-gold hover:bg-yellow-600 text-white text-lg px-8 py-4 rounded-xl font-semibold"
            >
              <Link href={continueLink}>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue Shopping
                </motion.span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-white text-lg px-8 py-4 rounded-xl font-semibold"
            >
              <Link href="/orders">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Track Order
                </motion.span>
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Share the Love Message */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your thoughtful gift will bring joy and keep Ethiopian traditions alive. 
            Thank you for spreading love across distances!
          </p>
        </motion.div>
      </motion.div>

      {/* Floating Gift Icons */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-green-300 opacity-30"
          style={{
            top: `${20 + (i * 15)}%`,
            left: `${10 + (i * 15)}%`,
          }}
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 4 + i, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: i * 0.5
          }}
        >
          <Gift size={24} />
        </motion.div>
      ))}

      {/* Confetti Effect */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ['#FDCB2D', '#E94E1B', '#1C3A2D', '#22C55E'][i % 4],
            top: `${Math.random() * 20}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{ 
            y: [0, 100],
            x: [0, Math.random() * 100 - 50],
            opacity: [1, 0],
            scale: [1, 0]
          }}
          transition={{ 
            duration: 3 + Math.random() * 2, 
            repeat: Infinity, 
            ease: "easeOut",
            delay: Math.random() * 3
          }}
        />
      ))}
    </div>
  );
}