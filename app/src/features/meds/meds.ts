import type { BabyEvent, Medication } from "../../db/types";

/**
 * İlaç kürü mantığı: "Antibiyotik · 2,5 ml · 12 saatte bir · 7 gün".
 * Sonraki doz = son dozun üstüne aralık (ilk doz: başlangıç). Erken doz koruması: aralığın %85'i geçmeden uyarı.
 * "Gerekirse" (PRN) ilaçlarda plan yok; sadece "en az X saat geçmeden tekrar verme" kuralı.
 */
export const INTERVALS = [4, 6, 8, 12, 24] as const;

export function isActive(m: Medication, now = Date.now()) {
  return !m.endedAt && (!m.endAt || m.endAt > now);
}

export function lastDose(m: Medication, events: BabyEvent[]) {
  return events.filter((e) => e.type === "ilac" && e.medId === m.id).sort((a, b) => b.start - a.start)[0];
}

export function nextDoseAt(m: Medication, events: BabyEvent[]): number | undefined {
  if (m.prn) return undefined;
  const last = lastDose(m, events);
  return last ? last.start + m.intervalH * 3600_000 : m.startAt;
}

/** Erken mi? (aralığın %85'i dolmadan) */
export function tooEarly(m: Medication, events: BabyEvent[], now = Date.now()): { early: boolean; sinceMin: number } {
  const last = lastDose(m, events);
  if (!last) return { early: false, sinceMin: 0 };
  const since = now - last.start;
  return { early: since < m.intervalH * 3600_000 * 0.85, sinceMin: Math.round(since / 60_000) };
}

export function dosesGiven(m: Medication, events: BabyEvent[]) {
  return events.filter((e) => e.type === "ilac" && e.medId === m.id).length;
}
