import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { i18nReady } from "./i18n";

// ponytail: the old main.tsx waited for i18nReady too. English resolves
// immediately (no chunk to fetch); only a non-default language pays the extra
// tick, and only to avoid a flash of English on first paint.
void i18nReady.finally(() => {
  startTransition(() => {
    hydrateRoot(document, <HydratedRouter />);
  });
});
