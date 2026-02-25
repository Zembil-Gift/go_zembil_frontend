import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { discountService, CreateDiscountRequest } from "@/services/discountService";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DiscountForm } from "./CreateDiscount";

export default function EditDiscount() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const discountId = Number(id);

  // Fetch existing discount
  const { data: discount, isLoading } = useQuery({
    queryKey: ['vendor', 'discount', discountId],
    queryFn: () => discountService.getVendorDiscount(discountId),
    enabled: !!discountId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateDiscountRequest) =>
      discountService.updateDiscount(discountId, data),
    onSuccess: () => {
      toast({ title: "Discount updated", description: "Your discount has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discount', discountId] });
      navigate('/vendor/discounts');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  // Format dates for datetime-local input
  const formatForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Use converted amounts in vendor's preferred currency if available
  // Otherwise fall back to converting from minor units
  const getDisplayAmount = (
    convertedAmount?: number | null, 
    minorAmount?: number | null
  ): number | null => {
    // Prefer the converted amount (already in vendor's preferred currency)
    if (convertedAmount != null) {
      return convertedAmount;
    }
    // Fallback: convert from minor units (assumes 2 decimal places)
    if (minorAmount != null) {
      return minorAmount / 100;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/discounts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Edit Discount</h2>
          <p className="text-sm text-muted-foreground">
            Update discount code <span className="font-mono font-semibold">{discount.code}</span>
          </p>
        </div>
      </div>

      <DiscountForm
        defaultValues={{
          code: discount.code,
          name: discount.name,
          description: discount.description || '',
          discountType: discount.discountType,
          discountPercentage: discount.discountPercentage ?? null,
          fixedAmount: getDisplayAmount(discount.fixedAmount, discount.fixedAmountMinor),
          appliesTo: discount.appliesTo,
          minOrderAmount: getDisplayAmount(discount.minOrderAmount, discount.minOrderAmountMinor),
          maxDiscountAmount: getDisplayAmount(discount.maxDiscountAmount, discount.maxDiscountAmountMinor),
          usageLimit: discount.usageLimit ?? null,
          perUserLimit: discount.perUserLimit ?? null,
          validFrom: formatForInput(discount.validFrom),
          validUntil: formatForInput(discount.validUntil),
          productIds: discount.productIds || [],
          categoryIds: discount.categoryIds || [],
          serviceIds: discount.serviceIds || [],
          customOrderTemplateIds: discount.customOrderTemplateIds || [],
        }}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
        submitLabel="Update Discount"
      />
    </div>
  );
}
