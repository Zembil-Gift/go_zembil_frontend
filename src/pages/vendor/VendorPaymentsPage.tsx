import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Plus,
  AlertCircle,
  CheckCircle,
  DollarSign,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

export default function VendorPaymentsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch onboarding status
  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ['vendor', 'onboarding-status'],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  // Stripe onboarding mutation
  const stripeOnboardingMutation = useMutation({
    mutationFn: () => vendorService.startStripeOnboarding(
      `${window.location.origin}/vendor/onboarding/refresh`,
      `${window.location.origin}/vendor/onboarding/return`
    ),
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast({ title: "Stripe onboarding started", description: data.message });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Stripe dashboard mutation
  const stripeDashboardMutation = useMutation({
    mutationFn: () => vendorService.getStripeDashboard(),
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'ENABLED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'NOT_STARTED':
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Payment Setup</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Setup - Only show for non-Ethiopian vendors */}
        {!isEthiopianVendor(vendorProfile) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Accept international payments via Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                {getStatusBadge(onboardingStatus?.stripeStatus || 'NOT_STARTED')}
              </div>
              {onboardingStatus?.stripeAccountId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{onboardingStatus.stripeAccountId}</code>
                </div>
              )}
              <Separator />
              <div className="flex gap-2">
                {!onboardingStatus?.stripeEnabled ? (
                  <Button
                    onClick={() => stripeOnboardingMutation.mutate()}
                    disabled={stripeOnboardingMutation.isPending}
                    className="flex-1"
                  >
                    {stripeOnboardingMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {onboardingStatus?.stripeStatus === 'NOT_STARTED' ? 'Start Setup' : 'Continue Setup'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => stripeDashboardMutation.mutate()}
                    disabled={stripeDashboardMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapa Setup */}
        <Card className={isEthiopianVendor(vendorProfile) ? "md:col-span-1" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Chapa (Ethiopian Birr)
            </CardTitle>
            <CardDescription>
              Accept ETB payments via Chapa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {getStatusBadge(onboardingStatus?.chapaStatus || 'NOT_STARTED')}
            </div>
            {onboardingStatus?.chapaSubaccountId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subaccount ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{onboardingStatus.chapaSubaccountId}</code>
              </div>
            )}
            <Separator />
            <Button asChild variant={onboardingStatus?.chapaEnabled ? 'outline' : 'default'} className="w-full">
              <Link to="/vendor/payments/chapa">
                {onboardingStatus?.chapaEnabled ? 'Manage Chapa' : 'Set Up Chapa'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {onboardingStatus?.canReceivePayments ? (
              <>
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-700">You can receive payments!</p>
                  <p className="text-sm text-muted-foreground">
                    Your payment setup is complete. Funds will be transferred to your connected accounts.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700">Payment setup incomplete</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your Stripe or Chapa setup to receive payouts from your sales.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
