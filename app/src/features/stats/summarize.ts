import { addDays, format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import type { BabyEvent } from "../../db/types";

interface Day { day: number; label: string; feeds: number; bottleMl: number; sleepMin: number; longestMin: number; diapers: number; nightWakes: number }

/** Son 7 günü gün gün hesapla */
export function summarize(events: BabyEvent[], now: number, days = 7): Day[] {
  const out: Day[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d0 = startOfDay(subDays(now, i)).getTime();
    const d1 = Math.min(addDays(d0, 1).getTime(), now);
    const inDay = events.filter((e) => e.start < d1 && (e.end ?? ((e.type === "uyku" || e.type === "emzirme") ? now : e.start)) >= d0);
    const sleeps = inDay.filter((e) => e.type === "uyku");
    let sleepMin = 0, longest = 0;
    for (const s of sleeps) {
      const a = Math.max(s.start, d0), b = Math.min(s.end ?? now, d1);
      const m = Math.max(0, b - a) / 60_000;
      sleepMin += m; longest = Math.max(longest, ((s.end ?? now) - s.start) / 60_000);
    }
    const nightWakes = sleeps.filter((s) => { if (!s.end || s.end < d0 || s.end >= d1) return false; const h = new Date(s.end).getHours(); return h >= 23 || h < 6; }).length;
    out.push({
      day: d0,
      label: format(d0, "EEE", { locale: tr }),
      feeds: inDay.filter((e) => (e.type === "emzirme" || e.type === "biberon") && e.start >= d0 && e.start < d1).length,
      bottleMl: inDay.filter((e) => e.type === "biberon" && e.start >= d0).reduce((s, e) => s + (e.amountMl ?? 0), 0),
      sleepMin: Math.round(sleepMin), longestMin: Math.round(longest),
      diapers: inDay.filter((e) => e.type === "bez" && e.start >= d0).length,
      nightWakes,
    });
  }
  return out;
}
