import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Calendar, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ServiceOrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    localStorage.removeItem("returnTo");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Service Payment Verified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-gray-700">
            {orderId
              ? `Your service order #${orderId} has been paid successfully.`
              : "Your service order has been paid successfully."}
          </p>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-eagle-green hover:bg-viridian-green text-white"
            >
              <a
                href={
                  orderId
                    ? `/my-service-orders/${orderId}`
                    : "/my-service-orders"
                }
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Services
              </a>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <a href="/services">
                <Search className="h-4 w-4 mr-2" />
                Browse Service
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
