import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, MapPin, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { customOrderService } from "@/services/customOrderService";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { getCountries } from "libphonenumber-js/max";
import {
  GoogleMapsProvider,
  LocationPicker,
  type LocationData,
} from "@/components/maps";
import type {
  CreateCustomOrderDraftState,
  CreateCustomOrderRequest,
} from "@/types/customOrders";

interface AddressDto {
  id?: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  additionalDetails?: string;
  type?: "BILLING" | "SHIPPING";
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  formattedAddress?: string;
}

export default function CustomOrderShipping() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const templateIdNum = Number(templateId || 0);
  const draft = location.state as CreateCustomOrderDraftState | undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isAddressDirty, setIsAddressDirty] = useState(false);
  const [existingShippingAddressId, setExistingShippingAddressId] = useState<
    number | null
  >(null);

  const [shippingInfo, setShippingInfo] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    additionalDetails: "",
  });

  const [shippingCoords, setShippingCoords] = useState<{
    latitude?: number;
    longitude?: number;
    placeId?: string;
    formattedAddress?: string;
  }>({});

  const { data: template } = useQuery({
    queryKey: ["custom-order-template", templateIdNum],
    queryFn: () => customOrderTemplateService.getById(templateIdNum),
    enabled: templateIdNum > 0,
  });

  useEffect(() => {
    if (!draft || !templateIdNum || draft.templateId !== templateIdNum) {
      toast({
        title: "Custom Order Draft Missing",
        description:
          "Please complete your customization details first before adding shipping.",
        variant: "destructive",
      });
      navigate(`/custom-orders/template/${templateIdNum}`, { replace: true });
    }
  }, [draft, templateIdNum, navigate, toast]);

  useEffect(() => {
    const loadShippingAddress = async () => {
      try {
        const addresses = await apiService.getRequest<AddressDto[]>(
          "/api/addresses"
        );

        const shippingAddress = addresses?.find(
          (addr) => addr.type === "SHIPPING"
        );

        if (shippingAddress) {
          setExistingShippingAddressId(shippingAddress.id || null);
          setShippingInfo({
            street: shippingAddress.street || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
            postalCode: shippingAddress.postalCode || "",
            country: shippingAddress.country || "",
            additionalDetails: shippingAddress.additionalDetails || "",
          });
          if (shippingAddress.latitude && shippingAddress.longitude) {
            setShippingCoords({
              latitude: shippingAddress.latitude,
              longitude: shippingAddress.longitude,
              placeId: shippingAddress.placeId,
              formattedAddress: shippingAddress.formattedAddress,
            });
          }
        }
      } catch {
        // No saved shipping address yet.
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadShippingAddress();
  }, []);

  const canReuseExistingShippingAddress = useMemo(() => {
    return Boolean(existingShippingAddressId && !isAddressDirty);
  }, [existingShippingAddressId, isAddressDirty]);

  const allCountries = useMemo(() => {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((code) => ({
        code,
        label: displayNames.of(code) || code,
      }))
      .filter((country) => country.label && country.label !== country.code)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const handleSubmitOrder = async () => {
    if (!draft) {
      return;
    }

    if (!shippingInfo.street || !shippingInfo.city || !shippingInfo.country) {
      toast({
        title: "Missing Shipping Details",
        description: "Please fill street, city, and country before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!shippingCoords.latitude || !shippingCoords.longitude) {
      toast({
        title: "Pin Delivery Location",
        description: "Please pin your shipping location on the map.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let shippingAddressId = existingShippingAddressId || null;

      if (!canReuseExistingShippingAddress) {
        const createdAddress = await apiService.postRequest<AddressDto>(
          "/api/addresses/type/SHIPPING",
          {
            type: "SHIPPING",
            street: shippingInfo.street,
            city: shippingInfo.city,
            state: shippingInfo.state || shippingInfo.city,
            postalCode: shippingInfo.postalCode || "1000",
            country: shippingInfo.country,
            additionalDetails: shippingInfo.additionalDetails || undefined,
            latitude: shippingCoords.latitude,
            longitude: shippingCoords.longitude,
            formattedAddress:
              shippingCoords.formattedAddress ||
              `${shippingInfo.street}, ${shippingInfo.city}, ${shippingInfo.country}`,
            isDefault: true,
          }
        );

        if (!createdAddress?.id) {
          throw new Error("Unable to create shipping address.");
        }

        shippingAddressId = createdAddress.id;
      }

      if (!shippingAddressId) {
        throw new Error("Shipping address could not be resolved.");
      }

      const request: CreateCustomOrderRequest = {
        templateId: draft.templateId,
        shippingAddressId,
        additionalDescription: draft.additionalDescription,
        discountCode: draft.discountCode,
        values: draft.values,
      };

      const order = await customOrderService.create(request, draft.files);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-custom-orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["vendor", "custom-orders"],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "custom-orders"] }),
      ]);

      const isNonNegotiable = template?.negotiable === false;

      if (isNonNegotiable) {
        toast({
          title: "Order Created",
          description: `Your order #${order.orderNumber} is ready for payment.`,
        });
        navigate(`/my-custom-orders/${order.id}?action=pay`);
        return;
      }

      toast({
        title: "Order Submitted",
        description: `Your custom order #${order.orderNumber} was submitted successfully.`,
      });
      navigate(`/my-custom-orders/${order.id}`);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description:
          error?.message || "Failed to submit custom order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draft) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/custom-orders/template/${templateIdNum}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customization
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipping Information
            </CardTitle>
            <p className="text-sm text-gray-600">
              Add your shipping address and pin your map location so delivery
              can be calculated correctly.
            </p>
            {isLoadingAddress && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved shipping address...
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Street *</Label>
                <Input
                  id="street"
                  value={shippingInfo.street}
                  onChange={(e) => {
                    setShippingInfo((prev) => ({
                      ...prev,
                      street: e.target.value,
                    }));
                    setIsAddressDirty(true);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={shippingInfo.city}
                  onChange={(e) => {
                    setShippingInfo((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }));
                    setIsAddressDirty(true);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={shippingInfo.state}
                  onChange={(e) => {
                    setShippingInfo((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }));
                    setIsAddressDirty(true);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={shippingInfo.postalCode}
                  onChange={(e) => {
                    setShippingInfo((prev) => ({
                      ...prev,
                      postalCode: e.target.value,
                    }));
                    setIsAddressDirty(true);
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <Select
                value={shippingInfo.country}
                onValueChange={(value) => {
                  setShippingInfo((prev) => ({
                    ...prev,
                    country: value,
                  }));
                  setIsAddressDirty(true);
                }}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allCountries.map((country) => (
                    <SelectItem key={country.code} value={country.label}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="additionalDetails">Additional Details</Label>
              <Input
                id="additionalDetails"
                placeholder="Landmark, building, floor, etc."
                value={shippingInfo.additionalDetails}
                onChange={(e) => {
                  setShippingInfo((prev) => ({
                    ...prev,
                    additionalDetails: e.target.value,
                  }));
                  setIsAddressDirty(true);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Pin Delivery Location *
              </Label>
              <GoogleMapsProvider>
                <LocationPicker
                  latitude={shippingCoords.latitude}
                  longitude={shippingCoords.longitude}
                  onLocationSelect={(loc: LocationData) => {
                    setShippingInfo((prev) => ({
                      ...prev,
                      street: loc.streetAddress || loc.formattedAddress,
                      city: loc.city || prev.city,
                      state: loc.state || prev.state,
                      postalCode: loc.postalCode || prev.postalCode,
                      country: loc.country || prev.country,
                    }));
                    setShippingCoords({
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      placeId: loc.placeId,
                      formattedAddress: loc.formattedAddress,
                    });
                    setIsAddressDirty(true);
                  }}
                  height="320px"
                  placeholder="Search and pin your shipping address..."
                />
              </GoogleMapsProvider>
              {shippingCoords.formattedAddress && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  {shippingCoords.formattedAddress}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="w-full h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Order
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
