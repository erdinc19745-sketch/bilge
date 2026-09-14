import type { BabyEvent } from "../../db/types";

/**
 * Uyku penceresi tahmini ("SweetSpot"ın yerlisi).
 * 1) Yaşa göre uyanık kalma penceresi (Huckleberry, ilk yıl beklentileri):
 *    0-2 ay 30-90 dk · 3 ay 60-120 · 4-5 ay 90-150 · 6 ay 120-180 · 7-9 ay 150-210 · 10-12 ay 180-240
 * 2) Son 5 günün kişisel örüntüsü: uyanma→uyku arası sürelerin medyanı (≥5 örnekle).
 * Tahmin = kişisel medyan varsa ikisinin harmanı (yaş bandına kırpılmış), yoksa yaş bandı.
 */
export interface AgeWindow { minMin: number; maxMin: number; naps: string; total: string }

export function ageWindow(ageMonths: number): AgeWindow {
  if (ageMonths < 2.5) return { minMin: 30, maxMin: 90, naps: "4-5 uyku", total: "16-17 sa" };
  if (ageMonths < 3.5) return { minMin: 60, maxMin: 120, naps: "4 uyku", total: "14,5-15 sa" };
  if (ageMonths < 5.5) return { minMin: 90, maxMin: 150, naps: "3-4 uyku", total: "14,5-15 sa" };
  if (ageMonths < 6.5) return { minMin: 120, maxMin: 180, naps: "3 uyku", total: "≥14 sa" };
  if (ageMonths < 9.5) return { minMin: 150, maxMin: 210, naps: "2-3 uyku", total: "≥14 sa" };
  return { minMin: 180, maxMin: 240, naps: "2 uyku", total: "≈13 sa" };
}

/** Son N günde gözlenen uyanıklık süreleri (dk): bir uykunun bitişi → sonraki uykunun başlangıcı */
export function observedWakeSpans(events: BabyEvent[], days = 5, now = Date.now()): number[] {
  const from = now - days * 86_400_000;
  const sleeps = events.filter((e) => e.type === "uyku" && e.end != null && e.end >= from).sort((a, b) => a.start - b.start);
  const spans: number[] = [];
  for (let i = 0; i + 1 < sleeps.length; i++) {
    const gap = (sleeps[i + 1].start - sleeps[i].end!) / 60_000;
    if (gap > 10 && gap < 6 * 60) spans.push(gap); // saçma değerleri ele (çift kayıt, unutulmuş bitiş)
  }
  return spans;
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export interface Prediction {
  fromMin: number; toMin: number; // uyanmadan itibaren dakika
  personal: boolean; // kişisel veriye dayanıyor mu
  samples: number;
}

export function predictWindow(ageMonths: number, events: BabyEvent[]): Prediction {
  const w = ageWindow(ageMonths);
  const spans = observedWakeSpans(events);
  if (spans.length >= 5) {
    const med = median(spans);
    // kişisel medyanı yaş bandına kırp, ±15 dk pencere
    const c = Math.max(w.minMin, Math.min(w.maxMin, med));
    return { fromMin: Math.max(w.minMin, c - 15), toMin: Math.min(w.maxMin + 15, c + 15), personal: true, samples: spans.length };
  }
  return { fromMin: w.minMin, toMin: w.maxMin, personal: false, samples: spans.length };
}

/** Yorgunluk işaretleri (Bakanlık/pediatri genel bilgisi) */
export const SLEEPY_CUES = ["esneme", "gözleri ovuşturma", "bakışların boşa dalması", "huysuzlanma / mızmızlanma", "kulak-saç çekiştirme", "yüzü çevirme"];
