import { motion } from "framer-motion";
import { ReactNode } from "react";

// Base animation component with all animation types
interface BaseAnimationProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

// Fade animation with direction support
interface FadeInProps extends BaseAnimationProps {
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.6,
  direction = 'up',
  className = ""
}: FadeInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 20, opacity: 0 };
      case 'down': return { y: -20, opacity: 0 };
      case 'left': return { x: 20, opacity: 0 };
      case 'right': return { x: -20, opacity: 0 };
      default: return { y: 20, opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide animation with distance control
interface SlideInProps extends BaseAnimationProps {
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
}

export function SlideIn({ 
  children, 
  delay = 0, 
  duration = 0.8,
  direction = 'left',
  distance = 100,
  className = ""
}: SlideInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'left': return { x: -distance, opacity: 0 };
      case 'right': return { x: distance, opacity: 0 };
      case 'up': return { y: -distance, opacity: 0 };
      case 'down': return { y: distance, opacity: 0 };
      default: return { x: -distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale animation
interface ScaleInProps extends BaseAnimationProps {
  initialScale?: number;
}

export function ScaleIn({ 
  children, 
  delay = 0, 
  duration = 0.5,
  initialScale = 0.8,
  className = ""
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ scale: initialScale, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger animations for lists/grids
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  initialDelay?: number;
}

export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1, 
  className = "",
  initialDelay = 0
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export function StaggerItem({ 
  children, 
  className = "",
  direction = 'up',
  distance = 20
}: StaggerItemProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance, opacity: 0 };
      case 'down': return { y: -distance, opacity: 0 };
      case 'left': return { x: distance, opacity: 0 };
      case 'right': return { x: -distance, opacity: 0 };
      default: return { y: distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      variants={{
        hidden: getInitialPosition(),
        visible: {
          x: 0,
          y: 0,
          opacity: 1,
          transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Product grid specific stagger animation
export function ProductGridStagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function ProductGridItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { 
          y: 30, 
          opacity: 0,
          scale: 0.95
        },
        visible: {
          y: 0,
          opacity: 1,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Export all animation components as default and named exports
export default FadeIn;