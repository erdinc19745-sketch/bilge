import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";
import { startThemeClock } from "./lib/theme";
import { seedDemoIfRequested } from "./dev/seed";

startThemeClock();
seedDemoIfRequested();

// Service worker: çevrimdışı çalışma + yeni sürüm geldiğinde sessizce güncelle
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
