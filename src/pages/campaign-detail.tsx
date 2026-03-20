import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignService,
  EventCampaign,
  REWARD_TYPE_LABELS,
  REWARD_DURATION_LABELS,
  ACTION_TYPE_LABELS,
  PROOF_TYPE_LABELS,
} from "@/services/campaignService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Gift,
  Trophy,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Users,
  Loader2,
  Sparkles,
  Target,
  FileText,
  AlertCircle,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

/* ─── Countdown hook ─── */

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function useCountdown(endDateTime: string): TimeRemaining {
  const calculate = useCallback((): TimeRemaining => {
    const end = new Date(endDateTime).getTime();
    const now = Date.now();
    const total = Math.max(0, end - now);
    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      seconds: Math.floor((total / 1000) % 60),
      total,
    };
  }, [endDateTime]);

  const [remaining, setRemaining] = useState<TimeRemaining>(calculate);

  useEffect(() => {
    const interval = setInterval(() => setRemaining(calculate()), 1000);
    return () => clearInterval(interval);
  }, [calculate]);

  return remaining;
}

/* ─── Helpers ─── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary-blue/10 rounded-xl px-4 py-3 min-w-[64px] border border-primary-blue/20">
        <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none block text-center">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 mt-1.5 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

/* ─── Eligibility Rules Parser ─── */

interface EligibilityRule {
  icon: string;
  label: string;
}

interface CampaignCriteria {
  minimumSalesAmountMinor?: number;
  minimumOrderCount?: number;
}

function parseCampaignCriteria(
  json: string | null | undefined
): CampaignCriteria | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const criteria: CampaignCriteria = {};

    if (typeof parsed.minimumSalesAmountMinor === "number") {
      criteria.minimumSalesAmountMinor = parsed.minimumSalesAmountMinor;
    }
    if (typeof parsed.minimumOrderCount === "number") {
      criteria.minimumOrderCount = parsed.minimumOrderCount;
    }

    return Object.keys(criteria).length > 0 ? criteria : null;
  } catch {
    return null;
  }
}

function formatMinorCurrency(minor: number, currencyCode: string): string {
  return formatCurrency(minor / 100, currencyCode);
}

function hasSubmittedProofData(raw: string | null | undefined): boolean {
  if (!raw || !raw.trim()) return false;

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") return parsed.trim().length > 0;
    if (Array.isArray(parsed)) return parsed.length > 0;

    if (parsed && typeof parsed === "object") {
      return Object.values(parsed as Record<string, unknown>).some((value) => {
        if (typeof value === "string") return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
      });
    }

    return Boolean(parsed);
  } catch {
    return true;
  }
}

function formatRewardValueDisplay(
  rewardType: EventCampaign["rewardType"],
  rewardValue: number,
  currencyCode: string
): string {
  switch (rewardType) {
    case "DISCOUNT_COUPON":
    case "COMMISSION_BONUS":
      return `${rewardValue}%`;
    case "FIXED_BONUS":
    case "FIXED_DISCOUNT":
    case "WALLET_CREDIT":
    case "GIFT_VOUCHER":
      return formatCurrency(rewardValue, currencyCode);
    default:
      return String(rewardValue);
  }
}

function parseEligibilityRules(
  json: string,
  currencyCode: string
): EligibilityRule[] {
  let rules: Record<string, unknown>;
  try {
    rules = JSON.parse(json);
  } catch {
    // Not JSON — treat as plain text
    return [{ icon: "📋", label: json }];
  }

  const items: EligibilityRule[] = [];

  // ── User rules ──
  if (rules.emailVerified === true) {
    items.push({ icon: "✅", label: "Verified email address required" });
  }
  if (typeof rules.minAccountAgeDays === "number") {
    items.push({
      icon: "📅",
      label: `Account must be at least ${rules.minAccountAgeDays} days old`,
    });
  }
  if (typeof rules.minProductOrders === "number") {
    items.push({
      icon: "🛍️",
      label: `At least ${rules.minProductOrders} completed product order${
        rules.minProductOrders !== 1 ? "s" : ""
      }`,
    });
  }
  if (typeof rules.minServiceBookings === "number") {
    items.push({
      icon: "📆",
      label: `At least ${rules.minServiceBookings} paid service booking${
        rules.minServiceBookings !== 1 ? "s" : ""
      }`,
    });
  }
  if (typeof rules.minEventOrders === "number") {
    items.push({
      icon: "🎟️",
      label: `At least ${rules.minEventOrders} paid event ticket purchase${
        rules.minEventOrders !== 1 ? "s" : ""
      }`,
    });
  }

  // ── Vendor rules ──
  if (rules.vendorApproved === true) {
    items.push({ icon: "🏪", label: "Must be an approved vendor" });
  }
  if (rules.registeredWithinCampaignWindow === true) {
    items.push({
      icon: "🗓️",
      label: "Must have registered during the campaign period",
    });
  }
  if (typeof rules.minCompletedProductOrders === "number") {
    items.push({
      icon: "📦",
      label: `At least ${
        rules.minCompletedProductOrders
      } completed product order${
        rules.minCompletedProductOrders !== 1 ? "s" : ""
      } received`,
    });
  }
  if (typeof rules.minPaidServiceOrders === "number") {
    items.push({
      icon: "🔧",
      label: `At least ${rules.minPaidServiceOrders} paid service order${
        rules.minPaidServiceOrders !== 1 ? "s" : ""
      } received`,
    });
  }
  if (typeof rules.minPaidEventOrders === "number") {
    items.push({
      icon: "🎪",
      label: `At least ${rules.minPaidEventOrders} paid event order${
        rules.minPaidEventOrders !== 1 ? "s" : ""
      } received`,
    });
  }
  if (typeof rules.minPaidCustomOrders === "number") {
    items.push({
      icon: "🎨",
      label: `At least ${rules.minPaidCustomOrders} paid custom order${
        rules.minPaidCustomOrders !== 1 ? "s" : ""
      } received`,
    });
  }
  if (typeof rules.minTotalRevenueMinor === "number") {
    const minRevenue = formatMinorCurrency(
      rules.minTotalRevenueMinor,
      currencyCode
    );
    items.push({
      icon: "💰",
      label: `Minimum total revenue of ${minRevenue}`,
    });
  }
  if (Array.isArray(rules.vendorCities) && rules.vendorCities.length > 0) {
    items.push({
      icon: "📍",
      label: `Available in: ${(rules.vendorCities as string[]).join(", ")}`,
    });
  }
  if (
    Array.isArray(rules.vendorCategoryIds) &&
    rules.vendorCategoryIds.length > 0
  ) {
    items.push({
      icon: "🏷️",
      label: "Restricted to specific vendor categories",
    });
  }

  return items;
}

/* ─── Main Page ─── */

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isInitialized: authInitialized,
    user,
  } = useAuth();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const campaignId = Number(id);
  const normalizedRole = user?.role?.toUpperCase();
  const preferredCurrencyCode = user?.preferredCurrencyCode ?? "ETB";

  // Fetch campaign details — wait for auth to initialize so the request is sent
  // with the correct auth token. Including `isAuthenticated` in the query key ensures
  // a fresh fetch (with proper auth headers) if the session restores after the first
  // unauthenticated render (which would otherwise cache an ETB-converted value).
  const {
    data: campaign,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["campaigns", "active", campaignId, isAuthenticated],
    queryFn: () => campaignService.getActiveCampaign(campaignId),
    enabled: !!id && !isNaN(campaignId) && authInitialized,
    staleTime: 60_000,
    retry: 1,
  });

  // Check if user has already participated
  const { data: hasParticipated = false, isLoading: checkingParticipation } =
    useQuery({
      queryKey: ["campaigns", "has-participated", campaignId],
      queryFn: () => campaignService.hasParticipated(campaignId),
      enabled: !!id && !isNaN(campaignId) && isAuthenticated,
      staleTime: 30_000,
    });

  // Get user's participations (to show status if already participated)
  const { data: myParticipations = [] } = useQuery({
    queryKey: ["campaigns", "my-participations"],
    queryFn: () => campaignService.getMyParticipations(),
    enabled: isAuthenticated && hasParticipated,
    staleTime: 30_000,
  });

  const { data: participationCountFromEndpoint } = useQuery({
    queryKey: ["campaigns", "participations", "count", campaignId],
    queryFn: () => campaignService.getParticipationCountByCampaign(campaignId),
    enabled: !!id && !isNaN(campaignId),
    staleTime: 30_000,
  });

  const myParticipation = myParticipations.find(
    (p) => p.campaignId === campaignId
  );

  // Submit participation mutation
  const joinMutation = useMutation({
    mutationFn: () =>
      campaignService.submitParticipation(campaignId, {
        submittedData:
          campaign?.actionType === "UPLOAD_PROOF"
            ? undefined
            : submittedData.trim() || undefined,
      }),
    onSuccess: () => {
      setJoinDialogOpen(false);
      setShowSuccessDialog(true);
      setSubmittedData("");
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "my-participations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "has-participated", campaignId],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit participation";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const submitProofMutation = useMutation({
    mutationFn: async () => {
      if (!myParticipation) {
        throw new Error("Participation record not found");
      }

      if (campaign?.proofType === "TEXT") {
        if (!proofText.trim()) {
          throw new Error("Please enter proof text");
        }
        return campaignService.submitTextProof(myParticipation.id, {
          proofText: proofText.trim(),
        });
      }

      if (campaign?.proofType === "URL") {
        if (!proofUrl.trim()) {
          throw new Error("Please enter proof URL");
        }
        return campaignService.submitUrlProof(myParticipation.id, {
          proofUrl: proofUrl.trim(),
        });
      }

      if (campaign?.proofType === "FILE") {
        if (!proofFile) {
          throw new Error("Please attach a proof file");
        }
        return campaignService.submitFileProof(myParticipation.id, proofFile);
      }

      if (campaign?.proofType === "MULTIPLE") {
        const text = proofText.trim();
        const url = proofUrl.trim();
        if (!text && !url && !proofFile) {
          throw new Error("Please provide at least one proof item");
        }
        return campaignService.submitMultipleProof(
          myParticipation.id,
          {
            proofText: text || null,
            proofUrl: url || null,
          },
          proofFile || undefined
        );
      }

      throw new Error("This campaign does not accept proof submissions");
    },
    onSuccess: () => {
      setProofText("");
      setProofUrl("");
      setProofFile(null);
      toast({
        title: "Proof submitted",
        description: "Your proof has been sent successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "my-participations"],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit proof";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const countdown = useCountdown(
    campaign?.endDateTime ?? new Date().toISOString()
  );
  const parsedCriteria = parseCampaignCriteria(campaign?.criteria);
  const eligibilityRuleItems = campaign?.eligibilityRules
    ? parseEligibilityRules(campaign.eligibilityRules, preferredCurrencyCode)
    : [];
  const participantCount =
    participationCountFromEndpoint ?? campaign?.participationCount ?? 0;
  const approvedCount = campaign?.approvedCount ?? 0;
  const pendingCount = campaign?.pendingCount ?? 0;

  const isParticipationCampaign =
    campaign?.campaignType === "CUSTOMER_PARTICIPATION" ||
    campaign?.campaignType === "USER_PARTICIPATION" ||
    campaign?.campaignType === "VENDOR_PARTICIPATION";
  const isUserRole = normalizedRole === "CUSTOMER";
  const isVendorRole = normalizedRole === "VENDOR";
  const isUploadProofCampaign = campaign?.actionType === "UPLOAD_PROOF";
  const hasSubmittedProof = hasSubmittedProofData(
    myParticipation?.submittedData
  );
  const isCompleteProfileCampaign = campaign?.actionType === "COMPLETE_PROFILE";
  const needsProofAfterJoin =
    isUploadProofCampaign &&
    campaign?.verificationMethod === "MANUAL" &&
    !!myParticipation &&
    myParticipation.status === "APPROVED" &&
    !hasSubmittedProof;
  const canCompleteProfile =
    isCompleteProfileCampaign &&
    !!myParticipation &&
    myParticipation.status === "APPROVED";
  const isRoleEligibleForCampaign = campaign
    ? campaign.targetRole === "ALL" ||
      (campaign.targetRole === "CUSTOMER" && isUserRole) ||
      (campaign.targetRole === "USER" && isUserRole) ||
      (campaign.targetRole === "VENDOR" && isVendorRole)
    : false;

  const handleJoinClick = () => {
    if (!isAuthenticated) {
      localStorage.setItem("returnTo", `/campaigns/${campaignId}`);
      navigate("/signin");
      return;
    }

    if (!isRoleEligibleForCampaign) {
      toast({
        title: "Not eligible for this campaign",
        description: "This campaign is targeted to a different account role.",
        variant: "destructive",
      });
      return;
    }

    setSubmittedData("");
    setJoinDialogOpen(true);
  };

  const handleJoinSubmit = () => {
    joinMutation.mutate();
  };

  const completeProfileMutation = useMutation({
    mutationFn: () => {
      if (!myParticipation) {
        throw new Error("Participation record not found");
      }
      return campaignService.completeProfileParticipation(myParticipation.id);
    },
    onSuccess: () => {
      toast({
        title: "Profile submitted",
        description: "Your profile completion check was submitted.",
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", "my-participations"],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to complete profile action";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const rewardLabel = campaign?.rewardType
    ? REWARD_TYPE_LABELS[campaign.rewardType]
    : null;
  const rewardValueDisplay =
    campaign?.rewardType && campaign.rewardValue != null
      ? formatRewardValueDisplay(
          campaign.rewardType,
          campaign.rewardValue,
          preferredCurrencyCode
        )
      : null;

  /* ─── Loading / Error States ─── */

  if (isLoading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-blue mx-auto mb-4" />
          <p className="text-gray-500">Loading campaign…</p>
        </div>
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Campaign Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            This campaign may have ended or is no longer available.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const campaignEnded = countdown.total <= 0;

  /* ─── Render ─── */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-charcoal">
        {campaign.imageUrl && (
          <>
            <img
              src={campaign.imageUrl}
              alt={campaign.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          </>
        )}

        {!campaign.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-blue via-primary-blue/90 to-primary-blue/70" />
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pb-20">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="bg-ethiopian-gold/20 text-ethiopian-gold border border-ethiopian-gold/30 text-xs uppercase tracking-wider font-semibold">
                {campaign.campaignType === "CUSTOMER_PARTICIPATION" ||
                campaign.campaignType === "USER_PARTICIPATION"
                  ? "Join & Win"
                  : "Campaign"}
              </Badge>
              {campaignEnded && (
                <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                  Campaign Ended
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight mb-5">
              {campaign.name}
            </h1>

            {/* Description */}
            {campaign.description && (
              <p className="text-lg text-gray-200 leading-relaxed max-w-2xl mb-8 border-l-4 border-ethiopian-gold pl-5">
                {campaign.description}
              </p>
            )}

            {/* Countdown */}
            {!campaignEnded && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                  Time Remaining
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <CountdownUnit value={countdown.days} label="Days" />
                  <span className="text-2xl font-light text-white/30 pb-5">
                    :
                  </span>
                  <CountdownUnit value={countdown.hours} label="Hours" />
                  <span className="text-2xl font-light text-white/30 pb-5">
                    :
                  </span>
                  <CountdownUnit value={countdown.minutes} label="Mins" />
                  <span className="text-2xl font-light text-white/30 pb-5">
                    :
                  </span>
                  <CountdownUnit value={countdown.seconds} label="Secs" />
                </div>
              </div>
            )}

            {/* Hero CTA (for unauthenticated or not-yet-joined users) */}
            {!campaignEnded && isParticipationCampaign && !hasParticipated && (
              <Button
                onClick={handleJoinClick}
                size="lg"
                className="bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-charcoal font-bold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Gift className="h-5 w-5 mr-2" />
                {isAuthenticated ? "Join This Campaign" : "Sign In to Join"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column – Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participation Status (if already joined) */}
            {hasParticipated && myParticipation && (
              <Card className="border-l-4 border-l-primary-blue shadow-md">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "rounded-full p-2.5",
                        myParticipation.status === "APPROVED"
                          ? "bg-green-100"
                          : myParticipation.status === "REJECTED"
                          ? "bg-red-100"
                          : "bg-amber-100"
                      )}
                    >
                      {myParticipation.status === "APPROVED" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : myParticipation.status === "REJECTED" ? (
                        <XCircle className="h-6 w-6 text-red-600" />
                      ) : (
                        <Clock className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {myParticipation.status === "APPROVED"
                          ? "You're in! 🎉"
                          : myParticipation.status === "REJECTED"
                          ? "Participation Declined"
                          : "Participation Pending Review"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {myParticipation.status === "APPROVED"
                          ? "Your participation has been approved. Enjoy your reward!"
                          : myParticipation.status === "REJECTED"
                          ? "Unfortunately your participation was not approved this time."
                          : "Your request has been submitted and is being reviewed. We'll notify you once it's processed."}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        <span>
                          Submitted {formatShortDate(myParticipation.createdAt)}
                        </span>
                        {myParticipation.rewardStartDate &&
                          myParticipation.rewardEndDate && (
                            <>
                              <span>•</span>
                              <span className="text-green-700 font-medium">
                                Reward:{" "}
                                {formatShortDate(
                                  myParticipation.rewardStartDate
                                )}{" "}
                                –{" "}
                                {formatShortDate(myParticipation.rewardEndDate)}
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaign Details Card */}
            <Card className="shadow-md">
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary-blue" />
                    Campaign Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <CalendarDays className="h-5 w-5 text-primary-blue shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Start Date
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {formatDate(campaign.startDateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <CalendarDays className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          End Date
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {formatDate(campaign.endDateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <Users className="h-5 w-5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Participants
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {participantCount} joined
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <Shield className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Verification
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {campaign.verificationMethod === "AUTOMATIC"
                            ? "Instant Approval"
                            : campaign.verificationMethod === "MANUAL"
                            ? "Manual Review"
                            : campaign.verificationMethod === "HYBRID"
                            ? "Hybrid (Auto + Review)"
                            : "Standard"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Eligibility Rules */}
                {eligibilityRuleItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary-blue" />
                        Who Can Join
                      </h3>
                      <ul className="space-y-2">
                        {eligibilityRuleItems.map((rule, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3"
                          >
                            <span className="text-base leading-snug shrink-0 mt-0.5">
                              {rule.icon}
                            </span>
                            <span className="text-sm text-blue-900">
                              {rule.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* What You Need To Do */}
                {campaign.actionType && campaign.actionType !== "NO_ACTION" && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary-blue" />
                        What You Need To Do
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium text-gray-800">
                          {ACTION_TYPE_LABELS[campaign.actionType]}
                        </p>
                        {campaign.proofDescription && (
                          <p className="text-sm text-gray-600">
                            {campaign.proofDescription}
                          </p>
                        )}
                        {campaign.proofType && (
                          <Badge variant="outline" className="text-xs">
                            Required: {PROOF_TYPE_LABELS[campaign.proofType]}
                          </Badge>
                        )}

                        {parsedCriteria?.minimumSalesAmountMinor != null && (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <p className="text-sm font-semibold text-indigo-900">
                              Minimum sales target
                            </p>
                            <p className="text-sm text-indigo-800 mt-0.5">
                              {formatMinorCurrency(
                                parsedCriteria.minimumSalesAmountMinor,
                                preferredCurrencyCode
                              )}
                            </p>
                          </div>
                        )}

                        {parsedCriteria?.minimumOrderCount != null && (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <p className="text-sm font-semibold text-indigo-900">
                              Minimum order target
                            </p>
                            <p className="text-sm text-indigo-800 mt-0.5">
                              {parsedCriteria.minimumOrderCount.toLocaleString()}{" "}
                              completed orders
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column – Reward & Join */}
          <div className="space-y-6">
            {/* Reward Card */}
            {campaign.rewardType && (
              <Card className="shadow-md border-t-4 border-t-ethiopian-gold">
                <CardContent className="pt-6">
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ethiopian-gold/10 mb-3">
                      <Trophy className="h-7 w-7 text-ethiopian-gold" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Your Reward
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                      <p className="text-sm font-medium text-green-800">
                        {rewardLabel}
                      </p>
                      {rewardValueDisplay && (
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          {campaign.rewardType === "DISCOUNT_COUPON"
                            ? `${rewardValueDisplay} OFF`
                            : rewardValueDisplay}
                        </p>
                      )}
                    </div>

                    {campaign.rewardDurationType && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                        <Clock className="h-4 w-4" />
                        <span>
                          {REWARD_DURATION_LABELS[campaign.rewardDurationType]}
                          {campaign.rewardDurationDays
                            ? ` (${campaign.rewardDurationDays} days)`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Join Action Card */}
            {isParticipationCampaign && (
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  {campaignEnded ? (
                    <div className="text-center py-4">
                      <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-700">
                        Campaign Has Ended
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This campaign is no longer accepting participants.
                      </p>
                    </div>
                  ) : hasParticipated ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="font-semibold text-gray-700">
                        Already Joined
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        You've already registered for this campaign.
                        {myParticipation && (
                          <span className="block mt-1">
                            Status:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                myParticipation.status === "APPROVED"
                                  ? "text-green-600"
                                  : myParticipation.status === "REJECTED"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              )}
                            >
                              {myParticipation.status}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">
                          Ready to Join?
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Register now and earn your reward!
                        </p>
                      </div>
                      {/* 
                      {eligibilityRuleItems.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            You must meet these requirements
                          </p>
                          {eligibilityRuleItems.map((rule, i) => (
                            <p
                              key={i}
                              className="text-xs text-blue-800 flex items-start gap-1.5"
                            >
                              <span className="shrink-0">{rule.icon}</span>
                              <span>{rule.label}</span>
                            </p>
                          ))}
                        </div>
                      )} */}

                      <Button
                        onClick={handleJoinClick}
                        className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white font-semibold py-5 rounded-xl text-base"
                        disabled={
                          checkingParticipation ||
                          (isAuthenticated && !isRoleEligibleForCampaign)
                        }
                      >
                        {checkingParticipation ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <Gift className="h-5 w-5 mr-2" />
                        )}
                        {isAuthenticated ? "Join Campaign" : "Sign In to Join"}
                      </Button>

                      {isAuthenticated && !isRoleEligibleForCampaign && (
                        <p className="text-xs text-red-500 text-center">
                          Your current account role cannot join this campaign.
                        </p>
                      )}

                      {!isAuthenticated && (
                        <p className="text-xs text-gray-400 text-center">
                          You need to be signed in to participate.{" "}
                          <Link
                            to="/signup"
                            className="text-primary-blue underline"
                          >
                            Create an account
                          </Link>
                        </p>
                      )}
                    </div>
                  )}

                  {hasParticipated &&
                    myParticipation &&
                    needsProofAfterJoin && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <p className="text-sm font-semibold text-gray-800">
                          Submit Required Proof
                        </p>

                        {(campaign.proofType === "TEXT" ||
                          campaign.proofType === "MULTIPLE") && (
                          <Textarea
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            placeholder="Enter proof details..."
                            rows={3}
                          />
                        )}

                        {(campaign.proofType === "URL" ||
                          campaign.proofType === "MULTIPLE") && (
                          <Input
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                            placeholder="https://..."
                            type="url"
                          />
                        )}

                        {(campaign.proofType === "FILE" ||
                          campaign.proofType === "MULTIPLE") && (
                          <Input
                            type="file"
                            onChange={(e) =>
                              setProofFile(e.target.files?.[0] || null)
                            }
                          />
                        )}

                        <Button
                          onClick={() => submitProofMutation.mutate()}
                          disabled={submitProofMutation.isPending}
                          className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                        >
                          {submitProofMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Submit Proof
                        </Button>
                      </div>
                    )}

                  {hasParticipated &&
                    myParticipation &&
                    isUploadProofCampaign &&
                    hasSubmittedProof && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
                          We received your submitted data and will review it.
                        </p>
                      </div>
                    )}

                  {hasParticipated && myParticipation && canCompleteProfile && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        Complete Profile Action
                      </p>
                      <p className="text-xs text-gray-600">
                        After approval, click below to verify your profile and
                        complete this campaign.
                      </p>
                      <Button
                        onClick={() => completeProfileMutation.mutate()}
                        disabled={completeProfileMutation.isPending}
                        className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                      >
                        {completeProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Complete Profile
                      </Button>
                    </div>
                  )}

                  {hasParticipated &&
                    myParticipation &&
                    isUploadProofCampaign &&
                    campaign.verificationMethod === "MANUAL" &&
                    myParticipation.status === "PENDING" && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                          Your participation is pending admin approval. You can
                          upload proof after your participation is approved.
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* For non-user campaigns that somehow got here */}
            {!isParticipationCampaign &&
              campaign.campaignType === "PRODUCT_EVENT" && (
                <Card className="shadow-md">
                  <CardContent className="pt-6 text-center">
                    <Gift className="h-10 w-10 text-primary-blue mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">
                      Shop The Collection
                    </p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                      Browse products featured in this campaign.
                    </p>
                    <Button
                      onClick={() =>
                        navigate(
                          campaign.subCategorySlug
                            ? `/gifts?category=${campaign.subCategorySlug}`
                            : "/gifts"
                        )
                      }
                      className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                    >
                      Browse Products
                    </Button>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>

      {/* ─── Join Dialog ─── */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary-blue" />
              Join Campaign
            </DialogTitle>
            <DialogDescription>{campaign.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {campaign.description && (
              <p className="text-sm text-gray-600">{campaign.description}</p>
            )}

            {/* Reward preview */}
            {campaign.rewardType && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  🎁 Reward: {REWARD_TYPE_LABELS[campaign.rewardType]}
                  {rewardValueDisplay &&
                    ` — ${
                      campaign.rewardType === "DISCOUNT_COUPON"
                        ? `${rewardValueDisplay} OFF`
                        : rewardValueDisplay
                    }`}
                </p>
              </div>
            )}

            {/* Proof requirement callout */}
            {campaign.proofDescription && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  📋 {campaign.proofDescription}
                </p>
              </div>
            )}

            {isUploadProofCampaign && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  After you join, your participation will be reviewed first.
                  Once approved, you can submit your proof from this page.
                </p>
              </div>
            )}

            {/* Eligibility reminder */}
            {campaign.eligibilityRules &&
              (() => {
                const rules = parseEligibilityRules(
                  campaign.eligibilityRules!,
                  preferredCurrencyCode
                );
                return rules.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                      Requirements
                    </p>
                    {rules.map((rule, i) => (
                      <p
                        key={i}
                        className="text-xs text-blue-800 flex items-start gap-1.5"
                      >
                        <span className="shrink-0">{rule.icon}</span>
                        <span>{rule.label}</span>
                      </p>
                    ))}
                  </div>
                ) : null;
              })()}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinSubmit}
              disabled={joinMutation.isPending}
              className="bg-primary-blue text-white hover:bg-primary-blue/90"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Participation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Success Dialog ─── */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
              <PartyPopper className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-2">
              You're Registered! 🎉
            </DialogTitle>
            <DialogDescription className="text-base">
              Your campaign participation has been submitted successfully.
              {isUploadProofCampaign
                ? " Your request is now pending admin approval. You can upload proof once approved."
                : campaign.verificationMethod === "AUTOMATIC"
                ? " Your reward will be activated shortly."
                : " We'll review your submission and notify you once it's approved."}
            </DialogDescription>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-primary-blue text-white hover:bg-primary-blue/90 px-8"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
