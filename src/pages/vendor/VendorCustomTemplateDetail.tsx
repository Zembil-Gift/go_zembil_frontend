import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { vendorService } from "@/services/vendorService";
import { getAllTemplateImages } from "@/utils/imageUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Image as ImageIcon,
  FileText,
  Hash,
  Video,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CustomOrderTemplate, CustomizationFieldType } from "@/types/customOrders";

export default function VendorCustomTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor && isInitialized,
  });

  // Fetch template details (wait for auth so currency is correct)
  const { data: template, isLoading, error } = useQuery({
    queryKey: ['custom-template', id, user?.preferredCurrencyCode ?? 'default'],
    queryFn: () => customOrderTemplateService.getById(Number(id)),
    enabled: !!id && isAuthenticated && isVendor && isInitialized,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => customOrderTemplateService.delete(Number(id)),
    onSuccess: async () => {
      toast({ title: "Success", description: "Template deleted successfully" });
      await queryClient.invalidateQueries({ queryKey: ['vendor', 'custom-templates'] });
      navigate('/vendor/custom-templates');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete template", variant: "destructive" });
    },
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: (price: number) => customOrderTemplateService.update(Number(id), { basePrice: price }),
    onSuccess: async () => {
      toast({ title: "Success", description: "Price updated successfully" });
      await queryClient.invalidateQueries({ queryKey: ['custom-template', id] });
      setEditPriceDialogOpen(false);
      setNewPrice("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update price", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: CustomOrderTemplate['status']) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFieldTypeIcon = (fieldType: CustomizationFieldType) => {
    switch (fieldType) {
      case 'TEXT':
        return <FileText className="h-4 w-4" />;
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

  const handleUpdatePrice = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }
    updatePriceMutation.mutate(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Template Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The template you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild>
              <Link to="/vendor/custom-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if this template belongs to the current vendor
  if (vendorProfile && template.vendorId !== vendorProfile.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view this template.
            </p>
            <Button asChild>
              <Link to="/vendor/custom-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = template.status === 'PENDING_APPROVAL';
  const canDelete = template.status === 'PENDING_APPROVAL';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/vendor/custom-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-eagle-green">{template.name}</h1>
              <p className="text-muted-foreground">Template Details</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button asChild variant="outline">
                <Link to={`/vendor/custom-templates/${template.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Template Information</CardTitle>
                  {getStatusBadge(template.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 text-gray-900">{template.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-viridian-green" />
                      <span>{template.categoryName || 'Uncategorized'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-viridian-green" />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {template.status === 'REJECTED' && template.rejectionReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Rejection Reason</p>
                        <p className="text-red-700 mt-1">{template.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approved By */}
                {template.status === 'APPROVED' && template.approvedByName && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Approved</p>
                        <p className="text-green-700 text-sm mt-1">
                          By {template.approvedByName} on {template.approvedAt ? new Date(template.approvedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customization Fields Card */}
            <Card>
              <CardHeader>
                <CardTitle>Customization Fields</CardTitle>
                <CardDescription>
                  Fields that customers will fill out when ordering
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template.fields && template.fields.length > 0 ? (
                  <div className="space-y-3">
                    {template.fields
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-viridian-green/10 rounded-full flex items-center justify-center">
                            {getFieldTypeIcon(field.fieldType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{field.fieldName}</span>
                              <Badge variant="outline" className="text-xs">
                                {field.fieldType}
                              </Badge>
                              {field.required && (
                                <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                              )}
                            </div>
                            {field.description && (
                              <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No customization fields defined
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Images Card */}
            {getAllTemplateImages(template.images).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Template Images</CardTitle>
                  <CardDescription>
                    {getAllTemplateImages(template.images).length} image{getAllTemplateImages(template.images).length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {getAllTemplateImages(template.images).map((imageUrl, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden border bg-gray-100"
                        >
                          <img
                            src={imageUrl}
                            alt={`Template image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pricing
                  {template.negotiable === false && (
                    <Badge className="bg-viridian-green/10 text-viridian-green border-viridian-green/30">
                      Fixed Price
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-eagle-green">
                    {customOrderTemplateService.formatVendorTemplatePrice(template)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your earnings per order
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.negotiable === false ? 'Fixed price (no negotiation)' : 'Base price (negotiable)'}
                  </p>
                  
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        const priceInfo = customOrderTemplateService.getVendorTemplatePrice(template);
                        setNewPrice(priceInfo ? priceInfo.amount.toString() : "");
                        setEditPriceDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Price
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pricing Type</span>
                  <Badge variant="outline" className={template.negotiable === false 
                    ? "bg-viridian-green/5 text-viridian-green border-viridian-green/20" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                  }>
                    {template.negotiable === false ? 'Fixed' : 'Negotiable'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Customization Fields</span>
                  <span className="font-medium">{template.fields?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Images</span>
                  <span className="font-medium">{template.images?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Required Fields</span>
                  <span className="font-medium">
                    {template.fields?.filter(f => f.required).length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Price Dialog */}
      <Dialog open={editPriceDialogOpen} onOpenChange={setEditPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Base Price</DialogTitle>
            <DialogDescription>
              Enter the new base price for this template (in ETB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPrice">Base Price (ETB)</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdatePrice}
              disabled={updatePriceMutation.isPending}
            >
              {updatePriceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Price'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
