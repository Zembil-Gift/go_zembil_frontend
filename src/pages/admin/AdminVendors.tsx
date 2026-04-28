import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Store,
  Search,
  Eye,
  Loader2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Building,
  FileText,
  Clock,
  Download,
  ScrollText,
  Award,
  UserX,
  UserCheck,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import {
  vendorTermsService,
  VendorTermsAcceptanceResponse,
} from "@/services/vendorTermsService";
import {
  certificateService,
  CertificateResponse,
} from "@/services/certificateService";
import {
  RejectionReasonModal,
  RejectionReasonWithModal,
} from "@/components/RejectionReasonModal";
import FilterBar from "@/components/FilterBar";

export default function AdminVendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    page: 0,
    size: 20,
    sort: "createdAt,desc",
  });
  const [, setSelectedVendor] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<any>(null);
  const [termsAcceptance, setTermsAcceptance] =
    useState<VendorTermsAcceptanceResponse | null>(null);
  const [vendorCertificate, setVendorCertificate] =
    useState<CertificateResponse | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [actionVendor, setActionVendor] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    reason: string;
    title: string;
  }>({ open: false, reason: "", title: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["admin", "vendors", filters, searchTerm],
    queryFn: async () => {
      try {
        const response = await adminService.getVendors(
          filters.page,
          filters.size,
          searchTerm || undefined,
          filters.sort
        );
        return response.content || [];
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
        return [];
      }
    },
    keepPreviousData: true,
  });

  const vendors = vendorsData || [];

  const approveMutation = useMutation({
    mutationFn: (vendorId: number) => adminService.approveVendor(vendorId),
    onSuccess: () => {
      toast({
        title: "Vendor Approved",
        description: "The vendor has been successfully approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setShowApproveDialog(false);
      setActionVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve vendor",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({
      vendorId,
      rejectionReason,
    }: {
      vendorId: number;
      rejectionReason: string;
    }) => adminService.declineVendor(vendorId, { rejectionReason }),
    onSuccess: () => {
      toast({
        title: "Vendor Declined",
        description:
          "The vendor has been declined and the reason has been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setShowDeclineDialog(false);
      setActionVendor(null);
      setDeclineReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline vendor",
        variant: "destructive",
      });
    },
  });

  // Mutation for deactivating vendor (via user deactivation)
  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => adminService.deactivateUser(userId),
    onSuccess: () => {
      toast({
        title: "Vendor Deactivated",
        description: "The vendor account has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setShowDeactivateDialog(false);
      setActionVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate vendor",
        variant: "destructive",
      });
    },
  });

  // Mutation for reactivating vendor (via user reactivation)
  const reactivateMutation = useMutation({
    mutationFn: (userId: number) => adminService.reactivateUser(userId),
    onSuccess: () => {
      toast({
        title: "Vendor Reactivated",
        description: "The vendor account has been reactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setActionVendor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate vendor",
        variant: "destructive",
      });
    },
  });

  const filteredVendors = vendors;

  const approvedCount = vendors.filter((v: any) => v.isApproved).length;
  const pendingCount = vendors.filter((v: any) => !v.isApproved).length;
  const payoutEnabledCount = vendors.filter((v: any) => v.payoutEnabled).length;

  const handleViewVendor = async (vendor: any) => {
    setSelectedVendor(vendor);
    setShowDetailDialog(true);
    setIsLoadingDetail(true);
    setTermsAcceptance(null);
    setVendorCertificate(null);

    try {
      const detail = await adminService.getVendorById(vendor.id);
      setVendorDetail(detail);

      // Fetch terms acceptance
      const terms = await vendorTermsService.getVendorTermsAcceptance(
        vendor.id
      );
      setTermsAcceptance(terms);

      // Fetch certificate
      const cert = await certificateService.getVendorCertificate(vendor.id);
      setVendorCertificate(cert);
    } catch (error) {
      console.error("Failed to fetch vendor details:", error);
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "destructive",
      });
      setVendorDetail(vendor);
    } finally {
      setIsLoadingDetail(false);
    }
  };
  return (
    <AdminLayout
      title="Vendor Management"
      description="View and manage all registered vendors"
    >
      <FilterBar
        apiEndpoint="/api/admin/vendors"
        alphabeticalProperty="businessName"
        dateProperty="createdAt"
        onFilterChange={(f) => setFilters(f)}
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">
              {vendors.length}
            </div>
            <p className="text-sm text-gray-500">Total Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {approvedCount}
            </div>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {pendingCount}
            </div>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {payoutEnabledCount}
            </div>
            <p className="text-sm text-gray-500">Payout Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filteredVendors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor: any) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-eagle-green">
                          {vendor.businessName}
                        </div>
                        {vendor.vendorCategoryName && (
                          <div className="text-sm text-gray-500">
                            {vendor.vendorCategoryName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-3 w-3 mr-1" />
                          {vendor.businessEmail}
                        </div>
                        {vendor.businessPhone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {vendor.businessPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.city || vendor.country ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          {vendor.city && vendor.country
                            ? `${vendor.city}, ${vendor.country}`
                            : vendor.city || vendor.country}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.isApproved ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : vendor.isActive === false ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                          {vendor.rejectionReason && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectionModal({
                                  open: true,
                                  reason: vendor.rejectionReason!,
                                  title: "Vendor rejection reason",
                                });
                              }}
                              className="text-xs text-red-700 underline hover:no-underline"
                            >
                              View reason
                            </button>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.isActive !== false ? (
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.payoutEnabled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Set Up
                          </Badge>
                        )}
                        <div className="flex gap-1 text-xs">
                          {vendor.stripeConnectedAccountId && (
                            <Badge variant="outline" className="text-xs">
                              Stripe
                            </Badge>
                          )}
                          {vendor.chapaSubaccountId && (
                            <Badge variant="outline" className="text-xs">
                              Chapa
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(() => {
                          const isInactive = vendor.isActive === false;
                          const canApprove = !vendor.isApproved && !isInactive;
                          const canDecline = !vendor.isApproved && !isInactive;

                          return (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewVendor(vendor)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!vendor.isApproved && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      setActionVendor(vendor);
                                      setShowApproveDialog(true);
                                    }}
                                    disabled={!canApprove}
                                    title={
                                      !canApprove
                                        ? "Vendor is inactive"
                                        : "Approve vendor"
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setActionVendor(vendor);
                                      setShowDeclineDialog(true);
                                    }}
                                    disabled={!canDecline}
                                    title={
                                      !canDecline
                                        ? "Vendor is already inactive"
                                        : "Decline vendor"
                                    }
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {vendor.isApproved &&
                                (vendor.isActive !== false ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => {
                                      setActionVendor(vendor);
                                      setShowDeactivateDialog(true);
                                    }}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                ) : null)}

                              {isInactive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    reactivateMutation.mutate(vendor.userId)
                                  }
                                  disabled={reactivateMutation.isPending}
                                  title="Reactivate vendor"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No vendors found
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Vendors will appear here when they register"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-eagle-green" />
              Vendor Details
            </DialogTitle>
            <DialogDescription>
              Complete vendor information and statistics
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : (
            vendorDetail && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1">
                  <TabsTrigger
                    value="info"
                    className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
                  >
                    Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="terms"
                    className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
                  >
                    Terms
                  </TabsTrigger>
                  <TabsTrigger
                    value="certificate"
                    className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
                  >
                    Certificate
                  </TabsTrigger>
                  <TabsTrigger
                    value="payout"
                    className="whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
                  >
                    Payout
                  </TabsTrigger>
                </TabsList>

                {/* Information Tab */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  {/* Header */}
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-eagle-green/5 to-viridian-green/5 rounded-lg">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center text-white text-xl font-bold">
                      {vendorDetail.businessName?.charAt(0) || "V"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-eagle-green">
                        {vendorDetail.businessName}
                      </h3>
                      {vendorDetail.vendorCategoryName && (
                        <Badge variant="outline" className="mt-1">
                          {vendorDetail.vendorCategoryName}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Business Email</p>
                        <p className="text-sm font-medium">
                          {vendorDetail.businessEmail}
                        </p>
                      </div>
                    </div>
                    {vendorDetail.businessPhone && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">
                            Business Phone
                          </p>
                          <p className="text-sm font-medium">
                            {vendorDetail.businessPhone}
                          </p>
                        </div>
                      </div>
                    )}
                    {(vendorDetail.city || vendorDetail.country) && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium">
                            {vendorDetail.city && vendorDetail.country
                              ? `${vendorDetail.city}, ${vendorDetail.country}`
                              : vendorDetail.city || vendorDetail.country}
                          </p>
                        </div>
                      </div>
                    )}
                    {vendorDetail.contactName && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Building className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Contact Name</p>
                          <p className="text-sm font-medium">
                            {vendorDetail.contactName}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business Details */}
                  {vendorDetail.description && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <p className="text-xs text-gray-500 uppercase">
                          Business Description
                        </p>
                      </div>
                      <p className="text-sm">{vendorDetail.description}</p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Joined</p>
                        <p className="text-sm font-medium">
                          {vendorDetail.createdAt
                            ? new Date(
                                vendorDetail.createdAt
                              ).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Vendor ID</p>
                        <p className="text-sm font-medium">{vendorDetail.id}</p>
                      </div>
                    </div>
                  </div>

                  {vendorDetail.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 uppercase font-medium">
                        Rejection Reason
                      </p>
                      <RejectionReasonWithModal
                        reason={vendorDetail.rejectionReason}
                        title="Vendor rejection reason"
                        className="text-sm text-red-800 mt-1"
                        truncateLength={120}
                      />
                      {vendorDetail.rejectedAt && (
                        <p className="text-xs text-red-700 mt-2">
                          Rejected on{" "}
                          {new Date(vendorDetail.rejectedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Terms Tab */}
                <TabsContent value="terms" className="space-y-4 mt-4">
                  {termsAcceptance ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">
                            Terms Accepted
                          </h4>
                          <p className="text-sm text-green-700">
                            Version {termsAcceptance.termsVersion} accepted on{" "}
                            {new Date(
                              termsAcceptance.acceptedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        {termsAcceptance.pdfUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                // Extract filename from the PDF URL
                                const urlParts =
                                  termsAcceptance.pdfUrl!.split("/");
                                const filename = urlParts[urlParts.length - 1];

                                const blob =
                                  await vendorTermsService.downloadTermsPdf(
                                    termsAcceptance.vendorId,
                                    filename
                                  );

                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `terms-acceptance-vendor-${termsAcceptance.vendorId}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error("Error downloading PDF:", error);
                                toast({
                                  title: "Error",
                                  description:
                                    "Failed to download PDF. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <ScrollText className="h-4 w-4" />
                          Accepted Terms ({termsAcceptance.acceptedTerms.length}
                          )
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {termsAcceptance.acceptedTerms.map((term, index) => (
                            <div
                              key={term.termId}
                              className="p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {index + 1}. {term.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {term.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <XCircle className="h-12 w-12 text-gray-300 mb-4" />
                      <h4 className="font-medium text-gray-900">
                        No Terms Acceptance Found
                      </h4>
                      <p className="text-sm">
                        This vendor has not accepted any terms and conditions.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Payout Tab */}
                <TabsContent value="payout" className="space-y-4 mt-4">
                  {/* Certificate Tab */}
                  <TabsContent value="certificate" className="space-y-4 mt-4">
                    {vendorCertificate ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
                          <Award className="h-8 w-8 text-green-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-green-900">
                              Onboarding Certificate
                            </h4>
                            <p className="text-sm text-green-700">
                              Issued on{" "}
                              {new Date(
                                vendorCertificate.issuedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const blob =
                                  await certificateService.downloadVendorCertificatePdf(
                                    vendorDetail.id
                                  );

                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `vendor-${vendorDetail.id}-certificate.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error("Error downloading PDF:", error);
                                toast({
                                  title: "Error",
                                  description:
                                    "Failed to download certificate PDF. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-xs text-gray-500">
                              Certificate Code
                            </p>
                            <p className="text-lg font-mono font-bold text-emerald-600">
                              {vendorCertificate.certificateCode}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">Full Name</p>
                              <p className="text-sm font-medium">
                                {vendorCertificate.fullName}
                              </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="text-sm font-medium">
                                {vendorCertificate.email}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">
                                Vendor Type
                              </p>
                              <p className="text-sm font-medium">
                                {vendorCertificate.vendorType}
                              </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">Status</p>
                              <Badge
                                className={
                                  vendorCertificate.isUsed
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                                }
                              >
                                {vendorCertificate.isUsed ? "Used" : "Unused"}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">Issued At</p>
                              <p className="text-sm font-medium">
                                {new Date(
                                  vendorCertificate.issuedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-xs text-gray-500">
                                Expires At
                              </p>
                              <p className="text-sm font-medium">
                                {new Date(
                                  vendorCertificate.expiresAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <XCircle className="h-12 w-12 text-gray-300 mb-4" />
                        <h4 className="font-medium text-gray-900">
                          No Certificate Found
                        </h4>
                        <p className="text-sm">
                          This vendor does not have an onboarding certificate on
                          record.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                    <div className="flex-1">
                      <h4 className="font-medium">Payout Status</h4>
                      <p className="text-sm text-gray-500">
                        Current payout configuration
                      </p>
                    </div>
                    {vendorDetail.payoutEnabled ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stripe */}
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Stripe Connect</h4>
                          {vendorDetail.stripeConnectedAccountId ? (
                            <Badge className="bg-green-100 text-green-800">
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Connected</Badge>
                          )}
                        </div>
                        {vendorDetail.stripeConnectedAccountId && (
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {vendorDetail.stripeConnectedAccountId}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Chapa */}
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Chapa Subaccount</h4>
                          {vendorDetail.chapaSubaccountId ? (
                            <Badge className="bg-green-100 text-green-800">
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Connected</Badge>
                          )}
                        </div>
                        {vendorDetail.chapaSubaccountId && (
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {vendorDetail.chapaSubaccountId}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {vendorDetail.defaultCurrency && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">
                        Supported Payment Providers
                      </p>
                      <p className="text-sm font-medium">
                        {vendorDetail.supportedPaymentProviders?.join(", ") ||
                          "None configured"}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve{" "}
              <strong>{actionVendor?.businessName}</strong>? This will allow
              them to start selling products and hosting events on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setActionVendor(null);
              }}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() =>
                actionVendor && approveMutation.mutate(actionVendor.id)
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation Dialog */}
      <Dialog
        open={showDeclineDialog}
        onOpenChange={(open) => {
          setShowDeclineDialog(open);
          if (!open) {
            setDeclineReason("");
            setActionVendor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline{" "}
              <strong>{actionVendor?.businessName}</strong>? Add a clear reason.
              This message will be sent to the vendor by email and shown in the
              app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection reason</label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Explain why this vendor application was declined..."
              rows={4}
              maxLength={1000}
              disabled={declineMutation.isPending}
            />
            <p className="text-xs text-gray-500">{declineReason.length}/1000</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setActionVendor(null);
                setDeclineReason("");
              }}
              disabled={declineMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!actionVendor || !declineReason.trim()) return;
                declineMutation.mutate({
                  vendorId: actionVendor.id,
                  rejectionReason: declineReason.trim(),
                });
              }}
              disabled={
                declineMutation.isPending ||
                actionVendor?.isActive === false ||
                !declineReason.trim()
              }
            >
              {declineMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-600" />
              Deactivate Vendor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{actionVendor?.businessName}</strong>?
              <br />
              <br />
              This will prevent the vendor from logging in and their products
              will not be visible to customers. You can reactivate their account
              later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeactivateDialog(false);
                setActionVendor(null);
              }}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() =>
                actionVendor && deactivateMutation.mutate(actionVendor.userId)
              }
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectionReasonModal
        open={rejectionModal.open}
        onOpenChange={(open) => setRejectionModal((m) => ({ ...m, open }))}
        reason={rejectionModal.reason}
        title={rejectionModal.title}
      />
    </AdminLayout>
  );
}
