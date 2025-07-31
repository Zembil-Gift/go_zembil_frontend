import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

// Animation variants
const fadeVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const slideVariants = {
  slideInFromRight: {
    initial: { x: "100%", opacity: 0 },
    in: { x: 0, opacity: 1 },
    out: { x: "-100%", opacity: 0 },
  },
  slideInFromLeft: {
    initial: { x: "-100%", opacity: 0 },
    in: { x: 0, opacity: 1 },
    out: { x: "100%", opacity: 0 },
  },
  slideInFromBottom: {
    initial: { y: "100%", opacity: 0 },
    in: { y: 0, opacity: 1 },
    out: { y: "-100%", opacity: 0 },
  },
  slideInFromTop: {
    initial: { y: "-100%", opacity: 0 },
    in: { y: 0, opacity: 1 },
    out: { y: "100%", opacity: 0 },
  },
};

const scaleVariants = {
  initial: { scale: 0.8, opacity: 0 },
  in: { scale: 1, opacity: 1 },
  out: { scale: 1.1, opacity: 0 },
};

// Enhanced page transition with router integration
export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          type: "tween",
          ease: [0.4, 0.0, 0.2, 1], // Custom easing curve
          duration: 0.5,
        }}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Individual component transition wrapper
interface TransitionWrapperProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  variant?: 'fade' | 'slide' | 'scale';
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function TransitionWrapper({ 
  children, 
  delay = 0, 
  duration = 0.6,
  variant = 'fade',
  direction = 'up'
}: TransitionWrapperProps) {
  let variants = fadeVariants;
  
  if (variant === 'slide') {
    switch (direction) {
      case 'right':
        variants = slideVariants.slideInFromRight;
        break;
      case 'left':
        variants = slideVariants.slideInFromLeft;
        break;
      case 'down':
        variants = slideVariants.slideInFromBottom;
        break;
      default:
        variants = {
          initial: { y: "20px", opacity: 0 },
          in: { y: 0, opacity: 1 },
          out: { y: "-20px", opacity: 0 },
        };
    }
  } else if (variant === 'scale') {
    variants = scaleVariants;
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={variants}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// Stagger children animation
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({ children, staggerDelay = 0.1, className }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="in"
      variants={{
        initial: {},
        in: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { y: 20, opacity: 0 },
        in: { y: 0, opacity: 1 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Loading animation
export function LoadingTransition() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          className="w-12 h-12 border-4 border-ethiopian-gold border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          className="text-charcoal font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}