import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService } from "@/services/vendorService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Shield,
} from "lucide-react";

interface Bank {
  id: string;
  name: string;
  code: string;
}

export default function ChapaOnboarding() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch available banks
  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['chapa', 'banks'],
    queryFn: () => vendorService.getChapaBanks(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch current onboarding status
  const { data: onboardingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['vendor', 'onboarding-status'],
    queryFn: () => vendorService.getOnboardingStatus(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch Chapa status
  const { data: chapaStatus } = useQuery({
    queryKey: ['vendor', 'chapa-status'],
    queryFn: () => vendorService.checkChapaStatus(),
    enabled: isAuthenticated && isVendor,
  });

  // Setup Chapa mutation
  const setupChapaMutation = useMutation({
    mutationFn: () => vendorService.setupChapaSubaccount(bankCode, accountNumber, accountName),
    onSuccess: (data) => {
      toast({
        title: "Chapa Account Set Up!",
        description: data.message || "Your Chapa subaccount has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'chapa-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up Chapa account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const banks: Bank[] = banksData?.banks?.map((bank: any) => ({
    id: bank.id || bank.code,
    name: bank.name,
    code: bank.code || bank.id,
  })) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankCode || !accountNumber || !accountName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setupChapaMutation.mutate();
  };

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

  const isSetUp = onboardingStatus?.chapaEnabled || chapaStatus?.payoutsEnabled;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chapa Payment Setup</h1>
            <p className="text-muted-foreground">Connect your bank account to receive ETB payments</p>
          </div>
        </div>

        {/* Already Set Up */}
        {isSetUp && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-4 py-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Chapa Account Active</h3>
                <p className="text-green-700 text-sm">
                  Your Chapa subaccount is set up and ready to receive ETB payments.
                </p>
                {onboardingStatus?.chapaSubaccountId && (
                  <p className="text-green-600 text-xs mt-1">
                    Subaccount ID: {onboardingStatus.chapaSubaccountId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              What is Chapa?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Chapa is Ethiopia's leading payment gateway. By connecting your bank account, 
              you can receive payments in Ethiopian Birr (ETB) directly to your bank.
            </p>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Secure & Verified</p>
                <p className="text-blue-700">
                  Your bank details are securely stored and verified by Chapa. 
                  We never store your bank credentials.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Form */}
        {!isSetUp && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Account Details
              </CardTitle>
              <CardDescription>
                Enter your Ethiopian bank account details to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Bank Selection */}
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank *</Label>
                  <Select
                    value={bankCode}
                    onValueChange={setBankCode}
                    disabled={banksLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select your bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="Enter your bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>

                {/* Account Name */}
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Holder Name *</Label>
                  <Input
                    id="accountName"
                    type="text"
                    placeholder="Name as it appears on your bank account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This must match the name registered with your bank exactly.
                  </p>
                </div>

                <Separator />

                {/* Submit */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="flex-1"
                  >
                    <Link to="/vendor">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={setupChapaMutation.isPending || !bankCode || !accountNumber || !accountName}
                    className="flex-1 bg-eagle-green hover:bg-eagle-green/90"
                  >
                    {setupChapaMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting Up...
                      </>
                    ) : (
                      "Set Up Chapa Account"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        {isSetUp && (
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Provider</span>
                <Badge>Chapa</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge className="bg-green-100 text-green-800">
                  {onboardingStatus?.chapaStatus || 'ACTIVE'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Can Receive Payments</span>
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              </div>
              <Separator />
              <Button variant="outline" asChild className="w-full">
                <Link to="/vendor">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
