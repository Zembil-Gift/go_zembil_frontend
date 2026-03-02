import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  campaignService,
  EventCampaign,
  CampaignParticipation,
  REWARD_TYPE_LABELS,
  REWARD_DURATION_LABELS,
} from "@/services/campaignService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Gift,
  CalendarDays,
  Loader2,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CampaignStatusBadge({ campaign }: { campaign: EventCampaign }) {
  const now = Date.now();
  const start = new Date(campaign.startDateTime).getTime();
  const end = new Date(campaign.endDateTime).getTime();

  if (now < start)
    return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
  if (now > end)
    return <Badge className="bg-gray-100 text-gray-800">Ended</Badge>;
  return <Badge className="bg-green-100 text-green-800">Live</Badge>;
}

function ParticipationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

export default function VendorCampaignsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<EventCampaign | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState("");

  // Fetch active vendor campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", "active", "VENDOR_PARTICIPATION"],
    queryFn: () => campaignService.getActiveCampaignsByType("VENDOR_PARTICIPATION"),
    staleTime: 60_000,
  });

  // Fetch my participations
  const { data: myParticipations = [], isLoading: participationsLoading } = useQuery({
    queryKey: ["campaigns", "my-participations"],
    queryFn: () => campaignService.getMyParticipations(),
    staleTime: 60_000,
  });

  // Submit participation mutation
  const joinMutation = useMutation({
    mutationFn: (campaignId: number) =>
      campaignService.submitParticipation(campaignId, {
        submittedData: submittedData.trim() || undefined,
      }),
    onSuccess: (_, campaignId) => {
      toast({
        title: "Participation submitted!",
        description: "Your campaign participation request has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "has-participated", campaignId] });
      setJoinDialogOpen(false);
      setSubmittedData("");
      setSelectedCampaign(null);
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

  // Build a set of campaign IDs the vendor already joined
  const participatedCampaignIds = new Set(myParticipations.map((p) => p.campaignId));

  const openJoinDialog = (campaign: EventCampaign) => {
    setSelectedCampaign(campaign);
    setSubmittedData("");
    setJoinDialogOpen(true);
  };

  const handleJoin = () => {
    if (!selectedCampaign) return;
    joinMutation.mutate(selectedCampaign.id);
  };

  const isLoading = campaignsLoading || participationsLoading;

  // Separate campaigns into available (not yet joined) and the rest
  // Only show campaigns targeting vendors
  const vendorCampaigns = campaigns.filter((c) => c.targetRole === 'VENDOR');
  const availableCampaigns = vendorCampaigns.filter((c) => !participatedCampaignIds.has(c.id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-eagle-green" />
          Campaigns
        </h1>
        <p className="text-muted-foreground mt-1">
          Join campaigns to earn commission bonuses and other rewards on your sales.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
        </div>
      ) : (
        <>
          {/* ==================== Available Campaigns ==================== */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-ethiopian-gold" />
              Available Campaigns
            </h2>

            {availableCampaigns.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">No new campaigns available right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    {campaign.imageUrl && (
                      <div className="h-40 overflow-hidden rounded-t-lg">
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{campaign.name}</CardTitle>
                        <CampaignStatusBadge campaign={campaign} />
                      </div>
                      {campaign.description && (
                        <CardDescription className="line-clamp-2">
                          {campaign.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Dates */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(campaign.startDateTime)} – {formatDate(campaign.endDateTime)}
                      </div>

                      {/* Reward info */}
                      {campaign.rewardType && (
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="h-4 w-4 text-ethiopian-gold" />
                          <span className="font-medium">
                            {REWARD_TYPE_LABELS[campaign.rewardType]}
                            {campaign.rewardValue != null && ` — ${campaign.rewardValue}%`}
                          </span>
                        </div>
                      )}

                      {campaign.rewardDurationType && (
                        <div className="text-xs text-muted-foreground ml-6">
                          Duration: {REWARD_DURATION_LABELS[campaign.rewardDurationType]}
                          {campaign.rewardDurationDays ? ` (${campaign.rewardDurationDays} days)` : ""}
                        </div>
                      )}

                      {/* Proof requirement */}
                      {campaign.proofDescription && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-gray-50 rounded-md p-2">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{campaign.proofDescription}</span>
                        </div>
                      )}

                      <Button
                        className="w-full mt-2 text-white bg-eagle-green hover:bg-eagle-green/90"
                        onClick={() => openJoinDialog(campaign)}
                      >
                        Join Campaign
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ==================== My Participations ==================== */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-eagle-green" />
              My Participations
              {myParticipations.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {myParticipations.length}
                </Badge>
              )}
            </h2>

            {myParticipations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">You haven't joined any campaigns yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myParticipations.map((participation) => (
                  <Card key={participation.id}>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{participation.campaignName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Submitted {formatDate(participation.createdAt)}</span>
                          {participation.rewardStartDate && participation.rewardEndDate && (
                            <>
                              <span>•</span>
                              <span>
                                Reward: {formatDate(participation.rewardStartDate)} –{" "}
                                {formatDate(participation.rewardEndDate)}
                              </span>
                            </>
                          )}
                        </div>
                        {participation.adminNote && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Admin note: {participation.adminNote}
                          </p>
                        )}
                      </div>
                      <ParticipationStatusBadge status={participation.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ==================== Join Dialog ==================== */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Campaign</DialogTitle>
            <DialogDescription>
              {selectedCampaign?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedCampaign?.description && (
              <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
            )}

            {selectedCampaign?.rewardType && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  🎁 Reward: {REWARD_TYPE_LABELS[selectedCampaign.rewardType]}
                  {selectedCampaign.rewardValue != null && ` — ${selectedCampaign.rewardValue}%`}
                </p>
              </div>
            )}

            {selectedCampaign?.proofDescription && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  📋 {selectedCampaign.proofDescription}
                </p>
              </div>
            )}

            {/* Proof / notes input – shown if campaign requires proof */}
            {(selectedCampaign?.proofType === "TEXT" || selectedCampaign?.proofType === "URL" || selectedCampaign?.actionType === "UPLOAD_PROOF") && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {selectedCampaign.proofType === "URL" ? "Proof URL" : "Additional Information"}
                </label>
                <Textarea
                  value={submittedData}
                  onChange={(e) => setSubmittedData(e.target.value)}
                  placeholder={
                    selectedCampaign.proofType === "URL"
                      ? "https://..."
                      : "Enter any required proof or notes..."
                  }
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={joinMutation.isPending}
              className="bg-eagle-green text-white hover:bg-eagle-green/90"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Participation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
