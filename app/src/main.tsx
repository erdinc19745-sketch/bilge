import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";
import { startThemeClock } from "./lib/theme";
import { seedDemoIfRequested } from "./dev/seed";

startThemeClock();
seedDemoIfRequested();

// Service worker: çevrimdışı çalışma. Yeni sürüm hazır olunca App başlıkta pil gösterir; dokununca yenilenir.
const updateSW = registerSW({ immediate: true, onNeedRefresh() { window.dispatchEvent(new Event("bilge-update")); } });
window.__bilgeUpdate = () => updateSW(true);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
