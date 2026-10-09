import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { i18nReady } from "./i18n";
import { useGuestCurrencyStore } from "@/stores/currency-store";

// The server rendered prices in the currency on <html data-currency> (root.tsx).
// The persisted store may remember another one from an earlier visit; the first
// client render must ask for the same prices, or every price query refetches
// and the page hydrates against different HTML. PrefsSync corrects it from the
// timezone after hydration.
const currency = document.documentElement.dataset.currency;
if (currency) useGuestCurrencyStore.getState().setGuestCurrency(currency);

// i18n picked <html lang> too; English resolves immediately, Amharic waits for
// its lazily loaded bundle so the first render is not English.
void i18nReady.finally(() => {
  startTransition(() => {
    hydrateRoot(document, <HydratedRouter />);
  });
});
