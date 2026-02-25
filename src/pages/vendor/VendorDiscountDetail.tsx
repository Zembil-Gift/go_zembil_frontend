import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { discountService } from "@/services/discountService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  XCircle,
  Percent,
  Tag,
  Users,
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Package,
  Briefcase,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function VendorDiscountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const discountId = Number(id);

  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data: discount, isLoading } = useQuery({
    queryKey: ['vendor', 'discount', discountId],
    queryFn: () => discountService.getVendorDiscount(discountId),
    enabled: !!discountId,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => discountService.deactivateDiscount(discountId),
    onSuccess: () => {
      toast({ title: "Discount deactivated" });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discount', discountId] });
      setShowDeactivate(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => discountService.reactivateDiscount(discountId),
    onSuccess: () => {
      toast({ title: "Discount reactivated", description: "The discount is now active again." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discount', discountId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  const formatMinor = (amount?: number, currency?: string) => {
    if (amount == null) return '—';
    return `${(amount / 100).toFixed(2)} ${currency || ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!discount) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Discount not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/vendor/discounts')}>
          Back to Discounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/discounts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold font-mono tracking-wider">{discount.code}</h2>
              {discount.isActive && discount.isCurrentlyValid && discount.hasRemainingUses ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Active
                </Badge>
              ) : !discount.isActive ? (
                <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {!discount.isCurrentlyValid ? 'Expired' : 'Limit Reached'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{discount.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/vendor/discounts/${discountId}/usages`}>
              <BarChart3 className="h-4 w-4 mr-1" />
              View Usages
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/vendor/discounts/${discountId}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
          {discount.isActive ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => setShowDeactivate(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 hover:text-green-700"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
            </Button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discount Value */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {discount.discountType === 'PERCENTAGE' ? (
                <Percent className="h-4 w-4 text-blue-600" />
              ) : (
                <Tag className="h-4 w-4 text-purple-600" />
              )}
              Discount Value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">
                {discount.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Value</span>
              <span className="text-sm font-semibold">
                {discount.discountType === 'PERCENTAGE'
                  ? `${discount.discountPercentage}%`
                  : discount.fixedAmount != null && discount.displayCurrencyCode
                    ? `${discount.fixedAmount.toFixed(2)} ${discount.displayCurrencyCode}`
                    : formatMinor(discount.fixedAmountMinor, discount.displayCurrencyCode || discount.currencyCode)}
              </span>
            </div>
            {(discount.maxDiscountAmount != null || discount.maxDiscountAmountMinor) && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max Discount Cap</span>
                  <span className="text-sm">
                    {discount.maxDiscountAmount != null && discount.displayCurrencyCode
                      ? `${discount.maxDiscountAmount.toFixed(2)} ${discount.displayCurrencyCode}`
                      : formatMinor(discount.maxDiscountAmountMinor, discount.displayCurrencyCode || discount.currencyCode)}
                  </span>
                </div>
              </>
            )}
            {(discount.minOrderAmount != null || discount.minOrderAmountMinor) && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Min Order Amount</span>
                  <span className="text-sm">
                    {discount.minOrderAmount != null && discount.displayCurrencyCode
                      ? `${discount.minOrderAmount.toFixed(2)} ${discount.displayCurrencyCode}`
                      : formatMinor(discount.minOrderAmountMinor, discount.displayCurrencyCode || discount.currencyCode)}
                  </span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Applies To</span>
              <span className="text-sm">
                {discount.appliesTo === 'ORDER_TOTAL'
                  ? 'Entire Order'
                  : discount.appliesTo === 'SPECIFIC_PRODUCTS'
                  ? 'Specific Products'
                  : discount.appliesTo === 'SPECIFIC_CATEGORIES'
                  ? 'Specific Categories'
                  : discount.appliesTo === 'SPECIFIC_SERVICES'
                  ? 'Specific Services'
                  : discount.appliesTo === 'SPECIFIC_CUSTOM_ORDER_TEMPLATES'
                  ? 'Custom Order Templates'
                  : discount.appliesTo}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage & Validity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Usage & Validity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Uses</span>
              <span className="text-sm font-semibold">
                {discount.usageCount}
                {discount.usageLimit ? ` / ${discount.usageLimit}` : ' (unlimited)'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Per User Limit</span>
              <span className="text-sm">
                {discount.perUserLimit ? `${discount.perUserLimit} per user` : 'Unlimited'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valid From</span>
              <span className="text-sm">{formatDate(discount.validFrom)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valid Until</span>
              <span className="text-sm">{formatDate(discount.validUntil)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{formatDate(discount.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {discount.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{discount.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Applicable Entities */}
      {discount.appliesTo === 'SPECIFIC_PRODUCTS' && discount.productNames && discount.productNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Applicable Products ({discount.productNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {discount.productNames.map((name, idx) => (
                <Badge key={idx} variant="outline" className="border-emerald-300 text-emerald-700">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {discount.appliesTo === 'SPECIFIC_CATEGORIES' && discount.categoryNames && discount.categoryNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-600" />
              Applicable Categories ({discount.categoryNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {discount.categoryNames.map((name, idx) => (
                <Badge key={idx} variant="outline" className="border-orange-300 text-orange-700">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {discount.appliesTo === 'SPECIFIC_SERVICES' && discount.serviceNames && discount.serviceNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-sky-600" />
              Applicable Services ({discount.serviceNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {discount.serviceNames.map((name, idx) => (
                <Badge key={idx} variant="outline" className="border-sky-300 text-sky-700">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {discount.appliesTo === 'SPECIFIC_CUSTOM_ORDER_TEMPLATES' && discount.customOrderTemplateNames && discount.customOrderTemplateNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600" />
              Applicable Custom Order Templates ({discount.customOrderTemplateNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {discount.customOrderTemplateNames.map((name, idx) => (
                <Badge key={idx} variant="outline" className="border-violet-300 text-violet-700">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{discount.code}"?
              Customers will no longer be able to use this code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
