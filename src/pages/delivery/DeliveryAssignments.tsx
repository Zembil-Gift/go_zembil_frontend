import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Loader2,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import { deliveryService, DeliveryAssignmentDto } from "@/services/deliveryService";

export default function DeliveryAssignments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["delivery", "assignments", statusFilter, page],
    queryFn: () =>
      deliveryService.getMyAssignments({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        size: 10,
      }),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ASSIGNED: "bg-blue-100 text-blue-800",
      ACCEPTED: "bg-indigo-100 text-indigo-800",
      PICKED_UP: "bg-purple-100 text-purple-800",
      IN_TRANSIT: "bg-orange-100 text-orange-800",
      ARRIVED: "bg-cyan-100 text-cyan-800",
      DELIVERED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const assignments = data?.content || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-gray-500">Manage your assigned deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="PICKED_UP">Picked Up</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="ARRIVED">Arrived</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-1">No assignments found</h3>
              <p className="text-sm">
                {statusFilter !== "all"
                  ? "Try changing the filter to see more assignments"
                  : "You don't have any delivery assignments yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {assignments.map((assignment: DeliveryAssignmentDto) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <Link to={`/delivery/assignments/${assignment.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">
                            #{assignment.orderNumber}
                          </span>
                          <Badge className={getStatusColor(assignment.status)}>
                            {assignment.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>
                              {assignment.shippingAddress || "N/A"},{" "}
                              {assignment.shippingCity || ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{assignment.customerPhone || "N/A"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                          </div>
                          {assignment.expectedDeliveryAt && (
                            <div className="flex items-center gap-1 text-ethiopian-gold">
                              <Clock className="h-3 w-3" />
                              <span>
                                Due: {formatDate(assignment.expectedDeliveryAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {(assignment.totalAmountMinor / 100).toFixed(2)}{" "}
                            {assignment.currencyCode}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assignment.customerName}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
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
