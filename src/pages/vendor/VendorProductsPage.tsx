import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  vendorService,
  VendorProfile,
  Product,
} from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { getProductImageUrl } from "@/utils/imageUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { RejectionReasonWithModal } from "@/components/RejectionReasonModal";
import imageCompression from "browser-image-compression";

export default function VendorProductsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [searchQuery, setSearchQuery] = useState("");

  // State for deactivate dialog
  const [deactivateProductDialog, setDeactivateProductDialog] = useState<{
    open: boolean;
    productId: number | null;
    productName: string;
  }>({
    open: false,
    productId: null,
    productName: "",
  });

  const [uploadImageDialog, setUploadImageDialog] = useState<{
    open: boolean;
    productId: number | null;
    productName: string;
    currentImageUrl: string;
  }>({
    open: false,
    productId: null,
    productName: "",
    currentImageUrl: "",
  });
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["vendor", "my-products"],
    queryFn: () => vendorService.getMyProducts(),
    enabled: isAuthenticated && isVendor,
  });

  // Product deactivation mutation
  const deactivateProductMutation = useMutation({
    mutationFn: (productId: number) =>
      vendorService.deactivateProduct(productId),
    onSuccess: () => {
      toast({
        title: "Product deactivated",
        description:
          "Your product has been deactivated and is no longer visible to customers.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "my-products"] });
      setDeactivateProductDialog({
        open: false,
        productId: null,
        productName: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Product reactivation mutation
  const reactivateProductMutation = useMutation({
    mutationFn: (productId: number) =>
      vendorService.reactivateProduct(productId),
    onSuccess: () => {
      toast({
        title: "Product reactivated",
        description: "Your product is now active and visible to customers.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "my-products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadProductImageMutation = useMutation({
    mutationFn: async ({
      productId,
      file,
    }: {
      productId: number;
      file: File;
    }) => imageService.uploadProductImages(productId, [file]),
    onSuccess: () => {
      toast({
        title: "Image uploaded",
        description: "Product image updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "my-products"] });
      setUploadImageDialog({
        open: false,
        productId: null,
        productName: "",
        currentImageUrl: "",
      });
      setPreviewFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to upload product image.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }

    setIsCompressingImage(true);
    try {
      const compressedBlob = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.8,
      });

      const compressedFile = new File(
        [compressedBlob],
        `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
        {
          type: "image/webp",
          lastModified: Date.now(),
        }
      );

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (error) {
      toast({
        title: "Compression failed",
        description: "Failed to compress image. Please try another file.",
        variant: "destructive",
      });
    } finally {
      setIsCompressingImage(false);
      event.target.value = "";
    }
  };

  const products: Product[] = productsData?.content || [];

  const { data: subCategoryNameMap = {} } = useQuery<Record<number, string>>({
    queryKey: ["vendor", "sub-category-name-map"],
    queryFn: async () => {
      const categoriesRes = await fetch("/api/categories", {
        credentials: "include",
      });
      const categories = await categoriesRes.json();

      const subCategoryGroups = await Promise.allSettled(
        (categories || []).map(async (cat: any) => {
          const res = await fetch(`/api/categories/${cat.id}/sub-categories`, {
            credentials: "include",
          });
          return await res.json();
        })
      );

      const flatSubs = subCategoryGroups
        .filter(
          (result): result is PromiseFulfilledResult<any[]> =>
            result.status === "fulfilled"
        )
        .flatMap((result) => result.value || []);

      return flatSubs.reduce((acc: Record<number, string>, sub: any) => {
        if (sub?.id) {
          acc[sub.id] = sub.name;
        }
        return acc;
      }, {});
    },
  });

  const getSubCategoryName = (product: Product) => {
    if (product.subCategoryName) return product.subCategoryName;
    if (!product.subCategoryId) return "N/A";
    return (
      subCategoryNameMap[product.subCategoryId] || `#${product.subCategoryId}`
    );
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.categoryName &&
        product.categoryName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (product.summary &&
        product.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "APPROVED":
      case "ENABLED":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "REJECTED":
      case "DISABLED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "INACTIVE":
        return <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">My Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {vendorProfile?.isApproved ? (
            <Button asChild>
              <Link to="/vendor/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="opacity-50 cursor-not-allowed"
              disabled
            >
              <Plus className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-gray-400">Add Product</span>
            </Button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {searchQuery
                ? "No products match your search"
                : "No products yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Start by creating your first product"}
            </p>
            {!searchQuery &&
              (vendorProfile?.isApproved ? (
                <Button asChild>
                  <Link to="/vendor/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Plus className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400">Create Product</span>
                </Button>
              ))}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <img
                    src={getProductImageUrl(product.images, product.cover)}
                    alt={product.name}
                    className="h-16 w-16 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.classList.add("hidden");
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <div className="h-16 w-16 rounded bg-gray-200 hidden items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold sm:whitespace-normal">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {product.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subcategory: {getSubCategoryName(product)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getStatusBadge(product.status || "")}
                      {product.rejectionReason && (
                        <RejectionReasonWithModal
                          reason={product.rejectionReason}
                          title="Product rejection reason"
                          truncateLength={50}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/products/${product.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/products/${product.id}/edit`}>Edit</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vendor/products/${product.id}/price`}>
                      Update Price
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setUploadImageDialog({
                        open: true,
                        productId: product.id!,
                        productName: product.name || "",
                        currentImageUrl:
                          getProductImageUrl(product.images, product.cover) ||
                          "",
                      })
                    }
                  >
                    Update Image
                  </Button>
                  {product.status?.toUpperCase() === "INACTIVE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        reactivateProductMutation.mutate(product.id!)
                      }
                      disabled={reactivateProductMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  ) : ["ACTIVE", "PENDING"].includes(
                      product.status?.toUpperCase() || ""
                    ) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDeactivateProductDialog({
                          open: true,
                          productId: product.id!,
                          productName: product.name || "",
                        })
                      }
                      disabled={
                        deactivateProductMutation.isPending ||
                        product.status?.toUpperCase() === "PENDING"
                      }
                      className={`text-red-600 hover:text-red-700 ${
                        product.status?.toUpperCase() === "PENDING"
                          ? "opacity-50 cursor-not-allowed hover:text-red-600"
                          : ""
                      }`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deactivate Product Dialog */}
      <AlertDialog
        open={deactivateProductDialog.open}
        onOpenChange={(open) => {
          if (!open && !deactivateProductMutation.isPending) {
            setDeactivateProductDialog({
              open: false,
              productId: null,
              productName: "",
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "
              {deactivateProductDialog.productName}"? This will hide the product
              from customers. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateProductMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deactivateProductDialog.productId) {
                  deactivateProductMutation.mutate(
                    deactivateProductDialog.productId
                  );
                }
              }}
              disabled={deactivateProductMutation.isPending}
            >
              {deactivateProductMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={uploadImageDialog.open}
        onOpenChange={(open) => {
          if (uploadProductImageMutation.isPending || isCompressingImage)
            return;
          setUploadImageDialog((prev) => ({ ...prev, open }));
          if (!open) {
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            setPreviewFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Product Image</DialogTitle>
            <DialogDescription>
              Upload a new image for "{uploadImageDialog.productName}". The file
              is compressed on your device before upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current image</p>
              <div className="h-32 w-32 rounded border bg-gray-50 overflow-hidden">
                {uploadImageDialog.currentImageUrl ? (
                  <img
                    src={uploadImageDialog.currentImageUrl}
                    alt="Current product"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Select new image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelection}
              />
              {isCompressingImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compressing image...
                </div>
              )}
            </div>

            {previewUrl && previewFile && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview (to be uploaded)</p>
                <div className="h-40 w-full rounded border bg-gray-50 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {previewFile.name} • {(previewFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setUploadImageDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={
                uploadProductImageMutation.isPending || isCompressingImage
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!uploadImageDialog.productId || !previewFile) return;
                uploadProductImageMutation.mutate({
                  productId: uploadImageDialog.productId,
                  file: previewFile,
                });
              }}
              disabled={
                uploadProductImageMutation.isPending ||
                isCompressingImage ||
                !previewFile ||
                !uploadImageDialog.productId
              }
            >
              {uploadProductImageMutation.isPending
                ? "Uploading..."
                : "Upload Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
