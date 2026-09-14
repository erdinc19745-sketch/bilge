import type { BabyEvent } from "../../db/types";

/**
 * Süt stoku: sağılan sütler (dolap/dondurucu) − anne sütü biberonları, en eskiden başlayarak (FIFO).
 * Saklama süreleri (CDC/ABM): buzdolabı ≤ 4 gün, dondurucu ideal ≤ 6 ay (en fazla 12).
 */
export interface StockItem { id: string; at: number; store: "dolap" | "dondurucu"; ml: number; left: number }

export interface Stock {
  items: StockItem[]; // kalanı > 0 olanlar, eskiden yeniye
  totalMl: number;
  dolapMl: number;
  dondurucuMl: number;
  oldest?: StockItem;
  warnings: string[];
}

export function computeStock(events: BabyEvent[], now = Date.now()): Stock {
  const pumped = events
    .filter((e) => e.type === "sagma" && e.amountMl && (e.store === "dolap" || e.store === "dondurucu"))
    .sort((a, b) => a.start - b.start)
    .map((e) => ({ id: e.id, at: e.start, store: e.store as "dolap" | "dondurucu", ml: e.amountMl!, left: e.amountMl! }));
  let used = events.filter((e) => e.type === "biberon" && e.bottleKind === "sut").reduce((s, e) => s + (e.amountMl ?? 0), 0);
  for (const p of pumped) {
    if (used <= 0) break;
    const take = Math.min(p.left, used);
    p.left -= take; used -= take;
  }
  const items = pumped.filter((p) => p.left > 0);
  const dolapMl = items.filter((i) => i.store === "dolap").reduce((s, i) => s + i.left, 0);
  const dondurucuMl = items.filter((i) => i.store === "dondurucu").reduce((s, i) => s + i.left, 0);
  const warnings: string[] = [];
  const day = 86_400_000;
  for (const i of items) {
    const age = now - i.at;
    if (i.store === "dolap" && age > 4 * day) warnings.push(`Dolaptaki ${i.left} ml ${Math.floor(age / day)} günlük — 4 günü geçti, kullanma`);
    else if (i.store === "dondurucu" && age > 180 * day) warnings.push(`Dondurucudaki ${i.left} ml 6 ayı geçti`);
  }
  return { items, totalMl: dolapMl + dondurucuMl, dolapMl, dondurucuMl, oldest: items[0], warnings };
}
