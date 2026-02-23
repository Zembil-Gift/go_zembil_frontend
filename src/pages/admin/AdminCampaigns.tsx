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
  CalendarDays, Upload, X,
} from 'lucide-react';
import { campaignService, EventCampaign, EventCampaignRequest } from '@/services/campaignService';
import { adminService } from '@/services/adminService';

// ==================== Schema ====================

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  description: z.string().max(1000).optional().default(''),
  startDateTime: z.string().min(1, 'Start date/time is required'),
  endDateTime: z.string().min(1, 'End date/time is required'),
  subCategoryId: z.string().min(1, 'Subcategory is required'),
  active: z.boolean().default(false),
}).refine((data) => {
  if (data.startDateTime && data.endDateTime) {
    return new Date(data.endDateTime) > new Date(data.startDateTime);
  }
  return true;
}, {
  message: 'End date/time must be after start date/time',
  path: ['endDateTime'],
});

type CampaignForm = z.infer<typeof campaignSchema>;

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

// ==================== Component ====================

export default function AdminCampaigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EventCampaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      subCategoryId: '',
      active: false,
    },
  });

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
        categories.map(async (cat: any) => {
          const subs = await adminService.getSubCategories(cat.id);
          return subs.map((sub: any) => ({
            ...sub,
            parentCategoryName: cat.name,
          }));
        })
      );
      return subCategoryGroups
        .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value);
    },
  });

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: async (data: EventCampaignRequest) => {
      // Phase 1: Create campaign
      const campaign = await campaignService.createCampaign(data);
      // Phase 2: Upload image if selected
      if (pendingImageFiles.length > 0) {
        try {
          setIsUploadingImage(true);
          await campaignService.uploadCampaignImage(campaign.id, pendingImageFiles[0]);
        } catch (err: any) {
          toast({ title: 'Warning', description: 'Campaign created but image upload failed: ' + (err.message || 'Unknown error'), variant: 'destructive' });
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
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create campaign', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventCampaignRequest }) => {
      // Phase 1: Update campaign data
      const campaign = await campaignService.updateCampaign(id, data);
      // Phase 2: Upload new image if selected
      if (pendingImageFiles.length > 0) {
        try {
          setIsUploadingImage(true);
          await campaignService.uploadCampaignImage(id, pendingImageFiles[0]);
        } catch (err: any) {
          toast({ title: 'Warning', description: 'Campaign updated but image upload failed: ' + (err.message || 'Unknown error'), variant: 'destructive' });
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
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update campaign', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => campaignService.toggleCampaign(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: `Campaign ${result.active ? 'activated' : 'deactivated'}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to toggle campaign', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      toast({ title: 'Success', description: 'Campaign deleted successfully' });
      setDeletingCampaignId(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete campaign', variant: 'destructive' });
    },
  });

  // ---- Handlers ----

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingCampaign(null);
    setPendingImageFiles([]);
    form.reset();
  }

  function openCreate() {
    setEditingCampaign(null);
    setPendingImageFiles([]);
    form.reset({
      name: '', description: '', startDateTime: '', endDateTime: '', subCategoryId: '', active: false,
    });
    setIsDialogOpen(true);
  }

  function openEdit(campaign: EventCampaign) {
    setEditingCampaign(campaign);
    setPendingImageFiles([]);
    form.reset({
      name: campaign.name,
      description: campaign.description || '',
      startDateTime: toInputDateTimeLocal(campaign.startDateTime),
      endDateTime: toInputDateTimeLocal(campaign.endDateTime),
      subCategoryId: String(campaign.subCategoryId),
      active: campaign.active,
    });
    setIsDialogOpen(true);
  }

  function onSubmit(values: CampaignForm) {
    const payload: EventCampaignRequest = {
      name: values.name,
      description: values.description || '',
      startDateTime: new Date(values.startDateTime).toISOString(),
      endDateTime: new Date(values.endDateTime).toISOString(),
      subCategoryId: Number(values.subCategoryId),
      active: values.active,
    };

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // ---- Filtering ----

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subCategoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---- Stats ----

  const liveCount = campaigns.filter((c) => c.status === 'LIVE').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'SCHEDULED').length;
  const expiredCount = campaigns.filter((c) => c.status === 'EXPIRED').length;

  const isSaving = createMutation.isPending || updateMutation.isPending || isUploadingImage;

  // ==================== Render ====================

  return (
    <AdminLayout title="Event Campaigns" description="Create and manage time-based promotional campaign banners">
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
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                      <TableHead>Subcategory</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
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
                          <Badge variant="secondary">{campaign.subCategoryName}</Badge>
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
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(campaign)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mother's Day 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Short promotional description..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Banner Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Banner Image {!editingCampaign && '*'}</label>
                {/* Show existing image when editing */}
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
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message || 'Failed to remove image', variant: 'destructive' });
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove Image
                      </Button>
                    </div>
                  </div>
                )}
                {/* Upload zone — shown when no existing image or user wants to replace */}
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
                {/* Button to show upload zone when editing with existing image */}
                {editingCampaign?.imageUrl && pendingImageFiles.length === 0 && (
                  <p className="text-xs text-muted-foreground">Hover over the image to remove it, or it will be kept as-is.</p>
                )}
              </div>

              {/* Subcategory */}
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
                      {subCategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.parentCategoryName ? `${sub.parentCategoryName} • ${sub.name}` : sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Users will be directed to this subcategory when they click "Shop Now"</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Date Range */}
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

              {/* Active Toggle */}
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Campaign will be visible to customers when active and within the date range
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-eagle-green hover:bg-eagle-green/90 text-white">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </Button>
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
