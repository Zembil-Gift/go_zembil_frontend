import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService } from "@/services/vendorService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

export default function StripeOnboardingRefresh() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const refreshMutation = useMutation({
    mutationFn: () => vendorService.refreshStripeOnboarding(
      `${window.location.origin}/vendor/onboarding/refresh`,
      `${window.location.origin}/vendor/onboarding/return`
    ),
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        toast({
          title: "Redirecting to Stripe",
          description: "Please complete the onboarding process.",
        });
        window.location.href = data.onboardingUrl;
      } else {
        toast({
          title: "Error",
          description: "Could not get onboarding link. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh onboarding link.",
        variant: "destructive",
      });
    },
  });

  // Auto-refresh on mount
  useEffect(() => {
    if (isAuthenticated && isVendor) {
      refreshMutation.mutate();
    }
  }, [isAuthenticated, isVendor]);

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to access this page.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {refreshMutation.isPending ? (
              <Loader2 className="h-16 w-16 text-eagle-green animate-spin" />
            ) : refreshMutation.isError ? (
              <AlertCircle className="h-16 w-16 text-red-500" />
            ) : (
              <RefreshCw className="h-16 w-16 text-eagle-green" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {refreshMutation.isPending ? "Getting New Link..." : 
             refreshMutation.isError ? "Something Went Wrong" : 
             "Refreshing Onboarding"}
          </CardTitle>
          <CardDescription>
            {refreshMutation.isPending ? 
              "Please wait while we generate a new Stripe onboarding link." :
             refreshMutation.isError ?
              "We couldn't get a new onboarding link. Please try again." :
              "Your previous onboarding link has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {refreshMutation.isError && (
            <>
              <Button
                onClick={() => refreshMutation.mutate()}
                className="w-full bg-eagle-green hover:bg-eagle-green/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/vendor">
                  Back to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </>
          )}
          
          {refreshMutation.isPending && (
            <p className="text-sm text-center text-muted-foreground">
              You will be automatically redirected to Stripe...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
