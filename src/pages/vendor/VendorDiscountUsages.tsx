import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { discountService } from "@/services/discountService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, BarChart3, Users, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function VendorDiscountUsages() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const discountId = Number(id);

  // Fetch discount details
  const { data: discount } = useQuery({
    queryKey: ['vendor', 'discount', discountId],
    queryFn: () => discountService.getVendorDiscount(discountId),
    enabled: !!discountId,
  });

  // Fetch usages
  const { data: usages, isLoading } = useQuery({
    queryKey: ['vendor', 'discount', discountId, 'usages'],
    queryFn: () => discountService.getDiscountUsages(discountId),
    enabled: !!discountId,
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  const formatMinor = (amount: number, currency: string) => {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  };

  // Calculate summary stats
  const totalUsages = usages?.length || 0;
  // Use converted amounts if available, otherwise fall back to minor units
  const totalDiscountGiven = usages?.reduce((sum, u) => {
    if (u.discountAmount != null) {
      return sum + u.discountAmount;
    }
    return sum + (u.discountAmountMinor || 0) / 100;
  }, 0) || 0;
  const uniqueUsers = new Set(usages?.map((u) => u.userId)).size;
  const displayCurrency = usages?.[0]?.displayCurrencyCode || discount?.displayCurrencyCode || discount?.currencyCode || 'ETB';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/vendor/discounts/${discountId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Usage History</h2>
          <p className="text-sm text-muted-foreground">
            Discount code: <span className="font-mono font-semibold">{discount?.code || '...'}</span>
            {discount && (
              <span> — {discount.name}</span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsages}</p>
              <p className="text-xs text-muted-foreground">Total Usages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-50 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalDiscountGiven.toFixed(2)} {displayCurrency}
              </p>
              <p className="text-xs text-muted-foreground">Total Discount Given</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-50 p-3">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Usage Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!usages || usages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-muted-foreground">No usages recorded yet</p>
              <p className="text-xs text-muted-foreground">
                Usage data will appear here when customers use this discount code
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="text-right">Discount Amount</TableHead>
                    <TableHead>Used At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-medium">{usage.userName || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{usage.userEmail || '—'}</TableCell>
                      <TableCell>
                        {usage.orderId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            #{usage.orderId}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {usage.discountAmount != null && usage.displayCurrencyCode
                          ? `${usage.discountAmount.toFixed(2)} ${usage.displayCurrencyCode}`
                          : formatMinor(usage.discountAmountMinor, usage.currencyCode)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(usage.usedAt)}
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
  );
}
