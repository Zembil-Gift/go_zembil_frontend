import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Truck,
  Award,
  Calendar,
  Loader2,
} from "lucide-react";
import { deliveryService } from "@/services/deliveryService";

export default function DeliveryProfile() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["delivery", "profile"],
    queryFn: () => deliveryService.getProfile(),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: "bg-green-100 text-green-800",
      BUSY: "bg-yellow-100 text-yellow-800",
      OFFLINE: "bg-gray-100 text-gray-800",
      ON_BREAK: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-gray-500">
        Unable to load profile
      </div>
    );
  }

  const successRate =
    profile.totalDeliveries > 0
      ? ((profile.successfulDeliveries / profile.totalDeliveries) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">View your delivery person profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-ethiopian-gold/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-ethiopian-gold">
                  {profile.firstName?.[0]}
                  {profile.lastName?.[0]}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-gray-500">Employee ID: {profile.employeeId}</p>
                <Badge className={getStatusColor(profile.status)}>{profile.status}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label className="text-gray-500">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{profile.email}</span>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Phone</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{profile.phoneNumber}</span>
                </div>
              </div>
              {profile.vehicleType && (
                <div>
                  <Label className="text-gray-500">Vehicle Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span>{profile.vehicleType}</span>
                  </div>
                </div>
              )}
              {profile.vehicleNumber && (
                <div>
                  <Label className="text-gray-500">Vehicle Number</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span>{profile.vehicleNumber}</span>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-gray-500">Member Since</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Account Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={profile.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {profile.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {profile.notes && (
              <>
                <Separator />
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="mt-1 text-gray-600">{profile.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-ethiopian-gold">{successRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Success Rate</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{profile.totalDeliveries}</p>
                  <p className="text-xs text-gray-500">Total Deliveries</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {profile.successfulDeliveries}
                  </p>
                  <p className="text-xs text-gray-500">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <Badge className={`${getStatusColor(profile.status)} text-lg px-4 py-2`}>
                  {profile.status.replace("_", " ")}
                </Badge>
                <p className="text-sm text-gray-500">
                  {profile.activeAssignments > 0
                    ? `${profile.activeAssignments} active assignment(s)`
                    : "No active assignments"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
