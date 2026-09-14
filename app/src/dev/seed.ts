import { addDays, subDays } from "date-fns";
import { db, demoMode, uid } from "../db/db";
import type { BabyEvent } from "../db/types";

/**
 * Geliştirme için örnek veri (sadece bulut KAPALIYKEN ve ?demo=1 ile).
 * Ekran görüntüsü / tasarım kontrolü için; üretimde asla çalışmaz.
 */
export async function seedDemoIfRequested() {
  if (!demoMode) return;
  if (await db.baby.get("me")) return;
  const birth = subDays(new Date(), 34);
  await db.baby.put({ id: "me", name: "Demo Bebek", birthDate: birth.toISOString().slice(0, 10), sex: "kiz", dvitTime: "09:00" });

  const now = Date.now();
  const H = 3600_000, M = 60_000;
  const ev: BabyEvent[] = [];
  const push = (e: Omit<BabyEvent, "id" | "createdAt" | "updatedAt">) => ev.push({ ...e, id: uid(), createdAt: now, updatedAt: now });
  // 7 gün: her gün ~8 beslenme, ~6 bez, 5-6 uyku
  for (let d = 6; d >= 0; d--) {
    const day0 = new Date(); day0.setHours(0, 0, 0, 0); const base = day0.getTime() - d * 24 * H;
    for (let i = 0; i < 8; i++) {
      const t = base + (1.5 + i * 2.8) * H + (i % 3) * 7 * M;
      if (t > now) break;
      if (i % 4 === 3) push({ type: "biberon", start: t, amountMl: 60 + (i % 2) * 30, by: "baba" });
      else push({ type: "emzirme", start: t, end: t + (12 + (i % 4) * 5) * M, side: i % 2 ? "sag" : "sol", by: i % 2 ? "anne" : "baba" });
      if (i % 2 === 0) push({ type: "bez", start: t + 25 * M, diaper: i % 4 === 0 ? "kaka" : "islak", by: "anne" });
      const s = t + 45 * M, e = s + (60 + (i % 3) * 40) * M;
      if (s < now) push({ type: "uyku", start: s, end: Math.min(e, now) === e ? e : undefined, by: "anne" });
    }
    push({ type: "ilac", start: base + 9 * H, medName: "D vitamini", by: "anne" });
  }
  await db.events.bulkAdd(ev);
  await db.measurements.bulkAdd([
    { id: uid(), at: birth.getTime(), weightG: 3250, lengthCm: 50, headCm: 34 },
    { id: uid(), at: addDays(birth, 15).getTime(), weightG: 3600 },
    { id: uid(), at: addDays(birth, 30).getTime(), weightG: 4150, lengthCm: 54, headCm: 37 },
  ]);
  await db.milestones.bulkPut([{ key: "2-sosyal-1", doneAt: now - 5 * 86_400_000 }, { key: "2-sosyal-4", doneAt: now - 2 * 86_400_000 }, { key: "2-hareket-1", doneAt: now - 86_400_000 }]);
  await db.expenses.bulkAdd([
    { id: uid(), at: now - 6 * 86_400_000, category: "bez", amount: 649, note: "Prima 2 numara, 2 paket", by: "baba" },
    { id: uid(), at: now - 3 * 86_400_000, category: "ilac", amount: 180, note: "D vitamini damla", by: "anne" },
    { id: uid(), at: now - 86_400_000, category: "giysi", amount: 420, note: "zıbın seti", by: "anne" },
  ]);
  await db.motherLog.bulkAdd([
    { id: uid(), at: now - 2 * 86_400_000 + 9 * H, kind: "ruh", value: 3 }, { id: uid(), at: now - 2 * 86_400_000 + 9 * H, kind: "uyku", value: 4 },
    { id: uid(), at: now - 86_400_000 + 9 * H, kind: "ruh", value: 4 }, { id: uid(), at: now - 86_400_000 + 9 * H, kind: "uyku", value: 5 },
    { id: uid(), at: now - 2 * H, kind: "su", value: 1 }, { id: uid(), at: now - H, kind: "su", value: 1 },
  ]);
  await db.meds.add({ id: "demo-med", name: "Probiyotik damla", dose: "5 damla", intervalH: 24, prn: false, startAt: now - 2 * 86_400_000, endAt: now + 12 * 86_400_000, totalDoses: 14, createdAt: now });
  await db.scheduleDone.bulkPut([{ key: "hepb1", doneAt: now }, { key: "izlem1", doneAt: now }, { key: "izlem2", doneAt: now }, { key: "topuk", doneAt: now }, { key: "izlem3", doneAt: now }, { key: "dvit", doneAt: now }]);
}
