import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { i18nReady } from "./i18n"; // Initialize i18n
import { LanguageProvider } from "./contexts/LanguageContext";

const root = document.getElementById("root");
if (root) {
  const render = () =>
    createRoot(root).render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );

  // ponytail: resolves synchronously-ish for English (no chunk to fetch); only
  // a non-default language pays the extra tick, and only to avoid a flash of
  // English on first paint.
  void i18nReady.then(render, render);
} else {
  console.error("Root element not found");
}
