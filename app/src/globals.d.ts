// Derleme damgası (vite.config define): Ayarlar altında sürüm olarak görünür, yayın doğrulamada işe yarar
declare const __BUILD__: string;
interface Window { __bilgeUpdate?: () => Promise<void> }
