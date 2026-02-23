import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Percent,
  Package,
  Briefcase,
  Layers,
  Pencil,
  Loader2,
  Info,
  CheckCircle,
} from 'lucide-react';
import {
  adminService,
  PlatformCommissionRateDto,
  UpdateCommissionRateRequest,
} from '@/services/adminService';

const VENDOR_TYPE_CONFIG: Record<string, { label: string; description: string; icon: React.ElementType; color: string }> = {
  PRODUCT: {
    label: 'Product Vendors',
    description: 'Vendors selling physical goods. Revenue is recognized on delivery confirmation.',
    icon: Package,
    color: 'bg-blue-100 text-blue-800',
  },
  SERVICE: {
    label: 'Service Vendors',
    description: 'Vendors providing services, events, and experiences. Revenue is recognized on service completion.',
    icon: Briefcase,
    color: 'bg-green-100 text-green-800',
  },
  HYBRID: {
    label: 'Hybrid Vendors',
    description: 'Vendors selling both products and services. Each line item is tracked separately.',
    icon: Layers,
    color: 'bg-purple-100 text-purple-800',
  },
};

export default function AdminCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<PlatformCommissionRateDto | null>(null);
  const [editForm, setEditForm] = useState<UpdateCommissionRateRequest>({
    commissionPercentage: 0,
    description: '',
  });

  // Fetch all commission rates
  const { data: commissionRates = [], isLoading } = useQuery({
    queryKey: ['admin', 'commission-rates'],
    queryFn: () => adminService.getCommissionRates(),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ vendorType, data }: { vendorType: string; data: UpdateCommissionRateRequest }) =>
      adminService.updateCommissionRate(vendorType, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission-rates'] });
      toast({
        title: 'Commission Rate Updated',
        description: `${VENDOR_TYPE_CONFIG[updated.vendorType]?.label || updated.vendorType} commission set to ${updated.commissionPercentage}%`,
      });
      setEditDialogOpen(false);
      setEditingRate(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update commission rate',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (rate: PlatformCommissionRateDto) => {
    setEditingRate(rate);
    setEditForm({
      commissionPercentage: rate.commissionPercentage,
      description: rate.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingRate) return;
    updateMutation.mutate({
      vendorType: editingRate.vendorType,
      data: editForm,
    });
  };

  // Sort rates in consistent order: PRODUCT, SERVICE, HYBRID
  const sortedRates = [...commissionRates].sort((a, b) => {
    const order = ['PRODUCT', 'SERVICE', 'HYBRID'];
    return order.indexOf(a.vendorType) - order.indexOf(b.vendorType);
  });

  return (
    <AdminLayout
      title="Platform Commission"
      description="Manage commission rates by vendor type. These rates determine the platform fee added to customer-facing prices."
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Commission Works</p>
              <p>
                The platform commission is added on top of the vendor's price to determine the customer-facing price.
                For example, a vendor price of $100 with a 10% commission results in a customer price of $110.
                For VAT-registered vendors, the commission is calculated on the net price (excluding VAT).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Commission Rate Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
            <span className="ml-3 text-muted-foreground">Loading commission rates...</span>
          </div>
        ) : sortedRates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">No commission rates configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Commission rates will be seeded automatically when the database migration runs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sortedRates.map((rate) => {
              const config = VENDOR_TYPE_CONFIG[rate.vendorType];
              const Icon = config?.icon || Package;

              return (
                <Card key={rate.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary-blue" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-blue/10">
                          <Icon className="h-5 w-5 text-primary-blue" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{config?.label || rate.vendorType}</CardTitle>
                          <Badge variant="secondary" className={`mt-1 text-xs ${config?.color || ''}`}>
                            {rate.vendorType}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rate)}
                        title="Edit commission rate"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Commission Rate Display */}
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <div className="text-4xl font-bold text-primary-blue">
                        {rate.commissionPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Commission Rate</div>
                    </div>

                    {/* Description */}
                    {rate.description && (
                      <p className="text-sm text-muted-foreground">{rate.description}</p>
                    )}
                    {!rate.description && config?.description && (
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
                      {rate.updatedBy && (
                        <p>Last updated by: <span className="font-medium">{rate.updatedBy}</span></p>
                      )}
                      {rate.updatedAt && (
                        <p>Updated: {new Date(rate.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</p>
                      )}
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{rate.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Example Pricing Table */}
        {sortedRates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Example</CardTitle>
              <CardDescription>
                How a $100 vendor price translates to customer price for each vendor type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Vendor Type</th>
                      <th className="text-right py-2 px-3 font-medium">Commission</th>
                      <th className="text-right py-2 px-3 font-medium">Vendor Price</th>
                      <th className="text-right py-2 px-3 font-medium">Platform Fee</th>
                      <th className="text-right py-2 px-3 font-medium">Customer Pays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRates.map((rate) => {
                      const vendorPrice = 100;
                      const platformFee = vendorPrice * rate.commissionRate;
                      const customerPrice = vendorPrice + platformFee;
                      return (
                        <tr key={rate.id} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium">
                            {VENDOR_TYPE_CONFIG[rate.vendorType]?.label || rate.vendorType}
                          </td>
                          <td className="text-right py-2 px-3">{rate.commissionPercentage.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3">${vendorPrice.toFixed(2)}</td>
                          <td className="text-right py-2 px-3 text-primary-blue font-medium">
                            ${platformFee.toFixed(2)}
                          </td>
                          <td className="text-right py-2 px-3 font-bold">${customerPrice.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Commission Rate
            </DialogTitle>
            <DialogDescription>
              {editingRate && (
                <>Update the commission rate for <strong>{VENDOR_TYPE_CONFIG[editingRate.vendorType]?.label || editingRate.vendorType}</strong>. The rate must be between 5% and 30%.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commissionPercentage">Commission Percentage (%)</Label>
              <div className="relative">
                <Input
                  id="commissionPercentage"
                  type="number"
                  step="0.1"
                  min="5"
                  max="30"
                  value={editForm.commissionPercentage}
                  onChange={(e) =>
                    setEditForm({ ...editForm, commissionPercentage: parseFloat(e.target.value) || 0 })
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the commission as a percentage (e.g., 10.0 for 10%). Allowed range: 5% – 30%.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="E.g., Updated commission rate for Q1 2026"
                rows={3}
              />
            </div>

            {/* Preview */}
            {editForm.commissionPercentage > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium">Preview (on a $100 vendor price)</p>
                <p>Platform fee: <span className="font-medium text-primary-blue">${(100 * editForm.commissionPercentage / 100).toFixed(2)}</span></p>
                <p>Customer pays: <span className="font-bold">${(100 + 100 * editForm.commissionPercentage / 100).toFixed(2)}</span></p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || editForm.commissionPercentage < 5 || editForm.commissionPercentage > 30}
              className="bg-primary-blue text-white hover:bg-primary-blue/90"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
