import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Key } from "lucide-react";

export default function ForgotPassword() {
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
                <Key size={32} className="text-ethiopian-gold" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">
                Reset Password
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Need help accessing your account?
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Password Reset Coming Soon!</strong> This feature is currently 
                  in development. For account access issues, please contact our support team.
                </p>
              </div>

              {/* Contact Support */}
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Need immediate help with your account?
                </p>
                <Link to="/contact">
                  <Button className="w-full bg-ethiopian-gold hover:bg-amber text-white mb-3">
                    Contact Support
                  </Button>
                </Link>
                <Link to="/signin">
                  <Button variant="outline" className="w-full border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
                    Back to Sign In
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