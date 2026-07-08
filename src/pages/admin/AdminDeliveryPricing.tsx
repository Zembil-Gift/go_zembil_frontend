import { useEffect, useState } from "react";
import { Loader2, MapPin, Save, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  adminService,
  type DeliveryPricingConfigDto,
} from "@/services/adminService";

const FEE_CURRENCIES = ["ETB", "USD"];

/**
 * Admin screen to toggle each country's delivery between Google Maps (dynamic) and a
 * manual flat fee, and to set that flat fee + currency. Used as a fallback when Google
 * Maps is unavailable.
 */
export default function AdminDeliveryPricing() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<DeliveryPricingConfigDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingCountry, setSavingCountry] = useState<string | null>(null);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getDeliveryPricingConfigs();
      setConfigs(data);
    } catch (err: any) {
      toast({
        title: "Failed to load delivery pricing",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchConfig = (
    countryCode: string,
    patch: Partial<DeliveryPricingConfigDto>
  ) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.countryCode === countryCode ? { ...c, ...patch } : c
      )
    );
  };

  const handleSave = async (config: DeliveryPricingConfigDto) => {
    if (config.deliveryMode === "MANUAL") {
      if (config.manualFlatFee == null || Number(config.manualFlatFee) < 0) {
        toast({
          title: "Flat fee required",
          description: `Enter a valid flat fee for ${config.countryCode} before saving manual mode.`,
          variant: "destructive",
        });
        return;
      }
      if (!config.manualFeeCurrency) {
        toast({
          title: "Currency required",
          description: `Choose a flat-fee currency for ${config.countryCode}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSavingCountry(config.countryCode);
    try {
      const updated = await adminService.updateDeliveryPricingConfig(
        config.countryCode,
        {
          deliveryMode: config.deliveryMode,
          manualFlatFee: config.manualFlatFee,
          manualFeeCurrency: config.manualFeeCurrency,
        }
      );
      patchConfig(config.countryCode, updated);
      toast({
        title: "Saved",
        description: `Delivery settings for ${config.countryCode} updated.`,
      });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCountry(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading delivery pricing…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Choose how each country captures delivery. <strong>Google Maps</strong>{" "}
        prices delivery by distance; <strong>Manual</strong> lets customers type
        their address and charges the flat fee you set below (useful when Google
        Maps is unavailable).
      </div>

      {configs.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No delivery pricing configs found.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {configs.map((config) => {
          const isManual = config.deliveryMode === "MANUAL";
          const isSaving = savingCountry === config.countryCode;
          return (
            <Card key={config.countryCode}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {config.countryCode}
                    <span className="text-xs font-normal text-gray-400">
                      ({config.currencyCode})
                    </span>
                  </span>
                  <Badge variant={isManual ? "secondary" : "default"}>
                    {isManual ? "Manual flat fee" : "Google Maps"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>
                      {isManual
                        ? "Manual address + flat fee"
                        : "Google Maps (distance-based)"}
                    </span>
                  </div>
                  <Switch
                    checked={isManual}
                    onCheckedChange={(checked) =>
                      patchConfig(config.countryCode, {
                        deliveryMode: checked ? "MANUAL" : "GOOGLE_MAPS",
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`flat-${config.countryCode}`}>
                      Flat fee
                    </Label>
                    <Input
                      id={`flat-${config.countryCode}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={config.manualFlatFee ?? ""}
                      disabled={!isManual}
                      onChange={(e) =>
                        patchConfig(config.countryCode, {
                          manualFlatFee:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`cur-${config.countryCode}`}>Currency</Label>
                    <Select
                      value={config.manualFeeCurrency || undefined}
                      onValueChange={(value) =>
                        patchConfig(config.countryCode, {
                          manualFeeCurrency: value,
                        })
                      }
                      disabled={!isManual}
                    >
                      <SelectTrigger id={`cur-${config.countryCode}`}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEE_CURRENCIES.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleSave(config)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
