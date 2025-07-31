import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CurrencyToggleProps {
  className?: string;
}

export default function CurrencyToggle({ className = "" }: CurrencyToggleProps) {
  const [currency, setCurrency] = useState<"ETB" | "USD">("ETB");

  const toggleCurrency = () => {
    setCurrency(prev => prev === "ETB" ? "USD" : "ETB");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCurrency}
      className={`font-medium transition-all duration-200 hover:bg-ethiopian-gold hover:text-white hover:border-ethiopian-gold ${className}`}
    >
      {currency === "ETB" ? "ETB ↔ USD" : "USD ↔ ETB"}
    </Button>
  );
}