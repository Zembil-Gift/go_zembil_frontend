import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Initialize i18n
import { LanguageProvider } from "./contexts/LanguageContext";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
} else {
  console.error("Root element not found");
}
