import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  MapPin,
  Phone,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { deliveryService } from "@/services/deliveryService";

export default function DeliveryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["delivery", "dashboard"],
    queryFn: () => deliveryService.getDashboard(),
  });

  // Fetch active assignments
  const { data: activeAssignments } = useQuery({
    queryKey: ["delivery", "assignments", "active"],
    queryFn: () => deliveryService.getActiveAssignments({ size: 10 }),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => deliveryService.updateStatus(status),
    onSuccess: (data) => {
      toast({ title: "Status Updated", description: `You are now ${data.status.toLowerCase().replace("_", " ")}` });
      queryClient.invalidateQueries({ queryKey: ["delivery", "dashboard"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const getDeliveryStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ASSIGNED: "bg-blue-500 text-white",
      ACCEPTED: "bg-indigo-500 text-white",
      PICKED_UP: "bg-purple-500 text-white",
      IN_TRANSIT: "bg-orange-500 text-white",
      ARRIVED: "bg-cyan-500 text-white",
    };
    return colors[status] || "bg-gray-500 text-white";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ASSIGNED: "New",
      ACCEPTED: "Accepted",
      PICKED_UP: "Picked Up",
      IN_TRANSIT: "On the Way",
      ARRIVED: "Arrived",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
      </div>
    );
  }

  const assignments = activeAssignments?.content || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Simple Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Hi, {dashboard?.name?.split(" ")[0] || "Driver"}
            </h1>
            <p className="text-xs text-gray-500">{dashboard?.employeeId}</p>
          </div>
          <Select
            value={dashboard?.status || "AVAILABLE"}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABLE">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Available
                </span>
              </SelectItem>
              <SelectItem value="BUSY">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Busy
                </span>
              </SelectItem>
              <SelectItem value="ON_BREAK">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  On Break
                </span>
              </SelectItem>
              <SelectItem value="OFFLINE">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  Offline
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4">
        {/* Quick Count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-700">
            Your Deliveries
          </h2>
          <span className="text-sm text-gray-500">
            {assignments.length} active
          </span>
        </div>

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No deliveries right now</p>
                <p className="text-sm mt-1">New assignments will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                to={`/delivery/assignments/${assignment.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow active:bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Status Badge & Order Number */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getDeliveryStatusColor(assignment.status)} text-xs px-2 py-0.5`}>
                            {getStatusLabel(assignment.status)}
                          </Badge>
                          <span className="text-xs text-gray-400">#{assignment.orderNumber}</span>
                        </div>
                        
                        {/* Customer Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">
                            {assignment.customerName || "Customer"}
                          </span>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {assignment.shippingAddress || assignment.shippingCity || "Address not available"}
                          </span>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {assignment.customerPhone || "No phone"}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* View All Link */}
        {assignments.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/delivery/assignments">
                View All Assignments
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
