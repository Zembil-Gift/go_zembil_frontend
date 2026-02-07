import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";
import { deliveryService, DeliveryAssignmentDto } from "@/services/deliveryService";

export default function DeliveryHistory() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["delivery", "history", page],
    queryFn: () => deliveryService.getDeliveryHistory({ page, size: 10 }),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DELIVERED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      CANCELLED: "bg-gray-100 text-gray-800",
      RETURNED: "bg-amber-100 text-amber-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "FAILED":
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deliveries = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  // Filter to only show completed/failed/cancelled
  const historyDeliveries = deliveries.filter((d: DeliveryAssignmentDto) =>
    ["DELIVERED", "FAILED", "CANCELLED", "RETURNED"].includes(d.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery History</h1>
        <p className="text-gray-500">Your past deliveries ({totalElements} total)</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
        </div>
      ) : historyDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-1">No delivery history</h3>
              <p className="text-sm">Your completed deliveries will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {historyDeliveries.map((delivery: DeliveryAssignmentDto) => (
              <Card key={delivery.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      {getStatusIcon(delivery.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">#{delivery.orderNumber}</span>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>
                            {delivery.shippingAddress || "N/A"}, {delivery.shippingCity || ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>
                            {delivery.status === "DELIVERED"
                              ? `Delivered: ${formatDate(delivery.deliveredAt)}`
                              : `Completed: ${formatDate(delivery.updatedAt)}`}
                          </span>
                        </div>
                      </div>

                      {delivery.status === "DELIVERED" && delivery.recipientName && (
                        <p className="text-sm text-green-600 mt-2">
                          Received by: {delivery.recipientName}
                        </p>
                      )}

                      {delivery.status === "FAILED" && delivery.failureReason && (
                        <p className="text-sm text-red-600 mt-2">
                          Reason: {delivery.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
