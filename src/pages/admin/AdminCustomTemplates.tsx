import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2,
  Eye,
  Check,
  X,
  Clock,
  FileText,
  DollarSign,
  Tag,
  Store,
  Type,
  Hash,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { customOrderTemplateService } from '@/services/customOrderTemplateService';
import type { CustomOrderTemplate } from '@/types/customOrders';

export default function AdminCustomTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<CustomOrderTemplate | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch pending templates
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['admin', 'pending-custom-templates'],
    queryFn: () => customOrderTemplateService.getPending(0, 100),
  });

  const pendingTemplates = pendingData?.content || [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (templateId: number) => customOrderTemplateService.approve(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-custom-templates'] });
      toast({ title: 'Success', description: 'Template approved successfully' });
      setShowViewDialog(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to approve template',
        variant: 'destructive' 
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ templateId, reason }: { templateId: number; reason: string }) => 
      customOrderTemplateService.reject(templateId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-custom-templates'] });
      toast({ title: 'Success', description: 'Template rejected' });
      setShowRejectDialog(false);
      setShowViewDialog(false);
      setRejectReason('');
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to reject template',
        variant: 'destructive' 
      });
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedTemplate) {
      rejectMutation.mutate({ templateId: selectedTemplate.id, reason: rejectReason });
    }
  };

  const getFieldTypeIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'TEXT':
        return <Type className="h-4 w-4" />;
      case 'NUMBER':
        return <Hash className="h-4 w-4" />;
      case 'IMAGE':
        return <ImageIcon className="h-4 w-4" />;
      case 'VIDEO':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout 
      title="Custom Order Templates" 
      description="Review and approve vendor custom order templates"
    >
      <div className="space-y-6">
        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingTemplates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-eagle-green" />
              Templates Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
              </div>
            ) : pendingTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending templates</h3>
                <p className="text-gray-500">All templates have been reviewed</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {template.description || 'No description'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <span>{template.vendorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.categoryName ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Tag className="h-3 w-3" />
                            {template.categoryName}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {customOrderTemplateService.formatTemplatePrice(template)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.fields.length} fields</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(template.id)}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Template Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              Review the template details before approving or rejecting
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">Template Name</Label>
                  <p className="font-medium text-lg">{selectedTemplate.name}</p>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-500">Description</Label>
                  <p className="text-gray-700">{selectedTemplate.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Vendor</Label>
                    <p className="font-medium">{selectedTemplate.vendorName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Category</Label>
                    <p className="font-medium">{selectedTemplate.categoryName || 'Uncategorized'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Base Price</Label>
                    <p className="font-medium text-lg text-green-600">
                      {customOrderTemplateService.formatTemplatePrice(selectedTemplate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Created</Label>
                    <p className="font-medium">
                      {new Date(selectedTemplate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customization Fields */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">
                  Customization Fields ({selectedTemplate.fields.length})
                </Label>
                <div className="border rounded-lg divide-y">
                  {selectedTemplate.fields
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((field) => (
                      <div key={field.id} className="p-3 flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          {getFieldTypeIcon(field.fieldType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{field.fieldName}</p>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Type: {customOrderTemplateService.getFieldTypeDisplayName(field.fieldType)}
                          </p>
                          {field.description && (
                            <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Template Images */}
              {selectedTemplate.images && selectedTemplate.images.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">
                    Template Images ({selectedTemplate.images.length})
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTemplate.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.fullUrl}
                        alt={image.originalFilename || 'Template image'}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowViewDialog(false);
                setShowRejectDialog(true);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedTemplate && approveMutation.mutate(selectedTemplate.id)}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Template</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this template. The vendor will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
