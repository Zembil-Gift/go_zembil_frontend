import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_COUNTRIES } from "@/lib/countryConfig";
import { MapPin } from "lucide-react";

export interface ManualAddressValue {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

interface ManualAddressFormProps {
  value: ManualAddressValue;
  onChange: (patch: Partial<ManualAddressValue>) => void;
  /** Unique prefix so field ids don't collide when multiple forms render on a page. */
  idPrefix?: string;
}

/**
 * Simple typed delivery-address form used when the country is in MANUAL delivery mode
 * (Google Maps unavailable). Collects address/street, city and country only — no map,
 * no coordinates. Delivery is charged a flat fee configured by the admin.
 */
export default function ManualAddressForm({
  value,
  onChange,
  idPrefix = "manual",
}: ManualAddressFormProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-street`}>Address *</Label>
        <Input
          id={`${idPrefix}-street`}
          value={value.street}
          onChange={(e) => onChange({ street: e.target.value })}
          placeholder="4 Kilo"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-city`}>City *</Label>
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Addis Ababa"
            required
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-country`}>Country *</Label>
          <Select
            value={value.country || undefined}
            onValueChange={(country) => onChange({ country })}
          >
            <SelectTrigger id={`${idPrefix}-country`}>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
