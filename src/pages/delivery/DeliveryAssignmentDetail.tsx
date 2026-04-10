import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Camera,
  Truck,
  User,
  Navigation,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { deliveryService, DeliveryStatus } from "@/services/deliveryService";
import { imageService } from "@/services/imageService";
import {
  AuthenticatedImage,
  useAuthenticatedImageViewer,
} from "@/components/AuthenticatedImage";
import imageCompression from "browser-image-compression";

export default function DeliveryAssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openImage } = useAuthenticatedImageViewer();
  const deliveryVideoRef = useRef<HTMLVideoElement>(null);
  const pickupVideoRef = useRef<HTMLVideoElement>(null);
  const deliveryStreamRef = useRef<MediaStream | null>(null);
  const pickupStreamRef = useRef<MediaStream | null>(null);

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showFailDialog, setShowFailDialog] = useState(false);
  const [showPickupProofDialog, setShowPickupProofDialog] = useState(false);
  const [_proofImageUrl, setProofImageUrl] = useState("");
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(
    null
  );
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [pickupImagePreview, setPickupImagePreview] = useState<string | null>(
    null
  );
  const [pickupImageFile, setPickupImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPickupImage, setIsUploadingPickupImage] = useState(false);
  const [isStartingDeliveryCamera, setIsStartingDeliveryCamera] =
    useState(false);
  const [isStartingPickupCamera, setIsStartingPickupCamera] = useState(false);
  const [isDeliveryCameraReady, setIsDeliveryCameraReady] = useState(false);
  const [isPickupCameraReady, setIsPickupCameraReady] = useState(false);
  const [pickupNotes, setPickupNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");

  const compressCapturedImage = async (file: File): Promise<File> => {
    return imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    });
  };

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["delivery", "assignment", assignmentId],
    queryFn: () => deliveryService.getAssignmentById(Number(assignmentId)),
    enabled: !!assignmentId,
  });

  // Accept assignment mutation
  const acceptMutation = useMutation({
    mutationFn: () => deliveryService.acceptAssignment(Number(assignmentId)),
    onSuccess: () => {
      toast({
        title: "Assignment Accepted",
        description: "You have accepted this delivery",
      });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept assignment",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: DeliveryStatus) =>
      deliveryService.updateDeliveryStatus(Number(assignmentId), { status }),
    onSuccess: (data) => {
      toast({
        title: "Status Updated",
        description: `Delivery is now ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Fail delivery mutation
  const failMutation = useMutation({
    mutationFn: () =>
      deliveryService.reportDeliveryFailure(
        Number(assignmentId),
        failureReason
      ),
    onSuccess: () => {
      toast({
        title: "Delivery Failed",
        description: "The delivery failure has been reported",
      });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
      setShowFailDialog(false);
      navigate("/delivery/assignments");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to report failure",
        variant: "destructive",
      });
    },
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
    return new Date(date).toLocaleString();
  };

  const getNextStatus = (currentStatus: string): DeliveryStatus | null => {
    const statusFlow: Record<string, DeliveryStatus> = {
      ACCEPTED: "PICKED_UP",
      PICKED_UP: "IN_TRANSIT",
      IN_TRANSIT: "ARRIVED",
    };
    return statusFlow[currentStatus] || null;
  };

  const getNextStatusLabel = (currentStatus: string): string => {
    const labels: Record<string, string> = {
      ACCEPTED: "Mark as Picked Up",
      PICKED_UP: "Start Transit",
      IN_TRANSIT: "Mark as Arrived",
    };
    return labels[currentStatus] || "";
  };

  const stopCamera = (
    streamRef: React.MutableRefObject<MediaStream | null>,
    videoRef: React.RefObject<HTMLVideoElement>,
    setCameraReady: (ready: boolean) => void
  ) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const startCamera = async (
    streamRef: React.MutableRefObject<MediaStream | null>,
    videoRef: React.RefObject<HTMLVideoElement>,
    setStarting: (loading: boolean) => void,
    setCameraReady: (ready: boolean) => void
  ) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Camera Not Supported",
        description: "Your browser does not support direct camera access.",
        variant: "destructive",
      });
      return;
    }

    setStarting(true);
    try {
      stopCamera(streamRef, videoRef, setCameraReady);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      toast({
        title: "Camera Access Failed",
        description: "Please allow camera permission and try again.",
        variant: "destructive",
      });
      setCameraReady(false);
    } finally {
      setStarting(false);
    }
  };

  const captureFromCamera = async (
    videoRef: React.RefObject<HTMLVideoElement>,
    streamRef: React.MutableRefObject<MediaStream | null>,
    setCameraReady: (ready: boolean) => void,
    setImageFile: (file: File | null) => void,
    setImagePreview: (preview: string | null) => void,
    successDescription: string
  ) => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for camera preview and try again.",
        variant: "destructive",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast({
        title: "Capture Failed",
        description: "Could not capture camera frame.",
        variant: "destructive",
      });
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      toast({
        title: "Capture Failed",
        description: "Could not generate image from camera frame.",
        variant: "destructive",
      });
      return;
    }

    let processedFile = new File([blob], `capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    try {
      processedFile = await compressCapturedImage(processedFile);
    } catch {
      toast({
        title: "Compression Skipped",
        description: "Could not compress image, using original capture.",
      });
    }

    setImageFile(processedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(processedFile);

    stopCamera(streamRef, videoRef, setCameraReady);
    toast({ title: "Photo Captured", description: successDescription });
  };

  // Upload pickup proof image and save
  const handleUploadPickupProof = async () => {
    if (!pickupImageFile) {
      toast({
        title: "Image Required",
        description: "Please capture or select a pickup proof image",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPickupImage(true);
    try {
      const uploadedImage = await imageService.uploadDeliveryPickupImage(
        Number(assignmentId),
        pickupImageFile
      );
      const imageUrl = uploadedImage.url;

      await deliveryService.uploadPickupProof(Number(assignmentId), {
        pickupImageUrl: imageUrl,
        notes: pickupNotes || undefined,
      });

      toast({
        title: "Pickup Proof Uploaded!",
        description: "You can now mark the order as picked up",
      });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
      setShowPickupProofDialog(false);
      handleClearPickupImage();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to upload pickup proof",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPickupImage(false);
    }
  };

  // Clear pickup image
  const handleClearPickupImage = () => {
    stopCamera(pickupStreamRef, pickupVideoRef, setIsPickupCameraReady);
    setPickupImageFile(null);
    setPickupImagePreview(null);
    setPickupNotes("");
  };

  const handleCompleteDelivery = async () => {
    if (!proofImageFile) {
      toast({
        title: "Image Required",
        description: "Please capture or select a proof image",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedImage = await imageService.uploadDeliveryProofImage(
        Number(assignmentId),
        proofImageFile
      );
      const imageUrl = uploadedImage.url;

      await deliveryService.completeDelivery(Number(assignmentId), {
        proofImageUrl: imageUrl,
        recipientName,
        notes,
      });

      toast({
        title: "Delivery Completed!",
        description: "The delivery has been marked as completed",
      });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
      setShowCompleteDialog(false);
      navigate("/delivery/assignments");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to complete delivery",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Clear selected image
  const handleClearImage = () => {
    stopCamera(deliveryStreamRef, deliveryVideoRef, setIsDeliveryCameraReady);
    setProofImageFile(null);
    setProofImagePreview(null);
    setProofImageUrl("");
  };

  useEffect(() => {
    if (showCompleteDialog && !proofImagePreview) {
      void startCamera(
        deliveryStreamRef,
        deliveryVideoRef,
        setIsStartingDeliveryCamera,
        setIsDeliveryCameraReady
      );
    }
  }, [showCompleteDialog, proofImagePreview]);

  useEffect(() => {
    if (showPickupProofDialog && !pickupImagePreview) {
      void startCamera(
        pickupStreamRef,
        pickupVideoRef,
        setIsStartingPickupCamera,
        setIsPickupCameraReady
      );
    }
  }, [showPickupProofDialog, pickupImagePreview]);

  useEffect(() => {
    return () => {
      stopCamera(deliveryStreamRef, deliveryVideoRef, setIsDeliveryCameraReady);
      stopCamera(pickupStreamRef, pickupVideoRef, setIsPickupCameraReady);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-medium mb-2">Assignment Not Found</h2>
        <Button onClick={() => navigate("/delivery/assignments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignments
        </Button>
      </div>
    );
  }

  const isTerminalStatus = ["DELIVERED", "FAILED", "CANCELLED"].includes(
    assignment.status
  );
  const nextStatus = getNextStatus(assignment.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {assignment.orderType === "CUSTOM" ? "Custom " : ""}Order #
            {assignment.customOrderNumber || assignment.orderNumber}
          </h1>
          <Badge className={getStatusColor(assignment.status)}>
            {assignment.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Name</Label>
                  <p className="font-medium">
                    {assignment.customerName || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {assignment.customerPhone || "N/A"}
                    </p>
                    {assignment.customerPhone && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`tel:${assignment.customerPhone}`}
                          title="Call customer"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="sr-only">Call customer</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {assignment.shippingAddress || "N/A"}
              </p>
              <p className="text-gray-500">{assignment.shippingCity || ""}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  const address = `${assignment.shippingAddress}, ${assignment.shippingCity}`;
                  window.open(
                    `https://maps.google.com/?q=${encodeURIComponent(address)}`,
                    "_blank"
                  );
                }}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Open in Maps
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Assigned</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(assignment.assignedAt)}
                    </p>
                  </div>
                </div>
                {assignment.pickedUpAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Picked Up</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(assignment.pickedUpAt)}
                      </p>
                    </div>
                  </div>
                )}
                {assignment.deliveredAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(assignment.deliveredAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pickup Proof Image */}
          {assignment.pickupImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Pickup Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuthenticatedImage
                  src={assignment.pickupImageUrl}
                  alt="Pickup proof"
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => openImage(assignment.pickupImageUrl ?? "")}
                />
                {assignment.pickupUploadedAt && (
                  <p className="text-sm text-gray-500 mt-2">
                    Uploaded: {formatDate(assignment.pickupUploadedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delivery Proof Image */}
          {assignment.proofImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Delivery Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuthenticatedImage
                  src={assignment.proofImageUrl}
                  alt="Delivery proof"
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => openImage(assignment.proofImageUrl ?? "")}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Recipient: {assignment.recipientName || "N/A"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Attempt</span>
                <span>{assignment.attemptCount}</span>
              </div>
              {assignment.expectedDeliveryAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expected By</span>
                  <span>{formatDate(assignment.expectedDeliveryAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {!isTerminalStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.status === "ASSIGNED" && (
                  <Button
                    className="w-full bg-ethiopian-gold hover:bg-ethiopian-gold/90"
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Accept Assignment
                  </Button>
                )}

                {/* Pickup Proof Button - shown when ACCEPTED and no pickup proof yet */}
                {assignment.status === "ACCEPTED" &&
                  !assignment.pickupImageUrl && (
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setShowPickupProofDialog(true)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Pickup Photo
                    </Button>
                  )}

                {/* Show pickup proof status */}
                {assignment.status === "ACCEPTED" &&
                  assignment.pickupImageUrl && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="h-4 w-4" />
                      Pickup photo uploaded
                    </div>
                  )}

                {/* Modified: Only show Mark as Picked Up if pickup proof is uploaded */}
                {assignment.status === "ACCEPTED" &&
                  assignment.pickupImageUrl && (
                    <Button
                      className="w-full"
                      onClick={() => updateStatusMutation.mutate("PICKED_UP")}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="mr-2 h-4 w-4" />
                      )}
                      Mark as Picked Up
                    </Button>
                  )}

                {/* Other status transitions (PICKED_UP -> IN_TRANSIT, IN_TRANSIT -> ARRIVED) */}
                {nextStatus && assignment.status !== "ACCEPTED" && (
                  <Button
                    className="w-full"
                    onClick={() => updateStatusMutation.mutate(nextStatus)}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="mr-2 h-4 w-4" />
                    )}
                    {getNextStatusLabel(assignment.status)}
                  </Button>
                )}

                {assignment.status === "ARRIVED" && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowCompleteDialog(true)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Delivery
                  </Button>
                )}

                {!["ASSIGNED", "DELIVERED", "FAILED", "CANCELLED"].includes(
                  assignment.status
                ) && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowFailDialog(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Report Failure
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {assignment.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{assignment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Failure Reason */}
          {assignment.failureReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Failure Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{assignment.failureReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={showCompleteDialog}
        onOpenChange={(open) => {
          setShowCompleteDialog(open);
          if (!open) {
            handleClearImage();
            setRecipientName("");
            setNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Take a photo as proof of delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name of person who received the package"
              />
            </div>
            <div>
              <Label htmlFor="camera-input">
                Delivery Proof Photo <span className="text-red-500">*</span>
              </Label>

              {/* Image Preview or Camera View */}
              {proofImagePreview ? (
                <div className="mt-2 relative">
                  <img
                    src={proofImagePreview}
                    alt="Delivery proof preview"
                    className="w-full max-h-64 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleClearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="absolute bottom-2 right-2"
                    onClick={() => {
                      setProofImageFile(null);
                      setProofImagePreview(null);
                      void startCamera(
                        deliveryStreamRef,
                        deliveryVideoRef,
                        setIsStartingDeliveryCamera,
                        setIsDeliveryCameraReady
                      );
                    }}
                  >
                    Retake
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg border bg-black/90 overflow-hidden">
                    <video
                      ref={deliveryVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void startCamera(
                          deliveryStreamRef,
                          deliveryVideoRef,
                          setIsStartingDeliveryCamera,
                          setIsDeliveryCameraReady
                        );
                      }}
                      disabled={isStartingDeliveryCamera}
                    >
                      {isStartingDeliveryCamera ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}
                      Start Camera
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        void captureFromCamera(
                          deliveryVideoRef,
                          deliveryStreamRef,
                          setIsDeliveryCameraReady,
                          setProofImageFile,
                          setProofImagePreview,
                          "Delivery proof image is ready for upload"
                        );
                      }}
                      disabled={!isDeliveryCameraReady}
                    >
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the delivery"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleCompleteDelivery}
              disabled={!proofImageFile || isUploadingImage}
            >
              {isUploadingImage && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploadingImage ? "Uploading..." : "Complete Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Delivery Dialog */}
      <AlertDialog open={showFailDialog} onOpenChange={setShowFailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Delivery Failure</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for the delivery failure
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="e.g., Customer not available, Wrong address, etc."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => failMutation.mutate()}
              disabled={!failureReason || failMutation.isPending}
            >
              Report Failure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pickup Proof Dialog */}
      <Dialog
        open={showPickupProofDialog}
        onOpenChange={(open) => {
          setShowPickupProofDialog(open);
          if (!open) {
            handleClearPickupImage();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Pickup Proof</DialogTitle>
            <DialogDescription>
              Take a photo of the product when you receive it. This serves as
              evidence of the product's condition before delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pickup-camera-input">
                Product Photo <span className="text-red-500">*</span>
              </Label>

              {/* Image Preview or Camera View */}
              {pickupImagePreview ? (
                <div className="mt-2 relative">
                  <img
                    src={pickupImagePreview}
                    alt="Pickup proof preview"
                    className="w-full max-h-64 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleClearPickupImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="absolute bottom-2 right-2"
                    onClick={() => {
                      setPickupImageFile(null);
                      setPickupImagePreview(null);
                      void startCamera(
                        pickupStreamRef,
                        pickupVideoRef,
                        setIsStartingPickupCamera,
                        setIsPickupCameraReady
                      );
                    }}
                  >
                    Retake
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg border bg-black/90 overflow-hidden">
                    <video
                      ref={pickupVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void startCamera(
                          pickupStreamRef,
                          pickupVideoRef,
                          setIsStartingPickupCamera,
                          setIsPickupCameraReady
                        );
                      }}
                      disabled={isStartingPickupCamera}
                    >
                      {isStartingPickupCamera ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}
                      Start Camera
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        void captureFromCamera(
                          pickupVideoRef,
                          pickupStreamRef,
                          setIsPickupCameraReady,
                          setPickupImageFile,
                          setPickupImagePreview,
                          "Pickup proof image is ready for upload"
                        );
                      }}
                      disabled={!isPickupCameraReady}
                    >
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                placeholder="Any notes about the product condition, packaging, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPickupProofDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleUploadPickupProof}
              disabled={!pickupImageFile || isUploadingPickupImage}
            >
              {isUploadingPickupImage && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploadingPickupImage ? "Uploading..." : "Upload Pickup Proof"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
