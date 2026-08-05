import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { discountService, DiscountResponse } from "@/services/discountService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Percent,
  Plus,
  XCircle,
  Eye,
  Pencil,
  BarChart3,
  Tag,
  Clock,
  Users,
  Search,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function VendorDiscountsPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  const [searchQuery, setSearchQuery] = useState("");
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    discountId: number | null;
    discountCode: string;
  }>({ open: false, discountId: null, discountCode: '' });

  // Fetch vendor discounts (wait for auth so currency is correct)
  const { data: discountsData, isLoading } = useQuery({
    queryKey: ['vendor', 'discounts', user?.preferredCurrencyCode ?? 'default'],
    queryFn: () => discountService.getVendorDiscounts(0, 100),
    enabled: isAuthenticated && isVendor && isInitialized,
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (discountId: number) => discountService.deactivateDiscount(discountId),
    onSuccess: () => {
      toast({
        title: t("Discount deactivated"),
        description: t("The discount code has been deactivated and is no longer usable."),
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
      setDeactivateDialog({ open: false, discountId: null, discountCode: '' });
    },
    onError: (error: any) => {
      toast({ title: t("Error"), description: error.message, variant: "destructive" });
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: (discountId: number) => discountService.reactivateDiscount(discountId),
    onSuccess: () => {
      toast({
        title: t("Discount reactivated"),
        description: t("The discount code has been reactivated and is now usable."),
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
    },
    onError: (error: any) => {
      toast({ title: t("Error"), description: error.message, variant: "destructive" });
    },
  });

  const discounts: DiscountResponse[] = (discountsData?.content || []).filter(discount => 
    discount.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (discount.description && discount.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (discount: DiscountResponse) => {
    if (!discount.isActive) {
      return <Badge className="bg-slate-100 text-slate-800">{t("Inactive")}</Badge>;
    }
    if (!discount.isCurrentlyValid) {
      return <Badge className="bg-amber-100 text-amber-800">{t("Expired")}</Badge>;
    }
    if (!discount.hasRemainingUses) {
      return <Badge className="bg-red-100 text-red-800">{t("Limit Reached")}</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">{t("Active")}</Badge>;
  };

  const getTypeBadge = (discount: DiscountResponse) => {
    if (discount.discountType === 'PERCENTAGE') {
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700">
          <Percent className="h-3 w-3 mr-1" />
          {discount.discountPercentage}{t("% Off")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-purple-300 text-purple-700">
        <Tag className="h-3 w-3 mr-1" />
        {((discount.fixedAmountMinor || 0) / 100).toFixed(2)} {discount.currencyCode} {t("Off")}
      </Badge>
    );
  };

  const getAppliesToBadge = (discount: DiscountResponse) => {
    switch (discount.appliesTo) {
      case 'ORDER_TOTAL':
        return <Badge variant="outline" className="text-xs">{t("Whole Order")}</Badge>;
      case 'SPECIFIC_PRODUCTS':
        return <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">
          {discount.productNames?.length || discount.productIds?.length || 0} {t("Product(s)")}
        </Badge>;
      case 'SPECIFIC_CATEGORIES':
        return <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
          {discount.categoryNames?.length || discount.categoryIds?.length || 0} {t("Category(ies)")}
        </Badge>;
      case 'SPECIFIC_SERVICES':
        return <Badge variant="outline" className="text-xs border-sky-300 text-sky-700">
          {discount.serviceNames?.length || discount.serviceIds?.length || 0} {t("Service(s)")}
        </Badge>;
      case 'SPECIFIC_CUSTOM_ORDER_TEMPLATES':
        return <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">
          {discount.customOrderTemplateNames?.length || discount.customOrderTemplateIds?.length || 0} {t("Template(s)")}
        </Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No limit';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("Discounts")}</h2>
          <p className="text-sm text-muted-foreground">{t("Create and manage discount codes for your products, services, and custom orders")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search by code or description...")}
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button asChild className="shrink-0">
            <Link to="/vendor/discounts/new">
              <Plus className="h-4 w-4 mr-2" />
              {t("Create Discount")}
            </Link>
          </Button>
        </div>
      </div>

      {discounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Percent className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{t("No discounts yet")}</h3>
            <p className="text-muted-foreground mb-4">{t("Create your first discount code to attract more customers")}</p>
            <Button asChild>
              <Link to="/vendor/discounts/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("Create Discount")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {discounts.map((discount) => (
            <Card key={discount.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Discount info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg font-mono tracking-wider">{discount.code}</h3>
                      {getStatusBadge(discount)}
                      {getTypeBadge(discount)}
                      {getAppliesToBadge(discount)}
                    </div>
                    <p className="text-sm text-muted-foreground">{discount.name}</p>
                    {discount.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{discount.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {discount.usageCount}{discount.usageLimit ? `/${discount.usageLimit}` : ''} {t("uses")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(discount.validFrom)} – {formatDate(discount.validUntil)}
                      </span>
                      {discount.perUserLimit && (
                        <span className="text-xs">{t("Max")} {discount.perUserLimit}{t("/user")}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/vendor/discounts/${discount.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        {t("View")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/vendor/discounts/${discount.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        {t("Edit")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/vendor/discounts/${discount.id}/usages`}>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        {t("Usages")}
                      </Link>
                    </Button>
                    {discount.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDeactivateDialog({
                            open: true,
                            discountId: discount.id,
                            discountCode: discount.code,
                          })
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t("Deactivate")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reactivateMutation.mutate(discount.id)}
                        disabled={reactivateMutation.isPending}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Percent className="h-4 w-4 mr-1" />
                        {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deactivate Dialog */}
      <AlertDialog
        open={deactivateDialog.open}
        onOpenChange={(open) => {
          if (!open && !deactivateMutation.isPending) {
            setDeactivateDialog({ open: false, discountId: null, discountCode: '' });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Deactivate Discount")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to deactivate discount code \"")}{deactivateDialog.discountCode}{t("\"? Customers will no longer be able to use this code. This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>{t("Cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deactivateDialog.discountId) {
                  deactivateMutation.mutate(deactivateDialog.discountId);
                }
              }}
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
