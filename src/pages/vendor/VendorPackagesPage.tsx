import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  vendorService,
  Product,
  VendorProfile,
} from "@/services/vendorService";
import {
  packageService,
  ProductPackageResponse,
  VendorPackageStatus,
} from "@/services/packageService";
import { getCurrencyDecimals } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  XCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PackageItemForm {
  id?: number;
  productId: string;
  requiredQuantity: number;
  description: string;
}

interface PackageFormState {
  id?: number;
  name: string;
  summary: string;
  description: string;
  giftWrappable: boolean;
  giftWrapPrice: string;
  items: PackageItemForm[];
}

const createInitialForm = (): PackageFormState => ({
  name: "",
  summary: "",
  description: "",
  giftWrappable: false,
  giftWrapPrice: "",
  items: [
    { productId: "", requiredQuantity: 1, description: "" },
    { productId: "", requiredQuantity: 1, description: "" },
  ],
});

const resolveVendorCurrency = (profile?: VendorProfile): string => {
  const explicitCurrency = profile?.currencyCode?.trim().toUpperCase();
  if (explicitCurrency) return explicitCurrency;

  const countryCode = profile?.countryCode?.trim().toUpperCase();
  if (countryCode === "ET") return "ETB";

  return "USD";
};

export default function VendorPackagesPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | VendorPackageStatus>(
    "ALL"
  );
  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    pkg?: ProductPackageResponse;
  }>({ open: false });
  const [formState, setFormState] = useState<PackageFormState>(
    createInitialForm()
  );
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [skuVisibilityByItem, setSkuVisibilityByItem] = useState<
    Record<number, boolean>
  >({});

  const toMinorUnitsFromMajor = (value: string, currencyCode: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }
    const factor = Math.pow(10, getCurrencyDecimals(currencyCode));
    return Math.round(parsed * factor);
  };

  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const vendorCurrency = useMemo(
    () => resolveVendorCurrency(vendorProfile),
    [vendorProfile]
  );

  const { data: productsData } = useQuery({
    queryKey: ["vendor", "my-products"],
    queryFn: () => vendorService.getMyProducts(),
    enabled: isAuthenticated && isVendor,
  });

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ["vendor", "packages", statusFilter],
    queryFn: () =>
      packageService.getVendorPackages(
        statusFilter === "ALL" ? undefined : statusFilter,
        0,
        100
      ),
    enabled: isAuthenticated && isVendor,
  });

  const products: Product[] = productsData?.content || [];
  const activeProducts = products.filter(
    (p) => (p.status || "").toUpperCase() === "ACTIVE"
  );
  const packages: ProductPackageResponse[] = packagesData?.content || [];

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const normalized = searchQuery.trim().toLowerCase();
      if (!normalized) return true;
      return (
        pkg.name.toLowerCase().includes(normalized) ||
        pkg.summary?.toLowerCase().includes(normalized) ||
        pkg.description?.toLowerCase().includes(normalized)
      );
    });
  }, [packages, searchQuery]);

  const createPackageMutation = useMutation({
    mutationFn: () =>
      packageService.createPackage({
        name: formState.name.trim(),
        summary: formState.summary.trim() || undefined,
        description: formState.description.trim() || undefined,
        images: selectedImageFiles.length > 0 ? selectedImageFiles : undefined,
        giftWrappable: formState.giftWrappable,
        giftWrapPrice:
          formState.giftWrappable && formState.giftWrapPrice
            ? toMinorUnitsFromMajor(formState.giftWrapPrice, vendorCurrency)
            : undefined,
        giftWrapCurrency: formState.giftWrappable
          ? vendorCurrency
          : undefined,
        items: formState.items
          .filter((item) => !!item.productId)
          .map((item, index) => ({
            productId: Number(item.productId),
            requiredQuantity: Number(item.requiredQuantity) || 1,
            displayOrder: index,
            description: item.description.trim() || undefined,
          })),
      }),
    onSuccess: () => {
      toast({
        title: "Package created",
        description: "Your package is saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "packages"] });
      setPackageFormOpen(false);
      setFormState(createInitialForm());
      setSelectedImageFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Unable to create package",
        description: error?.message || "Please check inputs and try again.",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: () =>
      packageService.updatePackage(formState.id!, {
        name: formState.name.trim() || undefined,
        summary: formState.summary.trim() || undefined,
        description: formState.description.trim() || undefined,
        images: selectedImageFiles.length > 0 ? selectedImageFiles : undefined,
        giftWrappable: formState.giftWrappable,
        giftWrapPrice:
          formState.giftWrappable && formState.giftWrapPrice
            ? toMinorUnitsFromMajor(formState.giftWrapPrice, vendorCurrency)
            : undefined,
        giftWrapCurrency: formState.giftWrappable
          ? vendorCurrency
          : undefined,
        items: formState.items
          .filter((item) => !!item.productId)
          .map((item, index) => ({
            id: item.id,
            productId: Number(item.productId),
            requiredQuantity: Number(item.requiredQuantity) || 1,
            displayOrder: index,
            description: item.description.trim() || undefined,
          })),
      }),
    onSuccess: () => {
      toast({
        title: "Package updated",
        description: "Your changes are saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "packages"] });
      setPackageFormOpen(false);
      setFormState(createInitialForm());
      setSelectedImageFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Unable to update package",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (packageId: number) =>
      packageService.deactivatePackage(packageId),
    onSuccess: () => {
      toast({
        title: "Package deactivated",
        description: "Package is now hidden from customers.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "packages"] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (packageId: number) =>
      packageService.reactivatePackage(packageId),
    onSuccess: () => {
      toast({
        title: "Package reactivated",
        description: "Package is visible to customers again.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "packages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (packageId: number) => packageService.deletePackage(packageId),
    onSuccess: () => {
      toast({
        title: "Package deleted",
        description: "Package has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "packages"] });
      setDeleteDialog({ open: false });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to delete package",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openCreateDialog = () => {
    setFormState(createInitialForm());
    setSelectedImageFiles([]);
    setSkuVisibilityByItem({});
    setPackageFormOpen(true);
  };

  const openEditDialog = (pkg: ProductPackageResponse) => {
    setFormState({
      id: pkg.id,
      name: pkg.name,
      summary: pkg.summary || "",
      description: pkg.description || "",
      giftWrappable: !!pkg.giftWrappable,
      giftWrapPrice:
        typeof pkg.giftWrapPrice === "number"
          ? (
              pkg.giftWrapPrice /
              Math.pow(10, getCurrencyDecimals(pkg.giftWrapCurrency || vendorCurrency))
            ).toString()
          : "",
      items:
        pkg.items?.map((item) => ({
          id: item.id,
          productId: item.productId.toString(),
          requiredQuantity: item.requiredQuantity || 1,
          description: item.description || "",
        })) || [],
    });
      setSelectedImageFiles([]);
    setSkuVisibilityByItem({});
    setPackageFormOpen(true);
  };

  const handleSavePackage = () => {
    const isCreate = !formState.id;
    const linkedProductsCount = formState.items.filter(
      (item) => Number(item.productId) > 0
    ).length;
    const hasGiftWrapDetails =
      !formState.giftWrappable ||
      (formState.giftWrapPrice.trim().length > 0 &&
        Number(formState.giftWrapPrice) >= 0);
    const hasRequiredFields = isCreate
      ? formState.name.trim().length > 0 &&
        formState.summary.trim().length > 0 &&
        formState.description.trim().length > 0 &&
        hasGiftWrapDetails &&
        linkedProductsCount >= 2 &&
        formState.items.every(
          (item) =>
            Number(item.productId) > 0 &&
            Number(item.requiredQuantity) >= 1
        )
      : formState.name.trim().length > 0 &&
        hasGiftWrapDetails &&
        formState.items.length > 0 &&
        formState.items.every(
          (item) =>
            Number(item.productId) > 0 && Number(item.requiredQuantity) >= 1
        );

    if (!hasRequiredFields) {
      toast({
        title: "Missing package details",
        description:
          "Complete required package fields. If gift wrap is enabled, add its price.",
        variant: "destructive",
      });
      return;
    }

    if (formState.id) {
      updatePackageMutation.mutate();
    } else {
      createPackageMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "INACTIVE":
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Packages</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage product bundles for your storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | VendorPackageStatus)
            }
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Button
            onClick={openCreateDialog}
            disabled={!vendorProfile?.isApproved}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        </div>
      </div>

      {!vendorProfile?.isApproved && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            Your vendor account must be approved before creating packages.
          </CardContent>
        </Card>
      )}

      {filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-14 w-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium">No packages found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try another search term."
                : "Create your first package bundle."}
            </p>
            <Button
              onClick={openCreateDialog}
              disabled={!vendorProfile?.isApproved}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg truncate">
                      {pkg.name}
                    </h3>
                    {getStatusBadge(pkg.status)}
                  </div>
                  {pkg.summary && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.summary}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {pkg.items?.length || 0} item(s) in bundle
                    {pkg.giftWrappable
                      ? ` • Gift wrap ${
                          pkg.giftWrapPrice
                            ? `(${pkg.giftWrapCurrency || ""} ${
                                pkg.giftWrapPrice
                              })`
                            : "enabled"
                        }`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(pkg)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {pkg.status?.toUpperCase() === "INACTIVE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactivateMutation.mutate(pkg.id)}
                      disabled={reactivateMutation.isPending}
                      className="text-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateMutation.mutate(pkg.id)}
                      disabled={deactivateMutation.isPending}
                      className="text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, pkg })}
                    className="text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={packageFormOpen} onOpenChange={setPackageFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formState.id ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              Build bundles by selecting products and required quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="packageName">Package Name *</Label>
                <Input
                  id="packageName"
                  required
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="packageSummary">Summary *</Label>
                <Input
                  id="packageSummary"
                  required
                  value={formState.summary}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      summary: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="packageDescription">Description *</Label>
                <Textarea
                  id="packageDescription"
                  required
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2 rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="giftWrappable"
                    checked={formState.giftWrappable}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({
                        ...prev,
                        giftWrappable: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="giftWrappable" className="cursor-pointer">
                    Add gift wrapping option
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show gift wrapping at checkout for this package.
                </p>
              </div>

              {formState.giftWrappable && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="giftWrapPrice">
                      Gift Wrap Price ({vendorCurrency}) *
                    </Label>
                    <Input
                      id="giftWrapPrice"
                      type="number"
                      min={0}
                      required
                      value={formState.giftWrapPrice}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          giftWrapPrice: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm">Images</Label>
                <p className="text-xs text-muted-foreground">
                  Upload package images. If files are selected during update, current images will be replaced.
                </p>
                <ImageUpload
                  images={[]}
                  onFilesSelected={(files) => {
                    setSelectedImageFiles((prev) => [...prev, ...files]);
                  }}
                  maxImages={10}
                  disabled={
                    createPackageMutation.isPending || updatePackageMutation.isPending
                  }
                  label=""
                  helperText="Upload images for this package. The first image will appear as cover."
                />
                {selectedImageFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedImageFiles.length} image(s) will be uploaded.
                  </p>
                )}
                {formState.id && selectedImageFiles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to keep existing package images.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Bundle Items</h4>
                <p className="text-xs text-muted-foreground mr-3">
                  Minimum 2 products required
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormState((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        {
                          productId: "",
                          requiredQuantity: 1,
                          description: "",
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {formState.items.map((item, index) => (
                <div
                  key={`${item.id || "new"}-${index}`}
                  className="grid gap-2 sm:grid-cols-12 border rounded-md p-3"
                >
                  <div className="sm:col-span-8">
                    <Label className="text-xs">Product *</Label>
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          items: prev.items.map((it, idx) =>
                            idx === index
                              ? { ...it, productId: e.target.value }
                              : it
                          ),
                        }))
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Select product</option>
                      {activeProducts.length === 0 && (
                        <option value="" disabled>
                          No ACTIVE products available
                        </option>
                      )}
                      {activeProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 px-0 h-auto"
                      disabled={!item.productId}
                      onClick={() =>
                        setSkuVisibilityByItem((prev) => ({
                          ...prev,
                          [index]: !prev[index],
                        }))
                      }
                    >
                      {skuVisibilityByItem[index] ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      )}
                      {skuVisibilityByItem[index]
                        ? "Hide Options"
                        : "View Options"}
                    </Button>
                    {skuVisibilityByItem[index] && (
                      <div className="mt-2 rounded border bg-muted/30 p-2 text-xs space-y-1">
                        {(
                          activeProducts.find(
                            (product) => product.id === Number(item.productId)
                          )?.productSku || []
                        )
                          .slice(0, 8)
                          .map((sku) => (
                            <div
                              key={sku.id || sku.skuCode}
                              className="flex items-center justify-between"
                            >
                              <span className="font-medium">
                                {sku.skuCode || "SKU"}
                                {sku.skuName ? ` - ${sku.skuName}` : ""}
                              </span>
                              <span className="text-muted-foreground">
                                Stock: {sku.stockQuantity ?? 0}
                              </span>
                            </div>
                          ))}
                        {(
                          activeProducts.find(
                            (product) => product.id === Number(item.productId)
                          )?.productSku || []
                        ).length === 0 && (
                          <p className="text-muted-foreground">
                            No options available for this product.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Qty *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.requiredQuantity}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          items: prev.items.map((it, idx) =>
                            idx === index
                              ? {
                                  ...it,
                                  requiredQuantity: Math.max(
                                    1,
                                    Number(e.target.value || 1)
                                  ),
                                }
                              : it
                          ),
                        }))
                      }
                    />
                  </div>

                  <div className="flex ">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-700 mt-5"
                      disabled={formState.items.length <= 2}
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, idx) => idx !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePackage}
              disabled={
                createPackageMutation.isPending ||
                updatePackageMutation.isPending
              }
            >
              {formState.id ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "
              {deleteDialog.pkg?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.pkg?.id) {
                  deleteMutation.mutate(deleteDialog.pkg.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
