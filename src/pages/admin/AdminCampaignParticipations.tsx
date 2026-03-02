import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  campaignService,
  CampaignParticipation,
  EventCampaign,
  ParticipationStatus,
  TargetRole,
} from '@/services/campaignService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  FileText,
} from 'lucide-react';

// ==================== Helpers ====================

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(str: string | null, maxLen: number): string {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

interface SubmittedDataResult {
  display: string;
  isUrl: boolean;
  isJson: boolean;
}

function extractSubmittedValue(raw: string | null): SubmittedDataResult {
  if (!raw) return { display: '—', isUrl: false, isJson: false };
  try {
    const parsed = JSON.parse(raw);
    // Unwrap the backend's {"value": "..."} wrapper — used to normalize plain strings into JSONB
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 1 &&
      'value' in parsed
    ) {
      const val = String(parsed.value);
      return { display: val, isUrl: /^https?:\/\//.test(val), isJson: false };
    }
    // Complex JSON — pretty print
    return { display: JSON.stringify(parsed, null, 2), isUrl: false, isJson: true };
  } catch {
    return { display: raw, isUrl: /^https?:\/\//.test(raw), isJson: false };
  }
}

// ==================== Status Badge ====================

function ParticipationStatusBadge({ status }: { status: ParticipationStatus }) {
  const styles: Record<ParticipationStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <Badge variant="outline" className={styles[status] || 'bg-gray-100 text-gray-600'}>
      {status === 'PENDING' && <Clock className="inline h-3 w-3 mr-1" />}
      {status === 'APPROVED' && <CheckCircle className="inline h-3 w-3 mr-1" />}
      {status === 'REJECTED' && <XCircle className="inline h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

// ==================== Participation Tab Content ====================

type StatusFilter = 'ALL' | ParticipationStatus;

interface ParticipationTabContentProps {
  role: TargetRole;
  campaigns: EventCampaign[];
}

function ParticipationTabContent({ role, campaigns }: ParticipationTabContentProps) {
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [reviewingParticipation, setReviewingParticipation] = useState<CampaignParticipation | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusParam: ParticipationStatus | undefined =
    statusFilter === 'ALL' ? undefined : statusFilter;

  const { data: participations = [], isLoading } = useQuery({
    queryKey: ['admin', 'campaign-participations', role, statusParam],
    queryFn: () => campaignService.getParticipationsByRole(role, statusParam),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: number;
      status: 'APPROVED' | 'REJECTED';
      adminNote?: string;
    }) =>
      campaignService.reviewParticipation(id, {
        status,
        adminNote: adminNote || undefined,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'campaign-participations', role],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'campaign-participations', role === 'VENDOR' ? 'USER' : 'VENDOR'],
      });
      toast({
        title: 'Success',
        description: `Participation ${variables.status === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
      });
      setReviewingParticipation(null);
      setAdminNote('');
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to review participation';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    },
  });

  const filtered = useMemo(() => {
    let list = participations;
    if (campaignFilter !== 'all') {
      const id = Number(campaignFilter);
      list = list.filter((p) => p.campaignId === id);
    }
    return list;
  }, [participations, campaignFilter]);

  const handleReview = (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingParticipation) return;
    reviewMutation.mutate({
      id: reviewingParticipation.id,
      status,
      adminNote: adminNote.trim() || undefined,
    });
  };

  const handleCloseReview = () => {
    setReviewingParticipation(null);
    setAdminNote('');
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No participations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Submitted Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.participantName || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.participantEmail || '—'}
                      </TableCell>
                      <TableCell>{p.campaignName}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {truncate(extractSubmittedValue(p.submittedData).display, 60)}
                      </TableCell>
                      <TableCell>
                        <ParticipationStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(p.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReviewingParticipation(p);
                            setAdminNote(p.adminNote || '');
                          }}
                          title={p.status === 'PENDING' ? 'Review' : 'View details'}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {p.status === 'PENDING' ? 'Review' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingParticipation} onOpenChange={(open) => !open && handleCloseReview()}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reviewingParticipation?.status === 'PENDING' ? 'Review Participation' : 'Participation Details'}
            </DialogTitle>
          </DialogHeader>

          {reviewingParticipation && (
            <div className="space-y-4">
              {/* Participant info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Participant</h4>
                <p className="font-medium">{reviewingParticipation.participantName || '—'}</p>
                <p className="text-sm text-muted-foreground">
                  {reviewingParticipation.participantEmail || '—'}
                </p>
              </div>

              {/* Campaign info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Campaign</h4>
                <p className="font-medium">{reviewingParticipation.campaignName}</p>
              </div>

              {/* Submitted data */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Submitted Data
                </h4>
                {(() => {
                  const { display, isUrl, isJson } = extractSubmittedValue(reviewingParticipation.submittedData);
                  if (isJson) {
                    return (
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                        {display}
                      </pre>
                    );
                  }
                  if (isUrl) {
                    return (
                      <a
                        href={display}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {display}
                      </a>
                    );
                  }
                  return <p className="text-sm break-words">{display}</p>;
                })()}
              </div>

              {/* Admin note */}
              {reviewingParticipation.status === 'PENDING' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin note (optional)</label>
                  <Textarea
                    placeholder="Add a note for the participant..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              {/* Existing admin note when viewing approved/rejected */}
              {reviewingParticipation.status !== 'PENDING' && reviewingParticipation.adminNote && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Admin note</h4>
                  <p className="text-sm">{reviewingParticipation.adminNote}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCloseReview}>
                  Close
                </Button>
                {reviewingParticipation.status === 'PENDING' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview('REJECTED')}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleReview('APPROVED')}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Page ====================

export default function AdminCampaignParticipations() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: () => campaignService.getAllCampaigns(),
  });

  return (
    <AdminLayout
      title="Campaign Participations"
      description="Review and manage vendor and user campaign submissions"
    >
      <div className="space-y-6">
        <Tabs defaultValue="vendor" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vendor">Vendor Submissions</TabsTrigger>
            <TabsTrigger value="user">User Submissions</TabsTrigger>
          </TabsList>
          <TabsContent value="vendor" className="mt-4">
            <ParticipationTabContent role="VENDOR" campaigns={campaigns} />
          </TabsContent>
          <TabsContent value="user" className="mt-4">
            <ParticipationTabContent role="USER" campaigns={campaigns} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
