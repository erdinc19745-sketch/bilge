import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";

// `npx dexie-cloud create` bu dosyayı üretir; varsa adresi uygulamaya gömeriz.
// Yoksa Vite normal .env / ortam değişkeni (VITE_DEXIE_CLOUD_URL) yolunu kullanır.
const cloudFile = fs.existsSync("dexie-cloud.json") ? JSON.parse(fs.readFileSync("dexie-cloud.json", "utf8")) : null;
const cloudUrl: string | undefined = cloudFile?.dbUrl ?? cloudFile?.databaseUrl;

// PWA: iPhone'da "Ana Ekrana Ekle" ile kurulur, çevrimdışı çalışır.
export default defineConfig({
  define: {
    ...(cloudUrl ? { "import.meta.env.VITE_DEXIE_CLOUD_URL": JSON.stringify(cloudUrl) } : {}),
    // Ayarlar altında "sürüm" — canlı sitede hangi derlemenin olduğunu telefondan görmek için
    __BUILD__: JSON.stringify(new Date().toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt", // kendiliğinden yenileme yok: gece açık uygulamada alarm modunu düşürürdü; başlıkta "yeni sürüm" pili
      strategies: "injectManifest", // kendi service worker'ımız: önbellek + push
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Bilge",
        short_name: "Bilge",
        description: "Bebek takip defteri",
        lang: "tr",
        display: "standalone",
        start_url: "/",
        theme_color: "#0b0f14",
        background_color: "#0b0f14",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        // Android: ikona uzun basınca hızlı kayıt; iOS yok sayar (zararsız)
        shortcuts: [
          { name: "Sol emzirme", url: "/?act=emzir-sol", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Sağ emzirme", url: "/?act=emzir-sag", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Uyudu", url: "/?act=uyku", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Islak bez", url: "/?act=bez-islak", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
});
