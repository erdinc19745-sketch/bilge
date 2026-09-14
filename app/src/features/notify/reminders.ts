import { db, familyRealmId } from "../../db/db";
import type { Baby, BabyEvent, Medication } from "../../db/types";
import { isActive, nextDoseAt } from "../meds/meds";

/**
 * Hatırlatma motoru. Kayıtlar değiştikçe "istenen" hatırlatmaları hesaplar,
 * aile alanındaki `reminders` tablosuyla karşılaştırır; farklıysa eskisini iptal edip yenisini zamanlar.
 * Anne ve babanın telefonu aynı tabloyu gördüğü için aynı hatırlatma iki kez kurulmaz.
 */

export const DEFAULT_RULES = { feedGapMin: 180, sleepMaxMin: 240, dvit: true };
export type Rules = typeof DEFAULT_RULES;

interface Desired { kind: string; at: number; title: string; body: string }

export function desiredReminders(baby: Baby, recent: BabyEvent[], now = Date.now(), meds: Medication[] = []): Desired[] {
  const r = { ...DEFAULT_RULES, ...(baby.reminders ?? {}) };
  const out: Desired[] = [];
  const name = baby.name;

  const runningFeed = recent.find((e) => e.type === "emzirme" && e.end == null);
  const runningSleep = recent.find((e) => e.type === "uyku" && e.end == null);
  const lastFeed = recent.find((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");

  // Beslenme aralığı: son beslenmenin bitişinden itibaren
  if (r.feedGapMin > 0 && lastFeed && !runningFeed) {
    const at = (lastFeed.end ?? lastFeed.start) + r.feedGapMin * 60_000;
    if (at > now) out.push({ kind: "feed", at, title: `${name} · beslenme zamanı`, body: `Son beslenmeden ${Math.round(r.feedGapMin / 60 * 10) / 10} saat geçti.` });
  }

  // Uzun uyku: yenidoğan 4 saatten uzun uyuyorsa beslenmek için uyandırılır
  if (r.sleepMaxMin > 0 && runningSleep) {
    const at = runningSleep.start + r.sleepMaxMin * 60_000;
    if (at > now) out.push({ kind: "sleep", at, title: `${name} uzun süredir uyuyor`, body: `${Math.round(r.sleepMaxMin / 60 * 10) / 10} saati geçti — beslenme için uyandırmayı düşün.` });
  }

  // D vitamini: seçilen saatten 1 saat sonra hâlâ verilmediyse
  if (r.dvit && baby.dvitTime) {
    const [hh, mm] = baby.dvitTime.split(":").map(Number);
    const today = new Date(now); today.setHours(hh, mm + 60, 0, 0);
    const givenToday = recent.some((e) => e.type === "ilac" && e.medName === "D vitamini" && new Date(e.start).toDateString() === new Date(now).toDateString());
    let at = today.getTime();
    if (givenToday || at <= now) at += 86_400_000; // bugün verildiyse ya da saat geçtiyse yarın
    out.push({ kind: "dvit", at, title: `${name} · D vitamini`, body: `${baby.dvitTime} saatinde verilecek D vitamini henüz kaydedilmedi.` });
  }
  // İlaç kürleri: sonraki doz zamanı (gerekirse ilaçlarda plan yok)
  for (const m of meds.filter((x) => isActive(x, now) && !x.prn)) {
    const at = nextDoseAt(m, recent);
    if (at && at > now) out.push({ kind: `med-${m.id}`, at, title: `${name} · ${m.name} zamanı`, body: `${m.dose} — ${m.intervalH} saatte bir. Verince uygulamada işaretle.` });
  }
  return out;
}

let syncing = false;
/** Kayıt değiştiğinde çağrılır (App'ten, gecikmeli). Ağ yoksa sessizce vazgeçer, sonraki değişiklikte yeniden dener. */
export async function syncReminders(baby: Baby, recent: BabyEvent[], meds: Medication[] = []) {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const subs = await db.pushSubs.toArray();
    const current = await db.reminders.toArray();
    const desired = subs.length ? desiredReminders(baby, recent, Date.now(), meds) : [];
    const realmId = await familyRealmId();

    // Artık istenmeyenleri iptal et
    for (const c of current) {
      const d = desired.find((x) => x.kind === c.kind);
      if (!d || Math.abs(d.at - c.at) > 60_000) {
        await api({ action: "cancel", msgId: c.msgId });
        await db.reminders.delete(c.kind);
      }
    }
    // Yenilerini zamanla
    for (const d of desired) {
      const c = await db.reminders.get(d.kind);
      if (c && Math.abs(c.at - d.at) <= 60_000) continue;
      const r = await api({
        action: "schedule",
        at: d.at,
        title: d.title,
        body: d.body,
        tag: `bilge-${d.kind}`,
        subs: subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
      });
      if (r?.msgId) await db.reminders.put({ kind: d.kind, at: d.at, msgId: r.msgId, updatedAt: Date.now(), realmId });
    }
  } catch {
    /* ağ/sunucu hatası: sonraki değişiklikte tekrar denenir */
  } finally {
    syncing = false;
  }
}

async function api(body: unknown): Promise<{ msgId?: string } | null> {
  const r = await fetch("/api/remind", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 401) await refreshSession(); // eski cihaz: çerezi yenile, sonraki denemede çalışır
  return r.ok ? r.json() : null;
}

/** Oturum çerezi olmayan cihaz: aile koduyla /api/token'a gidip çerez alır (kod localStorage'da) */
export async function refreshSession() {
  const { getFamilyCode } = await import("../family/family");
  const code = getFamilyCode();
  if (!code) return;
  await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, public_key: "session-only" }) }).catch(() => undefined);
}
