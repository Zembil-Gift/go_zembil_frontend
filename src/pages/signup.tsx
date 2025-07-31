import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus size={32} className="text-ethiopian-gold" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">
                Create Account
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Join goZembil to start sending meaningful gifts
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Coming Soon!</strong> Account creation is currently in development. 
                  For now, you can sign in using the available login methods.
                </p>
              </div>

              {/* Sign In Alternative */}
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Already have an account or want to get started?
                </p>
                <Link to="/signin">
                  <Button className="w-full bg-ethiopian-gold hover:bg-amber text-white">
                    Sign In Instead
                  </Button>
                </Link>
              </div>

              {/* Back to Home */}
              <div className="pt-4 border-t border-gray-100">
                <Link to="/" className="flex items-center justify-center text-gray-600 hover:text-ethiopian-gold transition-colors">
                  <ArrowLeft size={18} className="mr-2" />
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}