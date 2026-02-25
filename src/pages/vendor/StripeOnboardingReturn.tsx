import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService } from "@/services/vendorService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function StripeOnboardingReturn() {
  useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Check Stripe status after returning from onboarding
  const { data: stripeStatus, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vendor', 'stripe-status'],
    queryFn: () => vendorService.checkStripeStatus(),
    enabled: isAuthenticated && isVendor,
    refetchOnMount: true,
  });

  // Fetch overall onboarding status
  const { data: onboardingStatus } = useQuery({
    queryKey: ['vendor', 'onboarding-status'],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  useEffect(() => {
    if (stripeStatus) {
      if (stripeStatus.payoutsEnabled) {
        toast({
          title: "Stripe Setup Complete!",
          description: "Your Stripe account is fully set up. You can now receive payments.",
        });
      } else if (stripeStatus.status === 'PENDING' || stripeStatus.status === 'RESTRICTED') {
        toast({
          title: "Additional Steps Required",
          description: "Please complete all required steps in Stripe to enable payouts.",
          variant: "default",
        });
      }
    }
  }, [stripeStatus, toast]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 text-eagle-green animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">Checking Stripe Status</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we verify your Stripe account setup...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isComplete = stripeStatus?.payoutsEnabled;
  const isPending = stripeStatus?.status === 'PENDING' || stripeStatus?.status === 'RESTRICTED';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-lg mx-auto px-4">
        {/* Success State */}
        {isComplete && (
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Setup Complete!</CardTitle>
              <CardDescription className="text-green-700">
                Your Stripe account is fully set up and ready to receive payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Account Status</span>
                <Badge className="bg-green-600">Enabled</Badge>
              </div>
              {stripeStatus?.accountId && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Account ID</span>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">{stripeStatus.accountId}</code>
                </div>
              )}
              <Button asChild className="w-full bg-eagle-green hover:bg-eagle-green/90">
                <Link to="/vendor">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending State */}
        {isPending && (
          <Card className="border-amber-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <AlertCircle className="h-16 w-16 text-amber-500" />
              </div>
              <CardTitle className="text-2xl text-amber-800">Additional Steps Required</CardTitle>
              <CardDescription className="text-amber-700">
                Your Stripe account needs additional information before you can receive payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="font-medium">Account Status</span>
                <Badge className="bg-amber-500">{stripeStatus?.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {stripeStatus?.message || "Please complete all verification steps in Stripe to enable payouts."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="flex-1"
                >
                  {isRefetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Check Status
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/vendor">Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Started State */}
        {!isComplete && !isPending && stripeStatus?.status === 'NOT_STARTED' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CreditCard className="h-16 w-16 text-gray-400" />
              </div>
              <CardTitle className="text-2xl">Stripe Not Set Up</CardTitle>
              <CardDescription>
                You haven't started the Stripe onboarding process yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full bg-eagle-green hover:bg-eagle-green/90">
                <Link to="/vendor">
                  Go to Dashboard to Set Up
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
