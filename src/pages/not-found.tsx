import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, Gift } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="shadow-xl border-0">
            <CardContent className="p-8 text-center">
              {/* 404 Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6"
              >
                <div className="text-8xl font-bold text-ethiopian-gold/20 mb-4">404</div>
                <div className="w-20 h-20 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto">
                  <Search size={40} className="text-ethiopian-gold" />
                </div>
              </motion.div>

              {/* Error Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-8"
              >
                <h1 className="text-2xl font-bold text-charcoal mb-3">
                  Page Not Found
                </h1>
                <p className="text-gray-600 leading-relaxed">
                  Oops! The gift you're looking for seems to have been delivered elsewhere. 
                  Let's get you back to finding the perfect present.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="space-y-3"
              >
                <Link to="/" className="block">
                  <Button className="w-full bg-ethiopian-gold hover:bg-amber text-white">
                    <Home size={18} className="mr-2" />
                    Back to goZembil
                  </Button>
                </Link>
                
                <div className="flex gap-3">
                  <Link to="/gifts" className="flex-1">
                    <Button variant="outline" className="w-full border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
                      <Gift size={18} className="mr-2" />
                      Browse Gifts
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => window.history.back()}
                    className="flex-1"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Go Back
                  </Button>
                </div>
              </motion.div>

              {/* Helpful Links */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-8 pt-6 border-t border-gray-100"
              >
                <p className="text-sm text-gray-500 mb-3">Popular sections:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link 
                    to="/occasions" 
                    className="text-sm text-ethiopian-gold hover:text-amber transition-colors"
                  >
                    Occasions
                  </Link>
                  <span className="text-gray-300">•</span>
                  <Link 
                    to="/custom-orders" 
                    className="text-sm text-ethiopian-gold hover:text-amber transition-colors"
                  >
                    Custom Orders
                  </Link>
                  <span className="text-gray-300">•</span>
                  <Link 
                    to="/track" 
                    className="text-sm text-ethiopian-gold hover:text-amber transition-colors"
                  >
                    Track Orders
                  </Link>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}