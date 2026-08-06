import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { freeGiftService, pickUnlockedGift } from "@/services/freeGiftService";
import { useTranslation } from "react-i18next";

interface FreeGiftLineProps {
  subtotalMinor: number;
  cartCurrency: string | undefined;
  /** Compact variant for the cart sidebar. */
  compact?: boolean;
}

/**
 * Read-only $0 gift line shown automatically once the cart subtotal reaches an
 * admin-configured threshold. With several campaigns running, the richest tier
 * the cart clears wins — same rule the server applies at checkout. Purely
 * presentational: the gift becomes a real admin-owned sub-order on the server,
 * so it is never added to the cart store and cannot be edited or removed here.
 */
export function FreeGiftLine({
  subtotalMinor,
  cartCurrency,
  compact = false,
}: FreeGiftLineProps) {
  const { t } = useTranslation();
  const { data: tiers } = useQuery({
    queryKey: ["free-gift"],
    queryFn: () => freeGiftService.getFreeGiftTiers(),
    staleTime: 60_000,
  });

  const gift = pickUnlockedGift(tiers, subtotalMinor, cartCurrency);
  if (!gift) return null;

  const imageUrl = gift.giftProductCover ?? "";
  const size = compact ? "w-14 h-14" : "w-24 h-24";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-3">
      <div className={`relative ${size} flex-shrink-0`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={gift.giftProductName ?? "Free gift"}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-green-100 rounded-lg flex items-center justify-center">
            <Gift className="text-green-600" />
          </div>
        )}
        <span className="absolute -top-2 -left-2 bg-green-600 text-white rounded-full p-1">
          <Gift size={14} />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
          {t("Free gift unlocked")}
        </p>
        <p className="font-semibold text-charcoal truncate">
          {gift.giftProductName ?? "Free gift"}
        </p>
        <p className="text-xs text-gray-500">{t("Added automatically · no extra cost")}</p>
      </div>

      <div className="text-right">
        <span className="font-bold text-green-700">{t("FREE")}</span>
        <p className="text-xs text-gray-400 line-through">$0.00</p>
      </div>
    </div>
  );
}
