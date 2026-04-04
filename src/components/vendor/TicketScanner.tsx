import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { vendorService, TicketValidationResponse, TicketStatus } from "@/services/vendorService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ticket,
  User,
  Mail,
  Calendar,
  MapPin,
  Hash,
  RefreshCw,
  Search,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketScannerProps {
  className?: string;
}

type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: string },
    configuration: {
      fps?: number;
      qrbox?:
        | {
            width: number;
            height: number;
          }
        | ((viewfinderWidth: number, viewfinderHeight: number) => {
            width: number;
            height: number;
          });
    },
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback?: (errorMessage: string) => void,
  ) => Promise<unknown>;
  stop: () => Promise<void>;
};

type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance;

export function TicketScanner({ className }: TicketScannerProps) {
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [validationResult, setValidationResult] = useState<TicketValidationResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const html5QrcodeCtorRef = useRef<Html5QrcodeConstructor | null>(null);
  const lastScannedCode = useRef<string>("");
  const scanCooldownRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Validate ticket mutation
  const validateMutation = useMutation({
    mutationFn: (ticketCode: string) => vendorService.validateTicket(ticketCode),
    onSuccess: (data: TicketValidationResponse) => {
      setValidationResult(data);
      if (data.valid) {
        toast({
          title: "Valid Ticket",
          description: data.message,
        });
      } else {
        toast({
          title: "Invalid Ticket",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || "Failed to validate ticket";
      setValidationResult({
        valid: false,
        message,
      });
      toast({
        title: "Validation Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Check-in ticket mutation
  const checkInMutation = useMutation({
    mutationFn: (ticketCode: string) => vendorService.checkInTicket(ticketCode),
    onSuccess: (data: TicketValidationResponse) => {
      setValidationResult(data);
      if (data.valid || data.message?.includes("successful")) {
        toast({
          title: "Check-In Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Check-In Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || "Failed to check in ticket";
      toast({
        title: "Check-In Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const loadQrScannerLibrary = useCallback(async (): Promise<Html5QrcodeConstructor> => {
    if (html5QrcodeCtorRef.current) {
      return html5QrcodeCtorRef.current;
    }

    const module = await import("html5-qrcode");
    html5QrcodeCtorRef.current = module.Html5Qrcode as Html5QrcodeConstructor;
    return html5QrcodeCtorRef.current;
  }, []);

  // Start camera scanner
  const startCamera = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      // Stop existing scanner if any
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore stop errors
        }
        scannerRef.current = null;
      }

      // Set camera active first so container becomes visible
      setIsCameraActive(true);
      
      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear the container before starting
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const scannerId = `qr-reader-${Date.now()}`;
      if (containerRef.current) {
        const scannerDiv = document.createElement('div');
        scannerDiv.id = scannerId;
        scannerDiv.style.width = '100%';
        scannerDiv.style.height = '100%';
        containerRef.current.appendChild(scannerDiv);
      }

      const Html5Qrcode = await loadQrScannerLibrary();
      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Calculate a square qrbox that's properly centered
            const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.min(200, minDimension * 0.6);
            return {
              width: qrboxSize,
              height: qrboxSize,
            };
          },
        },
        (decodedText) => {
          // Prevent rapid-fire scans of the same code
          if (scanCooldownRef.current || decodedText === lastScannedCode.current) {
            return;
          }

          scanCooldownRef.current = true;
          lastScannedCode.current = decodedText;
          if (isMountedRef.current) {
            setIsProcessing(true);
          }

          // Validate the scanned ticket
          validateMutation.mutate(decodedText, {
            onSettled: () => {
              if (isMountedRef.current) {
                setIsProcessing(false);
              }
              // Reset cooldown after 2 seconds
              setTimeout(() => {
                scanCooldownRef.current = false;
              }, 2000);
            },
          });
        },
        () => {
          // QR code detection error - silent ignore
        }
      );
    } catch (error) {
      console.error("Failed to start camera:", error);
      if (isMountedRef.current) {
        setIsCameraActive(false);
        toast({
          title: "Camera Error",
          description: "Failed to access camera. Please check permissions or use manual entry.",
          variant: "destructive",
        });
      }
    }
  }, [loadQrScannerLibrary, validateMutation, toast]);

  // Stop camera scanner
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        // Ignore errors during stop
      }
      scannerRef.current = null;
    }
    
    // Clear the container to remove any leftover DOM elements
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    if (isMountedRef.current) {
      setIsCameraActive(false);
    }
    lastScannedCode.current = "";
    scanCooldownRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Stop the scanner
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      
      // Clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Handle manual code submission
  const handleManualValidate = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a ticket code",
        variant: "destructive",
      });
      return;
    }
    validateMutation.mutate(manualCode.trim());
  };

  // Handle check-in
  const handleCheckIn = () => {
    if (validationResult?.ticketCode) {
      checkInMutation.mutate(validationResult.ticketCode);
    }
  };

  // Reset validation result
  const handleReset = () => {
    setValidationResult(null);
    setManualCode("");
    lastScannedCode.current = "";
    scanCooldownRef.current = false;
  };

  // Get status badge styling
  const getStatusBadge = (status?: TicketStatus) => {
    switch (status) {
      case "ISSUED":
        return <Badge className="bg-green-500 text-white">Valid - Ready for Check-In</Badge>;
      case "CHECKED_IN":
        return <Badge className="bg-amber-500 text-white">Already Checked In</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-500 text-white">Cancelled</Badge>;
      case "REFUNDED":
        return <Badge className="bg-red-500 text-white">Refunded</Badge>;
      case "EXPIRED":
        return <Badge className="bg-gray-500 text-white">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown Status</Badge>;
    }
  };

  // Get result card styling
  const getResultStyle = () => {
    if (!validationResult) return "";
    if (validationResult.valid) {
      return "border-green-500 bg-green-50";
    }
    if (validationResult.status === "CHECKED_IN") {
      return "border-amber-500 bg-amber-50";
    }
    return "border-red-500 bg-red-50";
  };

  // Get result icon
  const getResultIcon = () => {
    if (!validationResult) return null;
    if (validationResult.valid) {
      return <CheckCircle className="h-12 w-12 text-green-500" />;
    }
    if (validationResult.status === "CHECKED_IN") {
      return <AlertTriangle className="h-12 w-12 text-amber-500" />;
    }
    return <XCircle className="h-12 w-12 text-red-500" />;
  };

  const isLoading = validateMutation.isPending || checkInMutation.isPending || isProcessing;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Ticket Scanner
          </CardTitle>
          <CardDescription>
            Scan a QR code or enter the ticket code manually to validate and check in attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera Scanner */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Camera Scanner</Label>
              <Button
                variant={isCameraActive ? "destructive" : "default"}
                size="sm"
                onClick={isCameraActive ? stopCamera : startCamera}
                disabled={isLoading}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            </div>

            {/* Scanner area wrapper - responsive sizing */}
            <div className="relative max-w-md mx-auto lg:max-w-lg">
              {/* Placeholder - shown when camera is not active */}
              {!isCameraActive && (
                <div className="h-[300px] sm:h-[350px] lg:h-[400px] flex items-center justify-center rounded-lg bg-gray-100">
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Click "Start Camera" to scan QR codes</p>
                  </div>
                </div>
              )}
              
              {/* Scanner container - responsive sizing, completely empty, only used by html5-qrcode */}
              <div
                ref={containerRef}
                style={{ 
                  display: isCameraActive ? 'block' : 'none', 
                  height: '400px',
                  width: '100%',
                  position: 'relative'
                }}
                className="mx-auto rounded-lg overflow-hidden bg-black"
              />
              
              {/* Processing overlay */}
              {isProcessing && isCameraActive && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                  <RefreshCw className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-muted-foreground text-sm">
              or
            </span>
          </div>

          {/* Manual Entry */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Manual Entry</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticket code (e.g., EVT-123-ABCD1234)"
                value={manualCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualCode(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleManualValidate()}
                disabled={isLoading}
              />
              <Button
                onClick={handleManualValidate}
                disabled={isLoading || !manualCode.trim()}
              >
                {validateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Result */}
      {validationResult && (
        <Card className={cn("border-2 transition-colors", getResultStyle())}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {getResultIcon()}
                <div>
                  <CardTitle className="text-xl">
                    {validationResult.valid ? "Valid Ticket" : "Invalid Ticket"}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">{validationResult.message}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Scan New
              </Button>
            </div>
          </CardHeader>

          {(validationResult.ticketCode || validationResult.eventTitle) && (
            <CardContent className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {getStatusBadge(validationResult.status)}
                {validationResult.checkedInAt && (
                  <span className="text-sm text-muted-foreground">
                    Checked in: {new Date(validationResult.checkedInAt).toLocaleString()}
                    {validationResult.checkedInByName && ` by ${validationResult.checkedInByName}`}
                  </span>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Ticket Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Ticket Details
                  </h4>
                  <div className="space-y-3">
                    {validationResult.ticketCode && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{validationResult.ticketCode}</span>
                      </div>
                    )}
                    {validationResult.ticketTypeName && (
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span>{validationResult.ticketTypeName}</span>
                      </div>
                    )}
                    {validationResult.recipientName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{validationResult.recipientName}</span>
                      </div>
                    )}
                    {validationResult.recipientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{validationResult.recipientEmail}</span>
                      </div>
                    )}
                    {validationResult.orderNumber && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Order: {validationResult.orderNumber}</span>
                        {validationResult.purchaserName && (
                          <span>• Purchaser: {validationResult.purchaserName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Event Details
                  </h4>
                  <div className="space-y-3">
                    {validationResult.eventTitle && (
                      <div className="font-medium">{validationResult.eventTitle}</div>
                    )}
                    {validationResult.eventDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(validationResult.eventDate).toLocaleString()}</span>
                      </div>
                    )}
                    {validationResult.eventLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{validationResult.eventLocation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Check-In Action */}
              {validationResult.valid && validationResult.status === "ISSUED" && (
                <>
                  <Separator />
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      className="w-full md:w-auto min-w-[200px] bg-green-600 hover:bg-green-700"
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                    >
                      {checkInMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Check In Attendee
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Usage Tips */}
      {!validationResult && (
        <Alert>
          <Ticket className="h-4 w-4" />
          <AlertTitle>Tips for Quick Check-In</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li>Point your camera at the QR code on the attendee's ticket</li>
              <li>Hold steady until the code is detected</li>
              <li>Ticket codes follow the format: EVT-[EventID]-[RandomCode]</li>
              <li>You can also type the code manually if scanning doesn't work</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
