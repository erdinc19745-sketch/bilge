/** Tema: Otomatik (08-20 açık, gece koyu) / Koyu / Açık. Seçim cihazda tutulur. */
export type ThemePref = "auto" | "dark" | "light";
const KEY = "bilge.theme";

export const getThemePref = (): ThemePref => {
  try { return (localStorage.getItem(KEY) as ThemePref) || "auto"; } catch { return "auto"; }
};
export const setThemePref = (p: ThemePref) => {
  try { localStorage.setItem(KEY, p); } catch { /* özel mod */ }
  applyTheme();
};

export function applyTheme() {
  // ?theme=light|dark: tasarım kontrolü için geçici zorlama
  const forced = new URLSearchParams(location.search).get("theme") as ThemePref | null;
  const p = forced === "light" || forced === "dark" ? forced : getThemePref();
  const h = new Date().getHours();
  const light = p === "light" || (p === "auto" && h >= 8 && h < 20);
  document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f6f3ee" : "#0b0f14");
}

/** Uygulama açıkken saat 08:00 / 20:00 geçince kendiliğinden değişsin */
export function startThemeClock() {
  applyTheme();
  setInterval(applyTheme, 60_000);
}

/** Grafikler için seri renkleri (temaya göre CSS değişkenlerinden okunur) */
export function seriesColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { uyku: v("--c-uyku"), emzirme: v("--c-emzirme"), bez: v("--c-bez"), biberon: v("--c-biberon") };
}
