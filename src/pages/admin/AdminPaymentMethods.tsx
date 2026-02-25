import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { paymentMethodConfigService, type PaymentMethodConfig } from '@/services/paymentMethodConfigService';
import { CreditCard, Smartphone, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

/** Metadata for each payment method — icons, labels, descriptions */
const PAYMENT_METHOD_META: Record<string, {
  label: string;
  color: string;
}> = {
  STRIPE: {
    label: 'Stripe',
    color: 'text-indigo-600',
  },
  CHAPA: {
    label: 'Chapa',
    color: 'text-green-600',
  },
  TELEBIRR: {
    label: 'TeleBirr',
    color: 'text-blue-600',
  },
};

export default function AdminPaymentMethods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingMethod, setTogglingMethod] = useState<string | null>(null);

  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['admin', 'payment-method-configs'],
    queryFn: () => paymentMethodConfigService.getAdminConfigs(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ paymentMethod, enabled }: { paymentMethod: string; enabled: boolean }) =>
      paymentMethodConfigService.togglePaymentMethod(paymentMethod, enabled),
    onMutate: ({ paymentMethod }) => {
      setTogglingMethod(paymentMethod);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<PaymentMethodConfig[]>(
        ['admin', 'payment-method-configs'],
        (old) => old?.map((c) => (c.paymentMethod === updated.paymentMethod ? updated : c)) ?? []
      );
      // Also invalidate the public endpoint cache
      queryClient.invalidateQueries({ queryKey: ['payment-method-configs'] });
      toast({
        title: 'Payment method updated',
        description: `${PAYMENT_METHOD_META[updated.paymentMethod]?.label ?? updated.paymentMethod} has been ${updated.enabled ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err.message || 'Failed to update payment method.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setTogglingMethod(null);
    },
  });

  const enabledCount = configs?.filter((c) => c.enabled).length ?? 0;

  return (
    <AdminLayout
      title="Payment Methods"
      description="Enable or disable payment methods available at checkout."
    >
      {/* Warning when all methods disabled */}
      {configs && enabledCount === 0 && (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>All payment methods are disabled.</strong> Customers will not be able to complete
            any purchases until at least one payment method is enabled.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning when only one method enabled */}
      {configs && enabledCount === 1 && (
        <Alert className="mb-6 border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Only one payment method is active. Consider enabling additional methods for broader customer reach.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
          <span className="ml-3 text-gray-600">Loading payment methods…</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load payment method configurations. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 max-w-3xl">
        {configs?.map((config) => {
          const meta = PAYMENT_METHOD_META[config.paymentMethod] ?? {
            label: config.paymentMethod,
            description: 'Payment method',
            icon: <CreditCard className="w-6 h-6" />,
            color: 'text-gray-600',
            badges: [],
          };
          const isToggling = togglingMethod === config.paymentMethod;

          return (
            <Card
              key={config.id}
              className={`transition-all duration-200 ${
                config.enabled
                  ? 'border-eagle-green/30 bg-white shadow-sm'
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {meta.label}
                        {config.enabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    <Switch
                      checked={config.enabled}
                      disabled={isToggling}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          paymentMethod: config.paymentMethod,
                          enabled: checked,
                        })
                      }
                      aria-label={`Toggle ${meta.label}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {config.updatedAt && (
                  <p className="text-xs text-gray-400">
                    Last updated: {new Date(config.updatedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
