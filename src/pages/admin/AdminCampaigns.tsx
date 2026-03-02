import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminLayout from '@/components/admin/AdminLayout';
import { ImageUpload } from '@/components/ImageUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Megaphone, Search, Plus, Edit, Loader2, Trash2, Eye, EyeOff, Clock,
  CalendarDays, Upload, X, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import {
  campaignService,
  EventCampaign,
  EventCampaignRequest,
  CampaignType,
  CAMPAIGN_TYPE_LABELS,
  TARGET_ROLE_LABELS,
  VERIFICATION_METHOD_LABELS,
  ACTION_TYPE_LABELS,
  PROOF_TYPE_LABELS,
  REWARD_TYPE_LABELS,
  REWARD_DURATION_LABELS,
  VENDOR_REWARD_TYPES,
  USER_REWARD_TYPES,
} from '@/services/campaignService';
import { adminService } from '@/services/adminService';

// ==================== Schema ====================

const campaignFormSchema = z.object({
  campaignType: z.enum(['PRODUCT_EVENT', 'VENDOR_PARTICIPATION', 'USER_PARTICIPATION']),
  name: z.string().min(1, 'Campaign name is required').max(255),
  description: z.string().max(1000).optional().default(''),
  startDateTime: z.string().min(1, 'Start date/time is required'),
  endDateTime: z.string().min(1, 'End date/time is required'),
  active: z.boolean().default(false),
  displayPriority: z.coerce.number().min(0).default(0),
  subCategoryId: z.string().optional(),
  targetRole: z.enum(['ALL', 'VENDOR', 'USER']).optional(),
  actionType: z.string().optional(),
  proofType: z.string().optional(),
  proofDescription: z.string().max(500).optional().default(''),
  verificationMethod: z.string().optional(),
  ctaText: z.string().max(100).optional().default(''),
  ctaUrl: z.string().max(500).optional().default(''),
  rewardType: z.string().optional(),
  rewardValue: z.coerce.number().min(0).optional(),
  rewardDurationType: z.string().optional(),
  rewardDurationDays: z.coerce.number().min(0).optional(),
  eligibilityRules: z.string().optional().default(''),
}).refine((data) => {
  if (data.startDateTime && data.endDateTime) {
    return new Date(data.endDateTime) > new Date(data.startDateTime);
  }
  return true;
}, {
  message: 'End date/time must be after start date/time',
  path: ['endDateTime'],
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

// ==================== Status Badge ====================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LIVE: 'bg-green-100 text-green-800 border-green-200',
    SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
    EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
    DISABLED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    DRAFT: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return (
    <Badge variant="outline" className={styles[status] || 'bg-gray-100 text-gray-600'}>
      {status === 'LIVE' && <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />}
      {status}
    </Badge>
  );
}

// ==================== Type Badge ====================

function TypeBadge({ type }: { type: CampaignType }) {
  const styles: Record<CampaignType, string> = {
    PRODUCT_EVENT: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    VENDOR_PARTICIPATION: 'bg-amber-100 text-amber-800 border-amber-200',
    USER_PARTICIPATION: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <Badge variant="outline" className={`whitespace-nowrap ${styles[type]}`}>
      {CAMPAIGN_TYPE_LABELS[type]}
    </Badge>
  );
}

// ==================== Helpers ====================

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toInputDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getTargetDisplay(campaign: EventCampaign): string {
  if (campaign.campaignType === 'PRODUCT_EVENT') {
    return campaign.subCategoryName || campaign.subCategorySlug || '—';
  }
  return TARGET_ROLE_LABELS[campaign.targetRole || 'ALL'];
}

const CAMPAIGN_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PRODUCT_EVENT', label: 'Product / Event' },
  { value: 'VENDOR_PARTICIPATION', label: 'Vendor' },
  { value: 'USER_PARTICIPATION', label: 'User' },
];

const PARTICIPATION_TYPES: CampaignType[] = ['VENDOR_PARTICIPATION', 'USER_PARTICIPATION'];

// ==================== Component ====================

export default function AdminCampaigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EventCampaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      campaignType: 'PRODUCT_EVENT',
      name: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      active: false,
      displayPriority: 0,
      subCategoryId: '',
      targetRole: 'ALL',
      actionType: '',
      proofType: '',
      proofDescription: '',
      verificationMethod: '',
      ctaText: '',
      ctaUrl: '',
      rewardType: '',
      rewardValue: undefined,
      rewardDurationType: '',
      rewardDurationDays: undefined,
      eligibilityRules: '',
    },
  });

  const campaignType = form.watch('campaignType');
  const isParticipation = PARTICIPATION_TYPES.includes(campaignType);
  const maxStep = isParticipation ? 4 : 2;

  // ---- Data queries ----

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: () => campaignService.getAllCampaigns(),
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: ['campaign-subcategories'],
    queryFn: async () => {
      const categories = await adminService.getCategories();
      const subCategoryGroups = await Promise.allSettled(
        categories.map(async (cat: { id: number; name: string }) => {
          const subs = await adminService.getSubCategories(cat.id);
          return subs.map((sub: { id: number; name: string }) => ({
            ...sub,
            parentCategoryName: cat.name,
          }));
        })
      );
      return subCategoryGroups
        .filter((result): result is PromiseFulfilledResult<{ id: number; name: string; parentCategoryName: string }[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value);
    },
  });

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: async (data: EventCampaignRequest) => {
      const campaign = await campaignService.createCampaign(data);
      if (pendingImageFiles.length > 0) {
        try {
          setIsUploadingImage(true);
          await campaignService.uploadCampaignImage(campaign.id, pendingImageFiles[0]);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          toast({ title: 'Warning', description: 'Campaign created but image upload failed: ' + msg, variant: 'destructive' });
        } finally {
          setIsUploadingImage(false);
        }
      }
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: 'Campaign created successfully' });
      closeDialog();
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to create campaign';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventCampaignRequest }) => {
      const campaign = await campaignService.updateCampaign(id, data);
      if (pendingImageFiles.length > 0) {
        try {
          setIsUploadingImage(true);
          await campaignService.uploadCampaignImage(id, pendingImageFiles[0]);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          toast({ title: 'Warning', description: 'Campaign updated but image upload failed: ' + msg, variant: 'destructive' });
        } finally {
          setIsUploadingImage(false);
        }
      }
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: 'Campaign updated successfully' });
      closeDialog();
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to update campaign';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => campaignService.toggleCampaign(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: `Campaign ${result.active ? 'activated' : 'deactivated'}` });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to toggle campaign';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: 'Campaign deleted successfully' });
      setDeletingCampaignId(null);
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to delete campaign';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  // ---- Handlers ----

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingCampaign(null);
    setPendingImageFiles([]);
    setStep(1);
    form.reset();
  }

  function openCreate() {
    setEditingCampaign(null);
    setPendingImageFiles([]);
    setStep(1);
    form.reset({
      campaignType: 'PRODUCT_EVENT',
      name: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      active: false,
      displayPriority: 0,
      subCategoryId: '',
      targetRole: 'ALL',
      actionType: '',
      proofType: '',
      proofDescription: '',
      verificationMethod: '',
      ctaText: '',
      ctaUrl: '',
      rewardType: '',
      rewardValue: undefined,
      rewardDurationType: '',
      rewardDurationDays: undefined,
      eligibilityRules: '',
    });
    setIsDialogOpen(true);
  }

  function openEdit(campaign: EventCampaign) {
    setEditingCampaign(campaign);
    setPendingImageFiles([]);
    setStep(1);
    form.reset({
      campaignType: campaign.campaignType,
      name: campaign.name,
      description: campaign.description || '',
      startDateTime: toInputDateTimeLocal(campaign.startDateTime),
      endDateTime: toInputDateTimeLocal(campaign.endDateTime),
      active: campaign.active,
      displayPriority: campaign.displayPriority ?? 0,
      subCategoryId: campaign.subCategoryId ? String(campaign.subCategoryId) : '',
      targetRole: campaign.targetRole || 'ALL',
      actionType: campaign.actionType || '',
      proofType: campaign.proofType || '',
      proofDescription: campaign.proofDescription || '',
      verificationMethod: campaign.verificationMethod || '',
      ctaText: campaign.ctaText || '',
      ctaUrl: campaign.ctaUrl || '',
      rewardType: campaign.rewardType || '',
      rewardValue: campaign.rewardValue ?? undefined,
      rewardDurationType: campaign.rewardDurationType || '',
      rewardDurationDays: campaign.rewardDurationDays ?? undefined,
      eligibilityRules: campaign.eligibilityRules || '',
    });
    setIsDialogOpen(true);
  }

  async function validateStep(): Promise<boolean> {
    const values = form.getValues();

    if (step === 1) {
      return (await form.trigger(['name', 'description', 'startDateTime', 'endDateTime', 'active', 'displayPriority', 'campaignType'])) as boolean;
    }

    if (step === 2) {
      if (campaignType === 'PRODUCT_EVENT') {
        return (await form.trigger(['subCategoryId'])) as boolean;
      }
      return (await form.trigger(['targetRole', 'actionType', 'proofType', 'proofDescription', 'verificationMethod'])) as boolean;
    }

    if (step === 3) {
      return (await form.trigger(['rewardType', 'rewardValue', 'rewardDurationType', 'rewardDurationDays'])) as boolean;
    }

    if (step === 4) {
      const rules = values.eligibilityRules?.trim();
      if (rules) {
        try {
          JSON.parse(rules);
        } catch {
          form.setError('eligibilityRules', { message: 'Invalid JSON format' });
          return false;
        }
      }
      return true;
    }

    return true;
  }

  async function handleNext() {
    const valid = await validateStep();
    if (valid && step < maxStep) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 1) setStep(step - 1);
  }

  function buildPayload(values: CampaignFormValues): EventCampaignRequest {
    const base: EventCampaignRequest = {
      name: values.name,
      description: values.description || '',
      startDateTime: new Date(values.startDateTime).toISOString(),
      endDateTime: new Date(values.endDateTime).toISOString(),
      active: values.active,
      campaignType: values.campaignType,
      displayPriority: values.displayPriority ?? 0,
      ctaText: values.ctaText || null,
      ctaUrl: values.ctaUrl || null,
    };

    if (values.campaignType === 'PRODUCT_EVENT') {
      return {
        ...base,
        subCategoryId: values.subCategoryId ? Number(values.subCategoryId) : null,
      };
    }

    return {
      ...base,
      targetRole: values.targetRole as EventCampaignRequest['targetRole'],
      actionType: (values.actionType || null) as EventCampaignRequest['actionType'],
      proofType: (values.proofType || null) as EventCampaignRequest['proofType'],
      proofDescription: values.proofDescription || null,
      verificationMethod: (values.verificationMethod || null) as EventCampaignRequest['verificationMethod'],
      rewardType: (values.rewardType || null) as EventCampaignRequest['rewardType'],
      rewardValue: values.rewardValue ?? null,
      rewardDurationType: (values.rewardDurationType || null) as EventCampaignRequest['rewardDurationType'],
      rewardDurationDays: values.rewardDurationDays ?? null,
      eligibilityRules: values.eligibilityRules?.trim() || null,
    };
  }

  async function onSubmit(values: CampaignFormValues) {
    if (step < maxStep) {
      await handleNext();
      return;
    }

    const payload = buildPayload(values);

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // ---- Filtering ----

  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subCategoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || c.campaignType === typeFilter;
    return matchesSearch && matchesType;
  });

  // ---- Stats ----

  const liveCount = campaigns.filter((c) => c.status === 'LIVE').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'SCHEDULED').length;
  const expiredCount = campaigns.filter((c) => c.status === 'EXPIRED').length;

  const isSaving = createMutation.isPending || updateMutation.isPending || isUploadingImage;

  // ==================== Render ====================

  return (
    <AdminLayout title="Campaigns" description="Create and manage promotional campaigns, product banners, and participation campaigns">
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Megaphone className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live</p>
                <p className="text-2xl font-bold text-green-600">{liveCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <EyeOff className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-gray-500">{expiredCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPE_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate} className="bg-eagle-green hover:bg-eagle-green/90 whitespace-nowrap text-white">
            <Plus className="mr-2 h-4 w-4 text-white" /> New Campaign
          </Button>
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
                <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No campaigns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Participations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {campaign.imageUrl ? (
                              <img
                                src={campaign.imageUrl}
                                alt={campaign.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                              />
                            ) : (
                              <Upload className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {campaign.name}
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={campaign.campaignType} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTargetDisplay(campaign)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <CalendarDays className="inline h-3.5 w-3.5 mr-1" />
                          {formatDateTime(campaign.startDateTime)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <CalendarDays className="inline h-3.5 w-3.5 mr-1" />
                          {formatDateTime(campaign.endDateTime)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={campaign.status} />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={campaign.active}
                            onCheckedChange={() => toggleMutation.mutate(campaign.id)}
                            disabled={toggleMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          {PARTICIPATION_TYPES.includes(campaign.campaignType) ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{campaign.participationCount ?? 0}</span>
                              <span className="text-muted-foreground text-xs">
                                ({campaign.approvedCount ?? 0} approved / {campaign.pendingCount ?? 0} pending)
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(campaign)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCampaignId(campaign.id)}
                              title="Delete"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 py-2 border-b">
            {[1, 2, ...(isParticipation ? [3, 4] : [])].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  s === step ? 'bg-eagle-green text-white' : s < step ? 'bg-eagle-green/30 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
            ))}
            {isParticipation && (
              <>
                <span className="text-muted-foreground text-xs px-1">|</span>
                <span className="text-xs text-muted-foreground">
                  {step === 1 && 'Basics'}
                  {step === 2 && 'Configuration'}
                  {step === 3 && 'Rewards'}
                  {step === 4 && 'Eligibility'}
                </span>
              </>
            )}
            {!isParticipation && (
              <>
                <span className="text-muted-foreground text-xs px-1">|</span>
                <span className="text-xs text-muted-foreground">
                  {step === 1 && 'Basics'}
                  {step === 2 && 'Configuration'}
                </span>
              </>
            )}
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && step < maxStep) {
                  e.preventDefault();
                }
              }}
              className="space-y-5"
            >
              {/* Step 1 - Basics */}
              {step === 1 && (
                <>
                  <FormField control={form.control} name="campaignType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {CAMPAIGN_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Product/Event: banner linking to shop. Vendor/User: participation campaigns with rewards.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mother's Day 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short promotional description..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banner Image</label>
                    {editingCampaign?.imageUrl && pendingImageFiles.length === 0 && (
                      <div className="relative rounded-lg overflow-hidden border bg-muted h-44 group">
                        <img
                          src={editingCampaign.imageUrl}
                          alt="Current banner"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                await campaignService.deleteCampaignImage(editingCampaign.id);
                                setEditingCampaign({ ...editingCampaign, imageUrl: null });
                                queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
                                toast({ title: 'Image removed' });
                              } catch (err: unknown) {
                                const msg = err instanceof Error ? err.message : 'Failed to remove image';
                                toast({ title: 'Error', description: msg, variant: 'destructive' });
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-1" /> Remove Image
                          </Button>
                        </div>
                      </div>
                    )}
                    {(!editingCampaign?.imageUrl || pendingImageFiles.length > 0) && (
                      <ImageUpload
                        maxImages={1}
                        onFilesSelected={(files) => setPendingImageFiles(files)}
                        isUploading={isUploadingImage}
                        label=""
                        helperText="Drag and drop a banner image, or click to select (1200×600 recommended)"
                        showPrimarySelector={false}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDateTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="endDateTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="displayPriority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Priority</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormDescription>Higher number = higher priority in carousel</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="active" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Campaign will be visible when active and within the date range
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 2 - Configuration */}
              {step === 2 && (
                <>
                  {campaignType === 'PRODUCT_EVENT' && (
                    <FormField control={form.control} name="subCategoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subcategory" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subCategories.map((sub: { id: number; name: string; parentCategoryName?: string }) => (
                              <SelectItem key={sub.id} value={String(sub.id)}>
                                {sub.parentCategoryName ? `${sub.parentCategoryName} • ${sub.name}` : sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Users will be directed to this subcategory when they click the CTA</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {isParticipation && (
                    <>
                      <FormField control={form.control} name="targetRole" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Role *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(TARGET_ROLE_LABELS) as ('ALL' | 'VENDOR' | 'USER')[]).map((r) => (
                                <SelectItem key={r} value={r}>
                                  {TARGET_ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="actionType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(ACTION_TYPE_LABELS) as (keyof typeof ACTION_TYPE_LABELS)[]).map((a) => (
                                <SelectItem key={a} value={a}>
                                  {ACTION_TYPE_LABELS[a]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="proofType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select proof type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(PROOF_TYPE_LABELS) as (keyof typeof PROOF_TYPE_LABELS)[]).map((p) => (
                                <SelectItem key={p} value={p}>
                                  {PROOF_TYPE_LABELS[p]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="proofDescription" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe what participants need to submit..." rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="verificationMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Method *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(VERIFICATION_METHOD_LABELS) as (keyof typeof VERIFICATION_METHOD_LABELS)[]).map((v) => (
                                <SelectItem key={v} value={v}>
                                  {VERIFICATION_METHOD_LABELS[v]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </>
                  )}

                  <FormField control={form.control} name="ctaText" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Text</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Shop Now" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="ctaUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 3 - Rewards (participation only) */}
              {step === 3 && isParticipation && (
                <>
                  <FormField control={form.control} name="rewardType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reward type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(campaignType === 'VENDOR_PARTICIPATION' ? VENDOR_REWARD_TYPES : USER_REWARD_TYPES).map((r) => (
                            <SelectItem key={r} value={r}>
                              {REWARD_TYPE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rewardValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Value</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="e.g. 10" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormDescription>Percentage or fixed amount depending on reward type</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rewardDurationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Duration Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(REWARD_DURATION_LABELS) as (keyof typeof REWARD_DURATION_LABELS)[]).map((d) => (
                            <SelectItem key={d} value={d}>
                              {REWARD_DURATION_LABELS[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rewardDurationDays" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g. 30" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormDescription>Used when duration type is Fixed Period</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 4 - Eligibility (participation only) */}
              {step === 4 && isParticipation && (
                <FormField control={form.control} name="eligibilityRules" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eligibility Rules (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`{
  "vendorApproved": true,
  "vendorCategoryIds": [1, 3],
  "vendorCities": ["Addis Ababa", "Hawassa"],
  "registeredWithinCampaignWindow": true,
  "minAccountAgeDays": 30
}`}
                        rows={8}
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional JSON defining who can participate. Supported keys — Common: minAccountAgeDays. Users: emailVerified, minProductOrders, minServiceBookings, minEventOrders. Vendors: vendorApproved, minCompletedProductOrders, minPaidServiceOrders, minPaidEventOrders, minPaidCustomOrders, minTotalRevenueMinor, registeredWithinCampaignWindow (bool), vendorCategoryIds (array of IDs), vendorCities (array of city names).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                <div>
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handlePrev}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {step < maxStep ? (
                    <Button type="button" onClick={handleNext} className="bg-eagle-green hover:bg-eagle-green/90 text-white">
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSaving} className="bg-eagle-green hover:bg-eagle-green/90 text-white">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingCampaignId !== null} onOpenChange={(open) => { if (!open) setDeletingCampaignId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCampaignId && deleteMutation.mutate(deletingCampaignId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
